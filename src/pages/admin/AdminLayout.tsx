import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { adminLogout } from '../../lib/admin-api';
import { getLogoUrl } from '../../lib/product-source';

export default function AdminLayout() {
  const navigate = useNavigate();
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

  const logout = async () => {
    try {
      await adminLogout();
    } finally {
      navigate('/admin/login');
    }
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    fontWeight: isActive ? 700 : 400,
    textDecoration: 'none',
    padding: '6px 2px',
    borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <header style={{ background: '#0a0a0a', color: '#fff', borderBottom: '3px solid #2563eb' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 8, rowGap: 10, paddingBlock: 12, flexWrap: 'wrap' }}>
          {logoUrl && <img src={logoUrl} alt="SOURCEDBYSMZ" style={{ height: 40, width: 'auto' }} />}
          <Link to="/admin" className="tr-21" style={{ color: '#fff', textDecoration: 'none', fontWeight: 800, letterSpacing: '0.04em' }}>
            SOURCEDBYSMZ · ADMIN
          </Link>
          <nav style={{ display: 'flex', gap: 12, rowGap: 8, fontSize: '0.9rem', flexWrap: 'wrap' }} aria-label="Admin">
            <NavLink to="/admin" end className="tr-38" style={linkStyle}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/products" className="tr-38" style={linkStyle}>
              Products
            </NavLink>
            <NavLink to="/admin/discounts" className="tr-38" style={linkStyle}>
              Discounts
            </NavLink>
            <NavLink to="/admin/watchlist" className="tr-38" style={linkStyle}>
              Watchlist
            </NavLink>
            <NavLink to="/admin/orders" className="tr-38" style={linkStyle}>
              Orders
            </NavLink>
            <Link to="/" className="tr-38" style={{ color: '#93c5fd', opacity: 0.9 }}>
              View shop
            </Link>
          </nav>
          <button
            onClick={logout}
            className="t-color"
            style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', border: 'none', minHeight: 44, padding: '0 18px', borderRadius: 6, fontWeight: 600 }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="container section">
        <div style={{ color: '#e5e7eb', colorScheme: 'dark' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
