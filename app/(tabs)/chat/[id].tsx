// app/(tabs)/chat/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform, Modal, ActivityIndicator, ScrollView, Animated,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeMode } from "../../../src/theme";
import { MATCHES } from "../../../src/mock/matches";
import { getProfile, getChat, appendChat, getAppLanguage, type ChatMessage } from "../../../src/storage";
import { subscribeToChatRealtime, isBot } from "../../../src/storage/chatStorage";
import { getBotReply } from "../../../src/bots/botReply";
import { translateCached, translateWordInContextCached } from "../../../src/translate/autoTranslate";
import type { LanguageCode } from "../../../src/translate/types";
import { translatorHealth } from "../../../src/translate/apiClient";
import { blockUser, reportUser, type ReportReason } from "../../../src/safety";
import * as Haptics from "expo-haptics";
import { useAudioRecorder, useAudioPlayer } from "../../../src/hooks/useAudioRecorder";

type MatchProfile = (typeof MATCHES)[number];
type WordToken = { token: string; index: number };
type Reaction = { emoji: string; count: number; mine: boolean };
type ReplyInfo = { id: string; text: string; from: "me" | "them" };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const RE_CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u;

function splitCJK(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    if (RE_CJK.test(ch)) out.push(ch);
    else if (/[。！？!?…、,\s]/.test(ch)) out.push(ch);
    else {
      if (out.length && !RE_CJK.test(out[out.length - 1]) && !/[。！？!?…、,\s]/.test(out[out.length - 1]))
        out[out.length - 1] += ch;
      else out.push(ch);
    }
  }
  return out.filter(Boolean);
}

function tokenizeWords(text: string): string[] {
  if (RE_CJK.test(text)) return splitCJK(text);
  return text.split(/(\s+|[,.!?;:()¿¡"""\'\''-])/g).filter((t) => t !== "" && t !== undefined);
}

function isOnlyPunctOrSpace(t: string): boolean {
  return !!t.match(/^\s+$/) || !!t.match(/^[,.!?;:()¿¡"""\'\''\-。！？…、]+$/);
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

const QUICK_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const matchId = String(params?.id ?? "");
  const { colors } = useThemeMode();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const recordAnim = useRef(new Animated.Value(1)).current;
  const recordLoop = useRef<Animated.CompositeAnimation | null>(null);

  const match = useMemo<MatchProfile | null>(() => {
    const m = (MATCHES as any[]).find((x) => String(x.id) === matchId);
    return (m ?? null) as MatchProfile | null;
  }, [matchId]);

  const [meProfile, setMeProfile] = useState<any>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [uiLang, setUiLang] = useState<LanguageCode>("es");
  const [showStarters, setShowStarters] = useState(true);
  const [translatorOk, setTranslatorOk] = useState<boolean | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [contextMenu, setContextMenu] = useState<{ msgId: string; text: string; from: "me" | "them" } | null>(null);
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
  const [openSafety, setOpenSafety] = useState(false);
  const [reportNote, setReportNote] = useState("");

  // Audio — toque simple para iniciar, segundo toque para enviar
  const { isRecording, recordSeconds, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const { playingUri, progress: audioProgress, play: playAudio } = useAudioPlayer();

  const botLang: LanguageCode = (match?.nativeLang ?? "en") as LanguageCode;
  const LANG_NAME: Record<LanguageCode, string> = { es: "ES", en: "EN", de: "DE", ja: "JA", ru: "RU", zh: "ZH" };

  // ── Icebreakers ──────────────────────────────────────────────────────────
  const starters = useMemo(() => {
    const name = match?.name ?? "friend";
    const country = match?.country ?? "";
    const lang = botLang;
    type S = { id: string; textNative: string; textEs: string };
    const all: S[] = [];
    if (msgs.length === 0) {
      const g: Record<LanguageCode, { native: string; es: string }[]> = {
        de: [
          { native: `Hallo ${name}! Wie geht's dir heute?`, es: `¡Hola! ¿Cómo estás?` },
          { native: `Ich lerne Deutsch — kannst du mir helfen?`, es: `Aprendiendo alemán, ¿me ayudás?` },
          { native: `Was magst du am meisten an ${country}?`, es: `¿Qué te gusta de ${country}?` },
        ],
        ru: [
          { native: `Привет, ${name}! Как дела?`, es: `¡Hola! ¿Cómo estás?` },
          { native: `Я изучаю русский — поможешь?`, es: `Aprendiendo ruso, ¿me ayudás?` },
          { native: `Что любишь делать в ${country}?`, es: `¿Qué hacés en ${country}?` },
        ],
        ja: [
          { native: `こんにちは、${name}！`, es: `¡Hola!` },
          { native: `日本語を勉強しています。助けてもらえますか？`, es: `Estudio japonés, ¿me ayudás?` },
          { native: `${country}で好きなことは？`, es: `¿Qué te gusta en ${country}?` },
        ],
        zh: [
          { native: `你好，${name}！`, es: `¡Hola!` },
          { native: `我在学中文，你能帮我吗？`, es: `Aprendiendo chino, ¿me ayudás?` },
          { native: `你在${country}最喜欢做什么？`, es: `¿Qué te gusta en ${country}?` },
        ],
        en: [
          { native: `Hey ${name}! How's it going?`, es: `¡Hola! ¿Cómo andás?` },
          { native: `I'm learning English — can you help me practice?`, es: `Aprendiendo inglés.` },
          { native: `What do you enjoy doing in ${country}?`, es: `¿Qué hacés en ${country}?` },
        ],
        es: [
          { native: `¡Hola ${name}! ¿Cómo andás?`, es: `¡Hola!` },
          { native: `Estoy aprendiendo español, ¿me ayudás?`, es: `Aprendiendo español.` },
          { native: `¿Qué te gusta hacer en ${country}?`, es: `¿Qué hacés en ${country}?` },
        ],
      };
      (g[lang] ?? g.en).forEach((t, i) => all.push({ id: `g${i}`, textNative: t.native, textEs: t.es }));
    } else {
      const c: Record<LanguageCode, { native: string; es: string }[]> = {
        de: [
          { native: `Das ist sehr interessant! Erzähl mir mehr.`, es: `Interesante, contame más.` },
          { native: `Wirklich? Das wusste ich nicht!`, es: `¿En serio?` },
          { native: `Wie lange wohnst du schon in ${country}?`, es: `¿Cuánto vivís en ${country}?` },
        ],
        ru: [
          { native: `Очень интересно! Расскажи подробнее.`, es: `Interesante.` },
          { native: `Правда? Я не знал(а)!`, es: `¿En serio?` },
          { native: `Как давно живёшь в ${country}?`, es: `¿Cuánto en ${country}?` },
        ],
        ja: [
          { native: `それはとても面白いですね！`, es: `Interesante.` },
          { native: `本当ですか？知りませんでした！`, es: `¿En serio?` },
          { native: `${country}にはどのくらい住んでいますか？`, es: `¿Cuánto en ${country}?` },
        ],
        zh: [
          { native: `这真的很有趣！请告诉我更多。`, es: `Interesante.` },
          { native: `真的吗？我不知道！`, es: `¿En serio?` },
          { native: `你在${country}住了多久了？`, es: `¿Cuánto en ${country}?` },
        ],
        en: [
          { native: `That's really interesting! Tell me more.`, es: `Interesante.` },
          { native: `Really? I didn't know that!`, es: `¿En serio?` },
          { native: `How long have you been in ${country}?`, es: `¿Cuánto en ${country}?` },
        ],
        es: [
          { native: `¡Qué interesante! Contame más.`, es: `Interesante.` },
          { native: `¿En serio? ¡No lo sabía!`, es: `¿En serio?` },
          { native: `¿Hace cuánto vivís en ${country}?`, es: `¿Cuánto en ${country}?` },
        ],
      };
      (c[lang] ?? c.en).forEach((t, i) => all.push({ id: `c${i}`, textNative: t.native, textEs: t.es }));
    }
    return all.slice(0, 4);
  }, [match, botLang, msgs]);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const my = await getProfile();
      setMeProfile(my);
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(normalizeUiLang(l));
      const history = await getChat(matchId);
      if (history.length === 0 && match && isBot(matchId)) {
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
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    })();
    const unsub = subscribeToChatRealtime(matchId, (msg) => {
      setMsgs((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return unsub;
  }, [matchId]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(normalizeUiLang(l));
    })();
  }, []));

  // ── Enviar mensaje ────────────────────────────────────────────────────────
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
    setReplyTo(null);
    setShowStarters(false);
    await addMessage("me", raw);
    if (!match || !isBot(matchId)) return;
    setBotTyping(true);
    setTimeout(async () => {
      try {
        const history = await getChat(matchId);
        const reply = await getBotReply(match, history, raw);
        await addMessage("them", reply);
      } catch {
        const fb: Record<LanguageCode, string> = {
          de: "Das ist interessant!", ja: "なるほど！", zh: "很有意思！",
          ru: "Интересно!", en: "Interesting!", es: "¡Interesante!",
        };
        await addMessage("them", fb[botLang] ?? fb.en);
      } finally { setBotTyping(false); }
    }, 800 + Math.random() * 1200);
  }

  // ── Audio — toque simple toggle ───────────────────────────────────────────
  async function handleAudioButton() {
    if (!isRecording) {
      // Iniciar grabación
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      recordLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(recordAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(recordAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      recordLoop.current.start();
      await startRecording();
    } else {
      // Detener y enviar
      recordLoop.current?.stop();
      recordAnim.setValue(1);
      const audio = await stopRecording();
      console.log("[chat] Audio resultado:", audio);
      if (audio?.uri) {
        const secs = Math.max(1, Math.round(audio.durationMs / 1000));
        await onSend(`🎤__AUDIO__${audio.uri}__DURATION__${secs}s`);
      } else {
        console.warn("[chat] Audio no se pudo enviar — uri vacía");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function handleCancelRecording() {
    recordLoop.current?.stop();
    recordAnim.setValue(1);
    await cancelRecording();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  // ── Reacciones ────────────────────────────────────────────────────────────
  function addReaction(msgId: string, emoji: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReactions((prev) => {
      const existing = prev[msgId] ?? [];
      const idx = existing.findIndex((r) => r.emoji === emoji);
      if (idx >= 0) {
        const updated = [...existing];
        if (updated[idx].mine) {
          updated[idx] = { ...updated[idx], count: updated[idx].count - 1, mine: false };
          if (updated[idx].count <= 0) updated.splice(idx, 1);
        } else {
          updated[idx] = { ...updated[idx], count: updated[idx].count + 1, mine: true };
        }
        return { ...prev, [msgId]: updated };
      }
      return { ...prev, [msgId]: [...existing, { emoji, count: 1, mine: true }] };
    });
    setContextMenu(null);
  }

  function onLongPressMsg(msgId: string, msgText: string, from: "me" | "them") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextMenu({ msgId, text: msgText, from });
  }

  // ── Traductor ─────────────────────────────────────────────────────────────
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
    setMeaningLoading(true); setWordMeaning("");
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
    } catch { setWordMeaning("No se pudo traducir."); }
    finally { setMeaningLoading(false); }
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
    } catch { setSentenceMeaning("No se pudo traducir."); }
    finally { setSentenceLoading(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HEADER ── */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 56 : 24,
        paddingHorizontal: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{
            width: 38, height: 38, borderRadius: 19,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="chevron-back" size={24} color={colors.fg} />
          </Pressable>

          <View style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: colors.accent,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {(match?.name ?? "?")[0].toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
              {match?.name ?? "Chat"}
              {match?.country ? (
                <Text style={{ opacity: 0.4, fontSize: 13, fontWeight: "500" }}>  {match.country}</Text>
              ) : null}
            </Text>
            <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 11, fontWeight: "500" }}>
              {botTyping ? "escribiendo..." : `${LANG_NAME[botLang]} · toca una palabra para traducir`}
            </Text>
          </View>

          <Pressable onPress={() => setShowStarters((v) => !v)} style={{
            width: 36, height: 36, borderRadius: 18,
            borderWidth: 1,
            borderColor: showStarters ? colors.accent : colors.border,
            backgroundColor: showStarters ? colors.accentSoft : "transparent",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="snow-outline" size={18} color={showStarters ? colors.accent : colors.fg} />
          </Pressable>

          <Pressable onPress={() => setOpenSafety(true)} style={{
            width: 36, height: 36, borderRadius: 18,
            borderWidth: 1, borderColor: colors.border,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="shield-outline" size={18} color={colors.fg} />
          </Pressable>
        </View>

        {/* Icebreakers */}
        {showStarters && starters.length > 0 && (
          <View style={{
            marginTop: 10,
            borderWidth: 1, borderColor: colors.border,
            borderRadius: 16, overflow: "hidden",
            backgroundColor: colors.card,
          }}>
            <View style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              paddingHorizontal: 14, paddingVertical: 8,
              borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
              <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 11, opacity: 0.5, letterSpacing: 0.8 }}>
                SUGERENCIAS
              </Text>
              <Pressable onPress={() => setShowStarters(false)}>
                <Ionicons name="close" size={16} color={colors.fg} style={{ opacity: 0.4 }} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8, gap: 6 }}>
              {starters.map((s: any) => (
                <Pressable key={s.id} onPress={() => onSend(s.textNative)} style={{
                  paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
                  borderWidth: 1, borderColor: colors.border,
                  backgroundColor: colors.bg, maxWidth: 220, gap: 2,
                }}>
                  <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 13 }} numberOfLines={2}>
                    {s.textNative}
                  </Text>
                  {s.textEs !== s.textNative && (
                    <Text style={{ color: colors.accent, fontWeight: "500", fontSize: 11 }} numberOfLines={1}>
                      {s.textEs}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── MENSAJES ── */}
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
              alignSelf: "flex-start", marginBottom: 8,
              paddingHorizontal: 16, paddingVertical: 12,
              backgroundColor: colors.card, borderRadius: 18, borderTopLeftRadius: 4,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Bubble
              item={item}
              colors={colors}
              reactions={reactions[item.id] ?? []}
              onWordPress={(token) => openTranslatorSheet(item.text, token, item.from)}
              onLongPress={() => onLongPressMsg(item.id, item.text, item.from)}
              onReactionPress={(emoji) => addReaction(item.id, emoji)}
              playingUri={playingUri}
              audioProgress={audioProgress}
              onPlayAudio={playAudio}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Reply preview */}
        {replyTo && (
          <View style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 14, paddingVertical: 8,
            backgroundColor: colors.card,
            borderTopWidth: 1, borderTopColor: colors.accent + "30",
            gap: 10,
          }}>
            <View style={{ width: 3, height: 34, borderRadius: 2, backgroundColor: colors.accent }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 11, marginBottom: 1 }}>
                {replyTo.from === "me" ? "Vos" : match?.name ?? "Ellos"}
              </Text>
              <Text style={{ color: colors.fg, opacity: 0.6, fontSize: 13 }} numberOfLines={1}>
                {replyTo.text}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={18} color={colors.fg} style={{ opacity: 0.4 }} />
            </Pressable>
          </View>
        )}

        {/* ── INPUT ── */}
        {isRecording ? (
          // Grabando
          <View style={{
            paddingHorizontal: 16, paddingVertical: 12,
            borderTopWidth: 1, borderTopColor: colors.border,
            backgroundColor: colors.bg,
            flexDirection: "row", alignItems: "center", gap: 12,
          }}>
            <Pressable onPress={handleCancelRecording} style={{
              paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 20, borderWidth: 1, borderColor: "#ff3b30",
            }}>
              <Text style={{ color: "#ff3b30", fontWeight: "600", fontSize: 14 }}>Cancelar</Text>
            </Pressable>

            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Animated.View style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: "#ff3b30",
                transform: [{ scale: recordAnim }],
              }} />
              <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 15 }}>
                {recordSeconds}s
              </Text>
              {/* Waveform animada */}
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 3, overflow: "hidden" }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <Animated.View key={i} style={{
                    width: 3,
                    height: 4 + Math.sin(i * 0.8) * 10 + 8,
                    borderRadius: 2,
                    backgroundColor: colors.accent,
                    opacity: recordAnim,
                  }} />
                ))}
              </View>
            </View>

            <Pressable onPress={handleAudioButton} style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: colors.accent,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : (
          // Normal
          <View style={{
            paddingHorizontal: 12, paddingVertical: 10,
            borderTopWidth: 1, borderTopColor: colors.border,
            backgroundColor: colors.bg,
            flexDirection: "row", gap: 8, alignItems: "flex-end",
          }}>
            {/* Botón traducir último mensaje */}
            <Pressable
              onPress={() => {
                const last = [...msgs].reverse().find((m) => m.from === "them");
                if (last) openTranslatorSheet(last.text, last.text.split(" ")[0], "them");
              }}
              style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="language-outline" size={20} color={colors.fg} />
            </Pressable>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`Escribí en ${LANG_NAME[botLang]}…`}
              placeholderTextColor={colors.fg + "44"}
              multiline
              style={{
                flex: 1, minHeight: 42, maxHeight: 120,
                paddingHorizontal: 14, paddingVertical: 10,
                borderRadius: 21, borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.card, color: colors.fg,
                fontWeight: "500", fontSize: 15,
              }}
            />

            {text.trim() ? (
              <Pressable onPress={() => onSend()} style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: colors.accent,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            ) : (
              // Botón audio — toque simple para iniciar
              <Pressable onPress={handleAudioButton} style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: colors.card,
                borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="mic-outline" size={20} color={colors.fg} />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── MENÚ CONTEXTUAL ── */}
      <Modal visible={!!contextMenu} transparent animationType="fade">
        <Pressable
          onPress={() => setContextMenu(null)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}
        >
          <Pressable onPress={() => {}} style={{
            backgroundColor: colors.bg, borderRadius: 20,
            padding: 14, width: 270,
            borderWidth: 1, borderColor: colors.border, gap: 6,
          }}>
            {/* Reacciones */}
            <View style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: 6 }}>
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable key={emoji} onPress={() => contextMenu && addReaction(contextMenu.msgId, emoji)} style={{ padding: 6 }}>
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />

            {/* Responder */}
            <Pressable
              onPress={() => {
                if (contextMenu) setReplyTo({ id: contextMenu.msgId, text: contextMenu.text, from: contextMenu.from });
                setContextMenu(null);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, backgroundColor: colors.card }}
            >
              <Ionicons name="return-down-back-outline" size={20} color={colors.fg} />
              <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 15 }}>Responder</Text>
            </Pressable>

            {/* Traducir */}
            <Pressable
              onPress={() => {
                if (contextMenu) openTranslatorSheet(contextMenu.text, contextMenu.text.split(" ")[0], contextMenu.from);
                setContextMenu(null);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, backgroundColor: colors.card }}
            >
              <Ionicons name="language-outline" size={20} color={colors.fg} />
              <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 15 }}>Traducir</Text>
            </Pressable>

            <Pressable onPress={() => setContextMenu(null)} style={{ padding: 8, alignItems: "center" }}>
              <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600", fontSize: 14 }}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL TRADUCTOR ── */}
      <Modal visible={openWord} transparent animationType="slide">
        <Pressable
          onPress={() => setOpenWord(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        >
          <Pressable onPress={() => {}} style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 20, borderTopWidth: 1, borderColor: colors.border, maxHeight: "88%",
          }}>
            <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 }} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "700", fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>
                ORIGINAL
              </Text>
              <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 16 }}>
                <Text style={{ color: colors.fg, fontWeight: "500", lineHeight: 22 }}>{activeSentence || "—"}</Text>
              </View>

              <View style={{ backgroundColor: colors.accentSoft, borderRadius: 14, borderWidth: 1, borderColor: colors.accent + "30", padding: 16, marginBottom: 16 }}>
                <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 24, marginBottom: 4 }}>{selectedToken || "—"}</Text>
                {meaningLoading ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "500" }}>Traduciendo…</Text>
                  </View>
                ) : (
                  <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 15 }}>{wordMeaning || "—"}</Text>
                )}
              </View>

              <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "700", fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>
                PALABRA POR PALABRA
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 16 }}>
                {wordTokens.map((wt) => {
                  const active = wt.index === selectedIndex;
                  const meaning = tokenMeanings[wt.index];
                  return (
                    <Pressable
                      key={`${wt.index}-${wt.token}`}
                      onPress={() => translateOneToken(wt, activeSourceLang)}
                      style={{
                        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accentSoft : colors.card,
                        minWidth: 70, alignItems: "center",
                      }}
                    >
                      <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{wt.token}</Text>
                      {meaning ? (
                        <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 11, marginTop: 2 }} numberOfLines={1}>{meaning}</Text>
                      ) : (
                        <Text style={{ color: colors.fg, opacity: 0.25, fontSize: 11, marginTop: 2 }}>—</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                onPress={translateWholeSentence}
                style={{ paddingVertical: 14, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", marginBottom: 10 }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                  {sentenceLoading ? "Traduciendo…" : "Traducir oración completa"}
                </Text>
              </Pressable>

              {sentenceMeaning ? (
                <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 }}>
                  <Text style={{ color: colors.fg, fontWeight: "500", lineHeight: 22 }}>{sentenceMeaning}</Text>
                </View>
              ) : null}

              <Pressable onPress={() => setOpenWord(false)} style={{
                paddingVertical: 14, borderRadius: 14,
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.card, alignItems: "center",
              }}>
                <Text style={{ color: colors.fg, fontWeight: "600" }}>Cerrar</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL SEGURIDAD ── */}
      <Modal visible={openSafety} transparent animationType="slide">
        <Pressable onPress={() => setOpenSafety(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{
            backgroundColor: colors.bg, padding: 20,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            borderTopWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.fg, fontSize: 18, fontWeight: "700", marginBottom: 4 }}>Seguridad</Text>
            <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "500", marginBottom: 16, fontSize: 13 }}>
              Denunciá o bloqueá este usuario.
            </Text>
            <View style={{ gap: 8 }}>
              {(["spam", "acoso", "contenido_sexual", "odio", "estafa", "otro"] as ReportReason[]).map((k) => (
                <Pressable key={k}
                  onPress={async () => { await reportUser({ id: matchId, reason: k, note: reportNote?.trim() || undefined }); setOpenSafety(false); }}
                  style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}
                >
                  <Text style={{ color: colors.fg, fontWeight: "600" }}>Denunciar: {k.replace("_", " ")}</Text>
                </Pressable>
              ))}
              <TextInput
                value={reportNote} onChangeText={setReportNote}
                placeholder="Nota opcional…" placeholderTextColor={colors.fg + "44"}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.card, color: colors.fg }}
              />
              <Pressable
                onPress={async () => { await blockUser(matchId); setOpenSafety(false); router.replace("/(tabs)/home"); }}
                style={{ padding: 14, borderRadius: 12, backgroundColor: "#ff3b30", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Ionicons name="ban-outline" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Bloquear y salir</Text>
              </Pressable>
              <Pressable onPress={() => setOpenSafety(false)} style={{ padding: 10, alignItems: "center" }}>
                <Text style={{ fontWeight: "600", color: colors.fg, opacity: 0.4 }}>Cancelar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({ item, colors, reactions, onWordPress, onLongPress, onReactionPress, playingUri, audioProgress, onPlayAudio }: {
  item: ChatMessage;
  colors: any;
  reactions: Reaction[];
  onWordPress: (w: string) => void;
  onLongPress: () => void;
  onReactionPress: (emoji: string) => void;
  playingUri: string | null;
  audioProgress: number;
  onPlayAudio: (uri: string) => void;
}) {
  const mine = item.from === "me";
  const parts = useMemo(() => tokenizeWords(item.text), [item.text]);
  const isAudio = item.text.includes("__AUDIO__");
  const audioUri = isAudio ? item.text.split("__AUDIO__")[1]?.split("__DURATION__")[0] : null;
  const audioDuration = isAudio ? item.text.split("__DURATION__")[1] ?? "" : null;
  const isPlaying = audioUri ? playingUri === audioUri : false;

  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", marginBottom: reactions.length > 0 ? 22 : 10 }}>
      <Pressable onLongPress={onLongPress} delayLongPress={300}>
        <View style={{
          backgroundColor: mine ? colors.accent : colors.card,
          borderRadius: 18,
          borderTopRightRadius: mine ? 4 : 18,
          borderTopLeftRadius: mine ? 18 : 4,
          paddingHorizontal: 14, paddingVertical: 10,
          borderWidth: mine ? 0 : 1,
          borderColor: colors.border,
        }}>
          {isAudio ? (
            <Pressable onPress={() => audioUri && onPlayAudio(audioUri)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 160 }}
            >
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: mine ? "rgba(255,255,255,0.18)" : colors.accentSoft,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={16}
                  color={mine ? "#fff" : colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                {/* Barra de progreso */}
                <View style={{ height: 3, borderRadius: 2, backgroundColor: mine ? "rgba(255,255,255,0.2)" : colors.border, marginBottom: 6, overflow: "hidden" }}>
                  <View style={{
                    height: 3, borderRadius: 2,
                    backgroundColor: mine ? "rgba(255,255,255,0.85)" : colors.accent,
                    width: `${isPlaying ? audioProgress * 100 : 0}%` as any,
                  }} />
                </View>
                {/* Waveform estática */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  {[3, 7, 11, 5, 13, 9, 7, 14, 5, 9, 7, 11].map((h, i) => (
                    <View key={i} style={{
                      width: 2.5, height: h, borderRadius: 2,
                      backgroundColor: mine ? "rgba(255,255,255,0.55)" : colors.accent + "88",
                    }} />
                  ))}
                </View>
              </View>
              <Text style={{ color: mine ? "rgba(255,255,255,0.65)" : colors.fg, fontSize: 11, fontWeight: "600" }}>
                {audioDuration}
              </Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {parts.map((p, idx) => {
                const isWord = !p.match(/^\s+$/) && !p.match(/^[,.!?;:()¿¡"""'''\-]+$/);
                if (!isWord) return (
                  <Text key={`${idx}-${p}`} style={{ color: mine ? "rgba(255,255,255,0.88)" : colors.fg, fontWeight: "400", fontSize: 15, lineHeight: 22 }}>{p}</Text>
                );
                return (
                  <Pressable key={`${idx}-${p}`} onPress={() => onWordPress(p)}>
                    <Text style={{
                      color: mine ? "#fff" : colors.fg,
                      fontWeight: "500", fontSize: 15, lineHeight: 22,
                      textDecorationLine: mine ? "none" : "underline",
                      textDecorationColor: colors.accent + "55",
                    }}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </Pressable>

      {/* Reacciones */}
      {reactions.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4, alignSelf: mine ? "flex-end" : "flex-start" }}>
          {reactions.map((r) => (
            <Pressable key={r.emoji} onPress={() => onReactionPress(r.emoji)} style={{
              flexDirection: "row", alignItems: "center", gap: 3,
              paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
              backgroundColor: r.mine ? colors.accentSoft : colors.card,
              borderWidth: 1, borderColor: r.mine ? colors.accent + "50" : colors.border,
            }}>
              <Text style={{ fontSize: 13 }}>{r.emoji}</Text>
              {r.count > 1 && <Text style={{ color: colors.fg, fontSize: 11, fontWeight: "700" }}>{r.count}</Text>}
            </Pressable>
          ))}
        </View>
      )}

      <Text style={{
        marginTop: 3, fontSize: 11, color: colors.fg, opacity: 0.3,
        alignSelf: mine ? "flex-end" : "flex-start", paddingHorizontal: 2,
      }}>
        {new Date(item.ts).toLocaleTimeString().slice(0, 5)}
      </Text>
    </View>
  );
}