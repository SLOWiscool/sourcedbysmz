import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const discountsMod = await import('../../server/discounts.js');
const watchlistMod = await import('../../server/watchlist.js');

const tmpFile = (name: string) => join(tmpdir(), `sbmz-test-${name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`);

describe('discount codes', () => {
  let file: string;
  beforeEach(() => {
    file = tmpFile('discounts');
    discountsMod.setDiscountsFile(file);
  });

  it('creates, validates and applies a percent code', () => {
    discountsMod.saveDiscount({ code: 'welcome10', type: 'percent', value: 10, active: true });
    const result = discountsMod.applyDiscount('  welcome10 ', 5000);
    expect(result.amount).toBe(500);
    expect(result.code).toBe('WELCOME10');
  });

  it('caps fixed codes at the subtotal and rejects bad codes', () => {
    discountsMod.saveDiscount({ code: 'FIVER', type: 'fixed', value: 500, active: true });
    expect(discountsMod.applyDiscount('FIVER', 300).amount).toBe(300);
    expect(() => discountsMod.applyDiscount('NOPE', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() => discountsMod.saveDiscount({ code: 'FIVER', type: 'fixed', value: 100, active: true })).toThrow(/already used/);
    expect(() => discountsMod.saveDiscount({ code: 'BIG', type: 'percent', value: 95, active: true })).toThrow(/90%/);
  });

  it('enforces expiry, usage limits and minimum spend', () => {
    discountsMod.saveDiscount({ code: 'OLD', type: 'percent', value: 10, active: true, expiresAt: '2020-01-01T00:00:00Z' });
    expect(() => discountsMod.applyDiscount('OLD', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
    discountsMod.saveDiscount({ code: 'ONCE', type: 'percent', value: 10, active: true, maxUses: 1 });
    discountsMod.incrementUsage('ONCE');
    expect(() => discountsMod.applyDiscount('ONCE', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
    discountsMod.saveDiscount({ code: 'BIGSPEND', type: 'percent', value: 10, active: true, minSubtotal: 10000 });
    expect(() => discountsMod.applyDiscount('BIGSPEND', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
    discountsMod.saveDiscount({ code: 'PAUSED', type: 'percent', value: 10, active: false });
    expect(() => discountsMod.applyDiscount('PAUSED', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('usage only moves when told to (paid webhook), never on preview', () => {
    discountsMod.saveDiscount({ code: 'ONCE2', type: 'percent', value: 10, active: true, maxUses: 5 });
    discountsMod.applyDiscount('ONCE2', 5000);
    discountsMod.applyDiscount('ONCE2', 5000);
    const [record] = discountsMod.listDiscounts().filter((d: { code: string }) => d.code === 'ONCE2');
    expect(record.usedCount).toBe(0);
    discountsMod.incrementUsage('ONCE2');
    expect(discountsMod.listDiscounts().find((d: { code: string }) => d.code === 'ONCE2').usedCount).toBe(1);
  });
});

describe('watchlist subscriptions', () => {
  let file: string;
  const known = new Set(['p-test']);
  beforeEach(() => {
    file = tmpFile('watchlist');
    watchlistMod.setWatchlistFile(file);
  });

  it('subscribes, dedupes silently and unsubscribes by token', () => {
    const first = watchlistMod.subscribe('p-test', 'Fan@Example.com', known);
    expect(first.ok).toBe(true);
    const second = watchlistMod.subscribe('p-test', 'fan@example.com', known);
    expect(second.duplicate).toBe(true);
    expect(watchlistMod.listSubscriptions().length).toBe(1);
    expect(watchlistMod.unsubscribe(first.token).ok).toBe(true);
    expect(watchlistMod.listSubscriptions().length).toBe(0);
  });

  it('rejects bad emails and unknown products', () => {
    expect(() => watchlistMod.subscribe('p-test', 'not-an-email', known)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
    expect(() => watchlistMod.subscribe('p-nope', 'a@b.co', known)).toThrowError(
      expect.objectContaining({ status: 404 })
    );
  });
});
