/**
 * OnboardingTour — shown once after new account creation
 * Walks user through: Business Info → Stripe → Services → Features
 * Stored in localStorage('revanew_tour_done') — shows only once
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, CheckCircle, Building2, CreditCard, Zap, FileText, Receipt, Users, Calendar, Image, MessageSquare, FolderOpen } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    icon: '🎉',
    title: 'Welcome to Revanew!',
    desc: "Let's get you set up in 2 minutes. We'll walk you through the key features so you can start sending quotes and getting paid right away.",
    action: 'Start setup →',
    skip: true,
    color: '#2563EB',
  },
  {
    id: 'business',
    icon: <Building2 size={28} color="#2563EB" />,
    title: 'Add your business info',
    desc: 'Your business name, logo, and contact info appear on every quote and invoice you send. Clients see this first.',
    action: 'Go to Settings →',
    route: '/admin',
    routeLabel: 'Open Settings',
    color: '#2563EB',
    tip: 'Tap your avatar → Account Settings to fill in your business details.',
  },
  {
    id: 'services',
    icon: <Zap size={28} color="#D97706" />,
    title: 'Set up your services',
    desc: 'Add your predefined services so you can build quotes in seconds. Use the AI web scraper to import services from your existing website.',
    action: 'Go to Admin →',
    route: '/admin',
    routeLabel: 'Open Admin',
    color: '#D97706',
    tip: 'Admin → Services → Add Service. Or paste your website URL to AI-import them.',
  },
  {
    id: 'stripe',
    icon: <CreditCard size={28} color="#0D9488" />,
    title: 'Connect Stripe to get paid',
    desc: 'Connect your Stripe account to accept credit card payments directly from invoices. Clients pay with one tap.',
    action: 'Connect Stripe →',
    route: '/admin',
    routeLabel: 'Connect Stripe',
    color: '#0D9488',
    tip: 'Admin → Payments → Connect Stripe. Takes about 5 minutes to complete.',
  },
  {
    id: 'quote',
    icon: <FileText size={28} color="#2563EB" />,
    title: 'Create your first quote',
    desc: 'Build a professional quote in under 60 seconds. Add services, client details, and send a link your client can view and e-sign on any device.',
    action: 'New Quote →',
    route: '/quotes/new',
    routeLabel: 'Create Quote',
    color: '#2563EB',
    tip: 'Quotes → New Quote. Add line items, set prices, and hit Send.',
  },
  {
    id: 'invoice',
    icon: <Receipt size={28} color="#7C3AED" />,
    title: 'Convert to invoice',
    desc: "Once a client accepts your quote, convert it to an invoice with one tap. Clients get a professional invoice they can e-sign and pay online.",
    action: 'View Invoices →',
    route: '/invoices',
    routeLabel: 'View Invoices',
    color: '#7C3AED',
    tip: 'Quotes → select a quote → Invoice button. Navigate to invoice to send it.',
  },
  {
    id: 'clients',
    icon: <Users size={28} color="#0D9488" />,
    title: 'Manage your clients',
    desc: 'All your clients are saved automatically when you create a quote. View their quote history, outstanding balances, and contact info in one place.',
    action: 'View Clients →',
    route: '/contacts',
    routeLabel: 'View Clients',
    color: '#0D9488',
    tip: 'Clients tab → tap any client to see their full history.',
  },
  {
    id: 'calendar',
    icon: <Calendar size={28} color="#0D9488" />,
    title: 'Schedule jobs',
    desc: 'Use the built-in calendar to schedule and track all your jobs. Tap any day to see what\'s scheduled, and add new jobs with a single tap.',
    action: 'Open Schedule →',
    route: '/calendar',
    routeLabel: 'Open Calendar',
    color: '#0D9488',
    tip: 'More → Schedule. Tap a day → New Job to schedule.',
  },
  {
    id: 'photos',
    icon: <Image size={28} color="#D97706" />,
    title: 'Capture job site photos',
    desc: 'Take photos on job sites and tag them to specific jobs. Before/after photos help with disputes and look great in proposals.',
    action: 'Open Photos →',
    route: '/photos',
    routeLabel: 'Open Photos',
    color: '#D97706',
    tip: 'More → Photos → Add Photo. The camera opens directly on mobile.',
  },
  {
    id: 'done',
    icon: '🚀',
    title: "You're all set!",
    desc: "You now know everything you need to run your business on Revanew. Your quotes, invoices, clients, and data are all synced and secure.",
    action: 'Go to Dashboard →',
    route: '/',
    color: '#0D9488',
  },
];

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step) / (STEPS.length - 1)) * 100;

  const handleNext = () => {
    if (isLast) { finish(); return; }
    setStep(s => s + 1);
  };

  const handleGo = () => {
    if (current.route) navigate(current.route);
    handleNext();
  };

  const finish = () => {
    localStorage.setItem('revanew_tour_done', '1');
    onDone?.();
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(11,18,32,0.7)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:"'Plus Jakarta Sans',sans-serif", padding:'0 0 env(safe-area-inset-bottom)' }}>
      <div style={{ background:'var(--bg-surface)', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:520, padding:'24px 24px 32px', animation:'fadeUp 0.3s ease both', maxHeight:'92dvh', overflowY:'auto' }}>

        {/* Progress bar */}
        <div style={{ height:3, background:'var(--border)', borderRadius:2, marginBottom:24, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:`linear-gradient(90deg,${current.color},#0D9488)`, borderRadius:2, transition:'width 0.4s ease' }} />
        </div>

        {/* Step counter */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px' }}>
            Step {step + 1} of {STEPS.length}
          </span>
          {step < STEPS.length - 1 && (
            <button onClick={finish} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:500, padding:'4px 8px', borderRadius:8, display:'flex', alignItems:'center', gap:6 }}>
              <X size={14} /> Skip tour
            </button>
          )}
        </div>

        {/* Icon */}
        <div style={{ width:64, height:64, borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', background:`${current.color}15`, border:`1px solid ${current.color}30`, marginBottom:16, fontSize:32 }}>
          {typeof current.icon === 'string' ? current.icon : current.icon}
        </div>

        {/* Content */}
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em', marginBottom:10 }}>{current.title}</h2>
        <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:current.tip ? 16 : 24 }}>{current.desc}</p>

        {/* Tip box */}
        {current.tip && (
          <div style={{ background:`${current.color}10`, border:`1px solid ${current.color}30`, borderRadius:12, padding:'12px 14px', marginBottom:24 }}>
            <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>
              <span style={{ fontWeight:700, color:current.color }}>💡 How: </span>{current.tip}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {current.routeLabel && (
            <button onClick={handleGo}
              style={{ width:'100%', padding:'14px', background:`linear-gradient(135deg,${current.color},#0D9488)`, color:'#fff', border:'none', borderRadius:13, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {current.routeLabel} <ArrowRight size={16} />
            </button>
          )}
          <button onClick={handleNext}
            style={{ width:'100%', padding:'13px', background: current.routeLabel ? 'var(--bg-raised)' : `linear-gradient(135deg,${current.color},#0D9488)`, color: current.routeLabel ? 'var(--text-secondary)' : '#fff', border:`1px solid ${current.routeLabel ? 'var(--border)' : 'transparent'}`, borderRadius:13, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {isLast ? <><CheckCircle size={16} /> Done — Go to Dashboard</> : current.routeLabel ? `Skip this step →` : <>{current.action} <ArrowRight size={16}/></>}
          </button>
        </div>
      </div>
    </div>
  );
}
