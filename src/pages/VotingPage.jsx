import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { FaVoteYea, FaCheckCircle, FaLock, FaClock } from 'react-icons/fa';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_COLOR = {
  ACTIVE: 'text-emerald-400',
  ENDED:  'text-slate-400',
};
const STATUS_LABEL = {
  ACTIVE: { en: 'Voting Open', sw: 'Kura Zinakubaliwa' },
  ENDED:  { en: 'Ended', sw: 'Imekwisha' },
};

export default function VotingPage() {
  const { isSw } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // sessionId
  const [sessionDetail, setSessionDetail] = useState({}); // id → detail data
  const [voting, setVoting] = useState(null); // sessionId being submitted

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/voting/sessions');
      setSessions(data.sessions || []);
    } catch {
      toast.error(isSw ? 'Imeshindwa kupakia kura' : 'Failed to load voting sessions');
    } finally {
      setLoading(false);
    }
  }, [isSw]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/api/voting/sessions/${id}`);
      setSessionDetail((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }, []);

  const handleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!sessionDetail[id]) await loadDetail(id);
  };

  const handleVote = async (session, candidateId) => {
    const candidate = (Array.isArray(session.candidates) ? session.candidates : []).find((c) => c.id === candidateId);
    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0',
      title: isSw ? 'Thibitisha Kura Yako' : 'Confirm Your Vote',
      html: `<p style="color:#94a3b8;margin-top:8px">${isSw ? 'Unachagua' : 'You are voting for'}:</p>
             <p style="color:#34d399;font-size:1.2rem;font-weight:700;margin-top:6px">${candidate?.name}</p>
             <p style="color:#475569;font-size:0.75rem;margin-top:8px">${isSw ? 'Kura haiwezi kubadilishwa baada ya kutumwa.' : 'Your vote cannot be changed after submission.'}</p>`,
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#374151',
      confirmButtonText: isSw ? 'Tuma Kura' : 'Submit Vote',
    });
    if (!confirmed.isConfirmed) return;

    setVoting(session.id);
    try {
      const { data } = await api.post(`/api/voting/sessions/${session.id}/vote`, { candidateId });
      toast.success(isSw ? 'Kura yako imetumwa!' : 'Vote submitted!');
      // Update sessions list (mark hasVoted)
      setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, hasVoted: true, _count: { votes: (s._count?.votes || 0) + 1 } } : s));
      // Update detail
      setSessionDetail((prev) => ({
        ...prev,
        [session.id]: { ...prev[session.id], hasVoted: true, receiptHash: data.blockHash },
      }));
      // Show receipt
      await Swal.fire({
        background: '#0f172a', color: '#e2e8f0',
        title: isSw ? 'Kura Imetumwa ✓' : 'Vote Recorded ✓',
        html: `
          <p style="color:#64748b;font-size:0.8rem;margin-bottom:8px">${isSw ? 'Nambari ya Uthibitisho wa Blockchain' : 'Blockchain Receipt Hash'}</p>
          <code style="display:block;background:#1e293b;color:#34d399;padding:10px;border-radius:8px;font-size:0.7rem;word-break:break-all;border:1px solid #065f46">${data.blockHash}</code>
          <p style="color:#475569;font-size:0.7rem;margin-top:8px">${isSw ? 'Hifadhi nambari hii kama ushahidi wa kura yako.' : 'Save this hash as proof of your vote.'}</p>
        `,
        icon: 'success',
        iconColor: '#34d399',
        confirmButtonColor: '#059669',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit vote');
    } finally {
      setVoting(null);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return isSw ? 'Sasa hivi' : 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center text-slate-500">
      {isSw ? 'Inapakia...' : 'Loading...'}
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FaVoteYea className="text-2xl text-emerald-400" />
        <div>
          <h2 className="text-xl font-bold text-white">{isSw ? 'Upigaji Kura' : 'Staff Voting'}</h2>
          <p className="text-xs text-slate-500">{isSw ? 'Kura zako zinalindwa na teknolojia ya blockchain' : 'Your votes are secured by blockchain technology'}</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <FaVoteYea className="mx-auto mb-3 text-4xl text-slate-700" />
          <p className="text-slate-500">{isSw ? 'Hakuna kura za sasa hivi.' : 'No active voting sessions at the moment.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const detail = sessionDetail[s.id];
            const isOpen = expanded === s.id;
            const cands = Array.isArray(s.candidates) ? s.candidates : [];
            const hasVoted = s.hasVoted || detail?.hasVoted;

            return (
              <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                {/* Summary row (clickable) */}
                <button
                  onClick={() => handleExpand(s.id)}
                  className="flex w-full items-center justify-between gap-3 p-5 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{s.title}</p>
                    {s.description && <p className="mt-0.5 truncate text-xs text-slate-500">{s.description}</p>}
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                      <span className={`font-medium ${STATUS_COLOR[s.status]}`}>
                        {s.status === 'ACTIVE' ? <><FaClock className="inline mb-0.5 mr-0.5" />{STATUS_LABEL.ACTIVE[isSw ? 'sw' : 'en']}</> : STATUS_LABEL.ENDED[isSw ? 'sw' : 'en']}
                      </span>
                      <span>{s._count?.votes ?? 0} {isSw ? 'kura' : 'votes'}</span>
                      <span>{timeAgo(s.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {hasVoted && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-400">
                        <FaCheckCircle className="text-xs" /> {isSw ? 'Umepiga Kura' : 'Voted'}
                      </span>
                    )}
                    <span className="text-slate-600">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-800 p-5">
                    {!detail ? (
                      <p className="text-center text-sm text-slate-500">{isSw ? 'Inapakia...' : 'Loading...'}</p>
                    ) : (
                      <>
                        {/* Already voted — show receipt */}
                        {(hasVoted || detail.hasVoted) && detail.receiptHash && (
                          <div className="mb-5 rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4">
                            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                              <FaCheckCircle /> {isSw ? 'Kura Yako Imethibitishwa' : 'Your Vote is Confirmed'}
                            </div>
                            <p className="mb-2 text-xs text-slate-500">{isSw ? 'Nambari ya uthibitisho (blockchain receipt):' : 'Blockchain receipt hash:'}</p>
                            <code className="block break-all rounded border border-emerald-900/50 bg-slate-950 p-2 text-xs text-emerald-600">
                              {detail.receiptHash}
                            </code>
                          </div>
                        )}

                        {/* ACTIVE + not voted — show vote buttons */}
                        {s.status === 'ACTIVE' && !hasVoted && !detail.hasVoted && (
                          <div className="mb-5">
                            <p className="mb-3 text-sm font-semibold text-white">{isSw ? 'Chagua Mgombea Wako:' : 'Choose Your Candidate:'}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {cands.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => handleVote(s, c.id)}
                                  disabled={voting === s.id}
                                  className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-800 p-4 text-left transition hover:border-emerald-600 hover:bg-slate-700 disabled:opacity-50"
                                >
                                  <span className="font-semibold text-white">{c.name}</span>
                                  {c.description && <span className="mt-1 text-xs text-slate-400">{c.description}</span>}
                                  <span className="mt-2 text-xs text-emerald-500">{isSw ? '→ Piga Kura' : '→ Vote'}</span>
                                </button>
                              ))}
                            </div>
                            <p className="mt-3 flex items-center gap-1 text-xs text-slate-600">
                              <FaLock /> {isSw ? 'Kura yako italindwa na hash ya blockchain na haiwezi kubadilishwa.' : 'Your vote is sealed with a blockchain hash and cannot be changed.'}
                            </p>
                          </div>
                        )}

                        {/* ACTIVE + already voted */}
                        {s.status === 'ACTIVE' && (hasVoted || detail.hasVoted) && !detail.receiptHash && (
                          <div className="mb-4 rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4 text-center text-sm text-emerald-400">
                            <FaCheckCircle className="mx-auto mb-2 text-xl" />
                            {isSw ? 'Umeshapiga kura katika kikao hiki.' : 'You have already voted in this session.'}
                          </div>
                        )}

                        {/* Results (ENDED) */}
                        {s.status === 'ENDED' && detail.tally && (
                          <div>
                            <p className="mb-3 text-sm font-semibold text-slate-300">{isSw ? 'Matokeo ya Mwisho:' : 'Final Results:'}</p>
                            <div className="space-y-3">
                              {detail.tally.map((t, i) => {
                                const total = detail.session?._count?.votes || s._count?.votes || 0;
                                const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                                return (
                                  <div key={t.candidate.id}>
                                    <div className="mb-1 flex justify-between text-sm">
                                      <span className="font-medium text-white">{i === 0 && total > 0 ? '🏆 ' : ''}{t.candidate.name}</span>
                                      <span className="text-slate-400">{t.count} ({pct}%)</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-800">
                                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
