/**
 * InstallPWA — shows an "Install app" button when the browser fires
 * the beforeinstallprompt event (Chrome/Android) or shows iOS
 * "Add to Home Screen" instructions on Safari.
 */
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export default function InstallPWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => !!sessionStorage.getItem('pwa-dismissed')
  );

  useEffect(() => {
    // Already installed
    if (isInStandaloneMode()) return;

    // iOS: show manual instructions
    if (isIOS()) {
      // Only show after 30 seconds (don't be annoying on first visit)
      const t = setTimeout(() => setShowIOS(true), 30000);
      return () => clearTimeout(t);
    }

    // Android/Chrome: listen for install prompt
    const handler = () => setCanInstall(true);
    window.addEventListener('pwa-installable', handler);

    // Already deferred
    if (window.__pwaInstallPrompt) setCanInstall(true);

    return () => window.removeEventListener('pwa-installable', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = window.__pwaInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
      window.__pwaInstallPrompt = null;
    }
  };

  const dismiss = () => {
    setDismissed(true);
    setCanInstall(false);
    setShowIOS(false);
    sessionStorage.setItem('pwa-dismissed', '1');
  };

  if (dismissed) return null;

  // Android/Chrome install banner
  if (canInstall) return (
    <div style={{ position:'fixed', bottom:'calc(80px + env(safe-area-inset-bottom))', left:12, right:12, zIndex:150, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:16, padding:'14px 16px', boxShadow:'0 8px 32px rgba(11,18,32,0.2)', display:'flex', alignItems:'center', gap:12, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ width:40, height:40, borderRadius:11, background:'linear-gradient(135deg,#2563EB,#0D9488)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Smartphone size={20} color="#fff" />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:1 }}>Install Revanew</p>
        <p style={{ fontSize:11, color:'var(--text-muted)' }}>Add to home screen for the best experience</p>
      </div>
      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
        <button onClick={handleInstall}
          style={{ padding:'7px 14px', background:'linear-gradient(135deg,#2563EB,#0D9488)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          Install
        </button>
        <button onClick={dismiss}
          style={{ width:30, height:30, background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );

  // iOS instructions
  if (showIOS) return (
    <div style={{ position:'fixed', bottom:'calc(80px + env(safe-area-inset-bottom))', left:12, right:12, zIndex:150, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:16, padding:'16px', boxShadow:'0 8px 32px rgba(11,18,32,0.2)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#2563EB,#0D9488)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Download size={17} color="#fff" />
          </div>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Install Revanew</p>
        </div>
        <button onClick={dismiss} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>
          <X size={15} />
        </button>
      </div>
      <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>
        Tap the <strong style={{ color:'#2563EB' }}>Share button</strong> <span style={{ fontSize:14 }}>⎙</span> at the bottom of Safari, then select <strong style={{ color:'#2563EB' }}>"Add to Home Screen"</strong> to install Revanew as an app.
      </p>
    </div>
  );

  return null;
}
