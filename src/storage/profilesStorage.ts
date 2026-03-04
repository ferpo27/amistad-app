// src/storage/profilesStorage.ts
// ─────────────────────────────────────────────────────────────
//  Perfiles reales en Supabase (tabla profiles).
//  Reemplaza src/mock/profiles.ts para usuarios reales.
//
//  SQL para crear la tabla en Supabase → Editor SQL:
//
//  create table if not exists profiles (
//    id           uuid primary key references auth.users(id) on delete cascade,
//    display_name text,
//    country      text,
//    city         text,
//    native_lang  text,
//    bio          text,
//    interests    text[],
//    learning     jsonb,
//    photo_url    text,
//    created_at   timestamptz default now()
//  );
//  alter table profiles enable row level security;
//  create policy "perfiles públicos de lectura" on profiles
//    for select using (true);
//  create policy "solo yo edito mi perfil" on profiles
//    for all using (auth.uid() = id);
// ─────────────────────────────────────────────────────────────
import { supabase } from "../lib/supabase";

export type RemoteProfile = {
  id: string;
  displayName: string;
  country: string;
  city: string;
  nativeLang: string;
  bio: string;
  interests: string[];
  learning: { lang: string; level: string | null }[];
  photoUrl: string | null;
};

// ── Leer todos los perfiles (discovery) ──────────────────────
export async function getDiscoveryProfiles(limit = 20): Promise<RemoteProfile[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const myId = sessionData?.session?.user?.id;

  const query = supabase
    .from("profiles")
    .select("id, display_name, country, city, native_lang, bio, interests, learning, photo_url")
    .limit(limit);

  if (myId) query.neq("id", myId); // excluir mi propio perfil

  const { data, error } = await query;
  if (error) {
    console.error("[profilesStorage] getDiscoveryProfiles:", error.message);
    return [];
  }

  return (data ?? []).map(rowToProfile);
}

// ── Leer un perfil por ID ─────────────────────────────────────
export async function getProfileById(id: string): Promise<RemoteProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, country, city, native_lang, bio, interests, learning, photo_url")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[profilesStorage] getProfileById:", error.message);
    return null;
  }

  return rowToProfile(data);
}

// ── Guardar / actualizar mi perfil ───────────────────────────
export async function upsertMyProfile(patch: Partial<Omit<RemoteProfile, "id">>): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return false;

  const row: any = { id: userId };
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.country !== undefined) row.country = patch.country;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.nativeLang !== undefined) row.native_lang = patch.nativeLang;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.interests !== undefined) row.interests = patch.interests;
  if (patch.learning !== undefined) row.learning = patch.learning;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;

  const { error } = await supabase.from("profiles").upsert(row);
  if (error) {
    console.error("[profilesStorage] upsertMyProfile:", error.message);
    return false;
  }
  return true;
}

// ── Helper ────────────────────────────────────────────────────
function rowToProfile(row: any): RemoteProfile {
  return {
    id: row.id,
    displayName: row.display_name ?? "",
    country: row.country ?? "",
    city: row.city ?? "",
    nativeLang: row.native_lang ?? "es",
    bio: row.bio ?? "",
    interests: Array.isArray(row.interests) ? row.interests : [],
    learning: Array.isArray(row.learning) ? row.learning : [],
    photoUrl: row.photo_url ?? null,
  };
}