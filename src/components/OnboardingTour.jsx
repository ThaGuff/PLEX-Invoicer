/**
 * OnboardingTour — Contextual, non-blocking page guide
 * Shows helpful tooltips as users navigate the app naturally
 * Each page shows a tip the FIRST TIME a new user visits it
 * Users can explore freely — the tour follows them, not the other way around
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronRight, Lightbulb } from 'lucide-react';

// Tips per page - shown first time a new user visits that page
const PAGE_TIPS = {
  '/dashboard': {
    title: '👋 Welcome to Revanew!',
    body: "This is your command center. See revenue at a glance, create quotes, and track outstanding invoices. Explore the sidebar to access all features.",
    selector: null,
    cta: 'Start with Settings →',
    ctaAction: () => window.dispatchEvent(new CustomEvent('revanew:settings')),
    position: 'center',
  },
  '/quotes/new': {
    title: '📝 Create Your First Quote',
    body: "Add your client's info, select services from your catalog (or type them), set prices, and hit Save. Your client gets a professional link to review and e-sign.",
    selector: '[data-tour="quote-client"], input[placeholder*="lient"]',
    position: 'bottom',
    cta: null,
  },
  '/quotes': {
    title: '📋 Track All Your Quotes',
    body: "Every quote you send lives here. Status updates automatically: Draft → Sent → Viewed → Accepted. Click any quote to view, edit, or convert to an invoice.",
    selector: null,
    position: 'center',
    cta: null,
  },
  '/invoices': {
    title: '💰 Your Invoice Dashboard',
    body: "Invoices live here. Send payment links, mark as paid, and see overdue amounts at a glance. Click any invoice to send reminders or create a Stripe payment link.",
    selector: null,
    position: 'center',
    cta: null,
  },
  '/contacts': {
    title: '👥 Client Directory',
    body: "Every client you quote is saved here automatically. Tap any client to see their complete history — all quotes, invoices, and payment status in one place.",
    selector: null,
    position: 'center',
    cta: null,
  },
  '/calendar': {
    title: '📅 Job Scheduling',
    body: "Schedule jobs, estimates, and appointments here. Switch between Month, Week, and List views. Tap any day to add a new event — assign it to team members and tag it.",
    selector: null,
    position: 'center',
    cta: null,
  },
  '/workspace': {
    title: '💬 Team Workspace',
    body: "Your team's Slack-style chat hub. Create channels, share files and photos, @mention teammates for instant notifications. Invite your team using the Invite button above.",
    selector: null,
    position: 'center',
    cta: null,
  },
  '/automations': {
    title: '⚡ Set It & Forget It',
    body: "Automate follow-ups for unread quotes, overdue invoices, and repeat customers. Set up a sequence once — Revanew sends the emails automatically on your schedule.",
    selector: null,
    position: 'center',
    cta: null,
  },
  '/analytics': {
    title: '📊 Business Intelligence',
    body: "See predictive revenue, track quote acceptance rates, spot at-risk deals, and get AI-powered recommendations to grow your revenue.",
    selector: null,
    position: 'center',
    cta: null,
  },
  '/admin': {
    title: '⚙️ Account Settings',
    body: "Set up your business: add your logo, colors, contact info, and service catalog. Your branding appears on every quote, invoice, and email your clients receive.",
    selector: '[data-tour="logo-section"], input[placeholder*="usiness"]',
    position: 'bottom',
    cta: 'Upload your logo first',
    ctaAction: null,
  },
};

const STORAGE_KEY = 'revanew_tour_seen_pages';

function getSeenPages() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

function markPageSeen(path) {
  const seen = getSeenPages();
  seen.add(path);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}

export default function OnboardingTour({ onDone }) {
  const location = useLocation();
  const [tip, setTip] = useState(null);
  const [targetRect, setTargetRect] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const currentPath = location.pathname;

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setTip(null), 300);
    if (currentPath) markPageSeen(currentPath);
  }, [currentPath]);

  const findAndHighlight = useCallback((selector) => {
    if (!selector) { setTargetRect(null); return; }
    const selectors = selector.split(',').map(s => s.trim());
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            setTimeout(() => setTargetRect(el.getBoundingClientRect()), 400);
            return;
          }
        }
      } catch {}
    }
    setTargetRect(null);
  }, []);

  useEffect(() => {
    // Clear any pending tip
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);

    // Check if this is a new user (tour enabled)
    const isNewUser = localStorage.getItem('revanew_show_tour') === '1';
    if (!isNewUser) return;

    // Check if user has seen this page already
    const seen = getSeenPages();
    const normalPath = currentPath.split('/').slice(0, 2).join('/') || '/dashboard';
    const pageTip = PAGE_TIPS[normalPath] || PAGE_TIPS[currentPath];

    if (!pageTip || seen.has(normalPath)) return;

    // Show tip after a short delay (let page render)
    timerRef.current = setTimeout(() => {
      setTip(pageTip);
      setVisible(true);
      if (pageTip.selector) findAndHighlight(pageTip.selector);
      else setTargetRect(null);
    }, 1200);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentPath]);

  if (!tip || !visible) return null;

  // Calculate tooltip position
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const TW = Math.min(320, vw - 32);

  let tooltipStyle = { position: 'fixed', zIndex: 10001, width: TW };

  if (!targetRect || tip.position === 'center') {
    tooltipStyle = {
      ...tooltipStyle,
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  } else {
    const pad = 12;
    switch (tip.position) {
      case 'bottom':
        tooltipStyle.top = Math.min(targetRect.bottom + 14, vh - 320);
        tooltipStyle.left = Math.max(pad, Math.min(targetRect.left + targetRect.width/2 - TW/2, vw - TW - pad));
        break;
      case 'right':
        tooltipStyle.top = Math.max(pad, targetRect.top);
        tooltipStyle.left = Math.min(targetRect.right + 14, vw - TW - pad);
        break;
      default:
        tooltipStyle.top = '50%'; tooltipStyle.left = '50%';
        tooltipStyle.transform = 'translate(-50%,-50%)';
    }
  }

  const hasHighlight = !!targetRect && tip.position !== 'center';

  return (
    <>
      <style>{`
        .tour-tip { animation: tourSlideUp 0.25s ease both; }
        @keyframes tourSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Backdrop - semi-transparent, lets users click through after dismiss */}
      {!hasHighlight && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.45)', zIndex:9999, backdropFilter:'blur(1px)' }}
          onClick={dismiss} />
      )}

      {/* SVG spotlight when we have a target */}
      {hasHighlight && (() => {
        const pad = 8;
        const x = Math.max(0, targetRect.left - pad);
        const y = Math.max(0, targetRect.top - pad);
        const w = targetRect.width + pad * 2;
        const h = targetRect.height + pad * 2;
        return (
          <>
            <svg style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:9999, pointerEvents:'none' }}>
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect x={x} y={y} width={w} height={h} rx={8} fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(11,18,32,0.6)" mask="url(#tour-spotlight-mask)" />
              <rect x={x} y={y} width={w} height={h} rx={8} fill="none" stroke="#2563EB" strokeWidth="2.5" opacity="0.9" />
              <rect x={x-2} y={y-2} width={w+4} height={h+4} rx={10} fill="none" stroke="#2563EB" strokeWidth="1" opacity="0.3" />
            </svg>
            <div style={{ position:'fixed', inset:0, zIndex:10000 }} onClick={dismiss} />
          </>
        );
      })()}

      {/* Tip card */}
      <div className="tour-tip" style={{
        ...tooltipStyle,
        background: 'var(--bg-surface, #fff)',
        borderRadius: 16,
        padding: '20px 22px 22px',
        boxShadow: '0 0 0 1px var(--border, rgba(0,0,0,0.1)), 0 20px 60px rgba(11,18,32,0.3)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Lightbulb size={16} style={{ color:'#F59E0B', flexShrink:0 }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Quick tip</span>
          </div>
          <button onClick={dismiss}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'2px 4px', borderRadius:6, display:'flex', lineHeight:1 }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <h3 style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px', lineHeight:1.3, letterSpacing:'-0.01em' }}>
          {tip.title}
        </h3>
        <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, margin:0 }}>
          {tip.body}
        </p>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, marginTop:16, alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={dismiss}
            style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
            Got it
          </button>
          {tip.cta && (
            <button onClick={() => { tip.ctaAction?.(); dismiss(); }}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700 }}>
              {tip.cta} <ChevronRight size={13} />
            </button>
          )}
          <button onClick={() => {
            // Mark all pages as seen = dismiss tour entirely
            Object.keys(PAGE_TIPS).forEach(p => markPageSeen(p));
            localStorage.removeItem('revanew_show_tour');
            dismiss();
            onDone?.();
          }} style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', padding:0, opacity:0.7 }}>
            Skip all tips
          </button>
        </div>
      </div>
    </>
  );
}
