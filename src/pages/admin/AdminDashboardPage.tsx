import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminListProducts, adminOrders, type AdminOrder } from '../../lib/admin-api';
import type { Product } from '../../types';
import { formatPrice } from '../../lib/currency';
import { getBackendUrl, getEffectivePublishableKey } from '../../lib/stripe';

interface BackendHealth {
  ok: boolean;
  stripe: boolean;
  admin: boolean;
}

export default function AdminDashboardPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [frontendKey, setFrontendKey] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([adminListProducts(), adminOrders()])
      .then(([p, o]) => {
        if (!alive) return;
        setProducts(p.products);
        setOrders(o.orders);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load dashboard.');
      });
    const base = getBackendUrl();
    fetch(`${base || ''}/api/health`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setHealth(data);
      })
      .catch(() => {});
    getEffectivePublishableKey().then((key) => {
      if (alive) setFrontendKey(!!key);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!products || !orders) return <p>Loading…</p>;

  const backendKey = health?.stripe === true;
  const paymentsLive = frontendKey && backendKey;

  const active = products.filter((p) => p.status === 'active').length;
  const drafts = products.filter((p) => p.status === 'draft').length;
  const paid = orders.filter((o) => o.status === 'paid');
  const revenue = paid.reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter((o) => o.status === 'pending').length;

  const cards = [
    { label: 'Active listings', value: String(active), to: '/admin/products' },
    { label: 'Drafts', value: String(drafts), to: '/admin/products' },
    { label: 'Orders', value: String(orders.length), to: '/admin/orders' },
    { label: 'Pending payment', value: String(pending), to: '/admin/orders' },
    { label: 'Paid revenue', value: formatPrice(revenue), to: '/admin/orders' },
  ];

  return (
    <>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, color: '#f8fafc' }}>Dashboard</h1>
      <div
        style={{
          border: `1px solid ${paymentsLive ? '#166534' : '#92400e'}`,
          background: paymentsLive ? '#052e16' : '#451a03',
          borderRadius: 10,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <p style={{ fontWeight: 800, color: '#fff', marginBottom: 6 }}>
          Payments: {paymentsLive ? 'LIVE — cards, Apple Pay and Google Pay active' : 'NOT LIVE yet'}
        </p>
        <ul style={{ fontSize: '0.85rem', color: '#e5e7eb', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>
            {frontendKey ? '✓' : '✗'} Publishable key (server STRIPE_PUBLISHABLE_KEY or build VITE_STRIPE_PUBLISHABLE_KEY){' '}
            {!frontendKey && '(add it to server/.env on the host, then restart — no rebuild needed)'}
          </li>
          <li>
            {backendKey ? '✓' : '✗'} Secret key on the server{' '}
            {!backendKey && '(add STRIPE_SECRET_KEY to server/.env on the host, then restart)'}
          </li>
        </ul>
        {!paymentsLive && (
          <p style={{ fontSize: '0.82rem', color: '#fbbf24', marginTop: 8 }}>
            Both keys load only at startup — after adding them, restart the server. See instructions.md for the full checklist.
          </p>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            style={{ textDecoration: 'none', border: '1px solid #1e3a8a', borderRadius: 8, padding: 14, background: '#111827', color: '#e5e7eb' }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{c.value}</div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{c.label}</div>
          </Link>
        ))}
      </div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 10, color: '#f8fafc' }}>Latest orders</h2>
      {orders.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No orders yet. Orders appear here after verified payments.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.slice(0, 5).map((o) => (
            <li
              key={o.ref}
              style={{ border: '1px solid #1e3a8a', borderRadius: 8, padding: 10, background: '#111827', fontSize: '0.88rem', color: '#e5e7eb' }}
            >
              <strong>{o.ref}</strong> · {o.items} item{o.items === 1 ? '' : 's'} · {formatPrice(o.total)} · {o.status}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
