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
  expiresAt?: number;
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
  dob?: any;

  bio?: string;
  photoUri?: string;
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
  const now = Date.now();
  const out: StoryPhoto[] = [];
  for (const s of input) {
    const uri = typeof s?.uri === "string" ? s.uri : "";
    const title = typeof s?.title === "string" ? s.title : "";
    const ts = typeof s?.ts === "number" ? s.ts : Date.now();
    const id =
      typeof s?.id === "string" && s.id.length > 0
        ? s.id
        : `${ts}-${Math.random().toString(16).slice(2)}`;
    // Preservar expiresAt y filtrar historias ya expiradas
    const expiresAt = typeof s?.expiresAt === "number" ? s.expiresAt : undefined;
    if (!uri) continue;
    if (expiresAt && expiresAt <= now) continue; // filtrar expiradas al leer
    out.push({ id, uri, title, ts, ...(expiresAt ? { expiresAt } : {}) });
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
  return v !== null && v === "1";
}

export async function setAuthOk(ok: boolean): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.authOk, ok ? "1" : "0");
}

export async function isOnboardingDone(): Promise<boolean> {
  const v = await AsyncStorage.getItem(StorageKeys.onboardingDone);
  return v !== null && v === "1";
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
    username:    typeof parsed.username    === "string" ? parsed.username    : undefined,
    country:     typeof parsed.country     === "string" ? parsed.country     : undefined,
    city:        typeof parsed.city        === "string" ? parsed.city        : undefined,
    nativeLang:  isLanguageCode(parsed.nativeLang)      ? parsed.nativeLang  : undefined,
    bio:         typeof parsed.bio         === "string" ? parsed.bio         : undefined,
    photoUri:    typeof parsed.photoUri    === "string" ? parsed.photoUri    : undefined,
    contact: parsed.contact ?? undefined,
    dob: parsed.dob ?? undefined,
    favorites,
    interests,
    languageLearning: { learn, goal },
    stories,
  };
}

export async function setProfile(profile: ProfileData): Promise<void> {
  const raw = JSON.stringify(profile);
  await AsyncStorage.setItem(StorageKeys.profile, raw);
}

export async function getLanguage(): Promise<LanguageCode> {
  const v = await AsyncStorage.getItem(StorageKeys.appLang);
  return v as LanguageCode;
}

export async function setLanguage(lang: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.appLang, lang);
}

export async function getThemeMode(): Promise<ThemeMode> {
  const v = await AsyncStorage.getItem(StorageKeys.themeMode);
  return v as ThemeMode;
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.themeMode, mode);
}

export async function getSavedMatches(): Promise<string[]> {
  const v = await AsyncStorage.getItem(StorageKeys.savedMatches);
  return v ? JSON.parse(v) as string[] : [];
}

export async function setSavedMatches(matches: string[]): Promise<void> {
  const raw = JSON.stringify(matches);
  await AsyncStorage.setItem(StorageKeys.savedMatches, raw);
}

export async function getChatMessages(matchId: string): Promise<ChatMessage[]> {
  const key = chatKey(matchId);
  const v = await AsyncStorage.getItem(key);
  return v ? JSON.parse(v) as ChatMessage[] : [];
}

export async function setChatMessages(matchId: string, messages: ChatMessage[]): Promise<void> {
  const key = chatKey(matchId);
  const raw = JSON.stringify(messages);
  await AsyncStorage.setItem(key, raw);
}