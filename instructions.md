# Stripe setup — where the keys go and what to do

Keys take effect with a **restart only — no rebuild needed**. The publishable
key is served to the shop at runtime from `server/.env`, so add keys and
restart the server (or Pterodactyl server).

## 1. Where the keys go

Everything lives in **`server/.env`** on the machine that runs the backend.
Create it from the template:

```bash
cd server
cp .env.example .env
nano .env
```

Fill in these lines:

```
PORT=25609
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

- `STRIPE_SECRET_KEY` — starts with `sk_test_` for testing, `sk_live_` for real money. Server-only, never leaves the backend.
- `STRIPE_PUBLISHABLE_KEY` — starts with `pk_test_` / `pk_live_`. Public by design; the server hands it to the shop at runtime.
- `STRIPE_WEBHOOK_SECRET` — printed by the Stripe CLI in step 3.
- `PORT` — must match the Pterodactyl allocation (25609).

(Advanced: you can still bake `VITE_STRIPE_PUBLISHABLE_KEY` into root `.env`
at build time as a fallback — the runtime server key wins when both exist.)

**Never** put the secret key in the frontend, in a `VITE_` variable, in chat,
or in git. `server/.env` is git-ignored.

## 2. Frontend publishable key

No separate step needed: the backend serves `STRIPE_PUBLISHABLE_KEY` from
`server/.env` to the shop at runtime (`GET /api/public-config`). Add the key,
restart, done.

`VITE_BACKEND_URL=` stays empty on the panel (same origin — shop and API share
port 25609). Only set it for split hosting, e.g.
`VITE_BACKEND_URL=https://api.sourcedbysmz.co.uk`.

## 3. Webhooks (required for real orders)

The server only marks an order paid when Stripe's webhook confirms it.
Run this **on the same machine as the backend**, in a separate terminal:

```bash
stripe listen --forward-to localhost:25609/api/stripe-webhook
```

It prints `whsec_...` — paste that into `STRIPE_WEBHOOK_SECRET` in
`server/.env`, then restart the server.

For production (deployed backend), add the endpoint in Stripe Dashboard →
Developers → Webhooks → `https://sourcedbysmz.co.uk/api/stripe-webhook`
and subscribe to `payment_intent.succeeded` and `payment_intent.payment_failed`.

## 4. Test it

1. Restart the Pterodactyl server.
2. Add a priced, in-stock product in `/admin`.
3. Go to checkout, pay with Stripe test card `4242 4242 4242 4242`
   (any future expiry, any CVC).
4. Apple Pay / Google Pay appear automatically on supported devices/browsers.
5. The success page polls the order status and shows "Order Confirmed" only
   after the webhook marks it paid.

## 5. Going live

1. Replace `sk_test_...` with `sk_live_...` in `server/.env`.
2. Replace `pk_test_...` with `pk_live_...` in `server/.env`.
3. Register `https://sourcedbysmz.co.uk` in Stripe Dashboard → Payments →
   Apple Pay (domain verification).
4. Add the production webhook endpoint (step 3).
5. Run one more test-mode order, then switch.

## 6. Email from your own domain (stock alerts)

No provider account needed. The server sends directly and signs mail with
DKIM. Two things you must do in your domain's DNS:

1. **First boot prints your DKIM record** — look for `[mail] DKIM keys
   generated` in the server log and add that TXT record at
   `sbmz1._domainkey.sourcedbysmz.co.uk`.
2. **SPF record** (stops providers rejecting you outright) — TXT record at
   the domain root:
   `v=spf1 ip4:YOUR-SERVER-IP ~all`
   (find the IP with `npm run find:ip`).
3. **DMARC record** (tells receivers what to do with failures) — TXT at
   `_dmarc.sourcedbysmz.co.uk`:
   `v=DMARC1; p=none; rua=mailto:alerts@sourcedbysmz.co.uk`

Honest limits: many container hosts block outbound port 25 — if the admin
email log shows connection failures, set `SMTP_URL` in `server/.env` to a
relay instead. New server IPs also start with zero reputation, so Gmail may
spam-folder the first alerts. Every attempt (sent or failed with the reason)
is visible under Admin → Watchlist → email log.

## Security note

A live secret key was pasted into a chat during development. **Roll it now**
in Stripe Dashboard → Developers → API keys → rotate, and use the new key.
Chat history is not a safe place for secrets.
