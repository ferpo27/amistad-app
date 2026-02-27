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

// Opcional (si existe en tu proyecto)
import { getCulturalTip } from "../../../src/culture/culturalTips";

type Starter = { id: string; text: string };

function mockReply(nativeLang: LanguageCode): string {
  // ✅ Sin jerga argentina, y en el idioma nativo del match (simple y realista)
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

function getStarterSuggestions(match: any, t: (key: string, opts?: any) => string): Starter[] {
  const country = String(match?.country ?? "");
  const name = String(match?.name ?? "friend");

  const tip =
    typeof getCulturalTip === "function" ? (getCulturalTip(country) as string | null) : null;

  const base: Starter[] = [
    { id: "s1", text: t("ice_s1", { name, country }) || `Hola ${name}! ¿Qué es lo que más te gusta de vivir en ${country}?` },
    { id: "s2", text: t("ice_s2", { country }) || `¿Qué comida típica de ${country} me recomendás probar?` },
    { id: "s3", text: t("ice_s3", { country }) || `¿Qué es algo que la gente suele malinterpretar sobre ${country}?` },
  ];

  if (tip) {
    return [
      { id: "tip", text: t("ice_tip", { country, tip }) || `Leí esto sobre ${country}: "${tip}". ¿Para vos es así?` },
      ...base,
    ];
  }

  return base;
}

export default function ChatScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const params = useLocalSearchParams<{ id?: string }>();
  const matchId = String(params?.id ?? "");

  const match = useMemo(() => MATCHES.find((m) => String(m.id) === matchId), [matchId]);
  const matchNativeLang = (match?.nativeLang ?? "en") as LanguageCode;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // UI language (para toLang del traductor)
  const [uiLang, setUiLang] = useState<LanguageCode>("es");

  // Translator sheet state
  const [openTr, setOpenTr] = useState(false);
  const [trText, setTrText] = useState("");
  const [fromLang, setFromLang] = useState<LanguageCode>("en");

  // Starters (cerrables)
  const [showStarters, setShowStarters] = useState(true);

  // ✅ FIX: ahora pasa t como 2do argumento
  const starters = useMemo(() => getStarterSuggestions(match, t), [match, t]);

  // Recargar idioma cada vez que volvemos a esta pantalla
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

      // Primera vez: un mensaje del otro
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

    // Reply mock
    setTimeout(async () => {
      const reply = mockReply(matchNativeLang);
      const after = await appendChat(matchId, { from: "them", text: reply });
      setMessages(after);
    }, 650);

    setShowStarters(false);
  }

  if (!matchId) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, opacity: 0.7 }}>Missing chat id</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 }}
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
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "900" }}>
          {match?.name ?? t("chat")}
          {match?.country ? ` • ${match.country}` : ""}
        </Text>
        <Text style={{ marginTop: 4, opacity: 0.7 }}>
          Native: {(matchNativeLang ?? "en").toUpperCase()}
          {match?.learning?.length
            ? ` • Learning: ${match.learning
                .map((l: { lang: string; level: string }) => `${String(l.lang).toUpperCase()} ${l.level}`)
                .join(", ")}`
            : ""}
        </Text>
      </View>

      {/* Starters */}
      {showStarters && starters.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "800", opacity: 0.8 }}>
              {t("ice_title") ?? t("startConversation") ?? "Start the conversation"}
            </Text>

            <Pressable onPress={() => setShowStarters(false)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontWeight: "800", opacity: 0.7 }}>{t("close") ?? "Close"}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 8, gap: 8 }}>
            {starters.slice(0, 3).map((s: Starter) => (
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
                      {t("tapToLearn") ?? "Tap to learn (Duolingo-style)"}
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
            placeholder={t("typeMessage") ?? "Type a message"}
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
            <Text style={{ color: "#fff", fontWeight: "900" }}>{t("send") ?? "Send"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Duo translator bottom sheet */}
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
            <Text style={{ fontWeight: "900" }}>{t("tips") ?? "Tips"}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}