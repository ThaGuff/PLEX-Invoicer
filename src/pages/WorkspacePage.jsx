/**
 * Slack-style Team Workspace — channels, messages, permissions
 * Mobile-first: channel list → message thread, tap to reply
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { useAuth } from '../context/AuthContext';
import { Hash, Plus, Send, Lock, ChevronLeft, Users, X } from 'lucide-react';

function timeAgo(s) {
  if (!s) return '';
  const diff = (Date.now() - new Date(s)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

const DEFAULT_CHANNELS = [
  { id:'general',     name:'general',     private:false, desc:'Company-wide updates' },
  { id:'jobs',        name:'jobs',         private:false, desc:'Job assignments and updates' },
  { id:'invoicing',   name:'invoicing',    private:false, desc:'Payment and billing discussions' },
  { id:'leadership',  name:'leadership',   private:true,  desc:'Management only' },
];

export default function WorkspacePage() {
  const { account } = useAccount();
  const { user }    = useAuth();
  const [channels,  setChannels]  = useState(DEFAULT_CHANNELS);
  const [active,    setActive]    = useState('general');
  const [messages,  setMessages]  = useState({});
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [newCh,     setNewCh]     = useState({ name:'', private:false });
  const [showList,  setShowList]  = useState(true);
  const bottomRef = useRef();
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;

  const loadMessages = useCallback(async (channelId) => {
    try {
      const res = await fetch(`/api/workspace/channels/${channelId}/messages?account_id=${account?.id}`, { headers:{ Authorization:`Bearer ${token}` } });
      if (res.ok) { const msgs = await res.json(); setMessages(m => ({ ...m, [channelId]: msgs })); }
    } catch {}
  }, [account?.id]);

  useEffect(() => { if (account?.id && active) loadMessages(active); }, [active, account?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages[active]]);

  const send = async () => {
    if (!text.trim()) return;
    const optimistic = { id: Date.now(), content:text, sender_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You', created_at: new Date().toISOString(), pending:true };
    setMessages(m => ({ ...m, [active]: [...(m[active]||[]), optimistic] }));
    setText('');
    try {
      const res = await fetch(`/api/workspace/channels/${active}/messages`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ content:text, account_id:account?.id, sender_name: optimistic.sender_name }) });
      if (res.ok) { const msg = await res.json(); setMessages(m => ({ ...m, [active]: [...(m[active]||[]).filter(x => x.id !== optimistic.id), msg] })); }
    } catch {}
  };

  const ch = channels.find(c => c.id === active);
  const msgs = messages[active] || [];

  return (
    <div style={{ maxWidth:900, margin:'0 auto', height:'calc(100dvh - 130px)', display:'flex', overflow:'hidden', borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)' }}>

      {/* Channel sidebar */}
      <div style={{ width: showList ? '100%' : 0, maxWidth:240, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', transition:'all 0.2s', background:'var(--bg-raised)' }}
        className={showList ? '' : 'md:block'}>
        <div style={{ padding:'14px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>Workspace</p>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>{account?.name}</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-surface)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
            <Plus size={14}/>
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 6px' }}>
          {channels.map(c => (
            <button key={c.id} onClick={() => { setActive(c.id); setShowList(false); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 10px', borderRadius:9, border:'none', cursor:'pointer', textAlign:'left', background: active===c.id ? 'rgba(37,99,235,0.12)' : 'transparent', transition:'background 0.12s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              {c.private ? <Lock size={13} style={{ color: active===c.id?'#2563EB':'var(--text-muted)', flexShrink:0 }}/> : <Hash size={13} style={{ color: active===c.id?'#2563EB':'var(--text-muted)', flexShrink:0 }}/>}
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight: active===c.id?700:500, color: active===c.id?'var(--text-primary)':'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
              </div>
              {messages[c.id]?.length > 0 && <span style={{ fontSize:10, fontWeight:700, marginLeft:'auto', color:active===c.id?'#2563EB':'var(--text-muted)', flexShrink:0 }}>{messages[c.id].length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, display: !showList ? 'flex' : 'none' }} className="md:flex">
        {/* Channel header */}
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, background:'var(--bg-surface)' }}>
          <button onClick={() => setShowList(true)} className="md:hidden" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex', alignItems:'center' }}>
            <ChevronLeft size={20}/>
          </button>
          {ch?.private ? <Lock size={15} style={{ color:'var(--text-muted)', flexShrink:0 }}/> : <Hash size={15} style={{ color:'var(--text-muted)', flexShrink:0 }}/>}
          <div style={{ flex:1 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{ch?.name}</p>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>{ch?.desc}</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:12 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text-muted)' }}>
              <Hash size={32} style={{ margin:'0 auto 12px', opacity:0.4 }}/>
              <p style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>Welcome to #{ch?.name}</p>
              <p style={{ fontSize:12 }}>This is the start of the channel. Send a message to get started.</p>
            </div>
          )}
          {msgs.map(msg => (
            <div key={msg.id} style={{ display:'flex', gap:10, opacity: msg.pending ? 0.6 : 1 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#2563EB,#0D9488)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:800, flexShrink:0 }}>
                {(msg.sender_name?.[0]||'?').toUpperCase()}
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{msg.sender_name||'Team member'}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{timeAgo(msg.created_at)}</span>
                </div>
                <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>

        {/* Message input */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'var(--bg-raised)', borderRadius:12, border:'1px solid var(--border)', padding:'8px 12px' }}>
            <textarea value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Message #${ch?.name}`}
              rows={1}
              style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text-primary)', fontSize:13, resize:'none', fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.5, maxHeight:120 }} />
            <button onClick={send} disabled={!text.trim()}
              style={{ width:34, height:34, borderRadius:9, background: text.trim()?'linear-gradient(135deg,#2563EB,#0D9488)':'var(--bg-surface)', border:`1px solid ${text.trim()?'transparent':'var(--border)'}`, cursor: text.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
              <Send size={14} color={text.trim()?'#fff':'var(--text-muted)'}/>
            </button>
          </div>
        </div>
      </div>

      {/* New channel modal */}
      {showNew && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.5)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'flex-end', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <div style={{ background:'var(--bg-surface)', borderRadius:'20px 20px 0 0', padding:'20px 16px', width:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>New channel</h2>
              <button onClick={() => setShowNew(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={20}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Channel name</label>
                <input value={newCh.name} onChange={e => setNewCh(n => ({...n,name:e.target.value.toLowerCase().replace(/\s/g,'-')}))} placeholder="e.g. project-alpha" className="field" style={{ fontSize:14 }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--bg-raised)', borderRadius:10, border:'1px solid var(--border)', cursor:'pointer' }}
                onClick={() => setNewCh(n => ({...n,private:!n.private}))}>
                <Lock size={16} style={{ color:newCh.private?'#7C3AED':'var(--text-muted)' }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Private channel</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>Only invited members can see this channel</p>
                </div>
                <div style={{ width:44, height:24, borderRadius:12, background:newCh.private?'#7C3AED':'var(--border)', position:'relative', transition:'background 0.15s' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:newCh.private?22:2, transition:'left 0.15s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}/>
                </div>
              </div>
              <button disabled={!newCh.name} onClick={() => { setChannels(c => [...c, { id:newCh.name, name:newCh.name, private:newCh.private, desc:'' }]); setActive(newCh.name); setShowNew(false); setNewCh({name:'',private:false}); setShowList(false); }}
                style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:800, cursor:'pointer', opacity:!newCh.name?0.5:1 }}>
                Create channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
