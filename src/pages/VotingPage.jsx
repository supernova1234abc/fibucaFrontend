import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { FaVoteYea, FaCheckCircle, FaLock, FaCopy } from 'react-icons/fa';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const AVATAR_COLORS = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
  'from-violet-500 to-violet-700',
];

function CandidateInitials({ name, idx }) {
  const initials = name
    ? name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-sm font-bold text-white`}>
      {initials}
    </div>
  );
}

function ResultBar({ count, total, colorIndex }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const bars = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500'];
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600">
        <span>{count}/{total} {isNaN(total) ? '' : 'votes'}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${bars[colorIndex % bars.length]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const normalizeSessionCandidates = (sessionLike) => {
  const raw = Array.isArray(sessionLike?.candidates) ? sessionLike.candidates : [];
  const fallbackTitle = sessionLike?.position || 'General';
  return raw.map((candidate, index) => ({
    ...candidate,
    id: candidate.id || `candidate-${index + 1}`,
    positionKey: candidate.positionKey || 'default',
    positionTitle: candidate.positionTitle || fallbackTitle,
  }));
};

const groupCandidatesByPosition = (sessionLike, tallyByPosition) => {
  if (Array.isArray(tallyByPosition) && tallyByPosition.length > 0) return tallyByPosition;

  const groups = new Map();
  for (const candidate of normalizeSessionCandidates(sessionLike)) {
    if (!groups.has(candidate.positionKey)) {
      groups.set(candidate.positionKey, {
        positionKey: candidate.positionKey,
        positionTitle: candidate.positionTitle,
        items: [],
      });
    }
    groups.get(candidate.positionKey).items.push({ candidate, count: 0 });
  }
  return Array.from(groups.values());
};

export default function VotingPage() {
  const { isSw } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [votingPositionKey, setVotingPositionKey] = useState(null);
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

  useEffect(() => {
    load();
    const timerId = setInterval(load, 30000);
    return () => clearInterval(timerId);
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

  const openSession = useCallback((session) => {
    setActiveSession(session);
    setDetail(null);
    loadDetail(session.id);
  }, [loadDetail]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'ACTIVE') {
      clearInterval(pollRef.current);
      return undefined;
    }
    pollRef.current = setInterval(() => loadDetail(activeSession.id), 15000);
    return () => clearInterval(pollRef.current);
  }, [activeSession, loadDetail]);

  const handleVote = async (candidate) => {
    const confirmed = await Swal.fire({
      background: '#ffffff',
      color: '#0f172a',
      title: isSw ? 'Thibitisha Kura Yako' : 'Confirm Your Vote',
      html: `
        <p style="color:#334155;font-size:0.9rem">${isSw ? 'Unachagua:' : 'Voting for:'}</p>
        <p style="color:#059669;font-size:1.2rem;font-weight:800;margin:10px 0">${candidate.name}</p>
        <p style="color:#475569;font-size:0.8rem">${isSw ? 'Nafasi:' : 'Position:'} ${candidate.positionTitle}</p>
      `,
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: isSw ? 'Tuma Kura' : 'Submit Vote',
    });
    if (!confirmed.isConfirmed) return;

    setVotingPositionKey(candidate.positionKey);
    try {
      const { data } = await api.post(`/api/voting/sessions/${activeSession.id}/vote`, { candidateId: candidate.id });
      toast.success(isSw ? 'Kura yako imetumwa!' : 'Vote recorded!');

      setDetail((prev) => ({
        ...prev,
        hasVoted: true,
        votedPositionKeys: Array.from(new Set([...(prev?.votedPositionKeys || []), data.positionKey])),
        votedCandidateIdsByPosition: { ...(prev?.votedCandidateIdsByPosition || {}), [data.positionKey]: candidate.id },
        receiptHashesByPosition: { ...(prev?.receiptHashesByPosition || {}), [data.positionKey]: data.blockHash },
      }));

      loadDetail(activeSession.id);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit vote');
    } finally {
      setVotingPositionKey(null);
    }
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash).then(() => toast.success(isSw ? 'Imenakiliwa!' : 'Copied!'));
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '-';
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (minutes < 1) return isSw ? 'Sasa hivi' : 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-600">{isSw ? 'Inapakia...' : 'Loading...'}</div>;

  if (activeSession) {
    const session = activeSession;
    const totalVotes = detail?.session?._count?.votes ?? session._count?.votes ?? 0;
    const grouped = groupCandidatesByPosition(session, detail?.tallyByPosition);
    const votedPositionKeys = detail?.votedPositionKeys || session.votedPositionKeys || [];
    const receiptHashesByPosition = detail?.receiptHashesByPosition || {};
    const votedCandidateIdsByPosition = detail?.votedCandidateIdsByPosition || {};

    return (
      <div className="space-y-5 p-4">
        <button onClick={() => { setActiveSession(null); setDetail(null); clearInterval(pollRef.current); }} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          {'<-'} {isSw ? 'Rudi' : 'Back'}
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{session.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {grouped.map((group) => (
                  <span key={group.positionKey} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                    {group.positionTitle}
                  </span>
                ))}
              </div>
              {session.description && <p className="mt-2 text-sm text-slate-600">{session.description}</p>}
              <p className="mt-1 text-xs text-slate-500">{timeAgo(session.createdAt)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {session.status === 'ACTIVE' && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  LIVE
                </span>
              )}
              {session.status === 'ENDED' && <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-0.5 text-xs text-slate-600">ENDED</span>}
              <span className="text-xs text-slate-600">{totalVotes} {isSw ? 'kura zote' : 'total votes'}</span>
            </div>
          </div>
        </div>

        {detailLoading && <div className="py-8 text-center text-sm text-slate-500">{isSw ? 'Inapakia...' : 'Loading...'}</div>}

        {detail && (
          <div className="space-y-4">
            {grouped.map((group, groupIndex) => {
              const positionTotal = group.items.reduce((sum, entry) => sum + entry.count, 0);
              const hasVotedForPosition = votedPositionKeys.includes(group.positionKey);
              const selectedCandidateId = votedCandidateIdsByPosition[group.positionKey];

              return (
                <div key={group.positionKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{group.positionTitle}</h3>
                      <p className="text-xs text-slate-500">{positionTotal} {isSw ? 'kura katika nafasi hii' : 'votes for this position'}</p>
                    </div>
                    {hasVotedForPosition && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{isSw ? 'Umepiga kura' : 'Voted'}</span>}
                  </div>

                  {receiptHashesByPosition[group.positionKey] && (
                    <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="mb-2 text-xs font-medium text-emerald-700">{isSw ? 'Hash ya uthibitisho wa kura yako' : 'Your vote receipt hash'}</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 break-all rounded border border-emerald-200 bg-white p-2 text-[11px] text-emerald-700">{receiptHashesByPosition[group.positionKey]}</code>
                        <button onClick={() => copyHash(receiptHashesByPosition[group.positionKey])} className="rounded border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50">
                          <FaCopy />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.items.map((entry, idx) => {
                      const isSelected = selectedCandidateId === entry.candidate.id;
                      return (
                        <div key={entry.candidate.id} className={`rounded-xl border p-3 ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="mb-2 flex items-center gap-3">
                            <CandidateInitials name={entry.candidate.name} idx={idx + groupIndex} />
                            <div>
                              <p className="font-semibold text-slate-900">{entry.candidate.name}</p>
                              {entry.candidate.description && <p className="text-xs text-slate-600">{entry.candidate.description}</p>}
                            </div>
                          </div>

                          <ResultBar count={entry.count} total={positionTotal} colorIndex={idx} />

                          {session.status === 'ACTIVE' && !hasVotedForPosition && (
                            <button
                              onClick={() => handleVote(entry.candidate)}
                              disabled={votingPositionKey === group.positionKey}
                              className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {votingPositionKey === group.positionKey ? (isSw ? 'Inatuma...' : 'Submitting...') : (isSw ? 'Piga Kura' : 'Vote')}
                            </button>
                          )}

                          {isSelected && (
                            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <FaCheckCircle /> {isSw ? 'Chaguo lako' : 'Your choice'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          <FaLock className="mr-1 inline" />
          {isSw ? 'Kila nafasi ina kura moja tu kwa mtumiaji. Asilimia zinaoneshwa kwa kura za nafasi husika.' : 'Each position allows one vote per user. Percentages are calculated from votes within that position.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <FaVoteYea className="text-2xl text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">{isSw ? 'Upigaji Kura' : 'Staff Voting'}</h2>
          <p className="text-xs text-slate-600">{isSw ? 'Ukurasa wa kura wa wafanyakazi (mwonekano wa mwanga)' : 'Staff voting page (light theme)'}</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
          <FaVoteYea className="mx-auto mb-4 text-5xl text-slate-300" />
          <p className="text-slate-600">{isSw ? 'Hakuna kura za sasa hivi.' : 'No voting sessions at the moment.'}</p>
          <p className="mt-1 text-xs text-slate-500">{isSw ? 'Ukurasa huu unasasishwa kiotomatiki.' : 'This page refreshes automatically.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.map((session) => {
            const grouped = groupCandidatesByPosition(session);
            const hasAnyVote = (session.votedPositionKeys || []).length > 0;
            const totalVotes = session._count?.votes ?? 0;

            return (
              <button
                key={session.id}
                onClick={() => openSession(session)}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow"
              >
                <div className="mb-3 flex w-full items-center justify-between">
                  {session.status === 'ACTIVE' ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      LIVE
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">ENDED</span>
                  )}
                  {hasAnyVote && (
                    <span className="flex items-center gap-1 text-xs text-emerald-700">
                      <FaCheckCircle /> {isSw ? 'Umeshapiga kura' : 'You voted'}
                    </span>
                  )}
                </div>

                <p className="mb-1 font-bold text-slate-900">{session.title}</p>
                {session.description && <p className="mb-2 text-xs text-slate-600 line-clamp-2">{session.description}</p>}

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {grouped.map((group) => (
                    <span key={group.positionKey} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      {group.positionTitle}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between text-xs text-slate-600">
                  <span>{totalVotes} {isSw ? 'kura zote' : 'total votes'}</span>
                  <span className="font-medium text-blue-700">{isSw ? 'Fungua ->' : 'Open ->'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
