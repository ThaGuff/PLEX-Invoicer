/**
 * usePushNotifications — subscribes to web push, stores in DB
 * Usage: const { enabled, enable, disable } = usePushNotifications();
 */
import { useState, useEffect } from 'react';
import { useAccount } from '../context/AccountContext';

const STORAGE_KEY = 'invoiceking_push_sub';

export function usePushNotifications() {
  const { account } = useAccount();
  const [enabled, setEnabled]   = useState(false);
  const [supported, setSupported] = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    // Check if already subscribed
    setEnabled(!!localStorage.getItem(STORAGE_KEY));
  }, []);

  const getToken = () =>
    JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;

  const enable = async () => {
    if (!supported || loading) return;
    setLoading(true);
    try {
      // Get VAPID public key
      const keyRes = await fetch('/api/notifications/vapid-public-key');
      if (!keyRes.ok) throw new Error('Push not configured on server');
      const { publicKey } = await keyRes.json();

      // Request permission
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Permission denied');

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ subscription: sub.toJSON(), account_id: account?.id }),
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sub.toJSON()));
      setEnabled(true);
    } catch (e) {
      console.error('Push subscribe failed:', e.message);
    }
    setLoading(false);
  };

  const disable = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ endpoint }),
        });
      }
      localStorage.removeItem(STORAGE_KEY);
      setEnabled(false);
    } catch (e) {
      console.error('Push unsubscribe failed:', e.message);
    }
    setLoading(false);
  };

  return { enabled, supported, loading, enable, disable };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
