import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminMe } from '../../lib/admin-api';

/** Blocks /admin/* until the server confirms a valid admin session. */
export default function AdminRequireAuth({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking');
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    adminMe()
      .then(() => {
        if (alive) setState('ok');
      })
      .catch(() => {
        if (alive) setState('denied');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'checking') {
    return (
      <div className="container section">
        <p>Checking sign-in…</p>
      </div>
    );
  }
  if (state === 'denied') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
