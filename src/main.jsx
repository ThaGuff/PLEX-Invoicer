import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ── Register Service Worker ───────────────────────────────────────
// Runs on every page load so the SW activates regardless of entry route
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(reg => {
      console.log('[PWA] SW registered, scope:', reg.scope);
      // Check for updates in background
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — could show "Update available" toast here
            console.log('[PWA] New version available');
          }
        });
      });
    })
    .catch(err => console.warn('[PWA] SW registration failed:', err.message));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
