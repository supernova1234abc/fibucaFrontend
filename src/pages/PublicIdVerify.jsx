import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle, FaIdCard, FaShieldAlt, FaTimesCircle } from 'react-icons/fa';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const statusStyles = {
  VALID: {
    icon: FaCheckCircle,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    panel: 'border-emerald-200 bg-emerald-50',
    accent: 'text-emerald-700',
  },
  REVOKED: {
    icon: FaTimesCircle,
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    panel: 'border-rose-200 bg-rose-50',
    accent: 'text-rose-700',
  },
  EXPIRED: {
    icon: FaExclamationTriangle,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    panel: 'border-amber-200 bg-amber-50',
    accent: 'text-amber-700',
  },
  NOT_FOUND: {
    icon: FaTimesCircle,
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    panel: 'border-slate-300 bg-slate-50',
    accent: 'text-slate-700',
  },
  INVALID_REQUEST: {
    icon: FaExclamationTriangle,
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    panel: 'border-slate-300 bg-slate-50',
    accent: 'text-slate-700',
  },
  ERROR: {
    icon: FaExclamationTriangle,
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    panel: 'border-slate-300 bg-slate-50',
    accent: 'text-slate-700',
  },
};

export default function PublicIdVerify() {
  const { token } = useParams();
  const { isSw } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadVerification() {
      if (!token) {
        setResult({ valid: false, status: 'INVALID_REQUEST', message: isSw ? 'Kiungo si sahihi' : 'Invalid verification link', card: null });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await api.get(`/api/public/idcards/verify/${encodeURIComponent(token)}`);
        if (active) {
          setResult(data);
        }
      } catch (err) {
        if (active) {
          setResult({
            valid: false,
            status: err?.response?.data?.status || 'ERROR',
            message: err?.response?.data?.message || (isSw ? 'Imeshindikana kuthibitisha kitambulisho' : 'Failed to verify ID card'),
            card: null,
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadVerification();
    return () => {
      active = false;
    };
  }, [token, isSw]);

  const status = result?.status || 'NOT_FOUND';
  const style = statusStyles[status] || statusStyles.NOT_FOUND;
  const StatusIcon = style.icon;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_45%,_#ffffff_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-white/90 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <FaShieldAlt size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">FIBUCA</p>
              <h1 className="text-lg font-bold">{isSw ? 'Uthibitisho wa Kitambulisho' : 'ID Card Verification'}</h1>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {isSw ? 'Hakuna akaunti inahitajika' : 'No account required'}
          </span>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          {loading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600" />
              <div className="text-center">
                <p className="text-base font-semibold text-slate-800">{isSw ? 'Inathibitisha...' : 'Verifying...'}</p>
                <p className="text-sm text-slate-500">{isSw ? 'Tafadhali subiri wakati mfumo unakagua kadi hii.' : 'Please wait while the system checks this card.'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={`rounded-3xl border p-5 ${style.panel}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 text-4xl ${style.accent}`}>
                      <StatusIcon />
                    </div>
                    <div>
                      <div className={`mb-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${style.badge}`}>
                        {result?.valid ? (isSw ? 'Imethibitishwa' : 'Verified') : status.replace('_', ' ')}
                      </div>
                      <h2 className="text-2xl font-black text-slate-900">
                        {result?.valid ? (isSw ? 'Kadi ni halali' : 'Card is valid') : (isSw ? 'Kadi si halali' : 'Card is not valid')}
                      </h2>
                      <p className="mt-2 max-w-xl text-sm text-slate-600">{result?.message}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-right shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSw ? 'Hali ya uthibitisho' : 'Verification status'}</p>
                    <p className={`mt-1 text-lg font-extrabold ${style.accent}`}>{status}</p>
                  </div>
                </div>
              </div>

              {result?.card ? (
                <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <FaIdCard className="text-sky-700" />
                      {isSw ? 'Mwonekano wa Kitambulisho' : 'Card Snapshot'}
                    </div>
                    {result.card.photoUrl ? (
                      <img
                        src={result.card.photoUrl}
                        alt={result.card.fullName || 'Verified card holder'}
                        className="h-64 w-full rounded-2xl object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-200 text-sm font-medium text-slate-500">
                        {isSw ? 'Hakuna picha' : 'No photo'}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-xl font-bold text-slate-900">{isSw ? 'Taarifa za Kadi' : 'Card Details'}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSw ? 'Jina kamili' : 'Full name'}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{result.card.fullName || '-'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSw ? 'Cheo / Nafasi' : 'Role / Title'}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{result.card.role || '-'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSw ? 'Kampuni' : 'Company'}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{result.card.company || '-'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSw ? 'Namba ya kadi' : 'Card number'}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{result.card.cardNumber || '-'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSw ? 'Tarehe ya kutolewa' : 'Issued on'}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {result.card.issuedAt ? new Date(result.card.issuedAt).toLocaleDateString() : '-'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isSw ? 'Mwisho wa matumizi' : 'Expires on'}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {result.card.expiresAt ? new Date(result.card.expiresAt).toLocaleDateString() : (isSw ? 'Hakuna mwisho' : 'No expiry')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-lg font-semibold text-slate-800">{isSw ? 'Hakuna taarifa za kadi zilizopatikana.' : 'No card details were found.'}</p>
                  <p className="mt-2 text-sm text-slate-500">{isSw ? 'Ikiwa unaamini hii ni kosa, wasiliana na FIBUCA.' : 'If you believe this is a mistake, contact FIBUCA.'}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span>{isSw ? 'Ukurasa huu ni wa kuangalia tu. Haufungui mfumo wa ndani.' : 'This page is view-only. It does not expose internal system access.'}</span>
                <Link to="/" className="font-semibold text-sky-700 hover:text-sky-800">
                  {isSw ? 'Rudi nyumbani' : 'Back to home'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}