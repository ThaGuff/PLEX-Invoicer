import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowRight, CheckCircle, Shield, Zap, BarChart2 } from 'lucide-react';

/* ── Brand Logo ─────────────────────────────────────────────────── */
function RevanewLogo({ size = 40 }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <rect width="100" height="100" rx="22" fill="#0B1220"/>
      <defs>
        <linearGradient id="lg-r" x1="18" y1="12" x2="82" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D9488"/>
          <stop offset="50%" stopColor="#2563EB"/>
          <stop offset="100%" stopColor="#7C3AED"/>
        </linearGradient>
      </defs>
      <text x="12" y="80" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="80" fill="url(#lg-r)">R</text>
    </svg>
  );
}

/* ── App Illustration — SVG depicting quote/invoice workflow ────── */
function AppIllustration() {
  return (
    <svg viewBox="0 0 420 340" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', maxWidth:420, height:'auto' }}>
      <defs>
        <linearGradient id="il-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D9488" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.08"/>
        </linearGradient>
        <linearGradient id="il-grad" x1="0" y1="0" x2="420" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D9488"/>
          <stop offset="50%" stopColor="#2563EB"/>
          <stop offset="100%" stopColor="#7C3AED"/>
        </linearGradient>
        <linearGradient id="il-btn" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0D9488"/>
          <stop offset="100%" stopColor="#2563EB"/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity="0.25"/>
        </filter>
      </defs>

      {/* Background glow */}
      <ellipse cx="210" cy="170" rx="200" ry="140" fill="url(#il-g1)"/>

      {/* Main quote card */}
      <g filter="url(#shadow)">
        <rect x="40" y="30" width="240" height="180" rx="16" fill="#1C2130"/>
        <rect x="40" y="30" width="240" height="180" rx="16" stroke="#2E3A50" strokeWidth="1"/>
      </g>
      {/* Card header bar */}
      <rect x="40" y="30" width="240" height="44" rx="16" fill="#242B3D"/>
      <rect x="40" y="58" width="240" height="16" fill="#242B3D"/>
      {/* Header text placeholder */}
      <rect x="56" y="46" width="60" height="8" rx="4" fill="#2563EB" opacity="0.7"/>
      <rect x="228" y="44" width="36" height="12" rx="6" fill="url(#il-btn)"/>
      {/* Service rows */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x="56" y={90+i*30} width="10" height="10" rx="3" fill={i===0?"url(#il-grad)":"#2E3A50"} stroke={i===0?"none":"#2563EB"} strokeWidth="1.5"/>
          {i===0 && <path d={`M${58} ${96}l3 3l5-5`} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
          <rect x="72" y={92+i*30} width={80+i*15} height="6" rx="3" fill="#2E3A50"/>
          <rect x={230-i*8} y={92+i*30} width={28+i*5} height="6" rx="3" fill={i===0?"url(#il-btn)":"#2E3A50"} opacity="0.8"/>
        </g>
      ))}
      {/* Divider */}
      <line x1="56" y1="186" x2="264" y2="186" stroke="#2E3A50" strokeWidth="1"/>
      {/* Total */}
      <rect x="56" y="194" width="50" height="7" rx="3.5" fill="#2563EB" opacity="0.4"/>
      <rect x="216" y="192" width="48" height="10" rx="5" fill="url(#il-btn)"/>

      {/* Floating stat card 1 — Collected */}
      <g filter="url(#shadow)">
        <rect x="210" y="150" width="160" height="76" rx="12" fill="#1C2130" stroke="#2E3A50" strokeWidth="1"/>
      </g>
      <rect x="210" y="150" width="160" height="4" rx="2" fill="url(#il-grad)" opacity="0.8"/>
      <rect x="224" y="165" width="40" height="6" rx="3" fill="#2563EB" opacity="0.4"/>
      <rect x="224" y="178" width="65" height="16" rx="5" fill="none"/>
      <text x="224" y="192" fontFamily="system-ui" fontWeight="800" fontSize="20" fill="#EDF2FF">$24,755</text>
      <rect x="224" y="200" width="55" height="5" rx="2.5" fill="#2E3A50"/>
      <rect x="326" y="158" width="30" height="30" rx="9" fill="rgba(59,111,232,0.2)"/>
      <path d="M334 168 l7 0M334 173 l7 0M334 178 l4 0" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>

      {/* Floating notification */}
      <g filter="url(#shadow)">
        <rect x="260" y="40" width="148" height="60" rx="12" fill="#1C2130" stroke="#2E3A50" strokeWidth="1"/>
      </g>
      <rect x="276" y="56" width="18" height="18" rx="9" fill="rgba(0,201,177,0.2)"/>
      <path d="M281 65 l3 3 l6-6" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="302" y="56" width="72" height="7" rx="3.5" fill="#EDF2FF" opacity="0.8"/>
      <rect x="302" y="68" width="55" height="5" rx="2.5" fill="#2E3A50"/>

      {/* Connection lines */}
      <path d="M 284 108 Q 290 140 285 150" stroke="url(#il-grad)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
      <path d="M 280 210 Q 310 230 260 230" stroke="url(#il-grad)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>

      {/* Bottom mobile bar */}
      <g filter="url(#shadow)">
        <rect x="100" y="256" width="220" height="58" rx="16" fill="#1C2130" stroke="#2E3A50" strokeWidth="1"/>
      </g>
      {/* Mobile nav dots */}
      {[0,1,2,3,4].map(i => (
        <g key={i}>
          <rect x={120+i*40} y="269" width="20" height="20" rx="7" fill={i===1?"url(#il-btn)":"#242B3D"}/>
          <rect x={125+i*40} y="295" width="10" height="4" rx="2" fill={i===1?"#2563EB":"#2E3A50"} opacity="0.6"/>
        </g>
      ))}

      {/* Floating badge */}
      <g filter="url(#shadow)">
        <rect x="30" y="240" width="80" height="28" rx="14" fill="#1C2130" stroke="#2E3A50" strokeWidth="1"/>
      </g>
      <circle cx="48" cy="254" r="7" fill="rgba(0,201,177,0.2)"/>
      <circle cx="48" cy="254" r="4" fill="#0D9488"/>
      <rect x="60" y="249" width="36" height="5" rx="2.5" fill="#EDF2FF" opacity="0.7"/>
      <rect x="60" y="257" width="28" height="4" rx="2" fill="#2E3A50"/>
    </svg>
  );
}

/* ── OAuth buttons ──────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.4 0 663 0 541.8c0-207.8 136.5-317.5 271-317.5 67.9 0 124.3 44.4 167.4 44.4 40.8 0 105.3-46.7 179.4-46.7zm-165.3-57.6c-3.8 18.3-14.4 65.7-48.4 98.5-33.3 32.8-74.5 41.3-97.2 44.4-.6-2.6-1.3-6.4-1.3-11.5 0-59 38.4-126.5 78.4-153.7 24.5-16.5 63.9-30.3 90.8-30.3 1.9 0 3.8.6 5.8.6-2.6 26-10.3 53.2-28.1 52z"/>
    </svg>
  );
}

const FEATURES = [
  { icon: Zap,        text: 'Send professional quotes in under 60 seconds' },
  { icon: CheckCircle, text: 'E-sign, deposit collection, and instant acceptance' },
  { icon: BarChart2,  text: 'Track revenue, overdue invoices, and cash flow' },
  { icon: Shield,     text: 'AI-powered follow-ups that recover unpaid invoices' },
];

export default function Login() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode]       = useState('login');
  const [email, setEmail]     = useState('');
  const [password, setPw]     = useState('');
  const [fullName, setName]   = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const run = async (label, fn) => {
    setLoading(label); setError(''); setSuccess('');
    try {
      const res = await fn();
      if (res?.error) { setError(res.error.message || String(res.error)); }
      else if (mode === 'reset') { setSuccess('Reset link sent — check your email.'); }
      else if (mode === 'signup') {
        localStorage.setItem('revanew_new_user', '1');
        navigate('/billing?welcome=1');
      } else { navigate('/dashboard'); }
    } catch (e) { setError(e.message || 'Something went wrong'); }
    setLoading('');
  };

  const F = { fontFamily:"'Plus Jakarta Sans',sans-serif" };
  const inputStyle = (focused) => ({
    width:'100%', padding:'11px 14px', borderRadius:10,
    border: `1.5px solid ${focused ? '#2563EB' : '#1E2E48'}`,
    background:'#1C2130', color:'#EDF2FF', fontSize:14,
    fontFamily:"'Plus Jakarta Sans',sans-serif", outline:'none',
    boxSizing:'border-box', transition:'border-color 0.15s',
  });

  return (
    <div style={{ ...F, minHeight:'100dvh', background:'#0B1220', display:'flex', overflow:'hidden' }}>

      {/* ── LEFT PANEL ────────────────────────────────────────────── */}
      <div style={{ width:480, flexShrink:0, background:'#0F1628', borderRight:'1px solid #1E2E48', display:'flex', flexDirection:'column', padding:'40px 44px', minHeight:'100dvh' }}
        className="hidden lg:flex">

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:40 }}>
          <RevanewLogo size={44} />
          <div>
            <p style={{ fontSize:20, fontWeight:800, color:'#EDF2FF', letterSpacing:'-0.5px', lineHeight:1 }}>Revanew</p>
            <p style={{ fontSize:11, color:'#5E7494', fontWeight:500, marginTop:3 }}>Powered by PLEX Automation</p>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#EDF2FF', lineHeight:1.15, letterSpacing:'-0.04em', marginBottom:14 }}>
            Quotes. Invoices.{' '}
            <span style={{ background:'linear-gradient(135deg,#0D9488,#2563EB,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Get Paid.
            </span>
          </h1>
          <p style={{ fontSize:14, color:'#9AACCC', lineHeight:1.7 }}>
            The complete billing platform for service businesses — proposals, invoices, payments, and AI-powered follow-ups in one place.
          </p>
        </div>

        {/* Illustration */}
        <div style={{ marginBottom:32 }}>
          <AppIllustration />
        </div>

        {/* Feature list */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,rgba(0,201,177,0.15),rgba(59,111,232,0.15))', border:'1px solid rgba(59,111,232,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={14} style={{ color:'#2563EB' }} />
              </div>
              <span style={{ fontSize:13, color:'#9AACCC', lineHeight:1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop:'auto', paddingTop:20, borderTop:'1px solid #1E2E48' }}>
          <p style={{ fontSize:11, color:'#3A4A5C', marginBottom:10 }}>© {new Date().getFullYear()} Revanew. Powered by PLEX Automation.</p>
          <div style={{ display:'flex', gap:20 }}>
            {[['Privacy policy','https://plexautomation.io/privacy'],['Terms','https://plexautomation.io/terms'],['Support','mailto:hello@plexautomation.io']].map(([l,h]) => (
              <a key={l} href={h} target="_blank" rel="noreferrer"
                style={{ fontSize:11, color:'#3A4A5C', textDecoration:'none', fontWeight:500, transition:'color 0.15s' }}
                onMouseEnter={e => e.target.style.color='#9AACCC'}
                onMouseLeave={e => e.target.style.color='#3A4A5C'}>{l}</a>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Auth form ───────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px', minHeight:'100dvh', overflow:'auto' }}>

        {/* Mobile logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:36 }} className="lg:hidden">
          <RevanewLogo size={40} />
          <div>
            <p style={{ fontSize:18, fontWeight:800, color:'#EDF2FF', letterSpacing:'-0.5px', lineHeight:1 }}>Revanew</p>
            <p style={{ fontSize:11, color:'#5E7494', fontWeight:500, marginTop:2 }}>Quotes. Invoices. Get Paid.</p>
          </div>
        </div>

        <div style={{ width:'100%', maxWidth:380 }}>
          {/* Heading */}
          <div style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:24, fontWeight:800, color:'#EDF2FF', letterSpacing:'-0.04em', marginBottom:6 }}>
              {mode==='login' && 'Welcome back'}
              {mode==='signup' && 'Create your account'}
              {mode==='reset' && 'Reset password'}
            </h2>
            <p style={{ fontSize:14, color:'#5E7494', fontWeight:500 }}>
              {mode==='login' && 'Sign in to your Revanew workspace'}
              {mode==='signup' && '7-day free trial — no credit card required'}
              {mode==='reset' && "Enter your email and we'll send a reset link"}
            </p>
          </div>

          {/* OAuth — only login/signup */}
          {mode !== 'reset' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {[
                { label:'Continue with Google', icon:<GoogleIcon/>, action:()=>run('google',signInWithGoogle), key:'google', bg:'#1C2130' },
                { label:'Continue with Apple',  icon:<AppleIcon/>,  action:()=>run('apple',signInWithApple),   key:'apple',  bg:'#242B3D' },
              ].map(btn => (
                <button key={btn.key} onClick={btn.action} disabled={!!loading}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'12px', borderRadius:10, border:'1.5px solid #1E2E48', background:btn.bg, color:'#EDF2FF', fontSize:13, fontWeight:600, cursor:'pointer', opacity:loading?0.5:1, transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#2563EB'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#1E2E48'}>
                  {btn.icon} {loading===btn.key ? 'Redirecting…' : btn.label}
                </button>
              ))}
            </div>
          )}

          {mode !== 'reset' && (
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:'#1E2E48' }} />
              <span style={{ fontSize:11, color:'#3A4A5C', fontWeight:500, flexShrink:0 }}>or continue with email</span>
              <div style={{ flex:1, height:1, background:'#1E2E48' }} />
            </div>
          )}

          {/* Email form */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#5E7494', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Full name</label>
                <input value={fullName} onChange={e=>setName(e.target.value)} placeholder="Your full name" type="text" autoComplete="name"
                  style={inputStyle(false)}
                  onFocus={e=>e.target.style.borderColor='#2563EB'} onBlur={e=>e.target.style.borderColor='#1E2E48'} />
              </div>
            )}

            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#5E7494', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:6 }}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@yourbusiness.com" type="email" autoComplete="email"
                onKeyDown={e=>e.key==='Enter'&&run('email',mode==='reset'?()=>resetPassword(email):mode==='signup'?()=>signUpWithEmail(email,password,fullName):()=>signInWithEmail(email,password))}
                style={inputStyle(false)}
                onFocus={e=>e.target.style.borderColor='#2563EB'} onBlur={e=>e.target.style.borderColor='#1E2E48'} />
            </div>

            {mode !== 'reset' && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#5E7494', textTransform:'uppercase', letterSpacing:'0.8px' }}>Password</label>
                  {mode==='login' && (
                    <button onClick={()=>setMode('reset')} style={{ fontSize:11, fontWeight:600, color:'#2563EB', background:'none', border:'none', cursor:'pointer', ...F }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position:'relative' }}>
                  <input type={showPw?'text':'password'} value={password} onChange={e=>setPw(e.target.value)}
                    placeholder={mode==='signup'?'At least 8 characters':'••••••••'}
                    autoComplete={mode==='signup'?'new-password':'current-password'}
                    onKeyDown={e=>e.key==='Enter'&&run('email',mode==='signup'?()=>signUpWithEmail(email,password,fullName):()=>signInWithEmail(email,password))}
                    style={{ ...inputStyle(false), paddingRight:44 }}
                    onFocus={e=>e.target.style.borderColor='#2563EB'} onBlur={e=>e.target.style.borderColor='#1E2E48'} />
                  <button type="button" onClick={()=>setShowPw(v=>!v)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#3A4A5C', background:'none', border:'none', cursor:'pointer', padding:2 }}>
                    {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding:'10px 14px', borderRadius:10, fontSize:13, color:'#FCA5A5', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ padding:'10px 14px', borderRadius:10, fontSize:13, color:'#6EE7B7', background:'rgba(0,201,177,0.08)', border:'1px solid rgba(0,201,177,0.2)', display:'flex', alignItems:'center', gap:8 }}>
                <CheckCircle size={14} style={{ color:'#0D9488', flexShrink:0 }} /> {success}
              </div>
            )}

            <button
              onClick={() => run('email', mode==='reset'?()=>resetPassword(email):mode==='signup'?()=>signUpWithEmail(email,password,fullName):()=>signInWithEmail(email,password))}
              disabled={!!loading||!email||(mode!=='reset'&&!password)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#0D9488,#2563EB,#7C3AED)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(loading||!email||(mode!=='reset'&&!password))?0.45:1, transition:'all 0.15s', boxShadow:'0 6px 20px rgba(59,111,232,0.4)', ...F }}>
              {loading==='email'?'Please wait…':mode==='reset'?'Send reset link':mode==='signup'?'Create account':'Sign in'}
              {!loading && <ArrowRight size={15}/>}
            </button>
          </div>

          {/* Mode switcher */}
          <div style={{ marginTop:20, textAlign:'center', fontSize:14, color:'#5E7494' }}>
            {mode==='login' && <>No account?{' '}
              <button onClick={()=>{setMode('signup');setError('');setSuccess('');}}
                style={{ fontWeight:700, color:'#2563EB', background:'none', border:'none', cursor:'pointer', fontSize:14, ...F }}>
                Sign up free
              </button></>}
            {mode==='signup' && <>Already have an account?{' '}
              <button onClick={()=>{setMode('login');setError('');setSuccess('');}}
                style={{ fontWeight:700, color:'#2563EB', background:'none', border:'none', cursor:'pointer', fontSize:14, ...F }}>
                Sign in
              </button></>}
            {mode==='reset' && <button onClick={()=>{setMode('login');setError('');setSuccess('');}}
              style={{ fontWeight:700, color:'#2563EB', background:'none', border:'none', cursor:'pointer', fontSize:14, ...F }}>
              ← Back to sign in
            </button>}
          </div>

          {mode==='signup' && (
            <p style={{ marginTop:16, textAlign:'center', fontSize:11, color:'#3A4A5C', lineHeight:1.7 }}>
              By creating an account you agree to our{' '}
              <a href="https://plexautomation.io/terms" target="_blank" rel="noreferrer" style={{ color:'#2563EB', fontWeight:600, textDecoration:'none' }}>Terms</a>
              {' '}and{' '}
              <a href="https://plexautomation.io/privacy" target="_blank" rel="noreferrer" style={{ color:'#2563EB', fontWeight:600, textDecoration:'none' }}>Privacy policy</a>.
              <br/>Revanew is powered by PLEX Automation.
            </p>
          )}

          {/* Mobile footer links */}
          <div style={{ marginTop:28, display:'flex', justifyContent:'center', gap:20 }} className="lg:hidden">
            {[['Privacy','https://plexautomation.io/privacy'],['Terms','https://plexautomation.io/terms'],['Support','mailto:hello@plexautomation.io']].map(([l,h]) => (
              <a key={l} href={h} target="_blank" rel="noreferrer"
                style={{ fontSize:11, color:'#3A4A5C', textDecoration:'none', fontWeight:500 }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
