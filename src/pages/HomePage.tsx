import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { getLogoUrl } from '../lib/product-source';
import ProductCard from '../components/product/ProductCard';

export default function HomePage() {
  const { products } = useProducts();
  const featured = (Array.isArray(products) ? products : []).filter(p => p.featured && p.status === 'active');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getLogoUrl().then((url) => { if (alive) setLogoUrl(url); });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <section style={{ background: 'radial-gradient(1200px 500px at 80% -10%, #123a8f 0%, #050b18 55%, #050b18 100%)', color: '#fff' }}>
        <div className="container split" style={{
          gap: 'var(--space-8)', paddingBlock: 'var(--space-12)'
        }}>
          <div>
            <p className="anim-rise" style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'var(--color-brand)', color: '#fff', padding: '4px 10px', borderRadius: 4, marginBottom: 16 }}>
              Independent resale · UK
            </p>
            {logoUrl ? (
              <img src={logoUrl} alt="" aria-hidden="true" style={{ width: 'min(360px, 85%)', height: 'auto', objectFit: 'cover', display: 'block', marginBottom: 20, borderRadius: 20, border: '1px solid #24365c', boxShadow: '0 12px 40px rgb(0 0 0 / 0.45)' }} />
            ) : (
              <img src="/images/logo.png" alt="" aria-hidden="true" style={{ width: 'min(360px, 85%)', height: 'auto', objectFit: 'cover', display: 'block', marginBottom: 20, borderRadius: 20, border: '1px solid #24365c', boxShadow: '0 12px 40px rgb(0 0 0 / 0.45)' }} />
            )}
            <h1 className="anim-rise" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.02em', marginBottom: 16, animationDelay: '80ms' }}>
              Sourced<br />with intent.
            </h1>
            <p className="anim-rise" style={{ fontSize: '1.05rem', color: '#b5b5b5', maxWidth: '34rem', lineHeight: 1.6, marginBottom: 28, animationDelay: '160ms' }}>
              Curated footwear and outerwear, hand-selected by two friends who know what's worth wearing. Honest photos, honest descriptions.
            </p>
            <div className="anim-rise" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animationDelay: '240ms' }}>
              <Link to="/shop" className="btn" style={{ background: 'var(--color-brand)', color: '#fff', fontWeight: 700, padding: '12px 22px', borderRadius: 6 }}>
                Shop the drop <ArrowRight size={16} />
              </Link>
              <Link to="/collections/footwear" className="btn" style={{ border: '1px solid #3b5a8f', color: '#fff', padding: '12px 22px', borderRadius: 6 }}>
                Footwear
              </Link>
            </div>
          </div>

          <div className="grid grid--products" style={{ gap: 12 }}>
            {featured.slice(0, 4).map((p, i) => (
              <Link key={p.id} to={`/products/${p.slug}`} className="zoom anim-rise" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', aspectRatio: '4 / 5', background: '#fff', width: '100%', animationDelay: `${120 + i * 80}ms` }}>
                <img src={p.images[0]?.url} alt={p.images[0]?.alt || p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="eager" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingBlock: 'var(--space-12)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Featured products</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: 4 }}>The current drop — real photos, real items.</p>
            </div>
            <Link to="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.9rem' }}>
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid--products">
            {featured.slice(0, 4).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: '#f7f7f7', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, paddingBlock: 'var(--space-12)' }}>
          {[
            { title: 'Honest condition', text: 'Every item is photographed as it actually is — flaws included. No invented grades.' },
            { title: 'Fair pricing', text: 'Researched pricing with no fake discounts or invented reference prices.' },
            { title: 'Sourced carefully', text: 'Each piece is selected by hand. Photo counts are never shown as stock.' },
          ].map((item) => (
            <div key={item.title}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
              <p style={{ color: '#555', lineHeight: 1.6, fontSize: '0.92rem' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
