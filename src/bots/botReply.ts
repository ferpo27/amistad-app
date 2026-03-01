// src/bots/botReply.ts
import type { MatchProfile } from "../mock/matches";

type HistoryItem = { from: "me" | "them"; text: string };

const LANG_NAMES: Record<string, string> = {
  de: "German", ja: "Japanese", ru: "Russian",
  zh: "Chinese", en: "English", es: "Spanish",
};

function buildPrompt(match: MatchProfile, history: HistoryItem[], userMessage: string): string {
  const langName = LANG_NAMES[match.nativeLang] ?? "English";
  const learning = match.learning.map((l) => `${l.lang.toUpperCase()} (${l.level})`).join(", ");
  const interests = match.interests.join(", ");

  const historyStr = history
    .slice(-6)
    .map((m) => (m.from === "me" ? `User: ${m.text}` : `You: ${m.text}`))
    .join("\n");

  return `You are ${match.name}, a ${match.country} native who speaks ${langName} natively.
You are learning: ${learning}.
Your interests: ${interests}.
Your bio: ${match.bio}

IMPORTANT RULES:
- Always reply in your NATIVE language: ${langName}. This is a language exchange app.
- Keep replies SHORT (1-3 sentences max). Natural, friendly, real.
- Show personality. You are a real person with opinions.
- If the user writes in ${langName}, respond enthusiastically. If they write in another language, encourage them gently.
- Never translate. Just reply naturally as ${match.name}.

${historyStr ? `Conversation so far:\n${historyStr}\n` : ""}User: ${userMessage}
You:`;
}

function fallbackReply(nativeLang: string): string {
  const replies: Record<string, string> = {
    de: "Hallo! Wie geht's dir? Ich freue mich, von dir zu hören! 😊",
    ru: "Привет! Как дела? Рад тебя слышать! 😊",
    ja: "こんにちは！元気ですか？お話できてうれしいです！😊",
    zh: "你好！你怎么样？很高兴认识你！😊",
    en: "Hey! How's it going? Great to hear from you! 😊",
    es: "¡Hola! ¿Cómo estás? ¡Me alegra que me escribas! 😊",
  };
  return replies[nativeLang] ?? replies.en;
}

async function tryClaudeAPI(prompt: string): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? "";
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.content?.[0]?.text ?? "").trim();
    return text || null;
  } catch {
    return null;
  }
}

// Fallback: Google Gemini (gratis)
async function tryGeminiAPI(prompt: string): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function getBotReply(
  match: MatchProfile,
  messageHistory: HistoryItem[],
  userMessage: string
): Promise<string> {
  const prompt = buildPrompt(match, messageHistory, userMessage);

  // Intentar Claude primero
  const claude = await tryClaudeAPI(prompt);
  if (claude) return claude;

  // Fallback Gemini
  const gemini = await tryGeminiAPI(prompt);
  if (gemini) return gemini;

  // Fallback local
  return fallbackReply(match.nativeLang);
}

export const botReply = getBotReply;