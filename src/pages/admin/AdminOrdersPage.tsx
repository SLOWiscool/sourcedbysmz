import { useEffect, useState } from 'react';
import { adminOrders, type AdminOrder } from '../../lib/admin-api';
import { formatPrice } from '../../lib/currency';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    adminOrders()
      .then((r) => {
        if (alive) setOrders(r.orders);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load orders.');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!orders) return <p>Loading…</p>;

  return (
    <>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, color: '#f8fafc' }}>Orders ({orders.length})</h1>
      {orders.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>
          No orders yet. Orders appear here only after the payment provider confirms them — never from success-page visits.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map((o) => (
            <details
              key={o.ref}
              style={{ border: '1px solid #1e3a8a', borderRadius: 8, padding: 12, background: '#111827', color: '#e5e7eb' }}
            >
              <summary style={{ cursor: 'pointer', fontSize: '0.92rem' }}>
                <strong>{o.ref}</strong> · {new Date(o.createdAt).toLocaleString('en-GB')} · {o.items} item{o.items === 1 ? '' : 's'} ·{' '}
                {formatPrice(o.total)} · <span className="badge">{o.status}</span>
              </summary>
              <div style={{ marginTop: 10, fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p>
                  Customer: <strong>{o.email}</strong>
                </p>
                <ul>
                  {o.lines.map((l, i) => (
                    <li key={i}>
                      {l.title}
                      {l.variantLabel ? ` (${l.variantLabel})` : ''} × {l.quantity} — {formatPrice(l.unitPrice * l.quantity)}
                    </li>
                  ))}
                </ul>
                <p>
                  Subtotal {formatPrice(o.subtotal)} · Delivery {formatPrice(o.shipping)}
                </p>
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
