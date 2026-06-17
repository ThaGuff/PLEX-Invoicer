/**
 * PublicInvoice — Client-facing invoice portal
 * Full rebrand: Invoice King branding + business logo + fixed line item pricing
 * Mobile-first: review → sign → done
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Shield, PenLine, X, Check, Crown } from 'lucide-react';
import { api } from '../utils/api';

const LIME     = '#C6E404';
const CHARCOAL = '#0A0F13';
const STONE    = '#626467';
const BORDER   = '#E2E4E7';

function fmt(n)     { return '$' + parseFloat(n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }); } catch { return s; } }

// ── Resolve the correct price for a line item ──────────────────────────────
// Items come from quote_items: setup_price, monthly_price, is_included
// They may also have unit_price (newer schema) — use whichever is set
function lineTotal(item) {
  // Prefer explicit unit_price if it exists and is non-zero
  if (item.unit_price && parseFloat(item.unit_price) !== 0) {
    return parseFloat(item.unit_price) * parseFloat(item.quantity || 1);
  }
  // Included items show $0 — they are bundled at no extra charge
  if (item.is_included) return 0;
  // Otherwise sum setup + monthly. Quantity multiplies the one-time setup
  // price only (matching QuoteBuilder/exportPDF) — a recurring monthly
  // price is not multiplied by quantity.
  const qty     = Math.max(1, parseFloat(item.quantity) || 1);
  const setup   = parseFloat(item.setup_price   || 0) * qty;
  const monthly = parseFloat(item.monthly_price || 0);
  return setup + monthly;
}

function lineLabel(item) {
  if (item.is_included) return 'Included';
  const qty     = Math.max(1, parseFloat(item.quantity) || 1);
  const setup   = parseFloat(item.setup_price   || 0) * qty;
  const monthly = parseFloat(item.monthly_price || 0);
  if (setup > 0 && monthly > 0) return `${fmt(setup)} + ${fmt(monthly)}/mo`;
  if (setup > 0)   return fmt(setup);
  if (monthly > 0) return `${fmt(monthly)}/mo`;
  if (item.unit_price > 0) return fmt(parseFloat(item.unit_price) * parseFloat(item.quantity || 1));
  return 'Included';
}

// ── Invoice King SVG mark ──────────────────────────────────────────────────
function IKMark({ size = 28 }) {
  return (
    <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 80 100" fill="none">
      <rect x="2" y="36" width="76" height="8" rx="2" fill={LIME}/>
      <polygon points="12,18 22,36 2,36" fill={LIME}/>
      <polygon points="68,18 78,36 58,36" fill={LIME}/>
      <rect x="28" y="22" width="24" height="14" fill={LIME}/>
      <polygon points="22,36 28,30 25,36" fill="white"/>
      <polygon points="52,36 58,30 55,36" fill="white"/>
      <polygon points="40,7 47,15 40,23 33,15" fill={LIME}/>
      <polygon points="40,11 44,15 40,19 36,15" fill="#A8C200"/>
      <path d="M4,44 L4,92 Q4,96 8,96 L56,96 Q60,96 60,92 L60,58 L46,44 Z" fill={CHARCOAL}/>
      <polygon points="46,44 60,58 46,58" fill={LIME}/>
      <rect x="10" y="62" width="28" height="26" rx="1.5" fill="white"/>
      <rect x="14" y="68" width="20" height="3.5" rx="1.5" fill={CHARCOAL}/>
      <rect x="14" y="75" width="14" height="3.5" rx="1.5" fill={CHARCOAL}/>
      <rect x="14" y="82" width="18" height="3.5" rx="1.5" fill={LIME}/>
    </svg>
  );
}

// ── Signature canvas ───────────────────────────────────────────────────────
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
  const move  = useCallback(e => { if (!drawing.current) return; e.preventDefault(); const ctx = ref.current.getContext('2d'); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = CHARCOAL; const {x,y} = getPos(e, ref.current); ctx.lineTo(x,y); ctx.stroke(); setHasDrawn(true); }, []);
  const end   = useCallback(() => { drawing.current = false; if (hasDrawn && ref.current) onCapture(ref.current.toDataURL('image/png')); }, [hasDrawn, onCapture]);
  const clear = () => { const ctx = ref.current.getContext('2d'); ctx.clearRect(0, 0, ref.current.width, ref.current.height); setHasDrawn(false); onCapture(null); };

  return (
    <div style={{ position:'relative' }}>
      <canvas ref={ref} width={480} height={140}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        style={{ width:'100%', height:140, borderRadius:10, border:`1.5px solid ${BORDER}`, background:'#FAFAF8', cursor:'crosshair', touchAction:'none', display:'block' }} />
      <button onClick={clear} style={{ position:'absolute', top:8, right:8, background:'rgba(98,100,103,0.1)', border:'none', borderRadius:7, padding:'4px 10px', fontSize:11, fontWeight:600, color:STONE, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
        Clear
      </button>
      <p style={{ fontSize:10, color:'#9EA1A4', textAlign:'center', marginTop:6 }}>Draw your signature above</p>
    </div>
  );
}

// ── Step progress bar ──────────────────────────────────────────────────────
function StepBar({ step }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24 }}>
      {['review','sign'].map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700, transition:'all 0.3s',
              background: step===s ? CHARCOAL : (i===0 && step==='sign') ? LIME : '#E2E4E7',
              color: step===s ? LIME : (i===0 && step==='sign') ? CHARCOAL : '#9EA1A4',
            }}>
              {i===0 && step==='sign' ? <Check size={13}/> : i+1}
            </div>
            <span style={{ fontSize:12, fontWeight: step===s ? 700 : 500, color: step===s ? CHARCOAL : '#9EA1A4' }}>
              {s==='review' ? 'Review' : 'Sign'}
            </span>
          </div>
          {i===0 && <div style={{ flex:1, height:2, background: step==='sign' ? LIME : '#E2E4E7', margin:'0 10px', borderRadius:1, transition:'background 0.3s' }}/>}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Powered-by footer ──────────────────────────────────────────────────────
function PoweredBy({ whiteLabel }) {
  if (whiteLabel) return null;
  return (
    <div style={{ textAlign:'center', marginTop:32, paddingTop:20, borderTop:`1px solid ${BORDER}` }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, opacity:0.65 }}>
        <IKMark size={16}/>
        <span style={{ fontSize:11, fontWeight:600, color:STONE, letterSpacing:'0.02em' }}>
          Powered by <span style={{ color:CHARCOAL, fontWeight:800 }}>Invoice King</span>
        </span>
      </div>
      <p style={{ fontSize:10, color:'#9EA1A4', marginTop:4 }}>
        invoiceking.app · Invoicing. Simplified. Own Your Cash Flow.
      </p>
    </div>
  );
}

// ── Business header ────────────────────────────────────────────────────────
function BusinessHeader({ invoice }) {
  const name    = invoice.agency_name   || invoice.company_name || 'Invoice King';
  const email   = invoice.agency_email  || '';
  const phone   = invoice.agency_phone  || '';
  const address = invoice.agency_address || invoice.company_address || '';
  const website = invoice.agency_website || '';
  const tagline = invoice.company_tagline || '';
  const logoUrl = invoice.agency_logo_url || invoice.logo_url || null;

  return (
    <div style={{ background:CHARCOAL, borderRadius:16, padding:'24px 24px 20px', marginBottom:20, position:'relative', overflow:'hidden' }}>
      {/* Lime accent line */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:LIME, borderRadius:'16px 16px 0 0' }}/>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        {/* Business identity */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {logoUrl ? (
            <img src={logoUrl} alt={name} style={{ width:52, height:52, borderRadius:11, objectFit:'cover', border:'2px solid rgba(198,228,4,0.3)', background:'#fff', flexShrink:0 }}/>
          ) : (
            <div style={{ width:52, height:52, borderRadius:11, background:LIME, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:22, fontWeight:900, color:CHARCOAL, letterSpacing:'-0.04em' }}>
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'#FFFFFF', margin:0, letterSpacing:'-0.03em', lineHeight:1.1 }}>{name}</h2>
            {tagline && <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:3, fontStyle:'italic' }}>{tagline}</p>}
          </div>
        </div>

        {/* Invoice badge */}
        <div style={{ background:'rgba(198,228,4,0.1)', border:'1px solid rgba(198,228,4,0.25)', borderRadius:10, padding:'8px 14px', textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'rgba(198,228,4,0.7)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Invoice</div>
          <div style={{ fontSize:16, fontWeight:800, color:LIME, letterSpacing:'-0.02em' }}>{invoice.number}</div>
        </div>
      </div>

      {/* Contact line */}
      {(email || phone || address || website) && (
        <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', flexWrap:'wrap', gap:'4px 20px' }}>
          {email   && <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>✉ {email}</span>}
          {phone   && <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>📞 {phone}</span>}
          {address && <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>📍 {address}</span>}
          {website && <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>🌐 {website}</span>}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PublicInvoice() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice,    setInvoice]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [step,       setStep]       = useState('review');
  const [sigMode,    setSigMode]    = useState('draw');
  const [sigData,    setSigData]    = useState(null);
  const [sigName,    setSigName]    = useState('');
  const [fullName,   setFullName]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sigError,   setSigError]   = useState('');

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
          signature_data:    sigMode === 'draw' ? sigData : null,
          signer_name:       fullName.trim(),
          typed_signature:   sigMode === 'type' ? sigName.trim() : null,
          signed_at:         new Date().toISOString(),
        }),
      });
      setStep('done');
    } catch { setSigError('Submission failed. Please try again.'); }
    setSubmitting(false);
  };

  // ── Loading / error ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F5F6F7' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <IKMark size={36}/>
        <div style={{ width:24, height:24, borderRadius:'50%', border:`3px solid ${LIME}`, borderTopColor:'transparent', animation:'spin 0.7s linear infinite' }}/>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F5F6F7', padding:20 }}>
      <div style={{ textAlign:'center' }}>
        <AlertCircle size={40} style={{ color:'#DC2626', margin:'0 auto 12px' }}/>
        <p style={{ fontSize:16, fontWeight:700, color:CHARCOAL }}>{error}</p>
      </div>
    </div>
  );

  const isPaid     = invoice.status === 'paid' || justPaid;
  const isAccepted = invoice.status === 'accepted' || step === 'done';

  // Group items by section, filtering out zero-price included items from the totals display
  const groupedItems = {};
  (invoice.items || []).forEach(item => {
    const key = item.section_label || 'Services';
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  });

  const hasItems = Object.keys(groupedItems).length > 0;

  // ── DONE / PAID ──────────────────────────────────────────────────
  if (step === 'done' || isPaid) return (
    <div style={{ minHeight:'100dvh', background:'#F5F6F7', fontFamily:"'Inter',sans-serif", paddingBottom:40 }}>
      <div style={{ maxWidth:580, margin:'0 auto', padding:'32px 16px' }}>
        <BusinessHeader invoice={invoice}/>

        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:LIME, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:`0 8px 32px rgba(198,228,4,0.35)` }}>
            <CheckCircle size={36} color={CHARCOAL}/>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:CHARCOAL, marginBottom:10, letterSpacing:'-0.04em' }}>
            {isPaid ? 'Payment received!' : 'Invoice accepted!'}
          </h1>
          <p style={{ fontSize:14, color:STONE, lineHeight:1.7, marginBottom:24 }}>
            {isPaid
              ? `Thank you for your payment of ${fmt(invoice.amount_due)}. A receipt has been sent to ${invoice.client_email}.`
              : `Your signature has been recorded. ${invoice.agency_name || 'The business'} will follow up with next steps.`}
          </p>

          <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, padding:'16px 20px', textAlign:'left' }}>
            <p style={{ fontSize:11, fontWeight:700, color:STONE, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>Invoice summary</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:STONE }}>Invoice #</span>
                <span style={{ fontWeight:700, color:CHARCOAL }}>{invoice.number}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:STONE }}>Amount</span>
                <span style={{ fontWeight:700, color:CHARCOAL }}>{fmt(invoice.amount_due)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:STONE }}>Date</span>
                <span style={{ fontWeight:600, color:CHARCOAL }}>{fmtDate(invoice.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <PoweredBy whiteLabel={invoice?.agency_plan === 'agency'}/>
      </div>
    </div>
  );

  // ── REVIEW step ──────────────────────────────────────────────────
  if (step === 'review') return (
    <div style={{ minHeight:'100dvh', background:'#F5F6F7', fontFamily:"'Inter',sans-serif", paddingBottom:40 }}>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'20px 16px' }}>

        {/* Business header with branding */}
        <BusinessHeader invoice={invoice}/>

        {/* Invoice amount hero */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <p style={{ fontSize:13, color:STONE, marginBottom:4 }}>
            Billed to <strong style={{ color:CHARCOAL }}>{invoice.client_name}</strong>
            {invoice.client_biz && ` · ${invoice.client_biz}`}
          </p>
          <p style={{ fontSize:40, fontWeight:900, color:CHARCOAL, letterSpacing:'-0.04em', margin:'8px 0' }}>
            {fmt(invoice.amount_due)}
          </p>
          <p style={{ fontSize:13, color: invoice.due_date && new Date(invoice.due_date) < new Date() ? '#DC2626' : STONE }}>
            Due {fmtDate(invoice.due_date)}
          </p>
        </div>

        <StepBar step={step}/>

        {/* Line items — FIXED: uses lineTotal() and lineLabel() */}
        {hasItems && Object.entries(groupedItems).map(([section, items]) => (
          <div key={section} style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, padding:'16px 20px', marginBottom:12 }}>
            <p style={{ fontSize:10, fontWeight:700, color:STONE, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>{section}</p>
            {items.map((item, i) => {
              const total   = lineTotal(item);
              const label   = lineLabel(item);
              const isIncl  = item.is_included;
              return (
                <div key={i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                  padding:'10px 0', gap:12,
                  borderBottom: i < items.length - 1 ? `1px solid #F5F6F7` : 'none',
                }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:CHARCOAL, margin:0 }}>{item.name}</p>
                      {!isIncl && parseFloat(item.quantity || 1) > 1 && (
                        <span style={{ fontSize:11, fontWeight:700, color:STONE }}>×{item.quantity}</span>
                      )}
                      {isIncl && (
                        <span style={{ fontSize:9, fontWeight:700, background:`${LIME}20`, color:'#5A6800', borderRadius:100, padding:'2px 7px', letterSpacing:'0.05em', textTransform:'uppercase', border:`1px solid ${LIME}40` }}>
                          Included
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p style={{ fontSize:12, color:STONE, marginTop:3, lineHeight:1.5, margin:'3px 0 0' }}>{item.description}</p>
                    )}
                    {/* Show setup vs monthly breakdown if both present */}
                    {!isIncl && parseFloat(item.setup_price||0) > 0 && parseFloat(item.monthly_price||0) > 0 && (
                      <p style={{ fontSize:11, color:STONE, marginTop:3 }}>
                        {fmt(item.setup_price)} setup + {fmt(item.monthly_price)}/mo recurring
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {isIncl ? (
                      <span style={{ fontSize:13, fontWeight:600, color:'#9EA1A4' }}>—</span>
                    ) : (
                      <p style={{ fontSize:13, fontWeight:700, color:CHARCOAL, margin:0 }}>{label}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* If no items, show a simple description */}
        {!hasItems && invoice.notes && (
          <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, padding:'16px 20px', marginBottom:12 }}>
            <p style={{ fontSize:11, fontWeight:700, color:STONE, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Services</p>
            <p style={{ fontSize:13, color:CHARCOAL, lineHeight:1.6 }}>{invoice.notes}</p>
          </div>
        )}

        {/* Totals */}
        <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
          {/* Show setup subtotal if there are items with setup prices */}
          {(invoice.setup_total > 0 || invoice.monthly_total > 0) && (
            <>
              {invoice.setup_total > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, color:STONE }}>One-time setup</span>
                  <span style={{ fontSize:13, fontWeight:600, color:CHARCOAL }}>{fmt(invoice.setup_total)}</span>
                </div>
              )}
              {invoice.monthly_total > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, color:STONE }}>Monthly recurring</span>
                  <span style={{ fontSize:13, fontWeight:600, color:CHARCOAL }}>{fmt(invoice.monthly_total)}/mo</span>
                </div>
              )}
            </>
          )}
          {parseFloat(invoice.tax_rate||0) > 0 && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, color:STONE }}>Subtotal</span>
                <span style={{ fontSize:13, fontWeight:600, color:CHARCOAL }}>{fmt((invoice.amount_due||0) - (invoice.tax_amount||0))}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, paddingBottom:10, borderBottom:`1px solid #F5F6F7` }}>
                <span style={{ fontSize:13, color:STONE }}>Tax ({parseFloat(invoice.tax_rate).toFixed(2)}%)</span>
                <span style={{ fontSize:13, fontWeight:600, color:CHARCOAL }}>+{fmt(invoice.tax_amount)}</span>
              </div>
            </>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop: parseFloat(invoice.tax_rate||0) > 0 ? 0 : 4 }}>
            <span style={{ fontSize:15, fontWeight:800, color:CHARCOAL }}>Total due today</span>
            <span style={{ fontSize:24, fontWeight:900, color:CHARCOAL, letterSpacing:'-0.03em' }}>{fmt(invoice.amount_due)}</span>
          </div>
          {invoice.monthly_total > 0 && (
            <p style={{ fontSize:11, color:STONE, marginTop:8, borderTop:`1px solid #F5F6F7`, paddingTop:8 }}>
              * Plus {fmt(invoice.monthly_total)}/mo recurring after setup is complete.
            </p>
          )}
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ background:'rgba(198,228,4,0.06)', border:`1px solid rgba(198,228,4,0.2)`, borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#5A6800', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Notes from {invoice.agency_name || 'your provider'}</p>
            <p style={{ fontSize:13, color:CHARCOAL, lineHeight:1.6, margin:0 }}>{invoice.notes}</p>
          </div>
        )}

        {/* CTA */}
        <button onClick={() => setStep('sign')}
          style={{ width:'100%', padding:'16px', background:CHARCOAL, color:LIME, border:'none', borderRadius:13, fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:'0 4px 20px rgba(10,15,19,0.2)', letterSpacing:'-0.01em' }}>
          <PenLine size={18}/> Review & sign
        </button>
        <p style={{ textAlign:'center', fontSize:11, color:'#9EA1A4', marginTop:10, lineHeight:1.5 }}>
          Your signature will be legally binding under the E-SIGN Act (15 U.S.C. § 7001).
        </p>

        <PoweredBy whiteLabel={invoice?.agency_plan === 'agency'}/>
      </div>
    </div>
  );

  // ── SIGN step ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100dvh', background:'#F5F6F7', fontFamily:"'Inter',sans-serif", paddingBottom:40 }}>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'20px 16px' }}>

        <div style={{ textAlign:'center', marginBottom:24 }}>
          <p style={{ fontSize:13, fontWeight:600, color:STONE, marginBottom:4 }}>Sign invoice {invoice.number}</p>
          <p style={{ fontSize:32, fontWeight:900, color:CHARCOAL, letterSpacing:'-0.04em' }}>{fmt(invoice.amount_due)}</p>
        </div>

        <StepBar step={step}/>

        {/* Full name */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:STONE, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:8 }}>Full legal name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name as it appears on ID"
            style={{ width:'100%', padding:'13px 16px', borderRadius:11, border:`1.5px solid ${BORDER}`, background:'#fff', fontSize:14, color:CHARCOAL, fontFamily:"'Inter',sans-serif", outline:'none', boxSizing:'border-box' }}
            onFocus={e => e.target.style.borderColor = LIME}
            onBlur={e  => e.target.style.borderColor = BORDER}/>
        </div>

        {/* Sig mode toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[['draw','✍ Draw'],['type','⌨ Type']].map(([m,l]) => (
            <button key={m} onClick={() => setSigMode(m)}
              style={{ flex:1, padding:'10px', borderRadius:10, border:`1.5px solid ${sigMode===m ? CHARCOAL : BORDER}`, background: sigMode===m ? CHARCOAL : '#fff', color: sigMode===m ? LIME : STONE, fontSize:13, fontWeight: sigMode===m ? 700 : 500, cursor:'pointer', transition:'all 0.15s', fontFamily:"'Inter',sans-serif" }}>
              {l}
            </button>
          ))}
        </div>

        {/* Signature input */}
        <div style={{ marginBottom:16 }}>
          {sigMode === 'draw'
            ? <SignatureCanvas onCapture={setSigData}/>
            : (
              <div>
                <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Type your full name"
                  style={{ width:'100%', padding:'16px', borderRadius:11, border:`1.5px solid ${BORDER}`, background:'#fff', fontSize:24, color:CHARCOAL, fontFamily:'Georgia, serif', fontStyle:'italic', outline:'none', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor = LIME}
                  onBlur={e  => e.target.style.borderColor = BORDER}/>
                <p style={{ fontSize:10, color:'#9EA1A4', marginTop:6, textAlign:'center' }}>Typed signatures are legally equivalent to handwritten signatures</p>
              </div>
            )
          }
        </div>

        {/* Trust badges */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:20, flexWrap:'wrap' }}>
          {[['🔒','SSL Secured'],['⚖️','Legally binding'],['📄','ESIGN Act']].map(([icon,label]) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:STONE, background:'#fff', border:`1px solid ${BORDER}`, borderRadius:20, padding:'5px 12px', fontWeight:600 }}>
              {icon} {label}
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
            <Shield size={16} style={{ color:'#22C55E', flexShrink:0, marginTop:1 }}/>
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:4 }}>Legal Disclaimer & E-Signature Consent</p>
              <p style={{ fontSize:11, color:'#166534', lineHeight:1.7 }}>
                By signing this invoice, you (<strong>{invoice.client_name || 'Client'}</strong>) acknowledge and agree that: (1) you have reviewed all line items and amounts above; (2) you authorize payment of {fmt(invoice.amount_due)} to {invoice.agency_name || 'the service provider'}; (3) this electronic signature constitutes your legal signature and is binding under the E-SIGN Act (15 U.S.C. § 7001) and UETA; (4) you have authority to enter into this agreement; and (5) you consent to conducting this transaction electronically.
              </p>
            </div>
          </div>
        </div>

        <button onClick={handleAccept} disabled={submitting}
          style={{ width:'100%', padding:'16px', background: submitting ? 'rgba(10,15,19,0.5)' : CHARCOAL, color:LIME, border:'none', borderRadius:13, fontSize:16, fontWeight:800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:'0 4px 20px rgba(10,15,19,0.2)', letterSpacing:'-0.01em' }}>
          {submitting ? 'Submitting…' : <><Check size={18}/> Accept & sign invoice</>}
        </button>

        <button onClick={() => setStep('review')} style={{ width:'100%', padding:'12px', background:'transparent', border:'none', color:STONE, fontSize:13, cursor:'pointer', marginTop:10, fontFamily:"'Inter',sans-serif" }}>
          ← Back to review
        </button>

        <PoweredBy whiteLabel={invoice?.agency_plan === 'agency'}/>
      </div>
    </div>
  );
}
