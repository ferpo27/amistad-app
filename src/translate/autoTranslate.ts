// src/translate/autoTranslate.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageCode } from "../storage";
import type { TranslateWordInContextRequest, TranslateResponse } from "./types";

const LANG_ISO: Record<LanguageCode, string> = {
  es: "es", en: "en", de: "de", ru: "ru", ja: "ja", zh: "zh-CN",
};

const _mem = new Map<string, string>();
const PREFIX = "tr2:";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cleanText(s: string): string {
  return (s ?? "")
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function fromDisk(key: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw);
    if (Date.now() - t > MAX_AGE) { AsyncStorage.removeItem(PREFIX + key); return null; }
    return v;
  } catch { return null; }
}

async function toDisk(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ v: value, t: Date.now() }));
  } catch {}
}

async function tryGoogle(text: string, from: LanguageCode, to: LanguageCode): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${LANG_ISO[from]}&tl=${LANG_ISO[to]}&dt=t&q=${encodeURIComponent(text)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const out = ((data[0] ?? []) as any[][]).map((s) => s[0] ?? "").join("").trim();
    return out || null;
  } catch { return null; }
}

async function tryMyMemory(text: string, from: LanguageCode, to: LanguageCode): Promise<string | null> {
  try {
    const pair = `${LANG_ISO[from]}|${LANG_ISO[to]}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? "";
    if (!translated || translated.includes("%")) return null;
    return translated.trim();
  } catch { return null; }
}

export async function translateCached(params: {
  text: string;
  targetLang: LanguageCode;
  sourceLang?: LanguageCode;
}): Promise<string | null> {
  const { text, targetLang, sourceLang = "en" } = params;
  const clean = cleanText(text);
  if (!clean || sourceLang === targetLang) return text;

  const key = `${sourceLang}:${targetLang}:${clean.slice(0, 120).toLowerCase()}`;

  if (_mem.has(key)) return _mem.get(key)!;
  const disk = await fromDisk(key);
  if (disk) { _mem.set(key, disk); return disk; }

  const google = await tryGoogle(clean, sourceLang, targetLang);
  if (google) { _mem.set(key, google); await toDisk(key, google); return google; }

  const mm = await tryMyMemory(clean, sourceLang, targetLang);
  if (mm) { _mem.set(key, mm); await toDisk(key, mm); return mm; }

  return null;
}

export async function translateWordInContextCached(
  params: TranslateWordInContextRequest
): Promise<Partial<TranslateResponse> | null> {
  const { fullText, tappedTokenIndex, sourceLang, targetLang } = params;

  const words = fullText.trim().split(/\s+/);
  const raw = words[tappedTokenIndex] ?? "";
  const clean = cleanText(raw.replace(/^[,.!?;:()"'«»]+|[,.!?;:()"'«»]+$/g, ""));
  if (!clean) return null;

  const key = `ctx:${sourceLang}:${targetLang}:${clean.toLowerCase()}`;
  if (_mem.has(key)) return { tappedMeaning: _mem.get(key)!, translatedWord: _mem.get(key)! };
  const disk = await fromDisk(key);
  if (disk) { _mem.set(key, disk); return { tappedMeaning: disk, translatedWord: disk }; }

  const result = await translateCached({ text: clean, targetLang, sourceLang });
  if (result) {
    _mem.set(key, result);
    await toDisk(key, result);
    return { tappedMeaning: result, translatedWord: result };
  }
  return null;
}