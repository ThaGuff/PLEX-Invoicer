/**
 * TimeTrackingPage — Project time tracking with live timer, reports, and invoice conversion
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '../context/AccountContext';
import { useNavigate } from 'react-router-dom';
import { Play, Square, Plus, Trash2, Clock, DollarSign, FileText, CheckCircle, X, ChevronDown } from 'lucide-react';

function pad(n) { return String(n).padStart(2,'0'); }
function formatDuration(mins) {
  if (!mins) return '0:00';
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}:${pad(m)}`;
}
function fmt$(n) { return n > 0 ? '$' + parseFloat(n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$0.00'; }

export default function TimeTrackingPage() {
  const navigate = useNavigate();
  const { account } = useAccount();
  const accent = account?.primary_color || '#2563EB';
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [entries, setEntries]     = useState([]);
  const [projects, setProjects]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerDisplay, setTimerDisplay] = useState('0:00:00');
  const timerRef = useRef(null);

  const [form, setForm] = useState({
    project_name: '', description: '', duration_minutes: '', hourly_rate: '', is_billable: true, assigned_to: ''
  });
  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const [entriesR, projectsR, summaryR] = await Promise.all([
        fetch(`/api/time?account_id=${account.id}&limit=100`, { headers: h }).then(r => r.json()),
        fetch(`/api/time/projects?account_id=${account.id}`, { headers: h }).then(r => r.json()),
        fetch(`/api/time/summary?account_id=${account.id}`, { headers: h }).then(r => r.json()),
      ]);
      setEntries(Array.isArray(entriesR) ? entriesR : []);
      setProjects(Array.isArray(projectsR) ? projectsR : []);
      setSummary(summaryR);
      // Check for running timer
      const running = (Array.isArray(entriesR) ? entriesR : []).find(e => e.timer_running);
      if (running) setActiveTimer(running.id);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  // Live timer tick
  useEffect(() => {
    if (!activeTimer) { clearInterval(timerRef.current); return; }
    const running = entries.find(e => e.id === activeTimer);
    if (!running?.start_time) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(running.start_time)) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setTimerDisplay(`${h}:${pad(m)}:${pad(s)}`);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeTimer, entries]);

  const handleStartNew = async () => {
    if (!form.project_name.trim()) return;
    try {
      const r = await fetch('/api/time', {
        method: 'POST', headers: h,
        body: JSON.stringify({ account_id: account.id, ...form, is_billable: form.is_billable ? 1 : 0 })
      });
      const entry = await r.json();
      // Start timer immediately
      const sr = await fetch(`/api/time/${entry.id}/start`, { method: 'POST', headers: h });
      const started = await sr.json();
      setActiveTimer(started.id);
      setShowNew(false);
      setForm({ project_name: '', description: '', duration_minutes: '', hourly_rate: '', is_billable: true, assigned_to: '' });
      load();
    } catch(e) { console.error(e); }
  };

  const handleLogManual = async () => {
    if (!form.project_name.trim() || !form.duration_minutes) return;
    await fetch('/api/time', {
      method: 'POST', headers: h,
      body: JSON.stringify({ account_id: account.id, ...form, status: 'logged', is_billable: form.is_billable ? 1 : 0 })
    });
    setShowNew(false);
    setForm({ project_name: '', description: '', duration_minutes: '', hourly_rate: '', is_billable: true, assigned_to: '' });
    load();
  };

  const handleStop = async (id) => {
    await fetch(`/api/time/${id}/stop`, { method: 'POST', headers: h });
    setActiveTimer(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this time entry?')) return;
    await fetch(`/api/time/${id}`, { method: 'DELETE', headers: h });
    load();
  };

  const [showConvertModal, setShowConvertModal] = React.useState(false);
  const [convertClient, setConvertClient] = React.useState('');
  const [convertEmail, setConvertEmail] = React.useState('');
  const [converting, setConverting] = React.useState(false);
  const [convertSuccess, setConvertSuccess] = React.useState(null);

  const handleConvertToInvoice = async () => {
    const ids = billable.map(e => e.id);
    if (!ids.length) return;
    setConverting(true);
    try {
      const r = await fetch('/api/time/convert', {
        method: 'POST', headers: h,
        body: JSON.stringify({
          account_id: account.id,
          entry_ids: ids,
          client_name: convertClient,
          client_email: convertEmail,
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setConvertSuccess(d);
      setShowConvertModal(false);
      setConvertClient('');
      setConvertEmail('');
      load();
    } catch(e) { alert('Failed: ' + e.message); }
    setConverting(false);
  };

  const billable = entries.filter(e => e.is_billable && !e.is_invoiced);
  const totalUnbilled = billable.reduce((s, e) => s + parseFloat(e.billed_amount || 0), 0);

  return (
    <div style={{ padding: '0 28px 32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>Time Tracking</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Log hours · Track billable time · Convert to invoices</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTimer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: '#DC262610', border: '1.5px solid #DC262630' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#DC2626', fontVariantNumeric: 'tabular-nums' }}>{timerDisplay}</span>
              <button onClick={() => handleStop(activeTimer)}
                style={{ padding: '4px 10px', borderRadius: 7, background: '#DC2626', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Square size={10} /> Stop
              </button>
            </div>
          )}
          <button onClick={() => setShowNew(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: accent, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', boxShadow: `0 4px 14px ${accent}40` }}>
            <Plus size={15} /> Log Time
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Hours', value: `${summary.total_hours}h`, icon: <Clock size={14} />, color: accent },
            { label: 'Total Entries', value: summary.total_entries, icon: <FileText size={14} />, color: '#7C3AED' },
            { label: 'Billed', value: fmt$(summary.total_billed), icon: <CheckCircle size={14} />, color: '#059669' },
            { label: 'Unbilled', value: fmt$(summary.unbilled_amount), icon: <DollarSign size={14} />, color: summary.unbilled_amount > 0 ? '#D97706' : '#6B7280' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, color }}>
                {icon}
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Time entries table */}
      <div style={{ borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Time Entries</span>
          {totalUnbilled > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>{fmt$(totalUnbilled)} unbilled</span>
              <button onClick={() => setShowConvertModal(true)}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                Convert to Invoice
              </button>
            </div>
          )}
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Clock size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>No time entries yet</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Click "Log Time" to start tracking billable hours</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                  {['Project', 'Description', 'Date', 'Duration', 'Rate', 'Amount', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: accent }}>{e.project_name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: 200 }}>{e.description || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>
                      {e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {e.timer_running
                        ? <span style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626' }} />
                            {timerDisplay}
                          </span>
                        : formatDuration(e.duration_minutes) + 'h'
                      }
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{e.hourly_rate > 0 ? `$${e.hourly_rate}/hr` : '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: parseFloat(e.billed_amount) > 0 ? '#059669' : 'var(--text-muted)' }}>
                      {parseFloat(e.billed_amount) > 0 ? fmt$(e.billed_amount) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 700,
                        background: e.is_invoiced ? '#05966920' : e.timer_running ? '#DC262620' : e.is_billable ? '#D9770620' : '#6B728020',
                        color: e.is_invoiced ? '#059669' : e.timer_running ? '#DC2626' : e.is_billable ? '#D97706' : '#6B7280'
                      }}>
                        {e.is_invoiced ? 'Invoiced' : e.timer_running ? '● Running' : e.is_billable ? 'Billable' : 'Non-billable'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Entry Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 32px 80px rgba(11,18,32,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Log Time</h3>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { k: 'project_name', label: 'Project / Job *', ph: 'HVAC Installation – Johnson', type: 'text' },
                { k: 'description', label: 'Description', ph: 'Installed AC unit, tested refrigerant', type: 'text' },
                { k: 'duration_minutes', label: 'Duration (minutes) — leave blank to use live timer', ph: '90', type: 'number' },
                { k: 'hourly_rate', label: 'Hourly Rate ($)', ph: '75.00', type: 'number' },
                { k: 'assigned_to', label: 'Assigned To', ph: 'Technician name', type: 'text' },
              ].map(({ k, label, ph, type }) => (
                <div key={k}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_billable} onChange={e => set('is_billable', e.target.checked)} style={{ accentColor: accent, width: 16, height: 16 }} />
                Billable time
              </label>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleLogManual} disabled={!form.project_name || !form.duration_minutes}
                style={{ padding: '9px 16px', borderRadius: 10, border: `1.5px solid ${accent}`, background: 'transparent', color: accent, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: (!form.project_name || !form.duration_minutes) ? 0.5 : 1 }}>
                Log Manual
              </button>
              <button onClick={handleStartNew} disabled={!form.project_name}
                style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: accent, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: !form.project_name ? 0.5 : 1 }}>
                <Play size={13} /> Start Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {convertSuccess && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:1000, display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderRadius:12, background:'#059669', color:'#fff', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>
          ✅ Invoice {convertSuccess.number} created!
          <button onClick={() => navigate(`/invoices/${convertSuccess.invoice_id}`)}
            style={{ padding:'4px 10px', borderRadius:7, background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
            View Invoice →
          </button>
          <button onClick={() => setConvertSuccess(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
        </div>
      )}

      {showConvertModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.6)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--bg-surface)', borderRadius:18, width:'100%', maxWidth:440, boxShadow:'0 32px 80px rgba(11,18,32,0.25)', fontFamily:'inherit', overflow:'hidden' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>Convert to Invoice</h3>
              <button onClick={() => setShowConvertModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20, padding:0, lineHeight:1 }}>✕</button>
            </div>
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:'10px 14px', borderRadius:10, background:'#05966910', border:'1px solid #05966930', fontSize:12, color:'#059669', fontWeight:600 }}>
                {billable.length} billable {billable.length === 1 ? 'entry' : 'entries'} · Total: {fmt$(totalUnbilled)}
              </div>
              {[
                { k:'convertClient', label:'Client Name', ph:'Jane Smith', val:convertClient, set:setConvertClient },
                { k:'convertEmail', label:'Client Email (optional)', ph:'jane@company.com', val:convertEmail, set:setConvertEmail },
              ].map(({ k, label, ph, val, set }) => (
                <div key={k}>
                  <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit', outline:'none' }} />
                </div>
              ))}
              <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>Time entries will be listed as line items. You can edit the invoice after creation.</p>
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowConvertModal(false)} style={{ padding:'9px 16px', borderRadius:10, border:'1.5px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>Cancel</button>
              <button onClick={handleConvertToInvoice} disabled={converting}
                style={{ padding:'9px 20px', borderRadius:10, border:'none', background:'#059669', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', opacity:converting ? 0.6 : 1 }}>
                {converting ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
