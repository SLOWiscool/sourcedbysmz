import { useEffect, useState } from 'react';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, getBackendUrl, getEffectivePublishableKey, createPaymentIntent } from '../../lib/stripe';
import { formatPrice } from '../../lib/currency';

interface StripePaymentProps {
  amount: number;
  email: string;
  items: Array<{ productId: string; variantId?: string; size?: string; quantity: number }>;
  shippingMethod: 'standard' | 'express';
  discountCode?: string;
  onSuccess: (orderRef: string) => void;
  onError: (message: string) => void;
}

function PaymentForm({ amount, orderRef, onSuccess, onError }: { amount: number; orderRef: string | null; onSuccess: (orderRef: string) => void; onError: (m: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const confirm = async () => {
    if (!stripe || !elements || processing) return;
    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/success` },
      redirect: 'if_required',
    });
    setProcessing(false);
    if (error) {
      onError(error.message || 'Payment failed. Please try again.');
    } else if (orderRef) {
      onSuccess(orderRef);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    await confirm();
  };

  return (
    <form onSubmit={handlePay}>
      <ExpressCheckoutElement
        options={{ wallets: { applePay: 'auto', googlePay: 'auto' } }}
        onConfirm={confirm}
      />
      <div style={{ marginTop: 16 }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <button type="submit" disabled={!stripe || processing} className="btn btn--primary btn--full" style={{ marginTop: 16, minHeight: 46 }}>
        {processing ? 'Processing…' : `Pay ${formatPrice(amount)}`}
      </button>
    </form>
  );
}

/** Backend health including whether the server sees a Stripe secret key. */
async function getBackendHealth(base: string): Promise<{ ok: boolean; stripe: boolean; admin: boolean } | null> {
  try {
    const res = await fetch(`${base}/api/health`);
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { ok?: boolean; stripe?: boolean; admin?: boolean } | null;
    if (!data || data.ok !== true) return null;
    return { ok: true, stripe: !!data.stripe, admin: !!data.admin };
  } catch {
    return null;
  }
}

export default function StripePayment(props: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [stripeKey, setStripeKey] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable' | 'error' | 'needs-key' | 'needs-secret'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      const backend = getBackendUrl();
      const health = backend === null ? null : await getBackendHealth(backend);
      const key = await getEffectivePublishableKey();
      if (!key) {
        // No publishable key in the build or on the server — point at the
        // exact missing piece instead of a generic notice.
        if (!cancelled) setStatus(health && health.stripe ? 'needs-key' : 'unavailable');
        return;
      }
      // No backend detected (e.g. static preview hosting): honest demo notice.
      if (!health) {
        if (!cancelled) setStatus('unavailable');
        return;
      }
      if (!health.stripe) {
        if (!cancelled) setStatus('needs-secret');
        return;
      }
      if (!cancelled) setStripeKey(key);
      if (cancelled) return;
      setStatus('loading');
      try {
        const data = await createPaymentIntent(backend, {
          items: props.items,
          email: props.email,
          shippingMethod: props.shippingMethod,
          discountCode: props.discountCode,
        });
        if (cancelled) return;
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setOrderRef(data.orderRef || null);
          setStatus('ready');
        } else {
          setStatus('unavailable');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Could not start secure payment.');
      }
    }
    setup();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.amount, props.shippingMethod, props.discountCode]);

  if (!stripeKey || status === 'unavailable' || status === 'needs-key' || status === 'needs-secret') {
    const heading = 'Secure card & wallet checkout';
    const body =
      status === 'needs-secret'
        ? 'The server is running but has no Stripe secret key. Add STRIPE_SECRET_KEY to server/.env on the host and restart the server — then payments go live. No payment is processed in this preview.'
        : status === 'needs-key'
          ? 'No publishable key found. Add STRIPE_PUBLISHABLE_KEY to server/.env on the host (or VITE_STRIPE_PUBLISHABLE_KEY before building) and restart — no rebuild needed for the server key.'
          : 'Live Stripe payments (Apple Pay, Google Pay, cards) activate once the store backend and publishable key are configured. No payment is processed in this preview.';
    return (
      <div className="anim-rise" style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, background: '#fafafa' }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>{heading}</p>
        <p style={{ fontSize: '0.87rem', color: '#555', marginBottom: 8 }}>{body}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Apple Pay', 'Google Pay', 'Visa', 'Mastercard', 'Amex'].map((m) => (
            <span key={m} style={{ fontSize: '0.75rem', padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, color: '#777' }}>{m}</span>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return <p key={status} className="anim-fade" style={{ fontSize: '0.9rem', color: '#555' }}>Loading secure payment…</p>;
  }

  if (status === 'error' || !clientSecret) {
    return (
      <div role="alert" className="anim-shake" style={{ border: '1px solid #f0c0c0', borderRadius: 8, padding: 14, background: '#fff5f5' }}>
        <p style={{ fontWeight: 600 }}>Payment unavailable right now</p>
        <p style={{ fontSize: '0.87rem', color: '#666' }}>{message || 'Please try again later.'}</p>
      </div>
    );
  }

  return (
    <Elements stripe={getStripe(stripeKey || undefined)} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <PaymentForm amount={props.amount} orderRef={orderRef} onSuccess={props.onSuccess} onError={(m) => { setMessage(m); props.onError(m); }} />
      {message && <p role="alert" className="anim-shake" style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: 8 }}>{message}</p>}
    </Elements>
  );
}
