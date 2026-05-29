import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { useAccount } from './context/AccountContext';

import AccountSwitcher from './components/AccountSwitcher';
import AccountSettings from './components/AccountSettings';
import NewAccountModal from './components/NewAccountModal';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
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
import { LayoutDashboard, FileText, Receipt, Users, Zap, Plus, LogOut, CreditCard, Shield, BarChart2, Sun, Moon, Grid, Calendar, FolderOpen, Image as ImageIcon, MessageSquare, Lock } from 'lucide-react';
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
  const { user } = useAuth();
  const accent = account?.primary_color || '#13B5EA';
  const loc    = useLocation();
  const navigate = useNavigate();
  const [showMobileMore, setShowMobileMore] = useState(false);
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
        width: 220,
        minWidth: 220,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 40,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink:0 }}>
          <NavLink to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <img src="/logo-revanew.png" alt="Revanew" style={{ width:32, height:32, objectFit:'contain', borderRadius:8 }} />
            <span style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.04em' }}>Revanew</span>
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
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
          {links.map(l => {
            const active  = isActive(l.to);
            const locked  = isLocked(l.to);
            const Icon    = l.icon;
            return (
              <button key={l.to}
                onClick={() => locked ? handleLockedClick(l) : navigate(l.to)}
                title={locked ? `Upgrade to unlock ${l.label}` : l.label}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 12px', borderRadius:10, border:'none',
                  background: active ? `${l.color}15` : 'transparent',
                  cursor:'pointer', width:'100%', textAlign:'left',
                  transition:'all 0.12s', fontFamily:"'Plus Jakarta Sans',sans-serif",
                  opacity: locked ? 0.55 : 1,
                  position:'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-raised)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <Icon size={16} style={{ color: active ? l.color : locked ? 'var(--text-muted)' : 'var(--text-secondary)', flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight: active ? 700 : 500, color: active ? l.color : 'var(--text-secondary)', flex:1 }}>
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

        {/* Bottom: New quote CTA */}
        <div style={{ padding:'12px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <NavLink to="/quotes/new" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', borderRadius:11, textDecoration:'none', fontSize:13, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <Plus size={15}/> New Quote
          </NavLink>
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
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showTour,       setShowTour]       = useState(false);

  // Listen for navigation events from AccountContext
  React.useEffect(() => {
    const handler = (e) => {
      try { navigate(e.detail); } catch {}
    };
    window.addEventListener('revanew:navigate', handler);
    return () => window.removeEventListener('revanew:navigate', handler);
  }, [navigate]);

  // Onboarding & billing redirect — runs when account data is available
  React.useEffect(() => {
    if (!account || loading) return; // wait for account to load
    const path = location.pathname;
    if (path.includes('/billing') || path.includes('/login') || path.includes('/portal') || path.includes('/auth/callback')) return;

    // New user → billing welcome
    const isNew = localStorage.getItem('revanew_new_user') === '1';
    if (isNew) {
      localStorage.removeItem('revanew_new_user');
      navigate('/billing?welcome=1');
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
    <div className="min-h-screen" style={{ background: 'var(--bg-page)', overflowX: 'hidden', maxWidth: '100vw', display:'flex', flexDirection:'column' }}>
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

      {/* Mobile FAB */}
      <NavLink to="/quotes/new" className="fab md:hidden" title="New quote">
        <Plus size={26} />
      </NavLink>

      {showSettings   && <AccountSettings onClose={() => setShowSettings(false)} />}
      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} onCreated={() => {}} />}

      {/* ── Main layout: sidebar + content ─────────────────────── */}
      <div style={{ display:'flex', flex:1, minHeight:0 }}>
        {/* Left sidebar nav — desktop */}
        <Nav />

        {/* Page content */}
        <main style={{ flex:1, minWidth:0, overflowX:'hidden', overflowY:'auto', display:'flex', flexDirection:'column' }}>
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

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <SessionExpiredModal />
        <IdleWarningBannerWrapper />
        <Routes>
          {/* Public — no auth required */}
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
                    <Route path="/contacts/new"    element={<Contacts />} />
                    <Route path="/admin"            element={<Admin />} />
                    <Route path="/taxes"           element={<TaxesPage />} />
                    <Route path="/billing"         element={<BillingPage />} />
                    <Route path="/onboarding"      element={<Onboarding />} />
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
