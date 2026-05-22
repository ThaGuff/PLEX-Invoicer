import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowRight, Mail, CheckCircle, Shield, Zap, BarChart2 } from 'lucide-react';

const LOGO_SVG = (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="100" height="100" rx="18" fill="#080D1A"/>
    <defs>
      <linearGradient id="rgrad-login" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00E5C8"/>
        <stop offset="50%" stopColor="#4B7BFF"/>
        <stop offset="100%" stopColor="#7B4FE8"/>
      </linearGradient>
    </defs>
    <text x="14" y="80" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="80" fill="url(#rgrad-login)">R</text>
  </svg>
);

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.4 0 663 0 541.8c0-207.8 136.5-317.5 271-317.5 67.9 0 124.3 44.4 167.4 44.4 40.8 0 105.3-46.7 179.4-46.7zm-165.3-57.6c-3.8 18.3-14.4 65.7-48.4 98.5-33.3 32.8-74.5 41.3-97.2 44.4-.6-2.6-1.3-6.4-1.3-11.5 0-59 38.4-126.5 78.4-153.7 24.5-16.5 63.9-30.3 90.8-30.3 1.9 0 3.8.6 5.8.6-2.6 26-10.3 53.2-28.1 52z"/>
    </svg>
  );
}

const FEATURES = [
  { icon: Zap,       text: 'Send branded quotes clients can accept online in seconds' },
  { icon: CheckCircle, text: 'Convert accepted quotes to invoices with one click' },
  { icon: BarChart2, text: 'Real-time revenue dashboard — collected, outstanding, overdue' },
  { icon: Shield,    text: 'Payment reminders, Stripe links, and client tracking built in' },
];

export default function Login() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const handle = async (label, fn) => {
    setLoading(label); setError(''); setSuccess('');
    try {
      const result = await fn();
      if (result?.error) {
        setError(result.error.message || String(result.error));
      } else if (mode === 'reset') {
        setSuccess('Reset link sent — check your inbox.');
      } else if (mode === 'signup') {
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('login');
      } else {
        if (mode === 'login') {
          navigate('/dashboard');
        } else {
          // New user — go to billing to select a plan first
          localStorage.setItem('revanew_new_user', '1');
          navigate('/billing?welcome=1');
        }
      }
    } catch (e) { setError(e.message || 'Something went wrong'); }
    setLoading('');
  };

  const handleGoogle = () => handle('google', signInWithGoogle);
  const handleApple  = () => handle('apple',  signInWithApple);
  const handleEmail  = () => {
    if (mode === 'reset')  return handle('email', () => resetPassword(email));
    if (mode === 'signup') return handle('email', () => signUpWithEmail(email, password, fullName));
    return handle('email', () => signInWithEmail(email, password));
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#080D1A', display: 'flex', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* LEFT PANEL — branding */}
      <div style={{ display: 'none', width: '440px', flexShrink: 0, padding: '40px', flexDirection: 'column', justifyContent: 'space-between', background: '#0D1526', borderRight: '0.5px solid #1A2640' }}
        className="lg:!flex">

        {/* Logo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            {LOGO_SVG}
            <div>
              <p style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1, letterSpacing: '-0.5px' }}>Revanew</p>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#3A5070', marginTop: '2px' }}>Powered by PLEX Automation</p>
            </div>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, marginBottom: '12px' }}>
            Quotes. Invoices.{' '}
            <span style={{ background: 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Get Paid.
            </span>
          </h1>
          <p style={{ fontSize: '13px', color: '#3A5070', lineHeight: 1.7, marginBottom: '36px' }}>
            The fastest way for service businesses to quote clients, collect payment, and track every dollar — without the accounting complexity.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  <Icon size={13} color="#FFFFFF" />
                </div>
                <span style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px' }}>
          <div style={{ height: '0.5px', background: '#1A2640', marginBottom: '20px' }} />
          <p style={{ fontSize: '11px', color: '#2A3A55', marginBottom: '8px' }}>
            © {new Date().getFullYear()} Revanew. Powered by PLEX Automation.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            {[
              { label: 'Privacy policy', href: 'https://plexautomation.io/privacy' },
              { label: 'Terms of service', href: 'https://plexautomation.io/terms' },
              { label: 'Support', href: 'mailto:hello@plexautomation.io' },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                style={{ fontSize: '11px', color: '#2A3A55', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={e => e.target.style.color = '#3A5070'}
                onMouseLeave={e => e.target.style.color = '#2A3A55'}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — auth form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', minHeight: '100dvh' }}>

        {/* Mobile logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }} className="lg:hidden">
          {LOGO_SVG}
          <div>
            <p style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px', lineHeight: 1 }}>Revanew</p>
            <p style={{ fontSize: '10px', color: '#3A5070', fontWeight: 500 }}>Quotes. Invoices. Get Paid.</p>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Heading */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px', letterSpacing: '-0.3px' }}>
              {mode === 'login'  && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset'  && 'Reset your password'}
            </h2>
            <p style={{ fontSize: '13px', color: '#3A5070', fontWeight: 500 }}>
              {mode === 'login'  && 'Sign in to your Revanew account'}
              {mode === 'signup' && '7-day free trial — no credit card required'}
              {mode === 'reset'  && "We'll send a reset link to your email"}
            </p>
          </div>

          {/* OAuth */}
          {mode !== 'reset' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <button onClick={handleGoogle} disabled={!!loading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '11px 16px', borderRadius: '8px', border: '0.5px solid #1A2640', background: '#0D1526', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: loading ? 0.5 : 1, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1A2640'}
                onMouseLeave={e => e.currentTarget.style.background = '#0D1526'}>
                <GoogleIcon />
                {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
              </button>
              <button onClick={handleApple} disabled={!!loading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '11px 16px', borderRadius: '8px', border: '0.5px solid #1A2640', background: '#1A2640', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: loading ? 0.5 : 1, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#243050'}
                onMouseLeave={e => e.currentTarget.style.background = '#1A2640'}>
                <AppleIcon />
                {loading === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
              </button>
            </div>
          )}

          {/* Divider */}
          {mode !== 'reset' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '0.5px', background: '#1A2640' }} />
              <span style={{ fontSize: '11px', color: '#2A3A55', fontWeight: 500, flexShrink: 0 }}>or continue with email</span>
              <div style={{ flex: 1, height: '0.5px', background: '#1A2640' }} />
            </div>
          )}

          {/* Email form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#3A5070', display: 'block', marginBottom: '4px' }}>Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name" autoComplete="name"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '0.5px solid #1A2640', background: '#0D1526', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#4B7BFF'}
                  onBlur={e => e.target.style.borderColor = '#1A2640'} />
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#3A5070', display: 'block', marginBottom: '4px' }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com" autoComplete="email"
                onKeyDown={e => e.key === 'Enter' && handleEmail()}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '0.5px solid #1A2640', background: '#0D1526', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#4B7BFF'}
                onBlur={e => e.target.style.borderColor = '#1A2640'} />
            </div>

            {mode !== 'reset' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#3A5070', display: 'block', marginBottom: '4px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    onKeyDown={e => e.key === 'Enter' && handleEmail()}
                    style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '0.5px solid #1A2640', background: '#0D1526', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#4B7BFF'}
                    onBlur={e => e.target.style.borderColor = '#1A2640'} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#2A3A55', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {mode === 'login' && (
                  <button onClick={() => setMode('reset')}
                    style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: '#4B7BFF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#FCA5A5', background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#6EE7B7', background: 'rgba(0,229,200,0.08)', border: '0.5px solid rgba(0,229,200,0.2)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle size={13} style={{ flexShrink: 0, marginTop: '1px', color: '#00E5C8' }} />
                {success}
              </div>
            )}

            {/* Submit */}
            <button onClick={handleEmail}
              disabled={!!loading || !email || (mode !== 'reset' && !password)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)', color: '#FFFFFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: (loading || !email || (mode !== 'reset' && !password)) ? 0.5 : 1, transition: 'all 0.15s' }}>
              <Mail size={14} />
              {loading === 'email' ? 'Please wait…' :
               mode === 'reset'  ? 'Send reset link' :
               mode === 'signup' ? 'Create account' : 'Sign in'}
              {!loading && <ArrowRight size={13} />}
            </button>
          </div>

          {/* Mode switch */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#3A5070' }}>
            {mode === 'login' && (
              <>No account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                  style={{ fontWeight: 700, color: '#4B7BFF', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Sign up free
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  style={{ fontWeight: 700, color: '#4B7BFF', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Sign in
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                style={{ fontWeight: 700, color: '#4B7BFF', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                ← Back to sign in
              </button>
            )}
          </div>

          {/* Privacy */}
          {mode === 'signup' && (
            <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: '#2A3A55', lineHeight: 1.6 }}>
              By creating an account you agree to our{' '}
              <a href="https://plexautomation.io/terms" target="_blank" rel="noreferrer"
                style={{ color: '#4B7BFF', fontWeight: 600, textDecoration: 'none' }}>Terms of service</a>
              {' '}and{' '}
              <a href="https://plexautomation.io/privacy" target="_blank" rel="noreferrer"
                style={{ color: '#4B7BFF', fontWeight: 600, textDecoration: 'none' }}>Privacy policy</a>.
              <br />Revanew is powered by PLEX Automation.
            </p>
          )}

          {/* Footer links - mobile */}
          <div style={{ marginTop: '32px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '16px' }} className="lg:hidden">
            {[
              { label: 'Privacy', href: 'https://plexautomation.io/privacy' },
              { label: 'Terms', href: 'https://plexautomation.io/terms' },
              { label: 'Support', href: 'mailto:hello@plexautomation.io' },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                style={{ fontSize: '11px', color: '#2A3A55', textDecoration: 'none', fontWeight: 500 }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
