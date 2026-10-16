export default function ReturnsPage() {
  return (
    <div className="container section container--reading">
      <h1 className="anim-slide-down-sm" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Returns & Refunds</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section className="anim-fade-up-sm" style={{ animationDelay: '0ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Return Policy</h2>
          <p style={{ lineHeight: 1.6, marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)' }}>
            We want you to be happy with your purchase. If something isn't right, please contact us within 14 days of receiving your order to arrange a return.
          </p>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            Items must be returned in their original condition. Once we receive the returned item, we will process your refund within 5 working days.
          </p>
        </section>

        <section className="anim-fade-up-sm" style={{ animationDelay: '70ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>How to Return</h2>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingLeft: 'var(--space-5)', listStyle: 'decimal' }}>
            <li style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>Contact us via the <a href="/contact" className="tr-38" style={{ textDecoration: 'underline' }}>contact page</a> with your order number and reason for return.</li>
            <li style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>Package the item securely in its original packaging if possible.</li>
            <li style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>Send the item to the address provided in our reply.</li>
            <li style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>Once received, your refund will be processed to your original payment method.</li>
          </ol>
        </section>

        <section className="anim-fade-up-sm" style={{ animationDelay: '140ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Faulty Items</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            If an item arrives damaged or not as described, please contact us immediately with photos. We will arrange a full refund or replacement, including return shipping costs.
          </p>
        </section>
      </div>
    </div>
  );
}
