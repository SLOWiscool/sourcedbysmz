/**
 * SOURCEDBYSMZ backend (real implementation).
 *
 *  GET  /api/health                 -> { ok, stripe, admin }
 *  GET  /api/products               -> active products (public shop catalogue)
 *  POST /api/create-payment-intent  -> { clientSecret } (validates + prices server-side)
 *  POST /api/stripe-webhook         -> Stripe events (signature-verified, idempotent)
 *  POST /api/admin/login            -> { ok } + session cookie (rate-limited)
 *  POST /api/admin/logout           -> { ok }
 *  GET  /api/admin/me               -> { admin: true } or 401
 *  GET  /api/admin/products         -> full catalogue incl. drafts (auth)
 *  POST /api/admin/products         -> create (auth, validated)
 *  PUT  /api/admin/products/:id     -> replace (auth, validated)
 *  DELETE /api/admin/products/:id   -> delete (auth, confirmed client-side)
 *  GET  /api/admin/media            -> image files available for listings (auth)
 *  POST /api/admin/upload           -> image upload, returns { url } (auth)
 *  GET  /api/admin/orders           -> order summaries (auth)
 *
 * Secrets come ONLY from environment (server/.env, never committed):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PORT, FRONTEND_URLS,
 *   ADMIN_USERNAME, ADMIN_PASSWORD_HASH (see setup-admin.js),
 *   SESSION_SECRET, COOKIE_SECURE
 *
 * NOTE on persistence: orders, sold counts and processed event IDs live in
 * memory, products live in server/data/products.json. Correct for a
 * two-person shop at this stage. Before high traffic, replace `store` and
 * the JSON file with a database — routes only use the store.js helpers.
 */

import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import express from 'express';
import session from 'express-session';
import multer from 'multer';
import Stripe from 'stripe';

/** Minimal .env loader (no dependency): real environment always wins. */
function loadEnvFile(file) {
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

import { validateCheckout, HttpError } from './validate.js';
import { resolveSucceededOrder } from './orders.js';
import { isAuthConfigured, checkCredentials, requireAdmin } from './auth.js';
import { loadStore, saveStore, publicProducts, validateProduct } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
loadEnvFile(join(here, '.env'));
const catalogue = JSON.parse(readFileSync(join(here, 'catalogue.json'), 'utf8'));

const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 4242);
const SECRET = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const FRONTEND_URLS = (process.env.FRONTEND_URLS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let sessionSecret = process.env.SESSION_SECRET || '';
if (!sessionSecret) {
  sessionSecret = randomBytes(32).toString('hex');
  console.warn('[admin] SESSION_SECRET not set: sessions will not survive a restart. Set one in server/.env.');
}

const stripe = SECRET && !SECRET.includes('placeholder') ? new Stripe(SECRET) : null;

const store = {
  /** orderRef -> { email, lines, subtotal, shipping, total, currency, status, paymentIntentId, createdAt } */
  orders: new Map(),
  /** variantKey -> units sold (drives live availability within this process) */
  sold: new Map(),
  /** Stripe event ids already handled (webhook idempotency) */
  processedEvents: new Set(),
  /** ip -> { count, resetAt } for login throttling */
  loginAttempts: new Map(),
};

export const app = express();

// --- CORS (allowlist only) ---------------------------------------------------
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = origin && FRONTEND_URLS.includes(origin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key, Stripe-Signature');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// --- Webhook FIRST: needs the raw body for signature verification -----------
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !WEBHOOK_SECRET || WEBHOOK_SECRET.includes('placeholder')) {
    res.status(503).json({ error: 'Webhook endpoint is not configured.' });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], WEBHOOK_SECRET);
  } catch {
    res.status(401).json({ error: 'Invalid webhook signature.' });
    return;
  }

  // Idempotent: retries of the same event must not double-apply anything.
  if (store.processedEvents.has(event.id)) {
    res.json({ received: true, duplicate: true });
    return;
  }
  store.processedEvents.add(event.id);

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const orderRef = intent.metadata && intent.metadata.orderRef;
      const result = await resolveSucceededOrder({ catalogue, sold: store.sold, orders: store.orders }, {
        orderRef,
        intentId: intent.id,
        refund: (paymentIntent) => stripe.refunds.create({ payment_intent: paymentIntent }),
      });
      if (result.outcome === 'refund_failed' || result.outcome === 'unknown_order') {
        console.error(`order ${String(orderRef)} needs manual review (${result.outcome})`);
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const orderRef = intent.metadata && intent.metadata.orderRef;
      const order = orderRef ? store.orders.get(orderRef) : undefined;
      if (order && order.status === 'pending') {
        order.status = 'failed';
      }
    }
    // All other event types are acknowledged and ignored.
  } catch {
    // Never leak internals; Stripe will retry.
    console.error('webhook handler error');
    res.status(500).json({ error: 'Webhook processing failed.' });
    return;
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '256kb' }));

app.use(
  session({
    name: 'sbmz_admin',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === '1',
      maxAge: 12 * 60 * 60 * 1000,
    },
  })
);

// --- Health -----------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, stripe: !!stripe, admin: await isAuthConfigured() });
});

// --- Public runtime config (publishable key only — safe for browsers) ---------
// Lets the storefront pick up STRIPE_PUBLISHABLE_KEY from server/.env with
// just a restart (no rebuild). Never put secret keys here.
app.get('/api/public-config', (_req, res) => {
  const key = process.env.STRIPE_PUBLISHABLE_KEY || '';
  const clean = key && !key.includes('placeholder') && key.trim() !== '' ? key : null;
  res.json({ stripePublishableKey: clean });
});

// --- Public catalogue (active products only) --------------------------------
app.get('/api/products', (_req, res) => {
  try {
    res.json({ products: publicProducts() });
  } catch {
    res.status(500).json({ error: 'Could not load products.' });
  }
});

// --- Public brand (logo URL set in the admin panel) -------------------------
app.get('/api/brand', (_req, res) => {
  try {
    const settings = JSON.parse(readFileSync(join(here, 'data', 'settings.json'), 'utf8'));
    res.json({ logoUrl: settings.logoUrl || null });
  } catch {
    res.json({ logoUrl: null });
  }
});

// --- Admin: auth -------------------------------------------------------------
function loginThrottled(ip) {
  const now = Date.now();
  const record = store.loginAttempts.get(ip);
  if (record && record.resetAt > now && record.count >= 8) return true;
  return false;
}

function noteLoginFailure(ip) {
  const now = Date.now();
  const record = store.loginAttempts.get(ip);
  if (!record || record.resetAt <= now) {
    store.loginAttempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
  } else {
    record.count += 1;
  }
}

app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (loginThrottled(ip)) {
    res.status(429).json({ error: 'Too many sign-in attempts. Try again later.' });
    return;
  }
  if (!(await isAuthConfigured())) {
    res.status(503).json({ error: 'Admin sign-in is not configured on this server.' });
    return;
  }
  const { username, password } = req.body || {};
  const ok = await checkCredentials(username, password);
  if (!ok) {
    noteLoginFailure(ip);
    // Same message for bad name or bad password: never reveal which half failed.
    res.status(401).json({ error: 'Wrong username or password.' });
    return;
  }
  store.loginAttempts.delete(ip);
  req.session.admin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sbmz_admin');
    res.json({ ok: true });
  });
});

app.get('/api/admin/me', requireAdmin, (_req, res) => {
  res.json({ admin: true });
});

// --- Admin: products ----------------------------------------------------------
app.get('/api/admin/products', requireAdmin, (_req, res) => {
  try {
    res.json({ products: loadStore() });
  } catch {
    res.status(500).json({ error: 'Could not load products.' });
  }
});

function syncCheckoutMirror() {
  // The payment validator reads server/catalogue.json (ids, variants,
  // prices, stock, status). Regenerate its product section from the live
  // store so admin edits apply to checkout without touching code.
  try {
    const products = loadStore();
    const mirror = {};
    for (const p of products) {
      const variants = {};
      for (const v of p.variants || []) {
        variants[v.id] = { label: v.label, price: v.price ?? null, stock: v.stockQuantity };
      }
      mirror[p.id] = { status: p.status, price: p.price, stock: p.stockQuantity, title: p.title, sizes: p.sizes || [], variants };
    }
    catalogue.products = mirror;
  } catch {
    // Store errors are reported by the calling route already.
  }
}

app.post('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const products = loadStore();
    const body = req.body || {};
    if (!body.id || typeof body.id !== 'string' || body.id.trim() === '') {
      body.id = `p-${Date.now().toString(36)}`;
    }
    validateProduct(
      body,
      new Set(products.map((p) => p.slug)),
      new Set(products.map((p) => p.id))
    );
    const now = new Date().toISOString();
    const product = { ...body, createdAt: body.createdAt || now, updatedAt: now };
    products.push(product);
    saveStore(products);
    syncCheckoutMirror();
    res.status(201).json({ product });
  } catch (err) {
    res.status(err instanceof HttpError ? err.status : 400).json({
      error: err instanceof Error ? err.message : 'Invalid product.',
    });
  }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const products = loadStore();
    const idx = products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const body = { ...(req.body || {}), id: req.params.id, createdAt: products[idx].createdAt };
    const others = products.filter((p) => p.id !== req.params.id);
    validateProduct(
      body,
      new Set(others.map((p) => p.slug)),
      new Set(others.map((p) => p.id))
    );
    const product = { ...body, updatedAt: new Date().toISOString() };
    products[idx] = product;
    saveStore(products);
    syncCheckoutMirror();
    res.json({ product });
  } catch (err) {
    res.status(err instanceof HttpError ? err.status : 400).json({
      error: err instanceof Error ? err.message : 'Invalid product.',
    });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const products = loadStore();
    const idx = products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    products.splice(idx, 1);
    saveStore(products);
    syncCheckoutMirror();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Could not delete product.' });
  }
});

// --- Admin: brand settings (logo) ---------------------------------------------
app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  try {
    const settings = JSON.parse(readFileSync(join(here, 'data', 'settings.json'), 'utf8'));
    res.json({ settings });
  } catch {
    res.json({ settings: { logoUrl: null } });
  }
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const { logoUrl } = req.body || {};
    if (typeof logoUrl !== 'string' || !logoUrl.startsWith('/images/products/')) {
      res.status(400).json({ error: 'Logo must be an uploaded image under /images/products/.' });
      return;
    }
    const settings = { logoUrl };
    mkdirSync(join(here, 'data'), { recursive: true });
    writeFileSync(join(here, 'data', 'settings.json'), JSON.stringify(settings, null, 2));
    res.json({ settings });
  } catch {
    res.status(500).json({ error: 'Could not save settings.' });
  }
});

// --- Admin: media (image picker + upload) --------------------------------------
const PUBLIC_IMAGES = join(here, '..', 'public', 'images', 'products');
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

app.get('/api/admin/media', requireAdmin, (_req, res) => {
  try {
    mkdirSync(PUBLIC_IMAGES, { recursive: true });
    const files = readdirSync(PUBLIC_IMAGES, { withFileTypes: true })
      .filter((e) => e.isFile() && IMAGE_EXTS.has(extname(e.name).toLowerCase()))
      .map((e) => {
        const full = join(PUBLIC_IMAGES, e.name);
        let mtime = 0;
        let size = 0;
        try {
          const st = statSync(full);
          mtime = st.mtimeMs;
          size = st.size;
        } catch {
          // File vanished between listing and stat; skip its metadata.
        }
        return { name: e.name, url: `/images/products/${e.name}`, size, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    res.json({ files });
  } catch {
    res.status(500).json({ error: 'Could not list images.' });
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(PUBLIC_IMAGES, { recursive: true });
      cb(null, PUBLIC_IMAGES);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `admin-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (IMAGE_MIMES.has(file.mimetype) && IMAGE_EXTS.has(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG or WebP images up to 8MB are allowed.'));
  },
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err || !req.file) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed.' });
      return;
    }
    res.status(201).json({ url: `/images/products/${req.file.filename}`, name: req.file.filename });
  });
});

// --- Admin: orders (summaries from verified payment flow) ----------------------
app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const orders = [...store.orders.entries()].map(([ref, o]) => ({
    ref,
    email: o.email,
    items: o.lines.reduce((n, l) => n + l.quantity, 0),
    lines: o.lines,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    currency: o.currency,
    status: o.status,
    createdAt: o.createdAt,
  }));
  orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ orders });
});

// --- Create a PaymentIntent from TRUSTED data --------------------------------
app.post('/api/create-payment-intent', async (req, res) => {
  let order;
  try {
    order = validateCheckout(catalogue, store.sold, req.body);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 400;
    res.status(status).json({ error: err instanceof Error ? err.message : 'Invalid order.' });
    return;
  }

  if (!stripe) {
    res.status(503).json({ error: 'Card payments are not configured yet. Please contact the shop.' });
    return;
  }

  const orderRef = `order_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  store.orders.set(orderRef, {
    email: String(req.body.email).trim(),
    shippingMethod: req.body.shippingMethod,
    lines: order.lines,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    currency: order.currency,
    status: 'pending',
    paymentIntentId: null,
    createdAt: new Date().toISOString(),
  });

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: order.total,
        currency: order.currency.toLowerCase(),
        receipt_email: String(req.body.email).trim(),
        automatic_payment_methods: { enabled: true },
        description: `SOURCEDBYSMZ ${orderRef}`,
        metadata: {
          orderRef,
          items: order.lines
            .map((l) => `${l.productId}${l.variantId ? `:${l.variantId}` : ''}${l.size ? `:${l.size}` : ''}x${l.quantity}`)
            .join(', ')
            .slice(0, 490),
        },
      },
      { idempotencyKey: req.headers['idempotency-key'] || `intent-${orderRef}` }
    );
    res.json({ clientSecret: intent.client_secret, orderRef });
  } catch {
    store.orders.delete(orderRef);
    res.status(502).json({ error: 'Could not start the secure payment. Please try again.' });
  }
});

// --- Public order status (status + total only, no personal data) ----------------
// Lets the success page verify a payment without exposing emails or lines.
// The ref is unguessable (order_<time>_<random>); unknown refs get a 404.
app.get('/api/orders/:ref', (req, res) => {
  const order = store.orders.get(req.params.ref);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  res.json({ ref: req.params.ref, status: order.status, total: order.total, currency: order.currency });
});

// --- Unknown API routes ------------------------------------------------------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API route.' });
});

// --- Serve the built storefront (single-process hosting, e.g. Pterodactyl) ---
// /images is served from public/ FIRST so admin uploads appear instantly,
// even for files added after `npm run build` snapshotted dist/.
const DIST_DIR = join(here, '..', 'dist');
if (existsSync(join(PUBLIC_IMAGES))) {
  app.use('/images', express.static(PUBLIC_IMAGES, { maxAge: '7d', immutable: true }));
}
if (existsSync(DIST_DIR)) {
  // Hashed assets (JS/CSS with content hashes) cache forever; index.html
  // must NEVER cache, or phones keep booting a stale bundle whose hashed
  // files no longer exist — which renders as a blank white page.
  app.use(
    express.static(DIST_DIR, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store');
      },
    })
  );
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(join(DIST_DIR, 'index.html'));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  syncCheckoutMirror();
  app.listen(PORT, async () => {
    const adminReady = await isAuthConfigured();
    console.log(`sourcedbysmz server on http://localhost:${PORT} (stripe: ${stripe ? 'configured' : 'NOT configured'}, admin: ${adminReady ? 'configured' : 'NOT configured'})`);
  });
}
