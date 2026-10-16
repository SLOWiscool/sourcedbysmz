import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { formatPrice } from '../../lib/currency';
import { getAvailability, getGalleryImages, availabilityLabel } from '../../types';

interface ProductCardProps {
  product: Product;
  /** Position in the grid — used to stagger the entrance animation. */
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const hasColorVariants = !!product.variants && product.variants.length > 1;
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(
    hasColorVariants ? product.variants![0]!.id : undefined
  );

  const gallery = getGalleryImages(product, selectedVariant);
  const availability = getAvailability(product, selectedVariant);
  const label = availabilityLabel(availability);
  const showPrice = product.price > 0;

  return (
    <article className="lift anim-rise" style={{ display: 'flex', flexDirection: 'column', background: '#fff', width: '100%', maxWidth: '100%', boxSizing: 'border-box', borderRadius: 'var(--radius-medium)', animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      <Link
        to={hasColorVariants && selectedVariant ? `/products/${product.slug}?color=${selectedVariant}` : `/products/${product.slug}`}
        aria-label={`View ${product.title}`}
      >
        <div className="img-shell" style={{
          position: 'relative',
          aspectRatio: '4 / 5',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-medium)'
        }}>
          <img
            src={gallery[0]?.url}
            alt={gallery[0]?.alt || product.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
          {label && (
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <span
                className="badge"
                style={availability === 'sold_out'
                  ? { background: '#111', color: '#fff' }
                  : availability === 'low_stock'
                    ? { background: '#fef3c7', color: '#92400e' }
                    : { background: '#dbeafe', color: '#1e40af' }}
              >
                {label}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div style={{ padding: '12px 2px 0', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0, alignSelf: 'stretch' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.35, minHeight: '2.7em' }}>
          <Link to={`/products/${product.slug}`} className="t-color" style={{ textDecoration: 'none' }}>
            {product.title}
          </Link>
        </h3>

        {showPrice ? (
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{formatPrice(product.price)}</span>
        ) : (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Price to be confirmed</span>
        )}

        {hasColorVariants ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, minHeight: 30, width: '100%', boxSizing: 'border-box', overflowX: 'auto' }} role="group" aria-label="Select colour">
            {product.variants!.map((v) => {
              const selected = v.id === selectedVariant;
              return (
                <button
                  key={v.id}
                  className="swatch"
                  onClick={() => setSelectedVariant(v.id)}
                  aria-pressed={selected}
                  aria-label={`Select colour ${v.label}`}
                  title={v.label}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: v.colorHex || '#ccc',
                    border: selected ? '2px solid var(--color-brand)' : '1px solid #bbb',
                    outline: selected ? '2px solid var(--color-brand)' : 'none',
                    outlineOffset: 2,
                    cursor: 'pointer',
                    padding: 0
                  }}
                />
              );
            })}
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {product.variants!.find((v) => v.id === selectedVariant)?.label}
            </span>
          </div>
        ) : (
          <div style={{ minHeight: 30, marginTop: 4 }} aria-hidden="true" />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
            {product.condition.replace('_', ' ')}
          </span>
          {product.brand && (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>· {product.brand}</span>
          )}
        </div>
      </div>
    </article>
  );
}
