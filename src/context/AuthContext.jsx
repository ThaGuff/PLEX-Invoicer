import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client — anon key is safe to expose in frontend
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If not configured, run in dev mode (no auth)
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // Dev mode — no Supabase configured
      setUser({ id: 'dev-user', email: 'dev@localhost', user_metadata: { full_name: 'Dev User' } });
      setLoading(false);
      return;
    }

    // Get existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    const origin = window.location.origin;
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/dashboard` },
    });
  };

  const signInWithApple = async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    const origin = window.location.origin;
    return supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${origin}/dashboard` },
    });
  };

  const signInWithEmail = async (email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email, password, fullName) => {
    if (!supabase) return { error: 'Supabase not configured' };
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  };

  const resetPassword = async (email) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const origin = window.location.origin;
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Get the JWT token to send with API requests
  const getToken = async () => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, supabase,
      isAuthenticated: !!user,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOut,
      getToken,
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
