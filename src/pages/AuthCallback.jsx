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
