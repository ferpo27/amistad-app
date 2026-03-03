// app/app/(tabs)/icebreaker/[id].tsx
import React, { useEffect, useState } from "react";
import {
  SafeAreaView, Text, View, FlatList,
  Pressable, Platform, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { appendChat, getProfile, type LanguageLevel, type LearningLang } from "../../../../src/storage";
import { useThemeMode } from "../../../../src/theme";
import { MATCHES } from "../../../../src/mock/matches";

type Ice = { id: string; text: string; lang: string; level: string };

const PHRASES: Record<string, Record<string, string[]>> = {
  de: {
    A1: [
      "Hallo! Wie geht es dir?",
      "Was machst du gerne?",
      "Woher kommst du?",
      "Magst du Musik?",
      "Was ist dein Lieblingsessen?",
    ],
    B1: [
      "Was hast du heute gemacht?",
      "Was ist dein Lieblingsfilm und warum?",
      "Erzähl mir etwas über deine Stadt.",
      "Was machst du in deiner Freizeit?",
      "Hast du Geschwister?",
    ],
    C1: [
      "Was glaubst du, wie wird die Welt in 20 Jahren aussehen?",
      "Welches Buch hat dein Leben verändert?",
      "Was schätzt du an der deutschen Kultur am meisten?",
      "Wie würdest du dich selbst in 3 Wörtern beschreiben?",
    ],
  },
  ja: {
    A1: [
      "こんにちは！元気ですか？",
      "趣味は何ですか？",
      "どこから来ましたか？",
      "好きな食べ物は何ですか？",
      "音楽は好きですか？",
    ],
    B1: [
      "最近、何か面白いことはありましたか？",
      "好きな映画は何ですか？理由も教えてください。",
      "週末はどんなことをしますか？",
      "日本語を勉強している理由は何ですか？",
    ],
    C1: [
      "最近、考えが変わったことはありますか？",
      "日本文化の中で一番好きなものは何ですか？",
      "将来の夢を教えてください。",
    ],
  },
  ru: {
    A1: [
      "Привет! Как дела?",
      "Откуда ты?",
      "Какая твоя любимая еда?",
      "Ты любишь музыку?",
      "Чем ты занимаешься?",
    ],
    B1: [
      "Что ты делал сегодня?",
      "Какой твой любимый фильм?",
      "Расскажи мне о своём городе.",
      "Что ты делаешь в свободное время?",
    ],
    C1: [
      "Что ты думаешь о будущем технологий?",
      "Какая книга изменила твою жизнь?",
      "Как бы ты описал себя тремя словами?",
    ],
  },
  zh: {
    A1: [
      "你好！你好吗？",
      "你来自哪里？",
      "你喜欢什么食物？",
      "你有什么爱好？",
      "你喜欢音乐吗？",
    ],
    B1: [
      "你今天做了什么？",
      "你最喜欢的电影是什么？为什么？",
      "告诉我你的城市有什么特别的。",
      "你周末喜欢做什么？",
    ],
    C1: [
      "你觉得未来20年世界会怎样变化？",
      "什么书改变了你的人生？",
      "你怎么用三个词描述自己？",
    ],
  },
  en: {
    A1: [
      "Hi! How are you?",
      "Where are you from?",
      "What's your favorite food?",
      "Do you like music?",
      "What do you do for fun?",
    ],
    B1: [
      "What did you do today?",
      "What's your favorite movie and why?",
      "Tell me something interesting about your city.",
      "What do you do on weekends?",
    ],
    C1: [
      "What's a belief you changed your mind about recently?",
      "What book has influenced you the most?",
      "How would you describe yourself in 3 words?",
      "What's a goal you're working toward this year?",
    ],
  },
  es: {
    A1: [
      "¡Hola! ¿Cómo estás?",
      "¿De dónde sos?",
      "¿Cuál es tu comida favorita?",
      "¿Te gusta la música?",
      "¿Qué hacés en tu tiempo libre?",
    ],
    B1: [
      "¿Qué hiciste hoy?",
      "¿Cuál es tu película favorita y por qué?",
      "Contame algo interesante de tu ciudad.",
      "¿Qué hacés los fines de semana?",
    ],
    C1: [
      "¿Qué creencia cambiaste recientemente?",
      "¿Qué libro te marcó más?",
      "¿Cómo te describirías en 3 palabras?",
    ],
  },
};

const LANG_NAMES: Record<string, string> = {
  de: "Alemán", ja: "Japonés", ru: "Ruso",
  zh: "Chino", en: "Inglés", es: "Español",
};

const FLAGS: Record<string, string> = {
  de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳", en: "🇺🇸", es: "🇦🇷",
};

function levelGroup(level: LanguageLevel | null): string {
  if (!level) return "B1";
  if (level === "A1" || level === "A2") return "A1";
  if (level === "B1" || level === "B2") return "B1";
  return "C1";
}

function getPhrases(lang: string, level: string): Ice[] {
  const langPhrases = PHRASES[lang] ?? PHRASES["en"];
  const grp = levelGroup(level as LanguageLevel);
  const pool = langPhrases[grp] ?? langPhrases["B1"] ?? [];
  return pool.map((text, i) => ({ id: `${lang}-${i}`, text, lang, level: grp }));
}

export default function IcebreakerScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = String(id ?? "");

  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [matchLang, setMatchLang] = useState<string>("en");
  const [matchLevel, setMatchLevel] = useState<string>("B1");
  const [myLearn, setMyLearn] = useState<LearningLang[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      const learn = p.languageLearning?.learn ?? [];
      setMyLearn(learn);

      // Encontrar el match para saber su idioma nativo
      const match = MATCHES.find((m) => m.id === matchId);
      if (match) {
        setMatchLang(match.nativeLang);
        // Mi nivel en el idioma nativo del match
        const myEntry = learn.find((x) => x.lang === match.nativeLang);
        setMatchLevel(levelGroup(myEntry?.level ?? null));
        setActiveLang(match.nativeLang);
      } else if (learn.length > 0) {
        setActiveLang(learn[0].lang);
        setMatchLevel(levelGroup(learn[0].level));
      }
      setReady(true);
    })();
  }, [matchId]);

  const sendToChat = async (text: string) => {
    await appendChat(matchId, { from: "me", text });
    router.push(`/(tabs)/chat/${matchId}` as any);
  };

  const availableLangs = [
    ...new Set([matchLang, ...myLearn.map((x) => x.lang)])
  ].filter((l) => PHRASES[l]);

  const phrases = activeLang
    ? getPhrases(activeLang, myLearn.find((x) => x.lang === activeLang)?.level ?? matchLevel)
    : [];

  if (!ready) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 12 : 20,
        paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: colors.fg, fontSize: 24, fontWeight: "900" }}>Icebreakers</Text>
            <Text style={{ color: colors.fg, opacity: 0.5, marginTop: 2, fontWeight: "700" }}>
              Tocá una frase para enviarla al chat
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(`/(tabs)/chat/${matchId}` as any)}
            style={{
              paddingHorizontal: 14, paddingVertical: 9,
              borderRadius: 99, backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.fg, fontWeight: "900" }}>Ir al chat</Text>
          </Pressable>
        </View>

        {/* Selector de idioma */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {availableLangs.map((lang) => {
            const active = activeLang === lang;
            const myEntry = myLearn.find((x) => x.lang === lang);
            const grp = levelGroup(myEntry?.level ?? null);
            return (
              <Pressable
                key={lang}
                onPress={() => setActiveLang(lang)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingVertical: 8, paddingHorizontal: 14,
                  borderRadius: 99, borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.card,
                }}
              >
                <Text style={{ fontSize: 16 }}>{FLAGS[lang] ?? "🌐"}</Text>
                <Text style={{ color: active ? colors.accent : colors.fg, fontWeight: "900" }}>
                  {LANG_NAMES[lang] ?? lang.toUpperCase()}
                </Text>
                <View style={{
                  backgroundColor: active ? colors.accent : colors.border,
                  borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>{grp}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={phrases}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "700" }}>
              No hay frases para este idioma todavía.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => sendToChat(item.text)}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
              borderRadius: 16, padding: 16,
              flexDirection: "row", alignItems: "center", gap: 12,
            }}
          >
            <Text style={{ fontSize: 22 }}>{FLAGS[item.lang] ?? "🌐"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 15, lineHeight: 22 }}>
                {item.text}
              </Text>
              <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 12, marginTop: 4, fontWeight: "700" }}>
                {LANG_NAMES[item.lang]} · Nivel {item.level}
              </Text>
            </View>
            <Text style={{ color: colors.accent, fontSize: 20 }}>›</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}