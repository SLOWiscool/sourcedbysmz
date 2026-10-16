import { describe, it, expect } from 'vitest';

const auth = await import('../../server/auth.js');
const storeMod = await import('../../server/store.js');
const validateMod = await import('../../server/validate.js');
const ordersMod = await import('../../server/orders.js');

const catalogue = () => ({
  currency: 'GBP',
  shipping: { standard: 399, express: 699, freeStandardOver: 5000 },
  maxQuantityPerLine: 10,
  products: {
    'p-test': {
      status: 'active',
      price: 2000,
      stock: 5,
      title: 'Test',
      variants: { 't-one': { label: 'One', price: null, stock: 2 } },
    },
  },
});

const goodProduct = () => ({
  id: 'p-test',
  slug: 'test-product',
  title: 'Test Product',
  category: 'Accessories',
  description: 'A test product.',
  price: 4999,
  currency: 'GBP',
  condition: 'good',
  conditionNotes: '',
  images: [{ url: '/images/products/test.jpg', alt: 'Test photo' }],
  variants: [{ id: 't-one', label: 'One', stockQuantity: 3 }],
  stockQuantity: 0,
  status: 'active',
  featured: false,
  tags: ['test'],
  createdAt: '2026-10-13T00:00:00Z',
  updatedAt: '2026-10-13T00:00:00Z',
});

describe('admin auth (scrypt password hashing)', () => {
  it('hashes and verifies the correct password', async () => {
    const hash = await auth.hashPassword('correct-horse-battery-99');
    expect(hash.startsWith('scrypt$v=1$')).toBe(true);
    expect(await auth.verifyPassword('correct-horse-battery-99', hash)).toBe(true);
  });

  it('rejects wrong passwords and malformed hashes without throwing', async () => {
    const hash = await auth.hashPassword('correct-horse-battery-99');
    expect(await auth.verifyPassword('wrong-password-here', hash)).toBe(false);
    expect(await auth.verifyPassword('', hash)).toBe(false);
    expect(await auth.verifyPassword('x'.repeat(20), 'not-a-hash')).toBe(false);
    expect(await auth.verifyPassword('x'.repeat(20), null)).toBe(false);
  });

  it('refuses short passwords at setup time', async () => {
    await expect(auth.hashPassword('short')).rejects.toThrow();
  });

  it('checkCredentials is false when auth is not configured', async () => {
    // Vitest never loads server/.env, so no admin exists in tests.
    expect(await auth.checkCredentials('anyone', 'anything-at-all-here')).toBe(false);
  });
});

  it('marks paid and decrements stock on verified success', async () => {
    const sold = new Map();
    const orders = new Map();
    orders.set('order_1', { status: 'pending', lines: [{ productId: 'p-test', variantId: 't-one', quantity: 1 }] });
    const result = await ordersMod.resolveSucceededOrder(
      { catalogue: catalogue(), sold, orders },
      { orderRef: 'order_1', intentId: 'pi_1', refund: null }
    );
    expect(result.outcome).toBe('paid');
    expect(orders.get('order_1').status).toBe('paid');
    expect(sold.get('p-test::t-one')).toBe(1);
  });

  it('refunds automatically when the last unit is gone', async () => {
    const sold = new Map([['p-test::t-one', 2]]);
    const orders = new Map();
    orders.set('order_2', { status: 'pending', lines: [{ productId: 'p-test', variantId: 't-one', quantity: 1 }] });
    const refunds: string[] = [];
    const result = await ordersMod.resolveSucceededOrder(
      { catalogue: catalogue(), sold, orders },
      { orderRef: 'order_2', intentId: 'pi_2', refund: async (id: string) => { refunds.push(id); } }
    );
    expect(result.outcome).toBe('refunded');
    expect(orders.get('order_2').status).toBe('refunded');
    expect(refunds).toEqual(['pi_2']);
  });

  it('is idempotent — a duplicate webhook never double-charges stock', async () => {
    const sold = new Map();
    const orders = new Map();
    orders.set('order_3', { status: 'pending', lines: [{ productId: 'p-test', variantId: 't-one', quantity: 1 }] });
    const first = await ordersMod.resolveSucceededOrder(
      { catalogue: catalogue(), sold, orders },
      { orderRef: 'order_3', intentId: 'pi_3', refund: null }
    );
    const second = await ordersMod.resolveSucceededOrder(
      { catalogue: catalogue(), sold, orders },
      { orderRef: 'order_3', intentId: 'pi_3', refund: null }
    );
    expect(first.outcome).toBe('paid');
    expect(second.outcome).toBe('already_final');
    expect(sold.get('p-test::t-one')).toBe(1);
  });

describe('admin product validation', () => {
  it('accepts a well-formed product', () => {
    expect(storeMod.validateProduct(goodProduct())).toBe(true);
  });

  it('rejects duplicate slugs and ids, bad money, missing photos, bad status', () => {
    expect(() => storeMod.validateProduct({ ...goodProduct(), id: 'other' }, new Set(['test-product']), new Set())).toThrow(/slug/i);
    expect(() => storeMod.validateProduct(goodProduct(), new Set(), new Set(['p-test']))).toThrow(/already used/);
    expect(() => storeMod.validateProduct({ ...goodProduct(), price: -5 })).toThrow(/price/i);
    expect(() => storeMod.validateProduct({ ...goodProduct(), price: 49.99 })).toThrow(/pence/i);
    expect(() => storeMod.validateProduct({ ...goodProduct(), images: [] })).toThrow(/image/i);
    expect(() => storeMod.validateProduct({ ...goodProduct(), status: 'live' })).toThrow(/status/i);
    expect(() =>
      storeMod.validateProduct({
        ...goodProduct(),
        variants: [
          { id: 'dup', label: 'A', stockQuantity: 1 },
          { id: 'dup', label: 'B', stockQuantity: 1 },
        ],
      })
    ).toThrow(/duplicate variant/i);
  });
});

describe('server checkout validation', () => {
  const catalogue = (): any => ({
    currency: 'GBP',
    shipping: { standard: 399, express: 699, freeStandardOver: 5000 },
    maxQuantityPerLine: 10,
    products: {
      'p-test': { status: 'active', price: 2000, stock: 0, title: 'Test', variants: { 't-one': { label: 'One', price: null, stock: 5 } } },
      'p-unpriced': { status: 'active', price: 0, stock: 0, title: 'Unpriced', variants: {} },
    },
  });

  it('prices a valid order from trusted data (ignores client totals)', () => {
    const order = validateMod.validateCheckout(catalogue(), new Map(), {
      items: [{ productId: 'p-test', variantId: 't-one', quantity: 2 }],
      email: 'buyer@example.com',
      shippingMethod: 'standard',
    });
    expect(order.subtotal).toBe(4000);
    // 4000 < 5000 so standard delivery is charged.
    expect(order.shipping).toBe(399);
    expect(order.total).toBe(4399);
  });

  it('honestly refuses unpriced items instead of selling them', () => {
    expect(() =>
      validateMod.validateCheckout(catalogue(), new Map(), {
        items: [{ productId: 'p-unpriced', quantity: 1 }],
        email: 'buyer@example.com',
        shippingMethod: 'standard',
      })
    ).toThrowError(expect.objectContaining({ status: 409 }));
  });

  it('rejects unknown variants, overselling and bad email', () => {    const badVariant = () =>
      validateMod.validateCheckout(catalogue(), new Map(), {
        items: [{ productId: 'p-test', variantId: 'nope', quantity: 1 }],
        email: 'buyer@example.com',
        shippingMethod: 'standard',
      });
    expect(badVariant).toThrowError(expect.objectContaining({ status: 400 }));

    const oversell = () =>
      validateMod.validateCheckout(catalogue(), new Map(), {
        items: [{ productId: 'p-test', variantId: 't-one', quantity: 6 }],
        email: 'buyer@example.com',
        shippingMethod: 'standard',
      });
    expect(oversell).toThrowError(expect.objectContaining({ status: 409 }));

    const badEmail = () =>
      validateMod.validateCheckout(catalogue(), new Map(), {
        items: [{ productId: 'p-test', variantId: 't-one', quantity: 1 }],
        email: 'not-an-email',
        shippingMethod: 'standard',
      });
    expect(badEmail).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('requires a listed size when the product has sizes, and none otherwise', () => {
    const sizedCatalogue = () => {
      const c = catalogue();
      c.products['p-test'].sizes = ['S', 'M', 'L'];
      return c;
    };
    const base = { email: 'buyer@example.com', shippingMethod: 'standard' };

    expect(() =>
      validateMod.validateCheckout(sizedCatalogue(), new Map(), {
        ...base,
        items: [{ productId: 'p-test', variantId: 't-one', quantity: 1 }],
      })
    ).toThrowError(expect.objectContaining({ status: 400 }));

    expect(() =>
      validateMod.validateCheckout(sizedCatalogue(), new Map(), {
        ...base,
        items: [{ productId: 'p-test', variantId: 't-one', size: 'XXL', quantity: 1 }],
      })
    ).toThrowError(expect.objectContaining({ status: 400 }));

    const order = validateMod.validateCheckout(sizedCatalogue(), new Map(), {
      ...base,
      items: [{ productId: 'p-test', variantId: 't-one', size: 'M', quantity: 1 }],
    });
    expect(order.lines[0].size).toBe('M');

    expect(() =>
      validateMod.validateCheckout(catalogue(), new Map(), {
        ...base,
        items: [{ productId: 'p-test', variantId: 't-one', size: 'M', quantity: 1 }],
      })
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
