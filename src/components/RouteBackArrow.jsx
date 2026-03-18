import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

function fallbackForPath(pathname) {
  if (pathname === '/forgot-password' || pathname === '/change-password') return '/login';
  if (pathname.startsWith('/client')) return '/client';
  if (pathname.startsWith('/staff')) return '/staff/links';
  if (pathname.startsWith('/admin')) return '/admin/submissions';
  if (pathname.startsWith('/superadmin')) return '/superadmin';
  return '/';
}

export default function RouteBackArrow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSw } = useLanguage();

  const hidden = useMemo(
    () => location.pathname === '/' || location.pathname === '/login',
    [location.pathname]
  );

  if (hidden) return null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackForPath(location.pathname), { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="fixed top-4 left-4 z-[70] inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      aria-label={isSw ? 'Rudi nyuma' : 'Go back'}
      title={isSw ? 'Rudi nyuma' : 'Go back'}
    >
      <span aria-hidden="true" className="text-base leading-none">&larr;</span>
      <span>{isSw ? 'Rudi' : 'Back'}</span>
    </button>
  );
}
