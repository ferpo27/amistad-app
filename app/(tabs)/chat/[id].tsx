// app/(tabs)/chat/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform, Modal, ActivityIndicator, ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useThemeMode } from "../../../src/theme";
import { MATCHES } from "../../../src/mock/matches";
import { getProfile, getChat, appendChat, getAppLanguage, type ChatMessage } from "../../../src/storage";
import { generateConversationStarters } from "../../../src/conversation/connectionEngine";
import { blockUser, reportUser, type ReportReason } from "../../../src/safety";
import { getBotReply } from "../../../src/bots/botReply";
import { getCulturalTip } from "../../../src/culture/culturalTips";
import { translateCached, translateWordInContextCached } from "../../../src/translate/autoTranslate";
import type { LanguageCode } from "../../../src/translate/types";
import { translatorHealth, getTranslatorBaseUrl } from "../../../src/translate/apiClient";

type MatchProfile = (typeof MATCHES)[number];
type WordToken = { token: string; index: number };

// ─── Helpers ────────────────────────────────────────────────────────────────

// CJK tokenizer — cada kanji/hanzi es su propia palabra para traducir
const RE_CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u;

function splitCJK(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    if (RE_CJK.test(ch)) out.push(ch);       // cada kanji = 1 token
    else if (/[。！？!?…、,\s]/.test(ch)) out.push(ch);
    else {
      // letras latinas juntas (nombres propios dentro del texto)
      if (out.length && !RE_CJK.test(out[out.length - 1]) && !/[。！？!?…、,\s]/.test(out[out.length - 1])) {
        out[out.length - 1] += ch;
      } else {
        out.push(ch);
      }
    }
  }
  return out.filter(Boolean);
}

function tokenizeWords(text: string): string[] {
  if (RE_CJK.test(text)) return splitCJK(text);
  return text.split(/(\s+|[,.!?;:()¿¡"""\'\'-])/g).filter((t) => t !== "" && t !== undefined);
}
function isOnlyPunctOrSpace(t: string): boolean {
  return !!t.match(/^\s+$/) || !!t.match(/^[,.!?;:()¿¡"""\'\'\-。！？…、]+$/);
}
function normalizeUiLang(lang: string | undefined | null): LanguageCode {
  const two = (lang ?? "es").toLowerCase().slice(0, 2);
  if (two === "es") return "es"; if (two === "en") return "en";
  if (two === "de") return "de"; if (two === "ja") return "ja";
  if (two === "ru") return "ru"; if (two === "zh") return "zh";
  return "es";
}
function splitSegments(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const m = t.match(/[^.!?]+[.!?]*/g);
  return m ? m.map((s) => s.trim()).filter(Boolean) : [t];
}

// ─── Icebreakers bilingüe: texto en idioma del match + traducción en español ──
type StarterItem = { id: string; textNative: string; textEs: string };

function starterTemplatesNative(nativeLang: LanguageCode, name: string, country: string): { native: string; es: string }[] {
  switch (nativeLang) {
    case "de": return [
      { native: `Hi ${name}! Was magst du am meisten an ${country}?`, es: `¡Hola ${name}! ¿Qué es lo que más te gusta de ${country}?` },
      { native: `Welche Gerichte aus ${country} empfiehlst du?`, es: `¿Qué comidas de ${country} recomendás?` },
      { native: `Was sind deine Hobbys?`, es: `¿Cuáles son tus hobbies?` },
    ];
    case "ru": return [
      { native: `Привет, ${name}! Что тебе нравится в ${country}?`, es: `¡Hola ${name}! ¿Qué te gusta de ${country}?` },
      { native: `Какую еду в ${country} посоветуешь?`, es: `¿Qué comida de ${country} recomendás?` },
      { native: `Какие у тебя хобби?`, es: `¿Cuáles son tus hobbies?` },
    ];
    case "ja": return [
      { native: `こんにちは、${name}！${country}で好きなところは？`, es: `¡Hola ${name}! ¿Qué parte de ${country} te gusta más?` },
      { native: `${country}のおすすめ食べ物は？`, es: `¿Qué comida de ${country} recomendás?` },
      { native: `趣味は何ですか？`, es: `¿Cuáles son tus hobbies?` },
    ];
    case "zh": return [
      { native: `你好，${name}！你最喜欢${country}的什么？`, es: `¡Hola ${name}! ¿Qué es lo que más te gusta de ${country}?` },
      { native: `你推荐${country}的美食是什么？`, es: `¿Qué comida de ${country} recomendás?` },
      { native: `你有什么爱好？`, es: `¿Cuáles son tus hobbies?` },
    ];
    case "en": return [
      { native: `Hey ${name}! What do you like most about ${country}?`, es: `¿Qué es lo que más te gusta de ${country}?` },
      { native: `What food from ${country} should I try?`, es: `¿Qué comida de ${country} debería probar?` },
      { native: `What are your hobbies?`, es: `¿Cuáles son tus hobbies?` },
    ];
    default: return [
      { native: `¡Hola ${name}! ¿Qué te gusta de vivir en ${country}?`, es: `¿Qué te gusta de vivir en ${country}?` },
      { native: `¿Qué comida de ${country} recomendás?`, es: `¿Qué comida recomendás?` },
      { native: `¿Qué hobbies tenés?`, es: `¿Qué hobbies tenés?` },
    ];
  }
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const matchId = String(params?.id ?? "");
  const { colors } = useThemeMode();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const match = useMemo<MatchProfile | null>(() => {
    const m = (MATCHES as any[]).find((x) => String(x.id) === matchId);
    return (m ?? null) as MatchProfile | null;
  }, [matchId]);

  const [meProfile, setMeProfile] = useState<any>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [openSafety, setOpenSafety] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [showStarters, setShowStarters] = useState(true);
  const [uiLang, setUiLang] = useState<LanguageCode>("es");
  const [openWord, setOpenWord] = useState(false);
  const [activeSentence, setActiveSentence] = useState("");
  const [activeSourceLang, setActiveSourceLang] = useState<LanguageCode>("en");
  const [wordTokens, setWordTokens] = useState<WordToken[]>([]);
  const [selectedToken, setSelectedToken] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [wordMeaning, setWordMeaning] = useState("");
  const [meaningLoading, setMeaningLoading] = useState(false);
  const [sentenceMeaning, setSentenceMeaning] = useState("");
  const [sentenceLoading, setSentenceLoading] = useState(false);
  const [tokenMeanings, setTokenMeanings] = useState<Record<number, string>>({});
  const [translatorOk, setTranslatorOk] = useState<boolean | null>(null);
  const [translatorErr, setTranslatorErr] = useState("");

  const botLang: LanguageCode = (match?.nativeLang ?? "en") as LanguageCode;

  // Icebreakers contextuales: cambian según el historial de conversación
  const starters = useMemo<StarterItem[]>(() => {
    const name = match?.name ?? "friend";
    const country = match?.country ?? "";
    const lang = botLang;
    const all: StarterItem[] = [];

    // ── Sin mensajes: saludo inicial ────────────────────────────────────────
    if (msgs.length === 0) {
      const greetings: Record<LanguageCode, { native: string; es: string }[]> = {
        de: [
          { native: `Hallo ${name}! Wie geht's dir heute? 😊`, es: `¡Hola ${name}! ¿Cómo estás hoy?` },
          { native: `Hi ${name}! Ich lerne gerade Deutsch — kannst du mir helfen?`, es: `¡Hola! Estoy aprendiendo alemán, ¿me ayudás?` },
          { native: `Hey ${name}! Was machst du so gerne in ${country}?`, es: `¿Qué te gusta hacer en ${country}?` },
        ],
        ru: [
          { native: `Привет, ${name}! Как дела? 😊`, es: `¡Hola ${name}! ¿Cómo estás?` },
          { native: `Привет! Я изучаю русский — поможешь мне?`, es: `¡Hola! Estoy aprendiendo ruso, ¿me ayudás?` },
          { native: `Привет, ${name}! Что любишь делать в ${country}?`, es: `¿Qué te gusta hacer en ${country}?` },
        ],
        ja: [
          { native: `こんにちは、${name}！今日はどうですか？😊`, es: `¡Hola ${name}! ¿Cómo estás hoy?` },
          { native: `はじめまして！日本語を勉強しています。助けてもらえますか？`, es: `¡Mucho gusto! Estoy estudiando japonés, ¿me ayudás?` },
          { native: `${country}で好きなことは何ですか？`, es: `¿Qué te gusta hacer en ${country}?` },
        ],
        zh: [
          { native: `你好，${name}！你今天怎么样？😊`, es: `¡Hola ${name}! ¿Cómo estás hoy?` },
          { native: `你好！我在学中文，你能帮我吗？`, es: `¡Hola! Estoy aprendiendo chino, ¿me ayudás?` },
          { native: `你在${country}最喜欢做什么？`, es: `¿Qué te gusta hacer en ${country}?` },
        ],
        en: [
          { native: `Hey ${name}! How's it going? 😊`, es: `¡Hola ${name}! ¿Cómo andás?` },
          { native: `Hi! I'm learning English — can you help me practice?`, es: `¡Hola! Estoy aprendiendo inglés, ¿practicamos?` },
          { native: `What do you enjoy doing in ${country}?`, es: `¿Qué te gusta hacer en ${country}?` },
        ],
        es: [
          { native: `¡Hola ${name}! ¿Cómo andás? 😊`, es: `¡Hola ${name}! ¿Cómo estás?` },
          { native: `¡Hola! Estoy aprendiendo español, ¿me ayudás?`, es: `¡Hola! Estoy aprendiendo español.` },
          { native: `¿Qué te gusta hacer en ${country}?`, es: `¿Qué te gusta hacer en ${country}?` },
        ],
      };
      const opts = greetings[lang] ?? greetings.en;
      opts.forEach((t, i) => all.push({ id: `greet${i}`, textNative: t.native, textEs: t.es }));
    }

    // ── Con mensajes: sugerir respuestas basadas en el último mensaje del bot ─
    else {
      const lastBotMsg = [...msgs].reverse().find((m) => m.from === "them");
      const lastUserMsg = [...msgs].reverse().find((m) => m.from === "me");
      const lastText = lastBotMsg?.text ?? "";
      const myInterests = meProfile?.interests ?? [];
      const common = (match?.interests ?? []).filter((i) => myInterests.includes(i));

      // Respuestas de continuación según idioma
      const continuations: Record<LanguageCode, { native: string; es: string }[]> = {
        de: [
          { native: `Das ist sehr interessant! Erzähl mir mehr.`, es: `¡Qué interesante! Contame más.` },
          { native: `Wirklich? Das wusste ich nicht!`, es: `¿En serio? ¡No lo sabía!` },
          { native: `Wie lange wohnst du schon in ${country}?`, es: `¿Hace cuánto vivís en ${country}?` },
        ],
        ru: [
          { native: `Это очень интересно! Расскажи подробнее.`, es: `¡Qué interesante! Contame más.` },
          { native: `Правда? Я не знал(а)!`, es: `¿En serio? ¡No lo sabía!` },
          { native: `Как давно ты живёшь в ${country}?`, es: `¿Hace cuánto vivís en ${country}?` },
        ],
        ja: [
          { native: `それはとても面白いですね！もっと教えてください。`, es: `¡Qué interesante! Contame más.` },
          { native: `本当ですか？知りませんでした！`, es: `¿En serio? ¡No lo sabía!` },
          { native: `${country}にはどのくらい住んでいますか？`, es: `¿Hace cuánto vivís en ${country}?` },
        ],
        zh: [
          { native: `这真的很有趣！请告诉我更多。`, es: `¡Qué interesante! Contame más.` },
          { native: `真的吗？我不知道！`, es: `¿En serio? ¡No lo sabía!` },
          { native: `你在${country}住了多久了？`, es: `¿Hace cuánto vivís en ${country}?` },
        ],
        en: [
          { native: `That's really interesting! Tell me more.`, es: `¡Qué interesante! Contame más.` },
          { native: `Really? I didn't know that!`, es: `¿En serio? ¡No lo sabía!` },
          { native: `How long have you been in ${country}?`, es: `¿Hace cuánto vivís en ${country}?` },
        ],
        es: [
          { native: `¡Qué interesante! Contame más.`, es: `¡Qué interesante! Contame más.` },
          { native: `¿En serio? ¡No lo sabía!`, es: `¿En serio? ¡No lo sabía!` },
          { native: `¿Hace cuánto vivís en ${country}?`, es: `¿Hace cuánto vivís en ${country}?` },
        ],
      };

      const opts = continuations[lang] ?? continuations.en;
      opts.forEach((t, i) => all.push({ id: `cont${i}`, textNative: t.native, textEs: t.es }));

      // Si tienen intereses en común, sugerir uno
      if (common.length > 0) {
        const interest = common[0];
        const interestSuggestions: Record<LanguageCode, { native: string; es: string }> = {
          de: { native: `Ich mag auch ${interest}! Was ist dein Lieblingsaspekt davon?`, es: `¡A mí también me gusta ${interest}! ¿Qué es lo que más te gusta?` },
          ru: { native: `Мне тоже нравится ${interest}! Что тебе в этом больше всего нравится?`, es: `¡A mí también me gusta ${interest}!` },
          ja: { native: `私も${interest}が好きです！一番好きなところは？`, es: `¡A mí también me gusta ${interest}!` },
          zh: { native: `我也喜欢${interest}！你最喜欢哪方面？`, es: `¡A mí también me gusta ${interest}!` },
          en: { native: `I also love ${interest}! What do you enjoy most about it?`, es: `¡A mí también me gusta ${interest}!` },
          es: { native: `¡A mí también me gusta ${interest}! ¿Qué es lo que más disfrutás?`, es: `¡A mí también me gusta ${interest}!` },
        };
        const s = interestSuggestions[lang];
        if (s) all.push({ id: "common", textNative: s.native, textEs: s.es });
      }
    }

    const seen = new Set<string>();
    return all.filter((s) => {
      if (seen.has(s.textNative)) return false;
      seen.add(s.textNative);
      return true;
    }).slice(0, 5);
  }, [match, meProfile, botLang, msgs]);

  useEffect(() => {
    (async () => {
      const my = await getProfile();
      setMeProfile(my);
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(normalizeUiLang(l));
      const history = await getChat(matchId);
      if (history.length === 0 && match) {
        setBotTyping(true);
        const opening = await getBotReply(match, [], "Hola!").catch(() => null);
        setBotTyping(false);
        if (opening) {
          const init = await appendChat(matchId, { from: "them", text: opening });
          setMsgs(init);
        }
      } else {
        setMsgs(history);
        if (history.length > 0) setShowStarters(false);
      }
      const ok = await translatorHealth();
      setTranslatorOk(ok);
      setTranslatorErr(ok ? "" : `Traductor no disponible`);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    })();
  }, [matchId]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(normalizeUiLang(l));
    })();
  }, []));

  async function addMessage(from: "me" | "them", messageText: string) {
    const value = messageText.trim();
    if (!value) return;
    const next = await appendChat(matchId, { from, text: value });
    setMsgs(next);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }

  async function onSend(customText?: string) {
    const raw = (customText ?? text).trim();
    if (!raw || !matchId) return;
    setText("");
    setShowStarters(false);
    await addMessage("me", raw);
    if (!match) return;
    setBotTyping(true);
    setTimeout(async () => {
      try {
        const currentHistory = await getChat(matchId);
        const reply = await getBotReply(match, currentHistory, raw);
        await addMessage("them", reply);
        setTranslatorOk(true); setTranslatorErr("");
      } catch {
        const fallbacks: Record<LanguageCode, string> = {
          de: "Das ist interessant!", ja: "なるほど！", zh: "很有意思！",
          ru: "Интересно!", en: "Interesting!", es: "¡Qué interesante!",
        };
        await addMessage("them", fallbacks[botLang] ?? fallbacks.en);
      } finally { setBotTyping(false); }
    }, 800 + Math.random() * 1200);
  }

  function openTranslatorSheet(sentenceText: string, tappedToken: string, from: "me" | "them") {
    const cleanToken = tappedToken.trim();
    if (!cleanToken || isOnlyPunctOrSpace(cleanToken)) return;
    const src = from === "them" ? botLang : uiLang;
    const all = tokenizeWords(sentenceText);
    const words: WordToken[] = [];
    for (let i = 0; i < all.length; i++) {
      const c = all[i].trim();
      if (!c || isOnlyPunctOrSpace(c)) continue;
      words.push({ token: c, index: i });
    }
    const first = words.findIndex((w) => w.token.toLowerCase() === cleanToken.toLowerCase());
    const safePos = first >= 0 ? first : 0;
    setActiveSentence(sentenceText);
    setActiveSourceLang(src);
    setWordTokens(words);
    const initial = words[safePos] ?? { token: cleanToken, index: -1 };
    setSelectedToken(initial.token);
    setSelectedIndex(initial.index);
    setWordMeaning(""); setSentenceMeaning(""); setTokenMeanings({});
    setOpenWord(true);
    if (initial.index >= 0) void translateOneToken(initial, src);
  }

  async function translateOneToken(wt: WordToken, sourceLang: LanguageCode) {
    setSelectedToken(wt.token);
    setSelectedIndex(wt.index);
    if (tokenMeanings[wt.index]) { setWordMeaning(tokenMeanings[wt.index]); return; }
    setMeaningLoading(true);
    setWordMeaning("");
    try {
      let result: string | null = null;
      try {
        const res: any = await translateWordInContextCached({
          fullText: activeSentence, tappedTokenIndex: wt.index, sourceLang, targetLang: uiLang,
        });
        result = (res?.tappedMeaning && String(res.tappedMeaning).trim()) ||
          (res?.translatedWord && String(res.translatedWord).trim()) || null;
      } catch {}
      if (!result) {
        const t = await translateCached({ text: wt.token, targetLang: uiLang, sourceLang });
        result = (t ?? "").trim() || "—";
      }
      setWordMeaning(result ?? "—");
      setTokenMeanings((p) => ({ ...p, [wt.index]: result ?? "—" }));
    } catch {
      setWordMeaning("No se pudo traducir.");
    } finally { setMeaningLoading(false); }
  }

  async function translateWholeSentence() {
    const sentence = activeSentence.trim();
    if (!sentence) return;
    setSentenceLoading(true); setSentenceMeaning("");
    try {
      const parts: string[] = [];
      for (const seg of splitSegments(sentence)) {
        const t = await translateCached({ text: seg, targetLang: uiLang, sourceLang: activeSourceLang });
        parts.push((t ?? "").trim());
      }
      setSentenceMeaning(parts.filter(Boolean).join(" ").trim() || "—");
    } catch {
      setSentenceMeaning("No se pudo traducir.");
    } finally { setSentenceLoading(false); }
  }

  const LANG_FLAG: Record<LanguageCode, string> = { es: "🇦🇷", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳" };
  const LANG_NAME: Record<LanguageCode, string> = { es: "ES", en: "EN", de: "DE", ja: "JA", ru: "RU", zh: "ZH" };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 58 : 24,
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{
            width: 40, height: 40, borderRadius: 20,
            borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>←</Text>
          </Pressable>

          {/* Avatar circular con inicial */}
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: colors.accent,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
              {(match?.name ?? "?")[0].toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 17 }} numberOfLines={1}>
              {match?.name ?? "Chat"}
              <Text style={{ opacity: 0.45, fontSize: 13, fontWeight: "700" }}>
                {match?.country ? `  ${match.country}` : ""}
              </Text>
            </Text>
            <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", fontSize: 12 }}>
              {botTyping ? "✍️ escribiendo…" : `${LANG_FLAG[botLang]} ${LANG_NAME[botLang]} · tocá una palabra para traducir`}
            </Text>
          </View>

          {/* Botón Icebreakers */}
          <Pressable onPress={() => setShowStarters((v) => !v)} style={{
            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
            borderWidth: 1,
            borderColor: showStarters ? colors.accent : colors.border,
            backgroundColor: showStarters ? colors.accentSoft : colors.card,
          }}>
            <Text style={{ fontSize: 16 }}>🧊</Text>
          </Pressable>

          {/* Seguridad */}
          <Pressable onPress={() => setOpenSafety(true)} style={{
            width: 36, height: 36, borderRadius: 18,
            borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 16 }}>🚨</Text>
          </Pressable>
        </View>

        {/* Error traductor */}
        {translatorOk === false && (
          <View style={{ marginTop: 8, backgroundColor: "#ff3b3015", borderRadius: 10, padding: 8 }}>
            <Text style={{ color: "#ff3b30", fontSize: 12, fontWeight: "700" }}>⚠ {translatorErr}</Text>
          </View>
        )}

        {/* ── ICEBREAKERS ──────────────────────────────────────────────── */}
        {showStarters && starters.length > 0 && (
          <View style={{
            marginTop: 12,
            borderWidth: 1, borderColor: colors.border,
            borderRadius: 18, overflow: "hidden",
            backgroundColor: colors.card,
          }}>
            <View style={{
              flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
              borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
              <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 12, letterSpacing: 0.5, opacity: 0.6 }}>
                🧊 ICEBREAKERS
              </Text>
              <Pressable onPress={() => setShowStarters(false)}>
                <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "700", fontSize: 12 }}>Cerrar ✕</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 8 }}>
              {starters.map((s) => (
                <Pressable key={s.id} onPress={() => onSend(s.textNative)} style={{
                  paddingVertical: 10, paddingHorizontal: 14,
                  borderRadius: 14, borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  maxWidth: 240, gap: 4,
                }}>
                  {/* Texto en idioma nativo (lo que se envía) */}
                  <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 13 }} numberOfLines={2}>
                    {s.textNative}
                  </Text>
                  {/* Traducción al español (para que el usuario entienda) */}
                  {s.textEs !== s.textNative && (
                    <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 11 }} numberOfLines={1}>
                      → {s.textEs}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── CHAT ───────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={botTyping ? (
            <View style={{
              alignSelf: "flex-start", marginBottom: 10,
              paddingHorizontal: 16, paddingVertical: 12,
              backgroundColor: colors.card,
              borderRadius: 18, borderTopLeftRadius: 4,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Bubble
              item={item}
              colors={colors}
              onWordPress={(token) => openTranslatorSheet(item.text, token, item.from)}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* ── INPUT ──────────────────────────────────────────────────── */}
        <View style={{
          paddingHorizontal: 12, paddingVertical: 10,
          borderTopWidth: 1, borderTopColor: colors.border,
          backgroundColor: colors.bg,
          flexDirection: "row", gap: 8, alignItems: "flex-end",
        }}>
          {/* Botón traductor del último mensaje */}
          <Pressable
            onPress={() => {
              const last = [...msgs].reverse().find((m) => m.from === "them");
              if (last) openTranslatorSheet(last.text, last.text.split(" ")[0], "them");
            }}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20 }}>🔤</Text>
          </Pressable>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Escribí en ${LANG_NAME[botLang]}…`}
            placeholderTextColor={colors.fg + "55"}
            multiline
            style={{
              flex: 1, minHeight: 44, maxHeight: 120,
              paddingHorizontal: 14, paddingVertical: 10,
              borderRadius: 22, borderWidth: 1, borderColor: colors.border,
              backgroundColor: colors.card, color: colors.fg, fontWeight: "600",
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={() => onSend()}
            disabled={!text.trim() || botTyping}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: text.trim() && !botTyping ? colors.accent : colors.border,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ── MODAL TRADUCTOR ────────────────────────────────────────────── */}
      <Modal visible={openWord} transparent animationType="slide">
        <Pressable
          onPress={() => setOpenWord(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        >
          <Pressable onPress={() => {}} style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 20,
            borderTopWidth: 1, borderColor: colors.border,
            maxHeight: "88%",
          }}>
            {/* Handle */}
            <View style={{
              alignSelf: "center", width: 40, height: 4,
              borderRadius: 2, backgroundColor: colors.border, marginBottom: 16,
            }} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Oración original */}
              <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>
                ORACIÓN ORIGINAL
              </Text>
              <View style={{
                backgroundColor: colors.card, borderRadius: 14,
                borderWidth: 1, borderColor: colors.border,
                padding: 14, marginBottom: 20,
              }}>
                <Text style={{ color: colors.fg, fontWeight: "700", lineHeight: 22 }}>{activeSentence || "—"}</Text>
              </View>

              {/* Palabra seleccionada + significado */}
              <View style={{
                backgroundColor: colors.accentSoft,
                borderRadius: 16, borderWidth: 1, borderColor: colors.accent + "40",
                padding: 16, marginBottom: 16,
              }}>
                <Text style={{ color: colors.accent, fontWeight: "900", fontSize: 26, marginBottom: 6 }}>
                  {selectedToken || "—"}
                </Text>
                {meaningLoading ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={{ color: colors.fg, opacity: 0.6, fontWeight: "600" }}>Traduciendo…</Text>
                  </View>
                ) : (
                  <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 16 }}>
                    {wordMeaning || "—"}
                  </Text>
                )}
              </View>

              {/* Palabra por palabra */}
              <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>
                PALABRA POR PALABRA
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                {wordTokens.map((wt) => {
                  const active = wt.index === selectedIndex;
                  const meaning = tokenMeanings[wt.index];
                  return (
                    <Pressable
                      key={`${wt.index}-${wt.token}`}
                      onPress={() => translateOneToken(wt, activeSourceLang)}
                      style={{
                        paddingVertical: 10, paddingHorizontal: 14,
                        borderRadius: 14, borderWidth: 1,
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accentSoft : colors.card,
                        minWidth: 80, maxWidth: 160, alignItems: "center",
                      }}
                    >
                      <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 15 }} numberOfLines={1}>
                        {wt.token}
                      </Text>
                      {meaning ? (
                        <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 11, marginTop: 4 }} numberOfLines={2}>
                          {meaning}
                        </Text>
                      ) : (
                        <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 11, marginTop: 4 }}>—</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Traducir toda la oración */}
              <Pressable
                onPress={translateWholeSentence}
                style={{
                  paddingVertical: 14, borderRadius: 16,
                  backgroundColor: colors.accent, alignItems: "center", marginBottom: 12,
                }}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                  {sentenceLoading ? "Traduciendo…" : "Traducir oración completa"}
                </Text>
              </Pressable>

              {sentenceMeaning ? (
                <View style={{
                  backgroundColor: colors.card, borderRadius: 14,
                  borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 16,
                }}>
                  <Text style={{ color: colors.fg, fontWeight: "700", lineHeight: 22 }}>{sentenceMeaning}</Text>
                </View>
              ) : null}

              <Pressable onPress={() => setOpenWord(false)} style={{
                paddingVertical: 14, borderRadius: 16,
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.card, alignItems: "center",
              }}>
                <Text style={{ color: colors.fg, fontWeight: "700" }}>Cerrar</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL SEGURIDAD ─────────────────────────────────────────────── */}
      <Modal visible={openSafety} transparent animationType="slide">
        <Pressable
          onPress={() => setOpenSafety(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        >
          <Pressable onPress={() => {}} style={{
            backgroundColor: colors.bg, padding: 20,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            borderTopWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.fg, fontSize: 20, fontWeight: "900", marginBottom: 4 }}>Seguridad</Text>
            <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "600", marginBottom: 16, fontSize: 13 }}>
              Denunciá o bloqueá con un toque.
            </Text>
            <View style={{ gap: 10 }}>
              {(["spam", "acoso", "contenido_sexual", "odio", "estafa", "otro"] as ReportReason[]).map((k) => (
                <Pressable key={k}
                  onPress={async () => {
                    await reportUser({ id: matchId, reason: k, note: reportNote?.trim() || undefined });
                    setOpenSafety(false);
                  }}
                  style={{
                    padding: 14, borderRadius: 14,
                    borderWidth: 1, borderColor: colors.border,
                    backgroundColor: colors.card,
                  }}>
                  <Text style={{ color: colors.fg, fontWeight: "800" }}>
                    Denunciar: {k.replace("_", " ")}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                value={reportNote} onChangeText={setReportNote}
                placeholder="Nota opcional…"
                placeholderTextColor={colors.fg + "55"}
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 14,
                  padding: 14, backgroundColor: colors.card, color: colors.fg, fontWeight: "600",
                }}
              />
              <Pressable
                onPress={async () => {
                  await blockUser(matchId);
                  setOpenSafety(false);
                  router.replace("/(tabs)/home");
                }}
                style={{ padding: 14, borderRadius: 14, backgroundColor: "#ff3b30" }}>
                <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
                  🚫 Bloquear y salir
                </Text>
              </Pressable>
              <Pressable onPress={() => setOpenSafety(false)} style={{ padding: 12 }}>
                <Text style={{ textAlign: "center", fontWeight: "700", color: colors.fg, opacity: 0.5 }}>Cancelar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Bubble ──────────────────────────────────────────────────────────────────

function Bubble({ item, colors, onWordPress }: {
  item: ChatMessage; colors: any; onWordPress: (w: string) => void;
}) {
  const mine = item.from === "me";
  const parts = useMemo(() => tokenizeWords(item.text), [item.text]);

  return (
    <View style={{
      alignSelf: mine ? "flex-end" : "flex-start",
      maxWidth: "82%", marginBottom: 12,
    }}>
      <View style={{
        backgroundColor: mine ? colors.accent : colors.card,
        borderRadius: 20,
        borderTopRightRadius: mine ? 4 : 20,
        borderTopLeftRadius: mine ? 20 : 4,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1,
        borderColor: mine ? "transparent" : colors.border,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {parts.map((p, idx) => {
            const isWord = !p.match(/^\s+$/) && !p.match(/^[,.!?;:()¿¡"""''\-]+$/);
            if (!isWord) {
              return (
                <Text key={`${idx}-${p}`} style={{
                  color: mine ? "rgba(255,255,255,0.9)" : colors.fg,
                  fontWeight: "500", fontSize: 15, lineHeight: 22,
                }}>
                  {p}
                </Text>
              );
            }
            return (
              <Pressable key={`${idx}-${p}`} onPress={() => onWordPress(p)}>
                <Text style={{
                  color: mine ? "#fff" : colors.fg,
                  fontWeight: "700", fontSize: 15, lineHeight: 22,
                  textDecorationLine: mine ? "none" : "underline",
                  textDecorationColor: colors.accent + "80",
                }}>
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={{
        marginTop: 4, fontSize: 11, fontWeight: "600",
        color: colors.fg, opacity: 0.35,
        alignSelf: mine ? "flex-end" : "flex-start",
        paddingHorizontal: 4,
      }}>
        {new Date(item.ts).toLocaleTimeString().slice(0, 5)}
      </Text>
    </View>
  );
}