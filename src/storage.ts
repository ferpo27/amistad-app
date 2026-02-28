// src/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * =========================
 * Tipos base
 * =========================
 */
export type LanguageCode = "es" | "en" | "de" | "ja" | "ru" | "zh";
export type LanguageLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type LanguageGoal = "Amistad" | "Intercambio";

export type LearningLang = {
  lang: LanguageCode;
  level: LanguageLevel | null;
};

export type Contact =
  | { type: "email"; value: string }
  | { type: "phone"; value: string }
  | null;

export type StoryPhoto = {
  id: string;
  uri: string;
  title: string;
  ts: number;
};

// Alias para StoryRow / StoryViewer
export type StoryItem = StoryPhoto;

export type ProfileData = {
  displayName?: string;
  username?: string;
  country?: string;
  city?: string;
  nativeLang?: LanguageCode;
  contact?: Contact;
  dob?: DOB;

  favorites?: string[];
  interests?: string[];

  languageLearning?: {
    learn: LearningLang[];
    goal?: LanguageGoal;
  };

  stories?: StoryPhoto[];
};

export type ChatFrom = "me" | "them";

export type ChatMessage = {
  id: string;
  ts: number;
  from: ChatFrom;
  text: string;
};

export type ThemeMode = "system" | "light" | "dark";

/**
 * =========================
 * Keys
 * =========================
 */
export const StorageKeys = {
  authOk: "authOk",
  onboardingDone: "onboardingDone",
  profile: "profile",
  appLang: "appLang",
  themeMode: "themeMode",

  savedMatches: "savedMatches",
  chatPrefix: "chat:",
} as const;

/**
 * =========================
 * Helpers
 * =========================
 */
function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function chatKey(matchId: string) {
  return `${StorageKeys.chatPrefix}${matchId}`;
}

function isLanguageCode(x: any): x is LanguageCode {
  return x === "es" || x === "en" || x === "de" || x === "ja" || x === "ru" || x === "zh";
}

function normalizeLearn(input: any): LearningLang[] {
  if (!Array.isArray(input)) return [];

  // string[] viejo
  if (input.length && typeof input[0] === "string") {
    const langs = (input as any[]).filter(isLanguageCode);
    return uniq(langs).map((lang) => ({ lang, level: null }));
  }

  const out: LearningLang[] = [];
  for (const item of input) {
    const lang = item?.lang;
    const level = item?.level ?? null;
    if (!isLanguageCode(lang)) continue;

    const validLevel =
      level === null ||
      level === "A1" ||
      level === "A2" ||
      level === "B1" ||
      level === "B2" ||
      level === "C1" ||
      level === "C2";

    out.push({ lang, level: validLevel ? level : null });
  }

  const map = new Map<LanguageCode, LearningLang>();
  for (const x of out) map.set(x.lang, x);
  return Array.from(map.values());
}

function normalizeStories(input: any): StoryPhoto[] {
  if (!Array.isArray(input)) return [];
  const out: StoryPhoto[] = [];
  for (const s of input) {
    const uri = typeof s?.uri === "string" ? s.uri : "";
    const title = typeof s?.title === "string" ? s.title : "";
    const ts = typeof s?.ts === "number" ? s.ts : Date.now();
    const id =
      typeof s?.id === "string" && s.id.length > 0
        ? s.id
        : `${ts}-${Math.random().toString(16).slice(2)}`;
    if (!uri) continue;
    out.push({ id, uri, title, ts });
  }
  out.sort((a, b) => b.ts - a.ts);
  return out;
}

/**
 * =========================
 * Auth / Onboarding
 * =========================
 */
export async function isAuthOk(): Promise<boolean> {
  const v = await AsyncStorage.getItem(StorageKeys.authOk);
  return v === "1";
}

export async function setAuthOk(ok: boolean): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.authOk, ok ? "1" : "0");
}

export async function isOnboardingDone(): Promise<boolean> {
  const v = await AsyncStorage.getItem(StorageKeys.onboardingDone);
  return v === "1";
}

export async function setOnboardingDone(done: boolean): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.onboardingDone, done ? "1" : "0");
}

/**
 * =========================
 * Profile
 * =========================
 */
export async function getProfile(): Promise<ProfileData> {
  const raw = await AsyncStorage.getItem(StorageKeys.profile);
  const parsed = safeJsonParse<ProfileData>(raw) ?? {};

  const favorites = Array.isArray(parsed.favorites) ? parsed.favorites.filter(Boolean) : [];
  const interests = Array.isArray(parsed.interests) ? parsed.interests.filter(Boolean) : [];

  const learn = normalizeLearn(parsed.languageLearning?.learn);
  const goal = (parsed.languageLearning?.goal ?? "Amistad") as LanguageGoal;

  const stories = normalizeStories(parsed.stories);

  return {
    displayName: typeof parsed.displayName === "string" ? parsed.displayName : undefined,
    contact: parsed.contact ?? undefined,
    dob: parsed.dob ?? undefined,
    favorites,
    interests,
    languageLearning: { learn, goal },
    stories,
  };
}

export async function updateProfile(patch: Partial<ProfileData>): Promise<ProfileData> {
  const cur = await getProfile();

  const next: ProfileData = {
    ...cur,
    ...patch,
    favorites: patch.favorites ? patch.favorites.filter(Boolean) : cur.favorites,
    interests: patch.interests ? patch.interests.filter(Boolean) : cur.interests,
    languageLearning: {
      learn: normalizeLearn(patch.languageLearning?.learn ?? cur.languageLearning?.learn),
      goal: (patch.languageLearning?.goal ?? cur.languageLearning?.goal ?? "Amistad") as LanguageGoal,
    },
    stories: patch.stories ? normalizeStories(patch.stories) : cur.stories,
  };

  await AsyncStorage.setItem(StorageKeys.profile, JSON.stringify(next));
  return next;
}

// ✅ Agregar historia (titulo opcional, podés editar después)
export async function addStoryPhoto(uri: string, title = ""): Promise<ProfileData> {
  const cur = await getProfile();
  const ts = Date.now();
  const story: StoryPhoto = { id: `${ts}-${Math.random().toString(16).slice(2)}`, uri, title, ts };
  const nextStories = [story, ...(cur.stories ?? [])];
  return updateProfile({ stories: nextStories });
}

export async function updateStoryPhoto(storyId: string, patch: Partial<Pick<StoryPhoto, "title" | "uri">>): Promise<ProfileData> {
  const cur = await getProfile();
  const nextStories = (cur.stories ?? []).map((s) => (s.id === storyId ? { ...s, ...patch } : s));
  return updateProfile({ stories: nextStories });
}

export async function removeStoryPhoto(storyId: string): Promise<ProfileData> {
  const cur = await getProfile();
  const nextStories = (cur.stories ?? []).filter((s) => s.id !== storyId);
  return updateProfile({ stories: nextStories });
}

/**
 * =========================
 * Idioma UI
 * =========================
 */
export async function getAppLanguage(): Promise<LanguageCode | null> {
  const raw = await AsyncStorage.getItem(StorageKeys.appLang);
  if (!raw) return null;
  return isLanguageCode(raw) ? raw : null;
}

export async function setAppLanguage(lang: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.appLang, lang);
}

/**
 * =========================
 * Theme
 * =========================
 */
export async function getThemeMode(): Promise<ThemeMode | null> {
  const raw = await AsyncStorage.getItem(StorageKeys.themeMode);
  if (!raw) return null;
  if (raw === "system" || raw === "light" || raw === "dark") return raw;
  return null;
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.themeMode, mode);
}

/**
 * =========================
 * Saved Matches
 * =========================
 */
export async function getSavedMatches(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(StorageKeys.savedMatches);
  const parsed = safeJsonParse<string[]>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x) => typeof x === "string" && x.trim().length > 0);
}

export async function toggleSavedMatch(matchId: string): Promise<string[]> {
  const cur = await getSavedMatches();
  const exists = cur.includes(matchId);
  const next = exists ? cur.filter((x) => x !== matchId) : [...cur, matchId];
  await AsyncStorage.setItem(StorageKeys.savedMatches, JSON.stringify(next));
  return next;
}

/**
 * =========================
 * Chat
 * =========================
 */
export async function getChat(matchId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(chatKey(matchId));
  const parsed = safeJsonParse<any[]>(raw);
  if (!Array.isArray(parsed)) return [];

  const msgs: ChatMessage[] = parsed
    .map((m: any) => {
      const from: ChatFrom = m?.from === "them" ? "them" : "me";
      const text = typeof m?.text === "string" ? m.text : "";
      const ts = typeof m?.ts === "number" ? m.ts : Date.now();
      const id =
        typeof m?.id === "string" && m.id.length > 0 ? m.id : `${ts}-${Math.random().toString(16).slice(2)}`;
      return { id, ts, from, text };
    })
    .filter((m) => m.text.trim().length > 0);

  msgs.sort((a, b) => a.ts - b.ts);
  return msgs;
}

export async function appendChat(
  matchId: string,
  message: Omit<ChatMessage, "id" | "ts"> & Partial<Pick<ChatMessage, "id" | "ts">>
): Promise<ChatMessage[]> {
  const cur = await getChat(matchId);

  const msg: ChatMessage = {
    id: message.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: message.ts ?? Date.now(),
    from: message.from === "them" ? "them" : "me",
    text: typeof message.text === "string" ? message.text : "",
  };

  const next = [...cur, msg];
  await AsyncStorage.setItem(chatKey(matchId), JSON.stringify(next));
  return next;
}

export async function clearChat(matchId: string): Promise<void> {
  await AsyncStorage.removeItem(chatKey(matchId));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.clear();
}

/**
 * =========================
 * Dev helpers
 * =========================
 */
export async function resetDevStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    // si en tu app no usás prefijos, esto no borra nada “de más”
    // (podés cambiarlo a AsyncStorage.clear() si querés limpiar todo)
    const appKeys = keys.filter((k) => k.startsWith("app_") || k.startsWith("amistad_"));
    if (appKeys.length) await AsyncStorage.multiRemove(appKeys);
  } catch {
    // no rompas la app si falla
  }
}

export type DOB = { day: number; month: number; year: number };

export function ageFromDob(dob?: DOB | null): number | null {
  if (!dob) return null;
  const now = new Date();
  const birth = new Date(dob.year, dob.month - 1, dob.day);
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() - birth.getMonth() < 0 ||
     (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

export const isLoggedIn = isAuthOk;