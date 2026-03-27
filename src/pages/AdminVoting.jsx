import { useEffect, useState, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { FaPlay, FaStop, FaPlus, FaTrash, FaShieldAlt, FaCheckCircle, FaTimesCircle, FaVoteYea, FaTimes, FaSyncAlt } from 'react-icons/fa';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_BADGE = {
  PENDING: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800',
  ACTIVE: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700 animate-pulse',
  ENDED: 'bg-slate-800 text-slate-400 border border-slate-700',
};

const AVATAR_COLORS = [
  'bg-violet-700', 'bg-sky-700', 'bg-emerald-700', 'bg-amber-700',
  'bg-rose-700', 'bg-cyan-700', 'bg-fuchsia-700', 'bg-teal-700',
];

function CandidateAvatar({ name, idx, size = 'lg' }) {
  const initials = name ? name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase() : '?';
  const bg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const sz = size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs';
  return <div className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${bg} ${sz}`}>{initials}</div>;
}

function LiveBar({ count, total, color = 'bg-emerald-500' }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-slate-800">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-xs text-slate-400">{count} ({pct}%)</span>
    </div>
  );
}

const createCandidate = () => ({ key: Date.now() + Math.random(), name: '', description: '' });
const createPosition = () => ({
  key: Date.now() + Math.random(),
  title: '',
  candidates: [createCandidate(), createCandidate()],
});

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

export default function AdminVoting() {
  const { isSw } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveData, setLiveData] = useState({});
  const pollRef = useRef(null);

  const [form, setForm] = useState({ title: '', description: '' });
  const [positions, setPositions] = useState([createPosition()]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/admin/voting/sessions');
      setSessions(data.sessions || []);
    } catch {
      toast.error(isSw ? 'Imeshindwa kupakia vikao' : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [isSw]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const activeSessions = sessions.filter((session) => session.status === 'ACTIVE');
    if (activeSessions.length === 0) return undefined;

    const poll = async () => {
      for (const session of activeSessions) {
        try {
          const { data } = await api.get(`/api/admin/voting/sessions/${session.id}/results`);
          setLiveData((prev) => ({ ...prev, [session.id]: data }));
        } catch {
          // ignore poll errors
        }
      }
    };

    poll();
    pollRef.current = setInterval(poll, 8000);
    return () => clearInterval(pollRef.current);
  }, [sessions]);

  const resetForm = () => {
    setForm({ title: '', description: '' });
    setPositions([createPosition()]);
  };

  const addPosition = () => setPositions((prev) => [...prev, createPosition()]);
  const removePosition = (positionKey) => setPositions((prev) => prev.filter((position) => position.key !== positionKey));
  const updatePositionTitle = (positionKey, value) => {
    setPositions((prev) => prev.map((position) => (position.key === positionKey ? { ...position, title: value } : position)));
  };
  const addCandidateToPosition = (positionKey) => {
    setPositions((prev) => prev.map((position) => (
      position.key === positionKey ? { ...position, candidates: [...position.candidates, createCandidate()] } : position
    )));
  };
  const removeCandidateFromPosition = (positionKey, candidateKey) => {
    setPositions((prev) => prev.map((position) => (
      position.key === positionKey
        ? { ...position, candidates: position.candidates.filter((candidate) => candidate.key !== candidateKey) }
        : position
    )));
  };
  const updateCandidateInPosition = (positionKey, candidateKey, field, value) => {
    setPositions((prev) => prev.map((position) => (
      position.key === positionKey
        ? {
            ...position,
            candidates: position.candidates.map((candidate) => (
              candidate.key === candidateKey ? { ...candidate, [field]: value } : candidate
            )),
          }
        : position
    )));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error(isSw ? 'Kichwa kinahitajika' : 'Title required');
      return;
    }

    const normalizedPositions = positions
      .map((position) => ({
        ...position,
        title: position.title.trim(),
        namedCandidates: position.candidates
          .map((candidate) => ({
            ...candidate,
            name: candidate.name.trim(),
            description: candidate.description.trim(),
          }))
          .filter((candidate) => candidate.name),
      }))
      .filter((position) => position.title || position.namedCandidates.length > 0);

    if (normalizedPositions.length === 0) {
      toast.error(isSw ? 'Ongeza angalau cheo kimoja' : 'Add at least one position');
      return;
    }

    for (const position of normalizedPositions) {
      if (!position.title) {
        toast.error(isSw ? 'Kila cheo kinahitaji jina' : 'Each position needs a title');
        return;
      }
      if (position.namedCandidates.length < 2) {
        toast.error(isSw ? `Cheo ${position.title} kinahitaji wagombea 2 au zaidi` : `Position ${position.title} needs at least 2 candidates`);
        return;
      }
    }

    const payloadCandidates = normalizedPositions.flatMap((position, positionIndex) => (
      position.namedCandidates.map((candidate, candidateIndex) => ({
        id: `p${positionIndex + 1}-c${candidateIndex + 1}`,
        name: candidate.name,
        description: candidate.description || undefined,
        positionKey: `position-${positionIndex + 1}`,
        positionTitle: position.title,
      }))
    ));

    setSaving(true);
    try {
      await api.post('/api/admin/voting/sessions', {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        candidates: payloadCandidates,
      });
      toast.success(isSw ? 'Kikao kimeundwa!' : 'Session created!');
      setCreating(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || (isSw ? 'Imeshindwa' : 'Failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (session) => {
    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0', title: isSw ? 'Anza Upigaji Kura?' : 'Start Voting Session?',
      text: session.title, icon: 'question', iconColor: '#34d399', showCancelButton: true,
      confirmButtonColor: '#059669', cancelButtonColor: '#374151', confirmButtonText: isSw ? 'Anza' : 'Start',
    });
    if (!confirmed.isConfirmed) return;
    try {
      await api.post(`/api/admin/voting/sessions/${session.id}/start`);
      toast.success(isSw ? 'Upigaji kura umeanza!' : 'Voting started!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleEnd = async (session) => {
    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0', title: isSw ? 'Maliza Upigaji Kura?' : 'End Voting Session?',
      text: isSw ? 'Hatua hii haiwezi kutenduliwa.' : 'This cannot be undone.', icon: 'warning', iconColor: '#f59e0b',
      showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#374151', confirmButtonText: isSw ? 'Maliza' : 'End Session',
    });
    if (!confirmed.isConfirmed) return;
    try {
      await api.post(`/api/admin/voting/sessions/${session.id}/end`);
      toast.success(isSw ? 'Kikao kimemalizika' : 'Session ended');
      setLiveData((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (session) => {
    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0', title: isSw ? 'Futa Kikao?' : 'Delete Session?',
      text: session.title, icon: 'warning', iconColor: '#ef4444', showCancelButton: true,
      confirmButtonColor: '#dc2626', cancelButtonColor: '#374151',
    });
    if (!confirmed.isConfirmed) return;
    try {
      await api.delete(`/api/admin/voting/sessions/${session.id}`);
      toast.success(isSw ? 'Imefutwa' : 'Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleViewResults = async (session) => {
    try {
      const { data } = await api.get(`/api/admin/voting/sessions/${session.id}/results`);
      setResultModal(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load results');
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return isSw ? 'Sasa hivi' : 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const BAR_COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">{isSw ? 'Inapakia...' : 'Loading...'}</div>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaVoteYea className="text-2xl text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-white">{isSw ? 'Mfumo wa Kura' : 'Voting System'}</h2>
            <p className="text-xs text-slate-500">{isSw ? 'Kikao kimoja kina nafasi nyingi za kugombea' : 'One election session can contain multiple positions'}</p>
          </div>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-900/60">
            <FaPlus /> {isSw ? 'Kikao Kipya' : 'New Session'}
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-2xl border border-emerald-800/50 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">{isSw ? 'Kikao Kipya chenye Nafasi Nyingi' : 'New Multi-Position Session'}</h3>
            <button onClick={() => { setCreating(false); resetForm(); }} className="text-slate-500 hover:text-white"><FaTimes /></button>
          </div>

          <div className="mb-6 space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={isSw ? 'Kichwa cha Kikao *' : 'Session Title *'}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-600 focus:outline-none"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={isSw ? 'Maelezo ya jumla (hiari)' : 'General description (optional)'}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-4">
            {positions.map((position, positionIndex) => (
              <div key={position.key} className="rounded-2xl border border-slate-800 bg-slate-800/50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <input
                    value={position.title}
                    onChange={(e) => updatePositionTitle(position.key, e.target.value)}
                    placeholder={isSw ? `Cheo ${positionIndex + 1} * mfano: Mwenyekiti` : `Position ${positionIndex + 1} * e.g. Chairperson`}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-600 focus:outline-none"
                  />
                  {positions.length > 1 && (
                    <button onClick={() => removePosition(position.key)} className="shrink-0 text-slate-500 hover:text-red-400"><FaTimes /></button>
                  )}
                </div>

                <div className="space-y-2">
                  {position.candidates.map((candidate, candidateIndex) => (
                    <div key={candidate.key} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <CandidateAvatar name={candidate.name} idx={candidateIndex} size="sm" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <input
                          value={candidate.name}
                          onChange={(e) => updateCandidateInPosition(position.key, candidate.key, 'name', e.target.value)}
                          placeholder={isSw ? `Jina la Mgombea ${candidateIndex + 1} *` : `Candidate ${candidateIndex + 1} Name *`}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:border-emerald-600 focus:outline-none"
                        />
                        <input
                          value={candidate.description}
                          onChange={(e) => updateCandidateInPosition(position.key, candidate.key, 'description', e.target.value)}
                          placeholder={isSw ? 'Maelezo (hiari)' : 'Description (optional)'}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      {position.candidates.length > 2 && (
                        <button onClick={() => removeCandidateFromPosition(position.key, candidate.key)} className="shrink-0 text-slate-600 hover:text-red-400"><FaTimes className="text-sm" /></button>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={() => addCandidateToPosition(position.key)} className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-700 px-4 py-2 text-xs text-slate-500 hover:border-emerald-700 hover:text-emerald-400">
                  <FaPlus /> {isSw ? 'Ongeza Mgombea' : 'Add Candidate'}
                </button>
              </div>
            ))}
          </div>

          <button onClick={addPosition} className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-emerald-700 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-900/20">
            <FaPlus /> {isSw ? 'Ongeza Cheo Kingine' : 'Add Another Position'}
          </button>

          <div className="flex gap-3 pt-6">
            <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50">
              {saving ? (isSw ? 'Inaunda...' : 'Creating...') : (isSw ? 'Unda Kikao' : 'Create Session')}
            </button>
            <button onClick={() => { setCreating(false); resetForm(); }} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-400 hover:text-white">
              {isSw ? 'Ghairi' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {sessions.length === 0 && !creating ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-10 text-center text-slate-500">{isSw ? 'Hakuna vikao vya kura bado.' : 'No voting sessions yet.'}</div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const live = liveData[session.id];
            const liveTotal = live?.totalVotes ?? session._count?.votes ?? 0;
            const grouped = groupCandidatesByPosition(session, live?.tallyByPosition);

            return (
              <div key={session.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                <div className="p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{session.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {grouped.map((group) => (
                          <span key={group.positionKey} className="rounded-full border border-sky-800 bg-sky-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">{group.positionTitle}</span>
                        ))}
                      </div>
                      {session.description && <p className="mt-2 text-xs text-slate-400">{session.description}</p>}
                      <p className="mt-1 text-xs text-slate-600">{isSw ? 'Iliundwa na' : 'Created by'} {session.createdBy?.name} · {timeAgo(session.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_BADGE[session.status]}`}>{session.status === 'ACTIVE' ? '● LIVE' : session.status}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{liveTotal} {isSw ? 'kura' : 'votes'}</span>
                      {session.status === 'ACTIVE' && <span title="Live — auto-refreshes every 8s" className="text-emerald-600"><FaSyncAlt className="text-xs" /></span>}
                    </div>
                  </div>

                  <div className="mb-4 space-y-4">
                    {grouped.map((group, groupIndex) => (
                      <div key={group.positionKey} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-300">{group.positionTitle}</p>
                        {session.status === 'PENDING' ? (
                          <div className="flex flex-wrap gap-2">
                            {group.items.map((entry, itemIndex) => (
                              <div key={entry.candidate.id} className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1">
                                <CandidateAvatar name={entry.candidate.name} idx={groupIndex + itemIndex} size="sm" />
                                <span className="text-xs text-slate-300">{entry.candidate.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {group.items.map((entry, itemIndex) => (
                              <div key={entry.candidate.id} className="flex items-center gap-3">
                                <CandidateAvatar name={entry.candidate.name} idx={groupIndex + itemIndex} size="sm" />
                                <div className="flex-1">
                                  <div className="mb-0.5 flex justify-between"><span className="text-xs font-medium text-white">{entry.candidate.name}</span></div>
                                  <LiveBar count={entry.count} total={liveTotal} color={BAR_COLORS[(groupIndex + itemIndex) % BAR_COLORS.length]} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {session.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleStart(session)} className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-900/60"><FaPlay /> {isSw ? 'Anza' : 'Start Voting'}</button>
                        <button onClick={() => handleDelete(session)} className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-black px-3 py-1.5 text-xs text-red-400 transition hover:bg-slate-900"><FaTrash /> {isSw ? 'Futa' : 'Delete'}</button>
                      </>
                    )}
                    {session.status === 'ACTIVE' && <button onClick={() => handleEnd(session)} className="flex items-center gap-1.5 rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-900/60"><FaStop /> {isSw ? 'Maliza Kikao' : 'End Voting'}</button>}
                    {session.status === 'ENDED' && <button onClick={() => handleDelete(session)} className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-black px-3 py-1.5 text-xs text-red-400 transition hover:bg-slate-900"><FaTrash /> {isSw ? 'Futa' : 'Delete'}</button>}
                    {session.status !== 'PENDING' && <button onClick={() => handleViewResults(session)} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700"><FaShieldAlt /> {isSw ? 'Uthibitisho wa Blockchain' : 'Verify Blockchain'}</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setResultModal(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{resultModal.session?.title}</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  {groupCandidatesByPosition(resultModal.session, resultModal.tallyByPosition).map((group) => (
                    <span key={group.positionKey} className="text-xs font-semibold text-sky-300">{group.positionTitle}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setResultModal(null)} className="text-slate-500 hover:text-white"><FaTimes /></button>
            </div>

            <div className={`mb-5 flex items-center gap-2 rounded-xl border p-3 ${resultModal.chainValid ? 'border-emerald-700 bg-emerald-900/20' : 'border-red-700 bg-red-900/20'}`}>
              {resultModal.chainValid
                ? <><FaCheckCircle className="text-emerald-400" /><span className="text-sm font-semibold text-emerald-300">{isSw ? 'Mnyororo wa Blockchain: SAHIHI ✓' : 'Blockchain Chain: VALID ✓'}</span></>
                : <><FaTimesCircle className="text-red-400" /><span className="text-sm font-semibold text-red-300">{isSw ? 'Mnyororo UMEVUNJWA — data imebadilishwa!' : 'Chain BROKEN — data tampered!'}</span></>
              }
              <span className="ml-auto text-xs text-slate-500">{resultModal.totalVotes} {isSw ? 'kura' : 'votes'}</span>
            </div>

            <div className="mb-5 space-y-5">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{isSw ? 'Matokeo' : 'Final Results'}</h4>
              {groupCandidatesByPosition(resultModal.session, resultModal.tallyByPosition).map((group, groupIndex) => (
                <div key={group.positionKey} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <h5 className="mb-4 text-sm font-bold text-sky-300">{group.positionTitle}</h5>
                  <div className="space-y-4">
                    {group.items.map((entry, itemIndex) => (
                      <div key={entry.candidate.id} className="flex items-center gap-3">
                        <CandidateAvatar name={entry.candidate.name} idx={groupIndex + itemIndex} />
                        <div className="flex-1">
                          <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-white">{itemIndex === 0 && entry.count > 0 ? '🏆 ' : ''}{entry.candidate.name}</span></div>
                          <LiveBar count={entry.count} total={resultModal.totalVotes} color={BAR_COLORS[(groupIndex + itemIndex) % BAR_COLORS.length]} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{isSw ? 'Vitalu vya Blockchain' : 'Blockchain Blocks'}</h4>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="rounded border border-slate-700 bg-slate-900 p-2 text-slate-400"><span className="text-slate-600">#genesis </span><span className="truncate text-emerald-700">{resultModal.session?.genesisHash?.slice(0, 32)}…</span></div>
                {(resultModal.blocks || []).map((block) => (
                  <div key={block.blockIndex} className="rounded border border-slate-800 bg-slate-900 p-2">
                    <div className="flex justify-between text-slate-500"><span>#{block.blockIndex} · {block.positionKey} · {block.candidateId}</span><span className="text-slate-600">{new Date(block.createdAt).toLocaleTimeString()}</span></div>
                    <div className="mt-0.5 truncate text-emerald-800">{block.blockHash}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
