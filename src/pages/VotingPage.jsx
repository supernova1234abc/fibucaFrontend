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
  const initials = name ? name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-lg font-bold text-white shadow-lg`}>
      {initials}
    </div>
  );
}

function ResultBar({ count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColors = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-500">{count} vote{count !== 1 ? 's' : ''}</span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-3 rounded-full transition-all duration-700 ${barColors[color % barColors.length]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const normalizeSessionCandidates = (sessionLike) => {
  const rawCandidates = Array.isArray(sessionLike?.candidates) ? sessionLike.candidates : [];
  const fallbackTitle = sessionLike?.position || 'General';
  return rawCandidates.map((candidate, index) => ({
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
      background: '#0f172a',
      color: '#e2e8f0',
      title: isSw ? 'Thibitisha Kura Yako' : 'Confirm Your Vote',
      html: `
        <p style="color:#94a3b8;font-size:0.9rem">${isSw ? 'Unachagua:' : 'Voting for:'}</p>
        <p style="color:#34d399;font-size:1.3rem;font-weight:800;margin:10px 0">${candidate.name}</p>
        <p style="color:#64748b;font-size:0.8rem">${isSw ? 'Kwa nafasi ya' : 'For position'}: ${candidate.positionTitle}</p>
        <p style="color:#475569;font-size:0.75rem;margin-top:8px">${isSw ? 'Kura haiwezi kubadilishwa baada ya kutumwa.' : 'This cannot be changed after submission.'}</p>
      `,
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#374151',
      confirmButtonText: isSw ? 'Tuma Kura' : 'Submit Vote',
    });
    if (!confirmed.isConfirmed) return;

    setVotingPositionKey(candidate.positionKey);
    try {
      const { data } = await api.post(`/api/voting/sessions/${activeSession.id}/vote`, { candidateId: candidate.id });
      toast.success(isSw ? 'Kura yako imetumwa!' : 'Vote recorded!');

      setSessions((prev) => prev.map((session) => {
        if (session.id !== activeSession.id) return session;
        const votedPositionKeys = Array.isArray(session.votedPositionKeys) ? session.votedPositionKeys : [];
        return {
          ...session,
          hasVoted: true,
          votedPositionKeys: votedPositionKeys.includes(data.positionKey) ? votedPositionKeys : [...votedPositionKeys, data.positionKey],
          _count: { votes: (session._count?.votes || 0) + 1 },
        };
      }));

      setActiveSession((prev) => {
        if (!prev) return prev;
        const votedPositionKeys = Array.isArray(prev.votedPositionKeys) ? prev.votedPositionKeys : [];
        return {
          ...prev,
          hasVoted: true,
          votedPositionKeys: votedPositionKeys.includes(data.positionKey) ? votedPositionKeys : [...votedPositionKeys, data.positionKey],
+        };
+      });
+
+      setDetail((prev) => ({
+        ...prev,
+        hasVoted: true,
+        votedPositionKeys: Array.from(new Set([...(prev?.votedPositionKeys || []), data.positionKey])),
+        votedCandidateIdsByPosition: { ...(prev?.votedCandidateIdsByPosition || {}), [data.positionKey]: candidate.id },
+        receiptHashesByPosition: { ...(prev?.receiptHashesByPosition || {}), [data.positionKey]: data.blockHash },
+      }));
+      loadDetail(activeSession.id);
+    } catch (err) {
+      toast.error(err.response?.data?.error || 'Failed to submit vote');
+    } finally {
+      setVotingPositionKey(null);
+    }
+  };
+
+  const copyHash = (hash) => {
+    navigator.clipboard.writeText(hash).then(() => toast.success(isSw ? 'Imenakiliwa!' : 'Copied!'));
+  };
+
+  const timeAgo = (dateStr) => {
+    if (!dateStr) return '—';
+    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
+    if (minutes < 1) return isSw ? 'Sasa hivi' : 'Just now';
+    if (minutes < 60) return `${minutes}m ago`;
+    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
+    return `${Math.floor(minutes / 1440)}d ago`;
+  };
+
+  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">{isSw ? 'Inapakia...' : 'Loading...'}</div>;
+
+  if (activeSession) {
+    const session = activeSession;
+    const totalVotes = detail?.session?._count?.votes ?? session._count?.votes ?? 0;
+    const grouped = groupCandidatesByPosition(session, detail?.tallyByPosition);
+    const votedPositionKeys = detail?.votedPositionKeys || session.votedPositionKeys || [];
+    const receiptHashesByPosition = detail?.receiptHashesByPosition || {};
+    const votedCandidateIdsByPosition = detail?.votedCandidateIdsByPosition || {};
+
+    return (
+      <div className="space-y-5 p-4">
+        <button onClick={() => { setActiveSession(null); setDetail(null); clearInterval(pollRef.current); }} className="flex items-center gap-2 text-sm text-slate-500 hover:text-white">
+          ← {isSw ? 'Rudi' : 'Back'}
+        </button>
+
+        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
+          <div className="flex flex-wrap items-start justify-between gap-3">
+            <div>
+              <h2 className="text-lg font-bold text-white">{session.title}</h2>
+              <div className="mt-2 flex flex-wrap gap-2">
+                {grouped.map((group) => (
+                  <span key={group.positionKey} className="rounded-full border border-sky-800 bg-sky-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
+                    {group.positionTitle}
+                  </span>
+                ))}
+              </div>
+              {session.description && <p className="mt-2 text-sm text-slate-400">{session.description}</p>}
+              <p className="mt-1 text-xs text-slate-600">{timeAgo(session.createdAt)}</p>
+            </div>
+            <div className="flex flex-col items-end gap-1">
+              {session.status === 'ACTIVE' && (
+                <span className="flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-0.5 text-xs font-bold text-emerald-300">
+                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
+                  LIVE
+                </span>
+              )}
+              {session.status === 'ENDED' && <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs text-slate-400">ENDED</span>}
+              <span className="text-xs text-slate-600">{totalVotes} {isSw ? 'kura' : 'votes cast'}</span>
+            </div>
+          </div>
+        </div>
+
+        {detailLoading && <div className="py-8 text-center text-sm text-slate-500">{isSw ? 'Inapakia...' : 'Loading...'}</div>}
+
+        {detail && (
+          <>
+            {Object.keys(receiptHashesByPosition).length > 0 && (
+              <div className="space-y-3">
+                {grouped.filter((group) => receiptHashesByPosition[group.positionKey]).map((group) => (
+                  <div key={group.positionKey} className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-5">
+                    <div className="mb-2 flex items-center gap-2">
+                      <FaCheckCircle className="text-lg text-emerald-400" />
+                      <span className="font-semibold text-emerald-300">{group.positionTitle}</span>
+                    </div>
+                    <p className="mb-2 text-xs text-slate-500">{isSw ? 'Hash ya uthibitisho wa kura yako:' : 'Your voting receipt hash:'}</p>
+                    <div className="flex items-center gap-2">
+                      <code className="flex-1 break-all rounded-lg border border-emerald-900 bg-slate-950 p-3 text-xs text-emerald-600">{receiptHashesByPosition[group.positionKey]}</code>
+                      <button onClick={() => copyHash(receiptHashesByPosition[group.positionKey])} className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white">
+                        <FaCopy />
+                      </button>
+                    </div>
+                  </div>
+                ))}
+              </div>
+            )}
+
+            {session.status === 'ACTIVE' && (
+              <div className="space-y-6">
+                {grouped.map((group, groupIndex) => {
+                  const hasVotedForPosition = votedPositionKeys.includes(group.positionKey);
+                  const selectedCandidateId = votedCandidateIdsByPosition[group.positionKey];
+                  return (
+                    <div key={group.positionKey} className="grid gap-5 lg:grid-cols-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
+                      <div>
+                        <div className="mb-3 flex items-center justify-between gap-3">
+                          <h3 className="text-base font-bold text-sky-300">{group.positionTitle}</h3>
+                          {hasVotedForPosition && <span className="rounded-full border border-emerald-700 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">{isSw ? 'UMEPIGA KURA' : 'VOTED'}</span>}
+                        </div>
+
+                        {!hasVotedForPosition && (
+                          <div className="mb-3 flex items-center gap-2">
+                            <FaLock className="text-xs text-slate-600" />
+                            <p className="text-xs text-slate-500">{isSw ? 'Kura moja tu kwa kila cheo. Haiwezi kubadilishwa.' : 'One vote per position. It cannot be changed.'}</p>
+                          </div>
+                        )}
+
+                        <div className="grid gap-4 sm:grid-cols-2">
+                          {group.items.map((entry, itemIndex) => {
+                            const isSelected = selectedCandidateId === entry.candidate.id;
+                            return (
+                              <button
+                                key={entry.candidate.id}
+                                onClick={() => handleVote(entry.candidate)}
+                                disabled={hasVotedForPosition || votingPositionKey === group.positionKey}
+                                className={`group relative flex flex-col items-center rounded-2xl border-2 p-6 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${isSelected ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-700 bg-slate-900 hover:border-emerald-500 hover:bg-slate-800'}`}
+                              >
+                                <CandidateInitials name={entry.candidate.name} idx={groupIndex + itemIndex} />
+                                <p className="mt-4 text-base font-bold text-white">{entry.candidate.name}</p>
+                                {entry.candidate.description && <p className="mt-1 text-xs text-slate-400">{entry.candidate.description}</p>}
+                                <span className="mt-4 rounded-full border border-emerald-700 bg-emerald-900/30 px-4 py-1 text-xs font-semibold text-emerald-300 transition group-hover:bg-emerald-700 group-hover:text-white">
+                                  {hasVotedForPosition ? (isSw ? 'Tayari' : 'Done') : (votingPositionKey === group.positionKey ? (isSw ? 'Inatuma...' : 'Submitting...') : (isSw ? 'Piga Kura' : 'Vote'))}
+                                </span>
+                              </button>
+                            );
+                          })}
+                        </div>
+                      </div>
+
+                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
+                        <div className="mb-3 flex items-center justify-between">
+                          <h4 className="text-sm font-bold text-white">{group.positionTitle}</h4>
+                          <span className="rounded-full border border-emerald-700 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">VIEW ONLY</span>
+                        </div>
+                        <div className="space-y-4">
+                          {group.items.map((entry, itemIndex) => (
+                            <div key={entry.candidate.id} className="flex items-center gap-4">
+                              <CandidateInitials name={entry.candidate.name} idx={groupIndex + itemIndex} />
+                              <div className="flex-1">
+                                <p className="mb-1 font-semibold text-white">{entry.candidate.name}</p>
+                                <ResultBar count={entry.count} total={totalVotes} color={groupIndex + itemIndex} />
+                              </div>
+                            </div>
+                          ))}
+                        </div>
+                      </div>
+                    </div>
+                  );
+                })}
+              </div>
+            )}
+
+            {session.status === 'ENDED' && (
+              <div className="space-y-5">
+                {grouped.map((group, groupIndex) => (
+                  <div key={group.positionKey} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
+                    <h3 className="mb-4 text-sm font-bold text-sky-300">{group.positionTitle}</h3>
+                    <div className="space-y-5">
+                      {group.items.map((entry, itemIndex) => (
+                        <div key={entry.candidate.id} className="flex items-center gap-4">
+                          <CandidateInitials name={entry.candidate.name} idx={groupIndex + itemIndex} />
+                          <div className="flex-1">
+                            <p className="mb-1 font-semibold text-white">{itemIndex === 0 && entry.count > 0 ? '🏆 ' : ''}{entry.candidate.name}</p>
+                            <ResultBar count={entry.count} total={totalVotes} color={groupIndex + itemIndex} />
+                          </div>
+                        </div>
+                      ))}
+                    </div>
+                  </div>
+                ))}
+              </div>
+            )}
+          </>
+        )}
+      </div>
+    );
+  }
+
+  return (
+    <div className="space-y-6 p-4">
+      <div className="flex items-center gap-3">
+        <FaVoteYea className="text-2xl text-emerald-400" />
+        <div>
+          <h2 className="text-xl font-bold text-white">{isSw ? 'Upigaji Kura' : 'Staff Voting'}</h2>
+          <p className="text-xs text-slate-500">{isSw ? 'Kikao kimoja kinaweza kuwa na nafasi nyingi za kupigiwa kura' : 'One session can contain multiple contested positions'}</p>
+        </div>
+      </div>
+
+      {sessions.length === 0 ? (
+        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-14 text-center">
+          <FaVoteYea className="mx-auto mb-4 text-5xl text-slate-800" />
+          <p className="text-slate-500">{isSw ? 'Hakuna kura za sasa hivi.' : 'No voting sessions at the moment.'}</p>
+          <p className="mt-1 text-xs text-slate-700">{isSw ? 'Ukurasa huu unasasishwa kiotomatiki.' : 'This page refreshes automatically.'}</p>
+        </div>
+      ) : (
+        <div className="grid gap-4 sm:grid-cols-2">
+          {sessions.map((session) => {
+            const grouped = groupCandidatesByPosition(session);
+            const votedPositionKeys = session.votedPositionKeys || [];
+            const voteCount = session._count?.votes ?? 0;
+
+            return (
+              <button key={session.id} onClick={() => openSession(session)} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-emerald-700 hover:bg-slate-900">
+                <div className="mb-3 flex w-full items-center justify-between">
+                  {session.status === 'ACTIVE' ? (
+                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-900/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
+                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
+                    </span>
+                  ) : (
+                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-500">ENDED</span>
+                  )}
+                  {votedPositionKeys.length > 0 && <span className="flex items-center gap-1 text-xs text-emerald-400"><FaCheckCircle /> {votedPositionKeys.length}/{grouped.length}</span>}
+                </div>
+
+                <p className="mb-1 font-bold text-white">{session.title}</p>
+                <div className="mb-3 flex flex-wrap gap-2">
+                  {grouped.map((group) => (
+                    <span key={group.positionKey} className="rounded-full border border-sky-800 bg-sky-950/30 px-2 py-0.5 text-[11px] font-semibold text-sky-300">{group.positionTitle}</span>
+                  ))}
+                </div>
+                {session.description && <p className="mb-3 text-xs text-slate-500 line-clamp-2">{session.description}</p>}
+
+                <div className="mb-4 flex -space-x-2">
+                  {normalizeSessionCandidates(session).slice(0, 5).map((candidate, index) => (
+                    <div key={candidate.id} title={candidate.name} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-gradient-to-br ${AVATAR_COLORS[index % AVATAR_COLORS.length]} text-xs font-bold text-white`}>
+                      {candidate.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()}
+                    </div>
+                  ))}
+                  {normalizeSessionCandidates(session).length > 5 && <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-xs text-slate-400">+{normalizeSessionCandidates(session).length - 5}</div>}
+                </div>
+
+                <div className="mt-auto flex items-center justify-between text-xs text-slate-600">
+                  <span>{voteCount} {isSw ? 'kura' : 'votes'}</span>
+                  <span className="font-medium text-emerald-600">{session.status === 'ACTIVE' ? (isSw ? 'Piga Kura →' : 'Vote Now →') : (isSw ? 'Matokeo →' : 'Results →')}</span>
+                </div>
+              </button>
+            );
+          })}
+        </div>
+      )}
+    </div>
+  );
+}
