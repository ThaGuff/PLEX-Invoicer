import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Send, CheckCircle, Bell, Link, Copy, ArrowLeft, Trash2, ExternalLink } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import MarkPaidModal from '../components/MarkPaidModal';
import EngagementTimeline from '../components/EngagementTimeline';
import VersionHistory from '../components/VersionHistory';

function fmt(n) { return '$' + (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function getStatus(inv) {
  if (!inv) return 'draft';
  if (inv.status === 'paid' || inv.status === 'cancelled') return inv.status;
  if (inv.due_date && new Date(inv.due_date) < new Date()) return 'overdue';
  return inv.status;
}

const STATUS_COLORS = {
  draft: '#7A7E85', sent: '#13B5EA', viewed: '#d97706',
  paid: '#16a34a', overdue: '#dc2626', cancelled: '#7A7E85',
};

const PAYMENT_METHOD_LABELS = {
  stripe: 'Stripe', square: 'Square', paypal: 'PayPal', zelle: 'Zelle',
  venmo: 'Venmo', check: 'Check', cash: 'Cash', ach: 'ACH/Wire', other: 'Other',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAccount();
  const accent = account?.primary_color || '#13B5EA';

  const [invoice, setInvoice]       = useState(null);
  const [items, setItems]           = useState([]);
  const [toast, setToast]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [working, setWorking]       = useState('');
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    api.invoices.get(id)
      .then(data => {
        setInvoice(data);
        setItems(data.items || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = () => api.invoices.get(id).then(data => { setInvoice(data); setItems(data.items || []); });

  const handle = async (label, fn) => {
    setWorking(label);
    try { await fn(); await refresh(); }
    catch (e) { setToast({ type: 'warn', msg: '⚠️ ' + e.message }); }
    finally { setWorking(''); }
  };

  const confirmMarkPaid = async (paymentData) => {
    setSaving(true);
    try {
      await api.invoices.markPaid(id, paymentData);
      await refresh();
      setShowMarkPaid(false);
      const method = PAYMENT_METHOD_LABELS[paymentData.payment_method] || paymentData.payment_method;
      setToast({ type: 'success', msg: `✅ Payment of ${fmt(paymentData.amount)} recorded via ${method}` });
    } catch (e) {
      setToast({ type: 'warn', msg: '⚠️ ' + e.message });
    }
    setSaving(false);
  };

  const handleSend = () => handle('send', async () => {
    const r = await api.invoices.send(id);
    if (r.email_sent) setToast({ type: 'success', msg: `✅ Invoice emailed to ${r.client_email || invoice?.client_email}` });
    else if (r.email_error) setToast({ type: 'warn', msg: `⚠️ Marked sent but email failed: ${r.email_error}` });
    else if (!r.has_client_email) setToast({ type: 'info', msg: 'ℹ️ Marked as sent. Add a client email to send automatically.' });
  });

  const handleRemind = () => handle('remind', async () => {
    const r = await api.invoices.remind(id);
    if (r.email_sent) setToast({ type: 'success', msg: '✅ Reminder sent to ' + invoice?.client_email });
    else setToast({ type: 'info', msg: 'ℹ️ Reminder logged. Configure SMTP in Railway to send emails.' });
  });

  const handlePaymentLink = () => handle('link', async () => {
    const r = await api.invoices.paymentLink(id);
    window.open(r.payment_link, '_blank');
  });

  const handleDelete = async () => {
    if (!confirm('Delete this invoice permanently?')) return;
    await api.invoices.delete(id);
    navigate('/invoices');
  };

  const publicUrl = invoice?.public_token
    ? `${window.location.origin}/portal/invoice/${invoice.public_token}`
    : null;

  if (loading) return <div className="flex items-center justify-center h-64 text-ink-muted text-sm">Loading...</div>;
  if (!invoice) return <div className="p-8 text-center text-ink-muted">Invoice not found.</div>;

  const status = getStatus(invoice);
  const statusColor = STATUS_COLORS[status] || '#7A7E85';
  const taxAmount = parseFloat(invoice.tax_amount || 0);
  const taxRate   = parseFloat(invoice.tax_rate   || 0);
  const fee       = parseFloat(invoice.processing_fee || 0);
  const amountDue = parseFloat(invoice.amount_due || 0);
  const amountPaid = parseFloat(invoice.amount_paid || 0);
  const outstanding = amountDue - amountPaid;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white max-w-sm"
          style={{ background: toast.type === 'success' ? '#16a34a' : toast.type === 'warn' ? '#dc2626' : '#13B5EA' }}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/invoices')} className="text-ink-muted hover:text-ink">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-ink">{invoice.number}</h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                style={{ background: statusColor + '18', color: statusColor }}>{status}</span>
            </div>
            <p className="text-sm text-ink-muted">
              {invoice.client_name}{invoice.client_biz ? ` · ${invoice.client_biz}` : ''}
              {invoice.payment_method && status === 'paid' &&
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  via {PAYMENT_METHOD_LABELS[invoice.payment_method] || invoice.payment_method}
                </span>
              }
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="btn-ghost flex items-center gap-1.5 text-sm text-red-500 hover:bg-red-50">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5">
              {/* Client + dates */}
              <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b" style={{ borderColor: '#E5E8EB' }}>
                <div>
                  <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Bill to</p>
                  <p className="text-sm font-semibold text-ink">{invoice.client_name || '—'}</p>
                  {invoice.client_biz && <p className="text-xs text-ink-muted">{invoice.client_biz}</p>}
                  {invoice.client_email && <p className="text-xs text-ink-muted">{invoice.client_email}</p>}
                  {invoice.client_phone && <p className="text-xs text-ink-muted">{invoice.client_phone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Due date</p>
                  <p className="text-sm font-semibold text-ink">
                    {invoice.due_date ? new Date(invoice.due_date + 'T00:00:00').toLocaleDateString() : '—'}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">Invoice #{invoice.number}</p>
                </div>
              </div>

              {/* Line items */}
              <div className="space-y-1 mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-start justify-between py-2 border-b last:border-b-0" style={{ borderColor: '#F0F3F5' }}>
                    <div className="flex-1 min-w-0">
                      {item.section_label && <p className="text-xs text-ink-muted mb-0.5">{item.section_label}</p>}
                      <p className="text-sm font-medium text-ink">{item.name}</p>
                      {item.description && <p className="text-xs text-ink-muted">{item.description}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {item.is_included ? (
                        <span className="text-xs text-green-600 font-medium">Included</span>
                      ) : (
                        <>
                          {item.setup_price > 0 && <p className="text-xs text-ink-muted">{fmt(item.setup_price)} setup</p>}
                          {item.monthly_price > 0 && <p className="text-sm font-medium text-ink">{fmt(item.monthly_price)}/mo</p>}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: '#E5E8EB' }}>
                {invoice.setup_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Setup total</span>
                    <span className="tabular-nums">{fmt(invoice.setup_total)}</span>
                  </div>
                )}
                {invoice.monthly_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Monthly total</span>
                    <span className="tabular-nums">{fmt(invoice.monthly_total)}/mo</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Tax ({taxRate}%)</span>
                    <span className="tabular-nums text-red-600">{fmt(taxAmount)}</span>
                  </div>
                )}
                {fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Processing fee</span>
                    <span className="tabular-nums text-purple-600">{fmt(fee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t" style={{ borderColor: '#E5E8EB' }}>
                  <span>Amount due</span>
                  <span className="tabular-nums" style={{ color: accent }}>{fmt(amountDue)}</span>
                </div>
                {amountPaid > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Paid {invoice.payment_method ? `(${PAYMENT_METHOD_LABELS[invoice.payment_method] || invoice.payment_method})` : ''}</span>
                    <span className="tabular-nums">{fmt(amountPaid)}</span>
                  </div>
                )}
                {invoice.net_amount > 0 && status === 'paid' && (
                  <div className="flex justify-between text-sm font-semibold text-green-700">
                    <span>Net to you</span>
                    <span className="tabular-nums">{fmt(invoice.net_amount)}</span>
                  </div>
                )}
                {outstanding > 0.01 && amountPaid > 0 && (
                  <div className="flex justify-between text-sm font-bold text-red-600">
                    <span>Outstanding</span>
                    <span className="tabular-nums">{fmt(outstanding)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Public link */}
            {publicUrl && (
              <div className="card p-4">
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Client portal link</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={publicUrl} className="field text-xs flex-1 bg-gray-50" />
                  <button onClick={() => { navigator.clipboard.writeText(publicUrl); setToast({ type: 'success', msg: '✅ Link copied!' }); }}
                    className="btn-ghost px-3 py-2 text-xs flex items-center gap-1">
                    <Copy size={12} /> Copy
                  </button>
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs flex items-center gap-1">
                    <ExternalLink size={12} /> Preview
                  </a>
                </div>
              </div>
            )}

            {/* Engagement */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Client engagement</p>
              <EngagementTimeline invoiceId={invoice?.id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            {/* Actions */}
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Actions</p>
              {status !== 'paid' && (
                <>
                  <button onClick={() => setShowMarkPaid(true)} disabled={!!working}
                    className="w-full flex items-center gap-2 text-sm font-semibold text-white py-2.5 px-4 rounded-lg disabled:opacity-50"
                    style={{ background: '#16a34a' }}>
                    <CheckCircle size={15} /> Mark as paid
                  </button>
                  <button onClick={handleSend} disabled={!!working}
                    className="w-full flex items-center gap-2 text-sm font-semibold text-white py-2.5 px-4 rounded-lg disabled:opacity-50"
                    style={{ background: accent }}>
                    <Send size={15} /> {working === 'send' ? 'Sending…' : 'Mark as sent'}
                  </button>
                  <button onClick={handleRemind} disabled={!!working}
                    className="btn-ghost w-full flex items-center gap-2 text-sm">
                    <Bell size={15} /> Send reminder
                  </button>
                  <button onClick={handlePaymentLink} disabled={!!working}
                    className="btn-ghost w-full flex items-center gap-2 text-sm">
                    <Link size={15} />
                    {invoice.stripe_payment_link ? 'Regenerate Stripe link' : 'Create Stripe link'}
                  </button>
                </>
              )}
              {status === 'paid' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle size={16} />
                    Paid {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : ''}
                  </div>
                  {invoice.payment_method && (
                    <div className="text-xs text-ink-muted">
                      Method: <strong>{PAYMENT_METHOD_LABELS[invoice.payment_method] || invoice.payment_method}</strong>
                      {invoice.payment_reference && <span> · Ref: {invoice.payment_reference}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Timeline</p>
              <div className="space-y-2 text-xs text-ink-muted">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                </div>
                {invoice.sent_at && <div className="flex justify-between">
                  <span>Sent</span><span>{new Date(invoice.sent_at).toLocaleDateString()}</span>
                </div>}
                {invoice.viewed_at && <div className="flex justify-between">
                  <span className="text-amber-600 font-medium">Viewed by client</span>
                  <span>{new Date(invoice.viewed_at).toLocaleDateString()}</span>
                </div>}
                {invoice.paid_at && <div className="flex justify-between text-green-600 font-medium">
                  <span>Paid</span><span>{new Date(invoice.paid_at).toLocaleDateString()}</span>
                </div>}
              </div>
            </div>

            <div className="card p-4">
              <VersionHistory invoiceId={invoice?.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Mark Paid Modal */}
      {showMarkPaid && (
        <MarkPaidModal
          invoice={{ ...invoice, amount_due: amountDue }}
          onClose={() => setShowMarkPaid(false)}
          onConfirm={confirmMarkPaid}
          saving={saving}
          accent={accent}
        />
      )}
    </>
  );
}
