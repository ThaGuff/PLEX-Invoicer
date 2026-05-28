/**
 * InteractiveOnboardingTour — navigates WITH the user, highlights real UI
 * Shows a floating tooltip anchored to actual page elements
 * Each step navigates to the right page and points at the right thing
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ArrowRight, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── Tour step definitions ───────────────────────────────────────────
   selector: CSS selector of element to highlight (null = center screen)
   route: navigate here before showing this step
   position: where to show tooltip relative to highlight ('top'|'bottom'|'left'|'right'|'center')
   action: text on primary button (null = just Next)
   waitForNav: if true, wait for user to navigate away (they completed the action)
*/
const STEPS = [
  {
    id: 'welcome',
    route: '/',
    selector: null,
    position: 'center',
    title: '👋 Welcome to Revanew!',
    body: "Let's take 2 minutes to set up your account. We'll walk you through each step — you can follow along or skip any step.",
    action: 'Start setup',
    skippable: true,
  },
  {
    id: 'nav-admin',
    route: '/admin',
    selector: 'a[href="/admin"], button[title*="Admin"], [data-tour="admin-link"]',
    position: 'bottom',
    title: '🏢 Step 1: Business Info',
    body: 'First, add your business name, logo color, and contact details. This appears on every quote and invoice your clients see.',
    action: 'Open Admin',
    highlight: true,
  },
  {
    id: 'business-form',
    route: '/admin',
    selector: '[data-tour="account-settings"], .account-settings-form, input[placeholder*="name"], input[placeholder*="business"]',
    position: 'right',
    title: '✏️ Fill in your details',
    body: 'Enter your business name, email, phone, and website. Hit Save when done — this info auto-fills on every document you create.',
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'services-intro',
    route: '/admin',
    selector: '[data-tour="services-section"], [class*="service"]',
    position: 'top',
    title: '⚡ Step 2: Add Your Services',
    body: 'Add the services you offer — cleaning, roofing, landscaping, etc. Once added, you select them when building quotes instead of typing from scratch.',
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'scraper-tip',
    route: '/admin',
    selector: '[data-tour="scraper"], input[placeholder*="URL"], input[placeholder*="website"]',
    position: 'bottom',
    title: '🤖 AI Import (shortcut!)',
    body: 'Have a website? Paste your URL here and our AI will automatically import your services and pricing. Saves 10+ minutes of manual entry.',
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'stripe-connect',
    route: '/admin',
    selector: '[data-tour="stripe-connect"], [class*="stripe"], button[class*="connect"]',
    position: 'top',
    title: '💳 Step 3: Connect Stripe',
    body: 'Connect Stripe to accept credit card payments directly from invoices. Clients pay online — you get paid faster. Takes about 5 minutes.',
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'new-quote',
    route: '/quotes/new',
    selector: '[data-tour="quote-builder"], .quote-builder, form, [class*="quote"]',
    position: 'center',
    title: '📄 Step 4: Create a Quote',
    body: "This is the quote builder. Select a client, pick your services, set prices, and hit Send. Your client gets a professional link to review and e-sign on any device.",
    action: 'Got it',
    highlight: false,
  },
  {
    id: 'client-field',
    route: '/quotes/new',
    selector: 'input[placeholder*="client"], input[placeholder*="name"], input[placeholder*="Client"]',
    position: 'bottom',
    title: '👤 Add client info',
    body: "Type your client's name and email. They'll receive the quote link via email and can sign it from any phone, tablet, or computer.",
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'save-quote',
    route: '/quotes/new',
    selector: 'button[class*="save"], button[type="submit"]',
    position: 'top',
    title: '💾 Save & Send',
    body: "When you're ready, hit Save to create the quote. Then use the Send button to email the client a link. They'll get a professional portal to review and e-sign.",
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'quotes-list',
    route: '/quotes',
    selector: '[class*="list-item"], [class*="quote-row"], table tr',
    position: 'bottom',
    title: '📋 Your Quotes',
    body: "All your quotes appear here. Status updates automatically — Draft → Sent → Viewed → Invoiced. When a client e-signs, it becomes Accepted.",
    action: 'Got it',
    highlight: false,
  },
  {
    id: 'convert-invoice',
    route: '/quotes',
    selector: 'button[class*="invoice"], button:has(svg)',
    position: 'left',
    title: '🧾 Convert to Invoice',
    body: "Tap the Invoice button on any quote to instantly create an invoice. Your client gets a payment link. Track paid vs overdue from the Invoices tab.",
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'invoices-page',
    route: '/invoices',
    selector: '[class*="filter"], [class*="chip-row"]',
    position: 'bottom',
    title: '💰 Track Payments',
    body: "Filter invoices by status: Generated, Sent, Viewed, Overdue, or Paid. Tap any invoice to send reminders, mark as paid, or view the client portal.",
    action: 'Got it',
    highlight: false,
  },
  {
    id: 'clients-page',
    route: '/contacts',
    selector: '[class*="list"], [class*="contact"], [class*="client"]',
    position: 'center',
    title: '👥 Client Directory',
    body: "Every client you quote is saved here automatically. Tap any client to see their full history — all quotes, invoices, and payment status in one place.",
    action: 'Got it',
    highlight: false,
  },
  {
    id: 'calendar-page',
    route: '/calendar',
    selector: '[class*="calendar"], [class*="month-grid"]',
    position: 'center',
    title: '📅 Job Scheduling',
    body: "Schedule jobs and appointments here. Tap any day to see what's booked, add new jobs, and track job status from scheduled → completed.",
    action: 'Got it',
    highlight: false,
  },
  {
    id: 'more-drawer',
    route: '/',
    selector: 'button[class*="more"], .mobile-nav button:last-child',
    position: 'top',
    title: '📱 More Features',
    body: "Tap the More button to access Documents (secure file storage), Photos (job site photos tagged to jobs), and Team (Slack-style team chat for your crew).",
    action: 'Got it',
    highlight: true,
  },
  {
    id: 'automations',
    route: '/automations',
    selector: '[class*="automation"], [class*="sequence"]',
    position: 'center',
    title: '⚡ Automation — Set & Forget',
    body: "Set up automated follow-up sequences. Revanew automatically emails clients when quotes go unread, invoices become overdue, or to upsell repeat customers.",
    action: 'Got it',
    highlight: false,
  },
  {
    id: 'done',
    route: '/',
    selector: null,
    position: 'center',
    title: '🚀 You\'re ready!',
    body: "Your account is set up and you know how everything works. Go create your first quote — it takes under 60 seconds. We're here if you need anything.",
    action: 'Go to Dashboard',
    skippable: false,
    isLast: true,
  },
];

/* ── Highlight overlay ───────────────────────────────────────────── */
function HighlightBox({ rect, color }) {
  if (!rect) return null;
  const pad = 6;
  return (
    <div style={{
      position: 'fixed',
      top:    rect.top    - pad,
      left:   rect.left   - pad,
      width:  rect.width  + pad * 2,
      height: rect.height + pad * 2,
      border: `2px solid ${color}`,
      borderRadius: 10,
      boxShadow: `0 0 0 4000px rgba(11,18,32,0.65), 0 0 0 4px ${color}30`,
      zIndex: 999,
      pointerEvents: 'none',
      transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
      animation: 'tourPulse 2s ease infinite',
    }} />
  );
}

/* ── Tooltip position calculator ────────────────────────────────── */
function getTooltipStyle(rect, position, tooltipW = 340, tooltipH = 260) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const pad = 16;
  let top, left;

  if (!rect || position === 'center') {
    return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }

  switch (position) {
    case 'bottom':
      top = Math.min(rect.bottom + 14, vh - tooltipH - pad);
      left = Math.max(pad, Math.min(rect.left + rect.width/2 - tooltipW/2, vw - tooltipW - pad));
      break;
    case 'top':
      top = Math.max(pad, rect.top - tooltipH - 14);
      left = Math.max(pad, Math.min(rect.left + rect.width/2 - tooltipW/2, vw - tooltipW - pad));
      break;
    case 'right':
      top = Math.max(pad, Math.min(rect.top + rect.height/2 - tooltipH/2, vh - tooltipH - pad));
      left = Math.min(rect.right + 14, vw - tooltipW - pad);
      break;
    case 'left':
      top = Math.max(pad, Math.min(rect.top + rect.height/2 - tooltipH/2, vh - tooltipH - pad));
      left = Math.max(pad, rect.left - tooltipW - 14);
      break;
    default:
      top = '50%'; left = '50%';
      return { top, left, transform: 'translate(-50%,-50%)' };
  }
  return { position: 'fixed', top, left, width: tooltipW };
}

/* ── Main component ─────────────────────────────────────────────── */
export default function OnboardingTour({ onDone }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const step = STEPS[stepIdx];
  const progress = (stepIdx / (STEPS.length - 1)) * 100;

  // Find and highlight target element
  const findTarget = useCallback(() => {
    if (!step.selector) { setTargetRect(null); return; }
    const selectors = step.selector.split(', ');
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => setTargetRect(el.getBoundingClientRect()), 400);
            return;
          }
        }
      } catch {}
    }
    setTargetRect(null);
  }, [step.selector]);

  // Navigate to step route then find target
  useEffect(() => {
    if (!step) return;
    const doNav = async () => {
      if (step.route && location.pathname !== step.route) {
        setNavigating(true);
        navigate(step.route);
        await new Promise(r => setTimeout(r, 600));
        setNavigating(false);
      }
      await new Promise(r => setTimeout(r, 300));
      findTarget();
    };
    doNav();
  }, [stepIdx]);

  // Re-find target on resize
  useEffect(() => {
    const h = () => findTarget();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [findTarget]);

  const next = () => {
    if (step.isLast || stepIdx === STEPS.length - 1) { finish(); return; }
    setStepIdx(i => i + 1);
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  const finish = () => {
    localStorage.setItem('revanew_tour_done', '1');
    localStorage.removeItem('revanew_show_tour');
    navigate('/');
    onDone?.();
  };

  if (!step) return null;

  const tooltipStyle = getTooltipStyle(targetRect, step.position);
  const stepColor = step.id === 'done' ? '#0D9488' :
    stepIdx < 4 ? '#2563EB' : stepIdx < 8 ? '#0D9488' : stepIdx < 12 ? '#7C3AED' : '#D97706';

  return (
    <>
      {/* Inject pulse animation */}
      <style>{`
        @keyframes tourPulse {
          0%,100% { box-shadow: 0 0 0 4000px rgba(11,18,32,0.65), 0 0 0 4px ${stepColor}30; }
          50% { box-shadow: 0 0 0 4000px rgba(11,18,32,0.68), 0 0 0 8px ${stepColor}50; }
        }
        .tour-tooltip { animation: fadeUp 0.25s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Dark overlay (only when no highlight or highlight not found) */}
      {(!step.highlight || !targetRect) && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.65)', zIndex:998, backdropFilter:'blur(2px)' }}
          onClick={() => {}} // block clicks behind
        />
      )}

      {/* Element highlight box */}
      {step.highlight && targetRect && (
        <HighlightBox rect={targetRect} color={stepColor} />
      )}

      {/* Tooltip card */}
      <div className="tour-tooltip" key={stepIdx} style={{
        ...tooltipStyle,
        zIndex: 1000,
        background: 'var(--bg-surface)',
        borderRadius: 18,
        padding: '20px 22px 22px',
        boxShadow: '0 24px 80px rgba(11,18,32,0.4), 0 4px 16px rgba(11,18,32,0.2)',
        border: '1px solid var(--border)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        maxWidth: 360,
        width: 'calc(100vw - 32px)',
      }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          {/* Progress dots */}
          <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'wrap', maxWidth:200 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === stepIdx ? 20 : 6, height:6, borderRadius:3, background: i <= stepIdx ? stepColor : 'var(--border)', transition:'all 0.3s ease' }} />
            ))}
          </div>
          {step.skippable !== false && (
            <button onClick={finish} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'2px 6px', borderRadius:6, fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
              <X size={13} /> Skip
            </button>
          )}
        </div>

        {/* Step counter */}
        <div style={{ fontSize:10, fontWeight:700, color:stepColor, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>
          {step.isLast ? 'Complete!' : `Step ${stepIdx + 1} of ${STEPS.length}`}
        </div>

        {/* Content */}
        <h3 style={{ fontSize:17, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em', marginBottom:8, lineHeight:1.3 }}>
          {step.title}
        </h3>
        <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:18 }}>
          {step.body}
        </p>

        {/* Navigation */}
        <div style={{ display:'flex', gap:8 }}>
          {stepIdx > 0 && (
            <button onClick={prev}
              style={{ width:42, height:42, borderRadius:11, border:'1px solid var(--border)', background:'var(--bg-page)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink:0 }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <button onClick={next}
            style={{ flex:1, padding:'12px 16px', background:`linear-gradient(135deg,${stepColor},${stepColor === '#2563EB' ? '#0D9488' : '#2563EB'})`, color:'#fff', border:'none', borderRadius:11, fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {step.isLast
              ? <><CheckCircle size={16} /> {step.action}</>
              : <>{step.action || 'Next'} <ChevronRight size={16} /></>}
          </button>
        </div>

        {/* Navigating indicator */}
        {navigating && (
          <div style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
            Navigating…
          </div>
        )}
      </div>
    </>
  );
}
