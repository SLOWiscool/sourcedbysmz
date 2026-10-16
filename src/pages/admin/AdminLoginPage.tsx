import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { adminLogin, AdminApiError } from '../../lib/admin-api';
import { getLogoUrl } from '../../lib/product-source';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getLogoUrl()
      .then((url) => {
        if (alive) setLogoUrl(url);
      })
      .catch(() => {
        if (alive) setLogoUrl(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await adminLogin(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 503) {
        setError('Admin sign-in is not set up on this server yet. Run `npm run setup:admin` where the backend runs, then restart it.');
      } else if (err instanceof AdminApiError && err.status === 429) {
        setError('Too many attempts. Wait a few minutes and try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Sign-in failed.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ height: 4, background: '#2563eb', borderRadius: '4px 4px 0 0', marginBottom: 24 }} />
        {logoUrl && (
          <img
            src={logoUrl}
            alt="SOURCEDBYSMZ"
            className="anim-float"
            style={{ height: 56, width: 'auto', display: 'block', margin: '0 auto 24px' }}
          />
        )}
        <div className="anim-pop" style={{ background: '#111827', border: '1px solid #1e3a8a', borderRadius: 12, padding: 24 }}>
          <p style={{ fontWeight: 800, letterSpacing: '0.04em', marginBottom: 8, color: '#fff', fontSize: '0.8rem' }}>
            SOURCEDBYSMZ · ADMIN
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, color: '#fff' }}>Owner sign-in</h1>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="admin-user" className="label" style={{ color: '#fff' }}>
                Username
              </label>
              <input
                id="admin-user"
                className="input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ background: '#0f172a', border: '1px solid #1e3a8a', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="admin-pass" className="label" style={{ color: '#fff' }}>
                Password
              </label>
              <input
                id="admin-pass"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ background: '#0f172a', border: '1px solid #1e3a8a', color: '#fff' }}
              />
            </div>
            {error && (
              <p role="alert" className="anim-shake" style={{ color: 'var(--color-error)', fontSize: '0.87rem', marginBottom: 12 }}>
                {error}
              </p>
            )}
            <button type="submit" className="btn btn--primary btn--full" disabled={pending} style={{ background: '#2563eb' }}>
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p style={{ marginTop: 16, fontSize: '0.85rem', textAlign: 'center' }}>
          <Link to="/" style={{ color: '#93c5fd' }}>
            ← Back to shop
          </Link>
        </p>
      </div>
    </div>
  );
}
