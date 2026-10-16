import type { Product } from '../types';
import { sampleProducts } from '../data/sample-products';
import { getBackendUrl } from './stripe';

/**
 * Product source: the shop loads its catalogue from the backend
 * (GET /api/products, served from the server's product database, which the
 * admin panel edits) and falls back to the bundled static catalogue when
 * the backend is unreachable. Components must read through getProducts()
 * or the useProducts() hook so admin edits appear without a rebuild.
 */

let cache: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;
const listeners = new Set<() => void>();

/** Ask the backend for the active brand logo URL (set in the admin panel). */
export async function getLogoUrl(): Promise<string | null> {
  const base = getBackendUrl();
  if (base === null) return null;
  try {
    const res = await fetch(`${base}/api/brand`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data.logoUrl === 'string' && data.logoUrl ? data.logoUrl : null;
  } catch {
    return null;
  }
}

function isValidProduct(p: unknown): p is Product {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.slug === 'string' &&
    typeof o.title === 'string' &&
    typeof o.category === 'string' &&
    typeof o.description === 'string' &&
    typeof o.price === 'number' &&
    Array.isArray(o.images) &&
    o.images.length > 0 &&
    typeof o.status === 'string'
  );
}

/** Synchronous read for non-hook code (cart totals, lookups). */
export function getProducts(): Product[] {
  if (cache) return cache;
  if (Array.isArray(sampleProducts)) return sampleProducts;
  return [];
}

export function subscribeProducts(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A broken subscriber must not break the store.
    }
  });
}

export async function loadProducts(force = false): Promise<Product[]> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  const task = (async () => {
    try {
      const base = getBackendUrl();
      if (base === null) {
        if (!cache) cache = sampleProducts;
        return cache;
      }
      const res = await fetch(`${base}/api/products`);
      if (!res.ok) throw new Error(`products ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.products;
      if (!Array.isArray(raw)) throw new Error('bad products payload');
      cache = raw.filter(isValidProduct);
    } catch {
      // Keep the last good catalogue if we have one; otherwise fall back.
      if (!cache) cache = sampleProducts;
    }
    notify();
    return cache;
  })();
  inflight = task;
  return task;
}
