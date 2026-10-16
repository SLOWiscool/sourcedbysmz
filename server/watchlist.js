/**
 * watchlist.js — stock-alert subscriptions ("notify me when available").
 *
 * File: server/data/watchlist.json (git-ignored). Shape:
 *   { "subscriptions": [ { "token": "...", "productId": "...", "email": "...",
 *     "createdAt": "...", "notifiedAt": null } ] }
 *
 * Privacy: stores the minimum (email + product + date). Every subscribe
 * requires the on-page consent note; every future email must carry the
 * unsubscribe link below. No marketing use — stock alerts only.
 * The file path is swappable for tests.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { HttpError } from './validate.js';

const here = dirname(fileURLToPath(import.meta.url));
let WATCHLIST_FILE = join(here, 'data', 'watchlist.json');

/** Override storage path (tests use a temp file). */
export function setWatchlistFile(path) {
  WATCHLIST_FILE = path;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function load() {
  try {
    const parsed = JSON.parse(readFileSync(WATCHLIST_FILE, 'utf8'));
    if (parsed && Array.isArray(parsed.subscriptions)) return parsed.subscriptions;
  } catch {
    // Missing/corrupt → empty list.
  }
  return [];
}

function save(subscriptions) {
  mkdirSync(join(here, 'data'), { recursive: true });
  const tmp = `${WATCHLIST_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ subscriptions }, null, 2));
  renameSync(tmp, WATCHLIST_FILE);
}

export function listSubscriptions() {
  return load();
}

/**
 * Subscribe an email to stock alerts for a product. Always succeeds
 * (idempotent) so the endpoint never reveals whether an email is
 * already subscribed.
 */
export function subscribe(productId, email, knownProductIds) {
  if (typeof productId !== 'string' || !knownProductIds.has(productId)) {
    throw new HttpError(404, 'Product not found.');
  }
  const clean = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(clean)) throw new HttpError(400, 'Enter a valid email address.');
  const subscriptions = load();
  const existing = subscriptions.find((s) => s.productId === productId && s.email === clean);
  if (existing) return { ok: true, token: existing.token, duplicate: true };
  const entry = {
    token: randomUUID().replace(/-/g, '').slice(0, 24),
    productId,
    email: clean,
    createdAt: new Date().toISOString(),
    notifiedAt: null,
  };
  subscriptions.push(entry);
  save(subscriptions);
  return { ok: true, token: entry.token, duplicate: false };
}

/** Remove a subscription by token. Always succeeds (same anti-enumeration rule). */
export function unsubscribe(token) {
  const subscriptions = load();
  const idx = subscriptions.findIndex((s) => s.token === token);
  if (idx !== -1) {
    subscriptions.splice(idx, 1);
    save(subscriptions);
  }
  return { ok: true };
}

/** Admin removal by token. */
export function removeSubscription(token) {
  const subscriptions = load();
  const idx = subscriptions.findIndex((s) => s.token === token);
  if (idx === -1) throw new HttpError(404, 'Subscription not found.');
  subscriptions.splice(idx, 1);
  save(subscriptions);
}

/** Mark subscribers as notified (called when the email provider sends). */
export function markNotified(tokens) {
  const set = new Set(tokens);
  const subscriptions = load();
  let changed = false;
  for (const s of subscriptions) {
    if (set.has(s.token) && !s.notifiedAt) {
      s.notifiedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) save(subscriptions);
}

/** Purchasable in the same sense as the shop: active, priced, with stock. */
export function isRecordPurchasable(p) {
  if (!p || p.status !== 'active') return false;
  if (!(p.price > 0)) return false;
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    return p.variants.some((v) => v.stockQuantity > 0);
  }
  return p.stockQuantity > 0;
}

/**
 * Subscribers owed an alert: product just became buyable and they have
 * never been notified for it. Pure — easy to test, no I/O.
 */
export function findNewlyAvailableWatchers(oldProduct, newProduct, subscriptions) {
  if (!newProduct || isRecordPurchasable(oldProduct) || !isRecordPurchasable(newProduct)) return [];
  return (subscriptions || []).filter((s) => s.productId === newProduct.id && !s.notifiedAt);
}
