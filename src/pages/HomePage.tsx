import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Truck, Lock } from 'lucide-react';
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
            <p className="anim-rise" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(37, 99, 235, 0.16)', border: '1px solid rgba(59, 130, 246, 0.45)', color: '#bfdbfe', padding: '5px 12px', borderRadius: 999, marginBottom: 18 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Independent resale · UK
            </p>
            {logoUrl ? (
              <img src={logoUrl} alt="" aria-hidden="true" style={{ width: 'min(280px, 72%)', height: 'auto', objectFit: 'cover', display: 'block', marginBottom: 20, borderRadius: 18, border: '1px solid #24365c', boxShadow: '0 12px 40px rgb(0 0 0 / 0.45)' }} />
            ) : (
              <img src="/images/logo.png" alt="" aria-hidden="true" style={{ width: 'min(280px, 72%)', height: 'auto', objectFit: 'cover', display: 'block', marginBottom: 20, borderRadius: 18, border: '1px solid #24365c', boxShadow: '0 12px 40px rgb(0 0 0 / 0.45)' }} />
            )}
            <h1 className="anim-rise" style={{ fontSize: 'clamp(2rem, 4.2vw, 3rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 12, animationDelay: '80ms' }}>
              Sourced<br />with intent.
            </h1>
            <p className="anim-rise" style={{ fontSize: '1rem', color: '#b5b5b5', maxWidth: '32rem', lineHeight: 1.6, marginBottom: 24, animationDelay: '160ms' }}>
              Curated footwear and outerwear, hand-selected by two friends who know what's worth wearing. Honest photos, honest descriptions.
            </p>
            <div className="anim-rise" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animationDelay: '240ms' }}>
              <Link to="/shop" className="btn" style={{ background: 'var(--color-brand)', color: '#fff', fontWeight: 700, padding: '12px 22px', borderRadius: 6, minHeight: 48 }}>
                Shop the drop <ArrowRight size={16} />
              </Link>
              <Link to="/collections/footwear" className="btn" style={{ border: '1px solid #3b5a8f', color: '#fff', padding: '12px 22px', borderRadius: 6, minHeight: 48 }}>
                Footwear
              </Link>
            </div>
            <ul className="anim-rise" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 22, fontSize: '0.82rem', color: '#9fb0c9', animationDelay: '320ms' }}>
              {[
                { icon: <Check size={14} />, text: 'Real item photos' },
                { icon: <Truck size={14} />, text: 'Tracked UK delivery' },
                { icon: <Lock size={14} />, text: 'Secure Stripe checkout' },
              ].map((t) => (
                <li key={t.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#4ade80', display: 'inline-flex' }}>{t.icon}</span>
                  {t.text}
                </li>
              ))}
            </ul>
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
        <div className="container stagger">
          <div className="anim-rise" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Featured products</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: 4 }}>The current drop — real photos, real items.</p>
            </div>
            <Link to="/shop" className="link-arrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.9rem' }}>
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
        <div className="container stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, paddingBlock: 'var(--space-12)' }}>
          {[
            { title: 'Honest condition', text: 'Every item is photographed as it actually is — flaws included. No invented grades.' },
            { title: 'Fair pricing', text: 'Researched pricing with no fake discounts or invented reference prices.' },
            { title: 'Sourced carefully', text: 'Each piece is selected by hand. Photo counts are never shown as stock.' },
          ].map((item, i) => (
            <div key={item.title} className="lift t-color" style={{ animationDelay: `${i * 80}ms` }}>
              <h3 className="anim-fade" style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
              <p style={{ color: '#555', lineHeight: 1.6, fontSize: '0.92rem' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
