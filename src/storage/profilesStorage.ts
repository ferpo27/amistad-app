// src/storage/profilesStorage.ts
//
// ══════════════════════════════════════════════════════════════════════════════
// PROFILE STORAGE — Single source of truth para datos de perfil.
//
// ESTRATEGIA:
//   READ  → Supabase primero → hidrata cache AsyncStorage → devuelve ProfileData
//   WRITE → AsyncStorage optimistic (inmediato) → Supabase async (con retry x3)
//   OFFLINE → fallback silencioso a AsyncStorage cache
//
// COLUMN MAPPING  (Supabase column → ProfileData field)
//   full_name          → displayName
//   username           → username
//   country            → country
//   city               → city
//   native_language    → nativeLang
//   learning_language  → languageLearning.learn[0].lang  (idioma primario)
//   level              → languageLearning.learn[0].level (nivel primario)
//   bio                → bio
//   avatar_url         → photoUri
//   preferences JSONB  → { interests, favorites, stories, contact, dob, learn, goal }
//
// NOTA: la columna `preferences` JSONB debe existir en la tabla profiles.
//   Si no existe: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
// ══════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  type ProfileData,
  type LanguageCode,
  type LanguageLevel,
  type LanguageGoal,
  type LearningLang,
  type StoryPhoto,
  type Contact,
  type DOB,
  type ThemeMode,
  StorageKeys,
} from '../storage';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Forma exacta de la fila en public.profiles de Supabase.
 * Ajustá los nombres si tu migración usa nombres distintos.
 */
export interface SupabaseProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  native_language: string | null;
  /** Idioma primario de aprendizaje (código ISO 639-1) */
  learning_language: string | null;
  /** Nivel CEFR del idioma primario */
  level: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** JSONB: datos extendidos que no tienen columna propia */
  preferences: SupabasePreferences | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SupabasePreferences {
  interests?: string[];
  favorites?: string[];
  stories?: StoryPhoto[];
  contact?: Contact;
  dob?: DOB;
  /** Array completo de idiomas que aprende (incluye el primario) */
  learn?: LearningLang[];
  goal?: LanguageGoal;
}

/** Perfil público: lo que otro usuario puede ver */
export interface PublicProfileData {
  id: string;
  displayName: string;
  username: string | null;
  country: string | null;
  city: string | null;
  nativeLang: LanguageCode | null;
  bio: string | null;
  photoUri: string | null;
  interests: string[];
  languageLearning: { learn: LearningLang[]; goal: LanguageGoal };
  stories: StoryPhoto[];
}

/** Estado de sync */
export type SyncStatus = 'synced' | 'pending' | 'error' | 'offline';

/** Resultado de una operación de escritura */
export interface WriteResult {
  data: ProfileData;
  syncStatus: SyncStatus;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = StorageKeys.profile;
const SYNC_STATUS_KEY = 'profileSyncStatus';
const LAST_FETCH_KEY = 'profileLastFetch';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos antes de refetch remoto
const SUPABASE_RETRY_ATTEMPTS = 3;
const SUPABASE_RETRY_DELAY_MS = 800;

const VALID_LANGUAGE_CODES: LanguageCode[] = ['es', 'en', 'de', 'ja', 'ru', 'zh'];
const VALID_LEVELS: LanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_GOALS: LanguageGoal[] = ['Amistad', 'Intercambio'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE VALIDACIÓN
// ─────────────────────────────────────────────────────────────────────────────

function isValidLanguageCode(x: unknown): x is LanguageCode {
  return typeof x === 'string' && (VALID_LANGUAGE_CODES as string[]).includes(x);
}

function isValidLevel(x: unknown): x is LanguageLevel {
  return typeof x === 'string' && (VALID_LEVELS as string[]).includes(x);
}

function isValidGoal(x: unknown): x is LanguageGoal {
  return typeof x === 'string' && (VALID_GOALS as string[]).includes(x);
}

function safeString(x: unknown, fallback = ''): string {
  return typeof x === 'string' ? x : fallback;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZACIÓN DE DATOS
// ─────────────────────────────────────────────────────────────────────────────

function normalizeLearningLangs(input: unknown): LearningLang[] {
  if (!Array.isArray(input) || input.length === 0) return [];

  // Soporte legacy: array de strings ['es', 'en']
  if (typeof input[0] === 'string') {
    const seen = new Set<LanguageCode>();
    return (input as unknown[])
      .filter(isValidLanguageCode)
      .filter((lang) => {
        if (seen.has(lang)) return false;
        seen.add(lang);
        return true;
      })
      .map((lang) => ({ lang, level: null }));
  }

  // Formato normalizado: [{ lang, level }]
  const seen = new Map<LanguageCode, LearningLang>();
  for (const item of input as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const { lang, level } = item as Record<string, unknown>;
    if (!isValidLanguageCode(lang)) continue;
    const normalizedLevel = isValidLevel(level) ? level : null;
    if (!seen.has(lang)) {
      seen.set(lang, { lang, level: normalizedLevel });
    }
  }
  return Array.from(seen.values());
}

function normalizeStories(input: unknown): StoryPhoto[] {
  if (!Array.isArray(input)) return [];
  const now = Date.now();
  const out: StoryPhoto[] = [];

  for (const s of input as unknown[]) {
    if (!s || typeof s !== 'object') continue;
    const item = s as Record<string, unknown>;
    const uri = safeString(item.uri);
    if (!uri) continue;

    const expiresAt = typeof item.expiresAt === 'number' ? item.expiresAt : undefined;
    if (expiresAt !== undefined && expiresAt <= now) continue; // expirada

    const ts = typeof item.ts === 'number' ? item.ts : now;
    const id = safeString(item.id) || `${ts}-${Math.random().toString(16).slice(2)}`;
    const title = safeString(item.title);

    out.push({ id, uri, title, ts, ...(expiresAt ? { expiresAt } : {}) });
  }

  return out.sort((a, b) => b.ts - a.ts);
}

function normalizeContact(input: unknown): Contact {
  if (!input || typeof input !== 'object') return null;
  const { type, value } = input as Record<string, unknown>;
  if (type === 'email' && typeof value === 'string') return { type: 'email', value };
  if (type === 'phone' && typeof value === 'string') return { type: 'phone', value };
  return null;
}

function normalizeDob(input: unknown): DOB | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const { day, month, year } = input as Record<string, unknown>;
  if (typeof day !== 'number' || typeof month !== 'number' || typeof year !== 'number') {
    return undefined;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
    return undefined;
  }
  return { day, month, year };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING: Supabase ↔ ProfileData
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte una fila de Supabase al formato ProfileData que usa la app.
 * El array `learn` en preferences tiene prioridad sobre learning_language/level
 * (las columnas planas son el fallback/índice para queries SQL).
 */
export function rowToProfileData(row: SupabaseProfileRow): ProfileData {
  const prefs = row.preferences ?? {};

  // Reconstruir el array de idiomas con preferencia a preferences.learn
  let learn: LearningLang[] = normalizeLearningLangs(prefs.learn);

  // Si preferences.learn está vacío, intentar reconstruir desde la columna plana
  if (learn.length === 0 && isValidLanguageCode(row.learning_language)) {
    learn = [
      {
        lang: row.learning_language,
        level: isValidLevel(row.level) ? row.level : null,
      },
    ];
  }

  const goal: LanguageGoal = isValidGoal(prefs.goal) ? prefs.goal : 'Amistad';

  return {
    displayName: safeString(row.full_name) || undefined,
    username:    safeString(row.username) || undefined,
    country:     safeString(row.country) || undefined,
    city:        safeString(row.city) || undefined,
    nativeLang:  isValidLanguageCode(row.native_language) ? row.native_language : undefined,
    bio:         safeString(row.bio) || undefined,
    photoUri:    safeString(row.avatar_url) || undefined,
    interests:   Array.isArray(prefs.interests) ? prefs.interests.filter((x) => typeof x === 'string') : [],
    favorites:   Array.isArray(prefs.favorites) ? prefs.favorites.filter((x) => typeof x === 'string') : [],
    contact:     normalizeContact(prefs.contact),
    dob:         normalizeDob(prefs.dob),
    languageLearning: { learn, goal },
    stories:     normalizeStories(prefs.stories),
  };
}

/**
 * Convierte ProfileData al formato de fila para upsert en Supabase.
 * Las columnas planas (learning_language, level) se rellenan con el primer
 * idioma del array para mantener compatibilidad con queries SQL directas.
 */
export function profileDataToRow(
  data: ProfileData,
  userId: string,
): Omit<SupabaseProfileRow, 'created_at'> {
  const learn = data.languageLearning?.learn ?? [];
  const primaryLang = learn[0] ?? null;

  const preferences: SupabasePreferences = {
    interests: data.interests ?? [],
    favorites: data.favorites ?? [],
    stories:   (data.stories ?? []).map((s) => ({
      id: s.id,
      uri: s.uri,
      title: s.title,
      ts: s.ts,
      ...(s.expiresAt ? { expiresAt: s.expiresAt } : {}),
    })),
    contact: data.contact ?? null,
    dob:     data.dob ?? null,
    learn:   learn,
    goal:    data.languageLearning?.goal ?? 'Amistad',
  } as SupabasePreferences;

  return {
    id:                userId,
    full_name:         data.displayName ?? null,
    username:          data.username ?? null,
    country:           data.country ?? null,
    city:              data.city ?? null,
    native_language:   data.nativeLang ?? null,
    learning_language: primaryLang?.lang ?? null,
    level:             primaryLang?.level ?? null,
    bio:               data.bio ?? null,
    avatar_url:        data.photoUri ?? null,
    preferences,
    updated_at:        new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE LOCAL (AsyncStorage)
// ─────────────────────────────────────────────────────────────────────────────

async function readLocalCache(): Promise<ProfileData | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return safeJsonParse<ProfileData>(raw);
}

async function writeLocalCache(data: ProfileData): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)),
    AsyncStorage.setItem(LAST_FETCH_KEY, Date.now().toString()),
  ]);
}

async function isCacheStale(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(LAST_FETCH_KEY);
  if (!raw) return true;
  const lastFetch = parseInt(raw, 10);
  return isNaN(lastFetch) || Date.now() - lastFetch > CACHE_TTL_MS;
}

async function setSyncStatus(status: SyncStatus): Promise<void> {
  await AsyncStorage.setItem(SYNC_STATUS_KEY, status);
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const raw = await AsyncStorage.getItem(SYNC_STATUS_KEY);
  if (raw === 'synced' || raw === 'pending' || raw === 'error' || raw === 'offline') return raw;
  return 'pending';
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE: LECTURA REMOTA
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRemoteProfile(userId: string): Promise<SupabaseProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, username, country, city, native_language, learning_language, level, bio, avatar_url, preferences, created_at, updated_at',
    )
    .eq('id', userId)
    .single();

  if (error) {
    // PGRST116 = "no rows returned" (perfil no creado aún)
    if (error.code === 'PGRST116') return null;
    throw new Error(`Supabase fetch failed: ${error.message} (${error.code})`);
  }

  return data as SupabaseProfileRow;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE: ESCRITURA REMOTA (con retry)
// ─────────────────────────────────────────────────────────────────────────────

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertRemoteProfile(
  data: ProfileData,
  userId: string,
  attempt = 1,
): Promise<void> {
  const row = profileDataToRow(data, userId);

  const { error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    if (attempt < SUPABASE_RETRY_ATTEMPTS) {
      await delay(SUPABASE_RETRY_DELAY_MS * attempt);
      return upsertRemoteProfile(data, userId, attempt + 1);
    }
    throw new Error(`Supabase upsert failed after ${attempt} attempts: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE AUTH
// ─────────────────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA — LECTURA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el perfil del usuario actual.
 *
 * Estrategia:
 *  1. Si hay cache fresco (< 5 min) → devuelve cache inmediatamente
 *  2. Si el cache está stale o vacío → fetch desde Supabase, hidrata cache
 *  3. Si Supabase falla (offline, error) → usa cache local aunque esté stale
 *  4. Si no hay nada → devuelve ProfileData vacío
 */
export async function getProfile(): Promise<ProfileData> {
  const cached = await readLocalCache();
  const stale = await isCacheStale();

  // Cache fresco → respuesta inmediata
  if (cached && !stale) return cached;

  const userId = await getCurrentUserId();

  // Sin sesión → solo local
  if (!userId) {
    await setSyncStatus('offline');
    return cached ?? buildEmptyProfile();
  }

  try {
    const row = await fetchRemoteProfile(userId);

    if (row) {
      const remoteData = rowToProfileData(row);

      // Merge: datos remotos como base, preservar stories locales no subidas
      const merged = mergeProfiles(cached, remoteData);
      await writeLocalCache(merged);
      await setSyncStatus('synced');
      return merged;
    }

    // Perfil no existe en Supabase aún (usuario nuevo)
    if (cached) return cached;

    const empty = buildEmptyProfile();
    await writeLocalCache(empty);
    return empty;

  } catch (err) {
    // Red caída u otro error → usar cache aunque esté stale
    await setSyncStatus('offline');
    return cached ?? buildEmptyProfile();
  }
}

/**
 * Obtiene el perfil público de cualquier usuario por su ID.
 * Usado en profile/[id].tsx para ver perfiles ajenos.
 */
export async function getProfileById(userId: string): Promise<PublicProfileData | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, username, country, city, native_language, learning_language, level, bio, avatar_url, preferences',
    )
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const row = data as SupabaseProfileRow;
  const profile = rowToProfileData(row);

  return {
    id: row.id,
    displayName: profile.displayName ?? 'Usuario',
    username: profile.username ?? null,
    country: profile.country ?? null,
    city: profile.city ?? null,
    nativeLang: profile.nativeLang ?? null,
    bio: profile.bio ?? null,
    photoUri: profile.photoUri ?? null,
    interests: profile.interests ?? [],
    languageLearning: {
      learn: profile.languageLearning?.learn ?? [],
      goal:  (profile.languageLearning?.goal ?? 'Amistad') as LanguageGoal,
    },
    stories: (profile.stories ?? []).filter(
      (s) => !s.expiresAt || s.expiresAt > Date.now(),
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA — ESCRITURA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Actualiza el perfil del usuario.
 *
 * - Escribe en AsyncStorage INMEDIATAMENTE (UI no espera la red)
 * - Sube a Supabase en background (con retry)
 * - Devuelve el estado de sync en el resultado
 */
export async function updateProfile(patch: Partial<ProfileData>): Promise<WriteResult> {
  const current = await getProfile();

  const next: ProfileData = buildMergedProfile(current, patch);

  // 1. Escritura optimista en cache local (síncrona desde la perspectiva del caller)
  await writeLocalCache(next);
  await setSyncStatus('pending');

  const userId = await getCurrentUserId();

  if (!userId) {
    return { data: next, syncStatus: 'offline' };
  }

  // 2. Subir a Supabase en background
  upsertRemoteProfile(next, userId)
    .then(async () => {
      await setSyncStatus('synced');
      // Invalidar TTL para que el próximo getProfile() refresque desde remoto
      await AsyncStorage.removeItem(LAST_FETCH_KEY);
    })
    .catch(async (err) => {
      await setSyncStatus('error');
      // No relanzamos — la app funciona offline con el cache
      console.warn('[profilesStorage] Background sync failed:', err?.message);
    });

  return { data: next, syncStatus: 'pending' };
}

/**
 * Fuerza un refetch desde Supabase ignorando el TTL de cache.
 * Útil al hacer focus en pantallas críticas.
 */
export async function refreshProfile(): Promise<ProfileData> {
  await AsyncStorage.removeItem(LAST_FETCH_KEY);
  return getProfile();
}

/**
 * Fuerza un upsert inmediato a Supabase (await completo).
 * Usar en onboarding al finalizar, donde querés garantía de sync.
 */
export async function syncProfileNow(): Promise<WriteResult> {
  const current = await getProfile();
  const userId = await getCurrentUserId();

  if (!userId) {
    return { data: current, syncStatus: 'offline' };
  }

  try {
    await upsertRemoteProfile(current, userId);
    await setSyncStatus('synced');
    await AsyncStorage.removeItem(LAST_FETCH_KEY);
    return { data: current, syncStatus: 'synced' };
  } catch (err: any) {
    await setSyncStatus('error');
    return {
      data: current,
      syncStatus: 'error',
      error: err?.message ?? 'Unknown error',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA — STORIES
// ─────────────────────────────────────────────────────────────────────────────

export async function addStoryPhoto(
  uri: string,
  title = '',
  expiresAt?: number,
): Promise<WriteResult> {
  const current = await getProfile();
  const ts = Date.now();
  const story: StoryPhoto = {
    id: `${ts}-${Math.random().toString(16).slice(2)}`,
    uri,
    title,
    ts,
    ...(expiresAt ? { expiresAt } : {}),
  };
  return updateProfile({
    stories: [story, ...(current.stories ?? [])],
  });
}

export async function updateStoryPhoto(
  storyId: string,
  patch: Partial<Pick<StoryPhoto, 'title' | 'uri'>>,
): Promise<WriteResult> {
  const current = await getProfile();
  const stories = (current.stories ?? []).map((s) =>
    s.id === storyId ? { ...s, ...patch } : s,
  );
  return updateProfile({ stories });
}

export async function removeStoryPhoto(storyId: string): Promise<WriteResult> {
  const current = await getProfile();
  const stories = (current.stories ?? []).filter((s) => s.id !== storyId);
  return updateProfile({ stories });
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA — CUENTA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Limpia el cache local de perfil (usar en logout).
 */
export async function clearProfileCache(): Promise<void> {
  await AsyncStorage.multiRemove([CACHE_KEY, SYNC_STATUS_KEY, LAST_FETCH_KEY]);
}

/**
 * Elimina el perfil del usuario de Supabase + limpia cache local.
 * IRREVERSIBLE. Usar solo en flujo de "eliminar cuenta".
 */
export async function deleteRemoteProfile(): Promise<void> {
  const userId = await getCurrentUserId();
  if (userId) {
    await supabase.from('profiles').delete().eq('id', userId);
  }
  await clearProfileCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNALS — MERGE Y CONSTRUCCIÓN
// ─────────────────────────────────────────────────────────────────────────────

/** Construye un ProfileData vacío con valores por defecto seguros. */
function buildEmptyProfile(): ProfileData {
  return {
    displayName: undefined,
    username: undefined,
    country: undefined,
    city: undefined,
    nativeLang: undefined,
    bio: undefined,
    photoUri: undefined,
    contact: null,
    dob: undefined,
    interests: [],
    favorites: [],
    languageLearning: { learn: [], goal: 'Amistad' },
    stories: [],
  };
}

/**
 * Aplica un patch a un ProfileData existente con normalización completa.
 */
function buildMergedProfile(current: ProfileData, patch: Partial<ProfileData>): ProfileData {
  const patchedLearn = patch.languageLearning?.learn ?? current.languageLearning?.learn ?? [];
  const patchedGoal =
    patch.languageLearning?.goal ?? current.languageLearning?.goal ?? 'Amistad';

  return {
    ...current,
    ...patch,
    interests: patch.interests
      ? patch.interests.filter((x) => typeof x === 'string' && x.trim().length > 0)
      : current.interests ?? [],
    favorites: patch.favorites
      ? patch.favorites.filter((x) => typeof x === 'string' && x.trim().length > 0)
      : current.favorites ?? [],
    languageLearning: {
      learn: normalizeLearningLangs(patchedLearn),
      goal: isValidGoal(patchedGoal) ? patchedGoal : 'Amistad',
    },
    stories: patch.stories
      ? normalizeStories(patch.stories)
      : normalizeStories(current.stories ?? []),
  };
}

/**
 * Merge entre cache local y datos remotos.
 * Los datos remotos son la fuente de verdad para campos de texto/idiomas.
 * Las stories locales que no están en el remoto se preservan si no expiraron.
 */
function mergeProfiles(local: ProfileData | null, remote: ProfileData): ProfileData {
  if (!local) return remote;

  const now = Date.now();

  // Stories: unión de ambas listas, sin duplicados por id, sin expiradas
  const remoteStoryIds = new Set((remote.stories ?? []).map((s) => s.id));
  const localOnlyStories = (local.stories ?? []).filter(
    (s) => !remoteStoryIds.has(s.id) && (!s.expiresAt || s.expiresAt > now),
  );
  const allStories = [...(remote.stories ?? []), ...localOnlyStories]
    .filter((s) => !s.expiresAt || s.expiresAt > now)
    .sort((a, b) => b.ts - a.ts);

  return {
    ...remote,
    stories: allStories,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPO LEGADO: RemoteProfile
// Alias de PublicProfileData con campo `learning` y `photoUrl` para
// compatibilidad con matches.tsx y profile/[id].tsx existentes.
// ─────────────────────────────────────────────────────────────────────────────

export interface RemoteProfile {
  id:          string;
  displayName: string;
  username:    string | null;
  country:     string | null;
  city:        string | null;
  nativeLang:  string;
  /** Array de idiomas que aprende */
  learning:    { lang: string; level: string | null }[];
  interests:   string[];
  bio:         string | null;
  /** URL pública de la foto de perfil */
  photoUrl:    string | null;
}

/**
 * Convierte PublicProfileData → RemoteProfile.
 * Usar en pantallas que ya usaban RemoteProfile antes de la migración.
 */
export function publicToRemote(p: PublicProfileData): RemoteProfile {
  return {
    id:          p.id,
    displayName: p.displayName,
    username:    p.username,
    country:     p.country,
    city:        p.city,
    nativeLang:  p.nativeLang ?? '',
    learning:    (p.languageLearning?.learn ?? []).map((l) => ({
      lang:  l.lang as string,
      level: l.level ?? null,
    })),
    interests:   p.interests,
    bio:         p.bio,
    photoUrl:    p.photoUri,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA — DISCOVERY CON PAGINACIÓN CURSOR-BASED
// ─────────────────────────────────────────────────────────────────────────────

/** Resultado paginado de discovery */
export interface DiscoveryPage {
  profiles:    RemoteProfile[];
  /** Cursor para la siguiente página (último created_at de la página actual). Null si no hay más. */
  nextCursor:  string | null;
  hasMore:     boolean;
  /** Total approximate — no hacer COUNT(*) en prod, solo para UI */
  pageSize:    number;
}

const DISCOVERY_PAGE_SIZE = 20;

/**
 * Obtiene perfiles para exploración con cursor-based pagination.
 *
 * Estrategia:
 *  - Cursor = created_at del último perfil de la página anterior
 *  - Orden = created_at DESC (perfiles más nuevos primero)
 *  - Excluye: propio usuario + ya likeados
 *  - Page size = 20 (óptimo para FlatList con windowSize=5)
 *
 * Por qué cursor y no offset:
 *  Con offset, si un nuevo perfil se inserta mientras el usuario scrollea,
 *  los perfiles se desplazan y aparecen duplicados o se saltan.
 *  Con cursor, cada página empieza exactamente donde terminó la anterior.
 *
 * @param cursor  created_at del último perfil visto (null para primera página)
 * @param limit   Perfiles por página (default 20)
 */
export async function getDiscoveryProfiles(
  cursor: string | null = null,
  limit:  number = DISCOVERY_PAGE_SIZE,
): Promise<DiscoveryPage> {
  const userId = await getCurrentUserId();
  if (!userId) return { profiles: [], nextCursor: null, hasMore: false, pageSize: 0 };

  // 1. IDs ya likeados por el usuario (para excluirlos)
  const { data: likedRows } = await supabase
    .from('likes')
    .select('to_user_id')
    .eq('from_user_id', userId);

  const excludedIds: string[] = [userId];
  if (likedRows) {
    for (const row of likedRows) {
      if (row.to_user_id) excludedIds.push(row.to_user_id);
    }
  }

  // 2. Query paginada con cursor
  // Pedimos limit + 1 para saber si hay más páginas sin hacer COUNT(*)
  let query = supabase
    .from('profiles')
    .select(
      'id, full_name, username, country, city, native_language, learning_language, level, bio, avatar_url, preferences, created_at',
    )
    .not('id', 'in', `(${excludedIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { profiles: [], nextCursor: null, hasMore: false, pageSize: 0 };
  }

  // 3. Determinar si hay más páginas
  const hasMore   = data.length > limit;
  const pageData  = hasMore ? data.slice(0, limit) : data;
  const lastItem  = pageData[pageData.length - 1] as (SupabaseProfileRow & { created_at: string }) | undefined;
  const nextCursor = hasMore && lastItem ? lastItem.created_at : null;

  // 4. Convertir a RemoteProfile
  const results: RemoteProfile[] = [];
  for (const row of pageData as (SupabaseProfileRow & { created_at: string })[]) {
    const profileData = rowToProfileData(row);
    const pub: PublicProfileData = {
      id:          row.id,
      displayName: profileData.displayName ?? 'Usuario',
      username:    profileData.username ?? null,
      country:     profileData.country ?? null,
      city:        profileData.city ?? null,
      nativeLang:  profileData.nativeLang ?? null,
      bio:         profileData.bio ?? null,
      photoUri:    profileData.photoUri ?? null,
      interests:   profileData.interests ?? [],
      languageLearning: {
        learn: profileData.languageLearning?.learn ?? [],
        goal:  (profileData.languageLearning?.goal ?? 'Amistad') as LanguageGoal,
      },
      stories: (profileData.stories ?? []).filter(
        (s) => !s.expiresAt || s.expiresAt > Date.now(),
      ),
    };
    results.push(publicToRemote(pub));
  }

  return {
    profiles:   results,
    nextCursor,
    hasMore,
    pageSize:   pageData.length,
  };
}