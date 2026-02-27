// src/translate/autoTranslate.ts
import type { LanguageCode, TranslateRequest, TranslateResponse } from "./types";

const LANG_ISO: Record<LanguageCode, string> = {
  es: "es",
  en: "en",
  de: "de",
  ru: "ru",
  ja: "ja",
  zh: "zh-CN",
};

const _cache = new Map<string, string>();

function cleanText(s: string): string {
  return s
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function cKey(text: string, src: string, tgt: string): string {
  return src + ":" + tgt + ":" + text.trim().toLowerCase();
}

function resolveIso(lang: LanguageCode | "auto" | undefined): string {
  if (!lang || lang === "auto") return "auto";
  return LANG_ISO[lang] ?? lang;
}

async function googleTranslate(
  text: string,
  src: LanguageCode | "auto",
  tgt: LanguageCode
): Promise<string | null> {
  try {
    const q = cleanText(text);
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx" +
      "&sl=" +
      resolveIso(src) +
      "&tl=" +
      resolveIso(tgt) +
      "&dt=t&q=" +
      encodeURIComponent(q);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const result = ((data[0] ?? []) as [string, ...unknown[]][])
      .map((seg) => (seg[0] ?? "") as string)
      .join("")
      .trim();
    return result && result.toLowerCase() !== q.toLowerCase() ? result : null;
  } catch {
    return null;
  }
}

async function myMemoryTranslate(
  text: string,
  src: LanguageCode | "auto",
  tgt: LanguageCode
): Promise<string | null> {
  try {
    const q = cleanText(text);
    const srcIso = src === "auto" ? "en" : LANG_ISO[src] ?? src;
    const langPair = srcIso + "|" + resolveIso(tgt);
    const url =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(q) +
      "&langpair=" +
      encodeURIComponent(langPair);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const translated = data?.responseData?.translatedText ?? "";
    const status = data?.responseStatus ?? 0;
    if (
      status !== 200 ||
      !translated ||
      translated.includes("%") ||
      translated.toLowerCase() === q.toLowerCase()
    )
      return null;
    return translated.trim();
  } catch {
    return null;
  }
}

async function translateRaw(
  text: string,
  src: LanguageCode | "auto",
  tgt: LanguageCode
): Promise<string> {
  const raw = cleanText(text);
  if (!raw) return raw;
  if (src !== "auto" && src === tgt) return raw;

  const key = cKey(raw, src, tgt);
  if (_cache.has(key)) return _cache.get(key)!;

  const google = await googleTranslate(raw, src, tgt);
  if (google) {
    _cache.set(key, google);
    return google;
  }

  const mm = await myMemoryTranslate(raw, src, tgt);
  if (mm) {
    _cache.set(key, mm);
    return mm;
  }

  return raw;
}

export async function translateCached(params: {
  text: string;
  targetLang: LanguageCode;
  sourceLang: LanguageCode | "auto";
}): Promise<string> {
  return translateRaw(params.text, params.sourceLang, params.targetLang);
}

export async function translateWordInContextCached(params: {
  fullText: string;
  tappedTokenIndex: number;
  sourceLang: LanguageCode | "auto";
  targetLang: LanguageCode;
}): Promise<{ tappedMeaning: string; translatedWord: string }> {
  const { fullText, tappedTokenIndex, sourceLang, targetLang } = params;
  const tokens = fullText
    .split(/(\s+|[,.!?;:()¿¡"""''\-])/g)
    .filter((t: string) => t !== "");
  const word = (tokens[tappedTokenIndex] ?? "").trim();
  if (!word) return { tappedMeaning: "—", translatedWord: "—" };
  const result = await translateRaw(word, sourceLang, targetLang);
  const meaning = result !== word ? result : "—";
  return { tappedMeaning: meaning, translatedWord: meaning };
}

export async function translate(req: TranslateRequest): Promise<TranslateResponse> {
  const src = req.sourceLang ?? "auto";
  const tgt = req.targetLang;

  if (req.mode === "word_in_context" && req.tapped) {
    const tappedResult = await translateRaw(req.tapped, src, tgt);
    const tappedMeaning = tappedResult !== req.tapped ? tappedResult : null;
    const translatedText = await translateRaw(req.text, src, tgt);
    return {
      translatedText,
      targetLang: tgt,
      sourceLang: src,
      tappedMeaning,
      usedWindow: req.window ?? null,
    };
  }

  const translatedText = await translateRaw(req.text, src, tgt);
  return {
    translatedText,
    targetLang: tgt,
    sourceLang: src,
    tappedMeaning: null,
    usedWindow: null,
  };
}