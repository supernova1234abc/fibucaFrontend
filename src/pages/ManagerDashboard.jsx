import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaBolt, FaShieldAlt, FaUserSecret, FaUsers, FaExclamationTriangle,
  FaHistory, FaRedo, FaUserCheck, FaDatabase, FaLock, FaBell,
  FaExchangeAlt, FaTerminal, FaServer, FaWifi,
} from 'react-icons/fa';
import { DashboardSectionMenuContext } from '../components/DashboardLayout';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';

const REFRESH_MS = 8000;

// ─── Style maps ──────────────────────────────────────────────────────────────

const ROLE_STYLES = {
  SUPERADMIN: 'bg-violet-900/60 text-violet-300 border border-violet-700/50',
  ADMIN: 'bg-sky-900/60 text-sky-300 border border-sky-700/50',
  STAFF: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
  CLIENT: 'bg-slate-800 text-slate-300 border border-slate-600/50',
};

const METHOD_STYLES = {
  GET: 'bg-sky-900/60 text-sky-300',
  POST: 'bg-emerald-900/60 text-emerald-300',
  PUT: 'bg-amber-900/60 text-amber-300',
  PATCH: 'bg-orange-900/60 text-orange-300',
  DELETE: 'bg-rose-900/60 text-rose-300',
};

const EVENT_STYLE_MAP = {
  login_success: 'bg-emerald-900/50 text-emerald-200',
  login_invalid_password: 'bg-rose-900/50 text-rose-300',
  login_lockout_attempt: 'bg-red-900/70 text-red-200',
  login_user_not_found: 'bg-rose-900/40 text-rose-300',
  invalid_jwt: 'bg-amber-900/50 text-amber-300',
  blocked_origin: 'bg-orange-900/60 text-orange-300',
  api_rate_limited: 'bg-yellow-900/50 text-yellow-300',
  auth_rate_limited: 'bg-yellow-900/50 text-yellow-300',
  security_state_reset: 'bg-violet-900/50 text-violet-300',
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function timeAgo(value) {
  if (!value) return '-';
  const sec = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function initials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── Micro-components ────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${ROLE_STYLES[role] || ROLE_STYLES.CLIENT}`}>
      {role}
    </span>
  );
}

function MethodBadge({ method }) {
  const cls = METHOD_STYLES[method?.toUpperCase()] || 'bg-slate-800 text-slate-300';
  return (
    <span className={`inline-block min-w-[3rem] rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-bold ${cls}`}>
      {method}
    </span>
  );
}

function StatusCodeBadge({ code }) {
  const cls =
    code >= 500 ? 'bg-red-900/60 text-red-300' :
    code >= 400 ? 'bg-amber-900/60 text-amber-300' :
    code >= 300 ? 'bg-sky-900/60 text-sky-300' :
    'bg-emerald-900/60 text-emerald-300';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${cls}`}>
      {code}
    </span>
  );
}

function EventBadge({ type }) {
  const cls = EVENT_STYLE_MAP[type] || 'bg-slate-800 text-slate-300';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap ${cls}`}>
      {type?.replace(/_/g, ' ')}
    </span>
  );
}

function StatusDot({ status }) {
  const cfg = {
    online:  { dot: 'bg-emerald-400', ping: 'bg-emerald-400' },
    idle:    { dot: 'bg-amber-400',   ping: null },
    away:    { dot: 'bg-slate-500',   ping: null },
  }[status] || { dot: 'bg-slate-600', ping: null };

  return (
    <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
      {cfg.ping && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.ping} opacity-50`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
    </span>
  );
}

function Avatar({ name, role }) {
  const ring = {
    SUPERADMIN: 'ring-violet-500',
    ADMIN:      'ring-sky-500',
    STAFF:      'ring-emerald-500',
    CLIENT:     'ring-slate-500',
  }[role] || 'ring-slate-600';

  return (
    <div className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 ring-2 ${ring} text-xs font-bold text-white select-none`}>
      {initials(name)}
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, sub, tone = 'neutral' }) {
  const tones = {
    neutral: { card: 'border-slate-700/50 bg-slate-900',       num: 'text-white',       icon: 'text-slate-400',   sub: 'text-slate-500' },
    success: { card: 'border-emerald-700/40 bg-emerald-950/40', num: 'text-emerald-300', icon: 'text-emerald-400', sub: 'text-emerald-500' },
    warning: { card: 'border-amber-700/40 bg-amber-950/40',     num: 'text-amber-300',   icon: 'text-amber-400',   sub: 'text-amber-500' },
    danger:  { card: 'border-rose-700/40 bg-rose-950/40',       num: 'text-rose-300',    icon: 'text-rose-400',    sub: 'text-rose-500' },
    info:    { card: 'border-sky-700/40 bg-sky-950/40',         num: 'text-sky-300',     icon: 'text-sky-400',     sub: 'text-sky-500' },
    purple:  { card: 'border-violet-700/40 bg-violet-950/40',   num: 'text-violet-300',  icon: 'text-violet-400',  sub: 'text-violet-500' },
  }[tone] || {};

  return (
    <div className={`rounded-xl border p-4 ${tones.card}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">{title}</p>
        {Icon && <Icon className={`text-base ${tones.icon}`} />}
      </div>
      <p className={`text-3xl font-black tabular-nums leading-none ${tones.num}`}>{value ?? '-'}</p>
      {sub && <p className={`mt-2 text-xs ${tones.sub}`}>{sub}</p>}
    </div>
  );
}

function LiveChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800/60 bg-emerald-950/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      LIVE
    </span>
  );
}

function SectionHead({ icon: Icon, title, live = false, count = null }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="text-slate-400" />}
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-300">{title}</h3>
        {live && <LiveChip />}
      </div>
      {count !== null && (
        <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
          {count}
        </span>
      )}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-700/50 bg-slate-900 p-5 ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="py-4 text-center text-sm text-slate-500">{text}</p>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { isSw } = useLanguage();
  const location = useLocation();
  const setSectionMenus = useContext(DashboardSectionMenuContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [overviewRouteMissing, setOverviewRouteMissing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const sectionMenus = useMemo(() => ([
    { href: '/superadmin',          label: isSw ? 'Amri Kuu'   : 'Overview',  exact: true },
    { href: '/superadmin/security', label: isSw ? 'Ulinzi Hai' : 'Security'             },
    { href: '/superadmin/users',    label: isSw ? 'Watumiaji'  : 'Users'                },
    { href: '/superadmin/audit',    label: isSw ? 'Ukaguzi'    : 'Audit'                },
  ]), [isSw]);

  useEffect(() => {
    setSectionMenus(sectionMenus);
    return () => setSectionMenus([]);
  }, [sectionMenus, setSectionMenus]);

  const activeView = useMemo(() => {
    if (location.pathname.endsWith('/security')) return 'security';
    if (location.pathname.endsWith('/users'))    return 'users';
    if (location.pathname.endsWith('/audit'))    return 'audit';
    return 'overview';
  }, [location.pathname]);

  const load = useCallback(async (initial = false) => {
    if (!initial && overviewRouteMissing) return;
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);
      const res = await api.get('/api/superadmin/overview');
      setData(res.data || null);
      setLastUpdated(new Date());
      setOverviewRouteMissing(false);
    } catch (err) {
      if (err?.response?.status === 404) {
        setOverviewRouteMissing(true);
        toast.error(isSw ? 'API haijapatikana bado.' : 'Superadmin API not deployed yet — retry after redeploy.');
      } else {
        toast.error(isSw ? 'Imeshindikana kupakia dashibodi' : 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSw, overviewRouteMissing]);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const handleResetSecurity = async () => {
    if (!window.confirm(
      isSw
        ? 'Seti upya hali yote ya usalama (lockouts + logs)? Haiwezi kurejeshwa.'
        : 'Reset all in-memory security state (lockouts + event logs)? This cannot be undone.'
    )) return;
    try {
      await api.post('/api/superadmin/security/reset-state');
      toast.success(isSw ? 'Hali ya usalama imesetiwa upya' : 'Security state reset');
      load(false);
    } catch {
      toast.error(isSw ? 'Imeshindikana kuseti upya' : 'Reset failed');
    }
  };

  // ── Loading splash ─────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 p-14 text-slate-400">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
          <span className="text-sm">{isSw ? 'Inapakia kituo cha udhibiti...' : 'Loading control center...'}</span>
        </div>
      </div>
    );
  }

  // ── Data aliases ───────────────────────────────────────────────────────────
  const m           = data?.metrics        || {};
  const users       = m.users              || {};
  const submissions = m.submissions        || {};
  const complaints  = m.complaints         || {};
  const transfers   = m.transfers          || {};
  const security    = m.security           || {};
  const sessions    = data?.activeSessions || [];
  const onlineCnt   = sessions.filter((s) => s.status === 'online').length;
  const idleCnt     = sessions.filter((s) => s.status === 'idle').length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-10">

      {/* ── MISSING ROUTE BANNER ─────────────────────────────────────────── */}
      {overviewRouteMissing && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          <strong>Warning: Backend not deployed yet.</strong>{' '}
          {isSw
            ? 'Route haijapatikana. Subiri redeploy kukamilika.'
            : 'Route /api/superadmin/overview is missing. Wait for backend redeploy to complete.'}
        </div>
      )}

      {/* ── CONTROL BAR ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-700/50 bg-violet-900/60">
              <FaShieldAlt className="text-lg text-violet-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm font-bold uppercase tracking-widest text-white">
                  Fibuca Control Tower
                </h1>
                <span className="rounded-full border border-violet-700/50 bg-violet-900/50 px-2 py-0.5 text-[10px] uppercase tracking-widest text-violet-300 font-semibold">
                  SUPERADMIN
                </span>
                <LiveChip />
              </div>
              {lastUpdated && (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {isSw ? 'Imesasishwa' : 'Updated'}: {lastUpdated.toLocaleTimeString()}
                  {' \u00b7 '}
                  {isSw ? 'Auto-refresh kila' : 'Auto-refresh every'} {REFRESH_MS / 1000}s
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setOverviewRouteMissing(false); load(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <FaRedo className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
              {isSw ? 'Sasisha' : 'Refresh'}
            </button>
            <button
              onClick={handleResetSecurity}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-700/50 bg-rose-950/50 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-900/60 active:scale-95"
            >
              <FaBolt className="text-xs" />
              {isSw ? 'Reset Ulinzi' : 'Reset Security'}
            </button>
          </div>
        </div>
      </div>

      {/* ── METRIC STRIP ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={FaUsers}       title={isSw ? 'Watumiaji Hai'   : 'Active Users'}    value={users.active ?? 0}                sub={`Total: ${users.total ?? 0}`}                         tone="success" />
        <MetricCard icon={FaWifi}        title={isSw ? 'Online Sasa'     : 'Online Now'}       value={onlineCnt}                        sub={`Idle: ${idleCnt}`}                                   tone="info"    />
        <MetricCard icon={FaBell}        title={isSw ? 'Malalamiko Wazi' : 'Open Complaints'}  value={complaints.open ?? 0}             sub={`Total: ${complaints.total ?? 0}`}                    tone="warning" />
        <MetricCard icon={FaShieldAlt}   title={isSw ? 'Tukio/Saa'       : 'Threats / Hr'}     value={security.suspiciousEventsLastHour ?? 0} sub={isSw ? 'Matukio ya usalama' : 'Security incidents'} tone="danger"  />
        <MetricCard icon={FaLock}        title={isSw ? 'Lockouts'        : 'Lockouts'}         value={security.activeLockouts ?? 0}     sub={isSw ? 'Akaunti zilizofungwa' : 'Blocked accounts'}   tone="neutral" />
        <MetricCard icon={FaDatabase}    title={isSw ? 'Submissions'     : 'Submissions'}      value={submissions.total ?? 0}           sub={`Transfers: ${transfers.total ?? 0}`}                 tone="purple"  />
      </div>

      {/* ════════ VIEW: OVERVIEW ════════ */}
      {activeView === 'overview' && (
        <>
          {/* Active sessions grid */}
          <Card>
            <SectionHead icon={FaUserCheck} title={isSw ? 'Watumiaji Walioingia Sasa' : 'Currently Logged In'} live count={sessions.length} />
            {sessions.length === 0 ? (
              <EmptyState text={isSw
                ? 'Hakuna kikao kinachofanya kazi sasa. (Kitarekodiwa baada ya API call ya kwanza post-login.)'
                : 'No active sessions detected yet. Sessions are recorded after the first API call post-login.'} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sessions.map((sess) => (
                  <div key={sess.userId} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/50 p-3 transition-colors hover:border-slate-700">
                    <Avatar name={sess.name} role={sess.role} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-white">{sess.name}</span>
                        <StatusDot status={sess.status} />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={sess.role} />
                        <span className="text-[11px] text-slate-500">{timeAgo(sess.lastSeen)}</span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                        {sess.employeeNumber && <span className="mr-1 text-slate-400">{sess.employeeNumber}</span>}
                        IP: {sess.ip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Security events + Complaints */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <SectionHead icon={FaShieldAlt} title={isSw ? 'Matukio ya Usalama' : 'Security Events'} live count={data?.securityEvents?.length ?? 0} />
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {(data?.securityEvents || []).slice(0, 10).map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 rounded-lg bg-slate-800/60 p-2.5">
                    <EventBadge type={ev.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-slate-400">{ev.method} {ev.path} · IP {ev.ip}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(ev.createdAt)}</span>
                  </div>
                ))}
                {!data?.securityEvents?.length && <EmptyState text={isSw ? 'Hakuna matukio ya usalama bado.' : 'No security events yet.'} />}
              </div>
            </Card>

            <Card>
              <SectionHead icon={FaBell} title={isSw ? 'Malalamiko ya Karibuni' : 'Recent Complaints'} count={data?.recentComplaints?.length ?? 0} />
              <div className="space-y-2">
                {(data?.recentComplaints || []).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg bg-slate-800/60 p-3 transition-colors hover:bg-slate-800">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">#{c.id} {c.subject}</p>
                      <p className="text-[11px] text-slate-400">{c.user?.name || '-'} · {timeAgo(c.updatedAt)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.status === 'OPEN' ? 'border-amber-700/40 bg-amber-900/60 text-amber-300' : 'border-emerald-700/40 bg-emerald-900/60 text-emerald-300'}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
                {!data?.recentComplaints?.length && <EmptyState text={isSw ? 'Hakuna malalamiko.' : 'No complaints.'} />}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ════════ VIEW: SECURITY ════════ */}
      {activeView === 'security' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <SectionHead icon={FaShieldAlt} title={isSw ? 'Matukio Yote ya Usalama' : 'All Security Events'} live count={data?.securityEvents?.length ?? 0} />
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {(data?.securityEvents || []).map((ev) => (
                <div key={ev.id} className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventBadge type={ev.type} />
                    <span className="ml-auto text-[11px] text-slate-500">{timeAgo(ev.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{ev.method} {ev.path}{ev.userId ? ` · uid:${ev.userId}` : ''}</p>
                  <p className="text-[11px] text-slate-500">IP: {ev.ip}{ev.userAgent ? ` · ${ev.userAgent.slice(0, 55)}${ev.userAgent.length > 55 ? '…' : ''}` : ''}</p>
                </div>
              ))}
              {!data?.securityEvents?.length && <EmptyState text={isSw ? 'Hakuna matukio.' : 'No events yet.'} />}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <SectionHead icon={FaLock} title={isSw ? 'Akaunti Zilizofungwa' : 'Active Lockouts'} count={data?.lockouts?.length ?? 0} />
              {!(data?.lockouts?.length) ? (
                <EmptyState text={isSw ? 'Hakuna lockout hai sasa hivi.' : 'No active lockouts right now.'} />
              ) : (
                <div className="space-y-2">
                  {(data?.lockouts || []).map((l) => (
                    <div key={l.key} className="rounded-lg border border-rose-800/50 bg-rose-950/30 p-3">
                      <p className="break-all font-mono text-sm font-semibold text-rose-300">{l.key}</p>
                      <p className="mt-1 text-xs text-rose-400/80">
                        {isSw ? 'Majaribio' : 'Failures'}: {l.count} · {isSw ? 'Inabaki' : 'Remaining'}: {l.remainingSec}s
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={FaServer}  title={isSw ? 'Matukio Orodheshwa' : 'Events Tracked'}   value={security.trackedEvents ?? 0}   sub="RAM buffer" tone="neutral" />
              <MetricCard icon={FaHistory} title={isSw ? 'Maombi Orodheshwa' : 'Requests Tracked'} value={security.trackedRequests ?? 0} sub="RAM buffer" tone="neutral" />
            </div>
          </div>
        </div>
      )}

      {/* ════════ VIEW: USERS ════════ */}
      {activeView === 'users' && (
        <>
          <Card>
            <SectionHead icon={FaUserCheck} title={isSw ? 'Vikao Hai (Walioingia)' : 'Active Sessions — Logged In'} live count={sessions.length} />
            {sessions.length === 0 ? (
              <EmptyState text={isSw ? 'Hakuna kikao kinachofanya kazi sasa.' : 'No active sessions detected yet.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['User', 'Employee #', 'Role', 'Status', 'IP Address', 'Last Seen'].map((h) => (
                        <th key={h} className="pb-2 pr-4 text-left text-[11px] font-medium uppercase tracking-widest text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sessions.map((sess) => (
                      <tr key={sess.userId} className="transition-colors hover:bg-slate-800/40">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={sess.name} role={sess.role} />
                            <span className="font-medium text-white">{sess.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono text-slate-400">{sess.employeeNumber || '-'}</td>
                        <td className="py-3 pr-4"><RoleBadge role={sess.role} /></td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <StatusDot status={sess.status} />
                            <span className="text-xs capitalize text-slate-300">{sess.status}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-400">{sess.ip}</td>
                        <td className="py-3 text-xs text-slate-400">{timeAgo(sess.lastSeen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(users.byRole || {}).map(([role, count]) => (
              <div key={role} className="flex flex-col items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900 p-5">
                <RoleBadge role={role} />
                <p className="tabular-nums text-4xl font-black text-white">{count}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{isSw ? 'watumiaji' : 'users'}</p>
              </div>
            ))}
          </div>

          <Card>
            <SectionHead icon={FaUsers} title={isSw ? 'Watumiaji Waliongezwa Karibuni' : 'Recently Added Users'} count={data?.recentUsers?.length ?? 0} />
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {[isSw ? 'Jina' : 'Name', isSw ? 'Namba' : 'Employee #', isSw ? 'Nafasi' : 'Role', isSw ? 'Hali' : 'State', isSw ? 'Muda' : 'Created'].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-left text-[11px] font-medium uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(data?.recentUsers || []).map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-slate-800/40">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} role={u.role} />
                          <span className="font-medium text-white">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-slate-400">{u.employeeNumber}</td>
                      <td className="py-3 pr-4"><RoleBadge role={u.role} /></td>
                      <td className="py-3 pr-4">
                        {u.deletedAt
                          ? <span className="rounded-full border border-rose-700/40 bg-rose-900/50 px-2 py-0.5 text-[10px] font-semibold text-rose-300">ARCHIVED</span>
                          : <span className="rounded-full border border-emerald-700/40 bg-emerald-900/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">ACTIVE</span>}
                      </td>
                      <td className="py-3 text-xs text-slate-400">{timeAgo(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ════════ VIEW: AUDIT ════════ */}
      {activeView === 'audit' && (
        <>
          <Card>
            <SectionHead icon={FaTerminal} title={isSw ? 'Maombi ya Hivi Karibuni' : 'Request Telemetry'} live count={data?.recentRequests?.length ?? 0} />
            <div className="max-h-[22rem] overflow-x-auto overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-slate-800">
                    {['Method', 'Path', 'Status', 'Latency', 'IP', 'Time'].map((h) => (
                      <th key={h} className="whitespace-nowrap pb-2 pr-4 text-left text-[11px] font-medium uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {(data?.recentRequests || []).slice(0, 40).map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-800/40">
                      <td className="whitespace-nowrap py-2 pr-4"><MethodBadge method={row.method} /></td>
                      <td className="max-w-[16rem] truncate py-2 pr-4 font-mono text-slate-300">{row.path}</td>
                      <td className="whitespace-nowrap py-2 pr-4"><StatusCodeBadge code={row.statusCode} /></td>
                      <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{row.latencyMs}ms</td>
                      <td className="whitespace-nowrap py-2 pr-4 font-mono text-slate-400">{row.ip}</td>
                      <td className="whitespace-nowrap py-2 text-slate-500">{timeAgo(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.recentRequests?.length && <EmptyState text={isSw ? 'Hakuna maombi bado.' : 'No requests recorded yet.'} />}
            </div>
          </Card>

          <Card>
            <SectionHead icon={FaExchangeAlt} title={isSw ? 'Uhamisho wa Karibuni' : 'Recent Transfers'} count={data?.recentTransfers?.length ?? 0} />
            <div className="space-y-2">
              {(data?.recentTransfers || []).map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/50 p-3 transition-colors hover:bg-slate-800">
                  <Avatar name={t.user?.name || '?'} role={t.performedBy?.role} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{t.user?.name || '-'}</p>
                    <p className="text-[11px] text-slate-400">
                      {t.oldEmployerName || '-'}{' \u2192 '}{t.newEmployerName || '-'}
                      {' · '}
                      <span className="font-mono">{t.oldEmployeeNumber}</span>
                      {' \u2192 '}
                      <span className="font-mono">{t.newEmployeeNumber}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {t.performedBy && <RoleBadge role={t.performedBy.role} />}
                    <p className="mt-1 text-[11px] text-slate-500">{timeAgo(t.createdAt)}</p>
                  </div>
                </div>
              ))}
              {!data?.recentTransfers?.length && <EmptyState text={isSw ? 'Hakuna uhamisho.' : 'No transfers yet.'} />}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard icon={FaUserSecret}          title={isSw ? 'Matukio Za Usalama' : 'Security Events'}   value={security.trackedEvents ?? 0}   sub="RAM buffer" tone="danger"  />
            <MetricCard icon={FaServer}              title={isSw ? 'Maombi Orodheshwa' : 'Tracked Requests'}  value={security.trackedRequests ?? 0} sub="RAM buffer" tone="neutral" />
            <MetricCard icon={FaExclamationTriangle} title={isSw ? 'Lockouts Hai'      : 'Active Lockouts'}   value={security.activeLockouts ?? 0}  sub={isSw ? 'IP/akaunti' : 'IP / account pairs'} tone="warning" />
            <MetricCard icon={FaDatabase}            title={isSw ? 'Submissions'       : 'Submissions'}       value={submissions.total ?? 0}         sub={`Archived: ${submissions.archived ?? 0}`}  tone="purple"  />
          </div>
        </>
      )}
    </div>
  );
}
