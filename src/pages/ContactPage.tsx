export default function ContactPage() {
  return (
    <div className="container section container--reading">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Contact Us</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Get in Touch</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            Have a question about an order, a product, or anything else? Reach out and we'll get back to you as soon as we can.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Email</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            For order enquiries, please include your order number in your message.
          </p>
          <p style={{ marginTop: 'var(--space-2)' }}>
            <a href="mailto:hello@sourcedbysmz.co.uk" style={{ fontWeight: 600, textDecoration: 'underline', fontSize: '1.0625rem' }}>
              hello@sourcedbysmz.co.uk
            </a>
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Response Times</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            We aim to respond to all enquiries within 2 working days. During busy periods it may take a little longer.
          </p>
        </section>
      </div>
    </div>
  );
}
