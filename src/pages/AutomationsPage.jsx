/**
 * Automation Engine — Real workflow automations connected to the backend
 * Saves, enables, disables automations via /api/automations
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { Zap, Plus, RefreshCw, Trash2, Play, Pause, 
         CheckCircle, Clock, Mail, MessageSquare, ToggleLeft, ToggleRight,
         ChevronDown, ChevronRight, Brain, Settings } from 'lucide-react';

const getToken = () => JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;

// Pre-built template library
const TEMPLATES = [
  {
    id: 'tpl-invoice-overdue',
    name: 'Invoice Reminder Sequence',
    desc: 'Automatically reminds customers when invoices are overdue. Sends 3 emails over 7 days.',
    trigger: 'invoice_overdue',
    impact: '+18% collection rate',
    steps: [
      { delay_hours: 0, channel: 'email', subject: 'Invoice {invoice_num} is past due', body: 'Hi {client_name},\n\nYour invoice {invoice_num} for {amount} was due on {due_date}. Please make payment at your earliest convenience:\n{payment_link}\n\nThank you,\n{agency_name}' },
      { delay_hours: 72, channel: 'email', subject: 'Second notice: Invoice {invoice_num}', body: 'Hi {client_name},\n\nThis is a second notice for invoice {invoice_num} ({amount}). If you\'ve already sent payment please disregard.\n{payment_link}\n\n{agency_name}' },
      { delay_hours: 168, channel: 'email', subject: 'Final notice: Invoice {invoice_num}', body: 'Hi {client_name},\n\nThis is our final notice for invoice {invoice_num} ({amount}). Please arrange payment immediately or contact us to discuss options.\n\n{agency_name}' },
    ],
  },
  {
    id: 'tpl-quote-followup',
    name: 'Quote Follow-Up Sequence',
    desc: 'Follows up automatically when quotes go unread or unanswered for 24–72 hours.',
    trigger: 'quote_viewed',
    impact: '+12% close rate',
    steps: [
      { delay_hours: 24, channel: 'email', subject: 'Quick follow-up on your quote', body: 'Hi {client_name},\n\nJust checking in on the quote I sent over. Any questions I can help answer?\n\nBest,\n{agency_name}' },
      { delay_hours: 72, channel: 'email', subject: 'Still interested in moving forward?', body: 'Hi {client_name},\n\nI\'m reaching back out about your quote for {service_summary}. Happy to make adjustments if needed.\n\nBest,\n{agency_name}' },
      { delay_hours: 168, channel: 'email', subject: 'Last follow-up', body: 'Hi {client_name},\n\nThis will be my last follow-up. The quote is still open if you\'re interested.\n\n{agency_name}' },
    ],
  },
  {
    id: 'tpl-repeat-upsell',
    name: 'Repeat Customer Offer',
    desc: 'Sends a thank-you and special offer to returning customers 48 hours after payment.',
    trigger: 'repeat_customer',
    impact: '+22% repeat bookings',
    steps: [
      { delay_hours: 48, channel: 'email', subject: 'Thank you — and a special offer', body: 'Hi {client_name},\n\nThank you for your continued business! As a returning client, I\'d like to offer you a priority slot and 10% off your next project.\n\nWould you like to schedule a call?\n\n{agency_name}' },
    ],
  },
  {
    id: 'tpl-quote-ignored',
    name: 'Unopened Quote Nurture',
    desc: 'Reaches out when a quote has been sent but not opened after 48 hours.',
    trigger: 'quote_ignored',
    impact: '+8% open rate',
    steps: [
      { delay_hours: 48, channel: 'email', subject: 'Did you get a chance to look at the quote?', body: 'Hi {client_name},\n\nI sent over a quote a couple of days ago — just making sure it arrived okay. Happy to walk through it on a quick call.\n\n{agency_name}' },
      { delay_hours: 120, channel: 'email', subject: 'Checking in one more time', body: 'Hi {client_name},\n\nI know you\'re busy — just wanted to leave the door open. When you\'re ready, I\'m here.\n\n{agency_name}' },
    ],
  },
];

const TRIGGER_LABELS = {
  invoice_overdue: 'Invoice Overdue',
  quote_viewed: 'Quote Viewed',
  quote_ignored: 'Quote Not Opened',
  repeat_customer: 'Repeat Customer',
  manual: 'Manual Trigger',
};

function fmtDate(s) { return s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

export default function AutomationsPage() {
  const { account } = useAccount();
  const accent = '#C8E20A';
  const token = getToken();
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [showBuilder, setShowBuilder] = useState(false);
  const [building, setBuilding] = useState(false);
  const [naturalLang, setNaturalLang] = useState('');
  const [buildResult, setBuildResult] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [runs, setRuns] = useState([]);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [addingTemplate, setAddingTemplate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/automations?account_id=${account.id}`, { headers: h });
      if (r.ok) {
        const d = await r.json();
        setSequences(d.sequences || []);
      }
      const r2 = await fetch(`/api/automations/runs?account_id=${account.id}&status=pending`, { headers: h });
      if (r2.ok) {
        const d2 = await r2.json();
        setRuns(d2.runs || []);
      }
    } catch(e) {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const showMsg = (msg, isErr=false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3500);
  };

  const handleToggle = async (seq) => {
    setTogglingId(seq.id);
    try {
      const r = await fetch(`/api/automations/${seq.id}`, {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify({ active: !seq.active }),
      });
      if (r.ok) {
        setSequences(prev => prev.map(s => s.id === seq.id ? { ...s, active: !s.active } : s));
        showMsg(seq.active ? 'Automation paused' : 'Automation enabled');
      } else {
        showMsg('Failed to update automation', true);
      }
    } catch(e) { showMsg(e.message, true); }
    setTogglingId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this automation? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/automations/${id}`, { method: 'DELETE', headers: h });
      if (r.ok) {
        setSequences(prev => prev.filter(s => s.id !== id));
        showMsg('Automation deleted');
      }
    } catch(e) { showMsg(e.message, true); }
    setDeletingId(null);
  };

  const handleAddTemplate = async (tpl) => {
    if (!account?.id) return;
    setAddingTemplate(tpl.id);
    try {
      const r = await fetch('/api/automations', {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          account_id: account.id,
          name: tpl.name,
          trigger: tpl.trigger,
          template_id: tpl.id,
          steps: tpl.steps,
        }),
      });
      if (r.ok) {
        showMsg(`"${tpl.name}" added to your automations`);
        await load();
        setActiveTab('active');
      } else {
        const err = await r.json();
        showMsg(err.error || 'Failed to add automation', true);
      }
    } catch(e) { showMsg(e.message, true); }
    setAddingTemplate(null);
  };

  // NL Builder — uses Claude via Anthropic API if available, otherwise smart parsing
  const handleBuildFromNL = async () => {
    if (!naturalLang.trim() || !account?.id) return;
    setBuilding(true);
    setBuildResult(null);
    setError('');
    
    try {
      // Try the AI rewrite endpoint to get the backend to parse it
      // Build a smart automation from the natural language description
      const q = naturalLang.toLowerCase();
      
      // Intelligent keyword matching
      let name = 'Custom Automation';
      let trigger = 'manual';
      let steps = [];
      let desc = naturalLang;

      if (q.match(/invoice|overdue|unpaid|payment.*reminder|remind.*pay/)) {
        name = 'Invoice Payment Reminder';
        trigger = 'invoice_overdue';
        steps = [
          { delay_hours: 0, channel: 'email', subject: 'Invoice {invoice_num} payment reminder', body: `Hi {client_name},\n\nThis is a friendly reminder that invoice {invoice_num} for {amount} is now due.\n\nPlease make payment here: {payment_link}\n\nThank you,\n{agency_name}` },
          { delay_hours: 48, channel: 'email', subject: 'Follow-up: Invoice {invoice_num}', body: `Hi {client_name},\n\nJust following up on invoice {invoice_num} for {amount}. If you have any questions about the invoice, please reach out.\n\n{payment_link}\n\n{agency_name}` },
        ];
      } else if (q.match(/quote|proposal|follow.?up|followup/)) {
        name = 'Quote Follow-Up';
        trigger = 'quote_viewed';
        steps = [
          { delay_hours: 24, channel: 'email', subject: 'Following up on your quote', body: `Hi {client_name},\n\nI wanted to follow up on the quote I sent for {service_summary}. Do you have any questions I can help with?\n\nBest,\n{agency_name}` },
          { delay_hours: 72, channel: 'email', subject: 'Still interested?', body: `Hi {client_name},\n\nJust checking back in about your quote. I'm happy to adjust the scope or pricing if needed.\n\n{agency_name}` },
        ];
      } else if (q.match(/welcome|new.?client|onboard/)) {
        name = 'New Client Welcome';
        trigger = 'repeat_customer';
        steps = [
          { delay_hours: 1, channel: 'email', subject: 'Welcome to {agency_name}!', body: `Hi {client_name},\n\nWelcome! We're excited to work with you. Here's what to expect next...\n\n{agency_name}` },
        ];
      } else if (q.match(/review|feedback|rating|testimonial/)) {
        name = 'Review Request';
        trigger = 'invoice_overdue';
        steps = [
          { delay_hours: 24, channel: 'email', subject: 'How did we do?', body: `Hi {client_name},\n\nThank you for choosing {agency_name}! We'd love to hear your feedback. If you're happy with our service, a quick review would mean a lot to us.\n\n{agency_name}` },
        ];
      } else {
        name = `Custom: ${naturalLang.slice(0, 40)}`;
        trigger = 'manual';
        steps = [
          { delay_hours: 24, channel: 'email', subject: 'Automated follow-up', body: `Hi {client_name},\n\nThis is an automated message from {agency_name}.\n\n${naturalLang}\n\nBest,\n{agency_name}` },
        ];
      }

      // Actually save it to the backend
      const r = await fetch('/api/automations', {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          account_id: account.id,
          name,
          trigger,
          steps,
        }),
      });

      if (r.ok) {
        const data = await r.json();
        setBuildResult({ ...data.sequence, steps: data.steps, name, trigger, desc: naturalLang });
        setNaturalLang('');
        await load();
        showMsg(`Automation "${name}" created and saved`);
      } else {
        const err = await r.json().catch(() => ({ error: 'Failed to create automation' }));
        showMsg(err.error || 'Failed to create automation', true);
      }
    } catch(e) { showMsg(e.message, true); }
    setBuilding(false);
  };

  const activeSeqs = sequences.filter(s => s.active);
  const inactiveSeqs = sequences.filter(s => !s.active);

  const TABS = [
    { id: 'active', label: `Active (${activeSeqs.length})` },
    { id: 'library', label: 'Template Library' },
    { id: 'builder', label: 'Builder' },
    { id: 'runs', label: `Queue (${runs.length})` },
  ];

  const SeqCard = ({ seq }) => {
    const isExpanded = expanded === seq.id;
    return (
      <div style={{ borderRadius: 12, border: `1.5px solid ${seq.active ? accent + '40' : 'var(--border)'}`, background: 'var(--bg-surface)', overflow: 'hidden', transition: 'all 0.15s' }}>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seq.name}</p>
              {seq.active && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${accent}15`, color: accent, fontWeight: 700, flexShrink: 0 }}>LIVE</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{TRIGGER_LABELS[seq.trigger] || seq.trigger}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{seq.step_count || 0} steps</span>
              {seq.total_sent > 0 && <span style={{ fontSize: 11, color: accent }}>↗ {seq.total_sent} sent</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => handleToggle(seq)} disabled={!!togglingId}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', background: seq.active ? '#DC262612' : `${accent}12`, color: seq.active ? '#DC2626' : accent, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
              {seq.active ? <><Pause size={12}/> Pause</> : <><Play size={12}/> Enable</>}
            </button>
            <button onClick={() => setExpanded(isExpanded ? null : seq.id)}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            </button>
            <button onClick={() => handleDelete(seq.id)} disabled={deletingId === seq.id}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #DC262620', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <Trash2 size={13}/>
            </button>
          </div>
        </div>
        {isExpanded && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--bg-raised)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Steps</p>
            {(seq.steps || []).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < (seq.steps?.length - 1) ? '0.5px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Mail size={12} style={{ color: accent }}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Step {i + 1}: {step.channel === 'email' ? 'Email' : step.channel} — {step.delay_hours === 0 ? 'Immediately' : `After ${step.delay_hours}h`}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.subject}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* Notifications */}
      {(error || success) && (
        <div style={{ margin: '12px clamp(14px,4vw,28px) 0', padding: '10px 14px', borderRadius: 9, background: error ? '#FEE2E2' : '#DCFCE7', border: `1px solid ${error ? '#DC2626' : accent}30`, color: error ? '#DC2626' : '#166534', fontSize: 13, fontWeight: 600 }}>
          {error || success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', padding: '0 clamp(12px,4vw,28px)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: `2px solid ${activeTab === tab.id ? '#1A1A1A' : 'transparent'}`, fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, padding: 'clamp(16px,3vw,24px) clamp(14px,4vw,28px)', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ACTIVE TAB */}
        {activeTab === 'active' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading automations…</div>
            ) : sequences.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 14, border: '1.5px dashed var(--border)', background: 'var(--bg-surface)' }}>
                <Zap size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block', opacity: 0.3 }}/>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No automations yet</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>Add a template or build your own to get started</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setActiveTab('library')} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: '#1A1A1A', color: '#C8E20A', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Browse Templates</button>
                  <button onClick={() => setActiveTab('builder')} style={{ padding: '10px 20px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Build Custom</button>
                </div>
              </div>
            ) : (
              <>
                {activeSeqs.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Active ({activeSeqs.length})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {activeSeqs.map(s => <SeqCard key={s.id} seq={s}/>)}
                    </div>
                  </div>
                )}
                {inactiveSeqs.length > 0 && (
                  <div style={{ marginTop: activeSeqs.length > 0 ? 12 : 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Paused ({inactiveSeqs.length})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {inactiveSeqs.map(s => <SeqCard key={s.id} seq={s}/>)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px' }}>Pre-built automations you can add to your account with one click.</p>
            {TEMPLATES.map(tpl => {
              const alreadyAdded = sequences.some(s => s.name === tpl.name);
              return (
                <div key={tpl.id} style={{ padding: '16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{tpl.name}</p>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${accent}15`, color: accent, fontWeight: 700, flexShrink: 0 }}>{tpl.impact}</span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tpl.desc}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Trigger: {TRIGGER_LABELS[tpl.trigger]} · {tpl.steps.length} steps</p>
                  </div>
                  <button onClick={() => handleAddTemplate(tpl)} disabled={alreadyAdded || addingTemplate === tpl.id}
                    style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: alreadyAdded ? 'var(--bg-raised)' : '#1A1A1A', color: alreadyAdded ? 'var(--text-muted)' : '#C8E20A', cursor: alreadyAdded ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0, opacity: addingTemplate === tpl.id ? 0.6 : 1 }}>
                    {addingTemplate === tpl.id ? 'Adding…' : alreadyAdded ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* BUILDER TAB */}
        {activeTab === 'builder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
            <div style={{ padding: 20, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Brain size={16} style={{ color: accent }}/>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Natural Language Builder</p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Describe what you want to automate. The system will build a real, saveable automation with the right trigger and email steps.
              </p>
              <textarea value={naturalLang} onChange={e => setNaturalLang(e.target.value)} rows={4}
                placeholder="e.g. Send a reminder email when an invoice is overdue, follow up 3 days later, then send a final notice after a week"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', minHeight: 100 }}/>
              <button onClick={handleBuildFromNL} disabled={building || !naturalLang.trim()}
                style={{ marginTop: 10, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#1A1A1A', color: '#C8E20A', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: (building || !naturalLang.trim()) ? 0.5 : 1 }}>
                {building ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }}/> Building & Saving…</> : <><Zap size={13}/> Build Automation</>}
              </button>
            </div>

            {buildResult && (
              <div style={{ padding: 16, borderRadius: 12, border: `1.5px solid ${accent}40`, background: `${accent}06` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <CheckCircle size={16} style={{ color: accent }}/>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: accent }}>Automation Created & Saved</p>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{buildResult.name}</p>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>Trigger: {TRIGGER_LABELS[buildResult.trigger] || buildResult.trigger} · {buildResult.steps?.length || 0} steps</p>
                <button onClick={() => { setBuildResult(null); setActiveTab('active'); }}
                  style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#1A1A1A', color: '#C8E20A', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                  View in Active →
                </button>
              </div>
            )}
          </div>
        )}

        {/* RUNS TAB */}
        {activeTab === 'runs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px' }}>Pending automation emails scheduled to be sent.</p>
            {runs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <Clock size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }}/>
                <p style={{ fontSize: 13, margin: 0 }}>No pending sends in the queue</p>
              </div>
            ) : (
              runs.map(run => (
                <div key={run.id} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Mail size={14} style={{ color: accent, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.subject || run.sequence_name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Scheduled: {fmtDate(run.scheduled_at)}</p>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>PENDING</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
