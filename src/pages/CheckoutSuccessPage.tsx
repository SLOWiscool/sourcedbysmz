import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatPrice } from '../lib/currency';
import { getBackendUrl } from '../lib/stripe';

interface OrderStatus {
  ref?: string;
  status?: string;
  total?: number;
  currency?: string;
}

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  paid: {
    title: 'Order Confirmed',
    body: 'Payment confirmed. We will email you once your order is on its way.',
  },
  refunded: {
    title: 'Payment Refunded',
    body: 'Your payment was refunded because this item is no longer available. No charge will appear.',
  },
  refund_failed: {
    title: 'Payment Received — Refund Pending',
    body: 'We received your payment but this item is no longer available. Our team is processing a refund.',
  },
  paid_oversold: {
    title: 'Payment Received — Review Needed',
    body: 'We received your payment but this item is no longer available. Our team will contact you.',
  },
  pending: {
    title: 'Confirming Payment…',
    body: 'This can take a moment. The page updates automatically once Stripe confirms.',
  },
};

function readStoredRef(): string | null {
  try {
    return sessionStorage.getItem('sbmz_last_order');
  } catch {
    return null;
  }
}

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const ref = params.get('order') || readStoredRef() || '';
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (!ref) {
      setLoadState('missing');
      return;
    }
    let alive = true;
    (async () => {
      // Poll a few times: Stripe confirms asynchronously after redirect,
      // so the order can still be "pending" when the page first loads.
      const base = getBackendUrl() || '';
      for (let attempt = 0; attempt < 6 && alive; attempt += 1) {
        try {
          const res = await fetch(`${base}/api/orders/${encodeURIComponent(ref)}`);
          if (!res.ok) throw new Error('not found');
          const data = await res.json();
          setOrder(data);
          if (data.status !== 'pending') {
            setLoadState('ok');
            return;
          }
        } catch {
          // Missing or failed — keep polling briefly, then fall back.
        }
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
      if (alive) setLoadState('ok');
    })();
    return () => {
      alive = false;
    };
  }, [ref]);

  const clearBag = () => {
    try {
      localStorage.removeItem('sourcedbysmz_cart');
    } catch {
      // Nothing stored — nothing to clear.
    }
  };

  useEffect(() => {
    // If the order actually completed, empty the bag for the next shopper.
    if (order && (order.status === 'paid' || order.status === 'refunded')) clearBag();
  }, [order]);

  let icon = <Loader2 size={48} color="var(--color-brand)" className="anim-spin" style={{ margin: '0 auto var(--space-4)' }} />;
  let title = 'Confirming your order…';
  let body = 'Checking with the payment provider. This page updates automatically.';

  if (loadState === 'missing' || !ref) {
    icon = <XCircle size={48} color="var(--color-warning)" style={{ margin: '0 auto var(--space-4)' }} />;
    title = 'No order to show';
    body = 'This confirmation link is missing an order reference. Check your email, or place a new order.';
  } else if (order) {
    const copy = (order.status ? STATUS_COPY[order.status] : undefined) || STATUS_COPY.pending!;
    const confirmed = order.status === 'paid';
    icon = confirmed ? (
      <CheckCircle size={48} color="var(--color-success)" className="anim-bounce-in" style={{ margin: '0 auto var(--space-4)' }} />
    ) : (
      <Loader2 size={48} color="var(--color-brand)" className="anim-spin" style={{ margin: '0 auto var(--space-4)' }} />
    );
    title = copy.title;
    body = copy.body;
  }

  return (
    <div className="container section" style={{ textAlign: 'center', paddingBlock: 'var(--space-20)' }}>
      {icon}
      <h1 className="anim-rise" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>{title}</h1>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: '36rem', margin: '0 auto var(--space-6)', lineHeight: 1.6 }}>
        {body}
      </p>
      {order && order.total !== undefined && (
        <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 'var(--space-6)' }}>
          {formatPrice(order.total)} · {order.ref}
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/shop" className="btn btn--primary">Continue Shopping</Link>
        <Link to="/" className="btn btn--secondary">Back to Home</Link>
      </div>
    </div>
  );
}
