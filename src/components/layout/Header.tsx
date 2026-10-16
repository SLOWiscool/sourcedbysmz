import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { getLogoUrl } from '../../lib/product-source';

interface NavLinkItem {
  to: string;
  label: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop All' },
  { to: '/products/chunky-sneakers?color=sn-black', label: 'Black Shoes' },
  { to: '/products/chunky-sneakers?color=sn-white', label: 'White Shoes' },
  { to: '/collections/outerwear', label: 'Jackets & Outerwear' },
  { to: '/collections/accessories', label: 'Accessories' },
  { to: '/collections/bags', label: 'Bags' },
  { to: '/collections/watches', label: 'Watches' },
  { to: '/shop', label: 'New Arrivals' },
  { to: '/contact', label: 'Contact' },
  { to: '/admin', label: 'Admin' },
];

export default function Header() {
  const { itemCount, openDrawer } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      menuCloseRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      menuButtonRef.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus();
    }
  }, [searchOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setMenuOpen(false);
      setSearchOpen(false);
    }
    if (menuOpen && e.key === 'Tab' && menuRef.current) {
      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [menuOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    let alive = true;
    getLogoUrl().then((url) => { if (alive) setLogoUrl(url); });
    return () => { alive = false; };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div style={{
        background: 'linear-gradient(90deg, var(--color-brand-strong), var(--color-brand), var(--color-brand-strong))',
        backgroundSize: '200% 100%',
        animation: 'glow-pan 8s ease infinite',
        color: '#fff',
        textAlign: 'center',
        padding: 'var(--space-2) var(--space-4)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        letterSpacing: '0.02em'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot anim-throb" aria-hidden="true" />
          New Drop is Now Live — Shop the latest arrivals
        </span>
      </div>

      <header role="banner" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#0a0a0a',
        borderBottom: '2px solid var(--color-brand)'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          paddingBlock: 'var(--space-3)'
        }}>
          <button
            ref={menuButtonRef}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="nav-drawer"
            className="icon-btn tr-21"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 5,
              width: 44,
              height: 44,
              padding: 8,
              borderRadius: 'var(--radius-medium)',
              color: '#fff'
            }}
          >
            <span style={{
              display: 'block',
              width: 22,
              height: 2,
              background: 'currentColor',
              borderRadius: 1,
              transition: 'transform 0.2s ease'
            }} />
            <span style={{
              display: 'block',
              width: 22,
              height: 2,
              background: 'currentColor',
              borderRadius: 1,
              transition: 'transform 0.2s ease'
            }} />
            <span style={{
              display: 'block',
              width: 22,
              height: 2,
              background: 'currentColor',
              borderRadius: 1,
              transition: 'transform 0.2s ease'
            }} />
          </button>

          <Link to="/" aria-label="SOURCEDBYSMZ home" style={{
            textDecoration: 'none',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)'
          }}>
            <img
              src={logoUrl && logoUrl !== '/images/logo.png' ? logoUrl : '/images/logo.png'}
              alt="SOURCEDBYSMZ"
              style={{ height: 40, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </Link>

          <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              aria-expanded={searchOpen}
              className="icon-btn tr-21"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-medium)',
                color: '#fff'
              }}
            >
              <Search size={20} />
            </button>

            <button
              onClick={openDrawer}
              aria-label={`Shopping bag, ${itemCount} items`}
              aria-haspopup="dialog"
              className="icon-btn tr-21"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-medium)',
                color: '#fff'
              }}
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'var(--color-ink)',
                  color: 'var(--color-paper)',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px'
                }}>
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="anim-fade anim-blur-in-soft" style={{
            borderTop: '1px solid #1e293b',
            padding: 'var(--space-3) var(--space-4)'
          }}>
            <form onSubmit={handleSearchSubmit} role="search" className="container" style={{ position: 'relative' }}>
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="input input--dark"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="submit"
                aria-label="Submit search"
                style={{
                  position: 'absolute',
                  right: 'calc(var(--space-4) + var(--space-2))',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: 'var(--space-1)',
                  color: '#fff'
                }}
              >
                <Search size={18} />
              </button>
            </form>
          </div>
        )}
      </header>

      {menuOpen && (
        <div
          id="nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          style={{ position: 'fixed', inset: 0, zIndex: 200 }}
        >
          <div
            onClick={() => setMenuOpen(false)}
            className="anim-fade"
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
          />
          <div
            ref={menuRef}
            className="anim-pop"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 320,
              background: '#0a0a0a',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-overlay)',
              borderRight: '2px solid var(--color-brand)',
              animation: 'slideIn 0.2s ease'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-4)',
              borderBottom: '1px solid #1e293b'
            }}>
              <img src="/images/logo.png" alt="SOURCEDBYSMZ" className="logo-hover anim-breathe" style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }} />
              <button
                ref={menuCloseRef}
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="icon-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-medium)',
                  color: '#fff'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <nav aria-label="Navigation" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2) 0' }}>
              <ul style={{ display: 'flex', flexDirection: 'column' }}>
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <NavLink
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className="nav-link tr-98"
                      style={({ isActive }) => ({
                        display: 'block',
                        padding: 'var(--space-3) var(--space-4)',
                        fontWeight: 500,
                        fontSize: '0.9375rem',
                        color: isActive ? '#fff' : '#c7d3e8',
                        borderLeft: isActive ? '3px solid var(--color-brand-bright)' : '3px solid transparent',
                        background: isActive ? '#101c33' : 'transparent'
                      })}
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div style={{
              borderTop: '1px solid #1e293b',
              padding: 'var(--space-4)'
            }}>
              <Link
                to="/cart"
                onClick={() => setMenuOpen(false)}
                className="btn btn--full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', background: 'var(--color-brand)', color: '#fff', fontWeight: 700, minHeight: 48 }}
              >
                <ShoppingBag size={18} />
                Shopping Bag {itemCount > 0 && `(${itemCount})`}
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

