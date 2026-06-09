import React, { useState } from 'react';
import { ChevronDown, Plus, Settings, Check, Trash2 } from 'lucide-react';
import { useAccount } from '../context/AccountContext';

export default function AccountSwitcher({ onOpenSettings, onNewAccount }) {
  const { accounts, account, switchAccount, deleteAccount } = useAccount();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position:'relative' }}>
      {/* Trigger button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', fontFamily:"'Inter',sans-serif", transition:'all 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor='var(--blue)'}
        onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
        <div style={{ width:22, height:22, borderRadius:6, overflow:'hidden', flexShrink:0, background:'#1A1A1A' }>
          <img src='/logo-invoiceking.png' alt='R' style={width:22,height:22,objectFit:'cover'}/>
        </div>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{account?.name}</span>
        <ChevronDown size={13} style={{ color:'var(--text-muted)', flexShrink:0 }} />
      </button>

      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:199 }} onClick={() => setOpen(false)} />
          <div style={{
            position:'absolute', right:0, top:'calc(100% + 8px)',
            width:264, zIndex:200, overflow:'hidden',
            background:'var(--bg-surface)',
            border:'1px solid var(--border)',
            borderRadius:14,
            boxShadow:'0 24px 64px rgba(11,18,32,0.18), 0 6px 20px rgba(11,18,32,0.1)',
          }}>
            {/* Header */}
            <div style={{ padding:'10px 14px', background:'var(--bg-raised)', borderBottom:'1px solid var(--border-subtle)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.9px' }}>Accounts</p>
            </div>

            {/* Account list */}
            <div style={{ maxHeight:220, overflowY:'auto' }}>
              {accounts.map(acc => (
                <button key={acc.id}
                  onClick={() => { switchAccount(acc.id); setOpen(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.12s', fontFamily:"'Inter',sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-page)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width:28, height:28, borderRadius:8, overflow:'hidden', flexShrink:0, background:'#1A1A1A' }>
                    <img src='/logo-invoiceking.png' alt='R' style={width:28,height:28,objectFit:'cover'}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.name}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{acc.website||acc.email||''}</p>
                  </div>
                  {acc.id === account?.id && (
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'#1A1A1A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Check size={10} color="#fff" />
                    </div>
                  )}
                  {acc.id !== 'plex-master' && acc.id !== account?.id && (
                    <button onClick={e => { e.stopPropagation(); deleteAccount(acc.id); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, borderRadius:4, transition:'color 0.12s', flexShrink:0 }}
                      onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </button>
              ))}
            </div>

            {/* Footer actions */}
            <div style={{ borderTop:'1px solid var(--border-subtle)' }}>
              <button onClick={() => { setOpen(false); onNewAccount(); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontSize:13, fontWeight:600, color:'var(--blue)', transition:'background 0.12s', fontFamily:"'Inter',sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(59,111,232,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{ width:22, height:22, borderRadius:6, border:'1.5px dashed var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Plus size={12} style={{ color:'var(--blue)' }} />
                </div>
                Add account
              </button>
              <button onClick={() => { setOpen(false); onOpenSettings(); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontSize:13, fontWeight:500, color:'var(--text-secondary)', transition:'background 0.12s', fontFamily:"'Inter',sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-page)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <Settings size={14} style={{ color:'var(--text-muted)' }} />
                Account settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
