import { getBackendUrl } from './stripe';
import type { Product } from '../types';

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface MediaFile {
  name: string;
  url: string;
  size: number;
  mtime: number;
}

export interface AdminOrder {
  ref: string;
  email: string;
  items: number;
  lines: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    title: string;
    variantLabel?: string;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
}

async function req<T>(path: string, options: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const base = getBackendUrl();
  if (base === null) {
    throw new AdminApiError(0, 'Backend is not reachable. Start it with `npm run server`.');
  }
  const init: RequestInit = { method: options.method || 'GET', credentials: 'include' };
  if (options.form) {
    init.body = options.form;
  } else if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, init);
  } catch {
    throw new AdminApiError(0, 'Backend is not reachable. Start it with `npm run server`.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AdminApiError(res.status, (data as { error?: string }).error || `Request failed (${res.status}).`);
  }
  return data as T;
}

export const adminLogin = (username: string, password: string) =>
  req<{ ok: boolean }>('/api/admin/login', { method: 'POST', body: { username, password } });

export const adminSettings = () => req<{ settings: { logoUrl: string | null } }>('/api/admin/settings');

export const adminSetLogo = (logoUrl: string) =>
  req<{ settings: { logoUrl: string } }>('/api/admin/settings', { method: 'POST', body: { logoUrl } });

export const adminLogout = () => req<{ ok: boolean }>('/api/admin/logout', { method: 'POST' });

export const adminMe = () => req<{ admin: boolean }>('/api/admin/me');

export const adminListProducts = () => req<{ products: Product[] }>('/api/admin/products');

export interface DiscountRecord {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistEntry {
  token: string;
  productId: string;
  email: string;
  createdAt: string;
  notifiedAt: string | null;
}

export const adminListDiscounts = () => req<{ discounts: DiscountRecord[] }>('/api/admin/discounts');

export const adminCreateDiscount = (discount: Partial<DiscountRecord> & { code: string; type: 'percent' | 'fixed'; value: number }) =>
  req<{ discount: DiscountRecord }>('/api/admin/discounts', { method: 'POST', body: discount });

export const adminUpdateDiscount = (code: string, patch: Partial<DiscountRecord>) =>
  req<{ discount: DiscountRecord }>(`/api/admin/discounts/${encodeURIComponent(code)}`, { method: 'PUT', body: patch });

export const adminDeleteDiscount = (code: string) =>
  req<{ ok: boolean }>(`/api/admin/discounts/${encodeURIComponent(code)}`, { method: 'DELETE' });

export const adminWatchlist = () =>
  req<{ subscriptions: WatchlistEntry[]; outbox: Array<Record<string, unknown>> }>('/api/admin/watchlist');

export const adminRemoveWatchlist = (token: string) =>
  req<{ ok: boolean }>(`/api/admin/watchlist/${encodeURIComponent(token)}`, { method: 'DELETE' });

export const adminNotifyWatchlist = (productId: string) =>
  req<{ ok: boolean; sent: number; failed: number; waiting: number; failures: Array<{ email: string; reason: string }> }>(
    '/api/admin/watchlist/notify',
    { method: 'POST', body: { productId } }
  );

export const adminCreateProduct = (product: Product) =>
  req<{ product: Product }>('/api/admin/products', { method: 'POST', body: product });

export const adminUpdateProduct = (id: string, product: Product) =>
  req<{ product: Product }>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body: product });

export const adminDeleteProduct = (id: string) =>
  req<{ ok: boolean }>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const adminMedia = () => req<{ files: MediaFile[] }>('/api/admin/media');

export const adminUpload = (file: File) => {
  const form = new FormData();
  form.append('image', file);
  return req<{ url: string; name: string }>('/api/admin/upload', { method: 'POST', form });
};

export const adminOrders = () => req<{ orders: AdminOrder[] }>('/api/admin/orders');
