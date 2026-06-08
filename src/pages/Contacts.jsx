/**
 * Contacts.jsx — Full CRM Client Intelligence System
 * Features: Dashboard table, Client Profile, AI Scores, Custom Fields,
 *           Saved Views, Bulk Actions, Tasks, Revenue Timeline
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from '../context/AccountContext';
import {
  Search, Plus, Filter, Star, Zap, Heart, TrendingUp, TrendingDown,
  Mail, Phone, Globe, MapPin, ChevronRight, ChevronDown, X, Check,
  Trash2, Tag, Users, BarChart3, Clock, AlertTriangle, CheckCircle,
  RefreshCw, MessageSquare, FileText, DollarSign, Calendar,
  MoreVertical, Edit2, ExternalLink, Bookmark, Settings2, Target,
  Activity, Brain, Award, Shield, Flame
} from 'lucide-react';

// ─────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────
const fmt   = n => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });
const fmtDate = s => { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return s; } };
const fmtDaysAgo = s => {
  if (!s) return '—';
  const days = Math.floor((Date.now() - new Date(s)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days/30)}mo ago`;
  return `${Math.floor(days/365)}yr ago`;
};

// DNA label → color/icon
const DNA_CONFIG = {
  'VIP':               { color: '#3DD68C', bg: '#3DD68C15', icon: '👑' },
  'Repeat Buyer':      { color: '#3DD68C', bg: '#3DD68C15', icon: '🔄' },
  'High Margin Customer': { color: '#3DD68C', bg: '#3DD68C15', icon: '💎' },
  'At-Risk Customer':  { color: '#DC2626', bg: '#DC262615', icon: '⚠️' },
  'Seasonal Customer': { color: '#64748B', bg: '#64748B15', icon: '🌊' },
  'New Customer':      { color: '#3DD68C', bg: '#3DD68C15', icon: '🌱' },
  'Price Sensitive':   { color: '#6B7280', bg: '#6B728015', icon: '💰' },
  'Referral Source':   { color: '#3DD68C', bg: '#3DD68C15', icon: '📣' },
};

// Health score → color
const healthColor = score => score >= 70 ? '#3DD68C' : score >= 40 ? '#64748B' : '#DC2626';
const healthLabel = score => score >= 70 ? 'Healthy' : score >= 40 ? 'At Risk' : 'Critical';

// ─────────────────────────────────────────────────
// Score Ring Component
// ─────────────────────────────────────────────────
function ScoreRing({ score, color, size = 44, label }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} title={`${label}: ${score}/100`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size < 48 ? 11 : 13, fontWeight: 800, color }}>
        {score}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// DNA Badge
// ─────────────────────────────────────────────────
function DNABadge({ label, size = 'sm' }) {
  const cfg = DNA_CONFIG[label] || DNA_CONFIG['New Customer'];
  return (
    <span style={{
      fontSize: size === 'sm' ? 10 : 12, fontWeight: 700, padding: size === 'sm' ? '2px 7px' : '4px 10px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}30`, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
    }}>
      {cfg.icon} {label}
    </span>
  );
}

// ─────────────────────────────────────────────────
// Main Contacts Page
// ─────────────────────────────────────────────────
export default function Contacts() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const accent = '#3DD68C';
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [filterDNA, setFilterDNA] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [activeView, setActiveView] = useState(null);
  const [showNewContact, setShowNewContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [scoringAll, setScoringAll] = useState(false);

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ account_id: account.id, sort_by: sortBy, sort_dir: sortDir, limit: 500 });
      if (search) params.set('search', search);
      if (filterDNA) params.set('dna_label', filterDNA);
      if (filterType) params.set('contact_type', filterType);
      const r = await fetch(`/api/contacts?${params}`, { headers: h });
      const data = await r.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [account?.id, search, sortBy, sortDir, filterDNA, filterType]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!account?.id) return;
    fetch(`/api/contacts/saved-views?account_id=${account.id}`, { headers: h })
      .then(r => r.json()).then(d => setSavedViews(Array.isArray(d) ? d : [])).catch(() => {});
  }, [account?.id]);

  // Bulk score all contacts
  const handleScoreAll = async () => {
    if (!contacts.length) return;
    setScoringAll(true);
    const ids = contacts.slice(0, 50).map(c => c.id); // limit to 50 at a time
    await fetch('/api/contacts/bulk', {
      method: 'POST', headers: h,
      body: JSON.stringify({ account_id: account.id, contact_ids: ids, action: 'score' })
    });
    setScoringAll(false);
    load();
  };

  // Bulk action handler
  const handleBulk = async (action, value) => {
    if (!selected.size) return;
    setBulkLoading(true);
    await fetch('/api/contacts/bulk', {
      method: 'POST', headers: h,
      body: JSON.stringify({ account_id: account.id, contact_ids: [...selected], action, value })
    });
    setSelected(new Set());
    setBulkLoading(false);
    load();
  };

  // Toggle column sort
  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const allSelected = contacts.length > 0 && selected.size === contacts.length;

  // ── Stats bar
  const totalRevenue = contacts.reduce((s, c) => s + parseFloat(c.lifetime_value || 0), 0);
  const totalOutstanding = contacts.reduce((s, c) => s + parseFloat(c.outstanding_balance || 0), 0);
  const atRisk = contacts.filter(c => c.ai_dna_label === 'At-Risk Customer').length;
  const vips = contacts.filter(c => c.ai_dna_label === 'VIP').length;

  if (selectedContact) {
    return <ContactProfile contactId={selectedContact} onBack={() => { setSelectedContact(null); load(); }} accent={accent} token={token} h={h} accountId={account?.id} />;
  }

  return (
    <div style={{ padding: '0 0 32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Action bar */}
      <div style={{ padding: 'clamp(12px,2vw,14px) clamp(14px,4vw,28px)', background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }} />
        {contacts.length > 0 && (
          <button onClick={handleScoreAll} disabled={scoringAll}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-muted)', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
            {scoringAll ? 'Scoring…' : 'AI Score'}
          </button>
        )}
        <button onClick={() => setShowNewContact(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:10, border:'none', background:'#0D1A0D', color:'#C8FF00', cursor:'pointer', fontSize:13, fontWeight:800, fontFamily:'inherit' }}>
          <Plus size={14} /> New Client
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ padding: 'clamp(12px,3vw,16px) clamp(14px,4vw,28px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Clients', value: contacts.length, icon: <Users size={14} />, color: accent },
          { label: 'Lifetime Revenue', value: fmt(totalRevenue), icon: <DollarSign size={14} />, color: '#3DD68C' },
          { label: 'Outstanding', value: fmt(totalOutstanding), icon: <Clock size={14} />, color: totalOutstanding > 0 ? '#64748B' : '#3DD68C' },
          { label: 'VIP Clients', value: vips, icon: <Award size={14} />, color: '#3DD68C' },
          { label: 'At-Risk', value: atRisk, icon: <AlertTriangle size={14} />, color: atRisk > 0 ? '#DC2626' : '#6B7280' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color }}>
              {icon}
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Search + Filters ── */}
      <div style={{ padding: '0 clamp(14px,4vw,28px) 12px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        <select value={filterDNA} onChange={e => setFilterDNA(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">All DNA Types</option>
          {Object.keys(DNA_CONFIG).map(d => <option key={d} value={d}>{DNA_CONFIG[d].icon} {d}</option>)}
        </select>

        <select value={sortBy} onChange={e => handleSort(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="name">Sort: Name</option>
          <option value="lifetime_value">Sort: Revenue</option>
          <option value="ai_revenue_score">Sort: AI Score</option>
          <option value="last_activity_date">Sort: Last Activity</option>
          <option value="created_at">Sort: Date Added</option>
        </select>

        {/* Saved views */}
        {savedViews.map(v => (
          <button key={v.id} onClick={() => setActiveView(v)}
            style={{ padding: '6px 12px', borderRadius: 10, border: `1.5px solid ${activeView?.id === v.id ? accent : 'var(--border)'}`, background: activeView?.id === v.id ? `${accent}10` : 'transparent', color: activeView?.id === v.id ? accent : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
            <Bookmark size={10} /> {v.name}
          </button>
        ))}
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div style={{ margin: '0 28px 12px', padding: '10px 14px', borderRadius: 12, background: `${accent}10`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{selected.size} selected</span>
          {[
            { label: 'Score AI', action: () => handleBulk('score'), icon: <Brain size={12} /> },
            { label: 'Tag VIP', action: () => handleBulk('tag', 'VIP'), icon: <Tag size={12} /> },
            { label: 'Delete', action: () => { if (confirm(`Delete ${selected.size} clients?`)) handleBulk('delete'); }, icon: <Trash2 size={12} />, danger: true },
          ].map(({ label, action, icon, danger }) => (
            <button key={label} onClick={action} disabled={bulkLoading}
              style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${danger ? '#DC262640' : 'var(--border)'}`, background: danger ? '#DC262610' : 'var(--bg-surface)', color: danger ? '#DC2626' : 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              {icon} {label}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ margin: '0 28px', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={e => setSelected(e.target.checked ? new Set(contacts.map(c => c.id)) : new Set())} style={{ accentColor: accent, cursor: 'pointer' }} />
                </th>
                {[
                  { key: 'name', label: 'Client' },
                  { key: 'ai_dna_label', label: 'DNA' },
                  { key: 'lifetime_value', label: 'Revenue' },
                  { key: null, label: 'Health' },
                  { key: 'outstanding_balance', label: 'Outstanding' },
                  { key: 'last_invoice_date', label: 'Last Invoice' },
                  { key: 'last_activity_date', label: 'Last Activity' },
                  { key: 'ai_revenue_score', label: 'Score' },
                ].map(({ key, label }) => (
                  <th key={label}
                    onClick={() => key && handleSort(key)}
                    style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', cursor: key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {label} {key && sortBy === key && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
                <th style={{ padding: '10px 12px', width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading clients…</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 48, textAlign: 'center' }}>
                  <Users size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>No clients yet</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Add your first client or create a quote to get started.</p>
                </td></tr>
              ) : contacts.map((c, i) => {
                const dna = DNA_CONFIG[c.ai_dna_label] || DNA_CONFIG['New Customer'];
                const health = parseInt(c.ai_health_score || 50);
                const revenue = parseInt(c.ai_revenue_score || 0);
                const isSelected = selected.has(c.id);
                return (
                  <tr key={c.id}
                    style={{ borderBottom: '0.5px solid var(--border)', background: isSelected ? `${accent}08` : 'transparent', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--bg-raised)')}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                    onClick={(e) => { if (e.target.type !== 'checkbox') setSelectedContact(c.id); }}>
                    <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={e => {
                        const next = new Set(selected);
                        e.target.checked ? next.add(c.id) : next.delete(c.id);
                        setSelected(next);
                      }} style={{ accentColor: accent, cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${dna.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: dna.color, flexShrink: 0 }}>
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{c.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{c.business || c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <DNABadge label={c.ai_dna_label || 'New Customer'} />
                    </td>
                    <td style={{ padding: '12px 12px', fontWeight: 700, color: parseFloat(c.lifetime_value) > 0 ? '#3DD68C' : 'var(--text-muted)' }}>
                      {fmt(c.lifetime_value)}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: healthColor(health), flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: healthColor(health) }}>{healthLabel(health)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 12px', fontWeight: 600, color: parseFloat(c.outstanding_balance) > 0 ? '#64748B' : 'var(--text-muted)' }}>
                      {parseFloat(c.outstanding_balance) > 0 ? fmt(c.outstanding_balance) : '—'}
                    </td>
                    <td style={{ padding: '12px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(c.last_invoice_date)}</td>
                    <td style={{ padding: '12px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{fmtDaysAgo(c.last_activity_date)}</td>
                    <td style={{ padding: '12px 12px' }}>
                      {revenue > 0 ? (
                        <ScoreRing score={revenue} color={revenue >= 70 ? '#3DD68C' : revenue >= 40 ? '#64748B' : '#DC2626'} size={36} label="Revenue Score" />
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelectedContact(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New Contact Modal ── */}
      {showNewContact && (
        <NewContactModal accountId={account?.id} token={token} h={h} accent={accent}
          onClose={() => setShowNewContact(false)}
          onSaved={() => { setShowNewContact(false); load(); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// New Contact Modal
// ─────────────────────────────────────────────────
function NewContactModal({ accountId, token, h, accent, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', business: '', email: '', phone: '', address: '', website: '', source: '', contact_type: 'customer' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/contacts', { method: 'POST', headers: h, body: JSON.stringify({ ...form, account_id: accountId }) });
      onSaved();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(11,18,32,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ padding: '20px clamp(12px,4vw,24px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>New Client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px clamp(12px,4vw,24px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { k: 'name', label: 'Full Name *', ph: 'Jane Smith' },
            { k: 'business', label: 'Company', ph: 'Acme Corp' },
            { k: 'email', label: 'Email', ph: 'jane@company.com', type: 'email' },
            { k: 'phone', label: 'Phone', ph: '(256) 555-0100', type: 'tel' },
            { k: 'address', label: 'Address', ph: '123 Main St, Birmingham AL' },
            { k: 'website', label: 'Website', ph: 'https://company.com', type: 'url' },
          ].map(({ k, label, ph, type = 'text' }) => (
            <div key={k}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{label}</label>
              <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Client Type</label>
            <select value={form.contact_type} onChange={e => set('contact_type', e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit' }}>
              {['customer', 'lead', 'prospect', 'vendor', 'partner'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding: '16px clamp(12px,4vw,24px)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#3DD68C', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: !form.name.trim() ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Client Profile Page
// ─────────────────────────────────────────────────
function ContactProfile({ contactId, onBack, accent, token, h, accountId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('manual');
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [editingContact, setEditingContact] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, timeline, taskList] = await Promise.all([
        fetch(`/api/contacts/${contactId}`, { headers: h }).then(r => r.json()),
        fetch(`/api/contacts/${contactId}/timeline`, { headers: h }).then(r => r.json()),
        fetch(`/api/contacts/${contactId}/tasks`, { headers: h }).then(r => r.json()),
      ]);
      setData({ ...profile, timeline: timeline.timeline || [], stats: timeline.stats || {}, scores: timeline.scores || {} });
      setTasks(Array.isArray(taskList) ? taskList : []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  const handleScore = async () => {
    setScoring(true);
    const r = await fetch(`/api/contacts/${contactId}/ai-score`, { method: 'POST', headers: h }).then(r => r.json());
    setScoring(false);
    load();
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    await fetch(`/api/contacts/${contactId}/notes`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ account_id: accountId, note, note_type: noteType })
    });
    setNote('');
    setAddingNote(false);
    load();
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    await fetch(`/api/contacts/${contactId}/tasks`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ account_id: accountId, title: newTask })
    });
    setNewTask('');
    load();
  };

  const handleCompleteTask = async (taskId, done) => {
    await fetch(`/api/contacts/tasks/${taskId}`, { method: 'PATCH', headers: h, body: JSON.stringify({ completed: done }) });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: done ? 1 : 0 } : t));
  };

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${accent}`, borderTopColor: 'transparent', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  if (!data) return null;

  const c = data;
  const health = parseInt(c.ai_health_score || 50);
  const revenue = parseInt(c.ai_revenue_score || 0);
  const dna = DNA_CONFIG[c.ai_dna_label] || DNA_CONFIG['New Customer'];
  const opportunity = c.ai_opportunity || c.scores?.opportunity;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── Profile Header ── */}
      <div style={{ padding: 'clamp(14px,3vw,20px) clamp(14px,4vw,28px)', background: '#0D1A0D', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: 16, fontFamily: 'inherit' }}>
          ← All Clients
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: 56, height: 56, borderRadius: 14, background: `${dna.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: dna.color, flexShrink: 0, border: `2px solid ${dna.color}30` }}>
            {(c.name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{c.name}</h2>
              <DNABadge label={c.ai_dna_label || 'New Customer'} size="md" />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              {[c.business, c.email, c.phone].filter(Boolean).join(' · ')}
            </p>
            {/* AI Relationship Memory */}
            {c.ai_summary_cache && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: `${accent}08`, border: `1px solid ${accent}20`, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 600 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                  🧠 AI Relationship Memory
                </span>
                {c.ai_summary_cache}
              </div>
            )}
          </div>
          {/* Scores */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <ScoreRing score={revenue} color={revenue >= 70 ? '#3DD68C' : revenue >= 40 ? '#64748B' : '#DC2626'} size={52} label="Revenue Score" />
              <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Revenue</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ScoreRing score={health} color={healthColor(health)} size={52} label="Health Score" />
              <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Health</p>
            </div>
            <button onClick={handleScore} disabled={scoring}
              style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${accent}30`, background: `${accent}10`, color: accent, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
              <Brain size={12} /> {scoring ? 'Scoring…' : 'Refresh AI'}
            </button>
          </div>
        </div>

        {/* ── Opportunity Alert ── */}
        {opportunity && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: opportunity.includes('⚠️') ? '#DC262610' : '#64748B10', border: `1px solid ${opportunity.includes('⚠️') ? '#DC262630' : '#64748B30'}`, fontSize: 12, fontWeight: 600, color: opportunity.includes('⚠️') ? '#DC2626' : '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={13} style={{ flexShrink: 0 }} />
            <span>{opportunity}</span>
          </div>
        )}
      </div>

      {/* ── Tab Nav ── */}
      <div style={{ padding: '0 clamp(14px,4vw,28px)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 0 }}>
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 size={13} /> },
          { id: 'timeline', label: 'Timeline', icon: <Clock size={13} /> },
          { id: 'tasks', label: `Tasks (${tasks.filter(t => !t.completed).length})`, icon: <CheckCircle size={13} /> },
          { id: 'notes', label: 'Notes', icon: <MessageSquare size={13} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? accent : 'var(--text-muted)', borderBottom: `2px solid ${activeTab === tab.id ? accent : 'transparent'}`, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: 'clamp(14px,3vw,20px) clamp(14px,4vw,28px)' }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* Financial Summary */}
            <div style={{ padding: 18, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Financial Summary</p>
              {[
                { label: 'Lifetime Revenue', value: fmt(c.lifetime_value), color: '#3DD68C', bold: true },
                { label: 'Outstanding Balance', value: fmt(c.outstanding_balance), color: parseFloat(c.outstanding_balance) > 0 ? '#64748B' : 'var(--text-muted)' },
                { label: 'Total Invoices', value: c.total_invoices || 0 },
                { label: 'Paid Invoices', value: c.paid_invoices || 0 },
                { label: 'Avg Invoice Size', value: fmt(c.avg_invoice || 0) },
                { label: 'Last Invoice', value: fmtDate(c.last_invoice_date) },
                { label: 'Last Payment', value: fmtDate(c.last_payment_date) },
              ].map(({ label, value, color, bold }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: bold ? 800 : 600, color: color || 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Contact Info */}
            <div style={{ padding: 18, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Contact Information</p>
              {[
                { label: 'Email', value: c.email, icon: <Mail size={12} />, href: c.email ? `mailto:${c.email}` : null },
                { label: 'Phone', value: c.phone, icon: <Phone size={12} />, href: c.phone ? `tel:${c.phone}` : null },
                { label: 'Address', value: c.address, icon: <MapPin size={12} /> },
                { label: 'Website', value: c.website, icon: <Globe size={12} />, href: c.website },
                { label: 'Company', value: c.business },
                { label: 'Source', value: c.source || '—' },
                { label: 'Client Since', value: fmtDate(c.customer_since) },
              ].map(({ label, value, icon, href }) => value ? (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
                  {icon && <span style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }}>{icon}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>{label}</span>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: accent, textDecoration: 'none', fontWeight: 600, wordBreak: 'break-all' }}>{value}</a>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{value}</span>
                    )}
                  </div>
                </div>
              ) : null)}
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <a href={`mailto:${c.email}`}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${accent}`, background: `${accent}10`, color: accent, textDecoration: 'none', fontSize: 12, fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Mail size={12} /> Email Client
                </a>
                {c.phone && (
                  <a href={`tel:${c.phone}`}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none', fontSize: 12, fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Phone size={12} /> Call
                  </a>
                )}
              </div>
            </div>

            {/* AI Customer DNA */}
            <div style={{ padding: 18, borderRadius: 14, border: `1.5px solid ${dna.color}30`, background: dna.bg }}>
              <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dna.color }}>
                {dna.icon} Customer DNA
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: dna.color }}>{c.ai_dna_label || 'New Customer'}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Auto-classified · updates with each transaction</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <ScoreRing score={revenue} color={revenue >= 70 ? '#3DD68C' : revenue >= 40 ? '#64748B' : '#DC2626'} size={56} label="Revenue Score" />
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Revenue Score</p>
                  <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>
                    {revenue >= 80 ? 'High Growth Client' : revenue >= 60 ? 'Likely to Purchase Again' : revenue >= 40 ? 'Moderate' : 'Low Engagement'}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <ScoreRing score={health} color={healthColor(health)} size={56} label="Health Score" />
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Health Score</p>
                  <p style={{ margin: 0, fontSize: 10, color: healthColor(health), fontWeight: 600 }}>
                    {healthLabel(health)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div>
            {(!c.timeline || c.timeline.length === 0) ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Clock size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity yet</p>
              </div>
            ) : c.timeline.map((item, i) => {
              const colors = { note: '#6B7280', quote: accent, invoice: '#3DD68C', task: '#3DD68C' };
              const icons  = { note: <MessageSquare size={12} />, quote: <FileText size={12} />, invoice: <DollarSign size={12} />, task: <CheckCircle size={12} /> };
              const color = colors[item.type] || '#6B7280';
              return (
                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}15`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                      {icons[item.type]}
                    </div>
                    {i < c.timeline.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 16 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>{item.type}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDaysAgo(item.date)}</span>
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-primary)' }}>
                      {item.type === 'note' && <span>{item.data.note}</span>}
                      {item.type === 'quote' && <span>Quote {item.data.number} · {item.data.status} · {fmt(item.data.setup_total)}</span>}
                      {item.type === 'invoice' && <span>Invoice {item.data.number} · {item.data.status} · {fmt(item.data.amount_due)}</span>}
                      {item.type === 'task' && <span>Task: {item.data.title}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TASKS */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a task or action item…"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={handleAddTask} disabled={!newTask.trim()}
                style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#3DD68C', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Add</button>
            </div>
            {tasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>No tasks yet</p>
            ) : tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8, background: t.completed ? 'var(--bg-raised)' : 'var(--bg-surface)', opacity: t.completed ? 0.6 : 1 }}>
                <input type="checkbox" checked={!!t.completed} onChange={e => handleCompleteTask(t.id, e.target.checked)} style={{ accentColor: accent, cursor: 'pointer', width: 16, height: 16 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
                {t.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(t.due_date)}</span>}
              </div>
            ))}
          </div>
        )}

        {/* NOTES */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {[{ k: 'manual', l: '📝 Note' }, { k: 'call', l: '📞 Call' }, { k: 'email', l: '📧 Email' }, { k: 'visit', l: '🤝 Visit' }].map(({ k, l }) => (
                <button key={k} onClick={() => setNoteType(k)}
                  style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${noteType === k ? accent : 'var(--border)'}`, background: noteType === k ? `${accent}10` : 'transparent', color: noteType === k ? accent : 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder={`Add a ${noteType} log…`}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }} />
            <button onClick={handleAddNote} disabled={addingNote || !note.trim()}
              style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#3DD68C', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: !note.trim() ? 0.5 : 1 }}>
              {addingNote ? 'Saving…' : 'Add Note'}
            </button>

            <div style={{ marginTop: 20 }}>
              {(c.notes || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>No notes yet</p>
              ) : (c.notes || []).map(n => (
                <div key={n.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 10, background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{n.note_type}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {fmtDaysAgo(n.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
