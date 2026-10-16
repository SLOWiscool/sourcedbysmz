import { useEffect, useState } from 'react';
import { ArrowUp, CheckCircle2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';

/** Global "added to bag" toast, driven by CartContext. */
export function BagToast() {
  const { toast, openDrawer, closeDrawer } = useCart();
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      className="anim-toast tr-107"
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#0a0a0a',
        color: '#fff',
        border: '1px solid #1e3a8a',
        borderRadius: 999,
        padding: '10px 14px 10px 12px',
        boxShadow: 'var(--shadow-overlay)',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <CheckCircle2 size={18} color="#4ade80" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.87rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {toast.text}
      </span>
      <button
        onClick={() => {
          closeDrawer();
          openDrawer();
        }}
        style={{ color: '#93c5fd', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, minHeight: 44, padding: '0 6px' }}
      >
        View bag
      </button>
    </div>
  );
}

/** Floating back-to-top button, appears after scrolling. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      aria-label="Back to top"
      className={`to-top tr-52${show ? ' show' : ''}`}
      tabIndex={show ? 0 : -1}
      onClick={() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }}
    >
      <ArrowUp size={18} className="tr-21" />
    </button>
  );
}
