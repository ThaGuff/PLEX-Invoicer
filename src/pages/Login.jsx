import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Zap, CheckCircle, ArrowRight, Mail } from 'lucide-react';

const ACCENT = '#13B5EA';
const DARK   = '#1a1a1a';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.4 0 663 0 541.8c0-207.8 136.5-317.5 271-317.5 67.9 0 124.3 44.4 167.4 44.4 40.8 0 105.3-46.7 179.4-46.7zm-165.3-57.6c-3.8 18.3-14.4 65.7-48.4 98.5-33.3 32.8-74.5 41.3-97.2 44.4-0.6-2.6-1.3-6.4-1.3-11.5 0-59 38.4-126.5 78.4-153.7 24.5-16.5 63.9-30.3 90.8-30.3 1.9 0 3.8.6 5.8.6-2.6 26-10.3 53.2-28.1 52z"/>
    </svg>
  );
}

const FEATURES = [
  'Quotes that convert — shareable, branded, client-accepted',
  'Invoices with Stripe payment links built in',
  'Automatic payment reminders — stop chasing clients',
  'Client address book with autocomplete',
  'Revenue dashboard: collected, outstanding, overdue',
  'PDF export with your brand colors and logo',
];

export default function Login() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handle = async (label, fn) => {
    setLoading(label);
    setError('');
    setSuccess('');
    try {
      const result = await fn();
      if (result?.error) {
        setError(result.error.message || String(result.error));
      } else if (mode === 'reset') {
        setSuccess('Password reset email sent — check your inbox.');
      } else if (mode === 'signup') {
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('login');
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      setError(e.message || 'Something went wrong');
    }
    setLoading('');
  };

  const handleGoogle  = () => handle('google', signInWithGoogle);
  const handleApple   = () => handle('apple',  signInWithApple);
  const handleEmail   = () => {
    if (mode === 'reset') return handle('email', () => resetPassword(email));
    if (mode === 'signup') return handle('email', () => signUpWithEmail(email, password, fullName));
    return handle('email', () => signInWithEmail(email, password));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#FFFFFF' }}>

      {/* LEFT — branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-10"
        style={{ background: DARK }}>
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg"
              style={{ background: ACCENT }}>P</div>
            <div>
              <p className="font-bold text-white text-lg leading-none">PLEX</p>
              <p className="text-xs font-medium" style={{ color: ACCENT }}>Automation</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
            Quote. Invoice. <span style={{ color: ACCENT }}>Get paid.</span>
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#9ca3af' }}>
            A clean, fast quote and invoice tool built for service businesses.
            No bloat. No accounting complexity. Just the essentials — done right.
          </p>

          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#d1d5db' }}>
                <CheckCircle size={15} className="shrink-0 mt-0.5" style={{ color: ACCENT }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <p className="text-xs" style={{ color: '#6b7280' }}>
            © {new Date().getFullYear()} PLEX Automation · plexautomation.io
          </p>
          <div className="flex gap-4 mt-2">
            <a href="https://plexautomation.io/terms" target="_blank" rel="noreferrer"
              className="text-xs hover:underline" style={{ color: '#6b7280' }}>Terms</a>
            <a href="https://plexautomation.io/privacy" target="_blank" rel="noreferrer"
              className="text-xs hover:underline" style={{ color: '#6b7280' }}>Privacy</a>
            <a href="mailto:hello@plexautomation.io"
              className="text-xs hover:underline" style={{ color: '#6b7280' }}>Support</a>
          </div>
        </div>
      </div>

      {/* RIGHT — auth form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 min-h-screen">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ background: ACCENT }}>P</div>
          <span className="font-bold text-ink text-base">PLEX Automation</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Mode tabs */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink mb-1">
              {mode === 'login'  && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset'  && 'Reset password'}
            </h2>
            <p className="text-sm text-ink-muted">
              {mode === 'login'  && "Sign in to your PLEX Invoicer account"}
              {mode === 'signup' && "Start your 14-day free trial — no credit card required"}
              {mode === 'reset'  && "We'll send you a link to reset your password"}
            </p>
          </div>

          {/* OAuth buttons — only for login/signup */}
          {mode !== 'reset' && (
            <div className="space-y-3 mb-5">
              <button onClick={handleGoogle} disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: '#E5E8EB', color: DARK }}>
                <GoogleIcon />
                {loading === 'google' ? 'Redirecting…' : `Continue with Google`}
              </button>
              <button onClick={handleApple} disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ background: DARK, color: '#fff' }}>
                <AppleIcon />
                {loading === 'apple' ? 'Redirecting…' : `Continue with Apple`}
              </button>
            </div>
          )}

          {/* Divider */}
          {mode !== 'reset' && (
            <div className="relative flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: '#E5E8EB' }} />
              <span className="text-xs text-ink-muted shrink-0">or continue with email</span>
              <div className="flex-1 h-px" style={{ background: '#E5E8EB' }} />
            </div>
          )}

          {/* Email form */}
          <div className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ryan Guffey"
                  className="field"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="hello@yourbusiness.com"
                className="field"
                autoComplete="email"
                onKeyDown={e => e.key === 'Enter' && handleEmail()}
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                    className="field pr-10"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    onKeyDown={e => e.key === 'Enter' && handleEmail()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {mode === 'login' && (
                  <button
                    onClick={() => setMode('reset')}
                    className="mt-1 text-xs font-medium"
                    style={{ color: ACCENT }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="px-3 py-2.5 rounded-lg text-xs text-red-700 bg-red-50 border border-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="px-3 py-2.5 rounded-lg text-xs text-green-700 bg-green-50 border border-green-200 flex items-start gap-2">
                <CheckCircle size={13} className="shrink-0 mt-0.5" />
                {success}
              </div>
            )}

            <button
              onClick={handleEmail}
              disabled={!!loading || !email || (mode !== 'reset' && !password)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: ACCENT }}
            >
              <Mail size={15} />
              {loading === 'email' ? 'Please wait…' :
               mode === 'reset'  ? 'Send reset link' :
               mode === 'signup' ? 'Create account' :
               'Sign in'}
              {!loading && <ArrowRight size={14} />}
            </button>
          </div>

          {/* Switch mode */}
          <div className="mt-6 text-center text-sm text-ink-muted">
            {mode === 'login' && (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                  className="font-semibold" style={{ color: ACCENT }}>
                  Sign up free
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="font-semibold" style={{ color: ACCENT }}>
                  Sign in
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="font-semibold" style={{ color: ACCENT }}>
                ← Back to sign in
              </button>
            )}
          </div>

          {/* TOS */}
          {mode === 'signup' && (
            <p className="mt-4 text-center text-xs text-ink-muted">
              By creating an account you agree to our{' '}
              <a href="https://plexautomation.io/terms" target="_blank" rel="noreferrer"
                className="underline hover:text-ink">Terms of Service</a>
              {' '}and{' '}
              <a href="https://plexautomation.io/privacy" target="_blank" rel="noreferrer"
                className="underline hover:text-ink">Privacy Policy</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
