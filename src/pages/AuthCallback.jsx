/**
 * AuthCallback — handles Supabase PKCE OAuth callback
 * Supabase redirects here with ?code=xxx after Google OAuth
 * We exchange the code for a session, then navigate to /dashboard
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { supabase } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code  = params.get('code');
      const errorParam = params.get('error');
      const errorDesc  = params.get('error_description');

      if (errorParam) {
        console.error('[AuthCallback] OAuth error:', errorParam, errorDesc);
        setError(errorDesc || errorParam);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        // No code — maybe already handled by Supabase detectSessionInUrl
        // Wait briefly then check session
        await new Promise(r => setTimeout(r, 500));
        navigate('/dashboard', { replace: true });
        return;
      }

      try {
        // Exchange PKCE code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('[AuthCallback] Exchange error:', exchangeError.message);
          setError(exchangeError.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        if (data?.session) {
          console.log('[AuthCallback] Session established for:', data.session.user?.email);
          // Check if this is a brand-new user (first OAuth sign-in)
          // by checking if they have any existing accounts
          try {
            const token = data.session.access_token;
            const accRes = await fetch('/api/accounts', { headers: { Authorization: `Bearer ${token}` } });
            const accs = await accRes.json();
            const isNewUser = !Array.isArray(accs) || accs.length === 0 ||
              (accs.length === 1 && accs[0].subscription_status === 'trialing' &&
               Math.abs(new Date() - new Date(accs[0].created_at)) < 60000); // created < 1 min ago
            if (isNewUser) {
              navigate('/billing?welcome=1', { replace: true });
              return;
            }
          } catch (e) { /* if check fails, just go to dashboard */ }
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } catch (e) {
        console.error('[AuthCallback] Unexpected error:', e.message);
        setError(e.message);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ textAlign:'center', padding:32 }}>
          <p style={{ fontSize:16, color:'#DC2626', marginBottom:16 }}>Login failed: {error}</p>
          <p style={{ fontSize:13, color:'#64748B' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #2563EB', borderTopColor:'transparent', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
        <p style={{ fontSize:14, color:'#64748B' }}>Signing you in...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
