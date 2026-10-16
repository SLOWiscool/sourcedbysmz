import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  const linkStyle = { fontSize: '0.875rem', color: 'var(--color-night-muted)' };

  return (
    <footer role="contentinfo" style={{
      borderTop: '3px solid var(--color-brand)',
      paddingBlock: 'var(--space-12)',
      marginTop: 'var(--space-16)',
      background: 'var(--color-night)',
      color: 'var(--color-night-text)'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-8)'
        }}>
          <div className="anim-rise" style={{ animationDelay: '0ms' }}>
            <img src="/images/logo.png" alt="SOURCEDBYSMZ" className="logo-hover" style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block', marginBottom: 'var(--space-3)' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-night-muted)', lineHeight: 1.6 }}>
              Curated sourced clothing and finds.
            </p>
          </div>

          <div className="anim-rise" style={{ animationDelay: '80ms' }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 'var(--space-3)', color: '#fff' }}>Shop</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <li><Link to="/shop" className="footer-link" style={linkStyle}>All Products</Link></li>
              <li><Link to="/collections/footwear" className="footer-link" style={linkStyle}>Footwear</Link></li>
              <li><Link to="/collections/outerwear" className="footer-link" style={linkStyle}>Outerwear</Link></li>
              <li><Link to="/collections/bags" className="footer-link" style={linkStyle}>Bags</Link></li>
              <li><Link to="/collections/accessories" className="footer-link" style={linkStyle}>Accessories</Link></li>
            </ul>
          </div>

          <div className="anim-rise" style={{ animationDelay: '160ms' }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 'var(--space-3)', color: '#fff' }}>Info</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <li><Link to="/shipping" className="footer-link" style={linkStyle}>Shipping</Link></li>
              <li><Link to="/returns" className="footer-link" style={linkStyle}>Returns</Link></li>
              <li><Link to="/contact" className="footer-link" style={linkStyle}>Contact</Link></li>
              <li><Link to="/privacy" className="footer-link" style={linkStyle}>Privacy</Link></li>
              <li><Link to="/terms" className="footer-link" style={linkStyle}>Terms</Link></li>
              <li><Link to="/admin" className="footer-link" style={linkStyle}>Owner sign-in</Link></li>
            </ul>
          </div>
        </div>

        <hr className="divider" style={{ marginBlock: 'var(--space-8)', background: '#1e293b', height: 1, border: 'none' }} />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          fontSize: '0.75rem',
          color: 'var(--color-night-muted)'
        }}>
          <p>&copy; {year} Sourcedbysmz. All rights reserved.</p>
          <p>GBP &middot; United Kingdom</p>
        </div>
      </div>
    </footer>
  );
}
