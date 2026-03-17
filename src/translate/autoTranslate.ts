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
  } catch (error) {
    if (error.name === 'AbortError') {
      return null;
    }
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
  } catch (error) {
    if (error.name === 'AbortError') {
      return null;
    }
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
  const cached = _cache.get(cKey(raw, resolveIso(src), resolveIso(tgt)));
  if (cached) return cached;
  const translated = await googleTranslate(raw, src, tgt) ?? await myMemoryTranslate(raw, src, tgt);
  if (translated) {
    _cache.set(cKey(raw, resolveIso(src), resolveIso(tgt)), translated);
    return translated;
  }
  return raw;
}