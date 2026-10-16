import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../hooks/useProducts';
import { getGalleryImages } from '../../types';
import { formatPrice } from '../../lib/currency';

export default function CartDrawer() {
  const { products } = useProducts();
  const { state, closeDrawer, removeItem, updateQuantity } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.drawerOpen) {
      closeRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [state.drawerOpen]);

  useEffect(() => {
    if (!state.drawerOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [state.drawerOpen, closeDrawer]);

  if (!state.drawerOpen) return null;

  const lines = state.items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { item, product };
    })
    .filter(Boolean) as Array<{ item: (typeof state.items)[0]; product: (typeof products)[0] }>;

  const subtotal = lines.reduce(
    (sum, { item, product }) =>
      sum + (product.variants?.find((v) => v.id === item.variantId)?.price ?? product.price) * item.quantity,
    0
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
      style={{ position: 'fixed', inset: 0, zIndex: 200 }}
    >
      <div
        onClick={closeDrawer}
        className="anim-fade"
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
      />
      <div
        ref={drawerRef}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 400,
          background: 'var(--color-paper)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-overlay)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Your Bag</h2>
          <button
            ref={closeRef}
            onClick={closeDrawer}
            aria-label="Close bag"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-medium)',
              color: 'var(--color-text)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
          {lines.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
              <p>Your bag is empty.</p>
              <Link to="/shop" onClick={closeDrawer} className="btn btn--primary btn--small">
                Continue shopping
              </Link>
            </div>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {lines.map(({ item, product }, i) => (
                <li key={`${item.productId}-${item.variantId || ''}-${item.size || ''}`} className="card-row anim-slide-right" style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-medium)',
                  animationDelay: `${Math.min(i, 5) * 50}ms`
                }}>
                  <img
                    src={getGalleryImages(product, item.variantId)[0]?.url || product.images[0]?.url}
                    alt={getGalleryImages(product, item.variantId)[0]?.alt || product.title}
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-small)', display: 'block' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>
                      <Link to={`/products/${product.slug}`} onClick={closeDrawer}>{product.title}</Link>
                    </p>
                    {item.variantId && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Colour: {product.variants?.find(v => v.id === item.variantId)?.label}
                      </p>
                    )}
                    {item.size && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Size: {item.size}
                      </p>
                    )}
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: 'var(--space-1)' }}>
                      {formatPrice(product.variants?.find((v) => v.id === item.variantId)?.price ?? product.price)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1, item.size)}
                        aria-label="Decrease quantity"
                        className="icon-btn"
                        style={{
                          width: 24, height: 24,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-small)'
                        }}
                      ><Minus size={12} /></button>
                      <span style={{ minWidth: 16, textAlign: 'center', fontSize: '0.875rem' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1, item.size)}
                        aria-label="Increase quantity"
                        className="icon-btn"
                        style={{
                          width: 24, height: 24,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-small)'
                        }}
                      ><Plus size={12} /></button>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId, item.size)}
                        aria-label={`Remove ${product.title}`}
                        className="t-color"
                        style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'underline' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div style={{
            borderTop: '1px solid var(--color-border)',
            padding: 'var(--space-4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <span style={{ fontWeight: 600 }}>Subtotal</span>
              <span style={{ fontWeight: 700 }}>{formatPrice(subtotal)}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              Shipping calculated at checkout.
            </p>
            <Link to="/cart" onClick={closeDrawer} className="btn btn--primary btn--full">
              View Bag
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
