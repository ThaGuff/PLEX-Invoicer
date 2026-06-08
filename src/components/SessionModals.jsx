import React, { useState } from 'react';
import { Shield, Clock, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#3DD68C';
const DARK   = '#1a1a1a';

// ── 1-minute idle warning banner ─────────────────────────────────
export function IdleWarningBanner({ onStayActive }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3 text-white text-sm font-medium shadow-lg"
      style={{ background: '#64748B' }}>
      <div className="flex items-center gap-2.5">
        <Clock size={16} className="shrink-0" />
        <span>You'll be signed out in 1 minute due to inactivity.</span>
      </div>
      <button
        onClick={onStayActive}
        className="ml-4 text-xs font-bold px-4 py-1.5 rounded-lg shrink-0"
        style={{ background: 'rgba(0,0,0,0.25)' }}>
        Stay signed in
      </button>
    </div>
  );
}

// ── Session expired — force re-login modal ────────────────────────
export function SessionExpiredModal() {
  const { signInWithGoogle, signInWithEmail, sessionExpired } = useAuth();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState('');
  const [error, setError]     = useState('');

  if (!sessionExpired) return null;

  const handleGoogle = async () => {
    setLoading('google');
    setError('');
    await signInWithGoogle();
    setLoading('');
  };

  const handleEmail = async () => {
    if (!email || !password) return;
    setLoading('email');
    setError('');
    const { error: err } = await signInWithEmail(email, password);
    if (err) setError(err.message || 'Sign-in failed');
    setLoading('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: ACCENT + '18' }}>
            <Shield size={26} style={{ color: ACCENT }} />
          </div>
          <h2 className="text-lg font-bold text-ink mb-1">Session expired</h2>
          <p className="text-sm text-ink-muted">
            You were signed out due to inactivity. Sign back in to continue — your work is saved.
          </p>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {/* Google */}
          <button onClick={handleGoogle} disabled={!!loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: '#E5E8EB', color: DARK }}>
            {loading === 'google'
              ? <RefreshCw size={15} className="animate-spin" />
              : <GoogleIcon />}
            {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#E5E8EB' }} />
            <span className="text-xs text-ink-muted shrink-0">or</span>
            <div className="flex-1 h-px" style={{ background: '#E5E8EB' }} />
          </div>

          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            className="field text-sm"
            autoComplete="email"
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="field text-sm pr-10"
              autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
            />
            <button onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          <button
            onClick={handleEmail}
            disabled={!!loading || !email || !password}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: ACCENT }}>
            {loading === 'email' ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
