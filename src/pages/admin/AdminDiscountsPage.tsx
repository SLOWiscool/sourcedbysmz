import { useEffect, useState } from 'react';
import {
  adminListDiscounts, adminCreateDiscount, adminUpdateDiscount, adminDeleteDiscount,
  type DiscountRecord,
} from '../../lib/admin-api';
import { formatPrice } from '../../lib/currency';

const blank: DiscountRecord = {
  code: '',
  type: 'percent',
  value: 10,
  minSubtotal: 0,
  maxUses: null,
  usedCount: 0,
  expiresAt: null,
  active: true,
  createdAt: '',
  updatedAt: '',
};

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountRecord[] | null>(null);
  const [form, setForm] = useState<DiscountRecord>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = () =>
    adminListDiscounts()
      .then((r) => setDiscounts(r.discounts))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load discounts.'));

  useEffect(() => {
    refresh();
  }, []);

  const startEdit = (d: DiscountRecord) => {
    setEditing(d.code);
    setForm({ ...d });
    setError('');
  };

  const cancel = () => {
    setEditing(null);
    setForm(blank);
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        maxUses: form.maxUses === 0 ? null : form.maxUses,
        expiresAt: form.expiresAt || null,
      };
      if (editing) await adminUpdateDiscount(editing, payload);
      else await adminCreateDiscount(payload);
      cancel();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (code: string) => {
    if (!window.confirm(`Delete discount code "${code}"? Customers can no longer use it.`)) return;
    setError('');
    try {
      await adminDeleteDiscount(code);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const set = (patch: Partial<DiscountRecord>) => setForm((f) => ({ ...f, ...patch }));

  if (!discounts) return <p>{error ? `Error: ${error}` : 'Loading…'}</p>;

  return (
    <>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 6, color: '#f8fafc' }}>
        Discount codes ({discounts.length})
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 16 }}>
        Codes are validated and applied on the server only. Usage counts up only after a verified payment — abandoned checkouts never burn uses.
      </p>
      {error && (
        <p role="alert" style={{ color: '#fca5a5', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <section className="admin-card" aria-label={editing ? 'Edit discount' : 'New discount'} style={{ marginBottom: 16 }}>
        <h2 className="admin-card-title">{editing ? `Edit ${editing}` : 'New discount code'}</h2>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-3">
            <div>
              <label htmlFor="d-code" className="label">Code * (letters/numbers)</label>
              <input
                id="d-code" className="input input--dark" value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24) })}
                disabled={!!editing} required placeholder="WELCOME10"
              />
            </div>
            <div>
              <label htmlFor="d-type" className="label">Type *</label>
              <select id="d-type" className="input input--dark" value={form.type} onChange={(e) => set({ type: e.target.value as 'percent' | 'fixed' })}>
                <option value="percent">Percent %</option>
                <option value="fixed">Fixed £ amount</option>
              </select>
            </div>
            <div>
              <label htmlFor="d-value" className="label">{form.type === 'percent' ? 'Percent * (1–90)' : 'Amount (£) *'}</label>
              <input
                id="d-value" className="input input--dark" inputMode="decimal" required
                value={form.type === 'percent' ? String(form.value) : (form.value / 100).toFixed(2)}
                onChange={(e) => {
                  if (form.type === 'percent') set({ value: Math.max(1, Math.floor(Number(e.target.value) || 0)) });
                  else set({ value: Math.max(1, Math.round(Number(e.target.value) * 100) || 0) });
                }}
              />
            </div>
          </div>
          <div className="form-grid-3">
            <div>
              <label htmlFor="d-min" className="label">Min order (£, 0 = none)</label>
              <input
                id="d-min" className="input input--dark" inputMode="decimal"
                value={(form.minSubtotal / 100).toFixed(2)}
                onChange={(e) => set({ minSubtotal: Math.max(0, Math.round(Number(e.target.value) * 100) || 0) })}
              />
            </div>
            <div>
              <label htmlFor="d-max" className="label">Max uses (blank = unlimited)</label>
              <input
                id="d-max" className="input input--dark" type="number" min={1} step={1}
                value={form.maxUses ?? ''}
                onChange={(e) => set({ maxUses: e.target.value === '' ? null : Math.max(1, Math.floor(Number(e.target.value) || 0)) })}
              />
            </div>
            <div>
              <label htmlFor="d-exp" className="label">Expires (blank = never)</label>
              <input
                id="d-exp" className="input input--dark" type="date"
                value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
                onChange={(e) => set({ expiresAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null })}
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e5e7eb', minHeight: 44 }}>
            <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} style={{ width: 20, height: 20, accentColor: '#2563eb' }} /> Active
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn" disabled={saving} style={{ background: '#2563eb', color: '#fff', borderRadius: 6, padding: '12px 24px', minHeight: 48, fontWeight: 700 }}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create code'}
            </button>
            {editing && (
              <button type="button" onClick={cancel} className="btn" style={{ border: '1px solid #1e3a8a', color: '#fff', borderRadius: 6, padding: '12px 24px', minHeight: 48 }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <ul className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {discounts.map((d) => (
          <li key={d.code} className="card-row anim-slide-right row-lift" style={{ background: '#111827', border: '1px solid #1e3a8a', borderRadius: 10, padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>{d.code}</p>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                {d.type === 'percent' ? `${d.value}% off` : `${formatPrice(d.value)} off`}
                {d.minSubtotal > 0 && ` · min ${formatPrice(d.minSubtotal)}`}
                {d.maxUses !== null && ` · ${d.usedCount}/${d.maxUses} used`}
                {d.maxUses === null && d.usedCount > 0 && ` · ${d.usedCount} used`}
                {d.expiresAt && ` · expires ${new Date(d.expiresAt).toLocaleDateString('en-GB')}`}
              </p>
              <span className="badge" style={d.active
                ? { background: '#052e16', color: '#4ade80', marginTop: 6 }
                : { background: '#451a03', color: '#fbbf24', marginTop: 6 }}>
                {d.active ? 'active' : 'paused'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => startEdit(d)} className="btn" style={{ background: '#2563eb', color: '#fff', borderRadius: 6, padding: '8px 16px', minHeight: 44, fontSize: '0.85rem' }}>
                Edit
              </button>
              <button type="button" onClick={() => remove(d.code)} className="btn" style={{ border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: 6, padding: '8px 16px', minHeight: 44, fontSize: '0.85rem' }}>
                Delete
              </button>
            </div>
          </li>
        ))}
        {discounts.length === 0 && (
          <p style={{ color: '#94a3b8' }}>No discount codes yet — create one above.</p>
        )}
      </ul>
    </>
  );
}
