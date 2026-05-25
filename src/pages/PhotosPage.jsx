/**
 * Photo Capture & Storage — job site photos tagged to jobs
 * Mobile-first: camera capture, photo grid, job-site organization
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '../context/AccountContext';
import { Camera, Image, Upload, MapPin, Trash2, Plus, Search, Tag, X } from 'lucide-react';

function fmtDate(s) { if (!s) return ''; return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}); }

export default function PhotosPage() {
  const { account } = useAccount();
  const [photos,   setPhotos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [jobFilter,setJobFilter]= useState('all');
  const [selected, setSelected] = useState(null);
  const [uploading,setUploading]= useState(false);
  const [tag,      setTag]      = useState('');
  const fileRef = useRef();
  const token = JSON.parse(localStorage.getItem('plex_auth_session')||'{}')?.access_token;

  const load = useCallback(async () => {
    if (!account?.id) return;
    try {
      const res = await fetch(`/api/photos?account_id=${account.id}`, { headers:{ Authorization:`Bearer ${token}` } });
      if (res.ok) setPhotos(await res.json());
    } catch {}
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const form = new FormData();
      form.append('photo', file);
      form.append('account_id', account.id);
      form.append('job_site', tag || 'Untagged');
      try {
        const res = await fetch('/api/photos', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:form });
        if (res.ok) { const p = await res.json(); setPhotos(ph => [p,...ph]); }
      } catch {}
    }
    setUploading(false);
    fileRef.current.value = '';
  };

  const deletePhoto = async (id) => {
    if (!confirm('Delete this photo?')) return;
    await fetch(`/api/photos/${id}`,{ method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
    setPhotos(ph => ph.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const jobSites = ['all', ...new Set(photos.map(p => p.job_site).filter(Boolean))];
  const filtered = photos.filter(p => {
    const matchJob = jobFilter === 'all' || p.job_site === jobFilter;
    const matchSearch = !search || p.job_site?.toLowerCase().includes(search.toLowerCase()) || p.name?.toLowerCase().includes(search.toLowerCase());
    return matchJob && matchSearch;
  });

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'16px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em', display:'flex', alignItems:'center', gap:10 }}>
            <Camera size={20} style={{ color:'#2563EB' }} /> Job Photos
          </h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>{photos.length} photos</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 16px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:11, fontSize:13, fontWeight:700, cursor:'pointer', opacity:uploading?0.6:1, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <Camera size={14} /> {uploading ? 'Uploading…' : 'Add photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display:'none' }} onChange={handleUpload} />
        </div>
      </div>

      {/* Tag input */}
      <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1 }}>
          <Tag size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input value={tag} onChange={e => setTag(e.target.value)} placeholder="Tag photos with a job site name…"
            className="field" style={{ paddingLeft:38, fontSize:13 }} />
        </div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by job site…"
          className="field" style={{ paddingLeft:38, fontSize:13 }} />
      </div>

      {/* Job site chips */}
      {jobSites.length > 1 && (
        <div className="chip-row mb-4">
          {jobSites.map(j => (
            <button key={j} onClick={() => setJobFilter(j)}
              style={{ flexShrink:0, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, border:`1.5px solid ${jobFilter===j?'var(--blue)':'var(--border)'}`, background: jobFilter===j?'var(--blue)':'var(--bg-surface)', color:jobFilter===j?'#fff':'var(--text-secondary)', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.15s', textTransform:'capitalize' }}>
              <MapPin size={10} style={{ marginRight:4 }} />{j}
            </button>
          ))}
        </div>
      )}

      {/* Photo grid */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[0,1,2,3,4,5].map(i => <div key={i} style={{ aspectRatio:'1', borderRadius:12, background:'var(--bg-raised)', animation:'pulse 1.5s ease infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glow-card" style={{ padding:'48px 24px', textAlign:'center' }}>
          <Image size={40} style={{ color:'var(--text-muted)', margin:'0 auto 12px' }} />
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>No photos yet</p>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Take or upload photos from job sites. Tag them to keep organized.</p>
          <button onClick={() => fileRef.current?.click()}
            style={{ padding:'10px 20px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            Add first photo
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(140px,calc(33vw - 12px)),1fr))', gap:8 }}>
          {filtered.map(photo => (
            <div key={photo.id} onClick={() => setSelected(photo)}
              style={{ aspectRatio:'1', borderRadius:12, overflow:'hidden', position:'relative', cursor:'pointer', background:'var(--bg-raised)', border:'1px solid var(--border)' }}>
              {photo.url
                ? <img src={photo.url} alt={photo.job_site||'Photo'} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Image size={24} style={{ color:'var(--text-muted)' }}/></div>
              }
              {photo.job_site && (
                <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(11,18,32,0.8))', padding:'20px 8px 6px' }}>
                  <p style={{ fontSize:10, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{photo.job_site}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo detail modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,18,32,0.9)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setSelected(null)}>
          <div style={{ position:'relative', maxWidth:600, width:'100%' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} style={{ position:'absolute', top:-44, right:0, background:'rgba(255,255,255,0.1)', border:'none', borderRadius:9, padding:'8px 12px', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
              <X size={14}/> Close
            </button>
            {selected.url
              ? <img src={selected.url} alt={selected.job_site} style={{ width:'100%', borderRadius:14, maxHeight:'70dvh', objectFit:'contain' }} />
              : <div style={{ width:'100%', height:300, borderRadius:14, background:'var(--bg-surface)', display:'flex', alignItems:'center', justifyContent:'center' }}><Image size={48} style={{ color:'var(--text-muted)' }}/></div>
            }
            <div style={{ background:'var(--bg-surface)', borderRadius:'0 0 14px 14px', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{selected.job_site||'Untagged'}</p>
                <p style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtDate(selected.created_at)}</p>
              </div>
              <button onClick={() => deletePhoto(selected.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:9, color:'#DC2626', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                <Trash2 size={13}/> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
