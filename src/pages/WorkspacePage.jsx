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
function Message({ msg, isOwn, myId, onReact, onReply, onDelete, onEdit, currentUser, isEditing, editContent, onEditChange, onEditSave, onEditCancel }) {
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
          {msg.edited_at && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>(edited)</span>}
        </div>

        {/* Content - parse images, files, and mentions */}
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, wordBreak: 'break-word' }}>
          {(msg.content || '').split('\n').map((line, i) => {
            // Skip raw base64 blobs that were accidentally stored as message content
            const isRawBase64 = line.length > 200 && !line.includes(' ') && 
              (line.startsWith('data:') || /^[A-Za-z0-9+/]{100}/.test(line));
            if (isRawBase64) return (
              <div key={i} style={{ padding: '6px 10px', background:'rgba(239,68,68,0.08)', borderRadius:8, fontSize:12, color:'#dc2626', fontStyle:'italic' }}>
                📎 Attachment (legacy format — re-send to view)
              </div>
            );
            
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
            // Highlight @mentions and clean up email-based @mentions
            const parts = line.split(/(@[\w.@]+)/g);
            return (
              <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
                {parts.map((p, j) => {
                  if (!p.startsWith('@')) return p;
                  // Clean up email-based mentions: @user@domain.com → @user
                  const cleanMention = p.includes('@', 1) 
                    ? '@' + p.slice(1).split('@')[0] 
                    : p;
                  return <strong key={j} style={{ color: 'var(--accent, #2563EB)', fontWeight: 700 }}>{cleanMention}</strong>;
                })}
                {i < (msg.content || '').split('\n').length - 1 && '\n'}
              </span>
            );
          })}
        </div>

        {/* Inline edit mode */}
        {isEditing && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              value={editContent}
              onChange={e => onEditChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSave(); } if (e.key === 'Escape') onEditCancel(); }}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #2563EB', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 14, resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              rows={2}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
              <button onClick={onEditSave} style={{ padding: '4px 10px', borderRadius: 6, background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>Save</button>
              <button onClick={onEditCancel} style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 11 }}>Cancel (Esc)</button>
              <span style={{ color: 'var(--text-muted)', lineHeight: '24px' }}>· Enter to save, Shift+Enter for newline</span>
            </div>
          </div>
        )}

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
            <>
              <button onClick={() => onEdit(msg)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: 'var(--text-muted)' }}
                title="Edit message">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={() => onDelete(msg.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: '#ef4444' }}
                title="Delete message">
                <Trash2 size={15} />
              </button>
            </>
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
      {showActivityFeed && (
        <div style={{ position:'fixed', top:0, right:0, bottom:0, width:320, background:'var(--bg-surface)', borderLeft:'1px solid var(--border)', zIndex:200, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,0.12)' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>⚡ Operations Feed</p>
            <button onClick={() => setShowActivityFeed(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:18 }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {activityFeed.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:13 }}>No activity yet today</div>
            ) : activityFeed.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'10px 14px', borderBottom:'0.5px solid var(--border)' }}>
                <div style={{ width:28, height:28, borderRadius:8, background:(item.color||'#6B7280')+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{item.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{item.title}</p>
                  {item.desc && <p style={{ margin:'1px 0 0', fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}