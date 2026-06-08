import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { useAccount } from './context/AccountContext';

import AccountSettings from './components/AccountSettings';
import NewAccountModal from './components/NewAccountModal';
import UserProfileModal from './components/UserProfileModal';
import CompanyOnboarding from './components/CompanyOnboarding';
import OfflineBanner from './components/OfflineBanner';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import SettingsPage from './pages/SettingsPage';
import QuoteBuilder from './pages/QuoteBuilder';
import QuotesList from './pages/QuotesList';
import InvoicesList from './pages/InvoicesList';
import InvoiceDetail from './pages/InvoiceDetail';
import Contacts from './pages/Contacts';
import PublicQuote from './pages/PublicQuote';
import PublicInvoice from './pages/PublicInvoice';
import Admin from './pages/Admin';
import TaxesPage from './pages/TaxesPage';
import BillingPage from './pages/BillingPage';
import Onboarding from './pages/Onboarding';
import InviteAcceptPage from './pages/InviteAcceptPage';
import AutomationsPage from './pages/AutomationsPage';
import AuthCallback from './pages/AuthCallback';
import AnalyticsPage from './pages/AnalyticsPage';
import { IdleWarningBanner, SessionExpiredModal } from './components/SessionModals';

const TrialBanner   = React.lazy(() => import('./components/TrialBanner').catch(() => ({ default: () => null })));
const InstallPWA    = React.lazy(() => import('./components/InstallPWA').catch(() => ({ default: () => null })));
const OnboardingTour = React.lazy(() => import('./components/OnboardingTour').catch(() => ({ default: () => null })));
const AIAssistant    = React.lazy(() => import('./components/AIAssistant').catch(() => ({ default: () => null })));
const PlanGate       = React.lazy(() => import('./components/PlanGate').catch(() => ({ default: ({ children }) => children })));
const DocumentsPage  = React.lazy(() => import('./pages/DocumentsPage').catch(() => ({ default: () => null })));
const CalendarPage   = React.lazy(() => import('./pages/CalendarPage').catch(() => ({ default: () => null })));
const PhotosPage     = React.lazy(() => import('./pages/PhotosPage').catch(() => ({ default: () => null })));
const WorkspacePage  = React.lazy(() => import('./pages/WorkspacePage').catch(() => ({ default: () => null })));

// ── Error boundary ───────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('App crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEEEE6' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', maxWidth: 480, textAlign: 'center', border: '1px solid #DEDDD5' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0D1A0D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, fontWeight: 800, color: '#C8FF00' }}>R</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0D1A0D', margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: '#7A8A7A', margin: '0 0 24px', lineHeight: 1.6 }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard'; }}
              style={{ background: '#0D1A0D', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function IdleWarningBannerWrapper() {
  const { idleWarning, dismissIdleWarning } = useAuth();
  if (!idleWarning) return null;
  return <IdleWarningBanner onStayActive={dismissIdleWarning} />;
}

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EEEEE6' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid #0D1A0D', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// ── Sidebar icon — simple square box with "≡" ───────────────────
// Route-specific icons - no generic placeholder
const ROUTE_ICONS = {
  '/dashboard':   (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" fill={c}/><rect x="11" y="2" width="7" height="7" rx="1.5" fill={c}/><rect x="2" y="11" width="7" height="7" rx="1.5" fill={c}/><rect x="11" y="11" width="7" height="7" rx="1.5" fill={c}/></svg>,
  '/quotes':      (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="2" width="14" height="16" rx="2"/><line x1="6" y1="6.5" x2="14" y2="6.5"/><line x1="6" y1="9.5" x2="14" y2="9.5"/><line x1="6" y1="12.5" x2="10" y2="12.5"/></svg>,
  '/invoices':    (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="2" width="14" height="16" rx="2"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="6" y1="10" x2="14" y2="10"/><line x1="6" y1="13" x2="9" y2="13"/><polyline points="11,11.5 13,13.5 17,9.5" stroke={c} strokeWidth="1.8"/></svg>,
  '/contacts':    (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="7" r="3.5"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6"/></svg>,
  '/calendar':    (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><rect x="2.5" y="3.5" width="15" height="14" rx="2"/><line x1="2.5" y1="8" x2="17.5" y2="8"/><line x1="6.5" y1="2" x2="6.5" y2="5"/><line x1="13.5" y1="2" x2="13.5" y2="5"/><rect x="6" y="11" width="2" height="2" rx="0.5" fill={c} stroke="none"/><rect x="9.5" y="11" width="2" height="2" rx="0.5" fill={c} stroke="none"/><rect x="6" y="14" width="2" height="2" rx="0.5" fill={c} stroke="none"/></svg>,
  '/documents':   (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/><polyline points="12,2 12,6 16,6"/></svg>,
  '/automations': (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><polygon points="10,2 13,8 19,9 14.5,13.5 15.5,19.5 10,17 4.5,19.5 5.5,13.5 1,9 7,8"/></svg>,
  '/analytics':   (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><polyline points="2,14 7,9 11,12 18,5"/><line x1="2" y1="18" x2="18" y2="18"/></svg>,
  '/billing':     (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="5" width="16" height="12" rx="2"/><line x1="2" y1="9" x2="18" y2="9"/><line x1="6" y1="13.5" x2="8.5" y2="13.5"/></svg>,
  '/settings':    (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M17.1 10a7.1 7.1 0 01-.1 1.1l1.7 1.3-1.6 2.8-2.1-.8a7.1 7.1 0 01-1.9 1.1l-.3 2.2h-3.2l-.3-2.2a7.1 7.1 0 01-1.9-1.1l-2.1.8L3.3 12.4l1.7-1.3A7.1 7.1 0 015 10a7.1 7.1 0 01.1-1.1L3.3 7.6l1.6-2.8 2.1.8A7.1 7.1 0 018.9 4.5L9.2 2.3h3.2l.3 2.2a7.1 7.1 0 011.9 1.1l2.1-.8 1.6 2.8-1.7 1.3c.1.37.1.73.1 1.1z"/></svg>,
  '/admin':       (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><path d="M10 2L3 5v5c0 5 7 8 7 8s7-3 7-8V5L10 2z"/></svg>,
  '/__business':  (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="7" width="16" height="12" rx="1.5"/><path d="M6 7V5a4 4 0 018 0v2"/><line x1="10" y1="11" x2="10" y2="15"/><line x1="8" y1="13" x2="12" y2="13"/></svg>,
  '/workspace':   (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><path d="M18 13H2a1 1 0 01-1-1V4a1 1 0 011-1h16a1 1 0 011 1v8a1 1 0 01-1 1z"/><line x1="7" y1="17" x2="13" y2="17"/><line x1="10" y1="13" x2="10" y2="17"/></svg>,
  '/photos':      (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="4" width="16" height="12" rx="2"/><circle cx="7.5" cy="8.5" r="1.5"/><polyline points="2,14 6,10 9,13 13,9 18,14"/></svg>,
  '/time':        (s,c) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="7.5"/><polyline points="10,5.5 10,10 13,12.5"/></svg>,
};
function NavIcon({ size = 14, route = '/', color = 'currentColor' }) {
  const fn = ROUTE_ICONS[route];
  if (!fn) return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6"><circle cx="10" cy="10" r="7.5"/></svg>;
  return fn(size, color);
}

function Nav() {
  const { account } = useAccount();
  const { user, signOut } = useAuth();
  const [dark, setDark] = useDarkMode();
  const loc = useLocation();
  const navigate = useNavigate();
  const [showUserProfile, setShowUserProfile] = React.useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !account?.id) return;
    const getToken = () => JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
    const loadNotifs = async () => {
      const t = getToken(); if (!t) return;
      try {
        const r = await fetch('/api/profiles/notifications', { headers: { Authorization: `Bearer ${t}` } });
        if (r.ok) { const d = await r.json(); setNotifications(d.notifications || []); setUnreadCount(d.unread || 0); }
      } catch {}
    };
    const heartbeat = () => {
      const t = getToken(); if (!t) return;
      fetch('/api/profiles/presence', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ account_id: account.id, status: 'online' }) }).catch(() => {});
    };
    loadNotifs(); heartbeat();
    const ni = setInterval(loadNotifs, 60000);
    const pi = setInterval(heartbeat, 120000);
    return () => { clearInterval(ni); clearInterval(pi); };
  }, [user?.id, account?.id]);

  const isOwner = user?.email === 'guffey.ryan@gmail.com' || user?.id === 'dev-user';
  const plan = account?.plan || 'starter';
  const isTrialing = account?.subscription_status === 'trialing';
  const trialEnd = account?.trial_ends_at ? new Date(account.trial_ends_at) : null;
  const trialActive = isTrialing && trialEnd && trialEnd > new Date();
  const PLAN_RANK = { starter: 0, pro: 1, agency: 2 };
  const FEAT_PLAN = { '/calendar': 'pro', '/photos': 'pro', '/time': 'pro' };
  const isLocked = (to) => { if (trialActive) return false; const req = FEAT_PLAN[to]; if (!req) return false; return (PLAN_RANK[plan] || 0) < (PLAN_RANK[req] || 1); };
  const handleLockedClick = (link) => navigate('/billing?upgrade=1&feature=' + link.to.replace('/', ''));
  const isActive = (to) => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);

  // Workspace nav group
  const workspaceLinks = [
    { to: '/dashboard',  label: 'Dashboard' },
    { to: '/quotes',     label: 'Quotes' },
    { to: '/invoices',   label: 'Invoices' },
    { to: '/contacts',   label: 'Clients' },
    { to: '/calendar',   label: 'Schedule' },
    { to: '/documents',  label: 'Documents' },
    { to: '/workspace',  label: 'Team' },
  ];
  // Operations nav group
  const operationsLinks = [
    { to: '/automations',  label: 'Automations' },
    { to: '/analytics',    label: 'Analytics' },
    { to: '/billing',      label: 'Payments' },
    { to: '/settings',     label: 'Settings' },
    { to: '/__business',   label: 'Business' },
    ...(isOwner ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  const allLinks = [...workspaceLinks, ...operationsLinks];
  const mobilePrimary = [workspaceLinks[0], workspaceLinks[1], workspaceLinks[2], workspaceLinks[3]];

  const userName = user?.user_metadata?.full_name || account?.name || 'Account';
  const workspaceName = account?.company_name || 'PLEX Automation LLC';

  const NavItem = ({ link }) => {
    const active = isActive(link.to);
    const locked = isLocked(link.to);
    return (
      <button
        onClick={() => locked ? handleLockedClick(link) : link.to === '/__business' ? window.dispatchEvent(new CustomEvent('revanew:settings')) : navigate(link.to)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px 9px 16px',
          borderRadius: 8, border: 'none', cursor: 'pointer',
          width: '100%', textAlign: 'left',
          background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          transition: 'background 0.12s',
          position: 'relative',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
        {/* Active indicator bar */}
        {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: '0 2px 2px 0', background: '#C8FF00' }} />}
        <span style={{ color: active ? '#C8FF00' : 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
          <NavIcon size={15} route={link.to} color={active ? '#C8FF00' : 'rgba(255,255,255,0.45)'} />
        </span>
        <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#FFFFFF' : 'rgba(255,255,255,0.72)', letterSpacing: '-0.01em', flex: 1 }}>
          {link.label}
        </span>
        {locked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
      </button>
    );
  };

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────── */}
      <aside className="desktop-sidebar" style={{
        background: '#0D1A0D',
        borderRight: 'none',
        flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1A0D' }}>
              <img src="/logo-revanew.png?v=1780873512" alt="Revanew" style={{ width: 36, height: 36, objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Revanew</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontWeight: 500, marginTop: 1 }}>Receivables OS</div>
            </div>
          </div>
          {trialActive && trialEnd && (
            <div style={{ marginTop: 10, padding: '4px 10px', background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.2)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C8FF00' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#C8FF00' }}>
                {Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000))}d trial left
              </span>
            </div>
          )}
        </div>

        {/* Workspace group */}
        <div style={{ padding: '0 8px 6px' }}>
          <div style={{ padding: '4px 8px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Workspace</div>
          {workspaceLinks.map(l => <NavItem key={l.to} link={l} />)}
        </div>

        {/* Operations group */}
        <div style={{ padding: '4px 8px 6px' }}>
          <div style={{ padding: '4px 8px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Operations</div>
          {operationsLinks.map(l => <NavItem key={l.to} link={l} />)}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Create Quote CTA */}
        <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
          <button onClick={() => navigate('/quotes/new')}
            style={{ width: '100%', padding: '12px', background: '#C8FF00', color: '#0D1A0D', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em', transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#B8EF00'}
            onMouseLeave={e => e.currentTarget.style.background = '#C8FF00'}>
            + New quote
          </button>
        </div>

        {/* User row + Sign out */}
        <div style={{ padding: '0 12px calc(10px + env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8 }}>
            <button
              onClick={() => setShowUserProfile(true)}
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 30, height: 30, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: '#1A2A1A', border: '1.5px solid rgba(200,255,0,0.2)' }}>
                <img src="/logo-revanew.png?v=1780873512" alt="R" style={{ width: 30, height: 30, objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workspaceName}</div>
              </div>
            </button>
            {/* Sign out */}
            <button
              onClick={() => { if (window.confirm('Sign out?')) signOut(); }}
              title="Sign out"
              style={{ width: 34, height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAV ──────────────────────────────────────── */}
      <nav className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(58px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#0D1A0D',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center',
        zIndex: 90,
      }}>
        {mobilePrimary.map(l => {
          const active = isActive(l.to);
          return (
            <button key={l.to} onClick={() => navigate(l.to)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: active ? '#C8FF00' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NavIcon size={14} route={l.to} color={active ? '#0D1A0D' : 'rgba(255,255,255,0.6)'} />
              </div>
              <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, color: active ? '#C8FF00' : 'rgba(255,255,255,0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{l.label}</span>
            </button>
          );
        })}
        <button onClick={() => setShowMobileMore(v => !v)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: showMobileMore ? '#C8FF00' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="2" cy="6" r="1.2" fill={showMobileMore ? '#0D1A0D' : 'rgba(255,255,255,0.7)'}/><circle cx="6" cy="6" r="1.2" fill={showMobileMore ? '#0D1A0D' : 'rgba(255,255,255,0.7)'}/><circle cx="10" cy="6" r="1.2" fill={showMobileMore ? '#0D1A0D' : 'rgba(255,255,255,0.7)'}/></svg>
          </div>
          <span style={{ fontSize: 9.5, fontWeight: showMobileMore ? 700 : 500, color: showMobileMore ? '#C8FF00' : 'rgba(255,255,255,0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>More</span>
        </button>
      </nav>

      {/* Mobile More drawer */}
      {showMobileMore && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 109, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowMobileMore(false)} />
          <div style={{ position: 'fixed', bottom: 'calc(74px + env(safe-area-inset-bottom))', left: 12, right: 12, zIndex: 110, background: '#0D1A0D', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: '12px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[...workspaceLinks.slice(4), ...operationsLinks].map(l => {
              const active = isActive(l.to);
              const locked = isLocked(l.to);
              return (
                <button key={l.to}
                  onClick={() => { setShowMobileMore(false); locked ? handleLockedClick(l) : navigate(l.to); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '12px 4px', borderRadius: 10, border: 'none', background: active ? 'rgba(200,255,0,0.08)' : 'transparent', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: locked ? 0.6 : 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <NavIcon size={16} route={l.to} color={active ? '#C8FF00' : 'rgba(255,255,255,0.65)'} />
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, color: active ? '#C8FF00' : 'rgba(255,255,255,0.65)' }}>{l.label}</span>
                </button>
              );
            })}
            {/* Settings */}
            <button onClick={() => { setShowMobileMore(false); window.dispatchEvent(new CustomEvent('revanew:settings')); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '12px 4px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>Business</span>
            </button>
            {/* Sign out */}
            <button onClick={() => { setShowMobileMore(false); signOut(); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '12px 4px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(220,38,38,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 500, color: '#EF4444' }}>Sign out</span>
            </button>
            {/* Dark mode */}
            <button onClick={() => setDark(v => !v)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '12px 4px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {dark
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>{dark ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </>
      )}
      {showUserProfile && <UserProfileModal onClose={() => setShowUserProfile(false)} />}
    </>
  );
}

function AppShell({ children }) {
  const { account, loading } = useAccount();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showTour, setShowTour] = useState(false);

  React.useEffect(() => {
    if (account && account.onboarding_complete !== 1 && !account.business_address && !account.technician_name) {
      const dismissed = sessionStorage.getItem('onboarding_dismissed_' + account.id);
      if (!dismissed) setShowOnboarding(true);
    }
  }, [account?.id, account?.onboarding_complete]);

  React.useEffect(() => {
    const handler = (e) => { try { navigate(e.detail); } catch {} };
    window.addEventListener('revanew:navigate', handler);
    const settingsHandler = () => setShowSettings(true);
    window.addEventListener('revanew:settings', settingsHandler);
    return () => { window.removeEventListener('revanew:navigate', handler); window.removeEventListener('revanew:settings', settingsHandler); };
  }, [navigate]);

  React.useEffect(() => {
    if (!account || loading) return;
    const path = location.pathname;
    if (path.includes('/billing') || path.includes('/login') || path.includes('/portal') || path.includes('/auth/callback')) return;
    const isNew = localStorage.getItem('revanew_new_user') === '1';
    if (isNew) {
      localStorage.removeItem('revanew_new_user');
      localStorage.setItem('revanew_onboarded', '1');
      const pendingInvite = localStorage.getItem('revanew_pending_invite');
      if (pendingInvite) { localStorage.removeItem('revanew_pending_invite'); navigate(`/invite/accept/${pendingInvite}`); return; }
      navigate('/billing?welcome=1'); return;
    }
    const pendingInvite = localStorage.getItem('revanew_pending_invite');
    if (pendingInvite && path !== `/invite/accept/${pendingInvite}`) { localStorage.removeItem('revanew_pending_invite'); navigate(`/invite/accept/${pendingInvite}`); return; }
    const shouldShowTour = localStorage.getItem('revanew_show_tour') === '1' && !localStorage.getItem('revanew_tour_done') && !path.includes('/billing');
    setShowTour(shouldShowTour);
  }, [account, loading, location.pathname]);

  const [dark, setDark] = useDarkMode();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EEEEE6' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#0D1A0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#C8FF00' }}>R</span>
        </div>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid #0D1A0D', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-page)', overflow: 'hidden', maxWidth: '100vw', width: '100%', display: 'flex', flexDirection: 'column', height: '100dvh', position: 'relative' }}>
      <React.Suspense fallback={null}><TrialBanner /></React.Suspense>
      <React.Suspense fallback={null}><InstallPWA /></React.Suspense>
      {showTour && (
        <React.Suspense fallback={null}>
          <OnboardingTour onDone={() => { setShowTour(false); localStorage.removeItem('revanew_show_tour'); }} />
        </React.Suspense>
      )}
      {showSettings && <AccountSettings onClose={() => setShowSettings(false)} />}
      {showUserProfile && <UserProfileModal onClose={() => setShowUserProfile(false)} />}
      <OfflineBanner />
      {showOnboarding && (
        <CompanyOnboarding onComplete={() => { setShowOnboarding(false); sessionStorage.setItem('onboarding_dismissed_' + account?.id, '1'); }} />
      )}
      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} onCreated={() => {}} />}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Nav />
        <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden', overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }} className="mobile-bottom-pad">
          {children}
        </main>
      </div>
      <React.Suspense fallback={null}><AIAssistant /></React.Suspense>
    </div>
  );
}

function useDarkMode() {
  const [dark, setDark] = React.useState(() => localStorage.getItem('revanew_theme') === 'dark');
  React.useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add('dark'); localStorage.setItem('revanew_theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.removeItem('revanew_theme'); }
  }, [dark]);
  return [dark, setDark];
}

function LandingRoute() {
  const { isAuthenticated, loading } = useAuth();
  const nav = useNavigate();
  if (loading) return null;
  if (isAuthenticated) { nav('/dashboard', { replace: true }); return null; }
  return <LandingPage />;
}

export default function App() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SessionExpiredModal />
          <IdleWarningBannerWrapper />
          <Routes>
            <Route path="/"                         element={<LandingRoute />} />
            <Route path="/landing"                  element={<LandingPage />} />
            <Route path="/login"                    element={<Login />} />
            <Route path="/auth/callback"              element={<AuthCallback />} />
            <Route path="/portal/quote/:token"      element={<PublicQuote />} />
            <Route path="/portal/invoice/:token"    element={<PublicInvoice />} />
            <Route path="/*" element={
              <RequireAuth>
                <AccountProvider>
                  <AppShell>
                    <Routes>
                      <Route path="/"                element={<Dashboard />} />
                      <Route path="/dashboard"       element={<Dashboard />} />
                      <Route path="/quotes"          element={<QuotesList />} />
                      <Route path="/quotes/new"      element={<QuoteBuilder />} />
                      <Route path="/quotes/:id"      element={<QuoteBuilder />} />
                      <Route path="/invoices"        element={<InvoicesList />} />
                      <Route path="/invoices/:id"    element={<InvoiceDetail />} />
                      <Route path="/contacts"        element={<Contacts />} />
                      <Route path="/time"            element={<TimeTrackingPage />} />
                      <Route path="/settings"        element={<SettingsPage />} />
                      <Route path="/contacts/new"    element={<Contacts />} />
                      <Route path="/admin"           element={<Admin />} />
                      <Route path="/taxes"           element={<TaxesPage />} />
                      <Route path="/billing"         element={<BillingPage />} />
                      <Route path="/onboarding"      element={<Onboarding />} />
                      <Route path="/invite/accept/:token"  element={<InviteAcceptPage mode="accept" />} />
                      <Route path="/invite/decline/:token" element={<InviteAcceptPage mode="decline" />} />
                      <Route path="/invite/error"    element={<InviteAcceptPage mode="error" />} />
                      <Route path="/automations"     element={<AutomationsPage />} />
                      <Route path="/documents"       element={<React.Suspense fallback={null}><PlanGate feature="documents"><DocumentsPage /></PlanGate></React.Suspense>} />
                      <Route path="/calendar"        element={<React.Suspense fallback={null}><PlanGate feature="calendar"><CalendarPage /></PlanGate></React.Suspense>} />
                      <Route path="/photos"          element={<React.Suspense fallback={null}><PlanGate feature="photos"><PhotosPage /></PlanGate></React.Suspense>} />
                      <Route path="/workspace"       element={<React.Suspense fallback={null}><PlanGate feature="workspace"><WorkspacePage /></PlanGate></React.Suspense>} />
                      <Route path="/analytics"       element={<AnalyticsPage />} />
                    </Routes>
                  </AppShell>
                </AccountProvider>
              </RequireAuth>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
