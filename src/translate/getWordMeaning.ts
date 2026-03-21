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
      signal: controller.signal as unknown as RequestInit['signal'],
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
    const res = await fetch(url, { 
      signal: controller.signal as unknown as RequestInit['signal'],
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as any[];
    const result = data[0][0][0];
    if (!result || result === text) return null;
    return result;
  } catch { return null; }
}