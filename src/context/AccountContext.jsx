import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'plex_invoicer_accounts';
const SESSION_KEY = 'plex_invoicer_session';

// ── Default PLEX master account ───────────────────────────────────────────────
const PLEX_DEFAULT_ACCOUNT = {
  id: 'plex-master',
  name: 'PLEX Automation',
  email: 'hello@plexautomation.io',
  phone: '256-609-4618',
  website: 'plexautomation.io',
  logoInitial: 'P',
  primaryColor: '#13B5EA',
  accentColor: '#0d8fc0',
  plan: 'master', // master | pro | starter
  createdAt: new Date().toISOString(),
  // Custom catalog: array of { id, sectionId, sectionLabel, name, desc, setup, monthly, badge }
  customSections: [],
  customItems: [],
  // Saved quotes
  quotes: [],
};

function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [PLEX_DEFAULT_ACCOUNT];
    const parsed = JSON.parse(raw);
    // Always ensure PLEX master exists
    if (!parsed.find(a => a.id === 'plex-master')) {
      return [PLEX_DEFAULT_ACCOUNT, ...parsed];
    }
    return parsed;
  } catch {
    return [PLEX_DEFAULT_ACCOUNT];
  }
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}

function loadSession() {
  try {
    return localStorage.getItem(SESSION_KEY) || 'plex-master';
  } catch {
    return 'plex-master';
  }
}

function saveSession(id) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {}
}

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState(() => loadAccounts());
  const [activeId, setActiveId] = useState(() => loadSession());

  const account = accounts.find(a => a.id === activeId) || accounts[0];

  // Persist on change
  useEffect(() => { saveAccounts(accounts); }, [accounts]);
  useEffect(() => { saveSession(activeId); }, [activeId]);

  const switchAccount = (id) => setActiveId(id);

  const updateAccount = (id, patch) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const createAccount = (data) => {
    const newAccount = {
      id: `acc-${Date.now()}`,
      logoInitial: (data.name || 'A')[0].toUpperCase(),
      primaryColor: '#13B5EA',
      accentColor: '#0d8fc0',
      plan: 'starter',
      createdAt: new Date().toISOString(),
      customSections: [],
      customItems: [],
      quotes: [],
      ...data,
    };
    setAccounts(prev => [...prev, newAccount]);
    return newAccount;
  };

  const deleteAccount = (id) => {
    if (id === 'plex-master') return; // can't delete master
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (activeId === id) setActiveId('plex-master');
  };

  // Custom catalog management
  const addCustomSection = (accountId, section) => {
    const id = `sec-${Date.now()}`;
    updateAccount(accountId, {
      customSections: [...(account.customSections || []), { ...section, id }],
    });
    return id;
  };

  const updateCustomSection = (accountId, sectionId, patch) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    updateAccount(accountId, {
      customSections: acc.customSections.map(s => s.id === sectionId ? { ...s, ...patch } : s),
    });
  };

  const deleteCustomSection = (accountId, sectionId) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    updateAccount(accountId, {
      customSections: acc.customSections.filter(s => s.id !== sectionId),
      customItems: acc.customItems.filter(i => i.sectionId !== sectionId),
    });
  };

  const addCustomItem = (accountId, item) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    const newItem = { id: `item-${Date.now()}`, ...item };
    updateAccount(accountId, {
      customItems: [...(acc.customItems || []), newItem],
    });
  };

  const updateCustomItem = (accountId, itemId, patch) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    updateAccount(accountId, {
      customItems: acc.customItems.map(i => i.id === itemId ? { ...i, ...patch } : i),
    });
  };

  const deleteCustomItem = (accountId, itemId) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    updateAccount(accountId, {
      customItems: acc.customItems.filter(i => i.id !== itemId),
    });
  };

  const saveQuote = (accountId, quoteState) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    const quote = {
      id: `quote-${Date.now()}`,
      savedAt: new Date().toISOString(),
      ...quoteState,
    };
    updateAccount(accountId, {
      quotes: [quote, ...(acc.quotes || []).slice(0, 49)], // keep last 50
    });
    return quote.id;
  };

  return (
    <AccountContext.Provider value={{
      accounts,
      account,
      activeId,
      switchAccount,
      createAccount,
      updateAccount,
      deleteAccount,
      addCustomSection,
      updateCustomSection,
      deleteCustomSection,
      addCustomItem,
      updateCustomItem,
      deleteCustomItem,
      saveQuote,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}
