import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleProducts } from '../data/sample-products';
import { getAvailability, getEffectivePrice, describeAvailability } from '../types';

function allReferencedFiles(): Set<string> {
  const files = new Set<string>();
  for (const p of sampleProducts) {
    for (const image of p.images) files.add(image.url);
    for (const v of p.variants || []) {
      for (const image of v.images || []) files.add(image.url);
    }
  }
  // Keep just the filename for comparison with disk contents.
  return new Set([...files].map((u) => u.split('/').pop()!.toLowerCase()));
}

const BRAND_RE = /dior|moncler|canada goose|stone island|rolex|cartier|louis vuitton|goyard|cp company|b30|submariner|damier|eclipse|oblique|juste un clou/i;

function allCustomerText(): string[] {
  const texts: string[] = [];
  for (const p of sampleProducts) {
    texts.push(p.title, p.description, p.conditionNotes || '', ...(p.tags || []));
    for (const image of p.images) texts.push(image.alt);
    for (const v of p.variants || []) {
      texts.push(v.label);
      for (const image of v.images || []) texts.push(image.alt);
    }
  }
  return texts;
}

describe('sampleProducts', () => {
  it('has 16 products covering every owner photo set', () => {
    expect(sampleProducts.length).toBe(16);
  });

  it('all products have unique ids and slugs', () => {
    const ids = sampleProducts.map((p) => p.id);
    const slugs = sampleProducts.map((p) => p.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('customer-facing text uses plain descriptive names, never brand names', () => {
    const offenders = allCustomerText().filter((t) => BRAND_RE.test(t));
    expect(offenders).toEqual([]);
  });

  it('Chunky Sneakers is a single product with Black, Grey, White and White/Black variants', () => {
    const shoes = sampleProducts.find((p) => p.slug === 'chunky-sneakers');
    expect(shoes).toBeDefined();
    expect(shoes?.variants?.map((v) => v.label)).toEqual(['Black', 'Grey', 'White', 'White / Black']);
  });

  it('Hooded Puffer Jacket has Black, Navy, Grey, White, Blue and Silver variants', () => {
    const puffer = sampleProducts.find((p) => p.slug === 'hooded-puffer-jacket');
    expect(puffer?.variants?.map((v) => v.label)).toEqual(['Black', 'Navy', 'Grey', 'White', 'Blue', 'Silver']);
  });

  it('Fur-Hood Parka kept its original 5 photos and gained a Grey variant', () => {
    const parka = sampleProducts.find((p) => p.slug === 'fur-hood-parka')!;
    expect(parka).toBeDefined();
    expect(parka.variants?.map((v) => v.label)).toEqual(['Black', 'Grey']);
    const blackUrls = parka.variants![0]!.images!.map((i) => i.url);
    expect(blackUrls.filter((u) => u.includes('black-canada-goose-jacket')).length).toBe(5);
  });

  it('every variant has at least one image', () => {    for (const p of sampleProducts) {
      for (const v of p.variants || []) {
        expect((v.images || []).length, `${p.slug}/${v.id} has no images`).toBeGreaterThan(0);
      }
      expect(p.images.length, `${p.slug} has no fallback images`).toBeGreaterThan(0);
    }
  });

  it('unconfirmed prices show coming_soon, never sold_out', () => {    for (const p of sampleProducts) {
      expect(getEffectivePrice(p)).toBe(0);
      expect(getAvailability(p)).toBe('coming_soon');
      for (const v of p.variants || []) {
        expect(getAvailability(p, v.id)).toBe('coming_soon');
      }
    }
  });

  it('all image paths start with /images/products/', () => {
    for (const p of sampleProducts) {
      for (const image of p.images) {
        expect(image.url.startsWith('/images/products/')).toBe(true);
      }
      for (const v of p.variants || []) {
        for (const image of v.images || []) {
          expect(image.url.startsWith('/images/products/')).toBe(true);
        }
      }
    }
  });

  it('every photo file on disk is referenced by the catalogue (nothing left out)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const dir = join(here, '..', '..', 'public', 'images', 'products');
    const onDisk = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.jpg'))
      .map((e) => e.name.toLowerCase());
    expect(onDisk.length).toBeGreaterThan(0);
    const referenced = allReferencedFiles();
    const missing = onDisk.filter((f) => !referenced.has(f));
    expect(missing).toEqual([]);
  });

  it('server seed matches the storefront catalogue exactly', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const front = JSON.parse(readFileSync(join(here, '..', 'data', 'products.json'), 'utf8'));
    const seed = JSON.parse(readFileSync(join(here, '..', '..', 'server', 'seed-products.json'), 'utf8'));
    expect(seed).toEqual(front);
  });

  it('server catalogue mirrors frontend ids, variants, prices, stock and status', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const serverCatalogue = JSON.parse(
      readFileSync(join(here, '..', '..', 'server', 'catalogue.json'), 'utf8')
    );
    const serverIds = Object.keys(serverCatalogue.products).sort();
    const frontIds = sampleProducts.map((p) => p.id).sort();
    expect(serverIds).toEqual(frontIds);
    for (const p of sampleProducts) {
      const sp = serverCatalogue.products[p.id];
      expect(sp.status, `${p.id} status`).toBe(p.status);
      expect(sp.price, `${p.id} price`).toBe(p.price);
      expect(sp.stock, `${p.id} stock`).toBe(p.stockQuantity);
      const serverVariantIds = Object.keys(sp.variants || {}).sort();
      const frontVariantIds = (p.variants || []).map((v) => v.id).sort();
      expect(serverVariantIds, `${p.id} variants`).toEqual(frontVariantIds);
      expect(sp.sizes || [], `${p.id} sizes`).toEqual(p.sizes || []);
      for (const v of p.variants || []) {
        const sv = sp.variants[v.id];
        expect(sv.label, `${p.id}/${v.id} label`).toBe(v.label);
        expect(sv.price, `${p.id}/${v.id} price`).toBe(v.price ?? null);
        expect(sv.stock, `${p.id}/${v.id} stock`).toBe(v.stockQuantity);
      }
    }
  });

  it('describeAvailability explains variant-stock sold-outs', () => {    const shoes = sampleProducts.find((p) => p.slug === 'chunky-sneakers')!;
    const black = shoes.variants![0]!;
    const info = describeAvailability(shoes, black.id);
    expect(info.kind).toBe('coming_soon');
    expect(info.purchasable).toBe(false);
    expect(info.reason).toMatch(/no price/i);

    const priced = {
      ...shoes,
      price: 10000,
      status: 'active' as const,
      variants: [{ ...black, stockQuantity: 0 }],
    };
    const soldOut = describeAvailability(priced, black.id);
    expect(soldOut.kind).toBe('sold_out');
    expect(soldOut.reason).toMatch(/option's stock is 0/i);

    const live = {
      ...priced,
      variants: [{ ...black, stockQuantity: 3 }],
    };
    const buyable = describeAvailability(live, black.id);
    expect(buyable.kind).toBe('in_stock');
    expect(buyable.purchasable).toBe(true);
  });
});
