// src/translate/config.ts
import type { LanguageCode } from "../storage";

export const TRANSLATOR_API_BASE: string =
  process.env.EXPO_PUBLIC_TRANSLATOR_API_BASE ?? "http://localhost:8787";

export type TranslateRequest = {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
};

export type TranslateResponse = {
  translated: string;
};