/**
 * Invoice King Public Quote Portal — Apple checkout–level client experience.
 * Features: e-signature (draw + type), financing calculator,
 * Good/Better/Best package selection, section tracking, animated flow.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp,
  PenLine, Type, Zap, Star, Building2, Calculator,
  Shield, ArrowRight, Sparkles, Check, CreditCard,
} from 'lucide-react';
import { api } from '../utils/api';

const GRAD = 'linear-gradient(135deg, #C6E404, #1A1A1A, #C6E404)';
const fmt  = n => '$' + Math.round(n || 0).toLocaleString();
const fmt2 = n => '$' + Number(n || 0).toFixed(2);

// ── Financing ──────────────────────────────────────────────────────
const PLANS = [
  { months: 0,  apr: 0,     label: 'Pay in full', provider: null,          color: '#C6E404', badge: 'Best value'  },
  { months: 3,  apr: 0,     label: '3 months',    provider: 'Invoice King Pay', color: '#C6E404', badge: '0% APR'      },
  { months: 6,  apr: 0,     label: '6 months',    provider: 'Invoice King Pay', color: '#1A1A1A', badge: '0% APR'      },
  { months: 12, apr: 9.99,  label: '12 months',   provider: 'Wisetack',    color: '#1A1A1A', badge: '9.99% APR'   },
  { months: 24, apr: 14.99, label: '24 months',   provider: 'Affirm',      color: '#C6E404', badge: '14.99% APR'  },
];
const calcMonthly = (p, months, apr) => {
  if (!months || p <= 0) return 0;
  if (apr === 0) return p / months;
  const r = apr / 100 / 12;
  return (p * r) / (1 - Math.pow(1 + r, -months));
};

// ── E-Signature canvas ─────────────────────────────────────────────
function SignatureCanvas({ onCapture }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const getPos = (e, c) => { const r = c.getBoundingClientRect(); const t = e.touches?.[0] || e; return { x: t.clientX - r.left, y: t.clientY - r.top }; };
  const start = useCallback(e => { e.preventDefault(); drawing.current = true; const ctx = ref.current.getContext('2d'); const {x,y} = getPos(e, ref.current); ctx.beginPath(); ctx.moveTo(x, y); }, []);
  const move  = useCallback(e => { if (!drawing.current) return; e.preventDefault(); const ctx = ref.current.getContext('2d'); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#080D1A'; const {x,y} = getPos(e, ref.current); ctx.lineTo(x,y); ctx.stroke(); setHasDrawn(true); }, []);
  const end   = useCallback(() => { drawing.current = false; if (hasDrawn && ref.current) onCapture(ref.current.toDataURL('image/png')); }, [hasDrawn, onCapture]);
  useEffect(() => {
    const c = ref.current;
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move,  { passive: false });
    c.addEventListener('touchend', end);
    return () => { c.removeEventListener('touchstart', start); c.removeEventListener('touchmove', move); c.removeEventListener('touchend', end); };
  }, [start, move, end]);
  const clear = () => { const ctx = ref.current.getContext('2d'); ctx.clearRect(0,0,ref.current.width,ref.current.height); setHasDrawn(false); onCapture(null); };
  return (
    <div>
      <canvas ref={ref} width={480} height={140} onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        style={{ width:'100%', height:140, border:'1.5px solid #C8D4E8', borderRadius:10, cursor:'crosshair', touchAction:'none', background:'#FAFBFF', display:'block' }} />
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        <p style={{ fontSize:10, color:'#94A3B8' }}>Draw your signature above</p>
        {hasDrawn && <button onClick={clear} style={{ fontSize:11, color:'#1A1A1A', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Clear</button>}
      </div>
    </div>
  );
}

// ── Item row ───────────────────────────────────────────────────────
function ItemRow({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:'0.5px solid #F1F5F9' }}>
      <div style={{ display:'flex', alignItems:'flex-start', padding:'14px 20px', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <p style={{ fontSize:14, fontWeight:600, color:'#080D1A' }}>{item.name}</p>
            {item.description && <button onClick={()=>setOpen(v=>!v)} style={{ color:'#94A3B8', background:'none', border:'none', cursor:'pointer', padding:0 }}>{open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>}
          </div>
          {open && <p style={{ fontSize:12, color:'#64748B', marginTop:6, lineHeight:1.6 }}>{item.description}</p>}
        </div>
        <div style={{ textAlign:'right', flexShrink:0, minWidth:80 }}>
          {item.is_included
            ? <span style={{ fontSize:11, fontWeight:700, color:'#0A7A6A', background:'#E0FBF7', padding:'3px 8px', borderRadius:20 }}>Included</span>
            : <div>
                {item.setup_price>0 && <p style={{ fontSize:11, color:'#94A3B8' }}>{fmt(item.setup_price)} setup</p>}
                {item.monthly_price>0 && <p style={{ fontSize:14, fontWeight:700, color:'#080D1A' }}>{fmt(item.monthly_price)}<span style={{ fontSize:10, fontWeight:400, color:'#94A3B8' }}>/mo</span></p>}
              </div>}
        </div>
      </div>
    </div>
  );
}

// ── Financing widget ───────────────────────────────────────────────
function FinancingWidget({ total, onSelect, selected }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom:12 }}>
      <button onClick={()=>setOpen(v=>!v)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'linear-gradient(135deg,rgba(198,228,4,0.06),rgba(75,123,255,0.06))', border:'0.5px solid rgba(75,123,255,0.2)', borderRadius:12, cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Calculator size={18} style={{ color:'#1A1A1A' }}/>
          <div style={{ textAlign:'left' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#080D1A' }}>{selected?.months>0 ? `Financing: ${fmt2(calcMonthly(total,selected.months,selected.apr))}/mo` : 'Financing options available'}</p>
            <p style={{ fontSize:11, color:'#64748B' }}>{selected?.provider ? `via ${selected.provider}` : 'Pay in installments · 0% options available'}</p>
          </div>
        </div>
        <span style={{ fontSize:12, fontWeight:600, color:'#1A1A1A', display:'flex', alignItems:'center', gap:4 }}>{open ? <>Close <ChevronUp size={13}/></> : <>See plans <ChevronDown size={13}/></>}</span>
      </button>
      {open && (
        <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
          {PLANS.map(plan => {
            const mo = calcMonthly(total, plan.months, plan.apr);
            const sel = selected?.months === plan.months;
            return (
              <button key={plan.months} onClick={()=>{ onSelect(plan); setOpen(false); }}
                style={{ border: sel ? `1.5px solid ${plan.color}` : '0.5px solid #E2E8F0', borderRadius:10, padding:'12px 10px', background: sel ? plan.color+'10' : '#fff', cursor:'pointer', textAlign:'left', transition:'all 0.15s', fontFamily:"'Inter',sans-serif" }}>
                <p style={{ fontSize:10, fontWeight:700, color:plan.color, marginBottom:2 }}>{plan.badge}</p>
                <p style={{ fontSize:15, fontWeight:800, color:'#080D1A' }}>{plan.months===0 ? fmt(total) : fmt2(mo)}</p>
                <p style={{ fontSize:10, color:'#94A3B8', marginTop:1 }}>{plan.months===0 ? 'one time' : `× ${plan.months} mo`}</p>
                <p style={{ fontSize:9, color:plan.color, fontWeight:600, marginTop:4 }}>{plan.label}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PKG = {
  good:   { icon: Zap,       color:'#C6E404', label:'Good',   tagline:'Essentials' },
  better: { icon: Star,      color:'#1A1A1A', label:'Better', tagline:'Most popular', badge:'⭐ Popular' },
  best:   { icon: Building2, color:'#C6E404', label:'Best',   tagline:'Full service' },
};

const card = { background:'#fff', borderRadius:16, border:'0.5px solid #E2E8F0', marginBottom:12, overflow:'hidden' };

export default function PublicQuote() {
  const { token } = useParams();
  const [quote,    setQuote]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [step,     setStep]     = useState('review');
  const [pkg,      setPkg]      = useState(null);
  const [sigMode,  setSigMode]  = useState('draw');
  const [sigData,  setSigData]  = useState(null);
  const [sigName,  setSigName]  = useState('');
  const [typedSig, setTypedSig] = useState('');
  const [financing,setFinancing]= useState(null);
  const [accepting,setAccepting]= useState(false);
  const [aceError, setAceError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.tracking.view(token).catch(()=>{});
    const hb = setInterval(() => api.tracking.heartbeat(token, 30).catch(()=>{}), 30000);
    return () => clearInterval(hb);
  }, [token]);

  useEffect(() => {
    api.quotes.getPublic(token)
      .then(q => { setQuote(q); if (q.status==='accepted') setStep('done'); })
      .catch(() => setError('Quote not found or link has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async () => {
    const name = sigMode==='type' ? typedSig : sigName;
    const sig  = sigMode==='type' ? typedSig : sigData;
    if (!name.trim()) { setAceError('Please provide your full name.'); return; }
    if (sigMode==='draw' && !sigData) { setAceError('Please draw your signature.'); return; }
    setAccepting(true); setAceError('');
    try {
      await api.quotes.accept(token, { signature_data: sigMode==='draw' ? sig : null, signer_name: name, selected_package: pkg });
      setStep('done');
    } catch(e) { setAceError(e.message || 'Something went wrong.'); }
    setAccepting(false);
  };

  const F = { minHeight:'100dvh', background:'#F0F4FA', fontFamily:"'Inter',sans-serif", color:'#080D1A' };

  if (loading) return (
    <div style={{ ...F, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #E2E8F0', borderTopColor:'#1A1A1A', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ ...F, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center' }}>
        <AlertCircle size={48} style={{ color:'#ef4444', margin:'0 auto 16px' }}/>
        <p style={{ fontSize:18, fontWeight:700 }}>{error}</p>
      </div>
    </div>
  );

  const accent = quote.primary_color || '#1A1A1A';
  const isExp  = quote.valid_days && new Date(quote.created_at) < new Date(Date.now() - quote.valid_days * 86400000);
  const grouped = {};
  (quote.items||[]).forEach(i => { const k = i.section_label||'Services'; if(!grouped[k]) grouped[k]=[]; grouped[k].push(i); });
  const total  = (quote.setup_total || 0) + (quote.tax_amount || 0);

  if (step==='done') return (
    <div style={{ ...F, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:440, width:'100%', textAlign:'center' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', boxShadow:'0 8px 32px rgba(75,123,255,0.3)' }}>
          <CheckCircle size={40} color="#fff"/>
        </div>
        <h1 style={{ fontSize:28, fontWeight:800, marginBottom:10, letterSpacing:'-0.03em' }}>You're all set!</h1>
        <p style={{ fontSize:15, color:'#64748B', lineHeight:1.6, marginBottom:28 }}>
          Your quote has been signed and accepted. <strong>{quote.agency_name}</strong> will reach out shortly.
        </p>
        <div style={{ background:'#F8FAFC', borderRadius:12, padding:'16px 20px', textAlign:'left', border:'0.5px solid #E2E8F0', marginBottom:20 }}>
          {[
            { l:'Quote',   v: quote.number },
            { l:'Client',  v: quote.client_name || quote.client_biz },
            { l:'Total',   v: fmt(total) },
            ...(quote.monthly_total>0 ? [{ l:'Monthly', v: fmt(quote.monthly_total)+'/mo' }] : []),
            ...(financing?.months>0 ? [{ l:'Financing', v: `${fmt2(calcMonthly(total,financing.months,financing.apr))}/mo × ${financing.months}` }] : []),
          ].map(r => (
            <div key={r.l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0' }}>
              <span style={{ fontSize:13, color:'#64748B' }}>{r.l}</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#080D1A' }}>{r.v}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize:11, color:'#94A3B8' }}>Powered by Invoice King · PLEX Automation</p>
      </div>
    </div>
  );

  return (
    <div style={F}>
      {/* Header */}
      <header style={{ background:'#fff', borderBottom:'0.5px solid #E2E8F0', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'0 20px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:accent, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14 }}>
              <img src='/logo-invoiceking.png' alt='R' style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'#080D1A', lineHeight:1 }}>{quote.agency_name}</p>
              {quote.agency_website && <p style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>{quote.agency_website}</p>}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {['review','sign'].map((s,i) => (
              <React.Fragment key={s}>
                <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background: step===s ? GRAD : (i===0&&step==='sign') ? '#C6E404' : '#F1F5F9', color:(step===s||(i===0&&step==='sign')) ? '#fff' : '#94A3B8', transition:'all 0.3s' }}>
                  {i===0&&step==='sign' ? <Check size={12}/> : i+1}
                </div>
                {i<1 && <div style={{ width:24, height:2, borderRadius:1, background:step==='sign' ? '#C6E404' : '#E2E8F0', transition:'all 0.3s' }}/>}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ height:2, background:GRAD }}/>
      </header>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px 60px' }}>

        {/* ── STEP 1: REVIEW ─────────────────────────────────────── */}
        {step==='review' && <>

          {/* Hero card */}
          <div style={{ ...card, padding:'24px 20px', marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 }}>
              <div>
                <p style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.9px', marginBottom:4 }}>Proposal</p>
                <h1 style={{ fontSize:26, fontWeight:800, color:'#080D1A', letterSpacing:'-0.03em', lineHeight:1 }}>{quote.number}</h1>
                <p style={{ fontSize:13, color:'#64748B', marginTop:6 }}>Prepared for <strong style={{ color:'#080D1A' }}>{quote.client_name||quote.client_biz}</strong></p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:28, fontWeight:800, color:'#080D1A', letterSpacing:'-0.03em' }}>{fmt(total)}</p>
                <p style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{quote.monthly_total>0 ? `+ ${fmt(quote.monthly_total)}/mo` : 'one-time'}</p>
                {isExp
                  ? <span style={{ fontSize:11, fontWeight:700, color:'#ef4444', background:'rgba(239,68,68,0.1)', padding:'3px 8px', borderRadius:20, display:'inline-block', marginTop:6 }}>Expired</span>
                  : <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end', marginTop:6 }}><Clock size={11} style={{ color:'#94A3B8' }}/><span style={{ fontSize:11, color:'#94A3B8' }}>Valid {quote.valid_days} days</span></div>}
              </div>
            </div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:accent+'12', border:`0.5px solid ${accent}33`, borderRadius:8, padding:'7px 12px' }}>
              <Zap size={12} style={{ color:accent }}/><span style={{ fontSize:12, fontWeight:600, color:accent }}>{quote.billing_mode==='annual' ? `Annual plan · ${quote.yearly_discount||20}% off monthly rates` : 'Month-to-month · no long-term commitment'}</span>
            </div>
          </div>

          {/* Service sections */}
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section} style={card}>
              <div style={{ padding:'10px 20px', background:'#F8FAFC', borderBottom:'0.5px solid #F1F5F9' }}>
                <p style={{ fontSize:10, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'0.9px' }}>{section}</p>
              </div>
              {items.map(item => <ItemRow key={item.id} item={item}/>)}
            </div>
          ))}

          {/* Totals */}
          <div style={{ ...card, padding:'20px' }}>
            {[
              { l:'One-time setup', v:fmt(quote.setup_total), bold:false },
              ...(quote.monthly_total>0 ? [{ l:'Monthly recurring', v:fmt(quote.monthly_total)+'/mo', bold:false }] : []),
              ...(quote.tax_amount>0 ? [{ l:`Tax (${quote.tax_rate}%)`, v:fmt(quote.tax_amount), bold:false }] : []),
              { l:'Total due today', v:fmt(total), bold:true },
            ].map((row,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:row.bold ? '14px 0 0' : '5px 0', borderTop:row.bold ? '0.5px solid #E2E8F0' : 'none', marginTop:row.bold ? 10 : 0 }}>
                <span style={{ fontSize:row.bold?15:13, color:row.bold?'#080D1A':'#64748B', fontWeight:row.bold?800:400 }}>{row.l}</span>
                <span style={{ fontSize:row.bold?18:13, color:row.bold?accent:'#080D1A', fontWeight:row.bold?800:600, fontVariantNumeric:'tabular-nums' }}>{row.v}</span>
              </div>
            ))}
          </div>

          {/* Financing */}
          <FinancingWidget total={total} onSelect={setFinancing} selected={financing}/>

          {/* Notes */}
          {quote.notes && (
            <div style={{ ...card, padding:'16px 20px' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.9px', marginBottom:8 }}>Notes & terms</p>
              <p style={{ fontSize:13, color:'#64748B', lineHeight:1.7 }}>{quote.notes}</p>
            </div>
          )}

          {!isExp && (
            <button onClick={()=>setStep('sign')}
              style={{ width:'100%', padding:'16px 20px', background:GRAD, color:'#fff', border:'none', borderRadius:14, fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:'0 8px 32px rgba(75,123,255,0.35)', letterSpacing:'-0.02em', fontFamily:"'Inter',sans-serif", marginBottom:12 }}>
              Review & sign this quote <ArrowRight size={18}/>
            </button>
          )}
        </>}

        {/* ── STEP 2: SIGN ─────────────────────────────────────── */}
        {step==='sign' && <>
          <div style={{ ...card, padding:'16px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div>
              <p style={{ fontSize:12, color:'#64748B' }}>{quote.number}</p>
              <p style={{ fontSize:20, fontWeight:800, color:'#080D1A', letterSpacing:'-0.03em' }}>{fmt(total)} due today</p>
            </div>
            <button onClick={()=>setStep('review')} style={{ fontSize:12, fontWeight:600, color:'#1A1A1A', background:'none', border:'0.5px solid #E2E8F0', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>← Back</button>
          </div>

          <div style={{ ...card, padding:'24px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center' }}><PenLine size={17} color="#fff"/></div>
              <div>
                <p style={{ fontSize:15, fontWeight:800, color:'#080D1A' }}>Sign to accept</p>
                <p style={{ fontSize:12, color:'#64748B' }}>Your signature confirms agreement to this quote.</p>
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Your full name *</label>
              <input value={sigName} onChange={e=>setSigName(e.target.value)} placeholder={quote.client_name||'Type your full name'}
                style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, fontFamily:"'Inter',sans-serif", color:'#080D1A', outline:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#1A1A1A'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
            </div>

            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[{ k:'draw', l:'Draw', I:PenLine }, { k:'type', l:'Type', I:Type }].map(m => (
                <button key={m.k} onClick={()=>setSigMode(m.k)}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'9px 14px', borderRadius:9, border:sigMode===m.k ? '1.5px solid #1A1A1A' : '1px solid #E2E8F0', background:sigMode===m.k ? '#EAF0FF' : '#fff', fontSize:13, fontWeight:600, color:sigMode===m.k ? '#1A1A1A' : '#64748B', cursor:'pointer', transition:'all 0.15s', fontFamily:"'Inter',sans-serif" }}>
                  <m.I size={14}/> {m.l}
                </button>
              ))}
            </div>

            {sigMode==='draw'
              ? <SignatureCanvas onCapture={setSigData}/>
              : <div style={{ marginBottom:8 }}>
                  <input value={typedSig} onChange={e=>setTypedSig(e.target.value)} placeholder="Type your name as signature"
                    style={{ width:'100%', padding:14, borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:22, fontFamily:'Georgia,serif', color:'#080D1A', outline:'none', background:'#FAFBFF', boxSizing:'border-box', letterSpacing:'0.02em' }}
                    onFocus={e=>e.target.style.borderColor='#1A1A1A'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                  <p style={{ fontSize:10, color:'#94A3B8', marginTop:4 }}>Typed signatures are legally equivalent to drawn signatures.</p>
                </div>}
          </div>

          {/* Trust badges */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
            {[{ I:Shield, t:'SSL secured' }, { I:CheckCircle, t:'Legally binding' }, { I:CreditCard, t:'No card yet' }].map(s => (
              <div key={s.t} style={{ background:'#fff', border:'0.5px solid #E2E8F0', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                <s.I size={16} style={{ color:'#1A1A1A', margin:'0 auto 4px' }}/><p style={{ fontSize:10, fontWeight:600, color:'#64748B' }}>{s.t}</p>
              </div>
            ))}
          </div>

          {financing?.months>0 && (
            <div style={{ background:'rgba(75,123,255,0.06)', border:'0.5px solid rgba(75,123,255,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#1A1A1A', marginBottom:2 }}>💳 Financing: {fmt2(calcMonthly(total,financing.months,financing.apr))}/mo × {financing.months} months</p>
              <p style={{ fontSize:11, color:'#64748B' }}>via {financing.provider} · {financing.badge} · Subject to approval</p>
            </div>
          )}

          {aceError && <div style={{ background:'rgba(239,68,68,0.08)', border:'0.5px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', marginBottom:12 }}><p style={{ fontSize:13, color:'#ef4444', fontWeight:600 }}>{aceError}</p></div>}

          <button onClick={accept} disabled={accepting}
            style={{ width:'100%', padding:'16px 20px', background:accepting ? '#9CA3AF' : GRAD, color:'#fff', border:'none', borderRadius:14, fontSize:15, fontWeight:800, cursor:accepting ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:accepting ? 'none' : '0 8px 32px rgba(75,123,255,0.35)', letterSpacing:'-0.02em', fontFamily:"'Inter',sans-serif", transition:'all 0.2s' }}>
            {accepting
              ? <><div style={{ width:18, height:18, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>Accepting…</>
              : <><Sparkles size={17}/> Accept this quote — {fmt(total)} today</>}
          </button>
          <p style={{ textAlign:'center', fontSize:11, color:'#94A3B8', marginTop:12, lineHeight:1.6 }}>By accepting, you agree to the terms in this quote. Your digital signature is legally binding under the ESIGN Act.</p>
        </>}

        <p style={{ textAlign:'center', fontSize:11, color:'#CBD5E1', marginTop:24 }}>
          Powered by <strong style={{ color:'#94A3B8' }}>Invoice King</strong> · PLEX Automation
        </p>
      </div>
    </div>
  );
}
