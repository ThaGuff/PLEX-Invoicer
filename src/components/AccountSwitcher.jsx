import React, { useState } from 'react';
import { ChevronDown, Plus, Settings, Check, LogOut, Trash2 } from 'lucide-react';
import { useAccount } from '../context/AccountContext';

export default function AccountSwitcher({ onOpenSettings, onNewAccount }) {
  const { accounts, account, switchAccount, deleteAccount } = useAccount();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm transition-colors hover:bg-gray-50"
        style={{ borderColor: '#E5E8EB' }}
      >
        {/* Account badge */}
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: account?.primaryColor || '#13B5EA' }}
        >
          {(account?.logoInitial || account?.name?.[0] || 'A').toUpperCase()}
        </div>
        <span className="font-medium text-ink max-w-[120px] truncate">{account?.name}</span>
        <ChevronDown size={13} className="text-ink-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 w-64 bg-white border rounded-xl shadow-lg z-50 overflow-hidden"
            style={{ borderColor: '#E5E8EB' }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: '#F0F3F5' }}>
              <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Accounts</p>
            </div>

            <div className="max-h-52 overflow-y-auto">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => { switchAccount(acc.id); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: acc.primaryColor || '#13B5EA' }}
                  >
                    {(acc.logoInitial || acc.name?.[0] || 'A').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{acc.name}</p>
                    <p className="text-xs text-ink-muted truncate">{acc.website || acc.email || ''}</p>
                  </div>
                  {acc.id === account?.id && <Check size={13} style={{ color: '#13B5EA' }} />}
                  {acc.id !== 'plex-master' && acc.id !== account?.id && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteAccount(acc.id); }}
                      className="ml-auto text-gray-300 hover:text-red-400 transition-colors p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t" style={{ borderColor: '#F0F3F5' }}>
              <button
                onClick={() => { setOpen(false); onNewAccount(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm font-medium"
                style={{ color: '#13B5EA' }}
              >
                <Plus size={14} />
                Add account
              </button>
              <button
                onClick={() => { setOpen(false); onOpenSettings(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm text-ink-muted"
              >
                <Settings size={14} />
                Account settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
