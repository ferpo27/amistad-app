// app/(tabs)/chat/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, Text, TextInput,
  View, Alert, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useThemeMode } from "../../../src/theme";

import { MATCHES } from "../../../src/mock/matches";
import {
  appendChat, getAppLanguage, getChat,
  type ChatMessage, type LanguageCode,
} from "../../../src/storage";
import DuoTranslatorSheet from "../../../src/components/DuoTranslatorSheet";
import { reportUser } from "../../../src/safety";
import { getBotReply } from "../../../src/bots/botReply";

// Cultural tips — opcional, no rompe si no existe
let getCulturalTip: undefined | ((country: string) => string | null);
try {
  getCulturalTip = require("../../../src/culture/culturalTips")?.getCulturalTip;
} catch {
  getCulturalTip = undefined;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// Usa la clave i18n si existe; si no, cae al fallback hardcodeado (nunca muestra la key)
function tr(t: (k: string, o?: any) => string, key: string, fallback: string, opts?: any) {
  const v = t(key, opts);
  return v === key ? fallback : v;
}

type Starter = { id: string; text: string };

// Icebreakers en idioma NATIVO del match — para practicar desde el primer mensaje
function starterTemplates(nativeLang: LanguageCode, name: string, country: string): string[] {
  switch (nativeLang) {
    case "de": return [
      `Hi ${name}! Was magst du am meisten an ${country}?`,
      `Welche typischen Gerichte aus ${country} empfiehlst du?`,
      `Was sind deine Hobbys? Was machst du gern in deiner Freizeit?`,
    ];
    case "ru": return [
      `Привет, ${name}! Что тебе больше всего нравится в ${country}?`,
      `Какую местную еду в ${country} ты посоветуешь попробовать?`,
      `Какие у тебя хобби? Чем ты любишь заниматься?`,
    ];
    case "ja": return [
      `こんにちは、${name}！${country}で一番好きなところはどこ？`,
      `${country}のおすすめの食べ物は何？`,
      `趣味は何？休みの日は何してる？`,
    ];
    case "zh": return [
      `你好，${name}！你最喜欢${country}的什么？`,
      `你推荐我在${country}一定要尝试的美食是什么？`,
      `你平时有什么爱好？喜欢做什么？`,
    ];
    case "en": return [
      `Hey ${name}! What do you like most about living in ${country}?`,
      `What food from ${country} would you recommend I try?`,
      `What are your hobbies? What do you like to do for fun?`,
    ];
    case "es":
    default: return [
      `¡Hola ${name}! ¿Qué es lo que más te gusta de vivir en ${country}?`,
      `¿Qué comida típica de ${country} me recomendás probar?`,
      `¿Qué hobbies tenés? ¿Qué te gusta hacer en tu tiempo libre?`,
    ];
  }
}

function buildStarters(nativeLang: LanguageCode, match: any, t: any): Starter[] {
  const country = String(match?.country ?? "");
  const name    = String(match?.name ?? "friend");
  const [a, b, c] = starterTemplates(nativeLang, name, country);

  const base: Starter[] = [
    { id: "s1", text: tr(t, "ice_s1", a, { name, country }) },
    { id: "s2", text: tr(t, "ice_s2", b, { name, country }) },
    { id: "s3", text: tr(t, "ice_s3", c, { name, country }) },
  ];

  const tip = typeof getCulturalTip === "function" ? getCulturalTip(country) : null;
  if (!tip) return base;

  const tipMap: Record<string, string> = {
    de: `Ich habe über ${country} gelesen: "${tip}". Stimmt das?`,
    ru: `Я прочитал(а) про ${country}: "${tip}". Это правда?`,
    ja: `${country}について「${tip}」って読んだんだけど、本当？`,
    zh: `我看到关于${country}的一句话："${tip}"。你觉得对吗？`,
    en: `I read this about ${country}: "${tip}". Is it true?`,
    es: `Leí esto sobre ${country}: "${tip}". ¿Para vos es así?`,
  };

  return [{ id: "tip", text: tipMap[nativeLang] ?? tipMap.es }, ...base];
}

const FLAGS: Record<string, string> = {
  es: "🇦🇷", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
};

// ─── Screen ────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const router   = useRouter();
  const { t }    = useTranslation();
  const { colors } = useThemeMode();

  const params  = useLocalSearchParams<{ id?: string }>();
  const matchId = String(params?.id ?? "");

  const match           = useMemo(() => MATCHES.find((m) => String(m.id) === matchId), [matchId]);
  const matchNativeLang = (match?.nativeLang ?? "en") as LanguageCode;

  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [uiLang,      setUiLang]      = useState<LanguageCode>("es");
  const [showStarters, setShowStarters] = useState(true);
  const [openTr,      setOpenTr]      = useState(false);
  const [trText,      setTrText]      = useState("");
  const [fromLang,    setFromLang]    = useState<LanguageCode>("en");

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const starters = useMemo(
    () => buildStarters(matchNativeLang, match, t),
    [matchNativeLang, match, t]
  );

  // Recarga idioma al volver al tab
  useFocusEffect(useCallback(() => {
    (async () => {
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(l as LanguageCode);
    })();
  }, []));

  // Carga historial al montar
  useEffect(() => {
    (async () => {
      if (!matchId) return;
      const hist = await getChat(matchId);
      if (hist.length > 0) {
        setMessages(hist);
        setShowStarters(false);
        return;
      }
      // Primera apertura: mensaje de bienvenida del bot
      if (match) {
        setSending(true);
        const reply = await getBotReply(match, [], "start conversation");
        const first = await appendChat(matchId, { from: "them", text: reply });
        setMessages(first);
        setSending(false);
      }
    })();
  }, [matchId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [messages.length]);

  // ─── Enviar ──────────────────────────────────────────────────────────────

  async function handleSend(overrideText?: string) {
    const value = (overrideText ?? input).trim();
    if (!value || !matchId || sending) return;

    setInput("");
    setShowStarters(false);
    setSending(true);

    const next = await appendChat(matchId, { from: "me", text: value });
    setMessages(next);

    try {
      const history = next.map((m) => ({ from: m.from, text: m.text }));
      const reply   = await getBotReply(match!, history, value);
      const after   = await appendChat(matchId, { from: "them", text: reply });
      setMessages(after);
    } finally {
      setSending(false);
    }
  }

  // ─── Traductor ───────────────────────────────────────────────────────────

  function openTranslatorFor(text: string) {
    setTrText(text);
    setFromLang(matchNativeLang);
    setOpenTr(true);
  }

  // ─── Denunciar ───────────────────────────────────────────────────────────

  function handleReport() {
    if (!match?.id) return;
    Alert.alert("Denunciar usuario", "Seleccioná un motivo", [
      { text: "Spam",            onPress: () => reportUser({ id: String(match.id), reason: "spam" }) },
      { text: "Acoso",           onPress: () => reportUser({ id: String(match.id), reason: "acoso" }) },
      { text: "Contenido sexual",onPress: () => reportUser({ id: String(match.id), reason: "contenido_sexual" }) },
      { text: "Odio",            onPress: () => reportUser({ id: String(match.id), reason: "odio" }) },
      { text: "Estafa",          onPress: () => reportUser({ id: String(match.id), reason: "estafa" }) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  // ─── Guard ───────────────────────────────────────────────────────────────

  if (!matchId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.fg }}>Chat no encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12, padding: 12 }}>
          <Text style={{ color: colors.accent }}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const flag = FLAGS[matchNativeLang] ?? "🌐";

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={{
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 10 : 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
        </Pressable>

        <View style={{
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: colors.accentSoft,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 20 }}>{flag}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 17 }}>
            {match?.name ?? tr(t, "chat", "Chat")}
          </Text>
          <Text style={{ color: colors.fg, opacity: 0.5, fontSize: 12, fontWeight: "700" }}>
            {match?.country} · Nativo {matchNativeLang.toUpperCase()}
          </Text>
        </View>

        {/* Botón Ice */}
        <Pressable
          onPress={() => setShowStarters((v) => !v)}
          style={{
            paddingHorizontal: 11, paddingVertical: 7,
            borderRadius: 10, borderWidth: 1,
            borderColor: showStarters ? colors.accent : colors.border,
            backgroundColor: showStarters ? colors.accentSoft : colors.card,
          }}
        >
          <Text style={{ color: showStarters ? colors.accent : colors.fg, fontWeight: "900", fontSize: 13 }}>
            Ice
          </Text>
        </Pressable>

        {/* Denunciar */}
        <Pressable
          onPress={handleReport}
          style={{
            paddingHorizontal: 11, paddingVertical: 7,
            borderRadius: 10, borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: "#ff3b30", fontWeight: "900", fontSize: 13 }}>⚠</Text>
        </Pressable>
      </View>

      {/* ── ICEBREAKERS ────────────────────────────────────────────────── */}
      {showStarters && starters.length > 0 && (
        <View style={{
          marginHorizontal: 12, marginTop: 10,
          backgroundColor: colors.card,
          borderRadius: 18, borderWidth: 1,
          borderColor: colors.border, overflow: "hidden",
        }}>
          <View style={{
            flexDirection: "row", justifyContent: "space-between",
            alignItems: "center", padding: 12,
            borderBottomWidth: 1, borderBottomColor: colors.border,
          }}>
            <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 14 }}>
              {tr(t, "ice_title", "Mensajes para empezar")}
            </Text>
            <Pressable onPress={() => setShowStarters(false)} style={{ padding: 4 }}>
              <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "900" }}>
                {tr(t, "close", "Cerrar")}
              </Text>
            </Pressable>
          </View>

          {starters.slice(0, 3).map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => handleSend(s.text)}
              style={{
                padding: 14,
                borderBottomWidth: i < 2 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 14 }}>{s.text}</Text>
              <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 11, marginTop: 4, fontWeight: "700" }}>
                Enviar en {matchNativeLang.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── MENSAJES ───────────────────────────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isThem = item.from === "them";
          return (
            <View style={{ alignItems: isThem ? "flex-start" : "flex-end", marginBottom: 10 }}>
              <Pressable
                onPress={() => { if (isThem) openTranslatorFor(item.text); }}
                style={{
                  maxWidth: "84%",
                  borderRadius: 20,
                  paddingHorizontal: 14, paddingVertical: 11,
                  backgroundColor: isThem ? colors.card : colors.accent,
                  borderWidth: isThem ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                <Text style={{
                  color: isThem ? colors.fg : "#fff",
                  fontSize: 15, fontWeight: "600", lineHeight: 22,
                }}>
                  {item.text}
                </Text>
                {isThem && (
                  <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 11, marginTop: 5, fontWeight: "700" }}>
                    {tr(t, "tapToLearn", "Tocá para traducir")}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        }}
      />

      {/* ── TYPING ─────────────────────────────────────────────────────── */}
      {sending && (
        <View style={{
          paddingHorizontal: 16, paddingBottom: 8,
          flexDirection: "row", alignItems: "center", gap: 8,
        }}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", fontSize: 13 }}>
            {match?.name ?? "..."} está escribiendo…
          </Text>
        </View>
      )}

      {/* ── INPUT ──────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{
          flexDirection: "row", gap: 8, padding: 12,
          borderTopWidth: 1, borderTopColor: colors.border,
          backgroundColor: colors.bg,
        }}>
          {/* Botón abrir traductor (último mensaje de "them") */}
          <Pressable
            onPress={() => {
              const last = [...messages].reverse().find((m) => m.from === "them");
              if (last) openTranslatorFor(last.text);
            }}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>🔤</Text>
          </Pressable>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={tr(t, "typeMessage", `Escribí en ${matchNativeLang.toUpperCase()}…`)}
            placeholderTextColor={colors.fg + "44"}
            multiline
            style={{
              flex: 1, backgroundColor: colors.card,
              borderRadius: 20, paddingHorizontal: 14,
              paddingVertical: 10, fontSize: 15,
              color: colors.fg, fontWeight: "700",
              maxHeight: 100, borderWidth: 1, borderColor: colors.border,
            }}
          />

          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: input.trim() && !sending ? colors.accent : colors.border,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 20 }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ── TRANSLATOR SHEET ───────────────────────────────────────────── */}
      <DuoTranslatorSheet
        visible={openTr}
        onClose={() => setOpenTr(false)}
        text={trText}
        fromLang={fromLang}
        toLang={uiLang}
      />
    </SafeAreaView>
  );
}