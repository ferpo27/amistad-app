// app/(tabs)/chat/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";

import { MATCHES } from "../../../src/mock/matches";
import {
  appendChat,
  getAppLanguage,
  getChat,
  type ChatMessage,
  type LanguageCode,
} from "../../../src/storage";

import DuoTranslatorSheet from "../../../src/components/DuoTranslatorSheet";
import { reportUser } from "../../../src/safety";

// Opcional: si existe en tu proyecto, lo usa; si no, no rompe.
let getCulturalTip: undefined | ((country: string) => string | null);
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getCulturalTip = require("../../../src/culture/culturalTips")?.getCulturalTip;
} catch {
  getCulturalTip = undefined;
}

type Starter = { id: string; text: string; lang: LanguageCode };

// ✅ Si la traducción NO existe, i18next devuelve el key ("ice_s2").
// Esta función devuelve fallback real en ese caso.
function tr(
  t: (k: string, o?: any) => string,
  key: string,
  fallback: string,
  opts?: any
) {
  const v = t(key, opts);
  return v === key ? fallback : v;
}

function mockReply(nativeLang: LanguageCode): string {
  // Respuesta demo en el idioma NATIVO del match
  switch (nativeLang) {
    case "de":
      return "Hallo! Wie geht’s dir heute? Ich komme aus Berlin.";
    case "ru":
      return "Привет! Как дела? Я из Москвы.";
    case "ja":
      return "こんにちは！元気ですか？私は東京出身です。";
    case "zh":
      return "你好！你今天怎么样？我来自北京。";
    case "en":
      return "Hey! How’s it going? I’m from London.";
    case "es":
    default:
      return "¡Hola! ¿Cómo va?";
  }
}

function starterTemplates(nativeLang: LanguageCode, name: string, country: string): string[] {
  // Icebreakers en el idioma del match (para romper el hielo + practicar)
  switch (nativeLang) {
    case "ru":
      return [
        `Привет, ${name}! Что тебе больше всего нравится в ${country}?`,
        `Какую местную еду в ${country} ты посоветуешь попробовать?`,
        `Какое хобби тебе нравится больше всего?`,
      ];
    case "zh":
      return [
        `你好，${name}！你最喜欢${country}的什么？`,
        `你推荐我在${country}一定要尝试的美食是什么？`,
        `你平时最喜欢做什么？有什么爱好吗？`,
      ];
    case "ja":
      return [
        `こんにちは、${name}！${country}で一番好きなところはどこ？`,
        `${country}のおすすめの食べ物は何？`,
        `趣味は何？休みの日は何してる？`,
      ];
    case "de":
      return [
        `Hi ${name}! Was magst du am meisten an ${country}?`,
        `Welche typischen Gerichte aus ${country} empfiehlst du?`,
        `Was sind deine Hobbys? Was machst du gern in deiner Freizeit?`,
      ];
    case "en":
      return [
        `Hey ${name}! What do you like most about living in ${country}?`,
        `What food from ${country} would you recommend I try?`,
        `What are your hobbies? What do you like to do for fun?`,
      ];
    case "es":
    default:
      return [
        `¡Hola ${name}! ¿Qué es lo que más te gusta de vivir en ${country}?`,
        `¿Qué comida típica de ${country} me recomendás probar?`,
        `¿Qué hobbies tenés? ¿Qué te gusta hacer en tu tiempo libre?`,
      ];
  }
}

function getStarterSuggestions(
  nativeLang: LanguageCode,
  match: any,
  t: (key: string, opts?: any) => string
): Starter[] {
  const country = String(match?.country ?? "");
  const name = String(match?.name ?? "friend");

  // Tip cultural (si existe el módulo)
  const tip =
    typeof getCulturalTip === "function" ? (getCulturalTip(country) as string | null) : null;

  const [s1, s2, s3] = starterTemplates(nativeLang, name, country);

  // Si tenés traducciones, podés usarlas, pero con fallback sólido.
  // Ojo: acá NO queremos que devuelva "ice_s2".
  const base: Starter[] = [
    {
      id: "s1",
      lang: nativeLang,
      text: tr(t, "ice_s1", s1, { name, country }),
    },
    {
      id: "s2",
      lang: nativeLang,
      text: tr(t, "ice_s2", s2, { name, country }),
    },
    {
      id: "s3",
      lang: nativeLang,
      text: tr(t, "ice_s3", s3, { name, country }),
    },
  ];

  if (tip) {
    const tipText =
      nativeLang === "ru"
        ? `Я прочитал(а) про ${country}: "${tip}". Это правда?`
        : nativeLang === "zh"
        ? `我看到关于${country}的一句话：“${tip}”。你觉得对吗？`
        : nativeLang === "ja"
        ? `${country}について「${tip}」って読んだんだけど、本当？`
        : nativeLang === "de"
        ? `Ich habe über ${country} gelesen: "${tip}". Stimmt das?`
        : nativeLang === "en"
        ? `I read this about ${country}: "${tip}". Is it true?`
        : `Leí esto sobre ${country}: "${tip}". ¿Para vos es así?`;

    return [{ id: "tip", lang: nativeLang, text: tipText }, ...base];
  }

  return base;
}

export default function ChatScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const params = useLocalSearchParams<{ id?: string }>();
  const matchId = String(params?.id ?? "");

  const match = useMemo(
    () => MATCHES.find((m) => String(m.id) === matchId),
    [matchId]
  );

  // Idioma nativo del match: RU / ZH / JA / etc.
  const matchNativeLang = (match?.nativeLang ?? "en") as LanguageCode;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Idioma de UI del usuario (para el traductor toLang)
  const [uiLang, setUiLang] = useState<LanguageCode>("es");

  // Translator sheet state
  const [openTr, setOpenTr] = useState(false);
  const [trText, setTrText] = useState("");
  const [fromLang, setFromLang] = useState<LanguageCode>("en");

  // Starters
  const [showStarters, setShowStarters] = useState(true);

  const starters = useMemo(
    () => getStarterSuggestions(matchNativeLang, match, t),
    [matchNativeLang, match, t]
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const l = (await getAppLanguage()) ?? "es";
        setUiLang(l);
      })();
    }, [])
  );

  useEffect(() => {
    (async () => {
      const l = (await getAppLanguage()) ?? "es";
      setUiLang(l);

      if (!matchId) return;

      const hist = await getChat(matchId);
      if (hist.length > 0) {
        setMessages(hist);
        return;
      }

      // Primer mensaje demo (en idioma nativo)
      const first = await appendChat(matchId, {
        from: "them",
        text: mockReply(matchNativeLang),
      });
      setMessages(first);
    })();
  }, [matchId, matchNativeLang]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  function openTranslatorFor(text: string) {
    setTrText(text);
    setFromLang(matchNativeLang);
    setOpenTr(true);
  }

  async function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || !matchId) return;

    setInput("");

    const next = await appendChat(matchId, { from: "me", text: value });
    setMessages(next);

    // Reply demo (en idioma nativo)
    setTimeout(async () => {
      const reply = mockReply(matchNativeLang);
      const after = await appendChat(matchId, { from: "them", text: reply });
      setMessages(after);
    }, 650);

    setShowStarters(false);
  }

  function handleReport() {
    if (!match?.id) return;

    Alert.alert("Denunciar usuario", "Seleccioná un motivo", [
      { text: "Spam", onPress: () => reportUser({ id: String(match.id), reason: "spam" }) },
      { text: "Acoso", onPress: () => reportUser({ id: String(match.id), reason: "acoso" }) },
      {
        text: "Contenido sexual",
        onPress: () => reportUser({ id: String(match.id), reason: "contenido_sexual" }),
      },
      { text: "Odio", onPress: () => reportUser({ id: String(match.id), reason: "odio" }) },
      { text: "Estafa", onPress: () => reportUser({ id: String(match.id), reason: "estafa" }) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  if (!matchId) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, opacity: 0.7 }}>Missing chat id</Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
          }}
        >
          <Text>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderColor: "#eee",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>
            {match?.name ?? tr(t, "chat", "Chat")}
            {match?.country ? ` • ${match.country}` : ""}
          </Text>
          <Text style={{ marginTop: 4, opacity: 0.7 }}>
            Native: {String(matchNativeLang).toUpperCase()}
          </Text>
        </View>

        <Pressable
          onPress={handleReport}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#eee",
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontWeight: "900" }}>Denunciar</Text>
        </Pressable>
      </View>

      {/* Starters */}
      {showStarters && starters.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "800", opacity: 0.8 }}>
              {tr(t, "ice_title", "Para empezar (Icebreakers)")}
            </Text>

            <Pressable onPress={() => setShowStarters(false)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontWeight: "800", opacity: 0.7 }}>{tr(t, "close", "Cerrar")}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 8, gap: 8 }}>
            {starters.slice(0, 3).map((s) => (
              <Pressable
                key={s.id}
                onPress={() => handleSend(s.text)}
                style={{
                  backgroundColor: "#f2f2f2",
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700" }}>{s.text}</Text>
                <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
                  Enviar en {String(s.lang).toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Messages */}
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingBottom: 10 }}
          renderItem={({ item }) => {
            const isThem = item.from === "them";
            return (
              <View style={{ alignItems: isThem ? "flex-start" : "flex-end", marginBottom: 10 }}>
                <Pressable
                  onPress={() => {
                    if (isThem) openTranslatorFor(item.text);
                  }}
                  style={{
                    maxWidth: "85%",
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: isThem ? "#f1f1f1" : "#111",
                  }}
                >
                  <Text style={{ color: isThem ? "#000" : "#fff", fontSize: 15, fontWeight: "600" }}>
                    {item.text}
                  </Text>

                  {isThem && (
                    <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.55 }}>
                      {tr(t, "tapToLearn", "Tocá para traducir / aprender")}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      </View>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1, borderColor: "#eee" }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={tr(t, "typeMessage", "Escribí un mensaje…")}
            style={{
              flex: 1,
              backgroundColor: "#f3f3f3",
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={() => handleSend()}
            style={{
              backgroundColor: "#111",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>{tr(t, "send", "Enviar")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Translator sheet */}
      <DuoTranslatorSheet
        visible={openTr}
        onClose={() => setOpenTr(false)}
        text={trText}
        fromLang={fromLang}
        toLang={uiLang}
      />

      {/* Botón para re-abrir starters */}
      {!showStarters && (
        <View style={{ position: "absolute", right: 12, bottom: 86 }}>
          <Pressable
            onPress={() => setShowStarters(true)}
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#eee",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontWeight: "900" }}>Ice</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}