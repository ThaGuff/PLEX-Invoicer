/**
 * Secure Document Vault — Cloud storage for invoices, quotes, contracts
 * Mobile-first: large tap targets, swipe-friendly cards, simple upload
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';
import { Upload, FileText, File, Trash2, Download, Lock, Eye, Search, FolderOpen, Plus, Shield } from 'lucide-react';

const DOC_TYPES = {
  quote:    { icon: FileText, color: '#2563EB', bg: 'rgba(37,99,235,0.1)',  label: 'Quote' },
  invoice:  { icon: File,     color: '#0D9488', bg: 'rgba(13,148,136,0.1)', label: 'Invoice' },
  contract: { icon: Lock,     color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', label: 'Contract' },
  photo:    { icon: Eye,      color: '#D97706', bg: 'rgba(217,119,6,0.1)',  label: 'Photo' },
  other:    { icon: File,     color: '#64748B', bg: 'rgba(100,116,139,0.1)', label: 'File' },
};

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + 'KB';
  return (bytes/1048576).toFixed(1) + 'MB';
}

function fmtDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DocumentsPage() {
  const { account } = useAccount();
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [uploading, setUploading] = useState(false);
  const [error,   setError]   = useState('');
  const fileRef = useRef();

  const load = useCallback(async () => {
    if (!account?.id) return;
    try {
      const res = await fetch(`/api/documents?account_id=${account.id}`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token}` }
      });
      if (res.ok) setDocs(await res.json());
    } catch {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('account_id', account.id);
    form.append('doc_type', file.type.startsWith('image/') ? 'photo' : 'other');
    try {
      const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
      const res = await fetch('/api/documents', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      if (res.ok) { const doc = await res.json(); setDocs(d => [doc, ...d]); }
      else setError('Upload failed. Please try again.');
    } catch { setError('Upload failed.'); }
    setUploading(false);
    fileRef.current.value = '';
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
    await fetch(`/api/documents/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setDocs(d => d.filter(x => x.id !== id));
  };

  const filtered = docs.filter(d => {
    const matchFilter = filter === 'all' || d.doc_type === filter;
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const FILTERS = ['all', 'invoice', 'quote', 'contract', 'photo', 'other'];

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'16px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em', display:'flex', alignItems:'center', gap:10 }}>
            <Shield size={20} style={{ color:'#2563EB' }} /> Documents
          </h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>{docs.length} files · encrypted at rest</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:11, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(37,99,235,0.3)', opacity: uploading ? 0.6 : 1, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleUpload}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.csv" />
      </div>

      {error && <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', color:'#DC2626', fontSize:13, marginBottom:12 }}>{error}</div>}

      {/* Search */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
          className="field" style={{ paddingLeft:38, fontSize:13 }} />
      </div>

      {/* Filter chips */}
      <div className="chip-row mb-4">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flexShrink:0, padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:600, border:`1.5px solid ${filter===f?'var(--blue)':'var(--border)'}`, background: filter===f ? 'var(--blue)' : 'var(--bg-surface)', color: filter===f ? '#fff' : 'var(--text-secondary)', cursor:'pointer', textTransform:'capitalize', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.15s' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Document list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[0,1,2].map(i => <div key={i} className="glow-card animate-pulse" style={{ height:72 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glow-card" style={{ padding:'48px 24px', textAlign:'center' }}>
          <FolderOpen size={40} style={{ color:'var(--text-muted)', margin:'0 auto 12px' }} />
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>No documents yet</p>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Upload invoices, quotes, and contracts to keep them secure.</p>
          <button onClick={() => fileRef.current?.click()}
            style={{ padding:'10px 20px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            Upload first document
          </button>
        </div>
      ) : (
        <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          {filtered.map((doc, i) => {
            const dtype = DOC_TYPES[doc.doc_type] || DOC_TYPES.other;
            const Icon = dtype.icon;
            return (
              <div key={doc.id} className="list-item" style={{ borderBottom: i < filtered.length-1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="list-icon" style={{ background: dtype.bg, flexShrink:0 }}>
                  <Icon size={18} style={{ color: dtype.color }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name || 'Document'}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{dtype.label} · {fmtSize(doc.size)} · {fmtDate(doc.created_at)}</p>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer"
                      style={{ width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:9, border:'1px solid var(--border)', color:'var(--text-muted)', textDecoration:'none', transition:'all 0.15s' }}>
                      <Download size={14} />
                    </a>
                  )}
                  <button onClick={() => handleDelete(doc.id)}
                    style={{ width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:9, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--text-muted)', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#DC2626'; e.currentTarget.style.color='#DC2626'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
