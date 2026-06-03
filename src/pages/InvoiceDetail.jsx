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
  const [showPreview, setShowPreview]     = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendMode, setSendMode]           = useState('smtp');
  const [emailTo, setEmailTo]             = useState('');
  const [emailSubject, setEmailSubject]   = useState('');
  const [emailBody, setEmailBody]         = useState('');

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    api.invoices.get(id)
      .then(data => {
        if (data?.error) { console.error('Invoice fetch error:', data.error); setLoading(false); return; }
        setInvoice(data);
        setItems(data.items || []);
        setEmailTo(data.client_email || '');
        setEmailSubject(`Invoice ${data.number} — ${data.agency_name || 'Revanew'}`);
        const link = `${window.location.origin}/portal/invoice/${data.public_token}`;
        setEmailBody(`Hi ${data.client_name || 'there'},

Please review and sign your invoice here:
${link}

Total due: $${Math.round(data.amount_due||0).toLocaleString()}

Thank you!`);
      })
      .catch(e => { console.error('Invoice fetch error:', e); })
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

  const handleSend = () => setShowSendModal(true);
  const handleSendConfirm = () => handle('send', async () => {
    const r = await api.invoices.send(id, { email_to: emailTo, email_subject: emailSubject, email_body: emailBody, mode: sendMode });
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
  if (!invoice) return (
    <div style={{ padding:48, textAlign:'center' }}>
      <p style={{ color:'var(--text-muted)', marginBottom:16 }}>
        {loading ? 'Loading invoice…' : 'Invoice not found or you do not have access to it.'}
      </p>
      {!loading && <button onClick={() => window.history.back()} style={{ padding:'8px 20px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', color:'var(--text-primary)' }}>← Go back</button>}
    </div>
  );

  const status = getStatus(invoice);
  const statusColor = STATUS_COLORS[status] || '#7A7E85';
  const taxAmount = parseFloat(invoice.tax_amount || 0);
  const taxRate   = parseFloat(invoice.tax_rate   || 0);
  const fee       = parseFloat(invoice.processing_fee || 0);
  const amountDue = parseFloat(invoice.amount_due || 0);
  const amountPaid = parseFloat(invoice.amount_paid || 0);
  const outstanding = amountDue - amountPaid;

  const publicUrl2 = invoice?.public_token
    ? `${window.location.origin}/portal/invoice/${invoice.public_token}`
    : '';

  return (
    <>
      {/* Issue 2: In-app preview modal */}
      {showPreview && (
        <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(11,18,32,0.7)',backdropFilter:'blur(4px)',display:'flex',flexDirection:'column',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          <div style={{background:'var(--bg-surface)',borderBottom:'1px solid var(--border)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:12}}>
            <div>
              <p style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>Invoice Preview</p>
              <p style={{fontSize:11,color:'var(--text-muted)'}}>← Back button returns to app</p>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <a href={publicUrl2} target="_blank" rel="noreferrer"
                style={{fontSize:12,fontWeight:600,color:'var(--blue)',textDecoration:'none',padding:'6px 10px',border:'1px solid var(--border)',borderRadius:8,background:'var(--bg-page)'}}>
                Open tab ↗
              </a>
              <button onClick={() => setShowPreview(false)}
                style={{padding:'8px 14px',background:'linear-gradient(135deg,var(--blue),var(--teal))',color:'#fff',border:'none',borderRadius:9,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                ← Back
              </button>
            </div>
          </div>
          <iframe src={publicUrl2} style={{flex:1,border:'none',width:'100%'}} title="Invoice Preview" />
        </div>
      )}

      {/* Issue 3: Send email modal with 3 modes */}
      {showSendModal && (
        <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(11,18,32,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          <div style={{background:'var(--bg-surface)',borderRadius:'20px 20px 0 0',padding:'20px 20px calc(20px + env(safe-area-inset-bottom))',width:'100%',maxHeight:'92dvh',overflowY:'auto',boxSizing:'border-box'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{fontSize:18,fontWeight:800,color:'var(--text-primary)'}}>Send Invoice</h3>
              <button onClick={() => setShowSendModal(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--text-muted)',lineHeight:1}}>✕</button>
            </div>
            {/* Mode tabs */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:18}}>
              {[['smtp','📧 Built-in'],['external','🔗 Copy Link'],['gmail','📨 Gmail']].map(([mode,label]) => (
                <button key={mode} onClick={() => setSendMode(mode)}
                  style={{padding:'10px 6px',borderRadius:10,border:`2px solid ${sendMode===mode?'var(--blue)':'var(--border)'}`,background:sendMode===mode?'rgba(37,99,235,0.08)':'transparent',color:sendMode===mode?'var(--blue)':'var(--text-secondary)',fontSize:12,fontWeight:sendMode===mode?700:500,cursor:'pointer',transition:'all 0.15s',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  {label}
                </button>
              ))}
            </div>

            {sendMode === 'external' && (
              <div>
                <p style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',marginBottom:10}}>Share this link with your client</p>
                <div style={{display:'flex',gap:8}}>
                  <input readOnly value={publicUrl2} style={{flex:1,padding:'11px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg-raised)',color:'var(--text-muted)',fontSize:12,fontFamily:'monospace',minWidth:0}} />
                  <button onClick={() => { navigator.clipboard.writeText(publicUrl2); }}
                    style={{padding:'11px 14px',background:'linear-gradient(135deg,var(--blue),var(--teal))',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif",flexShrink:0}}>
                    Copy
                  </button>
                </div>
                <p style={{fontSize:11,color:'var(--text-muted)',marginTop:8}}>Paste in any email, iMessage, or messaging app. Client can view, sign, and pay from any device.</p>
              </div>
            )}

            {sendMode === 'gmail' && (
              <div>
                <p style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',marginBottom:10}}>Open Gmail with invoice pre-filled</p>
                <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                  target="_blank" rel="noreferrer"
                  onClick={() => setShowSendModal(false)}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'14px',background:'#EA4335',color:'#fff',borderRadius:12,textDecoration:'none',fontSize:15,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  ✉ Open in Gmail ↗
                </a>
                <p style={{fontSize:11,color:'var(--text-muted)',marginTop:8}}>Opens Gmail in your browser with recipient, subject, and message pre-filled. Review and send from your Gmail.</p>
              </div>
            )}

            {sendMode === 'smtp' && (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.8px',display:'block',marginBottom:6}}>To</label>
                  <input value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="client@email.com" className="field" style={{fontSize:14}} />
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.8px',display:'block',marginBottom:6}}>Subject</label>
                  <input value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} className="field" style={{fontSize:14}} />
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.8px',display:'block',marginBottom:6}}>Message</label>
                  <textarea value={emailBody} onChange={e=>setEmailBody(e.target.value)} rows={5} className="field" style={{fontSize:13,resize:'vertical'}} />
                </div>
                <button onClick={() => { handleSendConfirm(); setShowSendModal(false); }} disabled={!emailTo.trim() || !!working}
                  style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,var(--blue),var(--teal))',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:'pointer',opacity:!emailTo.trim()||!!working?0.5:1,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  {working==='send' ? 'Sending…' : 'Send Invoice'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content / Toast */}
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
                  <button onClick={() => setShowPreview(true)} className="btn-ghost px-3 py-2 text-xs flex items-center gap-1" style={{border:"none",background:"none",cursor:"pointer"}}>
                    <ExternalLink size={12} /> Preview
                  </button>
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
                    <Send size={15} /> {working === 'send' ? 'Sending…' : 'Send & Mark Sent'}
                  </button>
                  <button onClick={handleSend} disabled={!!working}
                    className="btn-ghost w-full flex items-center gap-2 text-sm">
                    <Send size={15} /> Send Invoice
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
