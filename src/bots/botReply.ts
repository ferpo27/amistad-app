// src/bots/botReply.ts
import type { MatchProfile } from "../mock/matches";

// ✅ Podés cambiar estos valores por tu API real si querés.
const API_URL = process.env.EXPO_PUBLIC_BOT_API_URL ?? "";
const API_KEY = process.env.EXPO_PUBLIC_BOT_API_KEY ?? "";

type HistoryItem = { from: "me" | "them"; text: string };

function fallbackReply(nativeLang: string) {
  switch (nativeLang) {
    case "de":
      return "Hallo! Wie geht’s dir? 😊";
    case "ru":
      return "Привет! Как дела? 😊";
    case "ja":
      return "こんにちは！元気ですか？😊";
    case "zh":
      return "你好！你怎么样？😊";
    case "en":
      return "Hey! How’s it going? 😊";
    case "es":
    default:
      return "¡Hola! ¿Cómo va? 😊";
  }
}

/**
 * Devuelve una respuesta del bot según el perfil del match.
 * Si no hay backend, usa fallback local.
 */
export async function getBotReply(
  match: MatchProfile,
  messageHistory: HistoryItem[],
  userMessage: string
): Promise<string> {
  // Sin backend configurado → fallback
  if (!API_URL) return fallbackReply(match.nativeLang);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify({
        match,
        messageHistory,
        userMessage,
      }),
    });

    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = (await res.json()) as any;
    const text = String(data?.reply ?? data?.text ?? "").trim();
    return text || fallbackReply(match.nativeLang);
  } catch {
    return fallbackReply(match.nativeLang);
  }
}

// ✅ Alias por compat con imports viejos (tu error decía que faltaba botReply)
export const botReply = getBotReply;