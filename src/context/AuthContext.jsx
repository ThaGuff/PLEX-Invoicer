import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { setTokenGetter, setAuthErrorHandler } from '../utils/api';

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const IDLE_TIMEOUT_MS  = 15 * 60 * 1000; // 15 minutes

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken:  true,
        persistSession:    true,
        detectSessionInUrl: true,
        storageKey: 'plex_auth_session',
      },
    })
  : null;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [session, setSession]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [idleWarning, setIdleWarning] = useState(false); // show "you'll be logged out" warning
  const [sessionExpired, setSessionExpired] = useState(false); // force re-login modal

  const idleTimer      = useRef(null);
  const warningTimer   = useRef(null);
  const lastActivity   = useRef(Date.now());

  // ── Idle timeout management ───────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (idleTimer.current)    clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!supabase) return; // dev mode — no idle timeout
    lastActivity.current = Date.now();
    setIdleWarning(false);
    clearTimers();

    // Warn at 14 minutes
    warningTimer.current = setTimeout(() => {
      setIdleWarning(true);
    }, IDLE_TIMEOUT_MS - 60 * 1000);

    // Lock at 15 minutes
    idleTimer.current = setTimeout(() => {
      setIdleWarning(false);
      setSessionExpired(true);
      // Sign out silently — session will be invalid
      supabase.auth.signOut().catch(() => {});
      setUser(null);
      setSession(null);
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers]);

  // Track user activity
  useEffect(() => {
    if (!supabase) return;
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const onActivity = () => {
      // Only reset if the timer has been running (user is logged in)
      if (user) resetIdleTimer();
    };
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearTimers();
    };
  }, [user, resetIdleTimer, clearTimers]);

  // ── Supabase auth setup ───────────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      const devUser = { id: 'dev-user', email: 'dev@localhost', user_metadata: { full_name: 'Dev User' } };
      setUser(devUser);
      setLoading(false);
      return;
    }

    // Restore existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) resetIdleTimer();
      setLoading(false);
    });

    // Handle all auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth]', event);
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const wasExpired = sessionExpired;
        setSessionExpired(false);
        setIdleWarning(false);
        if (session?.user) resetIdleTimer();
        // Notify AccountContext to reload after re-login
        if (wasExpired || event === 'SIGNED_IN') {
          window.dispatchEvent(new CustomEvent('plex:auth-restored'));
        }
      }

      if (event === 'SIGNED_OUT') {
        clearTimers();
        setIdleWarning(false);
      }

      // Token refresh failed — session truly expired
      if (event === 'USER_UPDATED' && !session) {
        setSessionExpired(true);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimers();
    };
  }, []);

  // Wire up api.js 401 handler — when any API call gets 401, show re-login
  useEffect(() => {
    setAuthErrorHandler((path) => {
      console.warn('[Auth] 401 on', path, '— session likely expired');
      setSessionExpired(true);
    });
  }, []);

  // ── Token getter (used by api.js) ─────────────────────────────────
  const getToken = useCallback(async () => {
    if (!supabase) return null;
    // Try to get a fresh session — Supabase auto-refreshes if needed
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    // Check if access token is about to expire (within 5 minutes)
    const expiresAt = session.expires_at * 1000;
    const nowMs = Date.now();
    if (expiresAt - nowMs < 5 * 60 * 1000) {
      // Proactively refresh
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed?.session?.access_token || null;
    }

    return session.access_token;
  }, []);

  // Wire token getter into api.js
  useEffect(() => { setTokenGetter(getToken); }, [getToken]);

  // ── Auth methods ─────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  const signInWithApple = async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    return supabase.auth.signInWithOAuth({
      provider: 'apple',
      options:  { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  const signInWithEmail = async (email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const r = await supabase.auth.signInWithPassword({ email, password });
    if (!r.error) { setSessionExpired(false); resetIdleTimer(); }
    return r;
  };

  const signUpWithEmail = async (email, password, fullName) => {
    if (!supabase) return { error: 'Supabase not configured' };
    return supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
  };

  const resetPassword = async (email) => {
    if (!supabase) return { error: 'Supabase not configured' };
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const signOut = async () => {
    clearTimers();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSessionExpired(false);
    setIdleWarning(false);
    localStorage.removeItem('plex_active_account');
  };

  const dismissIdleWarning = () => {
    setIdleWarning(false);
    resetIdleTimer();
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, supabase,
      isAuthenticated: !!user,
      idleWarning,
      sessionExpired,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOut,
      getToken,
      dismissIdleWarning,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
