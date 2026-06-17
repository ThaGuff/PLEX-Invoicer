import React, { useState } from 'react';
import { ChevronDown, Plus, Settings, Check, Trash2, Lock } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { canUseFeature, getUpgradeMessage } from '../utils/planFeatures';

// Small inline crown+document mark — matches the icon used throughout the
// app (sidebar logo, login page, public quote/invoice pages). Avoids the
// broken <img src='/logo-invoiceking.png' alt='R' .../> reference this
// component previously had, which also pointed at the wrong/legacy file.
function IKMark({ size = 22 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#0A0F13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size * 0.7} height={size * 0.88} viewBox="0 0 80 100" fill="none">
        <rect x="2" y="36" width="76" height="8" rx="2" fill="#C6E404"/>
        <polygon points="12,18 22,36 2,36" fill="#C6E404"/>
        <polygon points="68,18 78,36 58,36" fill="#C6E404"/>
        <rect x="28" y="22" width="24" height="14" fill="#C6E404"/>
        <polygon points="22,36 28,30 25,36" fill="#0A0F13"/>
        <polygon points="52,36 58,30 55,36" fill="#0A0F13"/>
        <polygon points="40,7 47,15 40,23 33,15" fill="#C6E404"/>
        <polygon points="40,11 44,15 40,19 36,15" fill="#A8C200"/>
        <path d="M4,44 L4,92 Q4,96 8,96 L56,96 Q60,96 60,92 L60,58 L46,44 Z" fill="white"/>
        <polygon points="46,44 60,58 46,58" fill="#C6E404"/>
        <rect x="14" y="68" width="20" height="3.5" rx="1.5" fill="#0A0F13"/>
        <rect x="14" y="82" width="18" height="3.5" rx="1.5" fill="#C6E404"/>
      </svg>
    </div>
  );
}

export default function AccountSwitcher({
  onOpenSettings = () => window.dispatchEvent(new CustomEvent('invoiceking:settings')),
  onNewAccount   = () => window.dispatchEvent(new CustomEvent('invoiceking:newaccount')),
  variant = 'default', // 'default' (uses theme CSS vars) | 'sidebar' (fixed dark bg, explicit colors)
}) {
  const { accounts, account, switchAccount, deleteAccount } = useAccount();
  const [open, setOpen] = useState(false);

  // Multiple accounts are an Agency-tier feature (PLAN_LIMITS.accounts: -1
  // unlimited on agency; starter and pro are both limited to 1 — "own
  // account only"). This switcher itself is always safe to show (a
  // Starter/Pro user with exactly one account just sees that one account
  // with no add option), but the "Add account" action must be gated.
  const canAddAccounts = canUseFeature(account?.plan, 'accounts') || (accounts?.length || 0) < 1;
  const hasMultipleAccounts = (accounts?.length || 0) > 1;

  const handleAddAccountClick = () => {
    setOpen(false);
    if (!canAddAccounts) {
      alert(getUpgradeMessage('accounts'));
      return;
    }
    onNewAccount?.();
  };

  const isSidebar = variant === 'sidebar';

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button — explicit colors on the sidebar variant since the
          dark sidebar's background is fixed regardless of the app's own
          light/dark mode toggle, so the ambient --bg-raised/--border/
          --text-primary tokens can't be relied on here. */}
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10,
          border: `1px solid ${isSidebar ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
          background: isSidebar ? 'rgba(255,255,255,0.04)' : 'var(--bg-raised)',
          cursor: 'pointer', fontFamily: "'Inter',sans-serif", transition: 'all 0.15s', width: isSidebar ? '100%' : 'auto',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#C6E404'}
        onMouseLeave={e => e.currentTarget.style.borderColor = isSidebar ? 'rgba(255,255,255,0.1)' : 'var(--border)'}>
        <IKMark size={22} />
        <span style={{ fontSize: 13, fontWeight: 600, color: isSidebar ? 'rgba(255,255,255,0.85)' : 'var(--text-primary)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account?.name}</span>
        {hasMultipleAccounts && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#5A6800', background: 'rgba(198,228,4,0.18)', borderRadius: 100, padding: '1px 6px', flexShrink: 0 }}>
            {accounts.length}
          </span>
        )}
        <ChevronDown size={13} style={{ color: isSidebar ? 'rgba(255,255,255,0.45)' : 'var(--text-muted)', flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 280, zIndex: 200, overflow: 'hidden',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 24px 64px rgba(11,18,32,0.18), 0 6px 20px rgba(11,18,32,0.1)',
          }}>
            {/* Header */}
            <div style={{ padding: '10px 14px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.9px' }}>Accounts</p>
              {!canAddAccounts && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#5A6800', background: 'rgba(198,228,4,0.18)', borderRadius: 100, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Lock size={9} /> Agency feature
                </span>
              )}
            </div>

            {/* Account list */}
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {accounts.map(acc => (
                <button key={acc.id}
                  onClick={() => { switchAccount(acc.id); setOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s', fontFamily: "'Inter',sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <IKMark size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{acc.website || acc.email || ''}</p>
                  </div>
                  {acc.id === account?.id && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#0A0F13', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color="#C6E404" />
                    </div>
                  )}
                  {acc.id !== 'plex-master' && acc.id !== account?.id && (
                    <button onClick={e => { e.stopPropagation(); if (confirm(`Remove "${acc.name}" and all of its data? This cannot be undone.`)) deleteAccount(acc.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 4, transition: 'color 0.12s', flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </button>
              ))}
            </div>

            {/* Footer actions */}
            <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={handleAddAccountClick}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, color: canAddAccounts ? '#5A6800' : 'var(--text-muted)', transition: 'background 0.12s', fontFamily: "'Inter',sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(198,228,4,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px dashed ${canAddAccounts ? '#C6E404' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {canAddAccounts ? <Plus size={12} style={{ color: '#5A6800' }} /> : <Lock size={11} style={{ color: 'var(--text-muted)' }} />}
                </div>
                {canAddAccounts ? 'Add account' : 'Add account — Agency plan'}
              </button>
              <button onClick={() => { setOpen(false); onOpenSettings(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', transition: 'background 0.12s', fontFamily: "'Inter',sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                Account settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
