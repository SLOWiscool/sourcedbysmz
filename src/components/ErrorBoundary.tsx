import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last-resort crash guard: if any page throws during render, show a branded
 * fallback instead of a blank white screen. Never silently swallows — the
 * message tells the visitor exactly how to recover.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Intentionally no remote reporting: privacy-minimal. The console keeps
    // the stack for the site owners' own debugging.
    // eslint-disable-next-line no-console
    console.error('SOURCEDBYSMZ render crash caught by ErrorBoundary');
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="container section" style={{ textAlign: 'center', paddingBlock: 'var(--space-16)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            This page hit a problem. Your bag is safe — try again or head back to the shop.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => window.location.reload()} style={{ padding: '12px 24px' }}>
              Reload page
            </button>
            <Link to="/shop" className="btn btn--secondary" style={{ padding: '12px 24px' }}>
              Back to shop
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
