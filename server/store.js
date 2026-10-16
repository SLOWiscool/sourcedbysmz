/**
 * store.js — file-backed product store for the admin panel.
 *
 * Reads server/data/products.json (seeded from the launch catalogue on
 * first run), validates every write, and persists atomically. This is the
 * same data the public /api/products route serves; the React storefront
 * loads it from the API with a static fallback, so admin edits appear on
 * the site without touching code.
 *
 * NOTE: a JSON file is correct for a two-person shop at this stage. If
 * concurrent editors or high traffic arrive, migrate this module to a
 * database — the route layer only uses loadStore/saveStore/validateProduct.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError } from './validate.js';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, 'data');
const DATA_FILE = join(DATA_DIR, 'products.json');
const SEED_FILE = join(here, 'seed-products.json');

const STATUSES = ['draft', 'active', 'sold_out', 'archived'];
const CONDITIONS = ['new', 'excellent', 'very_good', 'good', 'fair'];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isInt(n) {
  return Number.isInteger(n);
}

function fail(message) {
  throw new HttpError(400, message);
}

export function validateImage(image, where) {
  if (!image || typeof image !== 'object') fail(`${where}: image must be an object.`);
  if (typeof image.url !== 'string' || !image.url.startsWith('/images/products/')) {
    fail(`${where}: image url must start with /images/products/.`);
  }
  if (typeof image.alt !== 'string' || image.alt.trim() === '') fail(`${where}: image needs alt text.`);
}

export function validateVariant(variant, where) {
  if (!variant || typeof variant !== 'object') fail(`${where}: variant must be an object.`);
  if (typeof variant.id !== 'string' || variant.id.trim() === '') fail(`${where}: variant needs an id.`);
  if (typeof variant.label !== 'string' || variant.label.trim() === '') fail(`${where}: variant needs a label.`);
  if (variant.colorHex !== undefined && !/^#[0-9a-fA-F]{6}$/.test(variant.colorHex)) {
    fail(`${where}: colorHex must be like #111111.`);
  }
  if (!isInt(variant.stockQuantity) || variant.stockQuantity < -1) fail(`${where}: stockQuantity must be 0 or more, or -1 for unlimited stock.`);
  if (variant.price !== undefined && variant.price !== null && (!isInt(variant.price) || variant.price < 0)) {
    fail(`${where}: price must be in whole pence, 0 or more.`);
  }
  const images = variant.images || [];
  if (!Array.isArray(images)) fail(`${where}: images must be a list.`);
  images.forEach((image, i) => validateImage(image, `${where} image ${i + 1}`));
}

/**
 * Full validation for create/replace. `existingSlugs`/`existingIds` are the
 * slugs/ids of OTHER products (for uniqueness checks on update).
 */
export function validateProduct(product, existingSlugs = new Set(), existingIds = new Set()) {
  if (!product || typeof product !== 'object') fail('Product must be an object.');
  if (typeof product.id !== 'string' || product.id.trim() === '') fail('Product needs an id.');
  if (existingIds.has(product.id)) fail(`Product id "${product.id}" is already used.`);
  if (typeof product.slug !== 'string' || !SLUG_RE.test(product.slug)) {
    fail('Slug must be lowercase letters, numbers and hyphens (e.g. "down-vest").');
  }
  if (existingSlugs.has(product.slug)) fail(`Slug "${product.slug}" is already used.`);
  if (typeof product.title !== 'string' || product.title.trim() === '') fail('Product needs a title.');
  if (typeof product.category !== 'string' || product.category.trim() === '') fail('Product needs a category.');
  if (typeof product.description !== 'string' || product.description.trim() === '') {
    fail('Product needs a description.');
  }
  if (!isInt(product.price) || product.price < 0) fail('Price must be in whole pence, 0 or more.');
  if (product.currency !== 'GBP') fail('Currency must be GBP.');
  if (!CONDITIONS.includes(product.condition)) fail(`Condition must be one of: ${CONDITIONS.join(', ')}.`);
  if (product.conditionNotes !== undefined && typeof product.conditionNotes !== 'string') {
    fail('Condition notes must be text.');
  }
  if (!isInt(product.stockQuantity) || product.stockQuantity < -1) fail('Stock must be 0 or more, or -1 for unlimited stock.');
  if (product.sizes !== undefined) {
    if (!Array.isArray(product.sizes)) fail('Sizes must be a list.');
    if (product.sizes.length > 30) fail('Sizes list is too long.');
    for (const s of product.sizes) {
      if (typeof s !== 'string' || s.trim() === '' || s.length > 12) fail('Each size must be short text (e.g. "M", "42").');
    }
  }
  if (!STATUSES.includes(product.status)) fail(`Status must be one of: ${STATUSES.join(', ')}.`);
  if (typeof product.featured !== 'boolean') fail('Featured must be true or false.');
  if (!Array.isArray(product.tags)) fail('Tags must be a list.');
  const images = product.images || [];
  if (!Array.isArray(images) || images.length === 0) fail('Product needs at least one image.');
  images.forEach((image, i) => validateImage(image, `Image ${i + 1}`));
  const variants = product.variants || [];
  if (!Array.isArray(variants)) fail('Variants must be a list.');
  const seen = new Set();
  variants.forEach((v) => {
    if (seen.has(v.id)) fail(`Duplicate variant id "${v.id}".`);
    seen.add(v.id);
    validateVariant(v, `Variant "${v.id || '?'}"`);
  });
  return true;
}

function seedIfMissing() {
  if (existsSync(DATA_FILE)) return;
  mkdirSync(DATA_DIR, { recursive: true });
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
  writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
}

export function loadStore() {
  seedIfMissing();
  return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
}

export function saveStore(products) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(products, null, 2));
  renameSync(tmp, DATA_FILE);
}

export function publicProducts() {
  return loadStore().filter((p) => p.status === 'active');
}
