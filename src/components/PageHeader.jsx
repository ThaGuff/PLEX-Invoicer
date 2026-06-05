/**
 * PageHeader — Unique feature page headers for each section
 * Each feature gets its own color, icon, gradient, and description
 */
import React from 'react';
import { useAccount } from '../context/AccountContext';

const CONFIGS = {
  '/dashboard': {
    emoji: '🏠', gradient: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)',
    tag: 'COMMAND CENTER', tagColor: '#60A5FA',
    title: (name) => name || 'Dashboard',
    subtitle: 'Collected revenue, outstanding balances, and AI-powered cash flow insights',
  },
  '/quotes': {
    emoji: '📝', gradient: 'linear-gradient(135deg, #2563EB 0%, #6366f1 100%)',
    tag: 'PROPOSALS', tagColor: '#A5B4FC',
    title: () => 'Quotes',
    subtitle: 'Build, send, and track professional service proposals',
  },
  '/invoices': {
    emoji: '📄', gradient: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
    tag: 'BILLING', tagColor: '#C4B5FD',
    title: () => 'Invoices',
    subtitle: 'Track payments, send reminders, and collect faster',
  },
  '/contacts': {
    emoji: '👥', gradient: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
    tag: 'CLIENT INTELLIGENCE', tagColor: '#6EE7B7',
    title: () => 'Clients',
    subtitle: 'AI-powered client profiles, revenue scores, and relationship intelligence',
  },
  '/calendar': {
    emoji: '📅', gradient: 'linear-gradient(135deg, #D97706 0%, #DC2626 100%)',
    tag: 'OPERATIONS', tagColor: '#FCD34D',
    title: () => 'Master Schedule',
    subtitle: 'AI-powered dispatch board with conflict detection and revenue forecasting',
  },
  '/workspace': {
    emoji: '💬', gradient: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)',
    tag: 'TEAM HUB', tagColor: '#F9A8D4',
    title: () => 'Team',
    subtitle: 'Operational communication — connected to customers, jobs, and invoices',
  },
  '/time': {
    emoji: '⏱️', gradient: 'linear-gradient(135deg, #0D9488 0%, #2563EB 100%)',
    tag: 'WORKFORCE INTELLIGENCE', tagColor: '#6EE7B7',
    title: () => 'Time Tracking',
    subtitle: 'Labor cost tracking, profitability analysis, and payroll readiness',
  },
  '/analytics': {
    emoji: '📊', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #2563EB 100%)',
    tag: 'BUSINESS INTELLIGENCE', tagColor: '#C4B5FD',
    title: () => 'Analytics',
    subtitle: 'Revenue trends, quote performance, and predictive cash flow insights',
  },
  '/documents': {
    emoji: '📂', gradient: 'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)',
    tag: 'FILE MANAGEMENT', tagColor: '#7DD3FC',
    title: () => 'Documents',
    subtitle: 'Contracts, proposals, and shared files in one place',
  },
  '/photos': {
    emoji: '📸', gradient: 'linear-gradient(135deg, #D97706 0%, #EA580C 100%)',
    tag: 'JOB PHOTOS', tagColor: '#FED7AA',
    title: () => 'Photos',
    subtitle: 'Before and after job site photos linked to customers and projects',
  },
  '/automations': {
    emoji: '⚡', gradient: 'linear-gradient(135deg, #D97706 0%, #7C3AED 100%)',
    tag: 'WORKFLOW AUTOMATION', tagColor: '#FCD34D',
    title: () => 'Automate',
    subtitle: 'Automated reminders, follow-ups, and revenue recovery workflows',
  },
  '/settings': {
    emoji: '⚙️', gradient: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    tag: 'CONFIGURATION', tagColor: '#94a3b8',
    title: () => 'App Settings',
    subtitle: 'Themes, notifications, email defaults, integrations, and security',
  },
};

export default function PageHeader({ path, stats, actions, children }) {
  const { account } = useAccount();
  const cfg = CONFIGS[path] || CONFIGS['/dashboard'];

  const title = typeof cfg.title === 'function' ? cfg.title(account?.name) : cfg.title;

  return (
    <div style={{
      background: cfg.gradient,
      padding: '20px 28px 22px',
      position: 'relative',
      overflow: 'hidden',
      marginBottom: 0,
    }}>
      {/* Background pattern */}
      <div style={{ position:'absolute', inset:0, opacity:0.06, backgroundImage:'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 50%, #fff 1px, transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:1 }}>
        {/* Tag + actions row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', color:cfg.tagColor, textTransform:'uppercase', display:'flex', alignItems:'center', gap:6 }}>
            <span>{cfg.emoji}</span> {cfg.tag}
          </span>
          {actions && <div style={{ display:'flex', gap:8 }}>{actions}</div>}
        </div>

        {/* Title */}
        <h1 style={{ fontSize:'clamp(20px, 3vw, 28px)', fontWeight:900, color:'#fff', margin:'0 0 4px', letterSpacing:'-0.04em', lineHeight:1.1 }}>
          {title}
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0, lineHeight:1.5, maxWidth:600 }}>
          {cfg.subtitle}
        </p>

        {/* Optional stats row */}
        {stats && stats.length > 0 && (
          <div style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap' }}>
            {stats.map(({ label, value, color }) => (
              <div key={label} style={{ padding:'6px 12px', borderRadius:10, background:'rgba(255,255,255,0.1)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.15)' }}>
                <span style={{ fontSize:16, fontWeight:800, color: color || '#fff' }}>{value}</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginLeft:5 }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
