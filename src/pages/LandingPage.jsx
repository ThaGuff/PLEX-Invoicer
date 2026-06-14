/**
 * LandingPage.jsx — InvoiceKing.app
 * Light, trustworthy, conversion-focused marketing page.
 * Brand palette mirrors the app: #1A1A1A sidebar dark, #C6E404 green, #C6E404 lime CTA, #F5F5F5 cream.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ArrowRight, Shield, Zap, Clock, Users,
  BarChart3, FileText, DollarSign, Star, Menu, X,
  Smartphone, CreditCard, ChevronRight, Check, Globe
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  forestDark: '#1A1A1A',
  green:      '#C6E404',
  lime:       '#C6E404',
  cream:      '#F5F5F5',
  surface:    '#FFFFFF',
  border:     '#E2E8E2',
  textPrimary:'#1A1A1A',
  textMuted:  '#5A7060',
  textLight:  '#8FA394',
};

const font = "'Inter', sans-serif";

// ─── Nav ──────────────────────────────────────────────────────────
function Nav({ onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    { label: 'Features',    href: '#features' },
    { label: 'How it works',href: '#how' },
    { label: 'Pricing',     href: '#pricing' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? `1px solid ${C.border}` : 'none',
      transition: 'all 0.25s ease',
      fontFamily: font,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="22" viewBox="0 0 80 100" fill="none">
                <rect x="2" y="36" width="76" height="8" rx="2" fill="#C6E404"/>
                <polygon points="12,18 22,36 2,36" fill="#C6E404"/>
                <polygon points="68,18 78,36 58,36" fill="#C6E404"/>
                <rect x="28" y="22" width="24" height="14" fill="#C6E404"/>
                <polygon points="40,7 47,15 40,23 33,15" fill="#C6E404"/>
                <path d="M4,44 L4,92 Q4,96 8,96 L56,96 Q60,96 60,92 L60,58 L46,44 Z" fill="white"/>
                <polygon points="46,44 60,58 46,58" fill="#C6E404"/>
              </svg></div>
          <span style={{ fontSize: 18, fontWeight: 800, color: scrolled ? C.textPrimary : '#fff', letterSpacing: '-0.025em' }}>
            Invoice King
          </span>
        </div>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="rln-desktop-links">
          {links.map(({ label, href }) => (
            <a key={label} href={href} style={{
              fontSize: 14, fontWeight: 600,
              color: scrolled ? C.textMuted : 'rgba(255,255,255,0.85)',
              textDecoration: 'none', transition: 'color 0.15s'
            }}
              onMouseEnter={e => e.target.style.color = scrolled ? C.textPrimary : '#fff'}
              onMouseLeave={e => e.target.style.color = scrolled ? C.textMuted : 'rgba(255,255,255,0.85)'}
            >{label}</a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="rln-desktop-cta">
          <button onClick={onLogin} style={{
            padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${scrolled ? C.border : 'rgba(255,255,255,0.35)'}`,
            background: 'transparent', color: scrolled ? C.textPrimary : '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font, transition: 'all 0.15s'
          }}>Sign in</button>
          <button onClick={onLogin} style={{
            padding: '8px 20px', borderRadius: 9, border: 'none',
            background: C.forestDark, color: C.lime,
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font,
            boxShadow: '0 2px 12px rgba(13,26,13,0.18)'
          }}>Start free →</button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="rln-mobile-menu" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: scrolled ? C.textPrimary : '#fff', padding: 4,
        }}>
          {open ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          background: '#fff', borderTop: `1px solid ${C.border}`,
          padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {links.map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setOpen(false)} style={{
              fontSize: 15, fontWeight: 600, color: C.textPrimary,
              textDecoration: 'none', padding: '10px 0',
              borderBottom: `1px solid ${C.border}`
            }}>{label}</a>
          ))}
          <button onClick={onLogin} style={{
            marginTop: 12, width: '100%', padding: '13px', borderRadius: 10,
            border: 'none', background: C.forestDark, color: C.lime,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: font
          }}>Get started free →</button>
          <button onClick={onLogin} style={{
            width: '100%', padding: '12px', borderRadius: 10,
            border: `1.5px solid ${C.border}`, background: 'transparent',
            color: C.textPrimary, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: font
          }}>Sign in</button>
        </div>
      )}

      <style>{`
        .rln-desktop-links, .rln-desktop-cta { display: flex !important; }
        .rln-mobile-menu { display: none !important; }
        @media (max-width: 720px) {
          .rln-desktop-links, .rln-desktop-cta { display: none !important; }
          .rln-mobile-menu { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────
function Hero({ onLogin }) {
  return (
    <section style={{
      minHeight: '100vh', background: C.forestDark,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '100px 24px 80px', position: 'relative', overflow: 'hidden',
      fontFamily: font,
    }}>
      {/* Subtle texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(198,228,4,0.07) 0%, transparent 55%),
                          radial-gradient(circle at 80% 20%, rgba(198,228,4,0.05) 0%, transparent 45%)`,
      }}/>

      <div style={{ maxWidth: 1100, width: '100%', display: 'flex', alignItems: 'center', gap: 60, position: 'relative', zIndex: 1 }} className="rln-hero-inner">
        {/* Left: copy */}
        <div style={{ flex: '1 1 500px', maxWidth: 580 }}>
          {/* Trust badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(198,228,4,0.12)', border: '1px solid rgba(198,228,4,0.25)',
            borderRadius: 100, padding: '5px 14px', marginBottom: 28,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.lime, flexShrink: 0 }}/>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.lime, letterSpacing: '0.02em' }}>
              Built for service businesses — quotes to cash in minutes
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900,
            color: '#fff', lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 20px',
          }}>
            Invoicing.<br/>
            Simplified.<br/>
            <span style={{ color: C.lime }}>Own Your Cash Flow.</span>
          </h1>

          <p style={{
            fontSize: 17, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65,
            margin: '0 0 36px', maxWidth: 480, fontWeight: 400,
          }}>
            Invoice King is the invoicing and quoting platform built for contractors,
            cleaners, and service pros who work from their phone. Professional quotes
            in under 2 minutes, Stripe payments, and an AI assistant that helps you
            close faster.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={onLogin} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 11, border: 'none',
              background: C.lime, color: '#1A1A1A',
              fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font,
              boxShadow: '0 4px 20px rgba(198,228,4,0.3)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(198,228,4,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(198,228,4,0.3)'; }}
            >
              Start free — no card needed <ArrowRight size={16}/>
            </button>
            <button onClick={onLogin} style={{
              padding: '14px 24px', borderRadius: 11,
              border: '1.5px solid rgba(255,255,255,0.18)', background: 'transparent',
              color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: font,
            }}>View demo</button>
          </div>

          {/* Social proof micro-line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28, flexWrap: 'wrap' }}>
            {[
              { icon: Shield, text: 'SOC2-ready infrastructure' },
              { icon: CreditCard, text: 'Stripe-powered payments' },
              { icon: Smartphone, text: 'PWA — works offline' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={13} color="rgba(255,255,255,0.4)"/>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: App UI card mockup */}
        <div style={{ flex: '0 0 380px', maxWidth: 420 }} className="rln-hero-card">
          <AppCard />
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .rln-hero-inner { flex-direction: column !important; gap: 40px !important; }
          .rln-hero-card { display: none !important; }
        }
      `}</style>
    </section>
  );
}

// ─── App UI Card (hero right side) ───────────────────────────────
function AppCard() {
  return (
    <div style={{
      background: '#1A1A1A', borderRadius: 20, overflow: 'hidden',
      border: '1px solid rgba(198,228,4,0.15)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
    }}>
      {/* Top bar */}
      <div style={{ background: '#1A1A1A', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }}/>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: font }}>Invoice King</span>
        </div>
        <span style={{ fontSize: 11, color: C.lime, fontWeight: 600, fontFamily: font }}>● Live</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.04)', margin: '14px 14px 0' }}>
        {[
          { label: 'Revenue', val: '$18,450', sub: 'This month', up: true },
          { label: 'Quotes out', val: '12', sub: 'Awaiting', up: false },
          { label: 'Collected', val: '94%', sub: 'Collection rate', up: true },
        ].map(({ label, val, sub, up }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 14px 12px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: font, letterSpacing: '-0.02em' }}>{val}</div>
            <div style={{ fontSize: 10, color: up ? C.green : 'rgba(255,255,255,0.35)', fontWeight: 600, fontFamily: font, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Recent quotes */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 8, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Quotes</div>
        {[
          { name: 'Martinez Landscaping', amount: '$3,200', status: 'accepted', dot: C.green },
          { name: 'Oak Creek HVAC',        amount: '$1,850', status: 'sent',     dot: '#F59E0B' },
          { name: 'Thornton Plumbing',     amount: '$975',   status: 'draft',    dot: 'rgba(255,255,255,0.3)' },
        ].map(({ name, amount, status, dot }) => (
          <div key={name} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 10px', borderRadius: 8, marginBottom: 3,
            background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }}/>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: font }}>{name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: font, textTransform: 'capitalize' }}>{status}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: font }}>{amount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* New quote CTA button */}
      <div style={{ padding: '12px 14px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: C.lime, borderRadius: 10, padding: '10px',
          color: C.forestDark, fontSize: 13, fontWeight: 800, fontFamily: font,
        }}>
          <span>+ New Quote</span>
        </div>
      </div>
    </div>
  );
}

// ─── Trust Bar ───────────────────────────────────────────────────
function TrustBar() {
  const items = [
    { icon: Shield,    text: 'Bank-grade encryption' },
    { icon: CreditCard,text: 'Stripe-powered payments' },
    { icon: Smartphone,text: 'Native PWA — install on any phone' },
    { icon: Globe,     text: 'Send quotes in any currency' },
    { icon: Zap,       text: 'AI-assisted quoting' },
  ];
  return (
    <div style={{ background: C.cream, borderBottom: `1px solid ${C.border}`, padding: '16px 24px', overflow: 'hidden', fontFamily: font }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
        {items.map(({ icon: Icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            <Icon size={14} color={C.lime} strokeWidth={2.5}/>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── How It Works ────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Build your quote',
      body: 'Pick from your saved services, enter quantities, and your branded quote is ready. Takes under 2 minutes from any device.',
      accent: C.green,
    },
    {
      num: '02',
      title: 'Send & get approved',
      body: 'Your client gets a clean, mobile-friendly portal to review, sign, and approve — no account needed on their end.',
      accent: C.lime,
    },
    {
      num: '03',
      title: 'Convert and collect',
      body: 'One tap converts the quote into an invoice. Stripe handles payment. You get notified the moment money moves.',
      accent: C.green,
    },
  ];

  return (
    <section id="how" style={{ background: C.surface, padding: '88px 24px', fontFamily: font }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.lime, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: C.textPrimary, letterSpacing: '-0.03em', margin: 0 }}>
            From estimate to payment in three steps
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2 }}>
          {steps.map(({ num, title, body, accent }, i) => (
            <div key={num} style={{ position: 'relative' }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', top: 28, right: -1, width: 2, height: 60, background: C.border, zIndex: 0 }} className="rln-step-divider"/>
              )}
              <div style={{ padding: '32px 32px 36px', position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: accent,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: accent === C.lime ? C.forestDark : 'rgba(198,228,4,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: accent, flexShrink: 0 }}>{num}</span>
                  Step {num}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{title}</h3>
                <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`.rln-step-divider { display: block; } @media (max-width: 720px) { .rln-step-divider { display: none !important; } }`}</style>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: FileText,  title: 'Smart quoting',        body: 'Line-item templates, saved services, and AI suggestions help you quote faster and more accurately every time.' },
    { icon: DollarSign,title: 'Stripe payments',      body: 'Integrated payment links on every invoice. Your clients pay in seconds. Funds hit your account directly.' },
    { icon: BarChart3, title: 'Business analytics',   body: 'Real-time revenue tracking, quote conversion rates, and cashflow forecasting — all in one clean dashboard.' },
    { icon: Clock,     title: 'Time tracking',        body: 'Log hours against jobs. Automatically calculate billable totals and roll them into invoices.' },
    { icon: Users,     title: 'Client management',    body: 'A full CRM with contact history, AI lead scoring, notes, and automated follow-up sequences.' },
    { icon: Zap,       title: 'Automations',          body: 'Set up reminder sequences, payment nudges, and follow-ups that run automatically while you work.' },
    { icon: Smartphone,title: 'Built for mobile',     body: 'A true PWA that installs on iOS and Android. Works offline. Feels like a native app.' },
    { icon: Shield,    title: 'Secure & reliable',    body: 'Railway-hosted infrastructure, Supabase-backed auth, and encrypted data at rest and in transit.' },
    { icon: Globe,     title: 'Client portal',        body: 'Branded public portals where clients view, approve, and pay — with no login required on their end.' },
  ];

  return (
    <section id="features" style={{ background: C.cream, padding: '88px 24px', fontFamily: font }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.lime, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Features</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: C.textPrimary, letterSpacing: '-0.03em', margin: 0 }}>
            Everything your service business needs
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} style={{
              background: C.surface, borderRadius: 16, padding: '28px 28px 30px',
              border: `1px solid ${C.border}`,
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(13,26,13,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(198,228,4,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={19} color={C.lime} strokeWidth={2.2}/>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: '0 0 8px', letterSpacing: '-0.015em' }}>{title}</h3>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────
function Pricing({ onLogin }) {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Starter',
      monthly: 0,
      annual: 0,
      tag: 'Free forever',
      tagColor: C.green,
      perks: [
        '5 active quotes / month',
        '5 active invoices / month',
        'Stripe payment links',
        'Client portal',
        'Mobile PWA',
        'Email support',
      ],
      cta: 'Get started free',
      highlight: false,
    },
    {
      name: 'Pro',
      monthly: 39,
      annual: 29,
      tag: 'Most popular',
      tagColor: C.forestDark,
      tagBg: C.lime,
      perks: [
        'Unlimited quotes & invoices',
        'AI quote assistant',
        'Automations & reminders',
        'Time tracking',
        'Team members (up to 5)',
        'Analytics dashboard',
        'Priority support',
      ],
      cta: 'Start Pro free for 14 days',
      highlight: true,
    },
    {
      name: 'Business',
      monthly: 89,
      annual: 69,
      tag: 'Growing teams',
      tagColor: C.textMuted,
      perks: [
        'Everything in Pro',
        'Unlimited team members',
        'Custom branding & domain',
        'Advanced analytics',
        'API access',
        'Dedicated onboarding',
        'SLA-backed support',
      ],
      cta: 'Start Business free for 14 days',
      highlight: false,
    },
  ];

  return (
    <section id="pricing" style={{ background: C.surface, padding: '88px 24px', fontFamily: font }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.lime, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: C.textPrimary, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
            Simple pricing, no surprises
          </h2>
          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: C.cream, borderRadius: 100, padding: '6px 6px 6px 14px', border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: annual ? C.textLight : C.textPrimary }}>Monthly</span>
            <button onClick={() => setAnnual(!annual)} style={{
              width: 44, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer',
              background: annual ? C.forestDark : C.border, position: 'relative', transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 3, left: annual ? 23 : 3, width: 18, height: 18,
                borderRadius: '50%', background: annual ? C.green : '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}/>
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: annual ? C.textPrimary : C.textLight }}>Annual</span>
            {annual && <span style={{ fontSize: 11, fontWeight: 700, background: C.lime, color: '#1A1A1A', borderRadius: 100, padding: '2px 8px' }}>Save 25%</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20, alignItems: 'start' }}>
          {plans.map(({ name, monthly, annual: ann, tag, tagColor, tagBg, perks, cta, highlight }) => {
            const price = annual ? ann : monthly;
            return (
              <div key={name} style={{
                borderRadius: 18, overflow: 'hidden',
                border: highlight ? `2px solid ${C.forestDark}` : `1px solid ${C.border}`,
                background: highlight ? C.forestDark : C.surface,
                boxShadow: highlight ? '0 12px 40px rgba(13,26,13,0.18)' : 'none',
              }}>
                <div style={{ padding: '28px 28px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: highlight ? '#fff' : C.textPrimary }}>{name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '3px 10px',
                      background: tagBg || (highlight ? 'rgba(198,228,4,0.15)' : C.cream),
                      color: tagColor,
                    }}>{tag}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: highlight ? '#fff' : C.textPrimary, letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && <span style={{ fontSize: 14, color: highlight ? 'rgba(255,255,255,0.5)' : C.textLight, fontWeight: 500 }}>/mo</span>}
                  </div>
                </div>

                <div style={{ padding: '0 28px 24px' }}>
                  <div style={{ height: 1, background: highlight ? 'rgba(255,255,255,0.08)' : C.border, marginBottom: 20 }}/>
                  {perks.map(perk => (
                    <div key={perk} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
                      <Check size={14} color={highlight ? C.green : C.green} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }}/>
                      <span style={{ fontSize: 13, color: highlight ? 'rgba(255,255,255,0.75)' : C.textMuted, fontWeight: 500, lineHeight: 1.4 }}>{perk}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '0 20px 24px' }}>
                  <button onClick={onLogin} style={{
                    width: '100%', padding: '13px', borderRadius: 11, border: 'none',
                    background: highlight ? C.lime : C.forestDark,
                    color: highlight ? C.forestDark : '#fff',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font,
                    transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >{cta}</button>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: C.textLight }}>
          All plans include a 14-day free trial on Pro features. No credit card required to start.
        </p>
      </div>
    </section>
  );
}

// ─── Testimonials ────────────────────────────────────────────────
function Testimonials() {
  const reviews = [
    { name: 'James Thornton', role: 'Owner, Thornton Pressure Wash', stars: 5, text: "I used to send quotes on paper. Now I send them from my truck in 90 seconds and get paid before I leave the driveway. Invoice King paid for itself in the first week." },
    { name: 'Maria Santos',   role: 'Owner, Santos Cleaning Co.',    stars: 5, text: "The client portal is a game changer. My customers can approve quotes and pay from their phone. I've cut my collections time from weeks to days." },
    { name: 'Derek Williams', role: 'HVAC Technician, DW Services',  stars: 5, text: "The AI quote assistant knows my service catalog better than I do. It suggests line items I always forget to add. Easily adding $200–$400 per job." },
  ];

  return (
    <section style={{ background: C.cream, padding: '88px 24px', fontFamily: font }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.lime, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Testimonials</div>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 900, color: C.textPrimary, letterSpacing: '-0.03em', margin: 0 }}>
            Service pros love Invoice King
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
          {reviews.map(({ name, role, stars, text }) => (
            <div key={name} style={{ background: C.surface, borderRadius: 16, padding: '28px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {Array(stars).fill(0).map((_, i) => <Star key={i} size={14} color="#F59E0B" fill="#F59E0B"/>)}
              </div>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, margin: '0 0 20px', fontStyle: 'italic' }}>"{text}"</p>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{name}</div>
                <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────
function FinalCTA({ onLogin }) {
  return (
    <section style={{ background: C.forestDark, padding: '88px 24px', fontFamily: font }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 16px' }}>
          Your next invoice is<br/>
          <span style={{ color: C.lime }}>3 minutes away.</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: '0 0 36px' }}>
          Join service businesses already using Invoice King to quote faster,
          collect easier, and grow with confidence.
        </p>
        <button onClick={onLogin} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '15px 36px', borderRadius: 12, border: 'none',
          background: C.lime, color: '#1A1A1A',
          fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: font,
          boxShadow: '0 4px 24px rgba(198,228,4,0.3)',
        }}>
          Get started free <ArrowRight size={17}/>
        </button>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 14 }}>No credit card required · Cancel anytime</p>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { heading: 'Product', links: [
      { label: 'Features',      href: '#features' },
      { label: 'Pricing',       href: '#pricing' },
      { label: 'How it works',  href: '#how' },
      { label: 'Changelog',     href: '#' },
    ]},
    { heading: 'Company', links: [
      { label: 'About',   href: '#' },
      { label: 'Blog',    href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Press',   href: '#' },
    ]},
    { heading: 'Legal', links: [
      { label: 'Privacy policy',  href: '/privacy' },
      { label: 'Terms of service',href: '/terms' },
      { label: 'Security',        href: '/privacy#data-storage' },
      { label: 'Cookies',         href: '/privacy#cookies' },
    ]},
    { heading: 'Support', links: [
      { label: 'Help center', href: '#' },
      { label: 'Contact',     href: 'mailto:support@invoiceking.app' },
      { label: 'Status',      href: '#' },
      { label: 'Community',   href: '#' },
    ]},
  ];

  return (
    <footer style={{ background: '#080f08', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '56px 24px 32px', fontFamily: font }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(4, 1fr)', gap: 40, marginBottom: 48 }} className="rln-footer-grid">
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: C.forestDark, border: '1px solid rgba(198,228,4,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="17" viewBox="0 0 18 20" fill="none">
                  <rect x="2" y="1" width="3.2" height="18" rx="1.6" fill={C.lime}/>
                  <rect x="5" y="1" width="7.5" height="2.8" rx="1.4" fill={C.lime}/>
                  <rect x="5" y="8.6" width="6.5" height="2.8" rx="1.4" fill={C.lime}/>
                  <rect x="10.5" y="1" width="2.8" height="10.5" rx="1.4" fill={C.lime}/>
                  <line x1="6.5" y1="12" x2="16" y2="19.5" stroke={C.lime} strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Invoice King</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0 }}>
              Quotes. Invoices.<br/>Get Paid.
            </p>
          </div>

          {cols.map(({ heading, links }) => (
            <div key={heading}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>{heading}</div>
              {links.map(link => {
                const label = typeof link === 'string' ? link : link.label;
                const href  = typeof link === 'string' ? '#'  : link.href;
                return (
                  <div key={label} style={{ marginBottom: 9 }}>
                    <a href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = '#fff'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
                    >{label}</a>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2026 Invoice King. All rights reserved.</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            <a href="mailto:support@invoiceking.app" style={{ color: C.lime, textDecoration: 'none' }}>support@invoiceking.app</a>
          </span>
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .rln-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .rln-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const handleLogin = () => navigate('/login');

  return (
    <div style={{ fontFamily: font, overflowX: 'hidden' }}>
      <Nav onLogin={handleLogin} />
      <Hero onLogin={handleLogin} />
      <TrustBar />
      <HowItWorks />
      <Features />
      <Pricing onLogin={handleLogin} />
      <Testimonials />
      <FinalCTA onLogin={handleLogin} />
      <Footer />
    </div>
  );
}
