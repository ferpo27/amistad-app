// src/lib/supabase.ts
// ─────────────────────────────────────────────────────────────
//  Cliente Supabase centralizado para toda la app.
//  Requiere en .env:
//    EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
//    EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[Supabase] Faltan variables de entorno. " +
    "Agregá EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en tu .env"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});