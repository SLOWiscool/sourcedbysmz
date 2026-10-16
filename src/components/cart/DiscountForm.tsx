import { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import type { CartItem } from '../../types';
import { getBackendUrl } from '../../lib/stripe';
import { formatPrice } from '../../lib/currency';

export interface DiscountPreview {
  code: string;
  amount: number;
  description: string;
}

/**
 * Discount code entry. The preview amount comes from the server (trusted
 * prices); the real discount is applied again server-side at payment time,
 * so a stale preview can never undercharge.
 */
export default function DiscountForm({
  items,
  onPreview,
}: {
  items: CartItem[];
  onPreview: (preview: DiscountPreview | null) => void;
}) {
  const { discountCode, setDiscountCode } = useCart();
  const [input, setInput] = useState(discountCode);
  const [preview, setPreview] = useState<DiscountPreview | null>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const backend = getBackendUrl();

  const apply = async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean || backend === null) return;
    setChecking(true);
    setError('');
    try {
      const res = await fetch(`${backend}/api/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean, items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That code is not valid.');
      const result = { code: data.code, amount: data.amount, description: data.description };
      setPreview(result);
      setDiscountCode(clean);
      onPreview(result);
    } catch (err) {
      setPreview(null);
      onPreview(null);
      setError(err instanceof Error ? err.message : 'That code is not valid.');
    } finally {
      setChecking(false);
    }
  };

  // Re-validate a remembered code when the bag changes underneath it.
  useEffect(() => {
    if (discountCode && !preview) {
      setInput(discountCode);
      apply(discountCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (backend === null) return null;

  if (preview) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
        <span style={{ fontWeight: 600 }}>
          {preview.code} (−{formatPrice(preview.amount)})
        </span>
        <button
          type="button"
          onClick={() => {
            setPreview(null);
            setInput('');
            setDiscountCode('');
            onPreview(null);
          }}
          style={{ textDecoration: 'underline', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply(input);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          aria-label="Discount code"
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Discount code"
          style={{ flex: 1, minHeight: 44 }}
        />
        <button type="submit" disabled={checking || input.trim() === ''} className="btn btn--secondary" style={{ minHeight: 44, padding: '0 18px' }}>
          {checking ? '…' : 'Apply'}
        </button>
      </form>
      {error && (
        <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.82rem', marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
