import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminListProducts, adminDeleteProduct, adminUpdateProduct } from '../../lib/admin-api';
import type { Product } from '../../types';
import { formatPrice } from '../../lib/currency';

function stockOf(p: Product): number {
  if (p.variants && p.variants.length > 0) return p.variants.reduce((n, v) => n + v.stockQuantity, 0);
  return p.stockQuantity;
}

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  active: { background: '#dcfce7', color: '#166534' },
  draft: { background: '#f1f5f9', color: '#475569' },
  sold_out: { background: '#111111', color: '#ffffff' },
  archived: { background: '#fef3c7', color: '#92400e' },
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const refresh = () =>
    adminListProducts()
      .then((r) => setProducts(r.products))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load products.'));

  useEffect(() => {
    refresh();
  }, []);

  const toggleStatus = async (p: Product) => {
    setBusy(p.id);
    setError('');
    try {
      await adminUpdateProduct(p.id, { ...p, status: p.status === 'active' ? 'draft' : 'active' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusy('');
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.title}" permanently? This cannot be undone.`)) return;
    setBusy(p.id);
    setError('');
    try {
      await adminDeleteProduct(p.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusy('');
    }
  };

  if (!products) return <p>{error ? `Error: ${error}` : 'Loading…'}</p>;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>Products ({products.length})</h1>
        <Link to="/admin/products/new" className="btn" style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: 6, minHeight: 44 }}>
          + New product
        </Link>
      </div>
      {error && (
        <p role="alert" style={{ color: '#fca5a5', marginBottom: 12 }}>
          {error}
        </p>
      )}
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {products.map((p) => {
          const badge = STATUS_COLORS[p.status] || STATUS_COLORS.draft!;
          return (
            <li
              key={p.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                background: '#111827',
                border: '1px solid #1e3a8a',
                borderRadius: 10,
                padding: 12,
              }}
            >
              <img
                src={p.images[0]?.url}
                alt=""
                loading="lazy"
                style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 6, flexShrink: 0, display: 'block' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </p>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                  {p.price > 0 ? formatPrice(p.price) : 'Price TBC'} · Stock {stockOf(p)} · {p.images.length} photo{p.images.length === 1 ? '' : 's'}
                </p>
                <span className="badge" style={{ ...badge, marginTop: 6 }}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <Link
                  to={`/admin/products/${p.id}`}
                  className="btn"
                  style={{ background: '#2563eb', color: '#fff', borderRadius: 6, padding: '8px 16px', minHeight: 44, fontSize: '0.85rem' }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => toggleStatus(p)}
                  disabled={busy === p.id}
                  className="btn"
                  style={{ border: '1px solid #1e3a8a', color: '#e5e7eb', borderRadius: 6, padding: '8px 16px', minHeight: 44, fontSize: '0.85rem' }}
                >
                  {p.status === 'active' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => remove(p)}
                  disabled={busy === p.id}
                  className="btn"
                  style={{ border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: 6, padding: '8px 16px', minHeight: 44, fontSize: '0.85rem' }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
