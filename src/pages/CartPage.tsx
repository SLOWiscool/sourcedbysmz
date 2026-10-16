import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart, useProductFromCart } from '../context/CartContext';
import { getGalleryImages, maxPurchasableQuantity } from '../types';
import { formatPrice } from '../lib/currency';
import DiscountForm, { type DiscountPreview } from '../components/cart/DiscountForm';

export default function CartPage() {
  const { state, removeItem, updateQuantity, clearCart, subtotal } = useCart();
  const [discount, setDiscount] = useState<DiscountPreview | null>(null);

  if (state.items.length === 0) {
    return (
      <div className="container section">
        <div className="empty-state">
          <ShoppingBag size={48} className="anim-float-up" />
          <h1 className="anim-slide-down-sm">Your bag is empty</h1>
          <p>Browse our curated selection and find something you love.</p>
          <Link to="/shop" className="btn btn--primary">
            Shop products
          </Link>
        </div>
      </div>
    );
  }

  // Display-only preview, mirroring the server rule (free standard delivery
  // on the discounted subtotal over £50). The server reprices authoritatively
  // when the payment starts, so this can never undercharge.
  const discountedSubtotal = Math.max(0, subtotal - (discount?.amount || 0));
  const shippingEstimate = discountedSubtotal >= 5000 ? 0 : 399;
  const total = discountedSubtotal + shippingEstimate;

  return (
    <div className="container section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-8)' }}>
        <h1 className="anim-slide-down-sm" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Shopping Bag</h1>
        <button onClick={clearCart} className="btn btn--secondary btn--small t-color">
          <Trash2 size={14} />
          Clear bag
        </button>
      </div>

      <div className="summary-layout">
        <ul className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {state.items.map((item) => {
            const product = useProductFromCart(item.productId);
            if (!product) return null;
            const variantLabel = item.variantId
              ? product.variants?.find(v => v.id === item.variantId)?.label
              : undefined;
            const maxQty = maxPurchasableQuantity(product, item.variantId);

            return (
              <li
                key={`${item.productId}-${item.variantId || ''}-${item.size || ''}`}
                className="card-row anim-slide-right tr-118"
                style={{
                  display: 'flex',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-large)'
                }}
              >
                <Link to={`/products/${product.slug}`} style={{ flexShrink: 0 }}>
                  <img
                    src={getGalleryImages(product, item.variantId)[0]?.url || product.images[0]?.url}
                    alt={getGalleryImages(product, item.variantId)[0]?.alt || product.title}
                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--radius-medium)', display: 'block' }}
                  />
                </Link>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Link to={`/products/${product.slug}`} style={{ fontWeight: 600, fontSize: '1rem' }}>
                        {product.title}
                      </Link>
                      {variantLabel && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Colour: {variantLabel}</p>
                      )}
                      {item.size && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Size: {item.size}</p>
                      )}
                    </div>
                    <p style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {formatPrice((product.variants?.find((v) => v.id === item.variantId)?.price ?? product.price) * item.quantity)}
                    </p>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {formatPrice(product.variants?.find((v) => v.id === item.variantId)?.price ?? product.price)} each
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-medium)' }}>
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1, item.size)}
                        aria-label="Decrease quantity"
                        className="icon-btn"
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1, item.size)}
                        aria-label="Increase quantity"
                        className="icon-btn"
                        disabled={item.quantity >= maxQty}
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId, item.size)}
                      className="t-color"
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-error)', fontSize: '0.875rem', fontWeight: 500 }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="anim-rise" style={{
          border: '1px solid var(--color-border)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-large)',
          position: 'sticky',
          top: 80
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Order Summary</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{formatPrice(subtotal)}</span>
            </div>
            {discount && (
              <div className="anim-pop-soft tr-31" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                <span>Discount ({discount.code})</span>
                <span style={{ fontWeight: 600 }}>−{formatPrice(discount.amount)}</span>
              </div>
            )}
            <DiscountForm items={state.items} onPreview={setDiscount} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Shipping</span>
              <span style={{ fontWeight: 600 }}>
                {shippingEstimate === 0 ? 'Free' : formatPrice(shippingEstimate)}
              </span>
            </div>
            {shippingEstimate > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Free shipping on orders over {formatPrice(5000)}
              </p>
            )}
          </div>

          <hr className="divider" style={{ marginBottom: 'var(--space-4)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{formatPrice(total)}</span>
          </div>

          <Link to="/checkout" className="btn btn--primary btn--full tr-52">
            Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
