import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [accounts, setAccounts]   = useState([]);
  const [activeId, setActiveId]   = useState(() => localStorage.getItem('plex_active_account') || 'plex-master');
  const [loading, setLoading]     = useState(true);

  const account = accounts.find(a => a.id === activeId) || accounts[0];

  const loadAccounts = useCallback(async () => {
    try {
      const list = await api.accounts.list();
      setAccounts(list);
    } catch (e) {
      console.error('Failed to load accounts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { localStorage.setItem('plex_active_account', activeId); }, [activeId]);

  const refreshAccount = useCallback(async (id) => {
    try {
      const updated = await api.accounts.get(id || activeId);
      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
      return updated;
    } catch (e) { console.error(e); }
  }, [activeId]);

  const switchAccount = useCallback((id) => setActiveId(id), []);

  const createAccount = useCallback(async (data) => {
    const created = await api.accounts.create(data);
    setAccounts(prev => [...prev, { ...created, customSections: [], customItems: [] }]);
    return created;
  }, []);

  const updateAccount = useCallback(async (id, patch) => {
    const updated = await api.accounts.update(id, patch);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
    return updated;
  }, []);

  const deleteAccount = useCallback(async (id) => {
    if (id === 'plex-master') return;
    await api.accounts.delete(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (activeId === id) setActiveId('plex-master');
  }, [activeId]);

  // Custom sections
  const addCustomSection = useCallback(async (accountId, section) => {
    const created = await api.accounts.addSection(accountId, section);
    setAccounts(prev => prev.map(a => a.id === accountId
      ? { ...a, customSections: [...(a.customSections || []), { ...created, id: created.id }] }
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
      ? { ...a,
          customSections: (a.customSections || []).filter(s => s.id !== sectionId),
          customItems: (a.customItems || []).filter(i => i.section_id !== sectionId) }
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
      accounts, account, activeId, loading,
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
