import { useEffect, useState } from 'react';
import { adminWatchlist, adminRemoveWatchlist, adminNotifyWatchlist, adminListProducts, type WatchlistEntry } from '../../lib/admin-api';
import type { Product } from '../../types';

export default function AdminWatchlistPage() {
  const [subscriptions, setSubscriptions] = useState<WatchlistEntry[] | null>(null);
  const [outbox, setOutbox] = useState<Array<Record<string, unknown>>>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [showOutbox, setShowOutbox] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notifying, setNotifying] = useState('');

  const refresh = () =>
    Promise.all([adminWatchlist(), adminListProducts()])
      .then(([w, p]) => {
        setSubscriptions(w.subscriptions);
        setOutbox(w.outbox);
        setProducts(p.products);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load watchlist.'));

  useEffect(() => {
    refresh();
  }, []);

  const remove = async (token: string, email: string) => {
    if (!window.confirm(`Remove ${email} from stock alerts?`)) return;
    setError('');
    setNotice('');
    try {
      await adminRemoveWatchlist(token);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed.');
    }
  };

  const notifyNow = async (productId: string, title: string) => {
    const waiting = (subscriptions || []).filter((s) => s.productId === productId && !s.notifiedAt).length;
    if (waiting === 0) {
      setNotice(`Nobody left waiting on "${title}" — everyone was already emailed.`);
      return;
    }
    if (!window.confirm(`Email ${waiting} waiting customer${waiting === 1 ? '' : 's'} about "${title}" now?`)) return;
    setError('');
    setNotice('');
    setNotifying(productId);
    try {
      const r = await adminNotifyWatchlist(productId);
      setNotice(
        r.failed > 0
          ? `Sent ${r.sent}, ${r.failed} failed — see the email log for reasons.`
          : `Sent ${r.sent} alert${r.sent === 1 ? '' : 's'} for "${title}".`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notify failed.');
    } finally {
      setNotifying('');
    }
  };

  if (!subscriptions || !products) return <p>{error ? `Error: ${error}` : 'Loading…'}</p>;

  const titleOf = (productId: string) => products.find((p) => p.id === productId)?.title || productId;
  const byProduct = new Map<string, WatchlistEntry[]>();
  for (const s of subscriptions) {
    const list = byProduct.get(s.productId) || [];
    list.push(s);
    byProduct.set(s.productId, list);
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 6, color: '#f8fafc' }}>
        Watchlist ({subscriptions.length})
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 16 }}>
        Stock-alert signups. When a product becomes buyable, everyone waiting gets an email
        from your own domain automatically. Every attempt is logged below — nothing is silently dropped.
      </p>
      <button
        type="button"
        onClick={() => setShowOutbox((v) => !v)}
        className="btn"
        style={{ border: '1px solid #1e3a8a', color: '#fff', borderRadius: 6, padding: '8px 16px', minHeight: 44, marginBottom: 16 }}
      >
        {showOutbox ? 'Hide email log' : `Show email log (${outbox.length})`}
      </button>
      {showOutbox && (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {outbox.length === 0 && <p style={{ color: '#94a3b8' }}>No emails attempted yet.</p>}
          {outbox.slice(-20).reverse().map((m, i) => (
            <li key={i} className="tr-118" style={{ border: '1px solid #1e3a8a', borderRadius: 8, padding: '8px 10px', background: '#0f172a', fontSize: '0.82rem', color: '#e5e7eb' }}>
              <strong>{String(m.to)}</strong> · {String(m.subject)} ·{' '}
              <span style={{ color: m.status === 'sent' ? '#4ade80' : '#fbbf24', fontWeight: 700 }}>{String(m.status)}</span>
              {m.status === 'failed' && m.reason ? <span style={{ color: '#94a3b8' }}> — {String(m.reason)}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" style={{ color: '#fca5a5', marginBottom: 12 }}>
          {error}
        </p>
      )}
      {subscriptions.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No one is watching anything yet. The signup form appears on unavailable product pages.</p>
      ) : (
        <>
          {notice && (
            <p style={{ fontSize: '0.9rem', color: '#4ade80', marginBottom: 12 }}>{notice}</p>
          )}
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...byProduct.entries()].map(([productId, list]) => (
            <section key={productId} className="admin-card" aria-label={`Watchers for ${titleOf(productId)}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <h2 className="admin-card-title" style={{ margin: 0 }}>
                  {titleOf(productId)} ({list.length})
                </h2>
                <button
                  type="button"
                  onClick={() => notifyNow(productId, titleOf(productId))}
                  disabled={notifying === productId}
                  className="btn tr-52"
                  style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', borderRadius: 6, padding: '8px 16px', minHeight: 44, fontSize: '0.85rem' }}
                >
                  {notifying === productId ? 'Sending…' : 'Notify now'}
                </button>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((s) => (
                  <li
                    key={s.token}
                    className="card-row anim-slide-right row-lift tr-118"
                    style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', border: '1px solid #1e3a8a', borderRadius: 8, padding: '8px 10px', background: '#0f172a' }}
                  >
                    <span style={{ color: '#e5e7eb', fontSize: '0.88rem', flex: 1, minWidth: 140 }}>{s.email}</span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      since {new Date(s.createdAt).toLocaleDateString('en-GB')}
                      {s.notifiedAt ? ` · notified ${new Date(s.notifiedAt).toLocaleDateString('en-GB')}` : ' · waiting'}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(s.token, s.email)}
                      style={{ textDecoration: 'underline', color: '#fca5a5', fontSize: '0.82rem', minHeight: 44, padding: '0 8px' }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          </div>
        </>
      )}
    </>
  );
}
