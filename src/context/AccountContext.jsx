import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const account = accounts.find(a => a.id === activeId) || accounts[0] || null;

  // ── Load accounts from server (authoritative source) ─────────────
  const loadAccounts = useCallback(async () => {
    setError(null);
    try {
      const list = await api.accounts.list();
      setAccounts(list);

      const saved   = localStorage.getItem('plex_active_account');
      const ownedIds = list.map(a => a.id);

      if (saved && ownedIds.includes(saved)) {
        setActiveId(saved);
      } else if (list.length > 0) {
        setActiveId(list[0].id);
        localStorage.setItem('plex_active_account', list[0].id);
      } else {
        setActiveId(null);
      }
    } catch (e) {
      // Don't wipe existing accounts on transient errors
      if (e.message?.includes('Session expired')) {
        // 401 — auth handler will show re-login modal; don't touch accounts
        console.warn('[AccountContext] Session expired, keeping existing state');
      } else {
        setError(e.message);
        console.error('[AccountContext] loadAccounts failed:', e.message);
      }
    } finally {
      setLoading(false);

    // ── Subscription redirect logic ──────────────────────────────
    const path = window.location.pathname;
    const skipPaths = ['/billing', '/onboarding', '/login', '/quotes/public', '/invoices/public'];
    const isBlockedPath = skipPaths.some(p => path.includes(p));

    if (!isBlockedPath && list.length > 0) {
      const primary = list[0];
      const status = primary?.subscription_status || 'trialing';
      const trialEnd = primary?.trial_ends_at ? new Date(primary.trial_ends_at) : null;
      const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : null;

      // Case 1: Brand new user — go to billing to pick a plan
      const isNewUser = localStorage.getItem('revanew_new_user') === '1';
      if (isNewUser) {
        localStorage.removeItem('revanew_new_user');
        // Use React router push so SPA state is preserved (no full reload)
        // Small delay ensures AccountContext state is set before navigation
        // Fire navigation event that App.jsx listens for
        window.dispatchEvent(new CustomEvent('revanew:navigate', { detail: '/billing?welcome=1' }));
        return;
      }

      // Case 2: Trialing user with ≤ 3 days left on EVERY login — show billing upsell
      // Only redirect once per session (not on every page navigation)
      const lastUpsell = localStorage.getItem('revanew_upsell_shown');
      const upsellShownThisSession = lastUpsell && (Date.now() - parseInt(lastUpsell)) < 3600000; // 1 hour
      const loginEvent = localStorage.getItem('revanew_login_event');
      const justLoggedIn = loginEvent && (Date.now() - parseInt(loginEvent)) < 30000; // within 30s of login

      if (justLoggedIn && status === 'trialing' && daysLeft !== null && daysLeft <= 3 && !upsellShownThisSession) {
        localStorage.setItem('revanew_upsell_shown', Date.now().toString());
        localStorage.removeItem('revanew_login_event');
        window.dispatchEvent(new CustomEvent('revanew:navigate', { detail: `/billing?trial_ending=1&days=${daysLeft}` }));
        return;
      }

      // Clear login event after checking
      if (justLoggedIn) localStorage.removeItem('revanew_login_event');
    }
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  // Re-load accounts when auth is restored (e.g. after session expiry + re-login)
  useEffect(() => {
    const onAuthRestore = () => {
      console.log('[AccountContext] Auth restored, reloading accounts');
      setLoading(true);
      loadAccounts();
    };
    window.addEventListener('plex:auth-restored', onAuthRestore);
    return () => window.removeEventListener('plex:auth-restored', onAuthRestore);
  }, [loadAccounts]);

  useEffect(() => {
    if (activeId) localStorage.setItem('plex_active_account', activeId);
  }, [activeId]);

  // ── Refresh a single account from server ─────────────────────────
  const refreshAccount = useCallback(async (id) => {
    const targetId = id || activeId;
    if (!targetId) return null;
    try {
      const updated = await api.accounts.get(targetId);
      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
      return updated;
    } catch (e) {
      if (!e.message?.includes('Session expired')) {
        console.error('[AccountContext] refreshAccount failed:', e.message);
      }
      return null;
    }
  }, [activeId]);

  const switchAccount = useCallback((id) => {
    setActiveId(id);
    localStorage.setItem('plex_active_account', id);
  }, []);

  // ── Create account — always re-fetch from server to guarantee consistency ──
  const createAccount = useCallback(async (data) => {
    const created = await api.accounts.create(data);
    // Re-fetch entire list so owner_id, enriched fields, etc. are all correct
    // Don't just push the local object — server is authoritative
    await loadAccounts();
    // Now find the created account in the refreshed list
    return created;
  }, [loadAccounts]);

  const updateAccount = useCallback(async (id, patch) => {
    const updated = await api.accounts.update(id, patch);
    // updated now includes customSections/customItems from server
    setAccounts(prev => prev.map(a => a.id === id
      ? { ...updated } // replace entirely with server response
      : a
    ));
    return updated;
  }, []);

  const deleteAccount = useCallback(async (id) => {
    if (id === 'plex-master') return;
    await api.accounts.delete(id);
    setAccounts(prev => {
      const remaining = prev.filter(a => a.id !== id);
      if (activeId === id && remaining.length > 0) {
        setActiveId(remaining[0].id);
        localStorage.setItem('plex_active_account', remaining[0].id);
      }
      return remaining;
    });
  }, [activeId]);

  // ── Catalog mutations — update context immediately + server ───────
  const addCustomSection = useCallback(async (accountId, section) => {
    const created = await api.accounts.addSection(accountId, section);
    setAccounts(prev => prev.map(a => a.id === accountId
      ? { ...a, customSections: [...(a.customSections || []), created] }
      : a
    ));
    return created.id;
  }, []);

  const updateCustomSection = useCallback(async (accountId, sectionId, patch) => {
    await api.accounts.updateSection(accountId, sectionId, patch);
    setAccounts(prev => prev.map(a => a.id === accountId
      ? { ...a, customSections: (a.customSections || []).map(s => s.id === sectionId ? { ...s, ...patch } : s) }
      : a
    ));
  }, []);

  const deleteCustomSection = useCallback(async (accountId, sectionId) => {
    await api.accounts.deleteSection(accountId, sectionId);
    setAccounts(prev => prev.map(a => a.id === accountId
      ? {
          ...a,
          customSections: (a.customSections || []).filter(s => s.id !== sectionId),
          customItems:    (a.customItems    || []).filter(i => i.section_id !== sectionId),
        }
      : a
    ));
  }, []);

  const addCustomItem = useCallback(async (accountId, item) => {
    const created = await api.accounts.addItem(accountId, {
      ...item,
      setup_price:   item.setup   ?? item.setup_price   ?? 0,
      monthly_price: item.monthly ?? item.monthly_price ?? 0,
    });
    setAccounts(prev => prev.map(a => a.id === accountId
      ? { ...a, customItems: [...(a.customItems || []), created] }
      : a
    ));
    return created;
  }, []);

  const updateCustomItem = useCallback(async (accountId, itemId, patch) => {
    await api.accounts.updateItem(accountId, itemId, {
      ...patch,
      setup_price:   patch.setup   ?? patch.setup_price,
      monthly_price: patch.monthly ?? patch.monthly_price,
    });
    setAccounts(prev => prev.map(a => a.id === accountId
      ? { ...a, customItems: (a.customItems || []).map(i => i.id === itemId ? { ...i, ...patch } : i) }
      : a
    ));
  }, []);

  const deleteCustomItem = useCallback(async (accountId, itemId) => {
    await api.accounts.deleteItem(accountId, itemId);
    setAccounts(prev => prev.map(a => a.id === accountId
      ? { ...a, customItems: (a.customItems || []).filter(i => i.id !== itemId) }
      : a
    ));
  }, []);

  return (
    <AccountContext.Provider value={{
      accounts, account, activeId, loading, error,
      switchAccount, createAccount, updateAccount, deleteAccount,
      addCustomSection, updateCustomSection, deleteCustomSection,
      addCustomItem, updateCustomItem, deleteCustomItem,
      refreshAccount, loadAccounts,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be inside AccountProvider');
  return ctx;
}
