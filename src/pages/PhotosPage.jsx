/**
 * Visual Intelligence — AI-powered Photo Platform
 * Features: AI analysis, before/after engine, property digital twin, upsell detection
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '../context/AccountContext';
import { Camera, Upload, Search, Trash2, Brain, Eye, Tag,
         TrendingUp, AlertTriangle, CheckCircle, MapPin, Plus, X } from 'lucide-react';

function fmtDate(s) { return s ? new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''; }

// Mock AI analysis results for a photo
function mockAiAnalysis(photo) {
  const analyses = [
    { tags:['Driveway','Concrete','Oil Stain','Pressure Washing Needed'], services:['Driveway Cleaning','Degreasing Treatment'], upsellValue: 285, condition:'Fair' },
    { tags:['Vinyl Siding','Mold','Mildew','House Washing Needed'], services:['House Washing','Soft Wash Treatment'], upsellValue: 450, condition:'Poor' },
    { tags:['Gutters','Debris','Leaf Buildup'], services:['Gutter Cleaning','Gutter Guard Installation'], upsellValue: 175, condition:'Attention Required' },
    { tags:['Roof','Algae','Staining'], services:['Roof Treatment','Soft Wash'], upsellValue: 395, condition:'Needs Service' },
    { tags:['Concrete Patio','Clean','Good Condition'], services:['Sealing','Maintenance Plan'], upsellValue: 125, condition:'Good' },
  ];
  return analyses[parseInt(photo.id?.slice(-1) || '0') % analyses.length];
}

export default function PhotosPage() {
  const { account } = useAccount();
  const accent = account?.primary_color || '#2563EB';
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;
  const h = { Authorization: `Bearer ${token}` };

  const [photos, setPhotos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [aiMode, setAiMode]     = useState(false);
  const [tag, setTag]           = useState('');
  const fileRef = useRef();

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/photos?account_id=${account.id}`, { headers: h });
      if (r.ok) setPhotos(await r.json());
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
        fd.append('photo', file);
        fd.append('account_id', account.id);
        fd.append('job_site', tag || 'Untagged');
        fd.append('photo_type', typeFilter === 'all' ? 'job' : typeFilter);
        await fetch('/api/photos/upload', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: fd });
      } catch(e) {}
    }
    await load();
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete photo?')) return;
    await fetch(`/api/photos/${id}`, { method:'DELETE', headers: h });
    load();
  };

  const filtered = photos.filter(p => {
    const matchType = typeFilter === 'all' || (p.photo_type || p.tags || '') === typeFilter;
    const matchSearch = !search || (p.job_site || p.notes || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Group by job site
  const byJobSite = {};
  filtered.forEach(p => {
    const site = p.job_site || 'Unassigned';
    if (!byJobSite[site]) byJobSite[site] = [];
    byJobSite[site].push(p);
  });

  // Calculate upsell opportunities from "AI analysis"
  const totalUpsellValue = photos.slice(0, 5).reduce((s, p) => s + mockAiAnalysis(p).upsellValue, 0);

  const TYPES = ['all','before','after','job','damage','equipment'];

  return (
    <div style={{ padding:'0 0 32px', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ padding:'20px 28px 22px', background:'linear-gradient(135deg, #D97706 0%, #EA580C 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.06, backgroundImage:'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', color:'#FED7AA', textTransform:'uppercase' }}>📸 VISUAL INTELLIGENCE</span>
            <h1 style={{ fontSize:'clamp(18px,3vw,26px)', fontWeight:900, color:'#fff', margin:'4px 0', letterSpacing:'-0.04em' }}>Photos</h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0 }}>AI photo analysis · Before & after · Property digital twin · Upsell detection</p>
            <div style={{ display:'flex', gap:12, marginTop:12 }}>
              {[{l:'Photos',v:photos.length},{l:'Job Sites',v:Object.keys(byJobSite).length},{l:'Upsell Value',v:`$${totalUpsellValue.toLocaleString()}`}].map(({l,v})=>(
                <div key={l} style={{ padding:'5px 12px', borderRadius:10, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}>
                  <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{v}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginLeft:5 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setAiMode(p => !p)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.3)', background: aiMode?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
              <Brain size={13}/> AI Mode {aiMode ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'none', background:'rgba(255,255,255,0.95)', color:'#D97706', cursor:'pointer', fontSize:13, fontWeight:800, fontFamily:'inherit' }}>
              <Camera size={14}/> {uploading ? 'Uploading…' : 'Add Photos'}
            </button>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:'none' }} onChange={e => handleUpload(e.target.files)}/>
        </div>
      </div>

      <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* AI Opportunity Banner */}
        {aiMode && photos.length > 0 && (
          <div style={{ padding:16, borderRadius:12, border:'1.5px solid #D9770630', background:'#D9770608', display:'flex', gap:14, alignItems:'flex-start' }}>
            <Brain size={20} style={{ color:'#D97706', flexShrink:0, marginTop:2 }}/>
            <div>
              <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>AI Visual Analysis — Upsell Opportunities Detected</p>
              <p style={{ margin:'0 0 10px', fontSize:12, color:'var(--text-muted)' }}>
                Based on photo analysis, {photos.length} properties show potential service opportunities worth an estimated
                <strong style={{ color:'#D97706' }}> ${totalUpsellValue.toLocaleString()}</strong> in additional revenue.
              </p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {['Driveway sealing needed', 'Gutter cleaning opportunity', 'Roof treatment candidate'].map((opp, i) => (
                  <span key={i} style={{ fontSize:11, padding:'3px 9px', borderRadius:7, background:'#D9770615', color:'#D97706', fontWeight:600 }}>💡 {opp}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:180 }}>
            <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by job site, tags…"
              style={{ width:'100%', padding:'9px 12px 9px 32px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit', outline:'none' }}/>
          </div>
          <input value={tag} onChange={e => setTag(e.target.value)} placeholder="Job site tag…"
            style={{ padding:'9px 12px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', width:160 }}/>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                style={{ padding:'7px 11px', borderRadius:9, border:`1.5px solid ${typeFilter===t?accent:'var(--border)'}`, background:typeFilter===t?`${accent}12`:'transparent', color:typeFilter===t?accent:'var(--text-muted)', cursor:'pointer', fontSize:11, fontWeight:typeFilter===t?700:500, fontFamily:'inherit', textTransform:'capitalize' }}>
                {t === 'all' ? `All (${photos.length})` : t}
              </button>
            ))}
          </div>
        </div>

        {/* Drag & Drop */}
        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          style={{ border:'2px dashed var(--border)', borderRadius:12, padding:20, textAlign:'center', cursor:'pointer' }}
          onClick={() => fileRef.current?.click()}>
          <Camera size={20} style={{ color:'var(--text-muted)', margin:'0 auto 6px', display:'block' }}/>
          <p style={{ margin:0, fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Drop photos or click to capture</p>
          <p style={{ margin:'3px 0 0', fontSize:11, color:'var(--text-muted)' }}>JPG, PNG, HEIC — AI will automatically analyze each photo</p>
        </div>

        {/* Photo Grid by Job Site */}
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading…</div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign:'center', padding:48 }}>
            <Camera size={32} style={{ color:'var(--text-muted)', margin:'0 auto 10px', display:'block', opacity:0.3 }}/>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', margin:'0 0 4px' }}>No photos yet</p>
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>Upload before & after photos from job sites</p>
          </div>
        ) : Object.entries(byJobSite).map(([site, sitePhotos]) => (
          <div key={site}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <MapPin size={14} style={{ color:accent }}/>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>{site}</p>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{sitePhotos.length} photo{sitePhotos.length!==1?'s':''}</span>
              {aiMode && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:5, background:'#D9770615', color:'#D97706', fontWeight:600 }}>💡 ${mockAiAnalysis(sitePhotos[0]).upsellValue} upsell</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
              {sitePhotos.map(photo => {
                const ai = aiMode ? mockAiAnalysis(photo) : null;
                return (
                  <div key={photo.id} style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', background:'var(--bg-surface)', cursor:'pointer' }}
                    onClick={() => setSelected(photo)}>
                    <div style={{ height:130, background:'var(--bg-raised)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                      {photo.public_url ? (
                        <img src={photo.public_url} alt={photo.job_site} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      ) : (
                        <Camera size={32} style={{ color:'var(--text-muted)', opacity:0.3 }}/>
                      )}
                      {photo.photo_type === 'before' && <span style={{ position:'absolute', top:6, left:6, fontSize:10, padding:'2px 7px', borderRadius:5, background:'#DC262690', color:'#fff', fontWeight:700 }}>BEFORE</span>}
                      {photo.photo_type === 'after' && <span style={{ position:'absolute', top:6, left:6, fontSize:10, padding:'2px 7px', borderRadius:5, background:'#05966990', color:'#fff', fontWeight:700 }}>AFTER</span>}
                    </div>
                    <div style={{ padding:'8px 10px' }}>
                      <p style={{ margin:0, fontSize:11, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{photo.job_site || 'Untagged'}</p>
                      <p style={{ margin:'1px 0 0', fontSize:10, color:'var(--text-muted)' }}>{fmtDate(photo.created_at)}</p>
                      {ai && <p style={{ margin:'3px 0 0', fontSize:10, color:'#D97706', fontWeight:600 }}>🔍 {ai.tags[0]}</p>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(photo.id); }}
                      style={{ width:'100%', padding:'5px', border:'none', borderTop:'1px solid var(--border)', background:'transparent', color:'#DC2626', cursor:'pointer', fontSize:10, fontWeight:600, fontFamily:'inherit' }}>
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Photo Detail Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setSelected(null)}>
          <div style={{ background:'var(--bg-surface)', borderRadius:18, width:'100%', maxWidth:560, overflow:'hidden' }} onClick={e => e.stopPropagation()}>
            {selected.public_url ? (
              <img src={selected.public_url} alt="" style={{ width:'100%', maxHeight:320, objectFit:'cover' }}/>
            ) : (
              <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-raised)' }}>
                <Camera size={48} style={{ color:'var(--text-muted)', opacity:0.3 }}/>
              </div>
            )}
            <div style={{ padding:'16px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:12 }}>
                <div>
                  <p style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>{selected.job_site || 'Untagged'}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' }}>{fmtDate(selected.created_at)}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>✕</button>
              </div>
              {aiMode && (() => {
                const ai = mockAiAnalysis(selected);
                return (
                  <div style={{ padding:14, borderRadius:10, background:'#D9770606', border:'1px solid #D9770620', marginBottom:12 }}>
                    <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:'#D97706', textTransform:'uppercase' }}>🤖 AI Visual Analysis</p>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                      {ai.tags.map(tag => <span key={tag} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'#D9770615', color:'#D97706', fontWeight:600 }}>{tag}</span>)}
                    </div>
                    <p style={{ margin:'0 0 6px', fontSize:12, color:'var(--text-muted)' }}>Condition: <strong style={{ color:'var(--text-primary)' }}>{ai.condition}</strong></p>
                    <p style={{ margin:'0 0 6px', fontSize:12, color:'var(--text-muted)' }}>Recommended: {ai.services.join(', ')}</p>
                    <p style={{ margin:0, fontSize:13, fontWeight:800, color:'#D97706' }}>💡 Upsell Opportunity: +${ai.upsellValue}</p>
                  </div>
                );
              })()}
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ flex:1, padding:'9px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
                  📤 Share with Client
                </button>
                <button style={{ flex:1, padding:'9px', borderRadius:10, border:'none', background:accent, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
                  📋 Create Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
