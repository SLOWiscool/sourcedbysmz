export default function ShippingPage() {
  return (
    <div className="container section container--reading">
      <h1 className="anim-slide-down-sm" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Shipping</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section className="anim-fade-up-sm" style={{ animationDelay: '0ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Delivery Options</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: 'var(--space-2) 0', fontWeight: 600 }}>Method</th>
                <th style={{ padding: 'var(--space-2) 0', fontWeight: 600 }}>Timeframe</th>
                <th style={{ padding: 'var(--space-2) 0', fontWeight: 600 }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }} className="row-lift tr-118">
                <td style={{ padding: 'var(--space-2) 0' }}>Standard</td>
                <td style={{ padding: 'var(--space-2) 0' }}>7–12 working days</td>
                <td style={{ padding: 'var(--space-2) 0' }}>£3.99 (free over £50)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }} className="row-lift tr-118">
                <td style={{ padding: 'var(--space-2) 0' }}>Express</td>
                <td style={{ padding: 'var(--space-2) 0' }}>5–7 working days</td>
                <td style={{ padding: 'var(--space-2) 0' }}>£6.99</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="anim-fade-up-sm" style={{ animationDelay: '70ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Processing Times</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            Orders are processed within 1–2 working days. You will receive a confirmation email once your order has been dispatched.
          </p>
        </section>

        <section className="anim-fade-up-sm" style={{ animationDelay: '140ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>International Shipping</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            We currently ship within the United Kingdom only. International shipping may be available in the future.
          </p>
        </section>
      </div>
    </div>
  );
}
