import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaBolt, FaShieldAlt, FaUserSecret, FaUsers, FaExclamationTriangle, FaHistory, FaRedo } from 'react-icons/fa';
import { DashboardSectionMenuContext } from '../components/DashboardLayout';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';

const REFRESH_MS = 8000;

function MetricCard({ title, value, hint, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'border-slate-700 bg-slate-900/60',
    warning: 'border-amber-600/60 bg-amber-900/20',
    danger: 'border-rose-600/60 bg-rose-900/20',
    success: 'border-emerald-600/60 bg-emerald-900/20',
  }[tone] || 'border-slate-700 bg-slate-900/60';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-100">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function timeAgoLabel(value) {
  if (!value) return '-';
  const when = new Date(value).getTime();
  if (Number.isNaN(when)) return '-';
  const sec = Math.max(0, Math.floor((Date.now() - when) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function ManagerDashboard() {
  const { isSw } = useLanguage();
  const location = useLocation();
  const setSectionMenus = useContext(DashboardSectionMenuContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [overviewRouteMissing, setOverviewRouteMissing] = useState(false);

  const sectionMenus = useMemo(() => ([
    { href: '/superadmin', label: isSw ? 'Amri Kuu' : 'Control Center', exact: true },
    { href: '/superadmin/security', label: isSw ? 'Ulinzi Hai' : 'Live Security' },
    { href: '/superadmin/users', label: isSw ? 'Watumiaji Wote' : 'User Authority' },
    { href: '/superadmin/audit', label: isSw ? 'Ukaguzi wa Mfumo' : 'System Audit' },
  ]), [isSw]);

  useEffect(() => {
    setSectionMenus(sectionMenus);
    return () => setSectionMenus([]);
  }, [sectionMenus, setSectionMenus]);

  const activeView = useMemo(() => {
    if (location.pathname.endsWith('/security')) return 'security';
    if (location.pathname.endsWith('/users')) return 'users';
    if (location.pathname.endsWith('/audit')) return 'audit';
    return 'overview';
  }, [location.pathname]);

  const load = useCallback(async (initial = false) => {
    if (!initial && overviewRouteMissing) return;

    try {
      if (initial) setLoading(true);
      else setRefreshing(true);
      const res = await api.get('/api/superadmin/overview');
      setData(res.data || null);
      setOverviewRouteMissing(false);
    } catch (err) {
      console.error('Failed to load superadmin overview', err);

      if (err?.response?.status === 404) {
        setOverviewRouteMissing(true);
        toast.error(
          isSw
            ? 'API ya superadmin haijapatikana bado kwenye deployment. Bonyeza Refresh baada ya redeploy.'
            : 'Superadmin API is not deployed yet. Press Refresh after backend redeploy.'
        );
      } else {
        toast.error(isSw ? 'Imeshindikana kupakia dashibodi ya superadmin' : 'Failed to load superadmin dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSw, overviewRouteMissing]);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleResetSecurity = async () => {
    try {
      await api.post('/api/superadmin/security/reset-state');
      toast.success(isSw ? 'Hali ya usalama imesetiwa upya' : 'Security state reset complete');
      load(false);
    } catch (err) {
      console.error('Failed to reset security state', err);
      toast.error(isSw ? 'Imeshindikana kuseti upya usalama' : 'Failed to reset security state');
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
        {isSw ? 'Inapakia kituo cha usimamizi wa juu...' : 'Loading superadmin command center...'}
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const users = metrics.users || {};
  const submissions = metrics.submissions || {};
  const complaints = metrics.complaints || {};
  const transfers = metrics.transfers || {};
  const security = metrics.security || {};

  return (
    <div className="space-y-6">
      {overviewRouteMissing && (
        <section className="rounded-2xl border border-amber-700 bg-amber-900/20 p-4 text-amber-100">
          {isSw
            ? 'Route /api/superadmin/overview haijapatikana kwenye deployment ya backend. Jaribu tena baada ya redeploy kukamilika.'
            : 'Route /api/superadmin/overview is missing in the current backend deployment. Retry after redeploy completes.'}
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-[#0a0f14] p-5 text-slate-100 shadow-[0_0_0_1px_rgba(20,28,40,0.4),0_18px_40px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">{isSw ? 'Ngazi ya Juu' : 'Supreme Authority'}</p>
            <h2 className="mt-1 text-2xl font-black tracking-wide">{isSw ? 'Kituo cha Udhibiti wa Superadmin' : 'Superadmin Command Center'}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {isSw ? 'Ufuatiliaji wa moja kwa moja wa usalama, watumiaji, malalamiko, uhamisho na hali ya mfumo mzima.' : 'Live oversight across security, users, complaints, transfers, and global system state.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOverviewRouteMissing(false);
                load(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <FaRedo className={refreshing ? 'animate-spin' : ''} />
              {isSw ? 'Sasisha' : 'Refresh'}
            </button>
            <button
              onClick={handleResetSecurity}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-700 bg-rose-900/40 px-3 py-2 text-sm text-rose-100 hover:bg-rose-800/60"
            >
              <FaBolt />
              {isSw ? 'Reset Ulinzi' : 'Reset Security State'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title={isSw ? 'Watumiaji Hai' : 'Active Users'} value={users.active ?? 0} hint={`${isSw ? 'Jumla' : 'Total'}: ${users.total ?? 0}`} tone="success" />
        <MetricCard title={isSw ? 'Malalamiko Wazi' : 'Open Complaints'} value={complaints.open ?? 0} hint={`${isSw ? 'Jumla' : 'Total'}: ${complaints.total ?? 0}`} tone="warning" />
        <MetricCard title={isSw ? 'Mashambulizi/Hr' : 'Suspicious/Hr'} value={security.suspiciousEventsLastHour ?? 0} hint={isSw ? 'Majaribio ya hatari ndani ya saa 1' : 'Potential hostile events in last hour'} tone="danger" />
        <MetricCard title={isSw ? 'Lockouts Hai' : 'Active Lockouts'} value={security.activeLockouts ?? 0} hint={isSw ? 'Akaunti/IP zilizofungwa kwa muda' : 'Temporarily blocked account/IP pairs'} tone="neutral" />
      </section>

      {(activeView === 'overview' || activeView === 'users') && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4">
          <h3 className="mb-3 text-lg font-bold text-slate-100">{isSw ? 'Mamlaka ya Watumiaji' : 'User Authority Overview'}</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(users.byRole || {}).map(([role, count]) => (
              <div key={role} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">{role}</p>
                <p className="mt-2 text-2xl font-black text-slate-100">{count}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="py-2">{isSw ? 'Jina' : 'Name'}</th>
                  <th className="py-2">{isSw ? 'Namba' : 'Employee #'}</th>
                  <th className="py-2">{isSw ? 'Nafasi' : 'Role'}</th>
                  <th className="py-2">{isSw ? 'Hali' : 'State'}</th>
                  <th className="py-2">{isSw ? 'Muda' : 'Created'}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentUsers || []).map((u) => (
                  <tr key={u.id} className="border-t border-slate-800 text-slate-200">
                    <td className="py-2">{u.name}</td>
                    <td className="py-2">{u.employeeNumber}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="py-2">
                      {u.deletedAt ? (
                        <span className="rounded-full bg-rose-900/50 px-2 py-1 text-xs text-rose-200">ARCHIVED</span>
                      ) : (
                        <span className="rounded-full bg-emerald-900/50 px-2 py-1 text-xs text-emerald-200">ACTIVE</span>
                      )}
                    </td>
                    <td className="py-2 text-slate-400">{timeAgoLabel(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(activeView === 'overview' || activeView === 'security') && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
              <FaShieldAlt className="text-emerald-400" />
              {isSw ? 'Matukio ya Usalama (Live)' : 'Live Security Events'}
            </h3>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {(data?.securityEvents || []).map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{event.type}</p>
                    <span className="text-xs text-slate-500">{timeAgoLabel(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{event.method} {event.path} | IP {event.ip}</p>
                </div>
              ))}
              {(!data?.securityEvents || data.securityEvents.length === 0) && (
                <p className="text-sm text-slate-400">{isSw ? 'Hakuna matukio mapya ya usalama.' : 'No recent security events.'}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
              <FaUserSecret className="text-amber-400" />
              {isSw ? 'Lockouts na Trafiki ya Hatari' : 'Lockouts and Risky Traffic'}
            </h3>
            <div className="space-y-2">
              {(data?.lockouts || []).map((entry) => (
                <div key={entry.key} className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-3 text-sm text-amber-100">
                  <p className="font-semibold">{entry.key}</p>
                  <p className="text-xs">{isSw ? 'Majaribio' : 'Failures'}: {entry.count} | {isSw ? 'Sekunde zilizobaki' : 'Remaining sec'}: {entry.remainingSec}</p>
                </div>
              ))}
              {(!data?.lockouts || data.lockouts.length === 0) && (
                <p className="text-sm text-slate-400">{isSw ? 'Hakuna lockout hai sasa.' : 'No active lockouts right now.'}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {(activeView === 'overview' || activeView === 'audit') && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 xl:col-span-2">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
              <FaHistory className="text-cyan-400" />
              {isSw ? 'Mifumo na Maombi ya Karibuni' : 'Recent Request Telemetry'}
            </h3>
            <div className="max-h-72 overflow-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-2">METHOD</th>
                    <th className="py-2">PATH</th>
                    <th className="py-2">STATUS</th>
                    <th className="py-2">LAT(ms)</th>
                    <th className="py-2">IP</th>
                    <th className="py-2">TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentRequests || []).slice(0, 30).map((row) => (
                    <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                      <td className="py-2">{row.method}</td>
                      <td className="py-2">{row.path}</td>
                      <td className={`py-2 ${row.statusCode >= 400 ? 'text-rose-300' : 'text-emerald-300'}`}>{row.statusCode}</td>
                      <td className="py-2">{row.latencyMs}</td>
                      <td className="py-2">{row.ip}</td>
                      <td className="py-2 text-slate-400">{timeAgoLabel(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <MetricCard title={isSw ? 'Submissions' : 'Submissions'} value={submissions.total ?? 0} hint={`${isSw ? 'Arkiwi' : 'Archived'}: ${submissions.archived ?? 0}`} />
            <MetricCard title={isSw ? 'Transfers' : 'Transfers'} value={transfers.total ?? 0} hint={isSw ? 'Mabadiliko yote ya taarifa' : 'All transfer operations'} />
            <MetricCard title={isSw ? 'Taarifa za hatari' : 'Tracked Security Events'} value={security.trackedEvents ?? 0} hint={isSw ? 'Kumbukumbu za ndani ya RAM' : 'In-memory telemetry buffer'} />
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
            <FaExclamationTriangle className="text-amber-400" />
            {isSw ? 'Malalamiko ya Karibuni' : 'Recent Complaints'}
          </h3>
          <div className="space-y-2">
            {(data?.recentComplaints || []).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-sm font-semibold text-slate-100">#{item.id} {item.subject}</p>
                <p className="mt-1 text-xs text-slate-400">{item.user?.name || '-'} | {item.status} | {timeAgoLabel(item.updatedAt)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
            <FaUsers className="text-blue-400" />
            {isSw ? 'Uhamisho wa Karibuni' : 'Recent Transfers'}
          </h3>
          <div className="space-y-2">
            {(data?.recentTransfers || []).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-sm font-semibold text-slate-100">{item.user?.name || '-'} ({item.oldEmployeeNumber}{' -> '}{item.newEmployeeNumber})</p>
                <p className="mt-1 text-xs text-slate-400">{item.oldEmployerName || '-'}{' -> '}{item.newEmployerName || '-'} | {timeAgoLabel(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
