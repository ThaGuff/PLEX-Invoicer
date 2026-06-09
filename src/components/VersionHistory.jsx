import React, { useState, useEffect } from 'react';
import { History, RefreshCw, CheckCircle, GitBranch } from 'lucide-react';
import { api } from '../utils/api';

function fmt(n) { return '$' + Math.round(n||0).toLocaleString(); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
}

export default function VersionHistory({ invoiceId, onVersionCreated }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [summary, setSummary] = useState('');

  const load = async () => {
    if (!invoiceId) return;
    try {
      const h = await api.versioning.history(invoiceId);
      setHistory(h || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [invoiceId]);

  const createVersion = async () => {
    if (!summary.trim()) return;
    setCreating(true);
    try {
      const r = await api.versioning.createVersion(invoiceId, { change_summary: summary.trim() });
      setSummary('');
      setShowForm(false);
      await load();
      onVersionCreated?.(r.new_id);
    } catch (e) { alert('Failed: ' + e.message); }
    setCreating(false);
  };

  if (loading) return (
    <div className="flex items-center gap-2 py-2">
      <RefreshCw size={12} className="animate-spin text-ink-muted"/>
      <span className="text-xs text-ink-muted">Loading version history…</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
          Version history ({history.length})
        </p>
        <button onClick={() => setShowForm(v => !v)}
          className="text-xs font-semibold flex items-center gap-1 text-ink-muted hover:text-ink transition-colors">
          <GitBranch size={12}/> New version
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 border rounded-xl" style={{ borderColor:'#E5E8EB' }}>
          <p className="text-xs text-ink-muted mb-2">This creates an immutable copy of the current invoice. The old version is preserved.</p>
          <input value={summary} onChange={e => setSummary(e.target.value)}
            placeholder="What changed? e.g. Added consulting fee, removed line item"
            className="field text-sm mb-2"
            onKeyDown={e => { if (e.key === 'Enter') createVersion(); if (e.key === 'Escape') setShowForm(false); }}
            autoFocus />
          <div className="flex gap-2">
            <button onClick={createVersion} disabled={!summary.trim() || creating}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
              style={{ background:'#C8E20A' }}>
              {creating ? 'Creating…' : 'Create version'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-xs py-1.5 px-2">Cancel</button>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-xs text-ink-muted italic">No version history yet. Create a version before making changes to preserve the original.</p>
      ) : (
        <div className="space-y-2">
          {history.map((v, i) => (
            <div key={v.id} className={`flex items-start gap-3 p-3 rounded-xl border ${v.is_latest ? 'border-blue-200' : ''}`}
              style={{ borderColor: v.is_latest ? '#C8E20A40' : '#E5E8EB', background: v.is_latest ? '#C8E20A08' : 'transparent' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: v.is_latest ? '#C8E20A' : '#9ca3af' }}>
                {v.version}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-ink">{v.change_summary || `Version ${v.version}`}</p>
                  {v.is_latest && <span className="text-xs font-medium px-1.5 py-px rounded-full bg-blue-50 text-blue-600">current</span>}
                  <span className="text-xs font-medium capitalize px-1.5 py-px rounded-full"
                    style={{ background:'#F5F7F8', color:'#7A7E85' }}>{v.status}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-ink-muted">{fmt(v.amount_due)}</span>
                  <span className="text-xs text-ink-muted">{fmtDate(v.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
