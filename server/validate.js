/**
 * validate.js — pure checkout validation shared by the API route.
 * No network, no framework imports: safe to unit test.
 *
 * The catalogue argument is the TRUSTED server copy (server/catalogue.json).
 * Anything the browser sends (prices, totals, discounts) is ignored except
 * product IDs, variant IDs and quantities.
 */

export class HttpError extends Error {
  /** @param {number} status HTTP status code */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function variantKey(productId, variantId) {
  return `${productId}::${variantId || ''}`;
}

/**
 * @param {object} catalogue trusted catalogue (currency, shipping, products)
 * @param {Map<string, number>} sold units already sold per variantKey (for live availability)
 * @param {{items: Array<{productId: string, variantId?: string, size?: string, quantity: number}>, email: string, shippingMethod: string, discountCode?: string}} payload
 * @param {(code: string, subtotal: number) => {code: string, amount: number, description: string} | null} [discountApplier]
 *   Server-side discount hook (discounts.js). The browser never prices anything.
 * @returns {{lines: Array<{productId: string, variantId: string|undefined, size: string|undefined, quantity: number, unitPrice: number, title: string, variantLabel: string|undefined}>, subtotal: number, discount: {code: string, amount: number, description: string} | null, shipping: number, total: number, currency: string}}
 * @throws {HttpError} with status 400/404/409 on any invalid or unavailable request
 */
export function validateCheckout(catalogue, sold, payload, discountApplier) {
  const { items, email, shippingMethod } = payload || {};

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Your bag is empty.');
  }
  if (items.length > 50) {
    throw new HttpError(400, 'Too many lines in one order.');
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new HttpError(400, 'Enter a valid email address.');
  }
  if (shippingMethod !== 'standard' && shippingMethod !== 'express') {
    throw new HttpError(400, 'Choose a supported delivery option.');
  }

  const lines = items.map((item, i) => {
    const label = `Item ${i + 1}`;
    if (!item || typeof item.productId !== 'string') {
      throw new HttpError(400, `${label}: unknown product.`);
    }
    const product = catalogue.products[item.productId];
    if (!product) {
      throw new HttpError(404, `${label}: product no longer exists.`);
    }
    if (product.status !== 'active') {
      throw new HttpError(409, `${label}: "${product.title}" is not currently available.`);
    }

    const variantIds = Object.keys(product.variants || {});
    let variantId;
    let variantLabel;
    let unitPrice = product.price;
    let stock = product.stock;

    if (variantIds.length > 0) {
      if (typeof item.variantId !== 'string' || !product.variants[item.variantId]) {
        throw new HttpError(400, `${label}: choose a valid option for "${product.title}".`);
      }
      variantId = item.variantId;
      const variant = product.variants[variantId];
      variantLabel = variant.label;
      if (variant.price !== null && variant.price !== undefined) unitPrice = variant.price;
      stock = variant.stock;
    } else if (item.variantId !== undefined) {
      throw new HttpError(400, `${label}: invalid option for "${product.title}".`);
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > (catalogue.maxQuantityPerLine || 10)) {
      throw new HttpError(400, `${label}: quantity must be between 1 and ${catalogue.maxQuantityPerLine || 10}.`);
    }
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    let size;
    if (sizes.length > 0) {
      if (typeof item.size !== 'string' || !sizes.includes(item.size)) {
        throw new HttpError(400, `${label}: choose a valid size for "${product.title}".`);
      }
      size = item.size;
    } else if (item.size !== undefined) {
      throw new HttpError(400, `${label}: invalid size for "${product.title}".`);
    }
    if (unitPrice <= 0) {
      throw new HttpError(409, `${label}: "${product.title}" is not currently priced for sale.`);
    }
    const alreadySold = sold.get(variantKey(item.productId, variantId)) || 0;
    // -1 means unlimited stock: never blocks the order, never goes negative.
    const available = stock === -1 ? Number.POSITIVE_INFINITY : stock - alreadySold;
    if (item.quantity > available) {
      throw new HttpError(
        409,
        available <= 0
          ? `${label}: "${product.title}" is out of stock.`
          : `${label}: only ${available} available for "${product.title}".`
      );
    }

    return { productId: item.productId, variantId, size, quantity: item.quantity, unitPrice, title: product.title, variantLabel };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  let discount = null;
  const discountCode = typeof payload?.discountCode === 'string' && payload.discountCode.trim() !== ''
    ? payload.discountCode
    : null;
  if (discountCode && typeof discountApplier === 'function') {
    discount = discountApplier(discountCode, subtotal);
  }
  const discounted = subtotal - (discount ? discount.amount : 0);
  const shipping =
    shippingMethod === 'express'
      ? catalogue.shipping.express
      : discounted >= catalogue.shipping.freeStandardOver
        ? 0
        : catalogue.shipping.standard;
  const total = discounted + shipping;

  if (total <= 0) {
    throw new HttpError(409, 'This order cannot be priced yet.');
  }

  return { lines, subtotal, discount, shipping, total, currency: catalogue.currency };
}

export { variantKey };
