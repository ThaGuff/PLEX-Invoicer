import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
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
import { LayoutDashboard, FileText, Receipt, Users, Zap, Plus, LogOut, CreditCard, Shield } from 'lucide-react';
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
  const isOwner = user?.email === 'guffey.ryan@gmail.com' || user?.id === 'dev-user';

  const links = [
    { to: '/',              label: 'Dashboard',   icon: LayoutDashboard, short: 'Home',    color: '#00E5C8' },
    { to: '/quotes',        label: 'Quotes',      icon: FileText,        short: 'Quotes',  color: '#4B7BFF' },
    { to: '/invoices',      label: 'Invoices',    icon: Receipt,         short: 'Invoice', color: '#7B4FE8' },
    { to: '/contacts',      label: 'Clients',     icon: Users,           short: 'Clients', color: '#00E5C8' },
    { to: '/automations',   label: 'Automate',    icon: Zap,             short: 'Auto',    color: '#f59e0b' },
    { to: '/taxes',         label: 'Taxes',       icon: Receipt,         short: 'Taxes',   color: '#4B7BFF' },
    { to: '/billing',       label: 'Billing',     icon: CreditCard,      short: 'Billing', color: '#7B4FE8' },
    ...(isOwner ? [{ to: '/admin', label: 'Admin', icon: Shield, short: 'Admin', color: '#ef4444' }] : []),
  ];

  const isActive = (to) => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);

  return (
    <>
      {/* Desktop top nav — larger, interactive, tabular */}
      <nav className="desktop-nav items-center gap-1 flex-1">
        {links.map(l => {
          const active = isActive(l.to);
          return (
            <NavLink key={l.to} to={l.to}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 14px', borderRadius: '10px',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                color: active ? '#FFFFFF' : 'var(--text-secondary)',
                background: active
                  ? `linear-gradient(135deg, ${l.color || '#4B7BFF'}cc, ${l.color || '#7B4FE8'}99)`
                  : 'transparent',
                border: active ? `1px solid ${l.color || '#4B7BFF'}44` : '1px solid transparent',
                boxShadow: active ? `0 2px 12px ${l.color || '#4B7BFF'}33, inset 0 1px 0 rgba(255,255,255,0.15)` : 'none',
                transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                transform: active ? 'translateY(-1px)' : 'translateY(0)',
                textDecoration: 'none', whiteSpace: 'nowrap',
                letterSpacing: active ? '0' : '0.01em',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = `${l.color || '#4B7BFF'}14`; e.currentTarget.style.color = l.color || '#4B7BFF'; e.currentTarget.style.borderColor = `${l.color || '#4B7BFF'}30`; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
              <l.icon size={15} style={{ flexShrink: 0 }} />
              <span>{l.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Mobile bottom nav — larger, gradient active pill */}
      <div className="mobile-nav">
        {links.slice(0, 5).map(l => {
          const active = isActive(l.to);
          return (
            <NavLink key={l.to} to={l.to}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '3px', padding: '6px 4px',
                borderRadius: '12px', transition: 'all 0.2s ease',
                color: active ? l.color || '#4B7BFF' : 'var(--text-muted)',
                background: active ? `${l.color || '#4B7BFF'}12` : 'transparent',
                textDecoration: 'none',
              }}>
              <div style={{
                width: active ? 36 : 28, height: active ? 36 : 28,
                borderRadius: active ? 10 : 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? `linear-gradient(135deg, ${l.color || '#4B7BFF'}, #7B4FE8)` : 'transparent',
                transition: 'all 0.2s ease',
                boxShadow: active ? `0 4px 12px ${l.color || '#4B7BFF'}44` : 'none',
              }}>
                <l.icon size={active ? 18 : 20} color={active ? '#fff' : 'currentColor'} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500, letterSpacing: '0.3px' }}>{l.short}</span>
            </NavLink>
          );
        })}
      </div>
    </>
  );
}

function AppShell({ children }) {
  const { account, loading } = useAccount();
  const { user, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
    <div className="min-h-screen" style={{ background: '#F5F7F8' }}>
      {/* Desktop / Mobile header */}
      <header className="bg-white border-b sticky top-0 z-40" style={{ borderColor: '#E5E8EB' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-5 h-16 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="34" height="34">
              <rect width="100" height="100" rx="18" fill="#080D1A"/>
              <defs>
                <linearGradient id="rgrad-nav" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00E5C8"/>
                  <stop offset="50%" stopColor="#4B7BFF"/>
                  <stop offset="100%" stopColor="#7B4FE8"/>
                </linearGradient>
              </defs>
              <text x="14" y="80" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="80" fill="url(#rgrad-nav)">R</text>
            </svg>
            <span className="hidden md:block" style={{ fontSize:'16px', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.5px' }}>Revanew</span>
          </div>

          <div className="h-5 w-px hidden md:block" style={{ background: '#E5E8EB' }} />

          {/* Desktop nav (injected by Nav component) */}
          <Nav />

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <NavLink to="/quotes/new"
              className="hidden sm:flex items-center gap-2 text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)', fontSize:'13px', fontWeight:700, padding:'9px 18px', boxShadow: '0 4px 14px rgba(75,123,255,0.4)', letterSpacing:'-0.01em' }}>
              <Plus size={15} /> New quote
            </NavLink>
            <AccountSwitcher
              onOpenSettings={() => setShowSettings(true)}
              onNewAccount={() => setShowNewAccount(true)}
            />
            {/* Avatar */}
            <div className="relative">
              <button onClick={() => setShowUserMenu(v => !v)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                style={{ background: accent }}>
                {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border rounded-2xl shadow-xl z-50 overflow-hidden" style={{ borderColor: '#E5E8EB' }}>
                    <div className="px-4 py-3.5 border-b" style={{ borderColor: '#F0F3F5', background: '#FAFBFF' }}>
                      <p className="text-xs font-bold text-ink truncate">{user?.user_metadata?.full_name || 'My account'}</p>
                      <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <NavLink to="/billing" onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-ink hover:bg-gray-50">
                        <CreditCard size={14} className="text-ink-muted" /> Billing & Plans
                      </NavLink>
                      <button onClick={() => { setShowUserMenu(false); setShowSettings(true); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-ink hover:bg-gray-50">
                        <Shield size={14} className="text-ink-muted" /> Account settings
                      </button>
                      <div className="border-t my-1" style={{ borderColor: '#F0F3F5' }} />
                      <button onClick={() => { setShowUserMenu(false); signOut(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50">
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
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #00E5C8, #4B7BFF, #7B4FE8)' }} />
      </header>

      {showSettings   && <AccountSettings onClose={() => setShowSettings(false)} />}
      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} onCreated={() => {}} />}

      {/* Main content */}
      <main className="page-content">{children}</main>
    </div>
  );
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
