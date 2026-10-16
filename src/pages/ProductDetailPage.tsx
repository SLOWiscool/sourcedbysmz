import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingBag, Truck, RotateCcw } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { formatPrice } from '../lib/currency';
import {
  getAvailability, getEffectivePrice, getEffectiveStock, getGalleryImages,
  availabilityLabel, isPurchasable,
} from '../types';
import { useCart } from '../context/CartContext';
import { getBackendUrl } from '../lib/stripe';
import NotFoundPage from './NotFoundPage';

function WatchlistForm({ productId, productTitle }: { productId: string; productTitle: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = getBackendUrl();
    if (base === null) {
      setState('error');
      setMessage('Stock alerts need the shop backend running.');
      return;
    }
    setState('sending');
    setMessage('');
    try {
      const res = await fetch(`${base}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not join the list.');
      setState('done');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Could not join the list.');
    }
  };

  if (state === 'done') {
    return (
      <p style={{ fontSize: '0.88rem', color: 'var(--color-success)', fontWeight: 600, marginBottom: 20 }}>
        You&apos;re on the list — we&apos;ll email you the moment {productTitle} is available.
      </p>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 20, border: '1px solid var(--color-border)', borderRadius: 8, padding: 14 }}>
      <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Want it when it lands?</p>
      <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
        Leave your email for a one-time stock alert about {productTitle}. No marketing, unsubscribe anytime.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          required
          aria-label="Email for stock alert"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ flex: 1, minHeight: 44 }}
        />
        <button type="submit" disabled={state === 'sending'} className="btn btn--secondary" style={{ minHeight: 44, padding: '0 18px' }}>
          {state === 'sending' ? '…' : 'Notify me'}
        </button>
      </div>
      {state === 'error' && (
        <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.82rem', marginTop: 6 }}>
          {message}
        </p>
      )}
    </form>
  );
}

export default function ProductDetailPage() {
  const { products } = useProducts();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem, openDrawer } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [sizeError, setSizeError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const product = products.find(p => p.slug === slug);
  const hasVariants = !!product?.variants && product.variants.length > 0;
  const colorParam = searchParams.get('color');
  const selectedVariant = useMemo(() => {
    if (!product?.variants) return undefined;
    if (colorParam && product.variants.some(v => v.id === colorParam)) return colorParam;
    return product.variants[0]!.id;
  }, [product, colorParam]);

  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
  }, [slug, selectedVariant]);

  useEffect(() => {
    setSelectedSize(undefined);
    setSizeError(false);
  }, [slug]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!product || product.status === 'archived' || product.status === 'draft') {
    return <NotFoundPage />;
  }

  const gallery = getGalleryImages(product, selectedVariant);
  const availability = getAvailability(product, selectedVariant);
  const badge = availabilityLabel(availability);
  const price = getEffectivePrice(product, selectedVariant);
  const stock = getEffectiveStock(product, selectedVariant);
  const purchasable = isPurchasable(product, selectedVariant);
  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [];
  const needsSize = sizes.length > 0;

  const selectColor = (id: string) => {
    setSearchParams(id ? { color: id } : {}, { replace: true });
  };

  const handleAddToCart = () => {
    if (!purchasable) return;
    if (needsSize && !selectedSize) {
      setSizeError(true);
      return;
    }
    addItem(product.id, hasVariants ? selectedVariant : undefined, Math.min(quantity, stock), selectedSize);
    openDrawer();
  };

  const nextImage = () => setSelectedImage((prev) => (prev + 1) % gallery.length);
  const prevImage = () => setSelectedImage((prev) => (prev - 1 + gallery.length) % gallery.length);  return (
    <div className="container section">
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-4)', fontSize: '0.8125rem' }}>
        <ol style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', color: 'var(--color-text-muted)' }}>
          <li><Link to="/">Home</Link></li>
          <li>/</li>
          <li><Link to="/shop">Shop</Link></li>
          <li>/</li>
          <li aria-current="page" style={{ color: 'var(--color-text)', fontWeight: 500 }}>{product.title}</li>
        </ol>
      </nav>

      <div className="split" style={{ gap: 'var(--space-8)', alignItems: 'start' }}>
        <div>
          <div
            style={{
              position: 'relative', borderRadius: 'var(--radius-large)', overflow: 'hidden',
              background: '#ffffff', aspectRatio: '4 / 5', cursor: 'zoom-in',
              border: '1px solid var(--color-border)'
            }}
            onClick={() => setLightboxOpen(true)}
          >
            <img
              key={gallery[selectedImage]?.url}
              src={gallery[selectedImage]?.url}
              alt={gallery[selectedImage]?.alt || product.title}
              className="anim-fade"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {gallery.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prevImage(); }} aria-label="Previous image"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); nextImage(); }} aria-label="Next image"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                  <ChevronRight size={18} />
                </button>
              </>
            )}
            {badge && (
              <div style={{ position: 'absolute', top: 12, left: 12 }}>
                <span className="badge" style={availability === 'sold_out' ? { background: '#111', color: '#fff' } : { background: '#dbeafe', color: '#1e40af' }}>{badge}</span>
              </div>
            )}
          </div>

          {gallery.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }} role="group" aria-label="Product images">
              {gallery.map((g, idx) => (
                <button key={idx} onClick={() => setSelectedImage(idx)}
                  aria-label={`View image ${idx + 1} of ${gallery.length}`} aria-pressed={selectedImage === idx}
                  style={{ width: 64, height: 80, borderRadius: 6, overflow: 'hidden', border: selectedImage === idx ? '2px solid var(--color-brand)' : '1px solid var(--color-border)', padding: 0, background: '#fff' }}>
                  <img src={g.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
            {gallery.length} photographs{gallery.length !== 1 ? 's' : ''} — photo count is not stock quantity.
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: '#f1f1f1', color: '#555' }}>{product.condition.replace('_', ' ')}</span>
            {product.brand && <span className="badge" style={{ background: '#f1f1f1', color: '#555' }}>{product.brand}</span>}
          </div>

          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 800, marginBottom: 8 }}>{product.title}</h1>

          {price > 0 ? (
            <p style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 16 }}>{formatPrice(price)}</p>
          ) : (
            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, color: 'var(--color-text-muted)' }}>
              Price to be confirmed — contact us for pricing.
            </p>
          )}

          {hasVariants && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10 }}>
                Colour: <span style={{ fontWeight: 400 }}>{product.variants!.find(v => v.id === selectedVariant)?.label}</span>
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} role="radiogroup" aria-label="Select colour">
                {product.variants!.map((v) => {
                  const selected = v.id === selectedVariant;
                  return (
                    <button key={v.id} role="radio" aria-checked={selected} aria-label={v.label} title={v.label}
                      onClick={() => selectColor(v.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 8px', minHeight: 44,
                        border: selected ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
                        borderRadius: 24, background: selected ? 'var(--color-brand)' : '#fff',
                        color: selected ? '#fff' : '#111', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                      }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: v.colorHex || '#ccc', border: '1px solid rgba(0,0,0,0.2)', display: 'inline-block' }} />
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {needsSize && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10 }} id="size-label">
                Size: {selectedSize && <span style={{ fontWeight: 400 }}>{selectedSize}</span>}
                {!selectedSize && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}> — please choose</span>}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="radiogroup" aria-labelledby="size-label">
                {sizes.map((s) => {
                  const selected = s === selectedSize;
                  return (
                    <button key={s} role="radio" aria-checked={selected} aria-label={`Size ${s}`}
                      onClick={() => { setSelectedSize(s); setSizeError(false); }}
                      style={{
                        minWidth: 48, minHeight: 44, padding: '8px 14px',
                        border: selected ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
                        borderRadius: 6, background: selected ? 'var(--color-brand)' : '#fff',
                        color: selected ? '#fff' : '#111', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {sizeError && (
                <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: 8 }}>
                  Please choose a size before adding to your bag.
                </p>
              )}
            </div>
          )}

          <p style={{ lineHeight: 1.65, color: '#333', marginBottom: 16 }}>{product.description}</p>

          {product.conditionNotes && (
            <div style={{ background: '#f7f7f7', padding: 14, borderRadius: 8, marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Condition notes</p>
              <p style={{ fontSize: '0.87rem', lineHeight: 1.55, color: '#555' }}>{product.conditionNotes}</p>
            </div>
          )}

          {purchasable ? (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Quantity</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"
                  style={{ width: 44, height: 44, border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '1.1rem' }}>−</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(stock, quantity + 1))} disabled={quantity >= stock} aria-label="Increase quantity"
                  style={{ width: 44, height: 44, border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '1.1rem' }}>+</button>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{stock} available</span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: 20 }}>
              {price <= 0 ? 'Stock and pricing to be confirmed by the owners.' : 'Currently unavailable.'}
            </p>
          )}

          {!purchasable && <WatchlistForm productId={product.id} productTitle={product.title} />}

          <button onClick={handleAddToCart} disabled={!purchasable} className="btn btn--primary btn--full"
            style={{ marginBottom: 16, minHeight: 48, fontSize: '1rem' }}>
            <ShoppingBag size={18} />
            {purchasable ? 'Add to Bag' : price <= 0 ? 'Coming Soon' : 'Sold Out'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px solid var(--color-border)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={16} />
              <p style={{ fontSize: '0.83rem', color: '#555' }}><Link to="/shipping" style={{ textDecoration: 'underline' }}>Shipping information</Link></p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RotateCcw size={16} />
              <p style={{ fontSize: '0.83rem', color: '#555' }}><Link to="/returns" style={{ textDecoration: 'underline' }}>Returns & refunds</Link></p>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div role="dialog" aria-modal="true" aria-label="Image lightbox"
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)' }} onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)} aria-label="Close"
            style={{ position: 'absolute', top: 16, right: 20, color: '#fff', fontSize: '2rem', zIndex: 301 }}>&times;</button>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: '92vw', maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
            <img src={gallery[selectedImage]?.url} alt={gallery[selectedImage]?.alt || product.title} className="anim-fade" style={{ maxWidth: '100%', maxHeight: '88vh', objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
  );
}
