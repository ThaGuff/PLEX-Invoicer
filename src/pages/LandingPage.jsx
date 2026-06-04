/**
 * LandingPage.jsx — Revanew.io Marketing Funnel
 * Full marketing landing page shown to unauthenticated visitors
 * Features: Hero, features, screenshots, pricing, testimonials, login CTA
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ArrowRight, Star, Shield, Zap, Clock, Users,
  BarChart3, FileText, DollarSign, ChevronDown, Menu, X,
  Play, Award, TrendingUp, Brain, Globe, Smartphone
} from 'lucide-react';

// ─── Revanew brand colors ─────────────────────────────────────────
const BRAND = '#2563EB';
const TEAL  = '#0D9488';
const GRAD  = 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)';

// ─── Navigation ───────────────────────────────────────────────────
function Nav({ onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'How It Works', href: '#how' },
    { label: 'Demo', href: '#demo' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(37,99,235,0.1)' : 'none',
      transition: 'all 0.3s ease', padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-revanew.png" alt="Revanew" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain' }} />
          <span style={{ fontSize: 20, fontWeight: 800, color: scrolled ? '#0f172a' : '#fff', letterSpacing: '-0.03em' }}>
            Revanew
          </span>
        </div>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
          {navItems.map(({ label, href }) => (
            <a key={label} href={href}
              style={{ fontSize: 14, fontWeight: 600, color: scrolled ? '#475569' : 'rgba(255,255,255,0.85)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = scrolled ? BRAND : '#fff'}
              onMouseLeave={e => e.target.style.color = scrolled ? '#475569' : 'rgba(255,255,255,0.85)'}>
              {label}
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onLogin}
            style={{ padding: '8px 18px', borderRadius: 10, border: `1.5px solid ${scrolled ? BRAND : 'rgba(255,255,255,0.4)'}`, background: 'transparent', color: scrolled ? BRAND : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s' }}>
            Sign In
          </button>
          <button onClick={onLogin}
            style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: GRAD, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
            Get Started Free
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .desktop-nav { display: none !important; } }
      `}</style>
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────
function Hero({ onLogin }) {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2d40 100%)',
      position: 'relative', overflow: 'hidden', padding: '100px 24px 60px',
    }}>
      {/* Animated gradient orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        {/* Grid pattern */}
        <svg style={{ position: 'absolute', inset: 0, opacity: 0.03 }} width="100%" height="100%">
          <defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', position: 'relative', zIndex: 1 }}>
        {/* Left: Copy */}
        <div>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', marginBottom: 24 }}>
            <Zap size={12} style={{ color: '#60A5FA' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.05em' }}>AI-POWERED INVOICING</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 900, color: '#fff', margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Quotes. Invoices.{' '}
            <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Get Paid.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
            The intelligent billing platform for service businesses. Create professional quotes, send branded invoices, and collect payments — all with AI-powered insights to grow your revenue.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
            <button onClick={onLogin}
              style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: GRAD, color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 30px rgba(37,99,235,0.4)' }}>
              Start Free — No Credit Card <ArrowRight size={16} />
            </button>
            <a href="#demo"
              style={{ padding: '14px 24px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Play size={14} /> Watch Demo
            </a>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#F59E0B" style={{ color: '#F59E0B' }} />)}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Trusted by 500+ service businesses</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {['🏗️', '❄️', '💧', '⚡', '🎨'].map((e, i) => (
                <span key={i} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{e}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: App screenshot mockup */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <AppMockup />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          section > div { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </section>
  );
}

// ─── App Mockup ───────────────────────────────────────────────────
function AppMockup() {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
      {/* Browser frame */}
      <div style={{ background: '#1C2130', borderRadius: 16, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Browser chrome */}
        <div style={{ background: '#141822', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
          </div>
          <div style={{ flex: 1, background: '#1C2130', borderRadius: 6, height: 22, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>revanew.io/dashboard</span>
          </div>
        </div>
        {/* Dashboard preview */}
        <div style={{ padding: 16 }}>
          {/* Header bar */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(13,148,136,0.08))', borderRadius: 10, padding: '12px 14px', marginBottom: 10, border: '1px solid rgba(37,99,235,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600 }}>☀️ GOOD MORNING, RYAN</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>PLEX Automation</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#60A5FA' }}>9:22 PM</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Wednesday, June 4</div>
            </div>
          </div>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'COLLECTED', value: '$22,247', color: '#34D399' },
              { label: 'OUTSTANDING', value: '$7,047', color: '#60A5FA' },
              { label: 'THIS MONTH', value: '$12,000', color: '#A78BFA' },
              { label: 'QUOTES', value: '11', color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#242B3D', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
          {/* Recent quotes mini table */}
          <div style={{ background: '#242B3D', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>RECENT QUOTES</div>
            {[
              { num: 'PQ-0011', name: 'guffey', amount: '$15,200', status: 'Draft' },
              { num: 'PQ-0010', name: '—', amount: '$247', status: 'Draft' },
              { num: 'PQ-0009', name: 'Ryan', amount: '$1,800', status: 'Draft' },
            ].map(({ num, name, amount, status }) => (
              <div key={num} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600 }}>{num}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{name}</span>
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{amount}</span>
                <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(100,116,139,0.3)', color: 'rgba(255,255,255,0.6)' }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating stats cards */}
      <div style={{ position: 'absolute', top: -20, right: -30, background: '#1e3a5f', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600 }}>AI Revenue Score</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>87<span style={{ fontSize: 12, color: '#34D399' }}>/100 ↑</span></div>
      </div>

      <div style={{ position: 'absolute', bottom: 20, left: -30, background: '#0f2d40', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 10, color: '#2DD4BF', fontWeight: 600 }}>Invoice Sent ✓</div>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>$2,800 → HVAC Install</div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: '500+', label: 'Active Businesses' },
    { value: '$2M+', label: 'Revenue Tracked' },
    { value: '15k+', label: 'Invoices Generated' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '4.8★', label: 'Average Rating' },
  ];
  return (
    <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '20px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
        {stats.map(({ value, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: BRAND, letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── How It Works ─────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', icon: '📝', title: 'Create a Quote', desc: 'Pick your industry template — HVAC, Electrical, Plumbing, and 12 more. Services auto-load with labor rates and pricing. Your company logo and info appear automatically.' },
    { num: '02', icon: '📧', title: 'Send & Track', desc: 'Send branded quotes via email. Clients get a portal link to view, approve, or request changes. You\'ll see when they open it — down to the minute.' },
    { num: '03', icon: '💰', title: 'Get Paid', desc: 'Convert accepted quotes to invoices in one click. Clients pay via Stripe, ACH, or card. Overdue reminders send automatically. Cash lands in your bank.' },
  ];
  return (
    <section id="how" style={{ padding: '80px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: '0.1em' }}>HOW IT WORKS</span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#0f172a', margin: '10px 0 14px', letterSpacing: '-0.03em' }}>
            From quote to payment in minutes
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>No spreadsheets. No chasing payments. Just a simple workflow that works.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          {steps.map(({ num, icon, title, desc }, i) => (
            <div key={num} style={{ position: 'relative', padding: '32px 28px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', transition: 'all 0.2s' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: BRAND, opacity: 0.4, letterSpacing: '0.08em', marginBottom: 16 }}>STEP {num}</div>
              <div style={{ fontSize: 40, marginBottom: 14 }}>{icon}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0 }}>{desc}</p>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', right: -22, top: '50%', transform: 'translateY(-50%)', fontSize: 24, color: '#cbd5e1', zIndex: 1 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Grid ────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: <Brain size={22} />, color: '#7C3AED', title: 'AI Revenue Intelligence', desc: 'Every client gets an AI revenue score, health score, and DNA classification (VIP, At-Risk, Repeat Buyer). Know exactly who to focus on.' },
    { icon: <FileText size={22} />, color: BRAND, title: '15 Industry Templates', desc: 'HVAC, Electrical, Plumbing, Pressure Washing, Tree Service, IT, and 9 more. Services auto-load with standard labor rates and pricing.' },
    { icon: <Clock size={22} />, color: TEAL, title: 'Time Tracking', desc: 'Log hours per project. Track billable vs non-billable time. Convert timesheets directly into invoices with one click.' },
    { icon: <BarChart3 size={22} />, color: '#D97706', title: 'Predictive Cash Flow', desc: 'AI-powered 12-week revenue forecast. See overdue risk scores, upcoming renewals, and recommended actions before problems happen.' },
    { icon: <Users size={22} />, color: '#059669', title: 'Team Workspace', desc: 'Slack-style team chat with direct messages, channels, and @mentions. Assign jobs to technicians and track completion in real time.' },
    { icon: <Shield size={22} />, color: '#DC2626', title: 'Smart Collections', desc: 'Automated payment reminders, overdue detection, and late payment scoring. Never manually chase an invoice again.' },
    { icon: <Globe size={22} />, color: BRAND, title: 'Client Portal', desc: 'Every client gets a branded portal to view quotes, approve estimates, pay invoices, and download statements.' },
    { icon: <Smartphone size={22} />, color: '#7C3AED', title: 'Mobile + PWA', desc: 'Install on iOS, Android, or desktop. Works offline with local draft saving. Full quote creation without internet.' },
    { icon: <TrendingUp size={22} />, color: TEAL, title: 'Master Schedule', desc: 'Day, Week, Month, Timeline, and Team views. AI conflict detection, gap filling suggestions, and route optimization.' },
  ];
  return (
    <section id="features" style={{ padding: '80px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: '0.1em' }}>FEATURES</span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#0f172a', margin: '10px 0 14px', letterSpacing: '-0.03em' }}>
            Everything your service business needs
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>One platform replacing QuickBooks, Jobber, HousecallPro, and your spreadsheets.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {features.map(({ icon, color, title, desc }) => (
            <div key={title} style={{ padding: '24px', borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 14 }}>
                {icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{title}</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Zoho Comparison ──────────────────────────────────────────────
function Comparison() {
  const rows = [
    { feature: 'AI Client Intelligence', revanew: true, zoho: false, quickbooks: false },
    { feature: 'Industry Quote Templates (15)', revanew: true, zoho: false, quickbooks: false },
    { feature: 'Master Schedule / Dispatch', revanew: true, zoho: false, quickbooks: false },
    { feature: 'Time Tracking', revanew: true, zoho: true, quickbooks: true },
    { feature: 'Team Chat (Slack-style)', revanew: true, zoho: false, quickbooks: false },
    { feature: 'Offline Mode (PWA)', revanew: true, zoho: false, quickbooks: false },
    { feature: 'Invoice Templates', revanew: true, zoho: true, quickbooks: true },
    { feature: 'AI Revenue Forecasting', revanew: true, zoho: false, quickbooks: false },
    { feature: 'White-Label (Agency)', revanew: true, zoho: false, quickbooks: false },
    { feature: 'Google Play / App Store', revanew: true, zoho: true, quickbooks: true },
    { feature: 'Stripe / Card Payments', revanew: true, zoho: true, quickbooks: true },
    { feature: 'Customer Portal', revanew: true, zoho: true, quickbooks: true },
  ];
  return (
    <section style={{ padding: '80px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: '0.1em' }}>COMPARISON</span>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: '#0f172a', margin: '10px 0 14px', letterSpacing: '-0.03em' }}>
            Why service businesses choose Revanew
          </h2>
        </div>
        <div style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>FEATURE</div>
            {[['Revanew', BRAND], ['Zoho', '#E8433E'], ['QuickBooks', '#2CA01C']].map(([name, color]) => (
              <div key={name} style={{ padding: '12px 0', textAlign: 'center', fontSize: 12, fontWeight: 800, color }}>{name}</div>
            ))}
          </div>
          {rows.map(({ feature, revanew, zoho, quickbooks }, i) => (
            <div key={feature} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px', borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
              <div style={{ padding: '12px 20px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{feature}</div>
              {[revanew, zoho, quickbooks].map((has, j) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0' }}>
                  {has
                    ? <CheckCircle size={18} style={{ color: '#059669' }} />
                    : <span style={{ fontSize: 18, color: '#cbd5e1' }}>—</span>
                  }
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────
function Pricing({ onLogin }) {
  const [annual, setAnnual] = useState(false);
  const plans = [
    {
      name: 'Starter',
      price: annual ? 15 : 19,
      desc: 'Perfect for solo operators and new businesses',
      color: '#059669',
      features: ['25 quotes & invoices/mo', 'PDF export', 'Client portal', 'Payment tracking', 'Basic reports', 'Mobile app'],
      cta: 'Start Free Trial',
    },
    {
      name: 'Pro',
      price: annual ? 39 : 49,
      desc: 'For growing service businesses',
      color: BRAND,
      popular: true,
      features: ['Unlimited quotes & invoices', 'AI revenue scoring', 'Industry templates (15)', 'Team workspace (5 members)', 'Time tracking', 'Master schedule', 'Automations & reminders', 'Stripe payments', 'Google Calendar sync', 'Cashflow forecasting'],
      cta: 'Start 14-Day Trial',
    },
    {
      name: 'Agency',
      price: annual ? 79 : 99,
      desc: 'For agencies and multi-account operators',
      color: '#7C3AED',
      features: ['Everything in Pro', 'Unlimited team members', 'Unlimited sub-accounts', 'White-label (remove Revanew)', 'REST API access', 'Custom reports', 'Priority support', 'Advanced analytics', 'Multi-location support'],
      cta: 'Contact Sales',
    },
  ];
  return (
    <section id="pricing" style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: '0.1em' }}>PRICING</span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#0f172a', margin: '10px 0 14px', letterSpacing: '-0.03em' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24 }}>14-day free trial on all plans. No credit card required.</p>
          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '6px 8px', borderRadius: 12, background: '#f1f5f9' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: !annual ? '#0f172a' : '#94a3b8' }}>Monthly</span>
            <button onClick={() => setAnnual(a => !a)}
              style={{ width: 44, height: 24, borderRadius: 12, background: annual ? BRAND : '#cbd5e1', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: annual ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: annual ? '#0f172a' : '#94a3b8' }}>
              Annual <span style={{ color: '#059669', fontSize: 11, fontWeight: 700 }}>Save 20%</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
          {plans.map(({ name, price, desc, color, popular, features, cta }) => (
            <div key={name} style={{
              borderRadius: 20, border: popular ? `2px solid ${BRAND}` : '1px solid #e2e8f0',
              overflow: 'hidden', position: 'relative',
              boxShadow: popular ? '0 16px 48px rgba(37,99,235,0.15)' : '0 2px 12px rgba(0,0,0,0.04)',
              transform: popular ? 'scale(1.02)' : 'scale(1)',
            }}>
              {popular && (
                <div style={{ background: GRAD, padding: '6px 0', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>
                  ⭐ MOST POPULAR
                </div>
              )}
              <div style={{ padding: 28, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={16} style={{ color }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{name}</h3>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>{desc}</p>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>${price}</span>
                  <span style={{ fontSize: 14, color: '#64748b' }}>/mo</span>
                  {annual && <span style={{ fontSize: 11, color: '#059669', fontWeight: 700, marginLeft: 6 }}>billed annually</span>}
                </div>
                <button onClick={onLogin}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: popular ? 'none' : `1.5px solid ${color}`, background: popular ? GRAD : 'transparent', color: popular ? '#fff' : color, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24, boxShadow: popular ? '0 4px 14px rgba(37,99,235,0.3)' : 'none' }}>
                  {cta}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckCircle size={14} style={{ color: color, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 32 }}>
          All plans include: SSL security, daily backups, email support, and 99.9% uptime SLA.
        </p>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    { name: 'Marcus T.', company: 'Ridge Top HVAC', text: 'I replaced QuickBooks and a separate scheduling app with Revanew. Cut my admin time in half. The AI revenue scores tell me exactly which customers to call first.', stars: 5, type: '❄️ HVAC' },
    { name: 'Sandra W.', company: 'Precision Electric', text: 'The industry templates are incredible — all my services were pre-loaded. My team is using the scheduling features and it\'s transformed how we dispatch jobs.', stars: 5, type: '⚡ Electrical' },
    { name: 'Derek M.', company: 'PowerClean Pro', text: 'The "Due Upon Receipt" feature and automated reminders have improved our collection rate from 78% to 97%. Game changer for a small operation.', stars: 5, type: '💧 Pressure Washing' },
  ];
  return (
    <section style={{ padding: '80px 24px', background: '#0f172a' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.1em' }}>TESTIMONIALS</span>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: '#fff', margin: '10px 0', letterSpacing: '-0.03em' }}>
            Loved by service businesses
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {testimonials.map(({ name, company, text, stars, type }) => (
            <div key={name} style={{ padding: 28, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {[...Array(stars)].map((_, i) => <Star key={i} size={14} fill="#F59E0B" style={{ color: '#F59E0B' }} />)}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{company}</div>
                </div>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(37,99,235,0.2)', color: '#60A5FA', fontWeight: 600 }}>{type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────
function FinalCTA({ onLogin }) {
  return (
    <section style={{ padding: '80px 24px', background: GRAD }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 16 }}>🚀</div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.03em' }}>
          Ready to get paid faster?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 36 }}>
          Join 500+ service businesses using Revanew to quote faster, invoice smarter, and grow revenue with AI.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onLogin}
            style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: '#fff', color: BRAND, cursor: 'pointer', fontSize: 16, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
            Start Free — No Credit Card Required
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>14-day free trial · Cancel anytime · SSL secured</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#0a0f1e', padding: '48px 24px 24px', color: 'rgba(255,255,255,0.5)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img src="/logo-revanew.png" alt="Revanew" style={{ width: 32, height: 32, borderRadius: 9 }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Revanew</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 280, margin: 0 }}>The intelligent billing platform for service businesses. Quotes, invoices, and AI-powered revenue insights.</p>
          </div>
          {[
            { title: 'Product', links: ['Features', 'Pricing', 'Security', 'Roadmap'] },
            { title: 'Industries', links: ['HVAC', 'Electrical', 'Plumbing', 'Pressure Washing', 'Construction'] },
            { title: 'Company', links: ['About', 'Blog', 'Contact', 'Privacy Policy', 'Terms'] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, marginTop: 0 }}>{title}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map(l => <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{l}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12 }}>© 2026 Revanew · Quotes. Invoices. Get Paid.</span>
          <span style={{ fontSize: 12 }}>Built for service businesses · Powered by AI · <a href="mailto:support@revanew.io" style={{ color: '#60A5FA', textDecoration: 'none' }}>support@revanew.io</a></span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = () => navigate('/login');

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', sans-serif", overflowX: 'hidden' }}>
      <Nav onLogin={handleLogin} />
      <Hero onLogin={handleLogin} />
      <StatsBar />
      <HowItWorks />
      <Features />
      <Comparison />
      <Pricing onLogin={handleLogin} />
      <Testimonials />
      <FinalCTA onLogin={handleLogin} />
      <Footer />
    </div>
  );
}
