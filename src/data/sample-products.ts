import type { Product } from '../types';
import rawData from './products.json';

const data: unknown = rawData;

/**
 * Storefront catalogue — typed view of src/data/products.json.
 *
 * products.json is the single source of truth: the server seeds its
 * product database from server/seed-products.json (kept identical; a test
 * fails if they drift), and the trusted price/stock table lives in
 * server/catalogue.json (a test fails if ids, variants, prices, stock or
 * status drift).
 *
 * Adding more photos:
 *   1. Copy the file into public/images/products/ with a descriptive
 *      lowercase name (e.g. hooded-puffer-black-side.jpg).
 *   2. Append { "url": "/images/products/<name>", "alt": "..." } to the
 *      matching variant's "images" array in src/data/products.json.
 *   3. Copy src/data/products.json over server/seed-products.json
 *      (only needed before the admin panel has saved once — after that the
 *      server database is authoritative and admin edits apply instantly).
 * No component changes are needed — cards, galleries, thumbnails, cart
 * and checkout pick new images up automatically.
 *
 * Naming policy: plain descriptive names, never brand names.
 * Honesty rules: prices/stock stay 0 until owners confirm real values;
 * photo counts are NEVER stock; no invented claims.
 */
export const sampleProducts: Product[] = Array.isArray(data) ? (data as Product[]) : [];
