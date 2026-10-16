import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

/** Publishable key only. Never put a secret key here. */
export function getPublishableKey(): string | null {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key || key.includes('placeholder') || key.trim() === '') return null;
  return key;
}

export function isStripeConfigured(): boolean {
  return getPublishableKey() !== null;
}

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = getPublishableKey();
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
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
