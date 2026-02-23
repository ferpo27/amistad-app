import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { appendChat, getProfile, type LanguageLevel, type LearningLang } from "../../../../src/storage";

type Ice = { id: string; text: string };

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length && out.length < n) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function levelHint(level: LanguageLevel | null) {
  if (!level) return "normal";
  if (level === "A1" || level === "A2") return "simple";
  if (level === "B1" || level === "B2") return "medium";
  return "advanced";
}

function buildIcebreakers(learn: LearningLang[], topics: string[]) {
  const langLine = learn.length
    ? `Estoy practicando ${learn
        .map((x) => `${x.lang.toUpperCase()}(${x.level ?? "—"})`)
        .join(", ")}.`
    : `Estoy practicando idiomas.`;

  const base = [
    "Ok, pregunta random: ¿sos team dulce o salado?",
    "Si tu día fuera un meme, ¿cuál sería? 😂",
    "¿Qué canción tenés en repeat últimamente?",
    "¿Serie que te pegó fuerte y por qué?",
    "¿Mate / café / té? Elegí tu personaje.",
    "¿Cuál es tu plan perfecto de domingo?",
    "Decime 3 cosas que te gustan y te adivino la vibra (mentira, pero intentamos).",
  ];

  const themed = topics.length
    ? [
        `Tema ${topics[0]}: ¿qué te gusta de eso?`,
        `Ok, hablemos de ${topics[0]}: tirame tu top 3.`,
      ]
    : ["¿Qué tema te pinta hablar hoy?"];

  // Ajuste por nivel: si hay A1/A2, proponé frases cortitas y fáciles.
  const easiest = [
    "Hi! How are you? 🙂",
    "What’s your name?",
    "Do you like music?",
    "What do you do for fun?",
  ];

  const simple = [
    "What’s an easy phrase to start with?",
    "Tell me about your day in one sentence.",
    "What’s your favorite food?",
    "What’s a hobby you like?",
  ];

  const medium = [
    "What’s something you’re proud of lately?",
    "If you could travel tomorrow, where would you go and why?",
    "What’s a small thing that makes your day better?",
  ];

  const advanced = [
    "What’s a belief you changed your mind about recently?",
    "What’s a goal you’re working on this year?",
    "What’s a place that feels like home to you (and why)?",
  ];

  const hasAny = (lv: "simple" | "medium" | "advanced") =>
    learn.some((x) => levelHint(x.level) === lv);

  const englishPack = hasAny("advanced")
    ? advanced
    : hasAny("medium")
    ? medium
    : hasAny("simple")
    ? simple
    : easiest;

  const all = [
    langLine,
    ...themed,
    ...base,
    ...(learn.length ? englishPack : []),
  ];

  return pick(all, 10).map((t, i) => ({ id: `q${i}`, text: t }));
}

export default function IcebreakerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = String(id ?? "");

  const [questions, setQuestions] = useState<Ice[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      const topics = (p.favorites ?? p.interests ?? []).filter(Boolean);
      const learn = (p.languageLearning?.learn ?? []).filter(Boolean);

      setQuestions(buildIcebreakers(learn, topics));
      setReady(true);
    })();
  }, []);

  const sendToChat = async (text: string) => {
    await appendChat(matchId, { from: "me", text });
    router.push(`/(tabs)/chat/${matchId}` as any);
  };

  if (!ready) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "900", color: "#000" }}>Icebreakers</Text>
      <Text style={{ marginTop: 6, opacity: 0.7, color: "#000" }}>
        Tocá una frase y la mandamos al chat.
      </Text>

      <View style={{ height: 14 }} />

      <FlatList
        data={questions}
        keyExtractor={(x) => x.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => sendToChat(item.text)}
            style={{
              borderWidth: 1,
              borderColor: "#eee",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <Text style={{ color: "#000", fontWeight: "800" }}>{item.text}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        onPress={() => router.push(`/(tabs)/chat/${matchId}` as any)}
        style={{ marginTop: 10, backgroundColor: "#000", padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Ir al chat</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
