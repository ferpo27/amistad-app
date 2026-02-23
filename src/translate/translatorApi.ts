// src/translate/translatorApi.ts
import type { LanguageCode } from "../storage";
import { Platform } from "react-native";

export type TranslateResponse = { translated: string };

// ✅ Cambiá esto según tu caso:
// - Android emulator: 10.0.2.2
// - iOS simulator: http://localhost
// - Celular físico: IP de tu PC en la red (ej: http://192.168.0.15)
function getBaseUrl() {
  // Android emulator
  if (Platform.OS === "android") return "http://10.0.2.2:8787";

  // iOS simulator suele andar con localhost
  return "http://localhost:8787";
}

function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export async function apiTranslateText(params: {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
  baseUrl?: string;
}): Promise<string> {
  const { text, from, to, baseUrl } = params;
  const url = `${baseUrl ?? getBaseUrl()}/translate`;

  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ BACKEND pide from_lang y to_lang
      body: JSON.stringify({ text, from_lang: from, to_lang: to }),
    }),
    6000
  );

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`api ${res.status} ${msg}`);
  }

  const data = (await res.json()) as TranslateResponse;
  return typeof data?.translated === "string" ? data.translated : text;
}
