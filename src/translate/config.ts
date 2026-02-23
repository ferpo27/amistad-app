// src/translate/config.ts
import type { LanguageCode } from "../storage";

// En iPhone físico NO uses localhost.
// Poné tu IP local: http://192.168.X.X:8787
export const TRANSLATOR_API_BASE =
  process.env.EXPO_PUBLIC_TRANSLATOR_API_BASE || "http://localhost:8787";

export type TranslateRequest = {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
};

export type TranslateResponse = {
  translated: string;
};
