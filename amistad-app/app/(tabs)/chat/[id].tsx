// app/(tabs)/chat/[id].tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import i18n from "../../../../src/i18n";
import { useThemeMode } from "../../../../src/theme";
import { MATCHES } from "../../../../src/mock/matches";
import { getProfile, getChat, appendChat, type ChatMessage } from "../../../../src/storage";
import { generateConversationStarters } from "../../../../src/conversation/connectionEngine";
import { blockUser, reportUser, type ReportReason } from "../../../../src/safety";
import { getBotReply } from "../../../../src/bots/botReply";
import {
  translateCached,
  translateWordInContextCached,
} from "../../../../src/translate/autoTranslate";
import type { LanguageCode } from "../../../../src/translate/types";
import { translatorHealth, getTranslatorBaseUrl } from "../../../../src/translate/apiClient";

type MatchProfile = (typeof MATCHES)[number];
type WordToken = { token: string; index: number };

function tokenizeWords(text: string): string[] {
  return text
    .split(/(\s+|[,.!?;:()¿¡"""''\-])/g)
    .filter((t: string) => t !== "" && t !== undefined);
}

function isOnlyPunctOrSpace(t: string): boolean {
  return !!t.match(/^\s+$/) || !!t.match(/^[,.!?;:()¿¡"""''\-]+$/);
}

function normalizeUiLang(lang: string | undefined | null): LanguageCode {
  const raw = (lang ?? "es").toLowerCase();
  const two = raw.slice(0, 2);
  if (two === "es") return "es";
  if (two === "en") return "en";
  if (two === "de") return "de";
  if (two === "ja") return "ja";
  if (two === "ru") return "ru";
  if (two === "zh") return "zh";
  return "es";
}

function splitSegments(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const matches = t.match(/[^.!?]+[.!?]*/g);
  if (!matches) return [t];
  return matches.map((s: string) => s.trim()).filter(Boolean);
}

function dictLookup(word: string, source: LanguageCode, target: LanguageCode): string | null {
  const w = word.trim().toLowerCase();
  if (!w || source !== "en") return null;

  const EN_TO: Record<LanguageCode, Record<string, string>> = {
    es: {
      nice: "encantado / agradable", to: "a / para", meet: "conocer / encontrarse",
      you: "vos / tú / usted", tell: "contar / decir", me: "me / a mí",
      about: "sobre / acerca de", your: "tu / tus", city: "ciudad",
      hobbies: "pasatiempos", and: "y", what: "qué", kind: "tipo / clase",
      of: "de", friends: "amigos", want: "querer", make: "hacer / crear",
      hi: "hola", hello: "hola", thanks: "gracias", please: "por favor",
    },
    en: {},
    de: {
      nice: "nett / schön", to: "zu / nach", meet: "treffen / kennenlernen",
      you: "du / Sie", tell: "erzählen / sagen", me: "mir / mich",
      about: "über", your: "dein / Ihr", city: "Stadt", hobbies: "Hobbys",
      and: "und", what: "was", kind: "Art / Sorte", of: "von",
      friends: "Freunde", want: "wollen / möchten", make: "machen",
      hi: "hi / hallo", hello: "hallo", thanks: "danke", please: "bitte",
    },
    ru: {
      nice: "приятно", to: "к / чтобы", meet: "встретиться / познакомиться",
      you: "ты / вы", tell: "рассказать / сказать", me: "мне / меня",
      about: "о / про", your: "твой / ваш", city: "город", hobbies: "хобби",
      and: "и", what: "что / какой", kind: "вид / тип", of: "из / о",
      friends: "друзья", want: "хотеть", make: "делать / заводить",
      hi: "привет", hello: "здравствуйте / привет", thanks: "спасибо", please: "пожалуйста",
    },
    ja: {
      nice: "うれしい / いい", to: "〜へ / 〜するために", meet: "会う / 出会う",
      you: "あなた", tell: "話す / 教える", me: "私に", about: "〜について",
      your: "あなたの", city: "街 / 市", hobbies: "趣味", and: "そして / と",
      what: "何 / どんな", kind: "種類", of: "の", friends: "友達",
      want: "欲しい / したい", make: "作る / なる",
      hi: "やあ / こんにちは", hello: "こんにちは", thanks: "ありがとう", please: "お願いします",
    },
    zh: {
      nice: "很高兴 / 不错", to: "去 / 为了", meet: "见面 / 认识",
      you: "你 / 您", tell: "告诉 / 讲", me: "我 / 告诉我",
      about: "关于", your: "你的 / 您的", city: "城市", hobbies: "爱好",
      and: "和 / 以及", what: "什么", kind: "种类", of: "的",
      friends: "朋友", want: "想要", make: "做 / 交(朋友)",
      hi: "嗨 / 你好", hello: "你好", thanks: "谢谢", please: "请 / 麻烦",
    },
  };

  const table = EN_TO[target];
  if (!table) return null;
  const cleaned = w.replace(/^[,.!?;:()¿¡"""''\-]+|[,.!?;:()¿¡"""''\-]+$/g, "");
  return table[cleaned] ?? null;
}

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

  const [openWord, setOpenWord] = useState(false);
  const [activeSentence, setActiveSentence] = useState<string>("");
  const [activeSourceLang, setActiveSourceLang] = useState<LanguageCode>("en");
  const [wordTokens, setWordTokens] = useState<WordToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [wordMeaning, setWordMeaning] = useState<string>("");
  const [meaningLoading, setMeaningLoading] = useState(false);
  const [sentenceMeaning, setSentenceMeaning] = useState<string>("");
  const [sentenceLoading, setSentenceLoading] = useState(false);
  const [tokenMeanings, setTokenMeanings] = useState<Record<number, string>>({});
  const [translatorOk, setTranslatorOk] = useState<boolean | null>(null);
  const [translatorErr, setTranslatorErr] = useState<string>("");

  const botLang: LanguageCode = ((match?.nativeLang ?? "en") as LanguageCode);

  useEffect(() => {
    (async () => {
      const my = await getProfile();
      setMeProfile(my);
      const history = await getChat(matchId);
      if (history.length === 0 && match) {
        const opening = await getBotReply(match, [], "Hola! Acabo de conectarme.").catch(() => null);
        if (opening) {
          const initialized = await appendChat(matchId, { from: "them", text: opening });
          setMsgs(initialized);
        } else {
          setMsgs([]);
        }
      } else {
        setMsgs(history);
      }
      const ok = await translatorHealth();
      setTranslatorOk(ok);
      setTranslatorErr(ok ? "" : `Traductor no disponible. URL: ${getTranslatorBaseUrl()}`);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    })();
  }, [matchId]);

  const starters = useMemo(() => {
    if (!match || !meProfile) return [];
    const texts = generateConversationStarters(meProfile, match);
    return texts.map((t: string, idx: number) => ({ id: String(idx), text: t }));
  }, [match, meProfile]);

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
    await addMessage("me", raw);
    if (!match) return;
    const delay = 800 + Math.random() * 1200;
    setBotTyping(true);
    setTimeout(async () => {
      try {
        const currentHistory = await getChat(matchId);
        const reply = await getBotReply(match, currentHistory, raw);
        await addMessage("them", reply);
        setTranslatorOk(true);
        setTranslatorErr("");
      } catch (e: any) {
        const fallbacks: Record<LanguageCode, string> = {
          de: "Das ist interessant! Erzähl mir mehr.",
          ja: "なるほど！もっと教えてください。",
          zh: "很有意思！告诉我更多吧。",
          ru: "Интересно! Расскажи мне больше.",
          en: "That's interesting! Tell me more.",
          es: "¡Qué interesante! Contame más.",
        };
        await addMessage("them", fallbacks[botLang] ?? fallbacks.en);
        setTranslatorOk(false);
        setTranslatorErr(String(e?.message ?? e));
      } finally {
        setBotTyping(false);
      }
    }, delay);
  }

  function getSourceLangForMessage(from: "me" | "them"): LanguageCode {
    const ui = normalizeUiLang(i18n.language);
    return from === "them" ? botLang : ui;
  }

  function openTranslatorSheet(sentenceText: string, tappedToken: string, from: "me" | "them") {
    const cleanToken = tappedToken.trim();
    if (!cleanToken || isOnlyPunctOrSpace(cleanToken)) return;
    const src = getSourceLangForMessage(from);
    const all = tokenizeWords(sentenceText);
    const words: WordToken[] = [];
    for (let i = 0; i < all.length; i++) {
      const c = all[i].trim();
      if (!c || isOnlyPunctOrSpace(c)) continue;
      words.push({ token: c, index: i });
    }
    const tappedLower = cleanToken.toLowerCase();
    const first = words.findIndex((w: WordToken) => w.token.toLowerCase() === tappedLower);
    const safePos = first >= 0 ? first : 0;
    setActiveSentence(sentenceText);
    setActiveSourceLang(src);
    setWordTokens(words);
    const initial = words[safePos] ?? { token: cleanToken, index: -1 };
    setSelectedToken(initial.token);
    setSelectedIndex(initial.index);
    setWordMeaning("");
    setSentenceMeaning("");
    setTokenMeanings({});
    setOpenWord(true);
    if (initial.index >= 0) void translateOneToken(initial, src);
  }

  async function translateOneToken(wt: WordToken, sourceLang: LanguageCode) {
    const uiLang: LanguageCode = normalizeUiLang(i18n.language);
    setSelectedToken(wt.token);
    setSelectedIndex(wt.index);
    if (tokenMeanings[wt.index]) {
      setWordMeaning(tokenMeanings[wt.index]);
      return;
    }
    setMeaningLoading(true);
    setWordMeaning("");
    try {
      const dict = dictLookup(wt.token, sourceLang, uiLang);
      if (dict) {
        setWordMeaning(dict);
        setTokenMeanings((p) => ({ ...p, [wt.index]: dict }));
        return;
      }
      let contextual: string | null = null;
      try {
        const res: any = await translateWordInContextCached({
          fullText: activeSentence,
          tappedTokenIndex: wt.index,
          sourceLang,
          targetLang: uiLang,
        });
        contextual =
          (res?.tappedMeaning && String(res.tappedMeaning).trim()) ||
          (res?.translatedWord && String(res.translatedWord).trim()) ||
          null;
      } catch { /* ignorar */ }
      if (contextual) {
        setWordMeaning(contextual);
        setTokenMeanings((p) => ({ ...p, [wt.index]: contextual! }));
        return;
      }
      const translated = await translateCached({ text: wt.token, targetLang: uiLang, sourceLang });
      const finalText = (translated ?? "").trim() || "—";
      setWordMeaning(finalText);
      setTokenMeanings((p) => ({ ...p, [wt.index]: finalText }));
      setTranslatorOk(true);
      setTranslatorErr("");
    } catch (e: any) {
      setWordMeaning("No se pudo traducir. Reintentá.");
      setTranslatorOk(false);
      setTranslatorErr(String(e?.message ?? e));
    } finally {
      setMeaningLoading(false);
    }
  }

  async function translateWholeSentence() {
    const sentence = activeSentence.trim();
    if (!sentence) return;
    setSentenceLoading(true);
    setSentenceMeaning("");
    const target: LanguageCode = normalizeUiLang(i18n.language);
    const source: LanguageCode = activeSourceLang;
    try {
      const segments = splitSegments(sentence);
      const parts: string[] = [];
      for (const seg of segments) {
        const t = await translateCached({ text: seg, targetLang: target, sourceLang: source });
        parts.push((t ?? "").trim());
      }
      setSentenceMeaning(parts.filter(Boolean).join(" ").trim() || "—");
      setTranslatorOk(true);
      setTranslatorErr("");
    } catch (e: any) {
      setSentenceMeaning("No se pudo traducir la oración.");
      setTranslatorOk(false);
      setTranslatorErr(String(e?.message ?? e));
    } finally {
      setSentenceLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 54 : 22,
        paddingHorizontal: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
            borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
          }}>
            <Text style={{ color: colors.fg, fontWeight: "900" }}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
              {match?.name ?? "Chat"}
            </Text>
            <Text style={{ color: colors.fg, opacity: 0.7, fontWeight: "700" }} numberOfLines={1}>
              {botTyping ? "escribiendo..." : `Tap para traducir • ${String(botLang).toUpperCase()}`}
            </Text>
            {translatorOk === false && (
              <Text style={{ color: "#ff6b6b", opacity: 0.9, marginTop: 2, fontWeight: "800" }}>
                ⚠️ {translatorErr}
              </Text>
            )}
          </View>
          <Pressable onPress={() => setOpenSafety(true)} style={{
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
            borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
          }}>
            <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>⋯</Text>
          </Pressable>
        </View>

        {starters.length > 0 && (
          <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {starters.map((s: { id: string; text: string }) => (
              <Pressable key={s.id} onPress={() => onSend(s.text)} style={{
                paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999,
                borderWidth: 1, borderColor: colors.border, backgroundColor: colors.accentSoft,
              }}>
                <Text style={{ color: colors.fg, fontWeight: "900" }} numberOfLines={1}>{s.text}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Chat */}
      <KeyboardAvoidingView style={{ flex: 1 }}
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
              paddingHorizontal: 14, paddingVertical: 10,
              backgroundColor: colors.card, borderRadius: 18,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Bubble
              item={item}
              colors={colors}
              onWordPress={(token: string) => openTranslatorSheet(item.text, token, item.from)}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={{
          padding: 12, borderTopWidth: 1, borderTopColor: colors.border,
          backgroundColor: colors.bg, flexDirection: "row", gap: 10, alignItems: "flex-end",
        }}>
          <TextInput
            value={text} onChangeText={setText}
            placeholder="Escribí algo…" placeholderTextColor={colors.fg + "88"}
            multiline
            style={{
              flex: 1, minHeight: 44, maxHeight: 120,
              paddingHorizontal: 12, paddingVertical: 10,
              borderRadius: 16, borderWidth: 1, borderColor: colors.border,
              backgroundColor: colors.card, color: colors.fg, fontWeight: "700",
            }}
          />
          <Pressable onPress={() => onSend()} style={{
            paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16,
            backgroundColor: colors.accent, alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: "white", fontWeight: "900" }}>Enviar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Translator modal */}
      <Modal visible={openWord} transparent animationType="fade">
        <Pressable onPress={() => setOpenWord(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{
            backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
            padding: 16, borderWidth: 1, borderColor: colors.border, maxHeight: "82%",
          }}>
            <View style={{
              alignSelf: "center", width: 46, height: 5, borderRadius: 999,
              backgroundColor: colors.border, marginBottom: 10,
            }} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.fg, fontWeight: "900", opacity: 0.75, marginBottom: 6 }}>
                Oración original
              </Text>
              <View style={{
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.bg, borderRadius: 16, padding: 12,
              }}>
                <Text style={{ color: colors.fg, fontWeight: "800" }}>{activeSentence || "—"}</Text>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 22 }}>
                  {selectedToken || "—"}
                </Text>
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {meaningLoading && <ActivityIndicator />}
                  <Text style={{ color: colors.fg, opacity: 0.9, fontWeight: "700", flex: 1, fontSize: 15 }}>
                    {meaningLoading ? "Buscando significado…" : wordMeaning || "—"}
                  </Text>
                </View>
              </View>

              <Pressable onPress={translateWholeSentence} style={{
                marginTop: 14, paddingVertical: 14, borderRadius: 16,
                backgroundColor: colors.accent, alignItems: "center",
              }}>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                  {sentenceLoading ? "Traduciendo…" : "Traducir toda la oración"}
                </Text>
              </Pressable>

              <Text style={{ marginTop: 16, color: colors.fg, fontWeight: "900", opacity: 0.9 }}>
                Palabra por palabra
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10, gap: 10 }}>
                {wordTokens.map((wt: WordToken) => {
                  const active = wt.index === selectedIndex;
                  return (
                    <Pressable key={`${wt.index}-${wt.token}`}
                      onPress={() => translateOneToken(wt, activeSourceLang)}
                      style={{
                        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16,
                        borderWidth: 1,
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accentSoft : colors.bg,
                        minWidth: 90, maxWidth: 180,
                      }}>
                      <Text style={{ color: colors.fg, fontWeight: "900" }} numberOfLines={1}>
                        {wt.token}
                      </Text>
                      <Text style={{ color: colors.fg, opacity: 0.75, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
                        {tokenMeanings[wt.index] ?? "—"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={{ marginTop: 6, color: colors.fg, fontWeight: "900", opacity: 0.9 }}>
                Traducción completa
              </Text>
              <View style={{
                marginTop: 10, borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.bg, borderRadius: 16, padding: 14,
              }}>
                {sentenceLoading ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.fg, fontWeight: "800" }}>Traduciendo…</Text>
                  </View>
                ) : (
                  <Text style={{ color: colors.fg, fontWeight: "800" }}>
                    {sentenceMeaning || "—"}
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 8 }}>
                <Pressable
                  onPress={() => {
                    const wt = wordTokens.find((x: WordToken) => x.index === selectedIndex);
                    if (wt) translateOneToken(wt, activeSourceLang);
                  }}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 16,
                    borderWidth: 1, borderColor: colors.border,
                    backgroundColor: colors.bg, alignItems: "center",
                  }}>
                  <Text style={{ color: colors.fg, fontWeight: "900" }}>Reintentar</Text>
                </Pressable>
                <Pressable onPress={() => setOpenWord(false)} style={{
                  flex: 1, paddingVertical: 12, borderRadius: 16,
                  backgroundColor: colors.card, borderWidth: 1,
                  borderColor: colors.border, alignItems: "center",
                }}>
                  <Text style={{ color: colors.fg, fontWeight: "900" }}>Cerrar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Safety modal */}
      <Modal visible={openSafety} transparent animationType="fade">
        <Pressable onPress={() => setOpenSafety(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{
            backgroundColor: colors.card, padding: 16,
            borderTopLeftRadius: 18, borderTopRightRadius: 18,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.fg, fontSize: 18, fontWeight: "900" }}>Seguridad</Text>
            <Text style={{ color: colors.fg, opacity: 0.7, marginTop: 6, fontWeight: "700" }}>
              Denunciá o bloqueá en 1 toque.
            </Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {(["spam", "acoso", "contenido_sexual", "odio", "estafa", "otro"] as ReportReason[]).map((k: ReportReason) => (
                <Pressable key={k}
                  onPress={async () => {
                    await reportUser({ id: matchId, reason: k, note: reportNote?.trim() || undefined });
                    setOpenSafety(false);
                  }}
                  style={{
                    padding: 14, borderRadius: 14,
                    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
                  }}>
                  <Text style={{ color: colors.fg, fontWeight: "900" }}>
                    Denunciar: {k.replace("_", " ")}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                value={reportNote} onChangeText={setReportNote}
                placeholder="Nota opcional (qué pasó)"
                placeholderTextColor={colors.fg + "88"}
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 14,
                  padding: 14, backgroundColor: colors.bg, color: colors.fg, fontWeight: "700",
                }}
              />
              <Pressable
                onPress={async () => {
                  await blockUser(matchId);
                  setOpenSafety(false);
                  router.replace("/(tabs)/home");
                }}
                style={{ padding: 14, borderRadius: 14, backgroundColor: "#111" }}>
                <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
                  Bloquear y salir
                </Text>
              </Pressable>
              <Pressable onPress={() => setOpenSafety(false)} style={{ padding: 12 }}>
                <Text style={{ textAlign: "center", fontWeight: "900", color: colors.fg, opacity: 0.7 }}>
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Bubble({
  item, colors, onWordPress,
}: {
  item: ChatMessage;
  colors: any;
  onWordPress: (w: string) => void;
}) {
  const mine = item.from === "me";
  const parts = useMemo(() => tokenizeWords(item.text), [item.text]);

  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "86%", marginBottom: 10 }}>
      <View style={{
        backgroundColor: mine ? colors.accent : colors.card,
        borderWidth: 1, borderColor: colors.border,
        borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10,
      }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {parts.map((p: string, idx: number) => {
            const isWord = !p.match(/^\s+$/) && !p.match(/^[,.!?;:()¿¡"""''\-]+$/);
            if (!isWord) {
              return (
                <Text key={`${idx}-${p}`} style={{
                  color: mine ? "white" : colors.fg,
                  fontWeight: "700", opacity: mine ? 0.95 : 0.9,
                }}>
                  {p}
                </Text>
              );
            }
            return (
              <Pressable key={`${idx}-${p}`} onPress={() => onWordPress(p)}>
                <Text style={{
                  color: mine ? "white" : colors.fg,
                  fontWeight: "900", textDecorationLine: "underline",
                }}>
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={{
        marginTop: 4, fontSize: 11, fontWeight: "800",
        color: colors.fg, opacity: 0.55,
        alignSelf: mine ? "flex-end" : "flex-start",
      }}>
        {new Date(item.ts).toLocaleTimeString().slice(0, 5)}
      </Text>
    </View>
  );
}