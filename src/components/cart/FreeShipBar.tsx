import { formatPrice } from '../../lib/currency';

const FREE_OVER = 5000;

/** Animated "you're £X from free delivery" progress bar. */
export default function FreeShipBar({ subtotal }: { subtotal: number }) {
  if (subtotal >= FREE_OVER) {
    return (
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-success)' }}>
        You&apos;ve unlocked FREE standard delivery
      </p>
    );
  }
  const pct = Math.min(100, Math.max(0, (subtotal / FREE_OVER) * 100));
  return (
    <div>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>
        <strong style={{ color: 'var(--color-text)' }}>{formatPrice(FREE_OVER - subtotal)}</strong> away from free standard delivery
      </p>
      <div className="bar-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
