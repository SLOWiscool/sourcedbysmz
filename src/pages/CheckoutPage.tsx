import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useCart, useProductFromCart } from '../context/CartContext';
import StripePayment from '../components/checkout/StripePayment';
import { formatPrice } from '../lib/currency';
import { validateEmail, validateRequired, validatePostcode } from '../lib/validation';

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  phone: string;
  shippingMethod: 'standard' | 'express';
}

interface FormErrors {
  [key: string]: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, subtotal } = useCart();
  const [form, setForm] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    phone: '',
    shippingMethod: 'standard',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [contactReady, setContactReady] = useState(false);

  const shippingCost = form.shippingMethod === 'express' ? 699 : subtotal >= 5000 ? 0 : 399;
  const total = subtotal + shippingCost;

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => {
      const base: FormData = prev ?? { email: '', firstName: '', lastName: '', addressLine1: '', addressLine2: '', city: '', postcode: '', phone: '', shippingMethod: 'standard' };
      const next: FormData = { ...base, [field]: value };
      const email = next.email ?? '';
      setContactReady(!!email && validateEmail(email) === null);
      return next;
    });
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    const emailErr = validateEmail(form.email);
    if (emailErr) next.email = emailErr;
    const firstErr = validateRequired(form.firstName, 'First name');
    if (firstErr) next.firstName = firstErr;
    const lastErr = validateRequired(form.lastName, 'Last name');
    if (lastErr) next.lastName = lastErr;
    const addrErr = validateRequired(form.addressLine1, 'Address line 1');
    if (addrErr) next.addressLine1 = addrErr;
    const cityErr = validateRequired(form.city, 'City');
    if (cityErr) next.city = cityErr;
    const postcodeErr = validatePostcode(form.postcode);
    if (postcodeErr) next.postcode = postcodeErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // NOTE: there is deliberately no "place order" submit handler. The order
  // is created only by the Stripe payment below, and the bag is cleared only
  // on the success page after the payment is verified. This avoids ever
  // fabricating a paid state.

  if (state.items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container section">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Checkout</h1>

      <div onBlur={validate} className="summary-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Contact</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <label htmlFor="email" className="label">Email address *</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="input"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && <p id="email-error" className="error-text">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="label">Phone (optional)</label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Delivery Address</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="form-grid-2" style={{ gap: 'var(--space-3)' }}>
                  <div>
                    <label htmlFor="firstName" className="label">First name *</label>
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      className="input"
                      aria-invalid={!!errors.firstName}
                      aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                    />
                    {errors.firstName && <p id="firstName-error" className="error-text">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label htmlFor="lastName" className="label">Last name *</label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      className="input"
                      aria-invalid={!!errors.lastName}
                      aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                    />
                    {errors.lastName && <p id="lastName-error" className="error-text">{errors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="addressLine1" className="label">Address line 1 *</label>
                  <input
                    id="addressLine1"
                    type="text"
                    autoComplete="address-line1"
                    value={form.addressLine1}
                    onChange={(e) => updateField('addressLine1', e.target.value)}
                    className="input"
                    aria-invalid={!!errors.addressLine1}
                    aria-describedby={errors.addressLine1 ? 'addressLine1-error' : undefined}
                  />
                  {errors.addressLine1 && <p id="addressLine1-error" className="error-text">{errors.addressLine1}</p>}
                </div>
                <div>
                  <label htmlFor="addressLine2" className="label">Address line 2 (optional)</label>
                  <input
                    id="addressLine2"
                    type="text"
                    autoComplete="address-line2"
                    value={form.addressLine2}
                    onChange={(e) => updateField('addressLine2', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-grid-2" style={{ gap: 'var(--space-3)' }}>
                  <div>
                    <label htmlFor="city" className="label">City *</label>
                    <input
                      id="city"
                      type="text"
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="input"
                      aria-invalid={!!errors.city}
                      aria-describedby={errors.city ? 'city-error' : undefined}
                    />
                    {errors.city && <p id="city-error" className="error-text">{errors.city}</p>}
                  </div>
                  <div>
                    <label htmlFor="postcode" className="label">Postcode *</label>
                    <input
                      id="postcode"
                      type="text"
                      autoComplete="postal-code"
                      value={form.postcode}
                      onChange={(e) => updateField('postcode', e.target.value.toUpperCase())}
                      className="input"
                      aria-invalid={!!errors.postcode}
                      aria-describedby={errors.postcode ? 'postcode-error' : undefined}
                    />
                    {errors.postcode && <p id="postcode-error" className="error-text">{errors.postcode}</p>}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Shipping Method</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  border: '1px solid',
                  borderColor: form.shippingMethod === 'standard' ? 'var(--color-ink)' : 'var(--color-border)',
                  borderRadius: 'var(--radius-medium)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="standard"
                    checked={form.shippingMethod === 'standard'}
                    onChange={(e) => updateField('shippingMethod', e.target.value)}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Standard delivery</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>3–5 working days</p>
                  </div>
                  <span style={{ fontWeight: 600 }}>{subtotal >= 5000 ? 'Free' : formatPrice(399)}</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  border: '1px solid',
                  borderColor: form.shippingMethod === 'express' ? 'var(--color-ink)' : 'var(--color-border)',
                  borderRadius: 'var(--radius-medium)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="express"
                    checked={form.shippingMethod === 'express'}
                    onChange={(e) => updateField('shippingMethod', e.target.value)}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Express delivery</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>1–2 working days</p>
                  </div>
                  <span style={{ fontWeight: 600 }}>{formatPrice(699)}</span>
                </label>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Payment</h2>
              {contactReady ? (
                <StripePayment
                  amount={total}
                  email={form.email}
                  items={state.items}
                  shippingMethod={form.shippingMethod}
                  onSuccess={(orderRef) => {
                    try {
                      sessionStorage.setItem('sbmz_last_order', orderRef);
                    } catch {
                      // Private browsing: the ?order= URL param still carries the ref.
                    }
                    navigate(`/checkout/success?order=${encodeURIComponent(orderRef)}`);
                  }}
                  onError={() => {}}
                />
              ) : (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 14, background: '#fafafa' }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Secure card & wallet checkout</p>
                  <p style={{ fontSize: '0.87rem', color: '#555' }}>
                    Enter a valid email address above to unlock the secure payment form.
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside style={{
            border: '1px solid var(--color-border)',
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-large)',
            position: 'sticky',
            top: 80
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Order Summary</h2>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {state.items.map((item) => {
                const product = useProductFromCart(item.productId);
                if (!product) return null;
                const variantLabel = item.variantId
                  ? product.variants?.find((v) => v.id === item.variantId)?.label
                  : undefined;
                const unit = product.variants?.find((v) => v.id === item.variantId)?.price ?? product.price;
                return (
                  <li key={`${item.productId}-${item.variantId || ''}-${item.size || ''}`} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem'
                  }}>
                    <span>{product.title}{variantLabel ? ` (${variantLabel})` : ''}{item.size ? ` — size ${item.size}` : ''} x{item.quantity}</span>
                    <span style={{ fontWeight: 600 }}>{formatPrice(unit * item.quantity)}</span>
                  </li>
                );
              })}
            </ul>

            <hr className="divider" style={{ marginBottom: 'var(--space-3)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Shipping</span>
                <span>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</span>
              </div>
            </div>

            <hr className="divider" style={{ marginBottom: 'var(--space-3)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{formatPrice(total)}</span>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
              <Lock size={12} style={{ verticalAlign: '-1px' }} /> Pay securely with the card & wallet form on this page.
            </p>
          </aside>
        </div>
      </div>
  );
}
