import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, X, Check, Mail, Phone, Building } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

function ContactForm({ initial = {}, onSave, onCancel }) {
  const [v, setV] = useState({
    name: initial.name || '', business: initial.business || '',
    email: initial.email || '', phone: initial.phone || '',
    address: initial.address || '', notes: initial.notes || '',
  });
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-muted block mb-1">Name *</label>
          <input value={v.name} onChange={e => set('name', e.target.value)} className="field text-sm" placeholder="Jane Smith" />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Business</label>
          <input value={v.business} onChange={e => set('business', e.target.value)} className="field text-sm" placeholder="Acme Co." />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Email</label>
          <input type="email" value={v.email} onChange={e => set('email', e.target.value)} className="field text-sm" placeholder="jane@acme.com" />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Phone</label>
          <input value={v.phone} onChange={e => set('phone', e.target.value)} className="field text-sm" placeholder="(256) 000-0000" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-ink-muted block mb-1">Address</label>
          <input value={v.address} onChange={e => set('address', e.target.value)} className="field text-sm" placeholder="123 Main St, Huntsville AL" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-ink-muted block mb-1">Notes</label>
          <textarea value={v.notes} onChange={e => set('notes', e.target.value)} className="field text-sm resize-none" rows={2} placeholder="Any notes about this contact..." />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => v.name && onSave(v)} disabled={!v.name}
          className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5 disabled:opacity-40">
          <Check size={13} /> Save
        </button>
        {onCancel && <button onClick={onCancel} className="btn-ghost py-1.5 px-3 text-sm">Cancel</button>}
      </div>
    </div>
  );
}

export default function Contacts() {
  const { account } = useAccount();
  const accent = account?.primary_color || '#13B5EA';
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (!account?.id) return;
    api.contacts.list(account.id).then(setContacts).catch(console.error).finally(() => setLoading(false));
  }, [account?.id]);

  const handleAdd = async (data) => {
    const created = await api.contacts.create({ ...data, account_id: account.id });
    setContacts(c => [created, ...c]);
    setShowAdd(false);
  };

  const handleUpdate = async (id, data) => {
    const updated = await api.contacts.update(id, data);
    setContacts(c => c.map(x => x.id === id ? updated : x));
    setEditId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await api.contacts.delete(id);
    setContacts(c => c.filter(x => x.id !== id));
  };

  const filtered = contacts.filter(c =>
    !search || [c.name, c.business, c.email, c.phone]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Contacts</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg"
          style={{ background: accent }}>
          <Plus size={14} /> Add contact
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink">New contact</p>
            <button onClick={() => setShowAdd(false)}><X size={16} className="text-ink-muted" /></button>
          </div>
          <ContactForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..." className="field pl-8 text-sm max-w-xs" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-muted text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-ink-muted">No contacts yet.</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: accent }}>
            Add your first contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="card p-4">
              {editId === c.id ? (
                <ContactForm initial={c} onSave={data => handleUpdate(c.id, data)} onCancel={() => setEditId(null)} />
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{c.name}</p>
                      {c.business && (
                        <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                          <Building size={11} /> {c.business}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditId(c.id)} className="p-1 text-ink-muted hover:text-ink"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 text-ink-muted hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
                        <Mail size={11} /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
                        <Phone size={11} /> {c.phone}
                      </a>
                    )}
                  </div>
                  {c.notes && <p className="text-xs text-ink-muted mt-2 italic">{c.notes}</p>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
