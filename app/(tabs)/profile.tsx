// app/(tabs)/profile/[id].tsx
import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../../src/theme";
import StoryRow from "../../../src/components/StoryRow";
import StoryViewer from "../../../src/components/StoryViewer";
import type { StoryItem } from "../../../src/storage";
import { PROFILES, type PublicProfile } from "../../../src/mock/profiles";
import type { LearningLang } from "../../../src/storage";

const LANG_FLAGS: Record<string, string> = {
  es: "🇦🇷", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
};

const LEVEL_COLOR: Record<string, string> = {
  A1: "#94a3b8", A2: "#64748b",
  B1: "#3b82f6", B2: "#2563eb",
  C1: "#7c3aed", C2: "#059669",
};

export default function PublicProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const user = useMemo<PublicProfile | undefined>(
    () => PROFILES.find((p: PublicProfile) => p.id === id),
    [id]
  );

  const [openStory, setOpenStory] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);

  // Stories de PROFILES tienen shape { id, title, photos[], ts }
  // StoryItem/StoryPhoto necesita { id, uri, title, ts }
  // Mapeamos tomando la primer photo como uri
  const stories: StoryItem[] = useMemo(
    () =>
      (user?.stories ?? []).map((s) => ({
        id: s.id,
        uri: s.photos[0] ?? "",
        title: s.title,
        ts: s.ts,
      })),
    [user]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Nombre y país */}
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: "900" }}>
          {user?.name ?? t("profile")}
        </Text>
        {user?.country ? (
          <Text style={{ marginTop: 4, color: colors.fg, opacity: 0.6, fontWeight: "700" }}>
            {user.country}{user.city ? "  •  " + user.city : ""}
          </Text>
        ) : null}

        {/* Idiomas */}
        {user && (
          <View style={{
            marginTop: 14, backgroundColor: colors.card, borderRadius: 16,
            padding: 14, borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.fg, opacity: 0.5, fontSize: 11, fontWeight: "800", marginBottom: 10 }}>
              IDIOMAS
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>{LANG_FLAGS[user.nativeLang] ?? "🌐"}</Text>
              <Text style={{ color: colors.fg, fontWeight: "900" }}>{user.nativeLang.toUpperCase()}</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.accentSoft }}>
                <Text style={{ color: colors.accent, fontWeight: "900", fontSize: 11 }}>NATIVO</Text>
              </View>
            </View>
            {user.learning.map((l: LearningLang) => (
              <View key={l.lang} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 20 }}>{LANG_FLAGS[l.lang] ?? "🌐"}</Text>
                <Text style={{ color: colors.fg, fontWeight: "900" }}>{l.lang.toUpperCase()}</Text>
                {l.level ? (
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                    backgroundColor: (LEVEL_COLOR[l.level] ?? "#888") + "22",
                  }}>
                    <Text style={{ color: LEVEL_COLOR[l.level] ?? colors.fg, fontWeight: "900", fontSize: 11 }}>
                      {l.level}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Bio — solo si tiene contenido */}
        {user?.bio ? (
          <View style={{
            marginTop: 12, backgroundColor: colors.card, borderRadius: 16,
            padding: 14, borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.fg, opacity: 0.5, fontSize: 11, fontWeight: "800", marginBottom: 6 }}>
              BIO
            </Text>
            <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 15, lineHeight: 22 }}>
              {user.bio}
            </Text>
          </View>
        ) : null}

        {/* Intereses — solo si hay */}
        {user?.interests?.length ? (
          <View style={{
            marginTop: 12, backgroundColor: colors.card, borderRadius: 16,
            padding: 14, borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.fg, opacity: 0.5, fontSize: 11, fontWeight: "800", marginBottom: 10 }}>
              INTERESES
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {user.interests.map((it: string) => (
                <View key={it} style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                  backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent + "44",
                }}>
                  <Text style={{ color: colors.accent, fontWeight: "800" }}>{it}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Historias — solo si hay */}
        {stories.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "900", marginBottom: 4 }}>
              {t("stories")}
            </Text>
            <StoryRow
              stories={stories}
              onOpen={(st: StoryItem) => {
                setSelectedStory(st);
                setOpenStory(true);
              }}
            />
          </View>
        )}

      </ScrollView>

      <StoryViewer
        visible={openStory}
        onClose={() => setOpenStory(false)}
        story={selectedStory}
      />
    </View>
  );
}