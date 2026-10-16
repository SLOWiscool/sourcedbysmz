import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;
let runtimeConfig: Promise<{ stripePublishableKey: string | null }> | null = null;

/** Publishable key only. Never put a secret key here. */
export function getPublishableKey(): string | null {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key || key.includes('placeholder') || key.trim() === '') return null;
  return key;
}

/**
 * Publishable key served by the backend at runtime (server/.env
 * STRIPE_PUBLISHABLE_KEY). Lets keys take effect with a restart —
 * no rebuild needed. Falls back to the build-time VITE_ key.
 */
export function loadRuntimeConfig(): Promise<{ stripePublishableKey: string | null }> {
  if (!runtimeConfig) {
    runtimeConfig = (async () => {
      try {
        const base = getBackendUrl();
        if (base === null) return { stripePublishableKey: null };
        const res = await fetch(`${base}/api/public-config`);
        if (!res.ok) return { stripePublishableKey: null };
        const data = await res.json();
        const key = typeof data?.stripePublishableKey === 'string' ? data.stripePublishableKey : '';
        if (!key || key.includes('placeholder') || key.trim() === '') return { stripePublishableKey: null };
        return { stripePublishableKey: key };
      } catch {
        return { stripePublishableKey: null };
      }
    })();
  }
  return runtimeConfig;
}

/** Effective key: runtime (server/.env) first, build-time VITE_ second. */
export async function getEffectivePublishableKey(): Promise<string | null> {
  const runtime = await loadRuntimeConfig();
  if (runtime.stripePublishableKey) return runtime.stripePublishableKey;
  return getPublishableKey();
}

export function isStripeConfigured(): boolean {
  return getPublishableKey() !== null;
}

export function getStripe(key?: string): Promise<Stripe | null> {
  const wanted = key || getPublishableKey();
  if (!wanted) return Promise.resolve(null);
  if (!stripePromise) {
    stripePromise = loadStripe(wanted);
  }
  return stripePromise;
}

export interface CheckoutPayload {
  items: Array<{ productId: string; variantId?: string; size?: string; quantity: number }>;
  email: string;
  shippingMethod: 'standard' | 'express';
}

/**
 * Calls the backend to create a PaymentIntent.
 * The backend MUST validate product/variant/quantity/price/stock and
 * compute totals from trusted data. Never trust client totals.
 * Returns null when there is deliberately no backend (demo mode).
 * An empty-string URL means same-origin (backend serves the shop).
 */
export async function createPaymentIntent(
  backendUrl: string | null,
  payload: CheckoutPayload
): Promise<{ clientSecret: string; orderRef?: string } | null> {
  if (backendUrl === null) return null;
  const res = await fetch(`${backendUrl}/api/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Payment setup failed (${res.status})`);
  return res.json() as Promise<{ clientSecret: string; orderRef?: string }>;
}

export function getBackendUrl(): string | null {
  const url = import.meta.env.VITE_BACKEND_URL as string | undefined;
  if (url && url.trim() !== '') return url.replace(/\/$/, '');
  // Local development convenience: the backend runs on :4242 via `npm run server`.
  if (import.meta.env.DEV) return 'http://localhost:4242';
  // Production default: the backend serves the shop from the same origin
  // (single-process hosting, e.g. `node launcher.js` on Pterodactyl).
  return '';
}
