import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { FaVoteYea, FaCheckCircle, FaLock, FaCopy } from 'react-icons/fa';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const AVATAR_COLORS = [
  'from-violet-600 to-violet-800',
  'from-sky-600 to-sky-800',
  'from-emerald-600 to-emerald-800',
  'from-amber-500 to-amber-700',
  'from-rose-600 to-rose-800',
  'from-cyan-600 to-cyan-800',
  'from-fuchsia-600 to-fuchsia-800',
  'from-teal-600 to-teal-800',
];

function CandidateInitials({ name, idx }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  return (
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-lg font-bold text-white shadow-lg`}>
      {initials}
    </div>
  );
}

function ResultBar({ count, total, color, label }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const BAR = [
    'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
    'bg-amber-500',  'bg-rose-500', 'bg-cyan-500',
  ];
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="text-slate-500">{count} vote{count !== 1 ? 's' : ''} · {pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${BAR[color % BAR.length]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function VotingPage() {
  const { isSw } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null); // session being shown in detail
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/voting/sessions');
      setSessions(data.sessions || []);
    } catch {
      toast.error(isSw ? 'Imeshindwa kupakia kura' : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [isSw]);

  // Refresh sessions list every 30s (picks up new sessions admin starts)
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/api/voting/sessions/${id}`);
      setDetail(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openSession = useCallback((s) => {
    setActiveSession(s);
    setDetail(null);
    loadDetail(s.id);
  }, [loadDetail]);

  // Poll detail for ACTIVE sessions every 15s so staff can see live vote counts.
  useEffect(() => {
    if (!activeSession || !detail) return;
    if (activeSession.status !== 'ACTIVE') {
      clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => loadDetail(activeSession.id), 15000);
    return () => clearInterval(pollRef.current);
  }, [activeSession, detail, loadDetail]);

  const handleVote = async (candidateId) => {
    const s = activeSession;
    const cands = Array.isArray(s.candidates) ? s.candidates : [];
    const candidate = cands.find((c) => c.id === candidateId);

    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0',
      title: isSw ? 'Thibitisha Kura Yako' : 'Confirm Your Vote',
      html: `
        <p style="color:#94a3b8;font-size:0.9rem">${isSw ? 'Unachagua:' : 'Voting for:'}</p>
        <p style="color:#34d399;font-size:1.3rem;font-weight:800;margin:10px 0">${candidate?.name}</p>
        <p style="color:#475569;font-size:0.75rem">${isSw ? 'Kura haiwezi kubadilishwa.' : 'This cannot be changed after submission.'}</p>
      `,
      showCancelButton: true, confirmButtonColor: '#059669', cancelButtonColor: '#374151',
      confirmButtonText: isSw ? '\ud83d\uddf3 Tuma Kura' : '\ud83d\uddf3 Submit Vote',
    });
    if (!confirmed.isConfirmed) return;

    setVoting(true);
    try {
      const { data } = await api.post(`/api/voting/sessions/${s.id}/vote`, { candidateId });
      toast.success(isSw ? 'Kura yako imetumwa!' : 'Vote recorded!');
      setSessions((prev) => prev.map((x) =>
        x.id === s.id ? { ...x, hasVoted: true, _count: { votes: (x._count?.votes || 0) + 1 } } : x
      ));
      setDetail((prev) => ({ ...prev, hasVoted: true, receiptHash: data.blockHash }));
      setActiveSession((prev) => ({ ...prev, hasVoted: true }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash).then(() => toast.success(isSw ? 'Imenakiliwa!' : 'Copied!'));
  };

  const timeAgo = (d) => {
    if (!d) return '—';
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return isSw ? 'Sasa hivi' : 'Just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center text-slate-500">
      {isSw ? 'Inapakia...' : 'Loading...'}
    </div>
  );

  // ─ detail view ──────────────────────────────────────────────────────────────────
  if (activeSession) {
    const s = activeSession;
    const cands = Array.isArray(s.candidates) ? s.candidates : [];
    const hasVoted = s.hasVoted || detail?.hasVoted;
    const totalVotes = detail?.session?._count?.votes ?? s._count?.votes ?? 0;

    return (
      <div className="space-y-5 p-4">
        {/* Back */}
        <button
          onClick={() => { setActiveSession(null); setDetail(null); clearInterval(pollRef.current); }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-white"
        >
          ← {isSw ? 'Rudi' : 'Back'}
        </button>

        {/* Session title */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">{s.title}</h2>
              {s.position && (
                <p className="mt-1 inline-flex rounded-full border border-sky-800 bg-sky-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                  {isSw ? 'Cheo Kinachogombewa:' : 'Contested Position:'} {s.position}
                </p>
              )}
              {s.description && <p className="mt-1 text-sm text-slate-400">{s.description}</p>}
              <p className="mt-1 text-xs text-slate-600">{timeAgo(s.createdAt)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {s.status === 'ACTIVE' && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-0.5 text-xs font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  LIVE
                </span>
              )}
              {s.status === 'ENDED' && (
                <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs text-slate-400">ENDED</span>
              )}
              <span className="text-xs text-slate-600">{totalVotes} {isSw ? 'kura' : 'votes cast'}</span>
            </div>
          </div>
        </div>

        {detailLoading && (
          <div className="py-8 text-center text-sm text-slate-500">{isSw ? 'Inapakia...' : 'Loading...'}</div>
        )}

        {detail && (
          <>
            {/* Receipt (already voted) */}
            {hasVoted && detail.receiptHash && (
              <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <FaCheckCircle className="text-lg text-emerald-400" />
                  <span className="font-semibold text-emerald-300">{isSw ? 'Kura Yako Imethibitishwa' : 'Your Vote is Confirmed'}</span>
                </div>
                <p className="mb-2 text-xs text-slate-500">{isSw ? 'Hifadhi hash hii kama ushahidi wa kura yako:' : 'Save this hash as proof of your vote:'}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg border border-emerald-900 bg-slate-950 p-3 text-xs text-emerald-600">
                    {detail.receiptHash}
                  </code>
                  <button
                    onClick={() => copyHash(detail.receiptHash)}
                    className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
            )}

            {/* Already voted but no receipt (session from list) */}
            {hasVoted && !detail.receiptHash && (
              <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/30 p-4 text-center">
                <FaCheckCircle className="mx-auto mb-2 text-2xl text-emerald-400" />
                <p className="text-sm text-emerald-300">{isSw ? 'Umeshapiga kura katika kikao hiki.' : 'You have already voted in this session.'}</p>
              </div>
            )}

            {/* ACTIVE session: voting panel + live read-only tally */}
            {s.status === 'ACTIVE' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  {!hasVoted && (
                    <>
                      <div className="mb-3 flex items-center gap-2">
                        <FaLock className="text-xs text-slate-600" />
                        <p className="text-xs text-slate-500">
                          {isSw ? 'Kura yako italindwa na blockchain. Haiwezi kubadilishwa.' : 'Your vote is sealed with blockchain. It cannot be changed.'}
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {cands.map((c, i) => (
                          <button
                            key={c.id}
                            onClick={() => handleVote(c.id)}
                            disabled={voting}
                            className="group relative flex flex-col items-center rounded-2xl border-2 border-slate-700 bg-slate-900 p-6 text-center transition hover:border-emerald-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CandidateInitials name={c.name} idx={i} />
                            <p className="mt-4 text-base font-bold text-white">{c.name}</p>
                            {c.description && (
                              <p className="mt-1 text-xs text-slate-400">{c.description}</p>
                            )}
                            <span className="mt-4 rounded-full border border-emerald-700 bg-emerald-900/30 px-4 py-1 text-xs font-semibold text-emerald-300 transition group-hover:bg-emerald-700 group-hover:text-white">
                              {voting ? (isSw ? 'Inatuma...' : 'Submitting...') : (isSw ? 'Piga Kura' : 'Vote')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {hasVoted && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                      {isSw
                        ? 'Umechagua tayari. Upande wa kulia unaona matokeo ya moja kwa moja (view only).'
                        : 'You already voted. Live results are shown on the right (view only).'}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      {isSw ? 'Matokeo ya Moja kwa Moja' : 'Live Vote Count'}
                    </h3>
                    <span className="rounded-full border border-emerald-700 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {isSw ? 'VIEW ONLY' : 'VIEW ONLY'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {(detail.tally || []).map((t, i) => (
                      <div key={t.candidate.id} className="flex items-center gap-4">
                        <CandidateInitials name={t.candidate.name} idx={i} />
                        <div className="flex-1">
                          <p className="mb-1 font-semibold text-white">{t.candidate.name}</p>
                          <ResultBar count={t.count} total={totalVotes} color={i} label="" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Results (ENDED) */}
            {s.status === 'ENDED' && detail.tally && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h3 className="mb-4 text-sm font-bold text-white">{isSw ? 'Matokeo ya Mwisho' : 'Final Results'}</h3>
                <div className="space-y-5">
                  {detail.tally.map((t, i) => (
                    <div key={t.candidate.id} className="flex items-center gap-4">
                      <CandidateInitials name={t.candidate.name} idx={i} />
                      <div className="flex-1">
                        <p className="mb-1 font-semibold text-white">
                          {i === 0 && totalVotes > 0 ? '🏆 ' : ''}{t.candidate.name}
                        </p>
                        <ResultBar count={t.count} total={totalVotes} color={i} label="" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─ sessions list view ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <FaVoteYea className="text-2xl text-emerald-400" />
        <div>
          <h2 className="text-xl font-bold text-white">{isSw ? 'Upigaji Kura' : 'Staff Voting'}</h2>
          <p className="text-xs text-slate-500">{isSw ? 'Kura zako zinalindwa na teknolojia ya blockchain' : 'Blockchain-secured, anonymous, verifiable'}</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-14 text-center">
          <FaVoteYea className="mx-auto mb-4 text-5xl text-slate-800" />
          <p className="text-slate-500">{isSw ? 'Hakuna kura za sasa hivi.' : 'No voting sessions at the moment.'}</p>
          <p className="mt-1 text-xs text-slate-700">{isSw ? 'Ukurasa huu unasasishwa kiotomatiki.' : 'This page refreshes automatically.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.map((s) => {
            const cands = Array.isArray(s.candidates) ? s.candidates : [];
            const hasVoted = s.hasVoted;
            const voteCount = s._count?.votes ?? 0;

            return (
              <button
                key={s.id}
                onClick={() => openSession(s)}
                className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-emerald-700 hover:bg-slate-900"
              >
                {/* Status row */}
                <div className="mb-3 flex w-full items-center justify-between">
                  {s.status === 'ACTIVE' ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-900/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      LIVE
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-500">ENDED</span>
                  )}
                  {hasVoted && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <FaCheckCircle /> {isSw ? 'Umepiga Kura' : 'Voted'}
                    </span>
                  )}
                </div>

                {/* Title */}
                <p className="mb-1 font-bold text-white">{s.title}</p>
                {s.position && (
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                    {isSw ? 'Cheo:' : 'Position:'} {s.position}
                  </p>
                )}
                {s.description && <p className="mb-3 text-xs text-slate-500 line-clamp-2">{s.description}</p>}

                {/* Candidate avatars row */}
                <div className="mb-4 flex -space-x-2">
                  {cands.slice(0, 5).map((c, i) => (
                    <div
                      key={c.id}
                      title={c.name}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-xs font-bold text-white`}
                    >
                      {c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {cands.length > 5 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-xs text-slate-400">
                      +{cands.length - 5}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between text-xs text-slate-600">
                  <span>{voteCount} {isSw ? 'kura' : 'votes'}</span>
                  <span className="text-emerald-600 font-medium">
                    {s.status === 'ACTIVE'
                      ? (hasVoted ? (isSw ? 'Tazama →' : 'View →') : (isSw ? 'Piga Kura →' : 'Vote Now →'))
                      : (isSw ? 'Matokeo →' : 'Results →')
                    }
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
