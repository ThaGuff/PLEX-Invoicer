/**
 * OnboardingTour — Contextual, non-blocking page guide
 * Updated to reflect all features added since initial build:
 * - Company onboarding wizard
 * - Quote templates by industry
 * - Payment due date / due upon receipt
 * - Draggable dashboard widgets
 * - Weekly schedule widget
 * - Business type auto-template
 * - Team workspace chat
 * - Notifications
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronRight, Lightbulb } from 'lucide-react';

const PAGE_TIPS = {
  '/dashboard': {
    title: '👋 Welcome to Revanew!',
    body: "Your command center. See live revenue stats, overdue alerts, and your weekly schedule at a glance. The cashflow forecast is on the right — switch between Bar, Line, and Pie charts. Drag widgets to rearrange them on desktop.",
    cta: 'Set up your business →',
    ctaAction: () => window.dispatchEvent(new CustomEvent('revanew:settings')),
    position: 'center',
  },
  '/quotes/new': {
    title: '📝 Create a Quote in Seconds',
    body: "Pick your industry template (HVAC, Electrical, Plumbing, and 12 others) to auto-load all your services. Set a payment due date or check 'Due upon receipt'. Your company logo and info appear automatically on every quote.",
    position: 'bottom',
    cta: null,
  },
  '/quotes': {
    title: '📋 All Your Quotes',
    body: "Status updates automatically: Draft → Sent → Viewed → Accepted. Click any quote to edit or convert to an invoice. Set a default template in Account Settings so services load automatically every time.",
    position: 'center',
    cta: null,
  },
  '/invoices': {
    title: '💰 Invoice Dashboard',
    body: "Send invoices directly from here — your client gets a branded payment link. Use 'Send & Mark Sent' for email delivery or 'Send Reminder' for follow-ups. Overdue invoices show as alerts on your dashboard.",
    position: 'center',
    cta: null,
  },
  '/contacts': {
    title: '👥 Client Directory',
    body: "Every client you quote is saved here automatically. See complete history — all quotes, invoices, and payment status per client.",
    position: 'center',
    cta: null,
  },
  '/calendar': {
    title: '📅 Job Scheduling',
    body: "Schedule jobs and appointments here. Events sync to your dashboard's weekly schedule widget automatically. Connect Google Calendar via Account Settings → Integrations to sync both ways.",
    position: 'center',
    cta: null,
  },
  '/documents': {
    title: '📁 Document Storage',
    body: "Upload contracts, permits, photos, and project files. All file types supported — PDFs, Word docs, images. Click the download icon to view or save any file.",
    position: 'center',
    cta: null,
  },
  '/workspace': {
    title: '💬 Team Workspace',
    body: "Slack-style team chat. Create channels, share files, @mention teammates for instant notifications. Every message notifies all team members. Invite your team from Account Settings.",
    position: 'center',
    cta: null,
  },
  '/automations': {
    title: '⚡ Automation Engine',
    body: "Set up once — runs forever. Create follow-up sequences for unread quotes, overdue invoices, and repeat customers. Automations trigger automatically when you send quotes and invoices.",
    position: 'center',
    cta: null,
  },
  '/analytics': {
    title: '📊 Business Intelligence',
    body: "Predictive revenue, quote acceptance rates, overdue risk scoring, and AI-powered growth recommendations. All data updates in real time.",
    position: 'center',
    cta: null,
  },
  '/billing': {
    title: '💳 Your Subscription',
    body: "Starter: 25 quotes/invoices per month, PDF export, basic features. Pro ($49/mo): Unlimited quotes, AI tools, Stripe payments, automations, calendar, documents, team workspace. Agency ($99/mo): Everything + white-label and API access.",
    position: 'center',
    cta: null,
  },
};

const STORAGE_KEY = 'revanew_tour_seen_pages_v2';

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
  const loc = useLocation();
  const [tip, setTip] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setTip(null), 300);
  }, []);

  useEffect(() => {
    const path = loc.pathname;
    const pageTip = PAGE_TIPS[path];
    if (!pageTip) return;
    const seen = getSeenPages();
    if (seen.has(path)) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTip(pageTip);
      setVisible(true);
      markPageSeen(path);
    }, 1200);
    return () => clearTimeout(timerRef.current);
  }, [loc.pathname]);

  if (!tip) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 90, right: 20, zIndex: 999,
      width: 320, maxWidth: 'calc(100vw - 40px)',
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(11,18,32,0.2)',
        overflow: 'hidden',
      }}>
        {/* Accent bar */}
        <div style={{ height: 3, background: '#3DD68C' }} />

        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lightbulb size={13} style={{ color: '#3DD68C' }} />
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {tip.title}
              </p>
            </div>
            <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0, lineHeight: 1 }}>
              <X size={14} />
            </button>
          </div>

          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {tip.body}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            {tip.cta && (
              <button onClick={() => { tip.ctaAction?.(); dismiss(); }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: '#3DD68C', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {tip.cta} <ChevronRight size={11} />
              </button>
            )}
            <button onClick={dismiss}
              style={{ flex: tip.cta ? 0 : 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
