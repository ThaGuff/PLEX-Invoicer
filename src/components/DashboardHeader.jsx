/**
 * DashboardHeader — Sleek branded header with live clock, greeting, and stat pills
 * Design: glassmorphic gradient bar with accent-colored accents
 */
import React, { useState, useEffect } from 'react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { word: 'Good morning', emoji: '☀️' };
  if (h < 17) return { word: 'Good afternoon', emoji: '🌤️' };
  if (h < 21) return { word: 'Good evening', emoji: '🌆' };
  return { word: 'Working late', emoji: '🌙' };
}

export default function DashboardHeader({ account, accent = '#C6E404' }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const greeting = getGreeting();
  const ownerFirst = account?.technician_name?.split(' ')[0] ||
                     account?.name?.split(' ')[0] || '';

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
  });

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  // Parse hex to rgb for gradient
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  };
  const rgb = hexToRgb(accent.startsWith('#') ? accent : '#C6E404');

  return (
    <div style={{
      position: 'relative',
      borderRadius: 18,
      overflow: 'hidden',
      background: 'var(--bg-surface)',
      border: `1px solid rgba(${rgb},0.2)`,
      backdropFilter: 'blur(12px)',
      padding: '20px clamp(12px,4vw,24px)',
    }}>

      {/* Subtle animated accent orb */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 140, height: 140, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${rgb},0.15) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

        {/* Left: Greeting + business name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo / initial */}
          {account?.logo_url ? (
            <img src={account.logo_url} alt="" style={{
              width: 44, height: 44, borderRadius: 12,
              objectFit: 'contain', background: '#fff',
              padding: 4, boxShadow: `0 4px 14px rgba(${rgb},0.25)`, flexShrink: 0
            }} />
          ) : (
            <img
              src="/logo-invoiceking.png"
              alt="Invoice King"
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                objectFit: 'contain',
                boxShadow: `0 4px 14px rgba(${rgb},0.3)`,
              }}
            />
          )}

          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: `rgba(${rgb},0.8)`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {greeting.emoji} {greeting.word}{ownerFirst ? `, ${ownerFirst}` : ''}
            </p>
            <h1 style={{
              margin: '3px 0 0', fontSize: 22, fontWeight: 800,
              color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              {account?.name || 'Dashboard'}
            </h1>
            {account?.company_tagline && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {account.company_tagline}
              </p>
            )}
          </div>
        </div>

        {/* Right: Live clock + date */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {/* Live time — large and prominent */}
          <p style={{
            margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
            color: `rgba(${rgb},0.9)`,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: "'Inter', ui-monospace, monospace",
            lineHeight: 1,
          }}>
            {timeStr.replace(':' + timeStr.split(':')[2], '')}{/* h:mm */}
            <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 4, color: `rgba(${rgb},0.6)` }}>
              {timeStr.split(' ')[1]}{/* AM/PM */}
            </span>
          </p>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
            {dateStr}
          </p>
          {/* Seconds ticker */}
          <p style={{ margin: '3px 0 0', fontSize: 10, color: `rgba(${rgb},0.4)`, fontFamily: 'ui-monospace', letterSpacing: '0.1em' }}>
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).split(':')[2]}s
          </p>
        </div>
      </div>
    </div>
  );
}
