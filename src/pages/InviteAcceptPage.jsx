/**
 * InviteAcceptPage — handles /invite/accept/:token and /invite/decline/:token
 * Shown when someone clicks the invite email link
 */
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Loader, Users, ArrowRight } from 'lucide-react';

export default function InviteAcceptPage({ mode = 'accept' }) {
  const { token } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const accountName = params.get('account') || 'the team';
  const email = params.get('email') || '';
  const role = params.get('role') || 'member';

  const [status, setStatus] = useState('idle'); // idle | processing | success | error | needs_login
  const [message, setMessage] = useState('');

  const hasAttempted = React.useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (mode === 'decline') {
      if (!hasAttempted.current) { hasAttempted.current = true; handleDecline(); }
      return;
    }
    if (!isAuthenticated) {
      setStatus('needs_login');
      return;
    }
    // User is logged in, process accept — only once
    if (!hasAttempted.current) {
      hasAttempted.current = true;
      handleAccept();
    }
  }, [authLoading, isAuthenticated, token]);

  const handleAccept = async () => {
    if (!token) { setStatus('error'); setMessage('Invalid invite link'); return; }
    setStatus('processing');
    try {
      const sessionToken = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
      const r = await fetch(`/api/workspace/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
      });
      const data = await r.json();
      if (r.ok) {
        setStatus('success');
        setMessage(data.account_name || accountName);
        // Set the joined account as active so workspace loads correctly
        if (data.account_id) {
          localStorage.setItem('plex_active_account', data.account_id);
          localStorage.setItem('invoiceking_onboarded', '1'); // Don't treat as new user
          localStorage.removeItem('invoiceking_new_user');
        }
        // Trigger account context reload and go to workspace after 2 seconds
        window.dispatchEvent(new CustomEvent('plex:auth-restored'));
        setTimeout(() => navigate('/workspace'), 2500);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to accept invite. It may have already been used or expired.');
      }
    } catch (e) {
      setStatus('error');
      setMessage(e.message || 'Something went wrong. Please try again.');
    }
  };

  const handleDecline = async () => {
    if (!token) { setStatus('error'); setMessage('Invalid link'); return; }
    setStatus('processing');
    try {
      const r = await fetch(`/api/workspace/decline/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      setStatus(r.ok ? 'declined' : 'error');
      setMessage(r.ok ? accountName : (data.error || 'Failed'));
    } catch (e) {
      setStatus('error');
      setMessage(e.message);
    }
  };

  const accent = '#C6E404';

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1A1A1A', padding: 24, fontFamily: "'Inter',sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '48px 40px', maxWidth: 440, width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)', textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#C6E404', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Users size={28} color="#fff" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Invoice King</div>
        </div>

        {/* States */}
        {status === 'idle' && (
          <div>
            <Loader size={40} style={{ color: accent, margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#64748B', fontSize: 15 }}>Loading invite…</p>
          </div>
        )}

        {status === 'processing' && (
          <div>
            <Loader size={40} style={{ color: accent, margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
              {mode === 'decline' ? 'Declining invite…' : 'Joining team…'}
            </h2>
            <p style={{ color: '#64748B', fontSize: 14 }}>Just a moment…</p>
          </div>
        )}

        {status === 'needs_login' && (
          <div>
            <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>
              You're invited to join
            </h2>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 14, padding: '20px clamp(12px,4vw,24px)', marginBottom: 24, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#166534', marginBottom: 4 }}>{accountName}</div>
              <div style={{ fontSize: 13, color: '#C6E404' }}>as a {role}</div>
            </div>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              {email ? `This invite is for <strong>${email}</strong>. ` : ''}
              Sign in or create an account to accept.
            </p>
            <button onClick={() => {
              localStorage.setItem('invoiceking_pending_invite', token);
              navigate(`/login?redirect=/invite/accept/${token}`);
            }} style={{
              width: '100%', padding: '14px', background: '#C6E404',
              color: '#1A1A1A', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Sign in to Accept <ArrowRight size={18} />
            </button>
            <button onClick={() => {
              localStorage.setItem('invoiceking_pending_invite', token);
              navigate(`/login?mode=signup&redirect=/invite/accept/${token}`);
            }} style={{
              width: '100%', padding: '12px', background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
              borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 10,
            }}>
              Create a Invoice King account
            </button>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle size={56} style={{ color: '#44EF6B', margin: '0 auto 16px' }} />
            <h2 style={{ color: '#0F172A', fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Welcome to the team!</h2>
            <p style={{ color: '#64748B', fontSize: 15, marginBottom: 24 }}>
              You've joined <strong style={{ color: '#0F172A' }}>{message}</strong>. Redirecting you to the workspace…
            </p>
            <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#C6E404,#C6E404)', borderRadius: 2, animation: 'progress 2.5s linear' }} />
            </div>
          </div>
        )}

        {status === 'declined' && (
          <div>
            <XCircle size={56} style={{ color: '#94A3B8', margin: '0 auto 16px' }} />
            <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Invitation declined</h2>
            <p style={{ color: '#64748B', fontSize: 14 }}>
              You've declined the invitation to join <strong>{message}</strong>.
            </p>
            <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 16 }}>Changed your mind? Contact the team owner for a new invite.</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <XCircle size={56} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
            <h2 style={{ color: '#0F172A', fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>Invite not found</h2>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{message}</p>
            <button onClick={() => navigate('/login')} style={{
              padding: '12px clamp(12px,4vw,24px)', background: '#C6E404', color: '#1A1A1A',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Go to Invoice King
            </button>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes progress { from { width:0 } to { width:100% } }
        `}</style>
      </div>
    </div>
  );
}
