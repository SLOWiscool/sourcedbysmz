import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function CheckoutCancelledPage() {
  return (
    <div className="container section" style={{ textAlign: 'center', paddingBlock: 'var(--space-20)' }}>
      <XCircle size={48} color="var(--color-warning)" className="anim-float-up" style={{ margin: '0 auto var(--space-4)' }} />
      <h1 className="anim-slide-up-sm" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Checkout Cancelled</h1>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: '36rem', margin: '0 auto var(--space-6)', lineHeight: 1.6 }}>
        Your checkout was cancelled. No payment was processed. Your bag items have been preserved.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        <Link to="/cart" className="btn btn--primary tr-29">Return to Bag</Link>
        <Link to="/shop" className="btn btn--secondary tr-29">Continue Shopping</Link>
      </div>
    </div>
  );
}
