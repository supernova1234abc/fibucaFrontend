import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { FaPlay, FaStop, FaPlus, FaTrash, FaShieldAlt, FaCheckCircle, FaTimesCircle, FaVoteYea } from 'react-icons/fa';
import { api } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_BADGE = {
  PENDING: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800',
  ACTIVE:  'bg-emerald-900/50 text-emerald-300 border border-emerald-700',
  ENDED:   'bg-slate-800 text-slate-400 border border-slate-700',
};

export default function AdminVoting() {
  const { isSw } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState(null); // { session, tally, chainValid, totalVotes, blocks }

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

  const handleCreate = async () => {
    // Step 1: title + description
    const step1 = await Swal.fire({
      background: '#0f172a',
      color: '#e2e8f0',
      title: isSw ? 'Kikao Kipya cha Kura' : 'New Voting Session',
      html: `
        <input id="v-title" class="swal2-input" placeholder="${isSw ? 'Kichwa cha Kikao' : 'Session Title'}" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155">
        <textarea id="v-desc" class="swal2-textarea" placeholder="${isSw ? 'Maelezo (hiari)' : 'Description (optional)'}" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;height:80px"></textarea>
      `,
      confirmButtonText: isSw ? 'Endelea' : 'Next',
      confirmButtonColor: '#059669',
      showCancelButton: true,
      cancelButtonColor: '#374151',
      preConfirm: () => {
        const title = document.getElementById('v-title').value.trim();
        if (!title) { Swal.showValidationMessage(isSw ? 'Kichwa kinahitajika' : 'Title required'); return false; }
        return { title, description: document.getElementById('v-desc').value.trim() };
      },
    });
    if (!step1.isConfirmed) return;

    // Step 2: candidates (dynamic list)
    const candidateRows = [
      { id: 'c1', name: '' },
      { id: 'c2', name: '' },
    ];

    const buildCandRows = (rows) =>
      rows.map((c, i) => `
        <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
          <input id="cand-name-${i}" value="${c.name}" class="swal2-input" placeholder="${isSw ? `Mgombea ${i + 1}` : `Candidate ${i + 1}`}" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;margin:0;flex:1">
        </div>
      `).join('');

    const step2 = await Swal.fire({
      background: '#0f172a',
      color: '#e2e8f0',
      title: isSw ? 'Wagombea' : 'Candidates',
      html: `
        <div id="cand-list">${buildCandRows(candidateRows)}</div>
        <button id="add-cand" style="margin-top:8px;padding:6px 14px;background:#1e293b;color:#34d399;border:1px solid #065f46;border-radius:6px;cursor:pointer">+ ${isSw ? 'Ongeza Mgombea' : 'Add Candidate'}</button>
      `,
      confirmButtonText: isSw ? 'Unda Kikao' : 'Create Session',
      confirmButtonColor: '#059669',
      showCancelButton: true,
      cancelButtonColor: '#374151',
      didOpen: () => {
        document.getElementById('add-cand').addEventListener('click', () => {
          const list = document.getElementById('cand-list');
          const idx = list.children.length;
          const div = document.createElement('div');
          div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center';
          div.innerHTML = `<input id="cand-name-${idx}" class="swal2-input" placeholder="${isSw ? `Mgombea ${idx + 1}` : `Candidate ${idx + 1}`}" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;margin:0;flex:1">`;
          list.appendChild(div);
        });
      },
      preConfirm: () => {
        const list = document.getElementById('cand-list');
        const names = Array.from(list.querySelectorAll('input')).map((el) => el.value.trim()).filter(Boolean);
        if (names.length < 2) { Swal.showValidationMessage(isSw ? 'Angalau wagombea 2 wanahitajika' : 'At least 2 candidates required'); return false; }
        return names.map((name, i) => ({ id: `c${i + 1}`, name }));
      },
    });
    if (!step2.isConfirmed) return;

    try {
      await api.post('/api/admin/voting/sessions', {
        title: step1.value.title,
        description: step1.value.description || undefined,
        candidates: step2.value,
      });
      toast.success(isSw ? 'Kikao kimeundwa!' : 'Session created!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || (isSw ? 'Imeshindwa' : 'Failed'));
    }
  };

  const handleStart = async (session) => {
    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0',
      title: isSw ? 'Anza Upigaji Kura?' : 'Start Voting Session?',
      text: session.title,
      icon: 'question', iconColor: '#34d399',
      showCancelButton: true, confirmButtonColor: '#059669', cancelButtonColor: '#374151',
      confirmButtonText: isSw ? 'Anza' : 'Start',
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
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (session) => {
    const confirmed = await Swal.fire({
      background: '#0f172a', color: '#e2e8f0',
      title: isSw ? 'Futa Kikao?' : 'Delete Session?',
      text: session.title,
      icon: 'warning', iconColor: '#ef4444',
      showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#374151',
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaVoteYea className="text-2xl text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-white">{isSw ? 'Mfumo wa Kura' : 'Voting System'}</h2>
            <p className="text-xs text-slate-500">{isSw ? 'Zilizo hifadhiwa kwa teknolojia ya blockchain' : 'Blockchain-secured staff votes'}</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-900/60"
        >
          <FaPlus /> {isSw ? 'Kikao Kipya' : 'New Session'}
        </button>
      </div>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-10 text-center text-slate-500">
          {isSw ? 'Hakuna vikao vya kura bado.' : 'No voting sessions yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const cands = Array.isArray(s.candidates) ? s.candidates : [];
            return (
              <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{s.title}</h3>
                    {s.description && <p className="mt-0.5 text-xs text-slate-400">{s.description}</p>}
                    <p className="mt-1 text-xs text-slate-600">
                      {isSw ? 'Iliundwa na' : 'Created by'} {s.createdBy?.name} · {timeAgo(s.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_BADGE[s.status]}`}>
                      {s.status}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {s._count?.votes ?? 0} {isSw ? 'kura' : 'votes'}
                    </span>
                  </div>
                </div>

                {/* Candidates pill list */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {cands.map((c) => (
                    <span key={c.id} className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {c.name}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {s.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleStart(s)}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-900/60"
                      >
                        <FaPlay /> {isSw ? 'Anza' : 'Start'}
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
                      <FaStop /> {isSw ? 'Maliza Kikao' : 'End Session'}
                    </button>
                  )}
                  {s.status !== 'PENDING' && (
                    <button
                      onClick={() => handleViewResults(s)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700"
                    >
                      <FaShieldAlt /> {isSw ? 'Matokeo & Uthibitisho' : 'Results & Verify Chain'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setResultModal(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{resultModal.session?.title}</h3>
              <button onClick={() => setResultModal(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {/* Chain integrity badge */}
            <div className={`mb-5 flex items-center gap-2 rounded-xl border p-3 ${resultModal.chainValid ? 'border-emerald-700 bg-emerald-900/20' : 'border-red-700 bg-red-900/20'}`}>
              {resultModal.chainValid
                ? <><FaCheckCircle className="text-emerald-400" /><span className="text-sm font-semibold text-emerald-300">{isSw ? 'Mnyororo wa Blockchain: SAHIHI ✓' : 'Blockchain Chain: VALID ✓'}</span></>
                : <><FaTimesCircle className="text-red-400" /><span className="text-sm font-semibold text-red-300">{isSw ? 'Mnyororo UMEVUNJWA — data imebadilishwa!' : 'Chain BROKEN — data tampered!'}</span></>
              }
              <span className="ml-auto text-xs text-slate-500">{resultModal.totalVotes} {isSw ? 'kura' : 'votes'}</span>
            </div>

            {/* Tally */}
            <div className="mb-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{isSw ? 'Matokeo' : 'Results'}</h4>
              {(resultModal.tally || []).map((t, i) => {
                const pct = resultModal.totalVotes > 0 ? Math.round((t.count / resultModal.totalVotes) * 100) : 0;
                return (
                  <div key={t.candidate.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-white font-medium">{i === 0 && resultModal.totalVotes > 0 ? '🏆 ' : ''}{t.candidate.name}</span>
                      <span className="text-slate-400">{t.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
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
