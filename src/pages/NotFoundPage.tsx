import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container section" style={{ textAlign: 'center', paddingBlock: 'var(--space-20)' }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '4rem',
        fontWeight: 800,
        color: 'var(--color-text)',
        marginBottom: 'var(--space-3)'
      }}>404</p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Page not found</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        <Link to="/" className="btn btn--primary">Back to Home</Link>
        <Link to="/shop" className="btn btn--secondary">Browse Shop</Link>
      </div>
    </div>
  );
}
