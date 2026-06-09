/**
 * OfflineBanner — Shows when offline + pending sync items
 * Displays at bottom of screen when no internet connection
 */
import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { isOnline, onNetworkChange, getSyncQueue, syncOfflineQueue } from '../utils/offlineStore';

export default function OfflineBanner() {
  const [online, setOnline]     = useState(isOnline());
  const [queue, setQueue]       = useState([]);
  const [syncing, setSyncing]   = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const cleanup = onNetworkChange(setOnline);
    const loadQueue = async () => setQueue(await getSyncQueue());
    loadQueue();
    const interval = setInterval(loadQueue, 10000);
    return () => { cleanup(); clearInterval(interval); };
  }, []);

  // Auto-sync when back online
  useEffect(() => {
    if (online && queue.length > 0) {
      handleSync();
    }
  }, [online]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
      await syncOfflineQueue(token);
      setQueue([]);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    } catch(e) { console.error('Sync failed:', e); }
    setSyncing(false);
  };

  if (online && queue.length === 0 && !justSynced) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 12,
      background: justSynced ? '#C8E20A' : online ? '#1A1A1A' : '#1A1A1A',
      color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
      transition: 'all 0.3s ease',
      maxWidth: 'calc(100vw - 32px)',
    }}>
      {justSynced ? (
        <><CheckCircle size={15} /> Changes synced successfully!</>
      ) : !online ? (
        <>
          <WifiOff size={15} />
          <span>You're offline — quotes save locally</span>
          {queue.length > 0 && <span style={{ opacity: 0.7, fontSize: 11 }}>({queue.length} pending)</span>}
        </>
      ) : queue.length > 0 ? (
        <>
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'Syncing...' : `${queue.length} unsaved change${queue.length > 1 ? 's' : ''}`}</span>
          {!syncing && (
            <button onClick={handleSync}
              style={{ marginLeft: 4, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Sync now
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
