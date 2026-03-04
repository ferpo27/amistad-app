// src/translate/types.ts
export type LanguageCode = "es" | "en" | "de" | "ja" | "ru" | "zh";

export type TranslateRequest = {
  text: string;
  targetLang: LanguageCode;
  sourceLang?: LanguageCode | "auto";
  mode?: "full" | "word_in_context";
  tapped?: string;
  window?: number | null;
};


export type TranslateWordInContextRequest = {
  fullText: string;
  tappedTokenIndex: number;
  sourceLang: import("../storage").LanguageCode;
  targetLang: import("../storage").LanguageCode;
};

export type TranslateResponse = {
  translatedText: string;
  targetLang: LanguageCode;
  sourceLang: LanguageCode | "auto";
  tappedMeaning: string | null;
  usedWindow: number | null;
};