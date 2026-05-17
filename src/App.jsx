import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { useAccount } from './context/AccountContext';
import { setTokenGetter } from './utils/api';
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
import { LayoutDashboard, FileText, Receipt, Users, Plus, LogOut, CreditCard } from 'lucide-react';

// Wire up token getter so every API request gets the JWT
function TokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => { setTokenGetter(getToken); }, [getToken]);
  return null;
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
  const accent = account?.primary_color || '#13B5EA';
  const loc = useLocation();
  const links = [
    { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
    { to: '/quotes',   label: 'Quotes',    icon: FileText },
    { to: '/invoices', label: 'Invoices',  icon: Receipt },
    { to: '/contacts', label: 'Contacts',  icon: Users },
  ];
  return (
    <nav className="flex items-center gap-0.5">
      {links.map(l => {
        const active = l.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(l.to);
        return (
          <NavLink key={l.to} to={l.to}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: active ? accent + '18' : 'transparent', color: active ? accent : '#7A7E85' }}>
            <l.icon size={14} />
            <span className="hidden sm:inline">{l.label}</span>
          </NavLink>
        );
      })}
    </nav>
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
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: accent, borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F5F7F8' }}>
      <header className="bg-white border-b sticky top-0 z-40" style={{ borderColor: '#E5E8EB' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded flex items-center justify-center text-white font-bold text-xs"
              style={{ background: accent }}>
              {(account?.logo_initial || account?.name?.[0] || 'P').toUpperCase()}
            </div>
            <span className="font-bold text-ink text-sm hidden md:block">{account?.name}</span>
          </div>
          <div className="h-5 w-px bg-gray-200 mx-1" />
          <Nav />
          <div className="ml-auto flex items-center gap-2">
            <NavLink to="/quotes/new"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
              style={{ background: accent }}>
              <Plus size={12} /> New quote
            </NavLink>
            <AccountSwitcher
              onOpenSettings={() => setShowSettings(true)}
              onNewAccount={() => setShowNewAccount(true)}
            />
            {/* User avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: accent }}
                title={user?.email}>
                {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border rounded-xl shadow-lg z-50 overflow-hidden" style={{ borderColor: '#E5E8EB' }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: '#F0F3F5' }}>
                      <p className="text-xs font-semibold text-ink truncate">{user?.user_metadata?.full_name || 'My account'}</p>
                      <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                    </div>
                    <button onClick={() => { setShowUserMenu(false); setShowSettings(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-gray-50">
                      <CreditCard size={14} className="text-ink-muted" /> Account settings
                    </button>
                    <button onClick={() => { setShowUserMenu(false); signOut(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="h-0.5" style={{ background: accent }} />
      </header>

      {showSettings   && <AccountSettings onClose={() => setShowSettings(false)} />}
      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} onCreated={() => {}} />}

      <main>{children}</main>

      <footer className="border-t mt-8 py-4" style={{ borderColor: '#E5E8EB', background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
          <span className="text-xs text-ink-muted">{account?.name} · {account?.website} · {account?.phone}</span>
          <span className="text-xs text-ink-muted">PLEX Invoicer</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TokenBridge />
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
                  </Routes>
                </AppShell>
              </AccountProvider>
            </RequireAuth>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
