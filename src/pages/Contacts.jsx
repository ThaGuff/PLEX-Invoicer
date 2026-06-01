import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import { Plus, Search, User, Mail, Phone, Building2, FileText,
  Receipt, MessageSquare, Clock, Sparkles, RefreshCw, ChevronRight,
  X, Edit3, Trash2, Tag, DollarSign, TrendingUp } from 'lucide-react';

const NOTE_TYPE_COLORS = {
  manual:     { label: 'Note',       color: '#4B7BFF' },
  call:       { label: 'Call',       color: '#00E5C8' },
  email:      { label: 'Email',      color: '#7B4FE8' },
  visit:      { label: 'Visit',      color: '#f59e0b' },
  ai_summary: { label: 'AI Summary', color: '#10b981' },
};

function fmt(n) { return '$' + (parseFloat(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 0 }); }
function fmtDate(s) { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return s; } }

function ContactModal({ contact, accountId, onSave, onClose }) {
  const [v, setV] = useState({
    name: '', business: '', email: '', phone: '', address: '', notes: '',
    ...(contact || {}),
  });
  const [saving, setSaving] = useState(false);

  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const save = async () => {
    if (!v.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...v, account_id: accountId };
      let result;
      if (contact?.id) result = await api.contacts.update(contact.id, payload);
      else result = await api.contacts.create(payload);
      onSave(result);
    } catch {}
    setSaving(false);
  };

  const fields = [
    { key: 'name',     label: 'Full name*',    type: 'text',  placeholder: 'John Smith' },
    { key: 'business', label: 'Business name', type: 'text',  placeholder: 'Acme Roofing LLC' },
    { key: 'email',    label: 'Email',         type: 'email', placeholder: 'john@acme.com' },
    { key: 'phone',    label: 'Phone',         type: 'tel',   placeholder: '(256) 555-0100' },
    { key: 'address',  label: 'Address',       type: 'text',  placeholder: 'Huntsville, AL' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,13,26,0.7)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 460 }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{contact?.id ? 'Edit contact' : 'New contact'}</p>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div className="p-5 space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{f.label}</label>
              <input type={f.type} value={v[f.key]} onChange={e => set(f.key, e.target.value)}
                className="field text-sm" placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Notes</label>
            <textarea value={v.notes} onChange={e => set('notes', e.target.value)}
              className="field text-sm resize-none" rows={2} placeholder="Any notes about this contact…" />
          </div>
        </div>
        <div className="flex items-center justify-between p-5" style={{ borderTop: '0.5px solid var(--border)', background: 'var(--bg-page)' }}>
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={save} disabled={saving || !v.name.trim()}
            className="flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)' }}>
            {saving ? <RefreshCw size={13} className="animate-spin" /> : null}
            {contact?.id ? 'Save changes' : 'Create contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactDetail({ contactId, accountId, onClose, onRefresh }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [note, setNote]         = useState('');
  const [noteType, setNoteType] = useState('manual');
  const [addingNote, setAddingNote] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [editing, setEditing]   = useState(false);

  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/contacts/${contactId}/timeline`, { headers });
      setData(await r.json());
    } catch {}
    setLoading(false);
  }, [contactId]);

  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  const addNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    try {
      await fetch(`/api/contacts/${contactId}/notes`, {
        method: 'POST', headers,
        body: JSON.stringify({ account_id: accountId, note, note_type: noteType }),
      });
      setNote(''); loadTimeline();
    } catch {}
    setAddingNote(false);
  };

  const genSummary = async () => {
    setGeneratingSummary(true);
    try {
      await fetch(`/api/contacts/${contactId}/ai-summary`, { method: 'POST', headers });
      loadTimeline();
    } catch {}
    setGeneratingSummary(false);
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(8,13,26,0.7)' }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: '#4B7BFF' }} />
    </div>
  );

  const c = data?.contact;
  const stats = data?.stats;
  const timeline = data?.timeline || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(8,13,26,0.7)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: '14px 14px 0 0', width: '100%', maxWidth: '640px', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}
        className="md:rounded-2xl md:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4B7BFF, #7B4FE8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
              {(c?.name?.[0] || '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c?.name}</p>
              {c?.business && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c?.business}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setEditing(true)} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
              <Edit3 size={12} /> Edit
            </button>
            <button onClick={onClose}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }} className="p-5 space-y-5">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            {c?.email && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Mail size={12} style={{ color: '#4B7BFF', flexShrink: 0 }} /> <span className="truncate">{c.email}</span>
            </div>}
            {c?.phone && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Phone size={12} style={{ color: '#00E5C8', flexShrink: 0 }} /> {c.phone}
            </div>}
            {c?.address && <div className="flex items-center gap-2 text-xs col-span-2" style={{ color: 'var(--text-secondary)' }}>
              <Building2 size={12} style={{ color: '#7B4FE8', flexShrink: 0 }} /> {c.address}
            </div>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total revenue', value: fmt(stats?.total_revenue), color: '#00E5C8', icon: DollarSign },
              { label: 'Quotes',        value: stats?.total_quotes,        color: '#4B7BFF', icon: FileText },
              { label: 'Invoices paid', value: stats?.paid_invoices,        color: '#7B4FE8', icon: Receipt },
            ].map(s => (
              <div key={s.label} className="card p-3 text-center">
                <s.icon size={13} style={{ color: s.color, margin: '0 auto 4px' }} />
                <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* AI summary button */}
          <button onClick={genSummary} disabled={generatingSummary}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all"
            style={{ border: '0.5px dashed rgba(123,79,232,0.4)', color: '#7B4FE8', background: 'rgba(123,79,232,0.05)', cursor: 'pointer' }}>
            {generatingSummary ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generatingSummary ? 'Generating summary…' : 'Generate AI client summary'}
          </button>

          {/* Add note */}
          <div style={{ background: 'var(--bg-page)', borderRadius: 10, padding: 12 }}>
            <div className="flex gap-2 mb-2">
              {Object.entries(NOTE_TYPE_COLORS).filter(([k]) => k !== 'ai_summary').map(([k, v]) => (
                <button key={k} onClick={() => setNoteType(k)}
                  className="text-xs px-2 py-0.5 rounded-full font-semibold transition-all"
                  style={{ background: noteType === k ? v.color + '22' : 'transparent', color: noteType === k ? v.color : 'var(--text-muted)', border: `0.5px solid ${noteType === k ? v.color : 'var(--border)'}` }}>
                  {v.label}
                </button>
              ))}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="field text-sm resize-none mb-2" rows={2} placeholder="Add a note, call log, or visit summary…" />
            <button onClick={addNote} disabled={!note.trim() || addingNote}
              className="text-xs font-bold text-white px-3 py-1.5 rounded-lg disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #4B7BFF, #7B4FE8)', border: 'none', cursor: 'pointer' }}>
              {addingNote ? 'Saving…' : '+ Add note'}
            </button>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Activity timeline</p>
            {timeline.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No activity yet. Notes, quotes, and invoices will appear here.</p>
            ) : (
              <div className="space-y-2">
                {timeline.map((item, i) => {
                  if (item.type === 'note') {
                    const nt = NOTE_TYPE_COLORS[item.data.note_type] || NOTE_TYPE_COLORS.manual;
                    return (
                      <div key={i} className="flex gap-3 text-xs">
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: nt.color, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold" style={{ color: nt.color }}>{nt.label}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{fmtDate(item.date)}</span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.data.note}</p>
                        </div>
                      </div>
                    );
                  }
                  if (item.type === 'quote') {
                    return (
                      <div key={i} className="flex gap-3 text-xs">
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4B7BFF', flexShrink: 0, marginTop: 4 }} />
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText size={10} style={{ color: '#4B7BFF' }} />
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Quote {item.data.number}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{item.data.status} · {fmt(item.data.setup_total)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{fmtDate(item.date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (item.type === 'invoice') {
                    return (
                      <div key={i} className="flex gap-3 text-xs">
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.data.status === 'paid' ? '#00E5C8' : '#7B4FE8', flexShrink: 0, marginTop: 4 }} />
                        <div>
                          <div className="flex items-center gap-2">
                            <Receipt size={10} style={{ color: item.data.status === 'paid' ? '#00E5C8' : '#7B4FE8' }} />
                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Invoice {item.data.number}</span>
                            <span style={{ color: item.data.status === 'paid' ? '#00E5C8' : 'var(--text-muted)' }}>{item.data.status}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{fmt(item.data.amount_due)} · {fmtDate(item.date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {editing && <ContactModal contact={c} accountId={accountId} onClose={() => setEditing(false)}
        onSave={() => { setEditing(false); loadTimeline(); onRefresh(); }} />}
    </div>
  );
}

export default function ContactsPage() {
  const { account } = useAccount();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const result = await api.contacts.list(account.id);
      setContacts(Array.isArray(result) ? result : []);
    } catch {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await api.contacts.delete(id);
    load();
  };

  const filtered = contacts.filter(c =>
    !search || [c.name, c.business, c.email, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)' }}>
          <Plus size={14} /> New client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="field pl-9" placeholder="Search clients…" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={16} className="animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <User size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {search ? 'No clients match your search' : 'No clients yet'}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Add clients here to track their quotes, invoices, and full history in one place.
          </p>
          {!search && (
            <button onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF)' }}>
              <Plus size={14} /> Add first client
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="card-lift flex items-center gap-4 p-4"
              onClick={() => setSelected(c.id)}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4B7BFF, #7B4FE8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                {(c.name?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {c.business && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.business}</span>}
                  {c.email && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.email}</span>}
                  {c.phone && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                  style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={13} />
                </button>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <ContactModal accountId={account?.id} onClose={() => setShowNew(false)}
          onSave={() => { setShowNew(false); load(); }} />
      )}
      {selected && (
        <ContactDetail contactId={selected} accountId={account?.id}
          onClose={() => setSelected(null)} onRefresh={load} />
      )}
    </div>
  );
}
