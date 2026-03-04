// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { updateProfile } from "../storage";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(translateError(err.message)); return false; }
    return true;
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    username: string
  ): Promise<{ ok: boolean; email?: string }> => {
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setLoading(false); setError(translateError(err.message)); return { ok: false }; }
    if (data.user) {
      await updateProfile({ displayName: displayName.trim(), username });
    }
    setLoading(false);
    return { ok: true, email };
  };

  // Verificar OTP recibido por email
  const verifyOtp = async (email: string, token: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    setLoading(false);
    if (err) { setError(translateError(err.message)); return false; }
    return true;
  };

  // Reenviar código OTP
  const resendOtp = async (email: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setLoading(false);
    if (err) { setError(translateError(err.message)); return false; }
    return true;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, error, signIn, signUp, signOut, verifyOtp, resendOtp };
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email o contraseña incorrectos.";
  if (msg.includes("Email not confirmed")) return "Confirmá tu email antes de entrar.";
  if (msg.includes("User already registered")) return "Ya existe una cuenta con ese email.";
  if (msg.includes("Password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (msg.includes("Unable to validate email")) return "El email ingresado no es válido.";
  if (msg.includes("Token has expired")) return "El código expiró. Pedí uno nuevo.";
  if (msg.includes("Invalid OTP")) return "Código incorrecto. Revisá el email.";
  if (msg.includes("rate limit")) return "Demasiados intentos. Esperá unos minutos.";
  return msg;
}