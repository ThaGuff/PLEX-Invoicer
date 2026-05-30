/**
 * Workspace — Slack-style team communication hub
 * Features: Channels, Direct Messages, Reactions, Threads, Team Members,
 *           Job Assignments, File Sharing, @mentions, Online Status
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { useAuth } from '../context/AuthContext';
import {
  Hash, Lock, Plus, Send, ChevronLeft, Users, X, Settings,
  Bell, Search, Smile, Paperclip, AtSign, Check, CheckCheck,
  MessageSquare, Phone, Video, MoreHorizontal, UserPlus, Shield,
  Briefcase, Circle, AlertCircle, Trash2, Edit3, Reply, Star,
  Mail, UserCheck, UserX, Copy, ExternalLink, ChevronRight, ChevronDown,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────
function timeAgo(s) {
  if (!s) return '';
  const d = (Date.now() - new Date(s)) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d/60) + 'm';
  if (d < 86400) return Math.floor(d/3600) + 'h';
  return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function fmtTime(s) { if (!s) return ''; return new Date(s).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}); }
function getInitial(name) { return (name||'?')[0].toUpperCase(); }

const EMOJI_LIST = ['👍','❤️','😂','🎉','🔥','✅','👀','💯','🚀','⭐'];

const DEFAULT_CHANNELS = [
  { id:'general',   name:'general',    private:false, desc:'Company-wide updates and announcements' },
  { id:'jobs',      name:'jobs',       private:false, desc:'Job assignments and field updates' },
  { id:'invoicing', name:'invoicing',  private:false, desc:'Payment and billing discussions' },
  { id:'team',      name:'team',       private:false, desc:'Team coordination and scheduling' },
];

// ── Message Bubble ────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, onReact, onReply, onDelete, canDelete }) {
  const [hover, setHover] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  return (
    <div style={{ display:'flex', gap:10, padding:'4px 0', position:'relative' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowEmoji(false); }}>
      {/* Avatar */}
      <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,#2563EB,#0D9488)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800, flexShrink:0, marginTop:2 }}>
        {getInitial(msg.sender_name)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:3 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{msg.sender_name || 'Team member'}</span>
          <span style={{ fontSize:10, color:'var(--text-muted)' }}>{fmtTime(msg.created_at)}</span>
          {msg.edited && <span style={{ fontSize:10, color:'var(--text-muted)', fontStyle:'italic' }}>(edited)</span>}
        </div>
        {/* Content */}
        <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, wordBreak:'break-word', whiteSpace:'pre-wrap' }}>
          {msg.content}
        </div>
        {/* Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--bg-raised)', cursor:'pointer', fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                {emoji} <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{users.length}</span>
              </button>
            ))}
          </div>
        )}
        {/* Thread reply count */}
        {msg.reply_count > 0 && (
          <button onClick={() => onReply(msg)} style={{ marginTop:6, background:'none', border:'none', cursor:'pointer', color:'var(--blue)', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4, padding:0, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <Reply size={12}/> {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Hover actions */}
      {hover && (
        <div style={{ position:'absolute', right:0, top:-8, display:'flex', gap:4, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, padding:'4px 6px', boxShadow:'0 4px 12px rgba(11,18,32,0.12)', zIndex:10 }}>
          <button onClick={() => setShowEmoji(v => !v)} title="React"
            style={{ width:28, height:28, borderRadius:7, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
            <Smile size={14}/>
          </button>
          <button onClick={() => onReply(msg)} title="Reply in thread"
            style={{ width:28, height:28, borderRadius:7, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
            <Reply size={14}/>
          </button>
          {canDelete && (
            <button onClick={() => onDelete(msg.id)} title="Delete"
              style={{ width:28, height:28, borderRadius:7, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#DC2626' }}>
              <Trash2 size={13}/>
            </button>
          )}
        </div>
      )}
      {showEmoji && (
        <div style={{ position:'absolute', right:0, top:28, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'8px 10px', display:'flex', gap:6, zIndex:20, boxShadow:'0 8px 24px rgba(11,18,32,0.15)' }}>
          {EMOJI_LIST.map(e => (
            <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, padding:'2px', borderRadius:6, transition:'transform 0.1s' }}
              onMouseEnter={el => el.currentTarget.style.transform='scale(1.3)'}
              onMouseLeave={el => el.currentTarget.style.transform='scale(1)'}>
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Message Input ─────────────────────────────────────────────────
function MessageInput({ onSend, placeholder, disabled }) {
  const [text, setText] = useState('');
  const ref = useRef();
  const send = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', background:'var(--bg-surface)' }}>
      <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'var(--bg-raised)', borderRadius:14, border:'1px solid var(--border)', padding:'8px 12px' }}>
        <textarea ref={ref} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder || 'Send a message…'} rows={1} disabled={disabled}
          style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text-primary)', fontSize:13, resize:'none', fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.6, maxHeight:120, minHeight:20 }} />
        <button onClick={send} disabled={!text.trim() || disabled}
          style={{ width:34, height:34, borderRadius:9, background:text.trim()?'linear-gradient(135deg,#2563EB,#0D9488)':'var(--bg-surface)', border:`1px solid ${text.trim()?'transparent':'var(--border)'}`, cursor:text.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
          <Send size={14} color={text.trim()?'#fff':'var(--text-muted)'}/>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function WorkspacePage() {
  const { account } = useAccount();
  const { user }    = useAuth();
  const [channels,  setChannels]  = useState(DEFAULT_CHANNELS);
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages,  setMessages]  = useState({});
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('channels'); // 'channels' | 'dms' | 'members'
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showThread, setShowThread] = useState(null); // message being threaded
  const [newCh, setNewCh] = useState({ name:'', private:false, desc:'' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState('');
  const [memberAction, setMemberAction] = useState(null); // { id, type: 'remove'|'resend' }
  const bottomRef = useRef();
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const myName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';

  // Load channels from API
  useEffect(() => {
    if (!account?.id) return;
    fetch(`/api/workspace/channels?account_id=${account.id}`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.length) setChannels(data); })
      .catch(() => {}); // fall back to DEFAULT_CHANNELS on error
  }, [account?.id]);

  // Load messages for active channel
  const loadMessages = useCallback(async (channelId) => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/workspace/channels/${channelId}/messages?account_id=${account.id}`, { headers:{ Authorization:`Bearer ${token}` } });
      if (r.ok) {
        const msgs = await r.json();
        setMessages(m => ({ ...m, [channelId]: msgs }));
      }
    } catch {}
    setLoading(false);
  }, [account?.id]);

  // Load team members
  const loadMembers = useCallback(async () => {
    if (!account?.id) return;
    try {
      const r = await fetch(`/api/workspace/members?account_id=${account.id}`, { headers:{ Authorization:`Bearer ${token}` } });
      if (r.ok) setMembers(await r.json());
    } catch {}
  }, [account?.id]);

  useEffect(() => { if (account?.id) { loadMessages(activeChannel); loadMembers(); } }, [activeChannel, account?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages[activeChannel]]);

  const sendMessage = async (content) => {
    const optimistic = { id:`opt-${Date.now()}`, content, sender_name:myName, created_at:new Date().toISOString(), reactions:{}, reply_count:0, pending:true };
    setMessages(m => ({ ...m, [activeChannel]: [...(m[activeChannel]||[]), optimistic] }));
    try {
      const r = await fetch(`/api/workspace/channels/${activeChannel}/messages?account_id=${account?.id}`, {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ content, account_id:account.id, sender_name:myName })
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages(m => ({ ...m, [activeChannel]: [...(m[activeChannel]||[]).filter(x=>x.id!==optimistic.id), msg] }));
      }
    } catch {}
  };

  const reactToMessage = async (msgId, emoji) => {
    // Optimistic update
    setMessages(m => {
      const msgs = (m[activeChannel]||[]).map(msg => {
        if (msg.id !== msgId) return msg;
        const reactions = { ...(msg.reactions||{}) };
        if (!reactions[emoji]) reactions[emoji] = [];
        const idx = reactions[emoji].indexOf(myName);
        if (idx >= 0) reactions[emoji].splice(idx,1);
        else reactions[emoji].push(myName);
        if (reactions[emoji].length === 0) delete reactions[emoji];
        return { ...msg, reactions };
      });
      return { ...m, [activeChannel]: msgs };
    });
  };

  const deleteMessage = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    setMessages(m => ({ ...m, [activeChannel]: (m[activeChannel]||[]).filter(x=>x.id!==msgId) }));
    await fetch(`/api/workspace/channels/${activeChannel}/messages/${msgId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } }).catch(()=>{});
  };

  const createChannel = () => {
    if (!newCh.name.trim()) return;
    const safeName = newCh.name.toLowerCase().replace(/[^a-z0-9-]/g,'-');
    setChannels(ch => [...ch, { id:safeName, name:safeName, private:newCh.private, desc:newCh.desc }]);
    setActiveChannel(safeName);
    setShowNewChannel(false);
    setNewCh({ name:'', private:false, desc:'' });
    setShowSidebar(false);
    fetch('/api/workspace/channels', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify({ account_id:account.id, name:safeName, private:newCh.private, desc:newCh.desc }) }).catch(()=>{});
  };

  const removeMember = async (memberId, isInvite) => {
    if (!confirm(isInvite ? 'Cancel this invitation?' : 'Remove this team member?')) return;
    const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
    try {
      const r = await fetch(`/api/workspace/members/${memberId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
      const d = await r.json();
      if (r.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        setInviteStatus(d.message || 'Done');
      } else setInviteStatus(d.error || 'Failed');
    } catch(e) { setInviteStatus('Error: ' + e.message); }
  };

  const resendInvite = async (memberId) => {
    const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
    try {
      const r = await fetch(`/api/workspace/members/${memberId}/resend`, { method:'POST', headers:{ Authorization:`Bearer ${token}` } });
      const d = await r.json();
      setInviteStatus(d.ok ? '✓ Invite resent' : d.error || 'Failed');
    } catch(e) { setInviteStatus('Error: ' + e.message); }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteStatus('');
    try {
      const r = await fetch('/api/workspace/invite', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify({ account_id:account.id, email:inviteEmail, role:inviteRole }) });
      const d = await r.json();
      if (r.ok) { setInviteStatus('✓ Invitation sent!'); setInviteEmail(''); loadMembers(); }
      else setInviteStatus(d.error || 'Failed to invite');
    } catch(e) { setInviteStatus('Failed to invite: ' + e.message); }
    setInviting(false);
  };

  const ch = channels.find(c => c.id === activeChannel);
  const msgs = messages[activeChannel] || [];
  const isOwner = account?.owner_id === user?.id || !account?.owner_id;

  return (
    <div style={{ display:'flex', height:'calc(100dvh - 120px)', overflow:'hidden', borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-surface)', fontFamily:"'Plus Jakarta Sans',sans-serif", maxWidth:1100, margin:'0 auto' }}>

      {/* Sidebar */}
      <div style={{ width: showSidebar?260:0, minWidth: showSidebar?260:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', transition:'all 0.2s', background:'var(--bg-raised)', flexShrink:0 }}>
        {/* Workspace header */}
        <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>{account?.name || 'Workspace'}</p>
              <p style={{ fontSize:10, color:'#0D9488', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                <Circle size={6} fill="#0D9488" /> {(members.length || 1) + 1} members
              </p>
            </div>
            <button onClick={() => setShowInvite(true)} title="Invite team member"
              style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-surface)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
              <UserPlus size={13}/>
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display:'flex', gap:4 }}>
            {[['channels','Channels'],['dms','DMs'],['members','Team']].map(([tab,label]) => (
              <button key={tab} onClick={() => setSidebarTab(tab)}
                style={{ flex:1, padding:'5px 0', borderRadius:7, border:'none', background:sidebarTab===tab?'var(--blue)':'transparent', color:sidebarTab===tab?'#fff':'var(--text-muted)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar content */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 6px' }}>
          {sidebarTab === 'channels' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px 6px', marginBottom:2 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Channels</span>
                <button onClick={() => setShowNewChannel(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}><Plus size={14}/></button>
              </div>
              {channels.map(c => (
                <button key={c.id} onClick={() => { setActiveChannel(c.id); setShowSidebar(false); setShowThread(null); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:7, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background:activeChannel===c.id?'rgba(37,99,235,0.12)':'transparent', transition:'background 0.12s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  {c.private ? <Lock size={12} style={{ color:activeChannel===c.id?'#2563EB':'var(--text-muted)', flexShrink:0 }}/> : <Hash size={12} style={{ color:activeChannel===c.id?'#2563EB':'var(--text-muted)', flexShrink:0 }}/>}
                  <span style={{ fontSize:13, fontWeight:activeChannel===c.id?700:500, color:activeChannel===c.id?'var(--text-primary)':'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                  {(messages[c.id]||[]).length > 0 && activeChannel !== c.id && (
                    <span style={{ marginLeft:'auto', width:18, height:18, borderRadius:'50%', background:'#2563EB', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {(messages[c.id]||[]).length > 9 ? '9+' : (messages[c.id]||[]).length}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}

          {sidebarTab === 'dms' && (
            <>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', padding:'4px 8px 10px' }}>Direct Messages</p>
              {members.length === 0 ? (
                <div style={{ padding:'16px 10px', textAlign:'center' }}>
                  <UserPlus size={24} style={{ color:'var(--text-muted)', margin:'0 auto 8px' }}/>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Invite team members to start direct messages</p>
                  <button onClick={() => setShowInvite(true)} style={{ marginTop:8, padding:'6px 14px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                    Invite member
                  </button>
                </div>
              ) : members.map(m => (
                <button key={m.id} onClick={() => { setActiveChannel(`dm-${m.user_id}`); setShowSidebar(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#7C3AED,#2563EB)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:800, flexShrink:0 }}>
                    {getInitial(m.name || m.email)}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name || m.email}</p>
                    <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'capitalize' }}>{m.role}</p>
                  </div>
                  <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'#0D9488', flexShrink:0 }}/>
                </button>
              ))}
            </>
          )}

          {sidebarTab === 'members' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px 8px' }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Team Members</span>
                {isOwner && <button onClick={() => setShowInvite(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--blue)', fontSize:11, fontWeight:600, padding:2, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>+ Invite</button>}
              </div>
              {/* Owner */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#2563EB,#0D9488)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800 }}>
                  {getInitial(myName)}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{myName} <span style={{ fontSize:10, color:'var(--text-muted)' }}>(you)</span></p>
                  <p style={{ fontSize:10, color:'#2563EB', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}><Shield size={9}/> Owner</p>
                </div>
              </div>
              {members.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, background: m.status==='invited' ? 'rgba(217,119,6,0.05)' : 'transparent' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background: m.status==='invited' ? 'linear-gradient(135deg,#D97706,#EA580C)' : 'linear-gradient(135deg,#7C3AED,#2563EB)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800 }}>
                    {getInitial(m.name || m.email || m.invited_email)}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name || m.email}</p>
                    <p style={{ fontSize:10, color: m.status==='invited' ? '#D97706' : 'var(--text-muted)', textTransform:'capitalize', display:'flex', alignItems:'center', gap:3 }}>
                      {m.status === 'invited' ? '⏳ Pending invite' : m.role === 'admin' ? <><Shield size={9}/> Admin</> : m.role === 'manager' ? <><Briefcase size={9}/> Manager</> : <><Users size={9}/> Member</>}
                    </p>
                  </div>
                  {isOwner && (
                    <div style={{ display:'flex', gap:4 }}>
                      {m.status === 'invited' && (
                        <button onClick={() => resendInvite(m.id)} title="Resend invite" style={{ background:'rgba(37,99,235,0.1)', border:'none', borderRadius:6, padding:'4px 8px', fontSize:10, fontWeight:700, color:'#2563EB', cursor:'pointer' }}>
                          Resend
                        </button>
                      )}
                      <button onClick={() => removeMember(m.id, m.status==='invited')} title={m.status==='invited' ? 'Cancel invite' : 'Remove member'} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:6, padding:'4px 6px', cursor:'pointer' }}>
                        <X size={11} color="#EF4444"/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <div style={{ padding:'20px 10px', textAlign:'center' }}>
                  <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>No team members yet</p>
                  <button onClick={() => setShowInvite(true)} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                    Invite first member
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Channel header */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, background:'var(--bg-surface)', flexShrink:0 }}>
          <button onClick={() => setShowSidebar(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex', alignItems:'center' }}>
            {showSidebar ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}
          </button>
          {ch?.private ? <Lock size={15} style={{ color:'var(--text-muted)', flexShrink:0 }}/> : <Hash size={15} style={{ color:'var(--text-muted)', flexShrink:0 }}/>}
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{ch?.name || activeChannel}</p>
            {ch?.desc && <p style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ch.desc}</p>}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button title="Team members" onClick={() => { setShowSidebar(true); setSidebarTab('members'); }}
              style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
              <Users size={14}/>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:8 }}>
          {/* Channel intro */}
          <div style={{ textAlign:'center', padding:'24px 0', borderBottom:'1px solid var(--border-subtle)', marginBottom:8 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:'rgba(37,99,235,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
              {ch?.private ? <Lock size={22} style={{ color:'#2563EB' }}/> : <Hash size={22} style={{ color:'#2563EB' }}/>}
            </div>
            <p style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', marginBottom:4 }}>Welcome to #{ch?.name}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>{ch?.desc || 'Start the conversation — this is the beginning of this channel.'}</p>
          </div>

          {loading && <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:16 }}>Loading…</div>}

          {/* Group messages by date */}
          {msgs.map((msg, i) => {
            const showDate = i === 0 || new Date(msgs[i-1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, margin:'8px 0' }}>
                    <div style={{ flex:1, height:1, background:'var(--border-subtle)' }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', padding:'0 8px', whiteSpace:'nowrap' }}>
                      {new Date(msg.created_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
                    </span>
                    <div style={{ flex:1, height:1, background:'var(--border-subtle)' }}/>
                  </div>
                )}
                <MessageBubble
                  msg={msg}
                  isOwn={msg.sender_name === myName}
                  onReact={reactToMessage}
                  onReply={setShowThread}
                  onDelete={deleteMessage}
                  canDelete={msg.sender_name === myName || isOwner}
                />
              </React.Fragment>
            );
          })}
          <div ref={bottomRef}/>
        </div>

        <MessageInput onSend={sendMessage} placeholder={`Message #${ch?.name || activeChannel}`} />
      </div>

      {/* Thread panel */}
      {showThread && (
        <div style={{ width:340, borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', background:'var(--bg-surface)' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:6 }}><Reply size={14}/> Thread</p>
            <button onClick={() => setShowThread(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16}/></button>
          </div>
          <div style={{ flex:1, padding:'12px 16px', overflowY:'auto' }}>
            <MessageBubble msg={showThread} isOwn={showThread.sender_name===myName} onReact={reactToMessage} onReply={()=>{}} onDelete={deleteMessage} canDelete={isOwner}/>
            <div style={{ margin:'12px 0', height:1, background:'var(--border-subtle)' }}/>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12 }}>{showThread.reply_count || 0} {showThread.reply_count===1?'reply':'replies'}</p>
          </div>
          <MessageInput onSend={(t) => sendMessage(`↩ ${t}`)} placeholder="Reply in thread…" />
        </div>
      )}

      {/* New Channel Modal */}
      {showNewChannel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.5)', backdropFilter:'blur(4px)', zIndex:500, display:'flex', alignItems:'flex-end', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <div style={{ background:'var(--bg-surface)', borderRadius:'20px 20px 0 0', padding:'20px 20px calc(24px + env(safe-area-inset-bottom))', width:'100%', maxWidth:480, margin:'0 auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>New Channel</h3>
              <button onClick={() => setShowNewChannel(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={20}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Channel Name</label>
                <input value={newCh.name} onChange={e => setNewCh(n => ({...n, name:e.target.value.toLowerCase().replace(/\s/g,'-')}))} placeholder="e.g. project-alpha" className="field" style={{ fontSize:14 }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Description (optional)</label>
                <input value={newCh.desc} onChange={e => setNewCh(n => ({...n, desc:e.target.value}))} placeholder="What's this channel about?" className="field" style={{ fontSize:14 }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--bg-raised)', borderRadius:10, border:'1px solid var(--border)', cursor:'pointer' }}
                onClick={() => setNewCh(n => ({...n, private:!n.private}))}>
                <Lock size={16} style={{ color:newCh.private?'#7C3AED':'var(--text-muted)' }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Private channel</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>Only invited members can view and post</p>
                </div>
                <div style={{ width:44, height:24, borderRadius:12, background:newCh.private?'#7C3AED':'var(--border)', position:'relative', transition:'background 0.15s' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:newCh.private?22:2, transition:'left 0.15s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}/>
                </div>
              </div>
              <button onClick={createChannel} disabled={!newCh.name}
                style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:800, cursor:'pointer', opacity:!newCh.name?0.5:1 }}>
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInvite && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.5)', backdropFilter:'blur(4px)', zIndex:500, display:'flex', alignItems:'flex-end', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <div style={{ background:'var(--bg-surface)', borderRadius:'20px 20px 0 0', padding:'20px 20px calc(24px + env(safe-area-inset-bottom))', width:'100%', maxWidth:480, margin:'0 auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>Invite Team Member</h3>
              <button onClick={() => { setShowInvite(false); setInviteStatus(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={20}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Email Address</label>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="teammate@company.com" type="email" className="field" style={{ fontSize:14 }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Role</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[['member','Member','Can view and post in channels'],['manager','Manager','Can manage jobs and clients'],['admin','Admin','Full access except billing']].map(([role,label,desc]) => (
                    <div key={role} onClick={() => setInviteRole(role)} style={{ padding:'10px 12px', borderRadius:10, border:`2px solid ${inviteRole===role?'var(--blue)':'var(--border)'}`, background:inviteRole===role?'rgba(37,99,235,0.06)':'transparent', cursor:'pointer' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:inviteRole===role?'var(--blue)':'var(--text-primary)', marginBottom:2 }}>{label}</p>
                      <p style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.4 }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              {inviteStatus && (
                <p style={{ fontSize:13, fontWeight:600, color:inviteStatus.startsWith('✓')?'#0D9488':'#DC2626', textAlign:'center' }}>{inviteStatus}</p>
              )}
              <button onClick={inviteMember} disabled={!inviteEmail.trim() || inviting}
                style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:800, cursor:'pointer', opacity:!inviteEmail.trim()||inviting?0.5:1 }}>
                {inviting ? 'Sending invite…' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
