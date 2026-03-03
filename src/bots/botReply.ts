// src/bots/botReply.ts
import type { MatchProfile } from "../mock/matches";

// Prioridad 1: tu backend propio
const API_URL = process.env.EXPO_PUBLIC_BOT_API_URL ?? "";
const API_KEY = process.env.EXPO_PUBLIC_BOT_API_KEY ?? "";

// Prioridad 2: Claude (Anthropic)
const CLAUDE_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? "";

// Prioridad 3: Gemini (Google — gratis en aistudio.google.com)
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";

type HistoryItem = { from: "me" | "them"; text: string };

function fallbackReply(nativeLang: string): string {
  switch (nativeLang) {
    case "de": return "Hallo! Wie geht's dir? 😊";
    case "ru": return "Привет! Как дела? 😊";
    case "ja": return "こんにちは！元気ですか？😊";
    case "zh": return "你好！你怎么样？😊";
    case "en": return "Hey! How's it going? 😊";
    case "es":
    default:   return "¡Hola! ¿Cómo va? 😊";
  }
}

function buildPrompt(match: MatchProfile, history: HistoryItem[], userMessage: string): string {
  const recentHistory = history.slice(-8)
    .map((m) => `${m.from === "me" ? "User" : match.name}: ${m.text}`)
    .join("\n");

  return `You are ${match.name}, a ${match.country} native speaker of ${match.nativeLang}.
You're having a friendly language exchange conversation. Reply naturally in ${match.nativeLang}.
Keep replies short (1-3 sentences). Be warm and encouraging about language learning.
${match.interests?.length ? `Your interests: ${match.interests.join(", ")}.` : ""}

Recent conversation:
${recentHistory || "(start of conversation)"}

User: ${userMessage}
${match.name}:`;
}

async function tryCustomBackend(
  match: MatchProfile,
  history: HistoryItem[],
  userMessage: string
): Promise<string | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify({ match, messageHistory: history, userMessage }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = String(data?.reply ?? data?.text ?? "").trim();
    return text || null;
  } catch {
    return null;
  }
}

async function tryClaudeAPI(
  match: MatchProfile,
  history: HistoryItem[],
  userMessage: string
): Promise<string | null> {
  if (!CLAUDE_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{ role: "user", content: buildPrompt(match, history, userMessage) }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = String(data?.content?.[0]?.text ?? "").trim();
    return text || null;
  } catch {
    return null;
  }
}

async function tryGeminiAPI(
  match: MatchProfile,
  history: HistoryItem[],
  userMessage: string
): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(match, history, userMessage) }] }],
        generationConfig: { maxOutputTokens: 150, temperature: 0.8 },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Devuelve una respuesta del bot según el perfil del match.
 * Cadena: backend propio → Claude → Gemini → fallback local
 */
export async function getBotReply(
  match: MatchProfile,
  messageHistory: HistoryItem[],
  userMessage: string
): Promise<string> {
  const custom = await tryCustomBackend(match, messageHistory, userMessage);
  if (custom) return custom;

  const claude = await tryClaudeAPI(match, messageHistory, userMessage);
  if (claude) return claude;

  const gemini = await tryGeminiAPI(match, messageHistory, userMessage);
  if (gemini) return gemini;

  return fallbackReply(match.nativeLang);
}

// Alias para compatibilidad con imports viejos
export const botReply = getBotReply;