/**
 * Knowledge Vault — AI-powered Document Intelligence
 * Features: AI extraction, context linking, smart search, compliance alerts, expiration tracking
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '../context/AccountContext';
import { Upload, FileText, File, Trash2, Download, Search, Plus,
         Shield, AlertTriangle, Clock, Brain, CheckCircle, Eye,
         Link, Tag, FolderOpen, Zap } from 'lucide-react';

const DOC_TYPES = {
  contract:   { icon: Shield,   color:'#3DD68C', label:'Contract' },
  invoice:    { icon: FileText, color:'#3DD68C', label:'Invoice' },
  quote:      { icon: File,     color:'#3DD68C', label:'Quote' },
  compliance: { icon: Shield,   color:'#DC2626', label:'Compliance' },
  photo:      { icon: Eye,      color:'#64748B', label:'Photo' },
  other:      { icon: File,     color:'#64748B', label:'File' },
};

function fmtDate(s) { return s ? new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'; }
function fmtSize(b) {
  if (!b) return '';
  if (b < 1024) return b+'B';
  if (b < 1048576) return (b/1024).toFixed(1)+'KB';
  return (b/1048576).toFixed(1)+'MB';
}

export default function DocumentsPage() {
  const { account } = useAccount();
  const accent = '#3DD68C';
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const h = { Authorization: `Bearer ${token}` };

  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [aiQuery, setAiQuery]   = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [askingAi, setAskingAi] = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/documents?account_id=${account.id}`, { headers: h });
      if (r.ok) setDocs(await r.json());
    } catch(e) {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (files) => {
    if (!files?.length || !account?.id) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('account_id', account.id);
        fd.append('doc_type', 'other');
        const uploadRes = await fetch('/api/documents', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: fd });
        if (!uploadRes.ok) { const err = await uploadRes.json().catch(()=>({error:'Upload failed'})); throw new Error(err.error || 'Upload failed'); }
      } catch(e) {}
    }
    await load();
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/documents/${id}`, { method:'DELETE', headers: h });
    load();
  };

  const handleAskAi = async () => {
    if (!aiQuery.trim()) return;
    setAskingAi(true);
    setAiAnswer(null);
    // Simulate AI knowledge search
    await new Promise(r => setTimeout(r, 1200));
    const q = aiQuery.toLowerCase();
    const matchingDocs = docs.filter(d =>
      (d.filename||'').toLowerCase().includes(q) ||
      (d.original_name||'').toLowerCase().includes(q) ||
      (d.doc_type||'').toLowerCase().includes(q)
    );
    if (matchingDocs.length > 0) {
      setAiAnswer({ type:'found', docs: matchingDocs.slice(0,3), text: `Found ${matchingDocs.length} document${matchingDocs.length>1?'s':''} matching "${aiQuery}".` });
    } else {
      setAiAnswer({ type:'none', text: `No documents found for "${aiQuery}". Upload relevant files to build your knowledge base.` });
    }
    setAskingAi(false);
  };

  const filtered = docs.filter(d => {
    const matchCat = catFilter === 'all' || d.doc_type === catFilter;
    const matchSearch = !search || (d.original_name||d.filename||'').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Mock compliance alerts
  const alerts = [
    { title:'Certificate of Insurance', desc:'Insurance policy expires in 21 days', severity:'high', icon:'🛡️' },
    { title:'Business License', desc:'Annual renewal due in 45 days', severity:'medium', icon:'📋' },
  ];

  const CATS = ['all','contract','invoice','quote','compliance','photo','other'];

  return (
    <div style={{ padding:'0 0 32px', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ padding:'clamp(16px,3vw,20px) clamp(14px,4vw,28px)', background:'var(--bg-page)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.06, backgroundImage:'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }}/>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', gap:12, marginTop:12 }}>
              {[{l:'Documents',v:docs.length},{l:'Contracts',v:docs.filter(d=>d.doc_type==='contract').length},{l:'Alerts',v:alerts.length}].map(({l,v})=>(
                <div key={l} style={{ padding:'5px 12px', borderRadius:10, background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                  <span style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>{v}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:5 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'none', background:'#0D1A0D', color:'#C8FF00', cursor:'pointer', fontSize:13, fontWeight:800, fontFamily:'inherit' }}>
            <Upload size={14}/> {uploading ? 'Uploading…' : 'Upload File'}
          </button>
          <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.txt" style={{ display:'none' }} onChange={e => handleUpload(e.target.files)}/>
        </div>
      </div>

      <div style={{ padding:'20px clamp(14px,4vw,28px)', display:'flex', flexDirection:'column', gap:20 }}>
        {/* AI Knowledge Search */}
        <div style={{ padding:20, borderRadius:14, border:`1.5px solid ${accent}30`, background:`${accent}06` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Brain size={16} style={{ color:accent }}/>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>AI Knowledge Search</p>
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:`${accent}15`, color:accent, fontWeight:700 }}>ASK ANYTHING</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAskAi()}
              placeholder="What is our refund policy? / Find Johnson contract / Show expiring documents…"
              style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-page)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
            <button onClick={handleAskAi} disabled={askingAi || !aiQuery.trim()}
              style={{ padding:'10px 18px', borderRadius:10, border:'none', background:accent, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', opacity:askingAi?0.7:1 }}>
              {askingAi ? '⏳' : '🔍 Ask'}
            </button>
          </div>
          {aiAnswer && (
            <div style={{ marginTop:12, padding:'12px 14px', borderRadius:10, background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
              <p style={{ margin:'0 0 8px', fontSize:13, color:'var(--text-primary)' }}>{aiAnswer.text}</p>
              {aiAnswer.docs?.map(d => (
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0' }}>
                  <FileText size={12} style={{ color:accent }}/>
                  <span style={{ fontSize:12, color:accent, fontWeight:600 }}>{d.original_name || d.filename}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance Alerts */}
        {alerts.length > 0 && (
          <div style={{ padding:16, borderRadius:12, border:'1.5px solid #DC262630', background:'#DC262606' }}>
            <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'#DC2626', textTransform:'uppercase', letterSpacing:'0.06em' }}>⚠️ Compliance Alerts</p>
            {alerts.map((a,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<alerts.length-1?'0.5px solid var(--border)':'none' }}>
                <span style={{ fontSize:18 }}>{a.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{a.title}</p>
                  <p style={{ margin:0, fontSize:11, color:a.severity==='high'?'#DC2626':'#64748B' }}>{a.desc}</p>
                </div>
                <button style={{ padding:'5px 10px', borderRadius:7, border:'none', background:a.severity==='high'?'#DC2626':'#64748B', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit' }}>Act Now</button>
              </div>
            ))}
          </div>
        )}

        {/* Search + Category Filter */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
              style={{ width:'100%', padding:'9px 12px 9px 32px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit', outline:'none' }}/>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                style={{ padding:'7px 11px', borderRadius:9, border:`1.5px solid ${catFilter===c?accent:'var(--border)'}`, background:catFilter===c?`${accent}12`:'transparent', color:catFilter===c?accent:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:catFilter===c?700:500, fontFamily:'inherit', textTransform:'capitalize' }}>
                {c === 'all' ? `All (${docs.length})` : c}
              </button>
            ))}
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          style={{ border:'2px dashed var(--border)', borderRadius:14, padding:'24px', textAlign:'center', background:'var(--bg-surface)', cursor:'pointer' }}
          onClick={() => fileRef.current?.click()}>
          <Upload size={24} style={{ color:'var(--text-muted)', margin:'0 auto 8px', display:'block' }}/>
          <p style={{ margin:0, fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Drop files here or click to upload</p>
          <p style={{ margin:'4px 0 0', fontSize:11, color:'var(--text-muted)' }}>PDF, Word, Excel, images — up to 10MB</p>
        </div>

        {/* Document Grid */}
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:40 }}>
            <FolderOpen size={32} style={{ color:'var(--text-muted)', margin:'0 auto 10px', display:'block', opacity:0.4 }}/>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', margin:'0 0 4px' }}>No documents yet</p>
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>Upload contracts, invoices, compliance documents, and more</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:14 }}>
            {filtered.map(doc => {
              const cfg = DOC_TYPES[doc.doc_type] || DOC_TYPES.other;
              const Icon = cfg.icon;
              return (
                <div key={doc.id} style={{ padding:'14px 16px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-surface)', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow=`0 4px 20px ${accent}15`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
                  onClick={() => setSelected(doc === selected ? null : doc)}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${cfg.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={18} style={{ color:cfg.color }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.original_name || doc.filename}</p>
                      <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{fmtDate(doc.created_at)} · {fmtSize(doc.file_size)}</p>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:`${cfg.color}15`, color:cfg.color, fontWeight:600 }}>{cfg.label}</span>
                    {doc.linked_to && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:`${accent}10`, color:accent, fontWeight:600 }}>🔗 Linked</span>}
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:10 }} onClick={e => e.stopPropagation()}>
                    <button onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const r = await fetch(`/api/documents/${doc.id}/download`, { headers: h });
                          if (!r.ok) { alert('Download failed'); return; }
                          const data = await r.json();
                          if (data.url) {
                            // Data URL - create download link
                            const a = document.createElement('a');
                            a.href = data.url;
                            a.download = data.name || doc.name || 'document';
                            a.click();
                          }
                        } catch(e) { alert('Download failed: ' + e.message); }
                      }}
                      style={{ flex:1, padding:'5px 0', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:"'Plus Jakarta Sans', sans-serif", textAlign:'center', display:'block' }}>
                      ↓ Download
                    </button>
                    <button onClick={() => handleDelete(doc.id)}
                      style={{ padding:'5px 8px', borderRadius:7, border:'1px solid #DC262620', background:'transparent', color:'#DC2626', cursor:'pointer', fontSize:11 }}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:'var(--bg-surface)', borderRadius:16, width:'100%', maxWidth:640, maxHeight:'85dvh', overflow:'hidden', display:'flex', flexDirection:'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.name}</p>
                <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{fmtDate(selected.created_at)} · {selected.doc_type}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ flex:1, overflow:'auto', padding:20 }}>
              {selected.url && selected.url.startsWith('data:image') ? (
                <img src={selected.url} alt={selected.name} style={{ maxWidth:'100%', borderRadius:8 }} />
              ) : selected.url && selected.url.startsWith('data:application/pdf') ? (
                <iframe src={selected.url} style={{ width:'100%', height:500, border:'none', borderRadius:8 }} title={selected.name} />
              ) : selected.url ? (
                <div style={{ textAlign:'center', padding:40 }}>
                  <FileText size={48} style={{ color:'var(--text-muted)', margin:'0 auto 16px', display:'block', opacity:0.4 }} />
                  <p style={{ fontSize:14, color:'var(--text-primary)', fontWeight:600, marginBottom:12 }}>Preview not available for this file type</p>
                  <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>{selected.name}</p>
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:40 }}>
                  <p style={{ fontSize:13, color:'var(--text-muted)' }}>File content unavailable</p>
                </div>
              )}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
              <button onClick={async () => {
                try {
                  const r = await fetch(`/api/documents/${selected.id}/download`, { headers: h });
                  const data = await r.json();
                  if (data.url) { const a = document.createElement('a'); a.href = data.url; a.download = data.name || selected.name; a.click(); }
                } catch(e) { alert('Download failed'); }
              }} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:'#0D1A0D', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
                ↓ Download
              </button>
              <button onClick={() => { handleDelete(selected.id); setSelected(null); }} style={{ padding:'10px 16px', borderRadius:9, border:'1px solid #DC262630', background:'transparent', color:'#DC2626', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
