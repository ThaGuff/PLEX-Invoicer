/**
 * WorkspacePage — Full Slack/Teams-style team communication
 * Features: channels, DMs, threads, reactions, file sharing, member presence
 * Mobile-first with full responsive design
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccount } from '../context/AccountContext';
import { useAuth } from '../context/AuthContext';
import {
  Hash, Plus, X, Send, Users, Settings, ChevronDown, ChevronRight,
  Smile, Paperclip, AtSign, Search, Bell, MoreHorizontal, Check,
  UserPlus, Trash2, RotateCcw, MessageSquare, Lock, Volume2, CheckCheck,
  Menu, ArrowLeft, Phone, Video, Info, Edit3, Bold, Italic, Code,
} from 'lucide-react';

// ── Emoji picker (simple) ─────────────────────────────────────────
const QUICK_EMOJIS = ['👍','❤️','😂','🎉','🔥','✅','👀','🚀','💯','😊','👏','🙌','💪','🤝','⚡'];

// ── Message component ────────────────────────────────────────────
function Message({ msg, isOwn, myId, onReact, onReply, onDelete, currentUser }) {
  const [hover, setHover] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const time = new Date(msg.created_at);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const reactions = msg.reactions || {};

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setShowEmoji(false); }}
      style={{
        display: 'flex', gap: 10, padding: '4px 16px',
        background: hover ? 'var(--bg-raised)' : 'transparent',
        transition: 'background 0.1s', position: 'relative',
        flexDirection: 'row', alignItems: 'flex-start',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: isOwn ? 'linear-gradient(135deg,#2563EB,#0D9488)' : 'linear-gradient(135deg,#7C3AED,#2563EB)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 14, fontWeight: 800, marginTop: 2,
      }}>
        {(msg.sender_name || 'U').charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + time */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            {isOwn ? 'You' : (msg.sender_name || 'Team Member')}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeStr}</span>
        </div>

        {/* Content - parse images, files, and mentions */}
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, wordBreak: 'break-word' }}>
          {(msg.content || '').split('\n').map((line, i) => {
            const imageMatch = line.match(/^\[image:(.+?)\]\((.+?)\)$/);
            const fileMatch = line.match(/^\[file:(.+?)\]\((.+?)\)$/);
            const mentionMatch = line.includes('@');
            if (imageMatch) return (
              <div key={i} style={{ marginTop: 8 }}>
                <img src={imageMatch[2]} alt={imageMatch[1]}
                  style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)' }}
                  onClick={() => window.open(imageMatch[2], '_blank')} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{imageMatch[1]}</div>
              </div>
            );
            if (fileMatch) return (
              <a key={i} href={fileMatch[2]} download={fileMatch[1]}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', color: 'var(--text-primary)', fontSize: 13, marginTop: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {fileMatch[1]}
              </a>
            );
            // Highlight @mentions
            const parts = line.split(/(@\w+)/g);
            return (
              <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
                {parts.map((p, j) => p.startsWith('@')
                  ? <strong key={j} style={{ color: 'var(--accent, #2563EB)', fontWeight: 700 }}>{p}</strong>
                  : p
                )}
                {i < (msg.content || '').split('\n').length - 1 && '\n'}
              </span>
            );
          })}
        </div>

        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                style={{
                  padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)',
                  background: users.includes(myId) ? 'rgba(37,99,235,0.12)' : 'var(--bg-raised)',
                  cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
                  color: 'var(--text-secondary)',
                }}>
                {emoji} <span style={{ fontSize: 11, fontWeight: 600 }}>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hover && (
        <div style={{
          position: 'absolute', right: 12, top: -18, display: 'flex', gap: 4,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '4px 6px', boxShadow: '0 4px 16px rgba(11,18,32,0.12)',
          zIndex: 10,
        }}>
          <button onClick={() => setShowEmoji(!showEmoji)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: 'var(--text-muted)', fontSize: 16 }}
            title="React">
            <Smile size={15} />
          </button>
          <button onClick={() => onReply(msg)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: 'var(--text-muted)' }}
            title="Reply">
            <MessageSquare size={15} />
          </button>
          {isOwn && (
            <button onClick={() => onDelete(msg.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: '#ef4444' }}
              title="Delete">
              <Trash2 size={15} />
            </button>
          )}
          {showEmoji && (
            <div style={{
              position: 'absolute', right: 0, top: 36, background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: 12, padding: 10,
              display: 'flex', flexWrap: 'wrap', gap: 6, width: 220,
              boxShadow: '0 8px 32px rgba(11,18,32,0.15)', zIndex: 20,
            }}>
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4, borderRadius: 6 }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Date separator ────────────────────────────────────────────────
function DateSep({ date }) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  let label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  if (d.toDateString() === today.toDateString()) label = 'Today';
  if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', padding: '2px 10px', background: 'var(--bg-raised)', borderRadius: 20, border: '1px solid var(--border)' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function WorkspacePage() {
  const { account } = useAccount();
  const { user } = useAuth();
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
  const myId = user?.id || 'unknown';
  const myName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState({});
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteStatus, setInviteStatus] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load channels
  const loadChannels = useCallback(async () => {
    if (!account?.id) return;
    try {
      const r = await fetch(`/api/workspace/channels?account_id=${account.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const data = await r.json();
        setChannels(data);
        if (data.length && !activeChannel) {
          setActiveChannel(data[0].id);
        }
      }
    } catch {}
  }, [account?.id]);

  // Load messages for channel
  const loadMessages = useCallback(async (channelId) => {
    if (!channelId || !account?.id) return;
    setLoadingMsgs(true);
    try {
      const r = await fetch(
        `/api/workspace/channels/${channelId}/messages?account_id=${account.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (r.ok) {
        const data = await r.json();
        setMessages(prev => ({ ...prev, [channelId]: Array.isArray(data) ? data : [] }));
      }
    } catch {} finally { setLoadingMsgs(false); }
  }, [account?.id]);

  // Load members
  const loadMembers = useCallback(async () => {
    if (!account?.id) return;
    try {
      const r = await fetch(`/api/workspace/members?account_id=${account.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) setMembers(await r.json());
    } catch {}
  }, [account?.id]);

  useEffect(() => { loadChannels(); }, [loadChannels]);
  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => {
    if (activeChannel) loadMessages(activeChannel);
  }, [activeChannel]);

  // ── Real-time message polling every 5 seconds ───────────────────
  useEffect(() => {
    if (!activeChannel || !account?.id) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(
          `/api/workspace/channels/${activeChannel}/messages?account_id=${account.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) {
            setMessages(prev => {
              const existing = prev[activeChannel] || [];
              // Only update if there are new messages (avoid unnecessary re-renders)
              if (data.length !== existing.length ||
                  (data.length > 0 && existing.length > 0 && data[data.length-1]?.id !== existing[existing.length-1]?.id)) {
                return { ...prev, [activeChannel]: data };
              }
              return prev;
            });
          }
        }
      } catch {}
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [activeChannel, account?.id]);

  // ── Presence heartbeat — update every 60 seconds ────────────────
  useEffect(() => {
    if (!account?.id || !token) return;
    const heartbeat = () => {
      fetch('/api/profiles/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ account_id: account.id, status: 'online' })
      }).catch(() => {});
    };
    heartbeat(); // immediate
    const interval = setInterval(heartbeat, 60000);
    
    // Mark as away on tab blur, online on focus
    const onBlur = () => fetch('/api/profiles/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ account_id: account.id, status: 'away' })
    }).catch(() => {});
    const onFocus = () => heartbeat();
    
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); };
  }, [account?.id, token]);

  // ── Load presence for all members ─────────────────────────────
  const [presence, setPresence] = useState({});
  useEffect(() => {
    if (!account?.id || !token) return;
    const loadPresence = () => {
      fetch(`/api/profiles/presence/${account.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const map = {};
          if (Array.isArray(data)) data.forEach(p => { map[p.user_id] = p; });
          setPresence(map);
        }).catch(() => {});
    };
    loadPresence();
    const interval = setInterval(loadPresence, 30000);
    return () => clearInterval(interval);
  }, [account?.id, token]);

  // ── Notification polling ───────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!token) return;
    const loadNotifs = () => {
      fetch('/api/profiles/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { notifications: [], unread: 0 })
        .then(d => { setNotifications(d.notifications || []); setUnreadCount(d.unread || 0); })
        .catch(() => {});
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // ── Register for push notifications
  useEffect(() => {
    if (!account?.id || !token) return;
    const registerPush = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        const vapidR = await fetch('/api/notifications/vapid-public-key').then(r => r.json());
        if (!vapidR.configured) return;
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidR.publicKey,
        });
        
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subscription: sub, account_id: account.id }),
        });
        console.log('[Workspace] Push notifications registered');
      } catch (e) { console.warn('[Workspace] Push setup failed:', e.message); }
    };
    registerPush();
  }, [account?.id, token]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[activeChannel]]);

  // Handle file attachment
  const handleFileAttach = async (file) => {
    if (!file) return;
    setUploadingFile(true);
    try {
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        setAttachments(prev => [...prev, {
          name: file.name,
          url: dataUrl,
          type: isImage ? 'image' : 'file',
          size: file.size,
          mimeType: file.type,
        }]);
      };
      reader.readAsDataURL(file);
    } catch (e) { console.error('File attach error:', e); }
    finally { setUploadingFile(false); }
  };

  // Send message
  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending || !activeChannel) return;
    setSending(true);
    setInput('');
    setReplyTo(null);
    try {
      const r = await fetch(`/api/workspace/channels/${activeChannel}/messages?account_id=${account?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          content: attachments.length > 0 
            ? content + (content ? '\n' : '') + attachments.map(a => 
                a.type === 'image' 
                  ? `[image:${a.name}](${a.url})`
                  : `[file:${a.name}](${a.url})`
              ).join('\n')
            : content,
          account_id: account?.id, sender_name: myName, reply_to: replyTo?.id 
        })
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages(prev => ({
          ...prev,
          [activeChannel]: [...(prev[activeChannel] || []), msg]
        }));
      }
    } catch {} finally { setSending(false); }
  };

  // Delete message
  const deleteMessage = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await fetch(`/api/workspace/channels/${activeChannel}/messages/${msgId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => ({
        ...prev,
        [activeChannel]: (prev[activeChannel] || []).filter(m => m.id !== msgId)
      }));
    } catch {}
  };

  // React to message
  const reactToMessage = async (msgId, emoji) => {
    setMessages(prev => {
      const msgs = [...(prev[activeChannel] || [])];
      const idx = msgs.findIndex(m => m.id === msgId);
      if (idx < 0) return prev;
      const msg = { ...msgs[idx] };
      const reactions = { ...(msg.reactions || {}) };
      if (!reactions[emoji]) reactions[emoji] = [];
      const userIdx = reactions[emoji].indexOf(myId);
      if (userIdx >= 0) reactions[emoji].splice(userIdx, 1);
      else reactions[emoji].push(myId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
      msg.reactions = reactions;
      msgs[idx] = msg;
      return { ...prev, [activeChannel]: msgs };
    });
  };

  // Create channel
  const createChannel = async () => {
    const safeName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!safeName) return;
    try {
      const r = await fetch('/api/workspace/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ account_id: account?.id, name: safeName })
      });
      if (r.ok) {
        const ch = await r.json();
        setChannels(prev => [...prev, ch]);
        setActiveChannel(ch.id);
        setShowNewChannel(false);
        setNewChannelName('');
      }
    } catch {}
  };

  // Invite member
  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setInviteStatus('Sending…');
    try {
      const r = await fetch('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ account_id: account?.id, email: inviteEmail, role: inviteRole })
      });
      const d = await r.json();
      if (r.ok) {
        setInviteStatus('✅ Invitation sent!');
        setInviteEmail('');
        loadMembers();
        setTimeout(() => setInviteStatus(''), 3000);
      } else setInviteStatus('❌ ' + (d.error || 'Failed'));
    } catch (e) { setInviteStatus('❌ ' + e.message); }
  };

  // Delete member/cancel invite
  const removeMember = async (memberId, isInvite) => {
    if (!confirm(isInvite ? 'Cancel this invitation?' : 'Remove this member?')) return;
    try {
      const r = await fetch(`/api/workspace/members/${memberId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch {}
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const msgs = messages[activeChannel] || [];
    const filtered = searchQuery
      ? msgs.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
      : msgs;
    const groups = [];
    let lastDate = null;
    filtered.forEach(msg => {
      const d = new Date(msg.created_at).toDateString();
      if (d !== lastDate) { groups.push({ type: 'date', date: msg.created_at }); lastDate = d; }
      groups.push({ type: 'msg', msg });
    });
    return groups;
  }, [messages, activeChannel, searchQuery]);

  const activeChannelData = channels.find(c => c.id === activeChannel);
  const activeMembersList = members.filter(m => m.status === 'active');
  const pendingInvites = members.filter(m => m.status === 'invited');

  return (
    <div style={{
      display: 'flex', height: 'calc(100dvh - 68px)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: 'var(--bg-page)', overflow: 'hidden',
      maxWidth: '100%', width: '100%',
    }}>

      {/* ── SIDEBAR ────────────────────────────────────────────── */}
      <div style={{
        width: showSidebar ? (isMobile ? '100%' : 260) : 0,
        minWidth: showSidebar ? (isMobile ? '100%' : 260) : 0,
        display: (showSidebar || !isMobile) ? 'flex' : 'none',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0F172A 0%, #1a2744 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden', transition: 'all 0.2s', flexShrink: 0,
        position: isMobile ? 'absolute' : 'relative',
        zIndex: isMobile ? 50 : 'auto',
        height: '100%',
      }}>
        {/* Workspace header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.02em' }}>
                {account?.name || 'Workspace'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                {activeMembersList.length + 1} members
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowSearch(!showSearch)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <Search size={15} />
              </button>
              <button onClick={() => setShowInvite(true)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <UserPlus size={15} />
              </button>
              {isMobile && <button onClick={() => setShowSidebar(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <X size={15} />
              </button>}
            </div>
          </div>
          {showSearch && (
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              style={{ marginTop: 10, width: '100%', padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
          )}
        </div>

        {/* Channels */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          <div style={{ padding: '8px 8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Channels</span>
            <button onClick={() => setShowNewChannel(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2 }}>
              <Plus size={14} />
            </button>
          </div>

          {showNewChannel && (
            <div style={{ padding: '8px', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createChannel(); if (e.key === 'Escape') { setShowNewChannel(false); setNewChannelName(''); } }}
                  placeholder="channel-name" autoFocus
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }} />
                <button onClick={createChannel} style={{ background: '#2563EB', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff' }}>
                  <Check size={14} />
                </button>
              </div>
            </div>
          )}

          {channels.map(ch => (
            <button key={ch.id} onClick={() => { setActiveChannel(ch.id); if (isMobile) setShowSidebar(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
                borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: activeChannel === ch.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: activeChannel === ch.id ? '#fff' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.15s', marginBottom: 1,
              }}
              onMouseEnter={e => { if (activeChannel !== ch.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (activeChannel !== ch.id) e.currentTarget.style.background = 'transparent'; }}>
              <Hash size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
              <span style={{ fontSize: 14, fontWeight: activeChannel === ch.id ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ch.name}
              </span>
            </button>
          ))}

          {/* Members section */}
          <div style={{ padding: '12px 8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Members</span>
          </div>

          {/* Self */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg,#2563EB,#0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                {myName.charAt(0).toUpperCase()}
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '2px solid #0F172A' }} title="Online" />
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {myName} <span style={{ opacity: 0.4, fontSize: 10 }}>· you · online</span>
            </span>
          </div>

          {activeMembersList.map(m => {
            const memberPresence = presence[m.user_id];
            const presenceStatus = memberPresence?.status || 'offline';
            const presenceColor = presenceStatus === 'online' ? '#22c55e' : presenceStatus === 'away' ? '#F59E0B' : '#6B7280';
            const presenceLabel = presenceStatus === 'online' ? 'Online' : presenceStatus === 'away' ? 'Away' : 'Offline';
            const displayName = memberPresence?.display_name || m.email || m.invited_email || 'Member';
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 8 }}>
                <div style={{ position: 'relative' }}>
                  {memberPresence?.avatar_url
                    ? <img src={memberPresence.avatar_url} style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'cover' }} />
                    : <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 800 }}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                  }
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: presenceColor, border: '2px solid #0F172A' }} title={presenceLabel} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: presenceStatus === 'offline' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </div>
                  {memberPresence?.custom_status && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {memberPresence.custom_status}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {pendingInvites.length > 0 && (
            <>
              <div style={{ padding: '10px 8px 4px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending ({pendingInvites.length})</span>
              </div>
              {pendingInvites.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(217,119,6,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', fontSize: 11, fontWeight: 800 }}>
                    {(m.email || m.invited_email || '?').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {m.email || m.invited_email}
                  </span>
                  <button onClick={() => removeMember(m.id, true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(239,68,68,0.7)', flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* User info at bottom */}
        <div style={{ padding: '12px 12px calc(8px + env(safe-area-inset-bottom))', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#2563EB,#0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
            {myName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myName}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>🟢 Active</div>
          </div>
        </div>
      </div>

      {/* ── MAIN CHAT AREA ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-page)', overflow: 'hidden' }}>

        {/* Channel header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}>
          <button onClick={() => setShowSidebar(!showSidebar)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--text-secondary)', flexShrink: 0 }}>
            <Menu size={18} />
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
          <Hash size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeChannelData?.name || 'Select a channel'}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifications && setShowNotifications(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--text-muted)', position: 'relative' }}>
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
            <button onClick={() => setShowMembersPanel(!showMembersPanel)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: showMembersPanel ? 'var(--accent)' : 'var(--text-muted)' }}>
              <Users size={17} />
            </button>
            <button onClick={() => setShowInvite(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--accent, #2563EB)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <UserPlus size={13} /> Invite
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
          {!activeChannel && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <Hash size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 15 }}>Select a channel to start messaging</p>
            </div>
          )}

          {activeChannel && groupedMessages.length === 0 && !loadingMsgs && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Welcome to #{activeChannelData?.name}!
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                This is the beginning of the #{activeChannelData?.name} channel.<br />
                Send a message to get the conversation started.
              </p>
            </div>
          )}

          {groupedMessages.map((item, i) =>
            item.type === 'date'
              ? <DateSep key={`date-${i}`} date={item.date} />
              : <Message
                  key={item.msg.id}
                  msg={item.msg}
                  isOwn={item.msg.sender_id === myId}
                  myId={myId}
                  onReact={reactToMessage}
                  onReply={setReplyTo}
                  onDelete={deleteMessage}
                  currentUser={user}
                />
          )}
          <div ref={bottomRef} style={{ height: 16 }} />
        </div>

        {/* @mention suggestions */}
        {mentionSuggestions.length > 0 && (
          <div style={{ position:'absolute', bottom:'100%', left:16, right:16, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 32px rgba(11,18,32,0.15)', zIndex:50 }}>
            {mentionSuggestions.map(p => (
              <button key={p.name} onClick={() => {
                const newVal = input.replace(/@\w*$/, `@${p.name} `);
                setInput(newVal);
                setMentionSuggestions([]);
                inputRef.current?.focus();
              }} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 14px', border:'none', background:'none', cursor:'pointer', textAlign:'left', color:'var(--text-primary)' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-raised)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
                <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,#7C3AED,#2563EB)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:800, flexShrink:0 }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>@{p.name}</div>
                  {p.email && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.email}</div>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Reply preview */}
        {replyTo && (
          <div style={{
            padding: '8px 16px', background: 'var(--bg-raised)', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)',
          }}>
            <MessageSquare size={13} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Replying to: <strong>{replyTo.sender_name}</strong> — "{replyTo.content?.slice(0, 60)}"
            </span>
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
          position: 'relative',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            background: 'var(--bg-raised)', borderRadius: 14,
            border: '1px solid var(--border)', padding: '8px 12px',
          }}>
            {/* Attachment preview bar */}
            {attachments.length > 0 && (
              <div style={{ display:'flex', gap:8, padding:'6px 8px', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
                {attachments.map((att, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', background:'var(--bg-raised)', borderRadius:8, border:'1px solid var(--border)', fontSize:12 }}>
                    {att.type === 'image'
                      ? <img src={att.url} alt={att.name} style={{ width:32, height:32, objectFit:'cover', borderRadius:4 }} />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                    }
                    <span style={{ maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-primary)' }}>{att.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_,j) => j!==i))}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'0 2px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

          {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xlsx"
              style={{ display:'none' }} onChange={e => e.target.files[0] && handleFileAttach(e.target.files[0])} />
            
            {/* Attach button */}
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
              title="Attach file or image"
              style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'var(--text-muted)', flexShrink:0, display:'flex', alignItems:'center', transition:'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
              <Paperclip size={17} />
            </button>

          <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                const val = e.target.value;
                setInput(val);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                // Detect @mention
                const cursor = e.target.selectionStart;
                const textBefore = val.slice(0, cursor);
                const mentionMatch = textBefore.match(/@(\w*)$/);
                if (mentionMatch) {
                  const q = mentionMatch[1].toLowerCase();
                  setMentionQuery(q);
                  const allPeople = [
                    ...members.map(m => ({ name: m.email?.split('@')[0] || '', email: m.email || m.invited_email })),
                    { name: 'here', email: null },
                    { name: 'channel', email: null },
                  ];
                  setMentionSuggestions(allPeople.filter(p => p.name.toLowerCase().startsWith(q)).slice(0, 5));
                } else {
                  setMentionSuggestions([]);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={activeChannelData ? `Message #${activeChannelData.name}` : 'Select a channel first'}
              disabled={!activeChannel}
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.5,
                resize: 'none', maxHeight: 120, minHeight: 22,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending || !activeChannel}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: input.trim() && !sending && activeChannel ? '#2563EB' : 'var(--border)',
                color: input.trim() && !sending && activeChannel ? '#fff' : 'var(--text-muted)',
                cursor: input.trim() && !sending && activeChannel ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
              <Send size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, paddingLeft: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <kbd style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>↵ Enter</kbd> send · <kbd style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>Shift+↵</kbd> newline
            </span>
          </div>
        </div>
      </div>

      {/* ── INVITE MODAL ──────────────────────────────────────── */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.6)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }}
          onClick={() => setShowInvite(false)}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0',
            padding: '24px 20px calc(32px + env(safe-area-inset-bottom))',
            width: '100%', maxWidth: 480,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Invite to Workspace</h3>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && inviteMember()}
              placeholder="colleague@email.com" type="email"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 15, boxSizing: 'border-box', marginBottom: 10 }} />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', marginBottom: 16 }}>
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            {inviteStatus && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: inviteStatus.includes('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: inviteStatus.includes('✅') ? '#16a34a' : '#dc2626', fontSize: 13, marginBottom: 12 }}>
                {inviteStatus}
              </div>
            )}
            <button onClick={inviteMember} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#2563EB,#0D9488)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
              Send Invitation
            </button>

            {/* Existing invites */}
            {pendingInvites.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Pending Invites</div>
                {pendingInvites.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.email || m.invited_email}</div>
                      <div style={{ fontSize: 11, color: '#D97706' }}>⏳ Pending · {m.role}</div>
                    </div>
                    <button onClick={() => removeMember(m.id, true)}
                      style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
