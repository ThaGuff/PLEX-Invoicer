/**
 * OnboardingTour — clean step-by-step guide
 * Uses a spotlight cutout technique: dark overlay with a visible "hole"
 * around the target element, tooltip positioned nearby
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    route: '/',
    selector: null,
    position: 'center',
    title: '👋 Welcome to Revanew!',
    body: "Let's take 2 minutes to get you set up. We'll walk through the key features — follow along or skip anytime.",
    action: 'Start setup',
    skippable: true,
  },
  {
    id: 'business-settings',
    route: '/',
    selector: '[data-tour="settings-btn"], .desktop-sidebar [style*="Settings"], button[title*="settings"], button[onClick*="settings"]',
    selectorFallback: '.desktop-sidebar button:last-of-type',
    position: 'right',
    title: '🏢 Step 1: Your Business Info',
    body: 'Click your profile in the bottom-left sidebar to open Account Settings. Add your business name, logo, colors, and contact details.',
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'new-quote',
    route: '/quotes/new',
    selector: '[data-tour="quote-client"], input[placeholder*="client"], input[placeholder*="Client"]',
    position: 'bottom',
    title: '📝 Step 2: Create a Quote',
    body: "Start by entering your client's name and contact info. Then add services from your catalog — or type them manually. Set your pricing and hit Save.",
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'send-quote',
    route: '/quotes/new',
    selector: 'button[class*="send"], button[class*="save"], [data-tour="send-btn"]',
    selectorFallback: 'button[type="submit"]',
    position: 'top',
    title: '✉️ Step 3: Send to Client',
    body: 'Save the quote and use the Send button to email your client a professional link. They can review, ask questions, and e-sign directly from their phone.',
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'quotes-list',
    route: '/quotes',
    selector: null,
    position: 'center',
    title: '📋 Track Your Quotes',
    body: 'All quotes appear here with live status: Draft → Sent → Viewed → Accepted. When a client signs, you can convert it to an invoice with one click.',
    action: 'Got it',
  },
  {
    id: 'invoices',
    route: '/invoices',
    selector: null,
    position: 'center',
    title: '💰 Invoices & Payments',
    body: 'Converted quotes become invoices here. Send Stripe payment links for online card payments, mark invoices as paid, and track overdue ones automatically.',
    action: 'Got it',
  },
  {
    id: 'clients',
    route: '/contacts',
    selector: null,
    position: 'center',
    title: '👥 Your Client Directory',
    body: 'Every client you quote is saved here automatically. See their full quote and payment history, and send follow-ups right from their profile.',
    action: 'Got it',
  },
  {
    id: 'automations',
    route: '/automations',
    selector: null,
    position: 'center',
    title: '⚡ Set Up Automations',
    body: 'Automate follow-ups for unread quotes, overdue invoices, and repeat business outreach. Set it once and Revanew works for you in the background.',
    action: 'Got it',
  },
  {
    id: 'done',
    route: '/',
    selector: null,
    position: 'center',
    title: "🚀 You're all set!",
    body: "You know how Revanew works. Go create your first quote — it takes under 60 seconds. The team is here if you need anything.",
    action: 'Go to Dashboard',
    isLast: true,
    skippable: false,
  },
];

const COLORS = ['#2563EB','#2563EB','#2563EB','#0D9488','#0D9488','#7C3AED','#7C3AED','#D97706','#0D9488'];

export default function OnboardingTour({ onDone }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const step = STEPS[stepIdx];
  const color = COLORS[stepIdx] || '#2563EB';

  // Find target element
  const findTarget = useCallback(() => {
    if (!step?.selector) { setTargetRect(null); return; }
    const selectors = [step.selector, step.selectorFallback].filter(Boolean);
    for (const sel of selectors) {
      try {
        for (const s of sel.split(',').map(s => s.trim())) {
          const el = document.querySelector(s);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              setTimeout(() => setTargetRect(el.getBoundingClientRect()), 300);
              return;
            }
          }
        }
      } catch {}
    }
    setTargetRect(null);
  }, [step?.selector, step?.selectorFallback]);

  // Navigate + find target when step changes
  useEffect(() => {
    if (!step) return;
    const run = async () => {
      if (step.route && location.pathname !== step.route && step.route !== location.pathname) {
        navigate(step.route);
        await new Promise(r => setTimeout(r, 800));
      }
      await new Promise(r => setTimeout(r, 400));
      findTarget();
    };
    run();
  }, [stepIdx]);

  const next = () => {
    if (step.isLast || stepIdx >= STEPS.length - 1) { finish(); return; }
    setStepIdx(i => i + 1);
  };
  const prev = () => { if (stepIdx > 0) setStepIdx(i => i - 1); };
  const finish = () => {
    localStorage.setItem('revanew_tour_done', '1');
    localStorage.removeItem('revanew_show_tour');
    navigate('/');
    onDone?.();
  };

  if (!step) return null;

  // Calculate tooltip position
  const pad = 12;
  const TW = Math.min(340, window.innerWidth - 32);
  const TH = 270;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let tooltipStyle = { position: 'fixed', zIndex: 10001, width: TW };
  if (!targetRect || step.position === 'center') {
    tooltipStyle = { ...tooltipStyle, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TW };
  } else {
    switch (step.position) {
      case 'bottom':
        tooltipStyle.top = Math.min(targetRect.bottom + 16, vh - TH - pad);
        tooltipStyle.left = Math.max(pad, Math.min(targetRect.left + targetRect.width/2 - TW/2, vw - TW - pad));
        break;
      case 'top':
        tooltipStyle.top = Math.max(pad, targetRect.top - TH - 16);
        tooltipStyle.left = Math.max(pad, Math.min(targetRect.left + targetRect.width/2 - TW/2, vw - TW - pad));
        break;
      case 'right':
        tooltipStyle.top = Math.max(pad, Math.min(targetRect.top + targetRect.height/2 - TH/2, vh - TH - pad));
        tooltipStyle.left = Math.min(targetRect.right + 16, vw - TW - pad);
        break;
      case 'left':
        tooltipStyle.top = Math.max(pad, Math.min(targetRect.top + targetRect.height/2 - TH/2, vh - TH - pad));
        tooltipStyle.left = Math.max(pad, targetRect.left - TW - 16);
        break;
    }
  }

  // SVG cutout overlay - creates a transparent hole around the target
  const renderOverlay = () => {
    if (!targetRect || !step.highlight) {
      // Full dark overlay, no cutout
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(11,18,32,0.72)',
          backdropFilter: 'blur(1px)',
        }} />
      );
    }

    const r = targetRect;
    const gapPad = 8;
    const x = Math.max(0, r.left - gapPad);
    const y = Math.max(0, r.top - gapPad);
    const w = r.width + gapPad * 2;
    const h = r.height + gapPad * 2;
    const borderR = 10;

    // Use SVG with a clip path that cuts out the element area
    return (
      <>
        <svg
          style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', width: '100%', height: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white"/>
              <rect x={x} y={y} width={w} height={h} rx={borderR} fill="black"/>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(11,18,32,0.75)" mask="url(#tour-mask)"/>
          {/* Highlight ring around the element */}
          <rect x={x} y={y} width={w} height={h} rx={borderR}
            fill="none" stroke={color} strokeWidth="2.5" opacity="0.9"/>
          {/* Outer glow */}
          <rect x={x-2} y={y-2} width={w+4} height={h+4} rx={borderR+2}
            fill="none" stroke={color} strokeWidth="1" opacity="0.4"/>
        </svg>
        {/* Click interceptor behind tooltip */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }} />
      </>
    );
  };

  return (
    <>
      <style>{`
        .tour-card { animation: tourFadeUp 0.22s ease both; }
        @keyframes tourFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes tourRing { 0%,100% { opacity:0.9; } 50% { opacity:0.5; } }
      `}</style>

      {renderOverlay()}

      {/* Tooltip card */}
      <div className="tour-card" key={stepIdx} style={{
        ...tooltipStyle,
        background: 'var(--bg-surface, #fff)',
        borderRadius: 18,
        padding: '22px 24px 24px',
        boxShadow: `0 0 0 1px var(--border, rgba(0,0,0,0.1)), 0 24px 60px rgba(11,18,32,0.35)`,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Progress bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ flex:1, height:4, borderRadius:2, background:'var(--border, #e5e7eb)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${((stepIdx)/(STEPS.length-1))*100}%`, background:`linear-gradient(90deg,${color},${color}bb)`, borderRadius:2, transition:'width 0.4s ease' }}/>
          </div>
          <span style={{ fontSize:11, fontWeight:700, color:color, whiteSpace:'nowrap' }}>
            {step.isLast ? 'Complete!' : `${stepIdx + 1} / ${STEPS.length}`}
          </span>
          {step.skippable !== false && (
            <button onClick={finish} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted,#9ca3af)', padding:'2px 4px', lineHeight:1, borderRadius:6, display:'flex', alignItems:'center' }}>
              <X size={14}/>
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ fontSize:10, fontWeight:700, color:color, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>
          {step.isLast ? '✅ All done' : `Tour step ${stepIdx + 1}`}
        </div>
        <h3 style={{ fontSize:16, fontWeight:800, color:'var(--text-primary,#111)', margin:'0 0 8px', lineHeight:1.3 }}>
          {step.title}
        </h3>
        <p style={{ fontSize:13, color:'var(--text-secondary,#6b7280)', lineHeight:1.65, margin:'0 0 20px' }}>
          {step.body}
        </p>

        {/* Buttons */}
        <div style={{ display:'flex', gap:8 }}>
          {stepIdx > 0 && (
            <button onClick={prev} style={{ width:40, height:40, borderRadius:10, border:'1px solid var(--border,#e5e7eb)', background:'var(--bg-page,#f9fafb)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted,#9ca3af)', flexShrink:0 }}>
              <ChevronLeft size={16}/>
            </button>
          )}
          <button onClick={next} style={{ flex:1, padding:'12px 16px', background:`linear-gradient(135deg,${color},${color === '#2563EB' ? '#0D9488' : '#2563EB'})`, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, letterSpacing:'-0.01em' }}>
            {step.isLast ? <><CheckCircle size={15}/> {step.action}</> : <>{step.action || 'Next'} <ChevronRight size={15}/></>}
          </button>
        </div>
      </div>
    </>
  );
}
