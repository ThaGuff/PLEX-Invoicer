/**
 * PageHeader — Feature page headers
 * Design: warm cream background matching main content, dark forest text
 */
import React from 'react';
import { useAccount } from '../context/AccountContext';

const CONFIGS = {
  '/dashboard':   { tag: 'COMMAND CENTER',        title: (n) => n || 'Dashboard',     subtitle: 'Revenue, outstanding balances, and cash-flow visibility' },
  '/quotes':      { tag: 'PROPOSALS',              title: () => 'Quotes',              subtitle: 'Build, send, and track service proposals' },
  '/invoices':    { tag: 'BILLING',                title: () => 'Invoices',            subtitle: 'Track payments, send reminders, collect faster' },
  '/contacts':    { tag: 'CLIENT INTELLIGENCE',    title: () => 'Clients',             subtitle: 'Client profiles, revenue scores, and relationship data' },
  '/calendar':    { tag: 'OPERATIONS',             title: () => 'Schedule',            subtitle: 'Jobs, appointments, and dispatch management' },
  '/documents':   { tag: 'FILE MANAGEMENT',        title: () => 'Documents',           subtitle: 'Contracts, proposals, and shared files' },
  '/automations': { tag: 'WORKFLOW AUTOMATION',    title: () => 'Automations',         subtitle: 'Automated reminders, follow-ups, and revenue recovery' },
  '/analytics':   { tag: 'BUSINESS INTELLIGENCE',  title: () => 'Analytics',           subtitle: 'Revenue trends, quote performance, and cash-flow insights' },
  '/billing':     { tag: 'PAYMENTS',               title: () => 'Payments',            subtitle: 'Subscription, billing history, and payment settings' },
  '/settings':    { tag: 'CONFIGURATION',          title: () => 'Settings',            subtitle: 'Business info, notifications, integrations, and security' },
  '/workspace':   { tag: 'TEAM HUB',               title: () => 'Team',                subtitle: 'Internal communication and team collaboration' },
  '/photos':      { tag: 'JOB PHOTOS',             title: () => 'Photos',              subtitle: 'Before and after job site photos' },
  '/time':        { tag: 'WORKFORCE',              title: () => 'Time Tracking',       subtitle: 'Labor tracking and profitability analysis' },
  '/admin':       { tag: 'ADMINISTRATION',         title: () => 'Admin',               subtitle: 'Platform management and oversight' },
};

export default function PageHeader({ path, extra }) {
  const { account } = useAccount();
  const cfg = CONFIGS[path] || CONFIGS['/dashboard'];
  const name = account?.company_name || account?.technician_name || '';

  return (
    <div style={{
      background: 'var(--bg-page)',
      padding: 'clamp(16px,3vw,22px) clamp(16px,4vw,28px) clamp(14px,2.5vw,18px)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1A1A1A', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
          {cfg.tag}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 3px', fontFamily: "'Inter', sans-serif" }}>
            {cfg.title(name)}
          </h1>
          <p style={{ fontSize: 'clamp(11px,2vw,13px)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cfg.subtitle}
          </p>
        </div>
        {extra && <div style={{ flexShrink: 0 }}>{extra}</div>}
      </div>
    </div>
  );
}
