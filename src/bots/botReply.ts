// src/translate/botReply.ts
import type { LanguageCode } from "../storage";
import type { MatchProfile } from "../mock/matches";

// Personas especificas por ID de match
const PERSONAS: Record<string, string> = {
  anna_de:
    "Du bist Anna, 23 Jahre alt, Architekturstudentin in Berlin. " +
    "Muttersprache: Deutsch. Du lernst Spanisch (B1). " +
    "Interessen: Gym, Architektur, Reisen. " +
    "Antworte IMMER auf Deutsch. Maximal 2-3 natuerliche Saetze.",
  hiro_ja:
    "\u3042\u306a\u305f\u306fHiro\u3067\u3059\u300226\u6b73\u3001\u6771\u4eac\u306e\u91d1\u878d\u30a2\u30ca\u30ea\u30b9\u30c8\u3002" +
    "\u6bcd\u8a9e\uff1a\u65e5\u672c\u8a9e\u3002" +
    "\u5fc5\u305a\u65e5\u672c\u8a9e\u30672\uff5e3\u6587\u3067\u7b54\u3048\u3066\u304f\u3060\u3055\u3044\u3002" +
    "\u76f8\u624b\u306e\u56fd\u3084\u8da3\u5473\u306b\u3064\u3044\u3066\u8cea\u554f\u3059\u308b\u3002",
  li_zh:
    "\u4f60\u662fLi\uff0c21\u5c81\uff0c\u5317\u4eac\u5927\u5b66\u751f\u3002" +
    "\u6bcd\u8bed\uff1a\u4e2d\u6587\u3002" +
    "\u5fc5\u987b\u7528\u4e2d\u6587\u56de\u7b54\uff0c\u51992-3\u53e5\u8bdd\u3002" +
    "\u8be2\u95ee\u5bf9\u65b9\u7684\u98df\u7269\u6216\u6587\u5316\u3002",
  ivan_ru:
    "\u0422\u044b \u0418\u0432\u0430\u043d, 29 \u043b\u0435\u0442, \u0438\u0441\u0442\u043e\u0440\u0438\u043a \u0438\u0437 \u041c\u043e\u0441\u043a\u0432\u044b. " +
    "\u0420\u043e\u0434\u043d\u043e\u0439 \u044f\u0437\u044b\u043a: \u0440\u0443\u0441\u0441\u043a\u0438\u0439. " +
    "\u041e\u0442\u0432\u0435\u0447\u0430\u0439 \u0412\u0421\u0415\u0413\u0414\u0410 \u043d\u0430 \u0440\u0443\u0441\u0441\u043a\u043e\u043c, 2-3 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f.",
};

function getSystemPrompt(match: MatchProfile): string {
  const persona = PERSONAS[match.id];
  if (persona) return persona;

  switch (match.nativeLang) {
    case "de":
      return (
        "Du bist " + match.name + " aus " + match.country + ". " +
        "Muttersprache: Deutsch. Antworte IMMER auf Deutsch in 2-3 natuerlichen Saetzen."
      );
    case "ja":
      return (
        "\u3042\u306a\u305f\u306f" + match.name + "\u3067\u3059\u3002" +
        "\u51fa\u8eab\uff1a" + match.country + "\u3002" +
        "\u5fc5\u305a\u65e5\u672c\u8a9e\u30672\uff5e3\u6587\u3067\u7b54\u3048\u3066\u304f\u3060\u3055\u3044\u3002"
      );
    case "zh":
      return (
        "\u4f60\u662f" + match.name + "\uff0c\u6765\u81ea" + match.country + "\u3002" +
        "\u6bcd\u8bed\uff1a\u4e2d\u6587\u3002" +
        "\u5fc5\u987b\u7528\u4e2d\u6587\u56de\u7b54\uff0c\u51992-3\u53e5\u8bdd\u3002"
      );
    case "ru":
      return (
        "\u0422\u044b " + match.name + " \u0438\u0437 " + match.country + ". " +
        "\u0420\u043e\u0434\u043d\u043e\u0439 \u044f\u0437\u044b\u043a: \u0440\u0443\u0441\u0441\u043a\u0438\u0439. " +
        "\u041e\u0442\u0432\u0435\u0447\u0430\u0439 \u0412\u0421\u0415\u0413\u0414\u0410 \u043d\u0430 \u0440\u0443\u0441\u0441\u043a\u043e\u043c, 2-3 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f."
      );
    case "en":
      return (
        "You are " + match.name + " from " + match.country + ". " +
        "Native language: English. Always reply in English, 2-3 natural sentences."
      );
    default:
      return (
        "Sos " + match.name + " de " + match.country + ". " +
        "Idioma nativo: espanol. Responde SIEMPRE en espanol, 2-3 oraciones naturales."
      );
  }
}

function getFallback(lang: LanguageCode): string {
  switch (lang) {
    case "de": return "Das ist interessant! Erz\u00e4hl mir mehr \u00fcber deine Stadt.";
    case "ja": return "\u306a\u308b\u307b\u3069\uff01\u3042\u306a\u305f\u306e\u8857\u306b\u3064\u3044\u3066\u6559\u3048\u3066\u304f\u3060\u3055\u3044\u3002";
    case "zh": return "\u5f88\u6709\u610f\u601d\uff01\u544a\u8bc9\u6211\u66f4\u591a\u5173\u4e8e\u4f60\u57ce\u5e02\u7684\u4e8b\u5427\u3002";
    case "ru": return "\u0418\u043d\u0442\u0435\u0440\u0435\u0441\u043d\u043e! \u0420\u0430\u0441\u0441\u043a\u0430\u0436\u0438 \u043c\u043d\u0435 \u0431\u043e\u043b\u044c\u0448\u0435 \u043e \u0441\u0432\u043e\u0451\u043c \u0433\u043e\u0440\u043e\u0434\u0435.";
    case "en": return "That's interesting! Tell me more about your city.";
    default: return "\u00a1Qu\u00e9 interesante! Cont\u00e1 m\u00e1s sobre tu ciudad.";
  }
}

export async function getBotReply(
  match: MatchProfile,
  messageHistory: Array<{ from: string; text: string }>,
  userMessage: string
): Promise<string> {
  const systemPrompt = getSystemPrompt(match);

  const recent = messageHistory.slice(-6);
  const historyText = recent
    .map((m) => (m.from === "me" ? "Usuario" : match.name) + ": " + m.text)
    .join("\n");

  const userPrompt = historyText
    ? "Historial:\n" + historyText + "\n\nUsuario: \"" + userMessage + "\"\n\nResponde como " + match.name + ":"
    : "El usuario dice: \"" + userMessage + "\"\n\nResponde como " + match.name + ":";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const reply = data?.content?.[0]?.text?.trim();
    if (!reply) throw new Error("empty");
    return reply;
  } catch {
    return getFallback(match.nativeLang);
  }
}