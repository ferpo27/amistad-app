// src/bots/botReply.ts
import type { MatchProfile } from "../mock/matches";

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

const LANG_NAMES: Record<string, string> = {
  es: "Spanish", en: "English", de: "German", ja: "Japanese", ru: "Russian", zh: "Mandarin Chinese",
};
const LANG_EXAMPLES: Record<string, string> = {
  es: "¡Hola!", en: "Hey!", de: "Hallo!", ja: "こんにちは！", ru: "Привет!", zh: "你好！",
};

// Detecta palabras clave usadas en la conversación para adaptar el tono
function extractConversationPatterns(history: HistoryItem[]): string {
  if (history.length === 0) return "";
  const userMessages = history.filter(m => m.from === "me").map(m => m.text).join(" ");
  const patterns: string[] = [];
  if (/lol|haha|jaja|😂|xd/i.test(userMessages)) patterns.push("uses humor and laughs often");
  if (/bro|dude|man|che|re |igual|tipo/i.test(userMessages)) patterns.push("uses casual slang");
  if (userMessages.length > 0 && userMessages.split(" ").length < 5) patterns.push("writes short messages");
  if (userMessages.length > 200) patterns.push("writes detailed long messages");
  if (/\?.*\?|\?{2}/i.test(userMessages)) patterns.push("asks many questions");
  return patterns.length > 0 ? `Conversation patterns detected: ${patterns.join(", ")}.` : "";
}

function buildPrompt(match: MatchProfile, history: HistoryItem[], userMessage: string): string {
  const recentHistory = history.slice(-10)
    .map((m) => `${m.from === "me" ? "User" : match.name}: ${m.text}`)
    .join("\n");

  const langName = LANG_NAMES[match.nativeLang] ?? match.nativeLang;
  const langExample = LANG_EXAMPLES[match.nativeLang] ?? "";
  const isFirstMessage = history.length === 0;
  const patterns = extractConversationPatterns(history);

  // Tono según intereses del match
  const isYoung = match.interests?.some(i => /anime|gaming|tiktok|music|gym/i.test(i));
  const toneGuide = isYoung
    ? "You are young and use modern casual expressions and slang natural to your language. Be energetic."
    : "You are warm and conversational. Use natural expressions from your culture.";

  const openingGuide = isFirstMessage
    ? `This is the FIRST message. Start with a warm, natural greeting in ${langName}. Mention something specific about your interests or country to spark curiosity. Don't be generic.`
    : `Continue the conversation naturally. ${patterns}`;

  return `You are ${match.name}, a real person from ${match.country}. Your native language is ${langName}.
${toneGuide}
Your interests: ${match.interests?.join(", ") ?? "culture, travel"}.
Bio: ${match.bio ?? ""}

RULES:
- Reply ONLY in ${langName}. Example: "${langExample}"
- Keep replies SHORT (1-3 sentences max)
- Use natural expressions, slang, and phrases real ${match.country} people use
- Mirror the user's energy and style
- NEVER switch to English unless ${langName} IS English
- ${openingGuide}

Conversation so far:
${recentHistory || "(no messages yet)"}

User: ${userMessage}
${match.name}:`;
}

async function tryGeminiAPI(
  match: MatchProfile,
  history: HistoryItem[],
  userMessage: string
): Promise<string | null> {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "AIzaSyCLoq-BPLesyvmXz5Dga06AB8kTtO4U8N0";
  console.log("[Gemini] key:", key ? "OK (" + key.slice(0, 8) + "...)" : "VACÍA");
  if (!key) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(match, history, userMessage) }] }],
        generationConfig: { maxOutputTokens: 150, temperature: 0.9 },
      }),
    });
    console.log("[Gemini] status:", res.status);
    if (!res.ok) {
      const err = await res.text();
      console.warn("[Gemini] error body:", err);
      return null;
    }
    const data = (await res.json()) as any;
    const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    console.log("[Gemini] respuesta:", text.slice(0, 60));
    return text || null;
  } catch (e) {
    console.warn("[Gemini] fetch error:", e);
    return null;
  }
}

async function tryClaudeAPI(
  match: MatchProfile,
  history: HistoryItem[],
  userMessage: string
): Promise<string | null> {
  const key = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? "";
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
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

async function tryCustomBackend(
  match: MatchProfile,
  history: HistoryItem[],
  userMessage: string
): Promise<string | null> {
  const apiUrl = process.env.EXPO_PUBLIC_BOT_API_URL ?? "";
  const apiKey = process.env.EXPO_PUBLIC_BOT_API_KEY ?? "";
  if (!apiUrl) return null;
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ match, messageHistory: history, userMessage }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return String(data?.reply ?? data?.text ?? "").trim() || null;
  } catch {
    return null;
  }
}

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

export const botReply = getBotReply;