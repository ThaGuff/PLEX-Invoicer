/**
 * PublicInvoice — Client-facing invoice with e-signature and legal disclaimer
 * Mobile-first: review → sign → done flow matching PublicQuote UX
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Shield, FileText, PenLine, X, Check } from 'lucide-react';
import { api } from '../utils/api';

const GRAD = '#C8E20A';
function fmt(n) { return '$' + Math.round(n||0).toLocaleString(); }
function fmtDate(s) { if(!s) return ''; try { return new Date(s).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}); } catch { return s; } }

/* ── Touch-friendly signature canvas ─────────────────────────────── */
function SignatureCanvas({ onCapture }) {
  const ref = useRef();
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * (canvas.width / rect.width), y: (src.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = useCallback(e => { e.preventDefault(); drawing.current = true; const ctx = ref.current.getContext('2d'); const {x,y} = getPos(e, ref.current); ctx.beginPath(); ctx.moveTo(x,y); }, []);
  const move  = useCallback(e => { if (!drawing.current) return; e.preventDefault(); const ctx = ref.current.getContext('2d'); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#0F172A'; const {x,y} = getPos(e, ref.current); ctx.lineTo(x,y); ctx.stroke(); setHasDrawn(true); }, []);
  const end   = useCallback(() => { drawing.current = false; if (hasDrawn && ref.current) onCapture(ref.current.toDataURL('image/png')); }, [hasDrawn, onCapture]);
  const clear = () => { const ctx = ref.current.getContext('2d'); ctx.clearRect(0, 0, ref.current.width, ref.current.height); setHasDrawn(false); onCapture(null); };

  return (
    <div style={{ position:'relative' }}>
      <canvas ref={ref} width={480} height={140}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        style={{ width:'100%', height:140, borderRadius:10, border:'1.5px solid #CBD5E1', background:'#fff', cursor:'crosshair', touchAction:'none', display:'block' }} />
      <button onClick={clear} style={{ position:'absolute', top:8, right:8, background:'rgba(100,116,139,0.12)', border:'none', borderRadius:7, padding:'4px 10px', fontSize:11, fontWeight:600, color:'#64748B', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
        Clear
      </button>
      <p style={{ fontSize:10, color:'#94A3B8', textAlign:'center', marginTop:6 }}>Draw your signature above</p>
    </div>
  );
}

export default function PublicInvoice() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice,  setInvoice]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [step,     setStep]     = useState('review'); // 'review' | 'sign' | 'done'
  const [sigMode,  setSigMode]  = useState('draw');   // 'draw' | 'type'
  const [sigData,  setSigData]  = useState(null);
  const [sigName,  setSigName]  = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sigError, setSigError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.tracking.view(token).catch(() => {});
    const hb = setInterval(() => api.tracking.heartbeat(token, 30).catch(() => {}), 30000);
    return () => clearInterval(hb);
  }, [token]);

  useEffect(() => {
    api.invoices.getPublic(token)
      .then(inv => { setInvoice(inv); if (inv.status === 'paid') setStep('done'); })
      .catch(() => setError('Invoice not found or link has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const justPaid = searchParams.get('paid') === '1';

  const handleAccept = async () => {
    setSigError('');
    if (!fullName.trim()) { setSigError('Please enter your full legal name.'); return; }
    if (sigMode === 'draw' && !sigData) { setSigError('Please draw your signature.'); return; }
    if (sigMode === 'type' && !sigName.trim()) { setSigError('Please type your name to sign.'); return; }
    setSubmitting(true);
    try {
      const tok = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
      await fetch(`/api/invoices/public/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({
          signature_data: sigMode === 'draw' ? sigData : null,
          signer_name: fullName.trim(),
          typed_signature: sigMode === 'type' ? sigName.trim() : null,
          signed_at: new Date().toISOString(),
        }),
      });
      setStep('done');
    } catch(e) { setSigError('Submission failed. Please try again.'); }
    setSubmitting(false);
  };

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #C8E20A', borderTopColor:'transparent', animation:'spin 0.7s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', padding:20 }}>
      <div style={{ textAlign:'center' }}>
        <AlertCircle size={40} style={{ color:'#DC2626', margin:'0 auto 12px' }} />
        <p style={{ fontSize:16, fontWeight:700, color:'#0F172A' }}>{error}</p>
      </div>
    </div>
  );

  const isPaid = invoice.status === 'paid' || justPaid;
  const isAccepted = invoice.status === 'accepted' || step === 'done';

  const groupedItems = {};
  (invoice.items || []).forEach(item => {
    const key = item.section_label || 'Services';
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  });

  /* ── DONE state ─────────────────────────────────────────────────── */
  if (step === 'done' || isPaid) return (
    <div style={{ minHeight:'100dvh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ maxWidth:440, width:'100%', textAlign:'center' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 8px 32px rgba(37,99,235,0.3)' }}>
          <CheckCircle size={36} color="#fff" />
        </div>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#0F172A', marginBottom:10, letterSpacing:'-0.04em' }}>
          {isPaid ? 'Payment received!' : 'Invoice accepted!'}
        </h1>
        <p style={{ fontSize:14, color:'#64748B', lineHeight:1.7, marginBottom:24 }}>
          {isPaid
            ? `Thank you for your payment of ${fmt(invoice.amount_due)}. A receipt has been sent to ${invoice.client_email}.`
            : `Your signature has been recorded. ${invoice.agency_name || 'The business'} will follow up with next steps.`}
        </p>
        <div style={{ background:'#fff', border:'1px solid #CBD5E1', borderRadius:14, padding:'16px 20px', textAlign:'left' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Invoice summary</p>
          <p style={{ fontSize:13, color:'#334155', marginBottom:4 }}><strong>Invoice #:</strong> {invoice.number}</p>
          <p style={{ fontSize:13, color:'#334155', marginBottom:4 }}><strong>Amount:</strong> {fmt(invoice.amount_due)}</p>
          <p style={{ fontSize:13, color:'#334155' }}><strong>Date:</strong> {fmtDate(invoice.created_at)}</p>
        </div>
      </div>
    </div>
  );

  /* ── Step indicator ─────────────────────────────────────────────── */
  const StepBar = () => (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24 }}>
      {['review','sign'].map((s,i) => (
        <React.Fragment key={s}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700,
              background: step===s ? GRAD : (i===0&&step==='sign') ? '#C8E20A' : '#E2E8F0',
              color: (step===s||(i===0&&step==='sign')) ? '#fff' : '#94A3B8', transition:'all 0.3s' }}>
              {i===0&&step==='sign' ? <Check size={13}/> : i+1}
            </div>
            <span style={{ fontSize:12, fontWeight: step===s?700:500, color: step===s?'#C8E20A':'#94A3B8' }}>
              {s==='review'?'Review':'Sign'}
            </span>
          </div>
          {i===0 && <div style={{ flex:1, height:2, background: step==='sign'?GRAD:'#E2E8F0', margin:'0 10px', borderRadius:1, transition:'background 0.3s' }}/>}
        </React.Fragment>
      ))}
    </div>
  );

  /* ── REVIEW step ────────────────────────────────────────────────── */
  if (step === 'review') return (
    <div style={{ minHeight:'100dvh', background:'#F8FAFC', fontFamily:"'Inter',sans-serif", paddingBottom:40 }}>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'20px 16px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <FileText size={20} style={{ color:'#C8E20A' }} />
            <span style={{ fontSize:13, fontWeight:600, color:'#64748B' }}>Invoice from {invoice.agency_name || 'Invoice King'}</span>
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#0F172A', letterSpacing:'-0.04em', marginBottom:6 }}>
            {invoice.number}
          </h1>
          <p style={{ fontSize:32, fontWeight:800, color:'#0F172A', letterSpacing:'-0.04em' }}>{fmt(invoice.amount_due)}</p>
          <p style={{ fontSize:13, color:'#64748B', marginTop:4 }}>Due {fmtDate(invoice.due_date)}</p>
        </div>

        <StepBar />

        {/* Client info */}
        <div style={{ background:'#fff', border:'1px solid #CBD5E1', borderRadius:14, padding:'16px 20px', marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>Billed to</p>
          <p style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{invoice.client_name}</p>
          {invoice.client_biz && <p style={{ fontSize:13, color:'#334155', marginTop:2 }}>{invoice.client_biz}</p>}
          {invoice.client_email && <p style={{ fontSize:13, color:'#64748B', marginTop:2 }}>{invoice.client_email}</p>}
        </div>

        {/* Line items */}
        {Object.entries(groupedItems).map(([section, items]) => (
          <div key={section} style={{ background:'#fff', border:'1px solid #CBD5E1', borderRadius:14, padding:'16px 20px', marginBottom:12 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:12 }}>{section}</p>
            {items.map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom: i<items.length-1 ? '1px solid #F1F5F9' : 'none', gap:12 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{item.name}</p>
                  {item.description && <p style={{ fontSize:12, color:'#64748B', marginTop:2, lineHeight:1.5 }}>{item.description}</p>}
                </div>
                <p style={{ fontSize:13, fontWeight:700, color:'#0F172A', flexShrink:0 }}>{fmt(item.unit_price * (item.quantity||1))}</p>
              </div>
            ))}
          </div>
        ))}

        {/* Totals */}
        <div style={{ background:'#fff', border:'1px solid #CBD5E1', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
          {invoice.tax_rate > 0 && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, color:'#64748B' }}>Subtotal</span>
                <span style={{ fontSize:13, color:'#334155', fontWeight:600 }}>{fmt((invoice.amount_due||0) - (invoice.tax_amount||0))}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, paddingBottom:8, borderBottom:'1px solid #F1F5F9' }}>
                <span style={{ fontSize:13, color:'#64748B' }}>Tax ({invoice.tax_rate}%)</span>
                <span style={{ fontSize:13, color:'#334155', fontWeight:600 }}>{fmt(invoice.tax_amount)}</span>
              </div>
            </>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:15, fontWeight:800, color:'#0F172A' }}>Total due</span>
            <span style={{ fontSize:22, fontWeight:800, color:'#0F172A', letterSpacing:'-0.03em' }}>{fmt(invoice.amount_due)}</span>
          </div>
        </div>

        {/* CTA */}
        <button onClick={() => setStep('sign')}
          style={{ width:'100%', padding:'16px', background:GRAD, color:'#fff', border:'none', borderRadius:13, fontSize:16, fontWeight:800, cursor:'pointer', boxShadow:'0 6px 20px rgba(37,99,235,0.35)', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <PenLine size={18} /> Review & sign
        </button>
        <p style={{ textAlign:'center', fontSize:11, color:'#94A3B8', marginTop:10 }}>
          Your signature will be legally binding under the E-SIGN Act (15 U.S.C. § 7001).
        </p>
      </div>
    </div>
  );

  /* ── SIGN step ──────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight:'100dvh', background:'#F8FAFC', fontFamily:"'Inter',sans-serif", paddingBottom:40 }}>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'20px 16px' }}>

        <div style={{ textAlign:'center', marginBottom:24 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>Sign invoice {invoice.number}</p>
          <p style={{ fontSize:28, fontWeight:800, color:'#0F172A', letterSpacing:'-0.04em' }}>{fmt(invoice.amount_due)}</p>
        </div>

        <StepBar />

        {/* Full name */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:8 }}>Full legal name</label>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name as it appears on ID"
            style={{ width:'100%', padding:'13px 16px', borderRadius:11, border:'1.5px solid #CBD5E1', background:'#fff', fontSize:14, color:'#0F172A', fontFamily:"'Inter',sans-serif", outline:'none', boxSizing:'border-box' }}
            onFocus={e=>e.target.style.borderColor='#C8E20A'} onBlur={e=>e.target.style.borderColor='#CBD5E1'} />
        </div>

        {/* Signature mode toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[['draw','Draw'],['type','Type']].map(([m,l]) => (
            <button key={m} onClick={()=>setSigMode(m)}
              style={{ flex:1, padding:'10px', borderRadius:10, border:`1.5px solid ${sigMode===m?'#C8E20A':'#CBD5E1'}`, background: sigMode===m?'rgba(37,99,235,0.06)':'#fff', color: sigMode===m?'#C8E20A':'#64748B', fontSize:13, fontWeight:sigMode===m?700:500, cursor:'pointer', transition:'all 0.15s', fontFamily:"'Inter',sans-serif" }}>
              {l}
            </button>
          ))}
        </div>

        {/* Signature input */}
        <div style={{ marginBottom:16 }}>
          {sigMode === 'draw'
            ? <SignatureCanvas onCapture={setSigData} />
            : (
              <div>
                <input value={sigName} onChange={e=>setSigName(e.target.value)} placeholder="Type your full name"
                  style={{ width:'100%', padding:'16px', borderRadius:11, border:'1.5px solid #CBD5E1', background:'#fff', fontSize:24, color:'#0F172A', fontFamily:'Georgia, serif', fontStyle:'italic', outline:'none', boxSizing:'border-box' }}
                  onFocus={e=>e.target.style.borderColor='#C8E20A'} onBlur={e=>e.target.style.borderColor='#CBD5E1'} />
                <p style={{ fontSize:10, color:'#94A3B8', marginTop:6, textAlign:'center' }}>Typed signatures are legally equivalent to handwritten signatures</p>
              </div>
            )
          }
        </div>

        {/* Trust badges */}
        <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:20, flexWrap:'wrap' }}>
          {[['🔒','SSL Secured'],['⚖️','Legally binding'],['📄','ESIGN Act compliant']].map(([icon,label]) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#64748B', background:'#fff', border:'1px solid #E2E8F0', borderRadius:20, padding:'5px 12px' }}>
              <span>{icon}</span><span style={{ fontWeight:600 }}>{label}</span>
            </div>
          ))}
        </div>

        {sigError && (
          <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', color:'#DC2626', fontSize:13, marginBottom:14 }}>
            {sigError}
          </div>
        )}

        {/* Legal disclaimer */}
        <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
          <div style={{ display:'flex', gap:10 }}>
            <Shield size={16} style={{ color:'#C8E20A', flexShrink:0, marginTop:1 }} />
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'#1D4ED8', marginBottom:4 }}>Legal Disclaimer & E-Signature Consent</p>
              <p style={{ fontSize:11, color:'#166534', lineHeight:1.7 }}>
                By signing this invoice, you (<strong>{invoice.client_name || 'Client'}</strong>) acknowledge and agree that: (1) you have reviewed all line items and amounts above; (2) you authorize payment of {fmt(invoice.amount_due)} to {invoice.agency_name || 'the service provider'}; (3) this electronic signature constitutes your legal signature and is binding under the Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. § 7001) and the Uniform Electronic Transactions Act (UETA); (4) you have authority to enter into this agreement; and (5) you consent to conducting this transaction electronically. A copy of this signed invoice will be retained for legal and accounting purposes.
              </p>
            </div>
          </div>
        </div>

        <button onClick={handleAccept} disabled={submitting}
          style={{ width:'100%', padding:'16px', background:GRAD, color:'#fff', border:'none', borderRadius:13, fontSize:16, fontWeight:800, cursor:submitting?'not-allowed':'pointer', opacity:submitting?0.7:1, boxShadow:'0 6px 20px rgba(37,99,235,0.35)', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          {submitting ? 'Submitting…' : <><Check size={18}/> Accept & sign invoice</>}
        </button>

        <button onClick={()=>setStep('review')} style={{ width:'100%', padding:'12px', background:'transparent', border:'none', color:'#64748B', fontSize:13, cursor:'pointer', marginTop:10, fontFamily:"'Inter',sans-serif" }}>
          ← Back to review
        </button>
      </div>
    </div>
  );
}
