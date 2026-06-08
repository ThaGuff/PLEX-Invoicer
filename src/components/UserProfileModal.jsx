/**
 * UserProfileModal — Personal profile settings
 * Sets display name, username, title, timezone
 * Completely separate from AccountSettings (business settings)
 */
import React, { useState, useEffect } from 'react';
import { X, User, AtSign, Save, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserProfileModal({ onClose }) {
  const { user } = useAuth();
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ display_name: '', username: '', title: '', phone: '', bio: '', timezone: 'America/Chicago' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/profiles/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d?.profile) {
          setProfile(d.profile);
          setForm({
            display_name: d.profile.display_name || user?.user_metadata?.full_name || '',
            username: d.profile.username || '',
            title: d.profile.title || '',
            phone: d.profile.phone || '',
            bio: d.profile.bio || '',
            timezone: d.profile.timezone || 'America/Chicago',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
    outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'var(--bg-surface)', borderRadius:20, padding:'28px 28px 32px', width:'100%', maxWidth:440, boxShadow:'0 24px 64px rgba(11,18,32,0.25)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#3DD68C', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:800 }}>
              {(form.display_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>My Profile</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, borderRadius:8 }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)', fontSize:13 }}>Loading profile…</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Display Name */}
            <div>
              <label style={labelStyle}>Display Name</label>
              <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Your full name" style={inputStyle} maxLength={60} />
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Shown in chats and notifications</div>
            </div>

            {/* Username */}
            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, fontWeight:700 }}>@</span>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() }))}
                  placeholder="yourname" style={{ ...inputStyle, paddingLeft:28 }} maxLength={30} />
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                3-30 characters, letters/numbers/underscore only. Used for @mentions in team chat.
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>Job Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Project Manager" style={inputStyle} maxLength={100} />
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000" style={inputStyle} maxLength={30} type="tel" />
            </div>

            {error && (
              <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#dc2626', fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button onClick={save} disabled={saving || saved}
              style={{ padding:'12px 20px', borderRadius:12, border:'none', background: saved ? '#3DD68C' : '#3DD68C', color:'#fff', cursor:'pointer', fontSize:14, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s' }}>
              {saved ? <><Check size={15}/> Saved!</> : saving ? 'Saving…' : <><Save size={15}/> Save Profile</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
