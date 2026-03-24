import { useEffect, useState, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { FaPlay, FaStop, FaPlus, FaTrash, FaShieldAlt, FaCheckCircle, FaTimesCircle, FaVoteYea, FaUserCircle, FaTimes, FaSyncAlt } from 'react-icons/fa';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_BADGE = {
  PENDING: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800',
  ACTIVE:  'bg-emerald-900/50 text-emerald-300 border border-emerald-700 animate-pulse',
  ENDED:   'bg-slate-800 text-slate-400 border border-slate-700',
};

const AVATAR_COLORS = [
  'bg-violet-700', 'bg-sky-700', 'bg-emerald-700', 'bg-amber-700',
  'bg-rose-700',   'bg-cyan-700',  'bg-fuchsia-700', 'bg-teal-700',
];

function CandidateAvatar({ name, idx, size = 'lg' }) {
  const initials = name ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const bg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const sz = size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${bg} ${sz}`}>
      {initials}
    </div>
  );
}

function LiveBar({ count, total, color = 'bg-emerald-500' }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-slate-800">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs text-slate-400">{count} ({pct}%)</span>
    </div>
  );
}

export default function AdminVoting() {
  const { isSw } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveData, setLiveData] = useState({}); // sessionId → { tally, totalVotes, chainValid }
  const pollRef = useRef(null);

  // Create form state
  const [form, setForm] = useState({ title: '', position: '', description: '' });
  const [candidates, setCandidates] = useState([
    { key: Date.now(),     name: '', description: '' },
    { key: Date.now() + 1, name: '', description: '' },
  ]);

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

  // Poll live results for ACTIVE sessions every 8s
  useEffect(() => {
    const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
    if (activeSessions.length === 0) return;
    const poll = async () => {
      for (const s of activeSessions) {
        try {
          const { data } = await api.get(`/api/admin/voting/sessions/${s.id}/results`);
          setLiveData((prev) => ({ ...prev, [s.id]: data }));
        } catch { /* silent */ }
      }
    };
    poll(); // immediate
    pollRef.current = setInterval(poll, 8000);
    return () => clearInterval(pollRef.current);
  }, [sessions]);

  const resetForm = () => {
    setForm({ title: '', position: '', description: '' });
    setCandidates([
      { key: Date.now(),     name: '', description: '' },
      { key: Date.now() + 1, name: '', description: '' },
    ]);
  };

  const addCandidate = () => setCandidates((prev) => [...prev, { key: Date.now(), name: '', description: '' }]);
  const removeCandidate = (key) => setCandidates((prev) => prev.filter((c) => c.key !== key));
  const updateCandidate = (key, field, value) =>
    setCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error(isSw ? 'Kichwa kinahitajika' : 'Title required'); return; }
    if (!form.position.trim()) { toast.error(isSw ? 'Cheo kinahitajika' : 'Contested position required'); return; }
    const named = candidates.filter((c) => c.name.trim());
    if (named.length < 2) { toast.error(isSw ? 'Angalau wagombea 2 wanahitajika' : 'At least 2 candidates required'); return; }
    setSaving(true);
    try {
      await api.post('/api/admin/voting/sessions', {
        title: form.title.trim(),
        position: form.position.trim(),
        description: form.description.trim() || undefined,
        candidates: named.map((c, i) => ({ id: `c${i + 1}`, name: c.name.trim(), description: c.description.trim() || undefined })),
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
      background: '#0f172a', color: '#e2e8f0',
      title: isSw ? 'Anza Upigaji Kura?' : 'Start Voting Session?',
      text: session.title, icon: 'question', iconColor: '#34d399',
      showCancelButton: true, confirmButtonColor: '#059669', cancelButtonColor: '#374151',
      confirmButtonText: isSw ? 'Anza' : 'Start',
    });
    if (!confirmed.isConfirmed) return;
    try {
      await api.post(`/api/admin/voting/sessions/${session.id}/start`);
      toast.success(isSw ? 'Upigaji kura umeanza!' : 'Voting started!');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleEnd = async (session) => {
    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0',
      title: isSw ? 'Maliza Upigaji Kura?' : 'End Voting Session?',
      text: isSw ? 'Hatua hii haiwezi kutenduliwa.' : 'This cannot be undone.',
      icon: 'warning', iconColor: '#f59e0b',
      showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#374151',
      confirmButtonText: isSw ? 'Maliza' : 'End Session',
    });
    if (!confirmed.isConfirmed) return;
    try {
      await api.post(`/api/admin/voting/sessions/${session.id}/end`);
      toast.success(isSw ? 'Kikao kimemalizika' : 'Session ended');
      setLiveData((prev) => { const n = { ...prev }; delete n[session.id]; return n; });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (session) => {
    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0',
      title: isSw ? 'Futa Kikao?' : 'Delete Session?',
      text: session.title, icon: 'warning', iconColor: '#ef4444',
      showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#374151',
    });
    if (!confirmed.isConfirmed) return;
    try {
      await api.delete(`/api/admin/voting/sessions/${session.id}`);
      toast.success(isSw ? 'Imefutwa' : 'Deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleViewResults = async (session) => {
    try {
      const { data } = await api.get(`/api/admin/voting/sessions/${session.id}/results`);
      setResultModal(data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to load results'); }
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

  const BAR_COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

  if (loading) return (
    <div className="flex h-64 items-center justify-center text-slate-500">
      {isSw ? 'Inapakia...' : 'Loading...'}
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaVoteYea className="text-2xl text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-white">{isSw ? 'Mfumo wa Kura' : 'Voting System'}</h2>
            <p className="text-xs text-slate-500">{isSw ? 'Zilizo hifadhiwa kwa teknolojia ya blockchain' : 'Blockchain-secured staff votes'}</p>
          </div>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-900/60"
          >
            <FaPlus /> {isSw ? 'Kikao Kipya' : 'New Session'}
          </button>
        )}
      </div>

      {/* ── Inline Create Panel ─────────────────────────────────────── */}
      {creating && (
        <div className="rounded-2xl border border-emerald-800/50 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">{isSw ? 'Kikao Kipya cha Kura' : 'New Voting Session'}</h3>
            <button onClick={() => { setCreating(false); resetForm(); }} className="text-slate-500 hover:text-white"><FaTimes /></button>
          </div>

          {/* Title + Description */}
          <div className="mb-5 space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={isSw ? 'Kichwa cha Kikao *' : 'Session Title *'}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-600 focus:outline-none"
            />
            <input
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              placeholder={isSw ? 'Cheo Kinachogombewa * mfano: Mwenyekiti' : 'Contested Position * e.g. Chairperson'}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-600 focus:outline-none"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={isSw ? 'Maelezo (hiari)' : 'Description (optional)'}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Candidates */}
          <div className="mb-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              {isSw ? 'Wagombea' : 'Candidates'} <span className="text-slate-600">({candidates.length})</span>
            </p>
            <div className="space-y-2">
              {candidates.map((c, idx) => (
                <div key={c.key} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/60 p-3">
                  <CandidateAvatar name={c.name} idx={idx} size="sm" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <input
                      value={c.name}
                      onChange={(e) => updateCandidate(c.key, 'name', e.target.value)}
                      placeholder={isSw ? `Jina la Mgombea ${idx + 1} *` : `Candidate ${idx + 1} Name *`}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:border-emerald-600 focus:outline-none"
                    />
                    <input
                      value={c.description}
                      onChange={(e) => updateCandidate(c.key, 'description', e.target.value)}
                      placeholder={isSw ? 'Maelezo (hiari)' : 'Description (optional)'}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  {candidates.length > 2 && (
                    <button onClick={() => removeCandidate(c.key)} className="shrink-0 text-slate-600 hover:text-red-400">
                      <FaTimes className="text-sm" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addCandidate}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-700 px-4 py-2 text-xs text-slate-500 hover:border-emerald-700 hover:text-emerald-400"
            >
              <FaPlus /> {isSw ? 'Ongeza Mgombea' : 'Add Candidate'}
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? (isSw ? 'Inaunda...' : 'Creating...') : (isSw ? 'Unda Kikao' : 'Create Session')}
            </button>
            <button
              onClick={() => { setCreating(false); resetForm(); }}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-400 hover:text-white"
            >
              {isSw ? 'Ghairi' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* ── Sessions list ───────────────────────────────────────────── */}
      {sessions.length === 0 && !creating ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-10 text-center text-slate-500">
          {isSw ? 'Hakuna vikao vya kura bado.' : 'No voting sessions yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const cands = Array.isArray(s.candidates) ? s.candidates : [];
            const live = liveData[s.id];
            const liveTotal = live?.totalVotes ?? s._count?.votes ?? 0;

            return (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                {/* Card header */}
                <div className="p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{s.title}</h3>
                      {s.position && (
                        <p className="mt-1 inline-flex rounded-full border border-sky-800 bg-sky-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                          {isSw ? 'Cheo:' : 'Position:'} {s.position}
                        </p>
                      )}
                      {s.description && <p className="mt-0.5 text-xs text-slate-400">{s.description}</p>}
                      <p className="mt-1 text-xs text-slate-600">
                        {isSw ? 'Iliundwa na' : 'Created by'} {s.createdBy?.name} · {timeAgo(s.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_BADGE[s.status]}`}>
                        {s.status === 'ACTIVE' ? '● LIVE' : s.status}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        {liveTotal} {isSw ? 'kura' : 'votes'}
                      </span>
                      {s.status === 'ACTIVE' && (
                        <span title="Live — auto-refreshes every 8s" className="text-emerald-600">
                          <FaSyncAlt className="text-xs" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Candidates pills / live chart */}
                  {s.status === 'PENDING' && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {cands.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1">
                          <CandidateAvatar name={c.name} idx={i} size="sm" />
                          <span className="text-xs text-slate-300">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Live bar chart (ACTIVE or ENDED) */}
                  {(s.status === 'ACTIVE' || s.status === 'ENDED') && (
                    <div className="mb-4 space-y-2.5">
                      {(live?.tally ?? cands.map((c) => ({ candidate: c, count: 0 }))).map((t, i) => (
                        <div key={t.candidate.id} className="flex items-center gap-3">
                          <CandidateAvatar name={t.candidate.name} idx={i} size="sm" />
                          <div className="flex-1">
                            <div className="mb-0.5 flex justify-between">
                              <span className="text-xs font-medium text-white">
                                {i === 0 && liveTotal > 0 && s.status === 'ENDED' ? '🏆 ' : ''}{t.candidate.name}
                              </span>
                            </div>
                            <LiveBar count={t.count} total={liveTotal} color={BAR_COLORS[i % BAR_COLORS.length]} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {s.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStart(s)}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-900/60"
                        >
                          <FaPlay /> {isSw ? 'Anza' : 'Start Voting'}
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-black px-3 py-1.5 text-xs text-red-400 transition hover:bg-slate-900"
                        >
                          <FaTrash /> {isSw ? 'Futa' : 'Delete'}
                        </button>
                      </>
                    )}
                    {s.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleEnd(s)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-900/60"
                      >
                        <FaStop /> {isSw ? 'Maliza Kikao' : 'End Voting'}
                      </button>
                    )}
                    {s.status !== 'PENDING' && (
                      <button
                        onClick={() => handleViewResults(s)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700"
                      >
                        <FaShieldAlt /> {isSw ? 'Uthibitisho wa Blockchain' : 'Verify Blockchain'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Results / Chain Modal ──────────────────────────────────── */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setResultModal(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{resultModal.session?.title}</h3>
                {resultModal.session?.position && (
                  <p className="mt-1 text-xs font-semibold text-sky-300">{isSw ? 'Cheo:' : 'Position:'} {resultModal.session.position}</p>
                )}
              </div>
              <button onClick={() => setResultModal(null)} className="text-slate-500 hover:text-white"><FaTimes /></button>
            </div>

            {/* Chain integrity */}
            <div className={`mb-5 flex items-center gap-2 rounded-xl border p-3 ${
              resultModal.chainValid ? 'border-emerald-700 bg-emerald-900/20' : 'border-red-700 bg-red-900/20'
            }`}>
              {resultModal.chainValid
                ? <><FaCheckCircle className="text-emerald-400" /><span className="text-sm font-semibold text-emerald-300">{isSw ? 'Mnyororo wa Blockchain: SAHIHI ✓' : 'Blockchain Chain: VALID ✓'}</span></>
                : <><FaTimesCircle className="text-red-400" /><span className="text-sm font-semibold text-red-300">{isSw ? 'Mnyororo UMEVUNJWA — data imebadilishwa!' : 'Chain BROKEN — data tampered!'}</span></>
              }
              <span className="ml-auto text-xs text-slate-500">{resultModal.totalVotes} {isSw ? 'kura' : 'votes'}</span>
            </div>

            {/* Tally */}
            <div className="mb-5 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{isSw ? 'Matokeo' : 'Final Results'}</h4>
              {(resultModal.tally || []).map((t, i) => (
                <div key={t.candidate.id} className="flex items-center gap-3">
                  <CandidateAvatar name={t.candidate.name} idx={i} />
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-white">{i === 0 && resultModal.totalVotes > 0 ? '🏆 ' : ''}{t.candidate.name}</span>
                    </div>
                    <LiveBar count={t.count} total={resultModal.totalVotes} color={BAR_COLORS[i % BAR_COLORS.length]} />
                  </div>
                </div>
              ))}
            </div>

            {/* Blockchain blocks */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{isSw ? 'Vitalu vya Blockchain' : 'Blockchain Blocks'}</h4>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="rounded border border-slate-700 bg-slate-900 p-2 text-slate-400">
                  <span className="text-slate-600">#genesis </span>
                  <span className="truncate text-emerald-700">{resultModal.session?.genesisHash?.slice(0, 32)}…</span>
                </div>
                {(resultModal.blocks || []).map((b) => (
                  <div key={b.blockIndex} className="rounded border border-slate-800 bg-slate-900 p-2">
                    <div className="flex justify-between text-slate-500">
                      <span>#{b.blockIndex} · {b.candidateId}</span>
                      <span className="text-slate-600">{new Date(b.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-0.5 truncate text-emerald-800">{b.blockHash}</div>
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
