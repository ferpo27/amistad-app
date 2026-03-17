// src/translate/translatorApi.ts
// Traductor con 3 niveles de fallback:
// 1. Tu API Railway  2. MyMemory (gratis)  3. Diccionario local
import type { LanguageCode } from "../storage";

const RAILWAY_BASE = process.env.EXPO_PUBLIC_TRANSLATOR_API_BASE ?? "";

async function translateWithRailway(text: string, from: LanguageCode, to: LanguageCode): Promise<string | null> {
  if (!RAILWAY_BASE) return null;
  try {
    const res = await fetch(`${RAILWAY_BASE}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from_lang: from, to_lang: to }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.translated as string) || null;
  } catch { return null; }
}

async function translateWithMyMemory(text: string, from: LanguageCode, to: LanguageCode): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.responseData?.translatedText as string;
    if (!translated || translated === text) return null;
    return translated;
  } catch { return null; }
}

const DICT: Record<string, Record<string, string>> = {
  "de->es": { hallo: "hola", danke: "gracias", bitte: "por favor", ich: "yo", ja: "sí", nein: "no" },
  "de->en": { hallo: "hello", danke: "thanks", bitte: "please", ich: "I", ja: "yes", nein: "no" },
  "ru->es": { "привет": "hola", "как": "cómo", "дела": "estás", "да": "sí", "нет": "no" },
  "ru->en": { "привет": "hi", "как": "how", "дела": "are things", "да": "yes", "нет": "no" },
  "ja->es": { "こんにちは": "hola", "ありがとう": "gracias", "はい": "sí", "いいえ": "no" },
  "ja->en": { "こんにちは": "hello", "ありがとう": "thank you", "はい": "yes", "いいえ": "no" },
  "zh->es": { "你好": "hola", "谢谢": "gracias", "是": "sí", "不": "no" },
  "zh->en": { "你好": "hello", "谢谢": "thank you", "是": "yes", "不": "no" },
};

function translateLocal(text: string, from: LanguageCode, to: LanguageCode): string {
  const dict = DICT[`${from}->${to}`] ?? {};
  return text.trim().split(" ").map((p) => dict[p.toLowerCase()] ?? p).join(" ");
}

export async function translateText(text: string, from: LanguageCode, to: LanguageCode): Promise<string> {
  if (from === to) return text;
  const railway = await translateWithRailway(text, from, to);
  if (railway) return railway;
  const myMemory = await translateWithMyMemory(text, from, to);
  if (myMemory) return myMemory;
  return translateLocal(text, from, to);
}