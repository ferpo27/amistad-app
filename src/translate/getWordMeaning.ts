// src/translate/getWordMeaning.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageCode } from "../storage";

export type WordMeaningResult = {
  word: string;
  meaning: string;
  fromCache: boolean;
};

const LIBRE_URL =
  process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL ?? "http://192.168.1.12:5000";

const LANG_ISO_LIBRE: Record<LanguageCode, string> = {
  es: "es", en: "en", de: "de", ru: "ru", ja: "ja", zh: "zh",
};

const LANG_ISO_GOOGLE: Record<LanguageCode, string> = {
  es: "es", en: "en", de: "de", ru: "ru", ja: "ja", zh: "zh-CN",
};

// Cache memoria
const _mem = new Map<string, string>();

// Cache disco
const PREFIX = "wm:";
const MAX_AGE = 60 * 24 * 60 * 60 * 1000;

async function fromDisk(key: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw);
    if (Date.now() - t > MAX_AGE) { AsyncStorage.removeItem(PREFIX + key); return null; }
    return v;
  } catch { return null; }
}

async function toDisk(key: string, value: string) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ v: value, t: Date.now() }));
  } catch {}
}

function normalize(s: string): string {
  return (s ?? "").trim().toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    .replace(/[\u2013\u2014]/g, "-");
}

function cleanForApi(s: string): string {
  return s
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ").trim();
}

async function translateLibre(text: string, from: LanguageCode, to: LanguageCode): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${LIBRE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: cleanForApi(text),
        source: LANG_ISO_LIBRE[from],
        target: LANG_ISO_LIBRE[to],
        format: "text",
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as { translatedText?: string };
    const result = data?.translatedText?.trim();
    if (!result || result === text) return null;
    return result;
  } catch { return null; }
}

async function translateGoogle(text: string, from: LanguageCode, to: LanguageCode): Promise<string | null> {
  try {
    const sl = LANG_ISO_GOOGLE[from];
    const tl = LANG_ISO_GOOGLE[to];
    const q = cleanForApi(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(q)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const segments: string[] = (data[0] ?? []).map((seg: any[]) => seg[0] ?? "");
    const result = segments.join("").trim();
    if (!result || result.toLowerCase() === q.toLowerCase()) return null;
    return result;
  } catch { return null; }
}

async function translateMyMemory(text: string, from: LanguageCode, to: LanguageCode): Promise<string | null> {
  try {
    const langPair = `${LANG_ISO_GOOGLE[from]}|${LANG_ISO_GOOGLE[to]}`;
    const q = cleanForApi(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(langPair)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? "";
    const status: number = data?.responseStatus ?? 0;
    if (status !== 200 || !translated || translated.includes("%") || normalize(translated) === normalize(q)) return null;
    return translated.trim();
  } catch { return null; }
}

export async function getWordMeaning(
  word: string,
  fromLang: LanguageCode,
  toLang: LanguageCode
): Promise<WordMeaningResult> {
  const trimmed = cleanForApi(word ?? "");
  if (!trimmed || fromLang === toLang) {
    return { word: trimmed, meaning: trimmed, fromCache: true };
  }

  const key = `${fromLang}:${toLang}:${normalize(trimmed)}`;

  // 1) Memoria
  if (_mem.has(key)) {
    return { word: trimmed, meaning: _mem.get(key)!, fromCache: true };
  }

  // 2) Disco
  const disk = await fromDisk(key);
  if (disk) {
    _mem.set(key, disk);
    return { word: trimmed, meaning: disk, fromCache: true };
  }

  // 3) LibreTranslate (tu servidor local)
  const libre = await translateLibre(trimmed, fromLang, toLang);
  if (libre) {
    _mem.set(key, libre);
    await toDisk(key, libre);
    return { word: trimmed, meaning: libre, fromCache: false };
  }

  // 4) Google Translate (respaldo)
  const google = await translateGoogle(trimmed, fromLang, toLang);
  if (google) {
    _mem.set(key, google);
    await toDisk(key, google);
    return { word: trimmed, meaning: google, fromCache: false };
  }

  // 5) MyMemory (ultimo respaldo)
  const mymemory = await translateMyMemory(trimmed, fromLang, toLang);
  if (mymemory) {
    _mem.set(key, mymemory);
    await toDisk(key, mymemory);
    return { word: trimmed, meaning: mymemory, fromCache: false };
  }

  return { word: trimmed, meaning: "—", fromCache: true };
}