import { useEffect, useState } from 'react';
import { formatPrice } from '../../lib/currency';
import { getBackendUrl } from '../../lib/stripe';
import {
  adminListPayouts,
  adminPayout,
  type PayoutRecord,
  type PayoutResponse,
} from '../../lib/admin-api';

/**
 * Admin page to cash out Stripe balance to the linked bank account.
 * Accessible to users with the "admin" or "payout" role.
 *
 * Honest behaviour:
 * - Stripe must be configured (STRIPE_SECRET_KEY) on the server.
 * - Stripe requires a bank account linked in the Stripe dashboard;
 *   without one the request fails and the error is shown, not hidden.
 * - Every request is logged to server/data/payouts.json (git-ignored).
 */
export default function AdminPayoutPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[] | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<PayoutResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    adminListPayouts()
      .then((r) => {
        if (alive) setPayouts(r.payouts);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load payout history.');
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`${getBackendUrl()}/api/health`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data: { stripe?: boolean }) => {
        if (alive) setStripeConfigured(!!data?.stripe);
      })
      .catch(() => {
        if (alive) setStripeConfigured(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const amountPence = Math.round(Number(amount.replace(/[^0-9]/g, '')) || 0);
    if (!amountPence || amountPence <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    setLoading(true);
    try {
      const res: PayoutResponse = await adminPayout(amountPence);
      setResult(res);
      setAmount('');
      // Refresh history.
      const updated = await adminListPayouts();
      setPayouts(updated.payouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payout failed.');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#4ade80';
      case 'pending':
        return '#fbbf24';
      case 'failed':
        return '#fca5a5';
      default:
        return '#94a3b8';
    }
  };

  if (stripeConfigured === null) return <p>Loading…</p>;

  return (
    <>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, color: '#f8fafc' }}>
        Cash out to bank
      </h1>

      <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 20 }}>
        Sends the available Stripe balance to the bank account linked in your
        Stripe dashboard. Amount in GBP (whole pence).
      </p>

      {!stripeConfigured && (
        <div
          role="alert"
          style={{
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: 14,
            background: '#fff5f5',
            marginBottom: 20,
            color: '#7f1d1d',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Stripe is not configured.</p>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            Set <code>STRIPE_SECRET_KEY</code> in server/.env and restart the server before cashing out.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e5e7eb' }}>Amount (£)</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 250.00"
            minLength={1}
            required
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#0f172a', color: '#fff', fontSize: '0.95rem' }}
          />
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Whole pence will be sent to Stripe.</span>
        </div>
        <button
          type="submit"
          disabled={loading || !stripeConfigured || amount.trim() === ''}
          className="btn btn--primary tr-52"
          style={{ minHeight: 46, padding: '0 22px', fontWeight: 700 }}
        >
          {loading ? 'Sending…' : 'Cash out to bank'}
        </button>
      </form>

      {result && (
        <div
          style={{
            border: '1px solid #052e16',
            borderRadius: 8,
            padding: 14,
            background: '#f0fdf4',
            marginBottom: 20,
            color: '#064e3b',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Payout sent to Stripe.</p>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            {formatPrice(result.amount)} · {result.status} · {result.payoutId}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: 20 }}>
          {error}
        </p>
      )}

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 10, color: '#f8fafc' }}>Payout history</h2>
      {!payouts ? (
        <p style={{ color: '#94a3b8' }}>Loading…</p>
      ) : payouts.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No payouts yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #1e3a8a', color: '#94a3b8' }}>
              <th style={{ padding: '8px 0' }}>Date</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Status</th>
              <th style={{ padding: '8px 0' }}>Payout ID</th>
              <th style={{ padding: '8px 0' }}>Requested by</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr
                key={p.id}
                style={{ borderBottom: '1px solid #1e3a8a' }}
                className="tr-118 row-lift"
              >
                <td style={{ padding: '8px 0', color: '#e5e7eb' }}>
                  {new Date(p.requestedAt).toLocaleString('en-GB')}
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: '#e5e7eb', fontWeight: 600 }}>
                  {formatPrice(p.amount)}
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#111827',
                      color: statusColor(p.status),
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: `1px solid ${statusColor(p.status)}33`,
                    }}
                  >
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '8px 0', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {p.payoutId || '—'}
                </td>
                <td style={{ padding: '8px 0', color: '#e5e7eb' }}>{p.requestedBy}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: '#94a3b8' }}>{p.role}</td>
                {p.failureMessage && (
                  <td style={{ padding: '8px 0', color: '#fca5a5', fontSize: '0.75rem' }}>{p.failureMessage}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
