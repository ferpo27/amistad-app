// app/(tabs)/profile.tsx
import React, { useCallback, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import { getProfile, type LearningLang, type StoryItem } from "@/src/storage";
import StoryRow from "@/src/components/StoryRow";
import StoryViewer from "@/src/components/StoryViewer";

const FLAGS: Record<string, string> = {
  es: "🇦🇷",
  en: "🇺🇸",
  de: "🇩🇪",
  ja: "🇯🇵",
  ru: "🇷🇺",
  zh: "🇨🇳",
};

export default function MyProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [pName, setPName] = useState<string>("");
  const [pUser, setPUser] = useState<string>("");
  const [pCountry, setPCountry] = useState<string>("");
  const [pCity, setPCity] = useState<string>("");
  const [pNative, setPNative] = useState<string>("");

  const [learning, setLearning] = useState<LearningLang[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);

  const [openStory, setOpenStory] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);

  const load = useCallback(async () => {
    const prof = await getProfile();

    setPName(prof.displayName ?? "");
    setPUser(prof.username ?? "");
    setPCountry(prof.country ?? "");
    setPCity(prof.city ?? "");
    setPNative(prof.nativeLang ?? "");

    setLearning(prof.languageLearning?.learn ?? []);
    setStories((prof.stories ?? []) as StoryItem[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const hasBasics = pName.trim().length > 0 && pUser.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 18,
            padding: 14,
          }}
        >
          <Text style={{ color: colors.fg, fontSize: 22, fontWeight: "900" }}>
            {pName || "Tu perfil"}
          </Text>

          {pUser ? (
            <Text style={{ color: colors.fg, opacity: 0.65, marginTop: 4, fontWeight: "800" }}>
              @{pUser}
            </Text>
          ) : null}

          {(pCountry || pCity) ? (
            <Text style={{ color: colors.fg, opacity: 0.65, marginTop: 6, fontWeight: "800" }}>
              {pCountry || "—"}{pCity ? ` • ${pCity}` : ""}
            </Text>
          ) : null}

          {pNative ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
              <Text style={{ fontSize: 18 }}>{FLAGS[pNative] ?? "🌐"}</Text>
              <Text style={{ color: colors.fg, fontWeight: "900" }}>
                Nativo: {pNative.toUpperCase()}
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={() => router.push("/onboarding" as any)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: colors.accent,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {hasBasics ? "Editar datos" : "Completar perfil"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Idiomas que aprendés */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "900", marginBottom: 8 }}>
            Idiomas que aprendés
          </Text>

          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 18,
              padding: 14,
            }}
          >
            {learning.length === 0 ? (
              <Text style={{ color: colors.fg, opacity: 0.7 }}>
                Todavía no elegiste idiomas. Tocá “Editar datos”.
              </Text>
            ) : (
              learning.map((l) => (
                <View key={l.lang} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>{FLAGS[l.lang] ?? "🌐"}</Text>
                  <Text style={{ color: colors.fg, fontWeight: "900" }}>{l.lang.toUpperCase()}</Text>
                  <View style={{ marginLeft: "auto" }}>
                    <Text style={{ color: colors.fg, opacity: 0.8, fontWeight: "900" }}>
                      {l.level ?? "—"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Historias */}
        {stories.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "900", marginBottom: 8 }}>
              Historias
            </Text>
            <StoryRow
              stories={stories}
              onOpen={(st) => {
                setSelectedStory(st);
                setOpenStory(true);
              }}
            />
          </View>
        )}
      </ScrollView>

      <StoryViewer visible={openStory} onClose={() => setOpenStory(false)} story={selectedStory} />
    </View>
  );
}