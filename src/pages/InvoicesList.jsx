import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, ArrowRight, CheckCircle, Send, Bell } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }

function getStatus(inv) {
  if (inv.status === 'paid' || inv.status === 'cancelled') return inv.status;
  if (inv.due_date && new Date(inv.due_date) < new Date()) return 'overdue';
  return inv.status;
}

const STATUS_STYLES = {
  draft:    { bg: '#F5F7F8', color: '#7A7E85' },
  sent:     { bg: '#e8f8fd', color: '#13B5EA' },
  viewed:   { bg: '#fff7e6', color: '#d97706' },
  paid:     { bg: '#f0fdf4', color: '#16a34a' },
  overdue:  { bg: '#fef2f2', color: '#dc2626' },
  cancelled:{ bg: '#F5F7F8', color: '#7A7E85' },
};

export default function InvoicesList() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const accent = account?.primary_color || '#13B5EA';

  useEffect(() => {
    if (!account?.id) return;
    setLoading(true);
    api.invoices.list(account.id).then(setInvoices).catch(console.error).finally(() => setLoading(false));
  }, [account?.id]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this invoice?')) return;
    await api.invoices.delete(id);
    setInvoices(i => i.filter(x => x.id !== id));
  };

  const handleMarkPaid = async (id, e) => {
    e.stopPropagation();
    await api.invoices.markPaid(id);
    setInvoices(i => i.map(x => x.id === id ? { ...x, status: 'paid' } : x));
  };

  const handleRemind = async (id, e) => {
    e.stopPropagation();
    try {
      const r = await api.invoices.remind(id);
      if (r.email_sent) {
        alert('✅ Reminder email sent!');
      } else if (r.email_error) {
        alert('⚠️ Reminder logged but email failed: ' + r.email_error);
      } else {
        alert('ℹ️ Reminder logged. Configure SMTP in Railway to send real emails.');
      }
    } catch (err) { alert(err.message); }
  };

  const filtered = invoices.filter(inv => {
    const status = getStatus(inv);
    const matchSearch = !search || [inv.client_name, inv.client_biz, inv.number]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Invoices</h1>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices..." className="field pl-8 text-sm" />
        </div>
        <div className="flex gap-1">
          {['all','draft','sent','overdue','paid'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors"
              style={{ background: filter === s ? accent : '#F5F7F8', color: filter === s ? '#fff' : '#7A7E85' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-muted text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-ink-muted">No invoices found. Convert a quote to create one.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-ink-muted uppercase tracking-wider" style={{ borderColor: '#E5E8EB', background: '#F5F7F8' }}>
                <th className="px-5 py-3 text-left">Invoice #</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-left">Due</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const status = getStatus(inv);
                const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
                return (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    style={{ borderColor: '#F0F3F5' }}>
                    <td className="px-5 py-3 text-sm font-semibold text-ink">{inv.number}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-ink">{inv.client_name || '—'}</p>
                      {inv.client_biz && <p className="text-xs text-ink-muted">{inv.client_biz}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-right tabular-nums">{fmt(inv.amount_due)}</td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums text-green-600">{fmt(inv.amount_paid)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: s.bg, color: s.color }}>{status}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-muted">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {status !== 'paid' && (
                          <>
                            <button onClick={e => handleMarkPaid(inv.id, e)}
                              className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Mark paid">
                              <CheckCircle size={13} />
                            </button>
                            <button onClick={e => handleRemind(inv.id, e)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="Send reminder">
                              <Bell size={13} />
                            </button>
                          </>
                        )}
                        <button onClick={e => handleDelete(inv.id, e)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-400" title="Delete">
                          <Trash2 size={13} />
                        </button>
                        <button onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="p-1.5 rounded hover:bg-gray-100 text-ink-muted">
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
