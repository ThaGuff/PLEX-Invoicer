import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Send, CheckCircle, Bell, Link, Copy, ArrowLeft, Trash2, ExternalLink } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import MarkPaidModal from '../components/MarkPaidModal';
import EngagementTimeline from '../components/EngagementTimeline';
import VersionHistory from '../components/VersionHistory';
import { exportPDF } from '../utils/exportPDF';

function fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }

function getStatus(inv) {
  if (!inv) return 'draft';
  if (inv.status === 'paid' || inv.status === 'cancelled') return inv.status;
  if (inv.due_date && new Date(inv.due_date) < new Date()) return 'overdue';
  return inv.status;
}

const STATUS_COLORS = {
  draft:    '#7A7E85', sent: '#13B5EA', viewed: '#d97706',
  paid: '#16a34a', overdue: '#dc2626', cancelled: '#7A7E85',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAccount();
  const accent = account?.primary_color || '#13B5EA';

  const [invoice, setInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');

  useEffect(() => {
    api.invoices.get(id).then(setInvoice).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const refresh = () => api.invoices.get(id).then(setInvoice);

  const handle = async (label, fn) => {
    setWorking(label);
    try { await fn(); await refresh(); }
    catch (e) { alert(e.message); }
    finally { setWorking(''); }
  };

  const handleMarkPaid = () => handle('paid', () => api.invoices.markPaid(id));
  const handleSend = () => handle('send', async () => {
    const r = await api.invoices.send(id);
    setInvoice(i => ({ ...i, status: 'sent' }));
    if (r.email_sent) setToast({ type: 'success', msg: `✅ Invoice emailed to ${r.client_email || invoice?.client_email}` });
    else if (r.email_error) setToast({ type: 'warn', msg: `⚠️ Marked sent but email failed: ${r.email_error}` });
    else if (!r.has_client_email) setToast({ type: 'info', msg: 'ℹ️ Marked as sent. Add a client email to send automatically.' });
  });
  const handleRemind = () => handle('remind', async () => {
    const r = await api.invoices.remind(id);
    if (r.email_sent) {
      alert('✅ Reminder email sent to ' + invoice?.client_email);
    } else if (r.email_error) {
      alert('⚠️ Reminder logged but email failed: ' + r.email_error);
    } else if (!r.smtp_configured) {
      alert('ℹ️ Reminder logged. SMTP not configured — set SMTP_HOST and SMTP_USER in Railway to enable emails.');
    }
  });
  const handlePaymentLink = () => handle('link', async () => {
    const r = await api.invoices.paymentLink(id);
    await refresh();
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    alert('Link copied!');
  };

  const handleExportPDF = () => {
    if (!invoice) return;
    exportPDF({
      agencyName:    account?.name     || 'Agency',
      agencyEmail:   account?.email    || '',
      agencyPhone:   account?.phone    || '',
      agencyWebsite: account?.website  || '',
      agencyLogoUrl: account?.logo_url || null,
      primaryColor:  accent,
      clientName:    invoice.client_name,
      clientBiz:     invoice.client_biz,
      clientEmail:   invoice.client_email,
      clientPhone:   invoice.client_phone,
      quoteDate:     new Date(invoice.created_at).toLocaleDateString(),
      billingMode:   invoice.billing_mode || 'monthly',
      yearlyDiscount: 15,
      selected:      Object.fromEntries(invoice.items.map(i => [i.id, true])),
      sectionMap:    Object.fromEntries(invoice.items.map(i => [i.id, 'custom'])),
      prices:        Object.fromEntries(invoice.items.map(i => [i.id, { setup: i.setup_price, monthly: i.monthly_price }])),
      included:      Object.fromEntries(invoice.items.map(i => [i.id, !!i.is_included])),
      discType: 'pct', discValue: 0, discSetup: false, discMonthly: false,
      notes: invoice.notes || '',
      customSections: [],
      customItems: invoice.items.map(i => ({ ...i, name: i.name, desc: i.description, setup: i.setup_price, monthly: i.monthly_price })),
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-ink-muted text-sm">Loading...</div>;
  if (!invoice) return <div className="p-8 text-center text-ink-muted">Invoice not found.</div>;

  const status = getStatus(invoice);
  const statusColor = STATUS_COLORS[status] || '#7A7E85';
  const outstanding = invoice.amount_due - (invoice.amount_paid || 0);

  return <>
    <div className="max-w-4xl mx-auto px-5 py-6">
      {/* Back + title */}
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
          <p className="text-sm text-ink-muted">{invoice.client_name}{invoice.client_biz ? ` · ${invoice.client_biz}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-ghost flex items-center gap-1.5 text-sm">
            <Download size={14} /> PDF
          </button>
          <button onClick={handleDelete} className="btn-ghost flex items-center gap-1.5 text-sm text-red-500 hover:bg-red-50">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client + amounts */}
          <div className="card p-5">
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
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
                </p>
                <p className="text-xs text-ink-muted mt-1">Created {new Date(invoice.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-1">
              {invoice.items?.map(item => (
                <div key={item.id} className="flex items-start justify-between py-2 border-b last:border-b-0" style={{ borderColor: '#F0F3F5' }}>
                  <div className="flex-1 min-w-0">
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
            <div className="mt-4 pt-4 border-t space-y-1.5" style={{ borderColor: '#E5E8EB' }}>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Setup total</span>
                <span className="tabular-nums">{fmt(invoice.setup_total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Monthly total</span>
                <span className="tabular-nums">{fmt(invoice.monthly_total)}/mo</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t" style={{ borderColor: '#E5E8EB' }}>
                <span>Amount due</span>
                <span className="tabular-nums" style={{ color: accent }}>{fmt(invoice.amount_due)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Paid</span>
                  <span className="tabular-nums">{fmt(invoice.amount_paid)}</span>
                </div>
              )}
              {outstanding > 0 && invoice.amount_paid > 0 && (
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
                <button onClick={handleCopyLink} className="btn-ghost px-3 py-2 text-xs flex items-center gap-1">
                  <Copy size={12} /> Copy
                </button>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs flex items-center gap-1">
                  <ExternalLink size={12} /> Preview
                </a>
              </div>
            </div>
          )}

          {/* Stripe payment link */}
          {invoice.stripe_payment_link && (
            <div className="card p-4 border-green-200" style={{ borderColor: '#bbf7d0' }}>
              <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wider">Stripe payment link</p>
              <a href={invoice.stripe_payment_link} target="_blank" rel="noreferrer"
                className="text-sm text-green-600 underline break-all">{invoice.stripe_payment_link}</a>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-3">
          <div className="card p-4 space-y-2">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Actions</p>

            {status !== 'paid' && (
              <>
                <button onClick={handleMarkPaid} disabled={!!working}
                  className="w-full flex items-center gap-2 text-sm font-semibold text-white py-2.5 px-4 rounded-lg disabled:opacity-50"
                  style={{ background: '#16a34a' }}>
                  <CheckCircle size={15} /> Mark as paid
                </button>

                <button onClick={handleSend} disabled={!!working}
                  className="w-full flex items-center gap-2 text-sm font-semibold text-white py-2.5 px-4 rounded-lg disabled:opacity-50"
                  style={{ background: accent }}>
                  <Send size={15} /> Mark as sent
                </button>

                <button onClick={handleRemind} disabled={!!working}
                  className="btn-ghost w-full flex items-center gap-2 text-sm">
                  <Bell size={15} /> Send reminder
                </button>

                <button onClick={handlePaymentLink} disabled={!!working}
                  className="btn-ghost w-full flex items-center gap-2 text-sm">
                  <Link size={15} />
                  {invoice.stripe_payment_link ? 'Regenerate Stripe link' : 'Create Stripe payment link'}
                </button>
              </>
            )}

            {status === 'paid' && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle size={16} />
                Paid {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : ''}
              </div>
            )}
          </div>

          {/* F1: Engagement */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Client engagement</p>
            <EngagementTimeline invoiceId={invoice?.id} />
          </div>

          {/* F9: Version history */}
          <div className="card p-4">
            <VersionHistory invoiceId={invoice?.id} />
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
        </div>
      </div>
    </div>
    {showMarkPaid && invoice && (
      <MarkPaidModal
        invoice={invoice}
        onClose={() => setShowMarkPaid(false)}
        onConfirm={confirmMarkPaid}
        saving={saving}
        accent={account?.primary_color || '#13B5EA'}
      />
    )}
  </>;
}
