import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw,
  ChevronDown, ChevronUp, Mail, MessageSquare, Clock, Sparkles,
  Play, Eye, AlertCircle, CheckCircle, Copy, Bot } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { canUseFeature } from '../utils/planFeatures';
import PlanGate from '../components/PlanGate';

const TRIGGER_LABELS = {
  quote_viewed:      { label: 'Quote viewed',          icon: Eye,          color: '#4B7BFF', desc: 'Client opened the quote portal' },
  quote_ignored:     { label: 'Quote ignored (48h)',   icon: AlertCircle,  color: '#f59e0b', desc: 'No view within 48 hours of sending' },
  invoice_overdue:   { label: 'Invoice overdue',       icon: AlertCircle,  color: '#ef4444', desc: 'Payment not received by due date' },
  deposit_unpaid:    { label: 'Deposit unpaid',        icon: Clock,        color: '#ef4444', desc: 'Deposit not paid within 24h' },
  repeat_customer:   { label: 'Repeat customer',       icon: CheckCircle,  color: '#00E5C8', desc: 'Client has 2+ paid invoices' },
};

const TONE_OPTIONS = ['professional', 'friendly', 'urgent', 'empathetic', 'concise'];

function SequenceCard({ seq, onToggle, onDelete, onExpand, expanded }) {
  const trigger = TRIGGER_LABELS[seq.trigger] || { label: seq.trigger, color: '#64748B', icon: Zap };
  const TriggerIcon = trigger.icon;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={onExpand}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: trigger.color + '18' }}>
          <TriggerIcon size={16} style={{ color: trigger.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{seq.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {trigger.label} · {seq.step_count || 0} step{seq.step_count !== 1 ? 's' : ''}
            {seq.total_sent > 0 && ` · ${seq.total_sent} sent`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={e => { e.stopPropagation(); onToggle(); }}
            title={seq.active ? 'Pause' : 'Activate'}>
            {seq.active
              ? <ToggleRight size={22} style={{ color: '#00E5C8' }} />
              : <ToggleLeft  size={22} style={{ color: 'var(--text-muted)' }} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-red-400 hover:text-red-600 p-1">
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
                    : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: '0.5px solid var(--border)', padding: '12px 16px' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Steps</p>
          <div className="space-y-2">
            {(seq.steps || []).map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-xs p-2.5 rounded-lg"
                style={{ background: 'var(--bg-page)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #4B7BFF, #7B4FE8)', minWidth: '20px' }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {step.channel === 'email' ? <Mail size={11} style={{ color: '#4B7BFF' }} /> : <MessageSquare size={11} style={{ color: '#00E5C8' }} />}
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{step.subject || step.channel}</span>
                    <span style={{ color: 'var(--text-muted)' }}>· {step.delay_hours < 24 ? `${step.delay_hours}h` : `${Math.round(step.delay_hours / 24)}d`} delay</span>
                  </div>
                  <p className="line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{step.body?.slice(0, 100)}…</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewSequenceModal({ onClose, onCreated, accountId }) {
  const [step, setStep]           = useState(1); // 1=choose, 2=customize
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [name, setName]           = useState('');
  const [trigger, setTrigger]     = useState('quote_viewed');
  const [steps, setSteps]         = useState([{ delay_hours: 24, channel: 'email', subject: '', body: '' }]);
  const [aiTone, setAiTone]       = useState('professional');
  const [rewriting, setRewriting] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    fetch('/api/automations/templates', {
      headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token}` }
    }).then(r => r.json()).then(d => setTemplates(d.templates || []));
  }, []);

  const useTemplate = (tpl) => {
    setSelected(tpl.id);
    setName(tpl.name);
    setTrigger(tpl.trigger);
    setSteps(tpl.steps.map(s => ({ ...s })));
    setStep(2);
  };

  const aiRewrite = async (idx) => {
    setRewriting(idx);
    const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
    try {
      const r = await fetch('/api/automations/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: steps[idx].body, tone: aiTone, context: `Trigger: ${trigger}` }),
      });
      const d = await r.json();
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, body: d.rewritten } : s));
    } catch {}
    setRewriting(null);
  };

  const addStep = () => setSteps(prev => [...prev, { delay_hours: 72, channel: 'email', subject: '', body: '' }]);
  const removeStep = (i) => setSteps(prev => prev.filter((_, idx) => idx !== i));
  const updateStep = (i, field, val) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
    try {
      const r = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ account_id: accountId, name, trigger, steps }),
      });
      const d = await r.json();
      if (d.sequence) { onCreated(d); onClose(); }
      else setError(d.error || 'Failed to save');
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const overlayStyle = { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', background: 'rgba(8,13,26,0.7)', backdropFilter: 'blur(4px)', overflowY: 'auto' };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: '14px', width: '100%', maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={15} color="#fff" />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New automation</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div className="p-5 space-y-5" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {step === 1 && (
            <>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Start from a template</p>
              <div className="space-y-2">
                {templates.map(tpl => {
                  const trig = TRIGGER_LABELS[tpl.trigger];
                  return (
                    <button key={tpl.id} onClick={() => useTemplate(tpl)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                      style={{ background: 'var(--bg-page)', border: '0.5px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#4B7BFF'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: (trig?.color || '#4B7BFF') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Zap size={14} style={{ color: trig?.color || '#4B7BFF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tpl.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{trig?.label} · {tpl.steps.length} steps</p>
                      </div>
                      <Copy size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
              <div style={{ height: '0.5px', background: 'var(--border)' }} />
              <button onClick={() => setStep(2)}
                className="w-full p-3 rounded-xl text-sm font-semibold text-center"
                style={{ border: '0.5px dashed var(--border)', color: 'var(--text-muted)', background: 'none', cursor: 'pointer' }}>
                + Build from scratch
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 4 }}>Sequence name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="field" placeholder="e.g. Quote follow-up" />
              </div>

              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 4 }}>Trigger</label>
                <select value={trigger} onChange={e => setTrigger(e.target.value)} className="field">
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} — {v.desc}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>AI tone</label>
                <div className="flex gap-1 flex-wrap">
                  {TONE_OPTIONS.map(t => (
                    <button key={t} onClick={() => setAiTone(t)}
                      className="text-xs px-2.5 py-1 rounded-full font-semibold transition-all capitalize"
                      style={{ background: aiTone === t ? 'linear-gradient(135deg, #4B7BFF, #7B4FE8)' : 'var(--bg-page)', color: aiTone === t ? '#fff' : 'var(--text-muted)', border: '0.5px solid var(--border)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Steps ({steps.length})</label>
                  <button onClick={addStep} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#4B7BFF', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Plus size={13} /> Add step
                  </button>
                </div>
                <div className="space-y-3">
                  {steps.map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-page)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #4B7BFF, #7B4FE8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Step {i + 1}</span>
                        </div>
                        {steps.length > 1 && (
                          <button onClick={() => removeStep(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Delay</label>
                          <select value={s.delay_hours} onChange={e => updateStep(i, 'delay_hours', parseInt(e.target.value))} className="field text-sm">
                            {[0,1,2,4,6,12,24,48,72,96,120,168,336].map(h => (
                              <option key={h} value={h}>{h === 0 ? 'Immediately' : h < 24 ? `${h} hours` : `${h/24} day${h/24>1?'s':''}`}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Channel</label>
                          <select value={s.channel} onChange={e => updateStep(i, 'channel', e.target.value)} className="field text-sm">
                            <option value="email">📧 Email</option>
                            <option value="sms">💬 SMS</option>
                          </select>
                        </div>
                      </div>
                      {s.channel === 'email' && (
                        <input value={s.subject} onChange={e => updateStep(i, 'subject', e.target.value)}
                          className="field text-sm mb-2" placeholder="Subject line" />
                      )}
                      <textarea value={s.body} onChange={e => updateStep(i, 'body', e.target.value)}
                        className="field text-sm resize-none mb-2" rows={4}
                        placeholder="Message body... Use {client_name}, {invoice_num}, {amount}, {agency_name}" />
                      <button onClick={() => aiRewrite(i)} disabled={rewriting === i}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: '#7B4FE8', background: 'none', border: 'none', cursor: 'pointer', opacity: rewriting === i ? 0.6 : 1 }}>
                        {rewriting === i ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        {rewriting === i ? 'Rewriting…' : `AI rewrite (${aiTone})`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-5" style={{ borderTop: '0.5px solid var(--border)', background: 'var(--bg-page)' }}>
          <button onClick={step === 2 ? () => setStep(1) : onClose} className="btn-ghost text-sm">
            {step === 2 ? '← Back' : 'Cancel'}
          </button>
          {step === 2 && (
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)' }}>
              {saving ? <><RefreshCw size={13} className="animate-spin" />Saving…</> : <><CheckCircle size={13} />Save automation</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AutomationsPage() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [expanded, setExpanded]   = useState(null);

  const plan = account?.plan || 'starter';

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
    try {
      const r = await fetch(`/api/automations?account_id=${account.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      setSequences(d.sequences || []);
    } catch {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (seq) => {
    const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
    await fetch(`/api/automations/${seq.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !seq.active }),
    });
    load();
  };

  const del = async (seq) => {
    if (!confirm(`Delete "${seq.name}"?`)) return;
    const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
    await fetch(`/api/automations/${seq.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Automations</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            AI-powered follow-up sequences that run while you focus on the work.
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)' }}>
          <Plus size={14} /> New automation
        </button>
      </div>

      {/* Trigger legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        {Object.entries(TRIGGER_LABELS).map(([k, v]) => {
          const Icon = v.icon;
          return (
            <div key={k} className="card p-3 text-center">
              <div style={{ width: 28, height: 28, borderRadius: 8, background: v.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                <Icon size={13} style={{ color: v.color }} />
              </div>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)' }}>{v.label}</p>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{v.desc}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={16} className="animate-spin" /> Loading…
        </div>
      ) : sequences.length === 0 ? (
        <div className="card p-10 text-center">
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Zap size={22} color="#fff" />
          </div>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No automations yet</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Set up your first sequence and Revanew will automatically follow up with clients, recover overdue invoices, and nurture quotes — on autopilot.
          </p>
          <button onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)' }}>
            <Plus size={14} /> Create first automation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map(seq => (
            <SequenceCard key={seq.id} seq={seq}
              onToggle={() => toggle(seq)}
              onDelete={() => del(seq)}
              expanded={expanded === seq.id}
              onExpand={() => setExpanded(expanded === seq.id ? null : seq.id)}
            />
          ))}
        </div>
      )}

      {showNew && (
        <NewSequenceModal
          accountId={account?.id}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}
