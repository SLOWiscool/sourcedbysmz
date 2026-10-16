export default function PrivacyPage() {
  return (
    <div className="container section container--reading">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Privacy Policy</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Data We Collect</h2>
          <p style={{ lineHeight: 1.6, marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
            When you place an order, we collect your name, email address, delivery address, and phone number (if provided). We do not store payment card details.
          </p>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            When you browse our site, we collect standard server log data including IP address and browser type for security and performance purposes.
          </p>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            If you join a product watchlist, we store your email address and the product you asked about, solely to send you a one-time stock alert for that item. Every alert carries an unsubscribe link that deletes your subscription immediately. We never use watchlist emails for marketing.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>How We Use Your Data</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', paddingLeft: 'var(--space-5)', listStyle: 'disc' }}>
            <li style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>To process and fulfil your orders</li>
            <li style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>To communicate about your order status</li>
            <li style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>To respond to your enquiries</li>
            <li style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>To improve our products and service</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Data Retention</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            Order data is retained for 7 years to comply with UK tax and accounting requirements. Contact enquiries are retained for 12 months.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Your Rights</h2>
          <p style={{ lineHeight: 1.6, marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
            Under UK GDPR, you have the right to access, correct, or delete your personal data. You also have the right to object to processing and to data portability.
          </p>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            To exercise these rights, please contact us via the <a href="/contact" style={{ textDecoration: 'underline' }}>contact page</a>.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Cookies</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
            This site does not use non-essential cookies or tracking technologies. Your basket contents are stored locally in your browser and are not shared with third parties.
          </p>
        </section>
      </div>
    </div>
  );
}
