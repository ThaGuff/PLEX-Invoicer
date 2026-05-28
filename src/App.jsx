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
import AnalyticsPage  from './pages/AnalyticsPage';
const TrialBanner  = React.lazy(() => import('./components/TrialBanner').catch(() => ({ default: () => null })));
const InstallPWA    = React.lazy(() => import('./components/InstallPWA').catch(() => ({ default: () => null })));
const OnboardingTour = React.lazy(() => import('./components/OnboardingTour').catch(() => ({ default: () => null })));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage').catch(() => ({ default: () => null })));
const CalendarPage  = React.lazy(() => import('./pages/CalendarPage').catch(() => ({ default: () => null })));
const PhotosPage    = React.lazy(() => import('./pages/PhotosPage').catch(() => ({ default: () => null })));
const WorkspacePage = React.lazy(() => import('./pages/WorkspacePage').catch(() => ({ default: () => null })));
import { LayoutDashboard, FileText, Receipt, Users, Zap, Plus, LogOut, CreditCard, Shield, BarChart2, Sun, Moon, Grid, Calendar, FolderOpen, Image as ImageIcon, MessageSquare } from 'lucide-react';
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
  const loc = useLocation();
  const [showMobileMore, setShowMobileMore] = useState(false);
  const isOwner = user?.email === 'guffey.ryan@gmail.com' || user?.id === 'dev-user';

  // Mobile nav shows top 5; desktop shows all
  const links = [
    { to: '/',            label: 'Dashboard', icon: LayoutDashboard, short: 'Home',     color: '#0D9488' },
    { to: '/quotes',      label: 'Quotes',    icon: FileText,        short: 'Quotes',   color: '#2563EB' },
    { to: '/invoices',    label: 'Invoices',  icon: Receipt,         short: 'Invoices', color: '#7C3AED' },
    { to: '/contacts',    label: 'Clients',   icon: Users,           short: 'Clients',  color: '#0D9488' },
    { to: '/calendar',    label: 'Schedule',  icon: Calendar,        short: 'Schedule', color: '#0D9488' },
    { to: '/documents',   label: 'Documents', icon: FolderOpen,      short: 'Docs',     color: '#2563EB' },
    { to: '/photos',      label: 'Photos',    icon: ImageIcon,       short: 'Photos',   color: '#D97706' },
    { to: '/workspace',   label: 'Team',      icon: MessageSquare,   short: 'Team',     color: '#7C3AED' },
    { to: '/automations', label: 'Automate',  icon: Zap,             short: 'Automate', color: '#D97706' },
    { to: '/analytics',   label: 'Analytics', icon: BarChart2,       short: 'Stats',    color: '#2563EB' },
    { to: '/billing',     label: 'Billing',   icon: CreditCard,      short: 'Billing',  color: '#7C3AED' },
    ...(isOwner ? [{ to: '/admin', label: 'Admin', icon: Shield, short: 'Admin', color: '#ef4444' }] : []),
  ];
  // Mobile bottom nav: Home, Quotes, Invoices, Clients, More (Automate)
  // Mobile bottom nav: 4 core tabs + "More" drawer for the rest
  const mobilePrimaryLinks = links.slice(0, 4); // Dashboard, Quotes, Invoices, Clients
  const mobileMoreLinks = links.slice(4);       // Automate, Analytics, Billing, Admin

  const isActive = (to) => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);

  return (
    <>
      {/* Desktop nav — hidden on mobile via CSS */}
      <nav className="desktop-nav">
        {links.map(l => {
          const active = isActive(l.to);
          return (
            <NavLink key={l.to} to={l.to}
              className="nav-pill"
              style={{
                color: active ? '#fff' : 'var(--text-secondary)',
                background: active ? `linear-gradient(135deg, ${l.color}cc, ${l.color}88)` : 'transparent',
                borderColor: active ? `${l.color}33` : 'transparent',
                boxShadow: active ? `0 2px 12px ${l.color}33` : 'none',
                transform: active ? 'translateY(-1px)' : 'translateY(0)',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background=`${l.color}12`; e.currentTarget.style.color=l.color; e.currentTarget.style.borderColor=`${l.color}25`; e.currentTarget.style.transform='translateY(-1px)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-secondary)'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.transform='translateY(0)'; }}}>
              <l.icon size={14} style={{ flexShrink:0 }} />
              <span>{l.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Mobile bottom nav */}
      <div className="mobile-nav">
        {mobilePrimaryLinks.map(l => {
          const active = isActive(l.to);
          return (
            <NavLink key={l.to} to={l.to}
              onClick={() => setShowMobileMore(false)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, padding:'6px 2px', borderRadius:12, transition:'all 0.2s ease', color: active ? l.color : 'var(--text-muted)', background: active ? `${l.color}14` : 'transparent', textDecoration:'none' }}>
              <div style={{ width: active?36:28, height: active?36:28, borderRadius: active?10:8, display:'flex', alignItems:'center', justifyContent:'center', background: active ? `linear-gradient(135deg,${l.color},#6B3FD8)` : 'transparent', transition:'all 0.2s ease', boxShadow: active ? `0 4px 12px ${l.color}44` : 'none' }}>
                <l.icon size={active?18:20} color={active?'#fff':'currentColor'} strokeWidth={active?2.5:1.8} />
              </div>
              <span style={{ fontSize:10, fontWeight: active?700:500 }}>{l.short}</span>
            </NavLink>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setShowMobileMore(v => !v)}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, padding:'6px 2px', borderRadius:12, border:'none', background: showMobileMore ? 'rgba(107,63,216,0.12)' : 'transparent', cursor:'pointer', color: showMobileMore ? '#7C3AED' : 'var(--text-muted)', transition:'all 0.2s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <div style={{ width: showMobileMore?36:28, height: showMobileMore?36:28, borderRadius: showMobileMore?10:8, display:'flex', alignItems:'center', justifyContent:'center', background: showMobileMore ? 'linear-gradient(135deg,#6B3FD8,#3B6FE8)' : 'transparent', transition:'all 0.2s', boxShadow: showMobileMore ? '0 4px 12px rgba(107,63,216,0.4)' : 'none' }}>
            <Grid size={showMobileMore?18:20} color={showMobileMore?'#fff':'currentColor'} strokeWidth={showMobileMore?2.5:1.8} />
          </div>
          <span style={{ fontSize:10, fontWeight: showMobileMore?700:500 }}>More</span>
        </button>
      </div>

      {/* Mobile More drawer — renders inside Nav() so it has state access */}
      {showMobileMore && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:109, background:'rgba(11,18,32,0.45)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)' }} onClick={() => setShowMobileMore(false)} />
          <div style={{ position:'fixed', bottom:'calc(74px + env(safe-area-inset-bottom))', left:12, right:12, zIndex:110, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', boxShadow:'0 -8px 40px rgba(11,18,32,0.25)', animation:'fadeUp 0.2s ease both' }}>
            <div style={{ padding:'12px 16px 8px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px' }}>More</p>
              <button onClick={() => setShowMobileMore(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', padding:'8px 4px 12px' }}>
              {mobileMoreLinks.map(l => {
                const active = isActive(l.to);
                return (
                  <NavLink key={l.to} to={l.to}
                    onClick={() => setShowMobileMore(false)}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 6px', textDecoration:'none', borderRadius:12, background: active ? `${l.color}12` : 'transparent', transition:'background 0.15s' }}>
                    <div style={{ width:46, height:46, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', background: active ? `linear-gradient(135deg,${l.color},#7C3AED)` : 'var(--bg-raised)', border:`1px solid ${active ? l.color+'55' : 'var(--border)'}`, boxShadow: active ? `0 4px 14px ${l.color}44` : 'none', transition:'all 0.2s' }}>
                      <l.icon size={22} color={active ? '#fff' : l.color} strokeWidth={1.8} />
                    </div>
                    <span style={{ fontSize:11, fontWeight: active?700:600, color: active ? l.color : 'var(--text-secondary)', textAlign:'center', lineHeight:1.2 }}>{l.short}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Crash-proof wrapper using React.lazy + Suspense
// If the component fails to load, silently returns null
function SafeTrialBanner() {
  return (
    <React.Suspense fallback={null}>
      <TrialBanner />
    </React.Suspense>
  );
}


function AppShell({ children }) {
  const { account, loading } = useAccount();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  // Listen for navigation events from AccountContext (which can't use useNavigate directly)
  React.useEffect(() => {
    const handler = (e) => {
      try { navigate(e.detail); } catch {}
    };
    window.addEventListener('revanew:navigate', handler);
    return () => window.removeEventListener('revanew:navigate', handler);
  }, [navigate]);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTour, setShowTour] = useState(false);
  // Tour fires after billing is done — check on mount and after billing success
  React.useEffect(() => {
    const checkTour = () => {
      const shouldShow = localStorage.getItem('revanew_show_tour') === '1' &&
                         !localStorage.getItem('revanew_tour_done') &&
                         !window.location.pathname.includes('/billing') &&
                         !window.location.pathname.includes('/login');
      setShowTour(shouldShow);
    };
    checkTour();
    // Re-check when URL changes (user navigates away from billing)
    window.addEventListener('popstate', checkTour);
    window.addEventListener('revanew:navigate', checkTour);
    return () => {
      window.removeEventListener('popstate', checkTour);
      window.removeEventListener('revanew:navigate', checkTour);
    };
  }, []);
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
    <div className="min-h-screen" style={{ background: 'var(--bg-page)', overflowX: 'hidden', maxWidth: '100vw' }}>
      {/* Desktop / Mobile header */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 max(16px, calc(12px + env(safe-area-inset-right))) 0 max(14px, calc(12px + env(safe-area-inset-left)))', height:60, display:'flex', alignItems:'center', gap:10, width:'100%', boxSizing:'border-box', overflow:'visible', position:'relative' }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <img src="/logo-revanew.png" alt="Revanew" style={{ width:34, height:34, objectFit:"contain", borderRadius:8 }} />
            <span className="hidden md:block" style={{ fontSize:'17px', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.5px' }}>Revanew</span>
          </div>

          {/* Desktop nav — hidden on mobile */}
          <div className="hidden md:block w-px h-5 shrink-0" style={{ background:'var(--border)' }} />
          <Nav />

          {/* Right actions */}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            {/* Dark mode toggle */}
            <button onClick={() => setDark(d => !d)}
              title={dark ? 'Light mode' : 'Dark mode'}
              className='hidden md:flex' style={{ width:36, height:36, borderRadius:9, alignItems:'center', justifyContent:'center', border:'0.5px solid var(--border)', background:'var(--bg-page)', cursor:'pointer', color:'var(--text-secondary)', flexShrink:0 }}>
              {dark ? <Sun size={15}/> : <Moon size={15}/>}
            </button>
            {/* New quote — hidden on mobile (FAB handles it) */}
            <NavLink to="/quotes/new"
              className="hidden md:flex items-center gap-2 text-white rounded-xl"
              style={{ background:'linear-gradient(135deg,#00E5C8,#4B7BFF,#7B4FE8)', fontSize:'13px', fontWeight:700, padding:'9px 16px', boxShadow:'0 4px 14px rgba(75,123,255,0.35)', letterSpacing:'-0.01em', textDecoration:'none', flexShrink:0 }}>
              <Plus size={14}/> New quote
            </NavLink>
            <div className="hidden md:block">
              <AccountSwitcher onOpenSettings={() => setShowSettings(true)} onNewAccount={() => setShowNewAccount(true)} />
            </div>
            {/* Avatar */}
            <div className="relative" style={{ flexShrink:0, isolation:"isolate" }}>
              <button onClick={() => setShowUserMenu(v => !v)}
                style={{ width:42, height:42, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'15px', fontWeight:800, background:accent, border:'2px solid rgba(255,255,255,0.2)', cursor:'pointer', flexShrink:0, minWidth:42, minHeight:42, marginRight:'max(0px, env(safe-area-inset-right))' }}>
                {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </button>
              {showUserMenu && (
                <>
                  <div style={{ position:'fixed', inset:0, zIndex:199 }} onClick={() => setShowUserMenu(false)} />
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:224, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'0 20px 60px rgba(11,18,32,0.2), 0 4px 16px rgba(11,18,32,0.1)', zIndex:200, overflow:'hidden', minWidth:200 }}>
                    <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-raised)' }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.user_metadata?.full_name || 'My account'}</p>
                      <p style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>{user?.email}</p>
                    </div>
                    <div style={{ padding:'4px 0' }}>
                      <NavLink to="/billing" onClick={() => setShowUserMenu(false)}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', fontSize:13, fontWeight:500, color:'var(--text-secondary)', textDecoration:'none', transition:'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--bg-page)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <CreditCard size={14} style={{ color:'var(--text-muted)' }} /> Billing & plans
                      </NavLink>
                      <button onClick={() => { setShowUserMenu(false); setShowSettings(true); }}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', fontSize:13, fontWeight:500, color:'var(--text-secondary)', background:'transparent', border:'none', cursor:'pointer', width:'100%', textAlign:'left', transition:'background 0.12s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--bg-page)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <Shield size={14} style={{ color:'var(--text-muted)' }} /> Account settings
                      </button>
                      <div style={{ height:'1px', background:'var(--border-subtle)', margin:'4px 0' }} />
                      <button onClick={() => { setShowUserMenu(false); signOut(); }}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', fontSize:13, fontWeight:500, color:'#ef4444', background:'transparent', border:'none', cursor:'pointer', width:'100%', textAlign:'left', transition:'background 0.12s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Accent stripe */}
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #00C9B1, #3B6FE8, #6B3FD8)' }} />
      </header>
      <SafeTrialBanner />
      <React.Suspense fallback={null}>
        <InstallPWA />
      </React.Suspense>
      {showTour && (
        <React.Suspense fallback={null}>
          <OnboardingTour onDone={() => {
            setShowTour(false);
            localStorage.removeItem('revanew_show_tour');
          }} />
        </React.Suspense>
      )}

      {/* Mobile FAB - new quote (z-99, sits under More drawer which is z-110) */}
      <NavLink to="/quotes/new" className="fab md:hidden" title="New quote">
        <Plus size={26} />
      </NavLink>

      {showSettings   && <AccountSettings onClose={() => setShowSettings(false)} />}
      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} onCreated={() => {}} />}

      {/* Main content */}
      <main className="page-content" style={{ flex:1, minWidth:0, overflowX:"hidden" }}>{children}</main>
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
                    <Route path="/documents"       element={<React.Suspense fallback={null}><DocumentsPage /></React.Suspense>} />
                    <Route path="/calendar"        element={<React.Suspense fallback={null}><CalendarPage /></React.Suspense>} />
                    <Route path="/photos"          element={<React.Suspense fallback={null}><PhotosPage /></React.Suspense>} />
                    <Route path="/workspace"       element={<React.Suspense fallback={null}><WorkspacePage /></React.Suspense>} />
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
