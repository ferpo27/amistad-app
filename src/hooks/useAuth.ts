import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { setAuthOk } from '../storage';

// Define un tipo más preciso para el usuario si se desea
// type User = supabase.auth.User;

export const useAuth = () => {
  const [user, setUser] = useState<any>(null); // Cambiar a User si se define el tipo
  const [loading, setLoading] = useState<boolean>(true);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthOk(false);
      setLoading(false);
      throw error;
    }
    setUser(data.user);
    setAuthOk(true);
    setLoading(false);
    return data;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setAuthOk(false);
    }
    setLoading(false);
    return error;
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

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, login, logout };
};