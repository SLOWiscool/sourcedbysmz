export default function TermsPage() {
  return (
    <div className="container section container--reading">
      <h1 className="anim-slide-down-sm" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Terms of Sale</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section className="anim-fade-up-sm" style={{ animationDelay: '0ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>About Us</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            Sourcedbysmz is a small independent resale business operated by two friends. By placing an order, you agree to these terms.
          </p>
        </section>

        <section className="anim-fade-up-sm" style={{ animationDelay: '70ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Products</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            All items are pre-owned unless explicitly stated otherwise. We describe condition as accurately as possible, noting any flaws or wear. Colour may vary slightly due to screen settings and lighting.
          </p>
        </section>

        <section className="anim-fade-up-sm" style={{ animationDelay: '140ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Orders & Payment</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            Your order constitutes an offer to purchase. We reserve the right to refuse or cancel any order. Full payment is taken at the time of order via our secure payment processor.
          </p>
        </section>

        <section className="anim-fade-up-sm" style={{ animationDelay: '210ms' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Limitation of Liability</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            Nothing in these terms limits or excludes our liability for death or personal injury caused by our negligence, fraud, or any liability that cannot be excluded by UK law.
          </p>
        </section>

        <section className="anim-fade-up-sm">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Governing Law</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            These terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </section>
      </div>
    </div>
  );
}
