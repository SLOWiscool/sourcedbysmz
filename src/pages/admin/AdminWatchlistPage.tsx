import { useEffect, useState } from 'react';
import { adminWatchlist, adminRemoveWatchlist, adminListProducts, type WatchlistEntry } from '../../lib/admin-api';
import type { Product } from '../../types';

export default function AdminWatchlistPage() {
  const [subscriptions, setSubscriptions] = useState<WatchlistEntry[] | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');

  const refresh = () =>
    Promise.all([adminWatchlist(), adminListProducts()])
      .then(([w, p]) => {
        setSubscriptions(w.subscriptions);
        setOutboxCount(w.outbox.length);
        setProducts(p.products);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load watchlist.'));

  useEffect(() => {
    refresh();
  }, []);

  const remove = async (token: string, email: string) => {
    if (!window.confirm(`Remove ${email} from stock alerts?`)) return;
    setError('');
    try {
      await adminRemoveWatchlist(token);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed.');
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
        Stock-alert signups. Emails send automatically once an email provider is connected
        (see instructions.md) — until then {outboxCount} alert{outboxCount === 1 ? ' is' : 's are'} queued in the server outbox, nothing is silently dropped.
      </p>
      {error && (
        <p role="alert" style={{ color: '#fca5a5', marginBottom: 12 }}>
          {error}
        </p>
      )}
      {subscriptions.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No one is watching anything yet. The signup form appears on unavailable product pages.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...byProduct.entries()].map(([productId, list]) => (
            <section key={productId} className="admin-card" aria-label={`Watchers for ${titleOf(productId)}`}>
              <h2 className="admin-card-title">
                {titleOf(productId)} ({list.length})
              </h2>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((s) => (
                  <li
                    key={s.token}
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
      )}
    </>
  );
}
