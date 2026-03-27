import type { MatchProfile } from "../mock/matches";
// @ts-nocheck

type HistoryItem = { from: "me" | "them"; text: string };

const API_URL    = process.env.EXPO_PUBLIC_BOT_API_URL ?? "";
const API_KEY    = process.env.EXPO_PUBLIC_BOT_API_KEY ?? "";
const CLAUDE_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? "";
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";

function fallbackReply(lang: string): string {
  const map: Record<string, string> = {
    de: "Das ist interessant! Erzähl mir mehr.",
    ja: "そうですね！もっと教えてください。",
    zh: "很有意思！请告诉我更多。",
    ru: "Интересно! Расскажи мне больше.",
    en: "That's interesting! Tell me more.",
    es: "¡Qué interesante! Contame más.",
  };
  return map[lang] ?? map.en;
}

function buildPrompt(match: MatchProfile, history: HistoryItem[], userMessage: string): string {
  const recent = history.slice(-8).map((m) =>
    `${m.from === "me" ? "User" : match.name}: ${m.text}`
  ).join("\n");
  return `You are ${match.name}, a ${match.country} native speaker of ${match.nativeLang}.
Reply naturally in ${match.nativeLang}. Keep replies short (1-3 sentences). Be warm and encouraging.
${match.interests?.length ? `Your interests: ${match.interests.join(", ")}.` : ""}
${recent ? `Recent chat:\n${recent}` : "(start of conversation)"}
User: ${userMessage}
${match.name}:`;
}

async function tryClaudeAPI(match: MatchProfile, history: HistoryItem[], userMessage: string): Promise<string | null> {
  if (!CLAUDE_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": CLAUDE_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 150, messages: [{ role: "user", content: buildPrompt(match, history, userMessage) }] }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return String(data?.content?.[0]?.text ?? "").trim() || null;
  } catch { return null; }
}

async function tryGeminiAPI(match: MatchProfile, history: HistoryItem[], userMessage: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(match, history, userMessage) }] }], generationConfig: { maxOutputTokens: 150, temperature: 0.8 } }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim() || null;
  } catch { return null; }
}

import * as Animated from 'react-native';
const AnimatedView = Animated.View as any;

export async function getBotReply(
  match: MatchProfile,
  messageHistory: HistoryItem[],
  userMessage: string
): Promise<string> {
  if (!API_URL && !CLAUDE_KEY && !GEMINI_KEY) return fallbackReply(match.nativeLang);

  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) },
        body: JSON.stringify({ match, history: messageHistory, message: userMessage }),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const reply = String(data?.reply ?? data?.text ?? "").trim();
        if (reply) return reply;
      }
    } catch {}
  }

  const claude = await tryClaudeAPI(match, messageHistory, userMessage);
  if (claude) return claude;

  const gemini = await tryGeminiAPI(match, messageHistory, userMessage);
  if (gemini) return gemini;

  return fallbackReply(match.nativeLang);
}

// Crear archivo src/mock/matches.ts con los tipos y exports necesarios
// export interface MatchProfile {
//   // tipos y propiedades del objeto MatchProfile
// }

// export interface HistoryItem {
//   // tipos y propiedades del objeto HistoryItem
// }