import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { AccountProvider } from './context/AccountContext';
import { useAccount } from './context/AccountContext';
import AccountSwitcher from './components/AccountSwitcher';
import AccountSettings from './components/AccountSettings';
import NewAccountModal from './components/NewAccountModal';
import Dashboard from './pages/Dashboard';
import QuoteBuilder from './pages/QuoteBuilder';
import QuotesList from './pages/QuotesList';
import InvoicesList from './pages/InvoicesList';
import InvoiceDetail from './pages/InvoiceDetail';
import Contacts from './pages/Contacts';
import PublicQuote from './pages/PublicQuote';
import PublicInvoice from './pages/PublicInvoice';
import { LayoutDashboard, FileText, Receipt, Users, Plus } from 'lucide-react';

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
    <nav className="flex items-center gap-1">
      {links.map(l => {
        const active = l.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(l.to);
        return (
          <NavLink key={l.to} to={l.to}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: active ? accent + '15' : 'transparent', color: active ? accent : '#7A7E85' }}>
            <l.icon size={14} />
            {l.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function AppShell({ children }) {
  const { account, loading } = useAccount();
  const [showSettings, setShowSettings] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const accent = account?.primary_color || '#13B5EA';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: accent, borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F5F7F8' }}>
      <header className="bg-white border-b sticky top-0 z-40" style={{ borderColor: '#E5E8EB' }}>
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded flex items-center justify-center text-white font-bold text-xs"
              style={{ background: accent }}>
              {(account?.logo_initial || account?.name?.[0] || 'P').toUpperCase()}
            </div>
            <span className="font-bold text-ink text-sm hidden sm:block">{account?.name}</span>
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
          <span className="text-xs text-ink-muted">Quote Builder v4.0</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AccountProvider>
      <BrowserRouter>
        <Routes>
          {/* Public portals — no nav shell */}
          <Route path="/portal/quote/:token"   element={<PublicQuote />} />
          <Route path="/portal/invoice/:token" element={<PublicInvoice />} />

          {/* App shell routes */}
          <Route path="/*" element={
            <AppShell>
              <Routes>
                <Route path="/"                element={<Dashboard />} />
                <Route path="/quotes"          element={<QuotesList />} />
                <Route path="/quotes/new"      element={<QuoteBuilder />} />
                <Route path="/quotes/:id"      element={<QuoteBuilder />} />
                <Route path="/invoices"        element={<InvoicesList />} />
                <Route path="/invoices/:id"    element={<InvoiceDetail />} />
                <Route path="/contacts"        element={<Contacts />} />
                <Route path="/contacts/new"    element={<Contacts />} />
              </Routes>
            </AppShell>
          } />
        </Routes>
      </BrowserRouter>
    </AccountProvider>
  );
}
