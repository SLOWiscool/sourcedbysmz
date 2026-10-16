/**
 * orders.js — post-payment order finalisation (pure logic, fully tested).
 *
 * Called by the Stripe webhook after signature verification + dedupe.
 * Re-checks live stock at success time (two shoppers can hold intents for
 * the last item) and refunds automatically when we cannot fulfil.
 */

import { variantKey } from './validate.js';

function availableFor(catalogue, sold, line) {
  const product = catalogue.products[line.productId];
  if (!product) return 0;
  let stock = product.stock;
  if (line.variantId) {
    const variant = (product.variants || {})[line.variantId];
    if (!variant) return 0;
    stock = variant.stock;
  }
  return stock - (sold.get(variantKey(line.productId, line.variantId)) || 0);
}

/**
 * @param {{catalogue: object, sold: Map<string, number>, orders: Map<string, object>}} deps
 * @param {{orderRef: string|undefined, intentId: string, refund: ((intentId: string) => Promise<unknown>) | null}} payment
 * @returns {{outcome: 'paid'|'refunded'|'refund_failed'|'already_final'|'unknown_order', ref: string|undefined}}
 */
export async function resolveSucceededOrder({ catalogue, sold, orders }, { orderRef, intentId, refund }) {
  const order = orderRef ? orders.get(orderRef) : undefined;
  if (!order) return { outcome: 'unknown_order', ref: orderRef };
  if (order.status === 'paid' || order.status === 'refunded') {
    return { outcome: 'already_final', ref: orderRef };
  }

  const oversold = order.lines.some((line) => line.quantity > availableFor(catalogue, sold, line));
  order.paymentIntentId = intentId;

  if (!oversold) {
    for (const line of order.lines) {
      const key = variantKey(line.productId, line.variantId);
      sold.set(key, (sold.get(key) || 0) + line.quantity);
    }
    order.status = 'paid';
    return { outcome: 'paid', ref: orderRef };
  }

  // Paid but we cannot fulfil: refund in full automatically.
  try {
    if (refund) await refund(intentId);
    order.status = 'refunded';
    return { outcome: 'refunded', ref: orderRef };
  } catch {
    order.status = 'paid_oversold';
    return { outcome: 'refund_failed', ref: orderRef };
  }
}
