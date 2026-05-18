import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

const STATUS_STYLES = {
  draft:    { bg: '#F5F7F8', color: '#7A7E85' },
  sent:     { bg: '#e8f8fd', color: '#13B5EA' },
  viewed:   { bg: '#fff7e6', color: '#d97706' },
  accepted: { bg: '#f0fdf4', color: '#16a34a' },
  cancelled:{ bg: '#fef2f2', color: '#dc2626' },
};

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }

export default function QuotesList() {
  const { account } = useAccount();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const accent = account?.primary_color || '#13B5EA';

  useEffect(() => {
    if (!account?.id) return;
    setLoading(true);
    api.quotes.list(account.id).then(setQuotes).catch(console.error).finally(() => setLoading(false));
  }, [account?.id]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this quote?')) return;
    await api.quotes.delete(id);
    setQuotes(q => q.filter(x => x.id !== id));
  };

  const handleConvert = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Convert this quote to an invoice?')) return;
    try {
      const inv = await api.quotes.convert(id);
      setQuotes(q => q.map(x => x.id === id ? { ...x, status: 'accepted' } : x));
      navigate(`/invoices/${inv.id}`);
    } catch (err) { alert(err.message); }
  };

  const filtered = quotes.filter(q => {
    const matchSearch = !search || [q.client_name, q.client_biz, q.number]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || q.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Quotes</h1>
        <button onClick={() => navigate('/quotes/new')}
          className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg"
          style={{ background: accent }}>
          <Plus size={14} /> New quote
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search quotes..." className="field pl-8 text-sm" />
        </div>
        <div className="flex gap-1">
          {['all','draft','sent','viewed','accepted'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors"
              style={{
                background: filter === s ? accent : '#F5F7F8',
                color: filter === s ? '#fff' : '#7A7E85',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-muted text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <FileText size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-ink">No quotes found</p>
          <button onClick={() => navigate('/quotes/new')}
            className="mt-4 text-sm font-semibold px-5 py-2 rounded-lg text-white" style={{ background: accent }}>
            Create your first quote
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-ink-muted uppercase tracking-wider" style={{ borderColor: '#E5E8EB', background: '#F5F7F8' }}>
                <th className="px-5 py-3 text-left">Quote #</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-right">Setup</th>
                <th className="px-5 py-3 text-right">Monthly</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => {
                const s = STATUS_STYLES[q.status] || STATUS_STYLES.draft;
                return (
                  <tr key={q.id} onClick={() => navigate(`/quotes/${q.id}`)}
                    className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    style={{ borderColor: '#F0F3F5' }}>
                    <td className="px-5 py-3 text-sm font-semibold text-ink">{q.number}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-ink">{q.client_name || '—'}</p>
                      {q.client_biz && <p className="text-xs text-ink-muted">{q.client_biz}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums">{fmt(q.setup_total)}</td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums">{fmt(q.monthly_total)}/mo</td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: s.bg, color: s.color }}>{q.status}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-muted">
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {q.status !== 'accepted' && (
                          <button onClick={e => handleConvert(q.id, e)}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg text-white transition-colors hover:opacity-90"
                            style={{ background: '#22c55e' }}
                            title="Convert to invoice">
                            <ArrowRight size={11} /> Invoice
                          </button>
                        )}
                        <button onClick={e => handleDelete(q.id, e)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-400" title="Delete">
                          <Trash2 size={13} />
                        </button>
                        <button onClick={() => navigate(`/quotes/${q.id}`)}
                          className="p-1.5 rounded hover:bg-gray-100 text-ink-muted" title="Open">
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
