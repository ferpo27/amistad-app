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

export async function updateProfile(data: Partial<ProfileData>): Promise<void> {
  const raw = await AsyncStorage.getItem(StorageKeys.profile);
  const parsed = safeJsonParse<ProfileData>(raw) ?? {};

  const updated = { ...parsed, ...data };

  const favorites = Array.isArray(updated.favorites) ? updated.favorites.filter(Boolean) : [];
  const interests = Array.isArray(updated.interests) ? updated.interests.filter(Boolean) : [];

  const learn = normalizeLearn(updated.languageLearning?.learn);
  const goal = (updated.languageLearning?.goal ?? "Amistad") as LanguageGoal;

  const stories = normalizeStories(updated.stories);

  const final: ProfileData = {
    displayName: typeof updated.displayName === "string" ? updated.displayName : undefined,
    username:    typeof updated.username    === "string" ? updated.username    : undefined,
    country:     typeof updated.country     === "string" ? updated.country     : undefined,
    city:        typeof updated.city        === "string" ? updated.city        : undefined,
    nativeLang:  isLanguageCode(updated.nativeLang)      ? updated.nativeLang  : undefined,
    bio:         typeof updated.bio         === "string" ? updated.bio         : undefined,
    photoUri:    typeof updated.photoUri    === "string" ? updated.photoUri    : undefined,
    contact: updated.contact ?? undefined,
    dob: updated.dob ?? undefined,
    favorites,
    interests,
    languageLearning: { learn, goal },
    stories,
  };

  await AsyncStorage.setItem(StorageKeys.profile, JSON.stringify(final));
}

export async function getLanguage(): Promise<LanguageCode> {
  const raw = await AsyncStorage.getItem(StorageKeys.appLang);
  const lang = raw as LanguageCode;
  return lang;
}

export async function setLanguage(lang: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.appLang, lang);
}

export async function getThemeMode(): Promise<ThemeMode> {
  const raw = await AsyncStorage.getItem(StorageKeys.themeMode);
  const mode = raw as ThemeMode;
  return mode;
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.themeMode, mode);
}

export async function getSavedMatches(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(StorageKeys.savedMatches);
  const matches = safeJsonParse<string[]>(raw) ?? [];
  return matches;
}

export async function addSavedMatch(matchId: string): Promise<void> {
  const matches = await getSavedMatches();
  matches.push(matchId);
  await AsyncStorage.setItem(StorageKeys.savedMatches, JSON.stringify(matches));
}

export async function removeSavedMatch(matchId: string): Promise<void> {
  const matches = await getSavedMatches();
  const index = matches.indexOf(matchId);
  if (index !== -1) {
    matches.splice(index, 1);
    await AsyncStorage.setItem(StorageKeys.savedMatches, JSON.stringify(matches));
  }
}

export async function getChatMessages(matchId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(chatKey(matchId));
  const messages = safeJsonParse<ChatMessage[]>(raw) ?? [];
  return messages;
}

export async function addChatMessage(matchId: string, message: ChatMessage): Promise<void> {
  const messages = await getChatMessages(matchId);
  messages.push(message);
  await AsyncStorage.setItem(chatKey(matchId), JSON.stringify(messages));
}

export async function clearChatMessages(matchId: string): Promise<void> {
  await AsyncStorage.removeItem(chatKey(matchId));
}