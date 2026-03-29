import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { setAuthOk } from '../storage';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setAuthOk(false);
      setLoading(false);
      setError(err.message);
      throw err;
    }
    setUser(data.user);
    setAuthOk(true);
    setLoading(false);
    return data;
  }, []);

  const logout = useCallback(async () => {
    const { error: err } = await supabase.auth.signOut();
    if (!err) {
      setUser(null);
      setAuthOk(false);
    }
    setLoading(false);
    return err;
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return false;
    }
    setUser(data.user);
    setAuthOk(true);
    return true;
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    setError(null);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAuthOk(true);
      } else {
        setUser(null);
        setAuthOk(false);
      }
      setLoading(false);
    });
    return () => { subscription?.unsubscribe(); };
  }, []);

  return { user, loading, login, logout, verifyOtp, resendOtp, error };
};