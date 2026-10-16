/**
 * discounts.js — discount codes, validated and applied server-side only.
 *
 * File: server/data/discounts.json (git-ignored). Shape:
 *   { "codes": [ { "code": "WELCOME10", "type": "percent"|"fixed",
 *     "value": 10,            // percent 1-90, or fixed pence amount
 *     "minSubtotal": 0,       // minimum order subtotal in pence
 *     "maxUses": null,        // null = unlimited
 *     "usedCount": 0,
 *     "expiresAt": null,       // ISO string or null
 *     "active": true, "createdAt": "...", "updatedAt": "..." } ] }
 *
 * Money stays in integer pence. Usage is incremented ONLY on verified
 * payment (webhook), never at intent creation, so abandoned checkouts
 * never burn single-use codes. The file path is swappable for tests.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError } from './validate.js';

const here = dirname(fileURLToPath(import.meta.url));
let DISCOUNTS_FILE = join(here, 'data', 'discounts.json');

/** Override storage path (tests use a temp file). */
export function setDiscountsFile(path) {
  DISCOUNTS_FILE = path;
}

function load() {
  try {
    const parsed = JSON.parse(readFileSync(DISCOUNTS_FILE, 'utf8'));
    if (parsed && Array.isArray(parsed.codes)) return parsed.codes;
  } catch {
    // Missing/corrupt → no codes.
  }
  return [];
}

function save(codes) {
  mkdirSync(join(here, 'data'), { recursive: true });
  const tmp = `${DISCOUNTS_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ codes }, null, 2));
  renameSync(tmp, DISCOUNTS_FILE);
}

export function listDiscounts() {
  return load();
}

export function normaliseCode(code) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

export function validateDiscountRecord(record, existingCodes = new Set()) {
  const fail = (message) => {
    throw new HttpError(400, message);
  };
  if (!record || typeof record !== 'object') fail('Discount must be an object.');
  const code = normaliseCode(record.code);
  if (!/^[A-Z0-9]{3,24}$/.test(code)) fail('Code must be 3-24 letters/numbers (e.g. WELCOME10).');
  if (existingCodes.has(code)) fail(`Code "${code}" is already used.`);
  if (record.type !== 'percent' && record.type !== 'fixed') fail('Type must be percent or fixed.');
  if (!Number.isInteger(record.value) || record.value < 1) fail('Value must be a whole number of 1 or more.');
  if (record.type === 'percent' && record.value > 90) fail('Percent discount cannot exceed 90%.');
  if (record.minSubtotal !== undefined && (!Number.isInteger(record.minSubtotal) || record.minSubtotal < 0)) {
    fail('Minimum subtotal must be 0 or more pence.');
  }
  if (record.maxUses !== undefined && record.maxUses !== null && (!Number.isInteger(record.maxUses) || record.maxUses < 1)) {
    fail('Max uses must be empty (unlimited) or 1 or more.');
  }
  if (record.expiresAt !== undefined && record.expiresAt !== null) {
    const t = new Date(record.expiresAt).getTime();
    if (!Number.isFinite(t)) fail('Expiry must be a valid date or empty.');
  }
  if (typeof record.active !== 'boolean') fail('Active must be true or false.');
  return {
    code,
    type: record.type,
    value: record.value,
    minSubtotal: record.minSubtotal || 0,
    maxUses: record.maxUses ?? null,
    usedCount: Number.isInteger(record.usedCount) && record.usedCount >= 0 ? record.usedCount : 0,
    expiresAt: record.expiresAt || null,
    active: record.active,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function saveDiscount(record) {
  const codes = load();
  const clean = validateDiscountRecord(record, new Set(codes.map((c) => c.code)));
  codes.push(clean);
  save(codes);
  return clean;
}

export function updateDiscount(code, patch) {
  const codes = load();
  const idx = codes.findIndex((c) => c.code === normaliseCode(code));
  if (idx === -1) throw new HttpError(404, 'Discount code not found.');
  const merged = { ...codes[idx], ...patch, code: codes[idx].code, usedCount: codes[idx].usedCount };
  const others = new Set(codes.filter((_, i) => i !== idx).map((c) => c.code));
  codes[idx] = validateDiscountRecord(merged, others);
  codes[idx].usedCount = merged.usedCount;
  codes[idx].createdAt = merged.createdAt;
  save(codes);
  return codes[idx];
}

export function deleteDiscount(code) {
  const codes = load();
  const idx = codes.findIndex((c) => c.code === normaliseCode(code));
  if (idx === -1) throw new HttpError(404, 'Discount code not found.');
  codes.splice(idx, 1);
  save(codes);
}

/**
 * Validate a code against the CURRENT order subtotal and compute the
 * discount in pence. Throws HttpError(400) with a customer-safe message.
 */
export function applyDiscount(code, subtotal) {
  const clean = normaliseCode(code);
  if (!clean) throw new HttpError(400, 'Enter a discount code.');
  const record = load().find((c) => c.code === clean);
  if (!record || !record.active) throw new HttpError(400, 'That code is not valid.');
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    throw new HttpError(400, 'That code has expired.');
  }
  if (record.maxUses !== null && record.usedCount >= record.maxUses) {
    throw new HttpError(400, 'That code has already been used.');
  }
  if (subtotal < (record.minSubtotal || 0)) {
    throw new HttpError(400, 'That code needs a larger order.');
  }
  const amount =
    record.type === 'percent'
      ? Math.floor((subtotal * record.value) / 100)
      : Math.min(record.value, subtotal);
  if (amount <= 0) throw new HttpError(400, 'That code gives no discount on this order.');
  return {
    code: record.code,
    type: record.type,
    value: record.value,
    amount,
    description: record.type === 'percent' ? `${record.value}% off` : 'fixed discount',
  };
}

/** Increment usage after verified payment. Safe to call once per paid order. */
export function incrementUsage(code) {
  const clean = normaliseCode(code);
  if (!clean) return;
  const codes = load();
  const record = codes.find((c) => c.code === clean);
  if (!record) return;
  record.usedCount = (record.usedCount || 0) + 1;
  record.updatedAt = new Date().toISOString();
  save(codes);
}
