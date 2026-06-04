import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { useAccount } from './context/AccountContext';

import AccountSwitcher from './components/AccountSwitcher';
import AccountSettings from './components/AccountSettings';
import NewAccountModal from './components/NewAccountModal';
import UserProfileModal from './components/UserProfileModal';
import CompanyOnboarding from './components/CompanyOnboarding';
import OfflineBanner from './components/OfflineBanner';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
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
import AnalyticsPage  from './pages/AnalyticsPage';
const TrialBanner  = React.lazy(() => import('./components/TrialBanner').catch(() => ({ default: () => null })));
const InstallPWA    = React.lazy(() => import('./components/InstallPWA').catch(() => ({ default: () => null })));
const OnboardingTour  = React.lazy(() => import('./components/OnboardingTour').catch(() => ({ default: () => null })));
const AIAssistant     = React.lazy(() => import('./components/AIAssistant').catch(() => ({ default: () => null })));
const PlanGate       = React.lazy(() => import('./components/PlanGate').catch(() => ({ default: ({children}) => children })));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage').catch(() => ({ default: () => null })));
const CalendarPage  = React.lazy(() => import('./pages/CalendarPage').catch(() => ({ default: () => null })));
const PhotosPage    = React.lazy(() => import('./pages/PhotosPage').catch(() => ({ default: () => null })));
const WorkspacePage = React.lazy(() => import('./pages/WorkspacePage').catch(() => ({ default: () => null })));
import { LayoutDashboard, FileText, Receipt, Users, Zap, Plus, LogOut, CreditCard, Shield, BarChart2, Sun, Moon, Grid, Calendar, FolderOpen, Image as ImageIcon, MessageSquare, Lock, Settings, Camera, Users2, ShieldCheck, Clock } from 'lucide-react';
import { IdleWarningBanner, SessionExpiredModal } from './components/SessionModals';


// ── Error boundary — prevents blank screen on component crash ────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('App crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7F8', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#13B5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, fontWeight: 800, color: '#fff' }}>P</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: '#7A7E85', margin: '0 0 24px', lineHeight: 1.6 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard'; }}
              style={{ background: '#13B5EA', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Reload app
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
              style={{ background: 'transparent', color: '#7A7E85', border: '1px solid #E5E8EB', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>
              Clear session &amp; sign in
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Idle warning banner wrapper (reads from AuthContext)
function IdleWarningBannerWrapper() {
  const { idleWarning, dismissIdleWarning } = useAuth();
  if (!idleWarning) return null;
  return <IdleWarningBanner onStayActive={dismissIdleWarning} />;
}

// Route guard — redirects to /login if not authenticated
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#13B5EA', borderTopColor: 'transparent' }} />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function Nav() {
  const { account } = useAccount();
  const { user, signOut } = useAuth();
  const [dark, setDark] = useDarkMode();
  const accent = account?.primary_color || '#13B5EA';
  const loc    = useLocation();
  const navigate = useNavigate();
  const [showUserProfile, setShowUserProfile] = React.useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  // ── Notifications + Presence (global, lives in Nav so always active) ──
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user?.id || !account?.id) return;
    const getToken = () => JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
    const h = () => ({ Authorization: `Bearer ${getToken()}` });

    const loadNotifs = async () => {
      const t = getToken(); if (!t) return;
      try {
        const r = await fetch('/api/profiles/notifications', { headers: { Authorization: `Bearer ${t}` } });
        if (r.ok) { const d = await r.json(); setNotifications(d.notifications || []); setUnreadCount(d.unread || 0); }
      } catch {}
    };
    const heartbeat = () => {
      const t = getToken(); if (!t) return;
      fetch('/api/profiles/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ account_id: account.id, status: 'online' })
      }).catch(() => {});
    };

    loadNotifs(); heartbeat();
    const ni = setInterval(loadNotifs, 60000);  // Poll every 60s (was 30s)
    const pi = setInterval(heartbeat, 120000); // Heartbeat every 2min (was 60s)
    const onBlur  = () => { const t = getToken(); if (t) fetch('/api/profiles/presence', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`}, body:JSON.stringify({account_id:account.id,status:'away'}) }).catch(()=>{}); };
    const onFocus = () => heartbeat();
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(ni); clearInterval(pi); window.removeEventListener('blur',onBlur); window.removeEventListener('focus',onFocus); };
  }, [user?.id, account?.id]);
  const isOwner = user?.email === 'guffey.ryan@gmail.com' || user?.id === 'dev-user';

  const plan       = account?.plan || 'starter';
  const isTrialing = account?.subscription_status === 'trialing';
  const trialEnd   = account?.trial_ends_at ? new Date(account.trial_ends_at) : null;
  const trialActive = isTrialing && trialEnd && trialEnd > new Date();

  // Feature availability by plan
  const PLAN_RANK   = { starter: 0, pro: 1, agency: 2 };
  const FEAT_PLAN   = {
    '/calendar':    'pro',
    '/documents':   'pro',
    '/photos':      'pro',
    '/workspace':   'pro',
    '/automations': 'pro',
    '/analytics':   'pro',
    '/time':        'pro',
    '/billing':     null,
    '/admin':       null,
  };
  const isLocked = (to) => {
    if (trialActive) return false; // trial = full access
    const req = FEAT_PLAN[to];
    if (!req) return false;
    return (PLAN_RANK[plan] || 0) < (PLAN_RANK[req] || 1);
  };

  const links = [
    { to: '/',            label: 'Dashboard', icon: LayoutDashboard, color: '#0D9488' },
    { to: '/quotes',      label: 'Quotes',    icon: FileText,        color: '#2563EB' },
    { to: '/invoices',    label: 'Invoices',  icon: Receipt,         color: '#7C3AED' },
    { to: '/contacts',    label: 'Clients',   icon: Users,           color: '#0D9488' },
    { to: '/calendar',    label: 'Schedule',  icon: Calendar,        color: '#0D9488' },
    { to: '/documents',   label: 'Documents', icon: FolderOpen,      color: '#2563EB' },
    { to: '/photos',      label: 'Photos',    icon: ImageIcon,       color: '#D97706' },
    { to: '/workspace',   label: 'Team',      icon: MessageSquare,   color: '#7C3AED' },
    { to: '/automations', label: 'Automate',  icon: Zap,             color: '#D97706' },
    { to: '/analytics',   label: 'Analytics', icon: BarChart2,       color: '#2563EB' },
    { to: '/time',        label: 'Time',      icon: Clock,           color: '#0D9488' },
    { to: '/billing',     label: 'Billing',   icon: CreditCard,      color: '#7C3AED' },
    ...(isOwner ? [{ to: '/admin', label: 'Admin', icon: Shield, color: '#ef4444' }] : []),
  ];

  const mobilePrimaryLinks = links.slice(0, 4);
  const mobileMoreLinks    = links.slice(4);
  const isActive = (to) => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);

  const handleLockedClick = (link) => {
    // Show upgrade prompt for locked features
    navigate('/billing?upgrade=1&feature=' + link.to.replace('/', ''));
  };

  return (
    <>
      {/* ── DESKTOP LEFT SIDEBAR (md and up) ───────────────────── */}
      <aside className="desktop-sidebar" style={{
        display:'none', // shown via CSS below
        width: 232,
        minWidth: 232,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'linear-gradient(180deg, #0F172A 0%, #1a2744 60%, #0F172A 100%)',
        borderRight: 'none',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 40,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
          <NavLink to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <img src="/logo-revanew.png" alt="Revanew" style={{ width:32, height:32, objectFit:'contain', borderRadius:8 }} />
            <span style={{ fontSize:17, fontWeight:800, color:'#ffffff', letterSpacing:'-0.04em' }}>Revanew</span>
          </NavLink>
          {/* Trial badge */}
          {isTrialing && trialEnd && (
            <div style={{ marginTop:8, padding:'4px 10px', background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:8, display:'inline-flex', alignItems:'center', gap:5 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#2563EB', animation:'pulse 2s ease infinite' }}/>
              <span style={{ fontSize:11, fontWeight:700, color:'#2563EB' }}>
                {Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000))}d trial left
              </span>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:3, overflowY:'auto', overflowX:'hidden' }}>
          {links.map(l => {
            const active  = isActive(l.to);
            const locked  = isLocked(l.to);
            const Icon    = l.icon;
            return (
              <button key={l.to}
                onClick={() => locked ? handleLockedClick(l) : navigate(l.to)}
                title={locked ? `Upgrade to unlock ${l.label}` : l.label}
                style={{
                  display:'flex', alignItems:'center', gap:11,
                  padding:'10px 12px', borderRadius:10, border:'none',
                  background: active ? `linear-gradient(135deg, ${l.color}cc, ${l.color}99)` : 'transparent',
                  cursor:'pointer', width:'100%', textAlign:'left',
                  transition:'all 0.18s', fontFamily:"'Plus Jakarta Sans',sans-serif",
                  opacity: locked ? 0.55 : 1,
                  boxShadow: active ? `0 4px 14px ${l.color}40` : 'none',
                  position:'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-raised)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ width:30, height:30, borderRadius:8, background: active ? 'rgba(255,255,255,0.22)' : `${l.color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon size={15} style={{ color: active ? '#ffffff' : locked ? 'rgba(255,255,255,0.35)' : `${l.color}ee`, flexShrink:0 }} /></span>
                <span style={{ fontSize:14.5, fontWeight: active ? 700 : 600, color: active ? '#ffffff' : 'rgba(255,255,255,0.78)', flex:1, letterSpacing:'-0.01em' }}>
                  {l.label}
                </span>
                {active && <div style={{ width:3, height:16, borderRadius:2, background:l.color, flexShrink:0 }}/>}
                {locked && !active && (
                  <Lock size={11} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: New quote CTA + User profile */}
        <div style={{ padding:'10px 12px calc(12px + env(safe-area-inset-bottom))', flexShrink:0, display:'flex', flexDirection:'column', gap:8, borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:'auto' }}>

          {/* New Quote button */}
          <NavLink to="/quotes/new" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', borderRadius:11, textDecoration:'none', fontSize:14, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'0 4px 14px rgba(37,99,235,0.4)', letterSpacing:'-0.01em' }}>
            <Plus size={16}/> New Quote
          </NavLink>

          {/* Notifications Bell */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowNotifications(v => !v)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:9, border:'none', background:'rgba(255,255,255,0.06)', color:unreadCount > 0 ? '#F59E0B' : 'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:13, fontWeight:600, width:'100%', transition:'all 0.15s', position:'relative' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}>
              <span style={{ position:'relative', display:'flex' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadCount > 0 && <span style={{ position:'absolute', top:-5, right:-5, width:14, height:14, borderRadius:'50%', background:'#EF4444', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #0F172A' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </span>
              <span>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
            </button>
            {/* Notification dropdown */}
            {showNotifications && (
              <div style={{ position:'fixed', top:16, right:16, width:360, maxWidth:'calc(100vw - 32px)', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 16px 48px rgba(11,18,32,0.25)', zIndex:400, overflow:'hidden' }}>
                <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={async () => {
                      const t = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
                      await fetch('/api/profiles/notifications/read-all', { method:'PATCH', headers:{ Authorization:`Bearer ${t}` } });
                      setUnreadCount(0);
                      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
                    }} style={{ fontSize:11, color:'#2563EB', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight:'calc(60vh - 120px)', overflowY:'auto' }}>
                  {notifications.length === 0 && (
                    <div style={{ padding:'24px 14px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No notifications yet</div>
                  )}
                  {notifications.slice(0,10).map(n => (
                    <div key={n.id} onClick={async () => {
                      const t = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
                      if (!n.read_at) {
                        await fetch(`/api/profiles/notifications/${n.id}/read`, { method:'PATCH', headers:{ Authorization:`Bearer ${t}` } });
                        setUnreadCount(c => Math.max(0, c-1));
                        setNotifications(prev => prev.map(x => x.id===n.id ? {...x, read_at: new Date().toISOString()} : x));
                      }
                      if (n.url) navigate(n.url);
                      setShowNotifications(false);
                    }} style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', background: n.read_at ? 'transparent' : 'rgba(37,99,235,0.06)', display:'flex', gap:10, alignItems:'flex-start' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background=n.read_at?'transparent':'rgba(37,99,235,0.06)'}>
                      <div style={{ fontSize:18, flexShrink:0, lineHeight:1 }}>
                        {n.type==='invite_accepted'?'✅':n.type==='invite_declined'?'❌':n.type==='mention'?'💬':'🔔'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:n.read_at?600:800, color:'var(--text-primary)', lineHeight:1.3 }}>{n.title}</div>
                        {n.body && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>}
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                      {!n.read_at && <div style={{ width:6, height:6, borderRadius:'50%', background:'#2563EB', flexShrink:0, marginTop:4 }}/>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button onClick={() => setDark(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:9, border:'none', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif", width:'100%', transition:'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}>
            {dark ? <Sun size={15} color="#F59E0B"/> : <Moon size={15} color="#94A3B8"/>}
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>

          {/* User profile row */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, cursor:'pointer', transition:'all 0.15s', background:'rgba(255,255,255,0.06)' }}
            onClick={() => setShowUserProfile(true)}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
            title="My Profile">
            {/* Avatar with online indicator */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#2563EB,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', boxShadow:'0 2px 8px rgba(37,99,235,0.4)' }}>
                {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ position:'absolute', bottom:-2, right:-2, width:10, height:10, borderRadius:'50%', background:'#22C55E', border:'2px solid #0F172A' }} title="Online" />
            </div>
            {/* Name & email */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.92)', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.user_metadata?.full_name || account?.name || 'My Account'}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                {user?.email || 'Settings'}
              </div>
            </div>
            {/* Profile icon */}
            <div style={{ color:'rgba(255,255,255,0.4)', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>

          {/* Business Settings quick link */}
          <button onClick={() => window.dispatchEvent(new CustomEvent('revanew:settings'))}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8,
              border:'none', background:'transparent', color:'rgba(255,255,255,0.5)',
              cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif",
              transition:'all 0.15s', width:'100%' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            Business Settings
          </button>

          {/* Sign out */}
          <button onClick={signOut} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:'none', background:'transparent', color:'rgba(255,255,255,0.38)', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.15s', width:'100%', letterSpacing:'-0.01em' }}
            onMouseEnter={e => { e.currentTarget.style.color='rgba(239,68,68,0.9)'; e.currentTarget.style.background='rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.38)'; e.currentTarget.style.background='transparent'; }}>
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAV (below md) ───────────────────────── */}
      <nav className="mobile-bottom-nav" style={{
        position:'fixed', bottom:0, left:0, right:0,
        height:'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom:'env(safe-area-inset-bottom)',
        background:'var(--bg-surface)',
        borderTop:'1px solid var(--border)',
        display:'flex', alignItems:'center',
        zIndex:90, backdropFilter:'blur(12px)',
      }}>
        {mobilePrimaryLinks.map(l => {
          const active = isActive(l.to);
          const Icon   = l.icon;
          return (
            <NavLink key={l.to} to={l.to}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, padding:'8px 0', textDecoration:'none' }}>
              <Icon size={20} style={{ color: active ? l.color : 'var(--text-muted)' }}/>
              <span style={{ fontSize:10, fontWeight: active ? 700 : 500, color: active ? l.color : 'var(--text-muted)' }}>{l.short || l.label.slice(0,7)}</span>
            </NavLink>
          );
        })}
        {/* More button */}
        <button onClick={() => setShowMobileMore(v => !v)}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, padding:'8px 0', background:'none', border:'none', cursor:'pointer' }}>
          <Grid size={20} style={{ color: showMobileMore ? accent : 'var(--text-muted)' }}/>
          <span style={{ fontSize:10, fontWeight: showMobileMore ? 700 : 500, color: showMobileMore ? accent : 'var(--text-muted)' }}>More</span>
        </button>
      </nav>

      {/* Mobile More drawer */}
      {showMobileMore && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:109, background:'rgba(11,18,32,0.5)', backdropFilter:'blur(4px)' }}
            onClick={() => setShowMobileMore(false)} />
          <div style={{ position:'fixed', bottom:'calc(74px + env(safe-area-inset-bottom))', left:12, right:12, zIndex:110,
            background:'var(--bg-surface)', borderRadius:18, border:'1px solid var(--border)',
            boxShadow:'0 -8px 40px rgba(11,18,32,0.18)', padding:'10px 6px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
            {/* Notifications */}
          <button onClick={() => { setShowNotifications(v => !v); setShowMobileMore(false); }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'10px 8px', borderRadius:12, border:'none', background:'none', cursor:'pointer', position:'relative', color:'var(--text-secondary)' }}>
            <div style={{ position:'relative' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={unreadCount>0?'#F59E0B':'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && <span style={{ position:'absolute', top:-4, right:-4, width:14, height:14, borderRadius:'50%', background:'#EF4444', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadCount}</span>}
            </div>
            <span style={{ fontSize:10, fontWeight:600 }}>Alerts</span>
          </button>

          {/* Dark mode toggle */}
            <button onClick={() => { setDark(v => !v); }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'12px 4px', borderRadius:12, border:'none',
                background: dark ? 'rgba(99,102,241,0.12)' : 'transparent', cursor:'pointer',
                fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              <span style={{ width:40, height:40, borderRadius:12, background: dark ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {dark ? <Sun size={20} color="#6366f1"/> : <Moon size={20} color="#64748B"/>}
              </span>
              <span style={{ fontSize:11, fontWeight:600, color: dark ? '#6366f1' : 'var(--text-muted)' }}>{dark ? 'Light' : 'Dark'}</span>
            </button>

            {/* Account Settings */}
            <button onClick={() => { setShowMobileMore(false); window.dispatchEvent(new CustomEvent('revanew:settings')); }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'12px 4px', borderRadius:12, border:'none',
                background:'transparent', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              <span style={{ width:40, height:40, borderRadius:12, background:'rgba(37,99,235,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Settings size={20} color="#2563EB"/>
              </span>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)' }}>Settings</span>
            </button>

            {/* Sign out */}
            <button onClick={() => { setShowMobileMore(false); signOut(); }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'12px 4px', borderRadius:12, border:'none',
                background:'transparent', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              <span style={{ width:40, height:40, borderRadius:12, background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <LogOut size={20} color="#EF4444"/>
              </span>
              <span style={{ fontSize:11, fontWeight:600, color:'#EF4444' }}>Sign out</span>
            </button>

            {mobileMoreLinks.map(l => {
              const active = isActive(l.to);
              const locked = isLocked(l.to);
              const Icon   = l.icon;
              return (
                <button key={l.to}
                  onClick={() => { setShowMobileMore(false); locked ? handleLockedClick(l) : navigate(l.to); }}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'12px 4px', borderRadius:12, border:'none',
                    background: active ? `${l.color}12` : 'transparent', cursor:'pointer',
                    fontFamily:"'Plus Jakarta Sans',sans-serif", opacity: locked ? 0.6 : 1 }}>
                  <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                    background:`${l.color}18` }}>
                    <Icon size={17} style={{ color: l.color }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight: active ? 700 : 500, color: active ? l.color : 'var(--text-secondary)' }}>{l.label}</span>
                  {locked && <Lock size={9} style={{ color:'var(--text-muted)', marginTop:-2 }}/>}
                </button>
              );
            })}
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

  // ── State declarations (must come before useEffects) ──────────
  const [showSettings,   setShowSettings]   = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Show onboarding if never dismissed this session (we check account later)
    return false; // Will be set after account loads
  });
  React.useEffect(() => {
    // Show onboarding when account loads and hasn't completed setup
    if (account && account.onboarding_complete !== 1 && !account.business_address && !account.technician_name) {
      // Only show for accounts that have no company info at all
      const dismissed = sessionStorage.getItem('onboarding_dismissed_' + account.id);
      if (!dismissed) setShowOnboarding(true);
    }
  }, [account?.id, account?.onboarding_complete]);

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showTour,       setShowTour]       = useState(false);

  // Listen for navigation events from AccountContext
  React.useEffect(() => {
    const handler = (e) => {
      try { navigate(e.detail); } catch {}
    };
    window.addEventListener('revanew:navigate', handler);
    const settingsHandler = () => setShowSettings(true);
    window.addEventListener('revanew:settings', settingsHandler);
    return () => {
      window.removeEventListener('revanew:navigate', handler);
      window.removeEventListener('revanew:settings', settingsHandler);
    };
  }, [navigate]);

  // Onboarding & billing redirect — runs when account data is available
  React.useEffect(() => {
    if (!account || loading) return; // wait for account to load
    const path = location.pathname;
    if (path.includes('/billing') || path.includes('/login') || path.includes('/portal') || path.includes('/auth/callback')) return;

    // New user → billing welcome (only once - set onboarded flag to prevent loop)
    const isNew = localStorage.getItem('revanew_new_user') === '1';
    if (isNew) {
      localStorage.removeItem('revanew_new_user');
      localStorage.setItem('revanew_onboarded', '1'); // prevent redirect loop
      // Check for pending invite
      const pendingInvite = localStorage.getItem('revanew_pending_invite');
      if (pendingInvite) {
        localStorage.removeItem('revanew_pending_invite');
        navigate(`/invite/accept/${pendingInvite}`);
        return;
      }
      navigate('/billing?welcome=1');
      return;
    }
    
    // Check for pending invite from email link (even for existing users)
    const pendingInvite = localStorage.getItem('revanew_pending_invite');
    if (pendingInvite && path !== `/invite/accept/${pendingInvite}`) {
      localStorage.removeItem('revanew_pending_invite');
      navigate(`/invite/accept/${pendingInvite}`);
      return;
    }

    // Trial ending (≤3 days) on login → billing upsell (once per hour)
    const loginEvent = localStorage.getItem('revanew_login_event');
    const justLoggedIn = loginEvent && (Date.now() - parseInt(loginEvent)) < 60000;
    if (justLoggedIn) {
      localStorage.removeItem('revanew_login_event');
      const status = account.subscription_status || 'trialing';
      const trialEnd = account.trial_ends_at ? new Date(account.trial_ends_at) : null;
      const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : null;
      const lastUpsell = localStorage.getItem('revanew_upsell_shown');
      const shownRecently = lastUpsell && (Date.now() - parseInt(lastUpsell)) < 3600000;
      if (status === 'trialing' && daysLeft !== null && daysLeft <= 3 && !shownRecently) {
        localStorage.setItem('revanew_upsell_shown', Date.now().toString());
        navigate(`/billing?trial_ending=1&days=${daysLeft}`);
        return;
      }
    }

    // Tour: show after billing, only once
    const shouldShowTour = localStorage.getItem('revanew_show_tour') === '1' &&
                           !localStorage.getItem('revanew_tour_done') &&
                           !path.includes('/billing');
    setShowTour(shouldShowTour);
  }, [account, loading, location.pathname]);
  const [dark, setDark] = useDarkMode();
  const accent = account?.primary_color || '#13B5EA';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7F8' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: accent + '40', borderTopColor: accent }} />
        <p className="text-sm text-ink-muted font-medium">Loading…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)', overflow: 'hidden', maxWidth: '100vw', width:'100%', display:'flex', flexDirection:'column', height:'100dvh' }}>
      <React.Suspense fallback={null}><TrialBanner /></React.Suspense>
      <React.Suspense fallback={null}><InstallPWA /></React.Suspense>
      {showTour && (
        <React.Suspense fallback={null}>
          <OnboardingTour onDone={() => {
            setShowTour(false);
            localStorage.removeItem('revanew_show_tour');
          }} />
        </React.Suspense>
      )}

{/* Mobile header removed — sidebar nav is the primary navigation */}

      {showSettings   && <AccountSettings onClose={() => setShowSettings(false)} />}
      {showUserProfile && <UserProfileModal onClose={() => setShowUserProfile(false)} />}
      <OfflineBanner />
      {showOnboarding  && (
        <CompanyOnboarding
          onComplete={() => {
            setShowOnboarding(false);
            sessionStorage.setItem('onboarding_dismissed_' + account?.id, '1');
          }}
        />
      )}
      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} onCreated={() => {}} />}

      {/* ── Main layout: sidebar + content ─────────────────────── */}
      <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' }}>
        {/* Left sidebar nav — desktop */}
        <Nav />

        {/* Page content — scroll container, works on iOS + Android */}
        <main style={{ flex:1, minWidth:0, overflowX:'hidden', overflowY:'auto', 
          WebkitOverflowScrolling:'touch',
          paddingBottom:'calc(env(safe-area-inset-bottom) + 80px)' }}>
          {children}
        </main>
      </div>

      {/* AI Assistant — floating on all pages */}
      <React.Suspense fallback={null}>
        <AIAssistant />
      </React.Suspense>
    </div>
  );
}

function useDarkMode() {
  const [dark, setDark] = React.useState(() => {
    // DEFAULT: always light mode unless user has EXPLICITLY chosen dark
    const stored = localStorage.getItem('revanew_theme');
    // Only go dark if the user explicitly saved 'dark' — never infer from OS
    return stored === 'dark';
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add('dark'); }
    else       { root.classList.remove('dark'); }
    // Only persist if user toggles — null means "never set, default to light"
    if (dark) {
      localStorage.setItem('revanew_theme', 'dark');
    } else {
      // Remove so a fresh session always starts light
      localStorage.removeItem('revanew_theme');
    }
  }, [dark]);

  return [dark, setDark];
}

// Route that shows landing for unauth, dashboard for auth
function LandingRoute() {
  const { isAuthenticated, loading } = useAuth();
  const nav = useNavigate();
  if (loading) return null;
  if (isAuthenticated) { nav('/dashboard', { replace: true }); return null; }
  return <LandingPage />;
}

export default function App() {
  // Register service worker for offline support
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[SW] Registered, scope:', reg.scope))
        .catch(err => console.warn('[SW] Registration failed:', err));
    }
  }, []);
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <SessionExpiredModal />
        <IdleWarningBannerWrapper />
        <Routes>
          {/* Public — no auth required */}
          <Route path="/"                         element={<LandingRoute />} />
          <Route path="/landing"                  element={<LandingPage />} />
          <Route path="/login"                    element={<Login />} />
          <Route path="/auth/callback"              element={<AuthCallback />} />
          <Route path="/portal/quote/:token"      element={<PublicQuote />} />
          <Route path="/portal/invoice/:token"    element={<PublicInvoice />} />

          {/* Protected — requires login */}
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
                    <Route path="/time"           element={<TimeTrackingPage />} />
                    <Route path="/contacts/new"    element={<Contacts />} />
                    <Route path="/admin"            element={<Admin />} />
                    <Route path="/taxes"           element={<TaxesPage />} />
                    <Route path="/billing"         element={<BillingPage />} />
                    <Route path="/onboarding"      element={<Onboarding />} />
                    <Route path="/invite/accept/:token" element={<InviteAcceptPage mode="accept" />} />
                    <Route path="/invite/decline/:token" element={<InviteAcceptPage mode="decline" />} />
                    <Route path="/invite/error" element={<InviteAcceptPage mode="error" />} />
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
