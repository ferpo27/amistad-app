// app/(tabs)/profile/[id].tsx
import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/src/theme";
import StoryRow from "@/src/components/StoryRow";
import StoryViewer from "@/src/components/StoryViewer";
import type { StoryItem } from "@/src/storage";
import { PROFILES } from "@/src/mock/profiles";

const FLAGS: Record<string, string> = {
  es: "🇦🇷",
  en: "🇺🇸",
  de: "🇩🇪",
  ja: "🇯🇵",
  ru: "🇷🇺",
  zh: "🇨🇳",
};

export default function PublicProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const user = useMemo(() => PROFILES.find((p) => p.id === id), [id]);

  const [openStory, setOpenStory] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);

  const learnLine = useMemo(() => {
    const learn = user?.learning ?? [];
    if (!learn.length) return "";
    return learn.map((x: any) => `${String(x.lang).toUpperCase()} ${x.level ?? ""}`.trim()).join("  •  ");
  }, [user]);

  const stories: StoryItem[] = useMemo(() => {
    const raw = user?.stories ?? [];
    // raw = {id,title,photos[],ts} -> StoryItem = {id,uri,title,ts}
    return raw.map((s: any) => ({
      id: s.id,
      uri: s.photos?.[0] ?? "",
      title: s.title ?? "",
      ts: s.ts ?? Date.now(),
    })).filter((x: any) => !!x.uri);
  }, [user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: "900" }}>
          {user?.name ?? t("profile")}
        </Text>

        {(user?.country || user?.city) ? (
          <Text style={{ marginTop: 6, color: colors.fg, opacity: 0.75, fontWeight: "800" }}>
            {user?.country ?? ""}{user?.city ? ` • ${user.city}` : ""}
          </Text>
        ) : null}

        {(user?.nativeLang || learnLine) ? (
          <Text style={{ marginTop: 10, color: colors.fg, opacity: 0.7, fontWeight: "800" }}>
            {t("native")}:{" "}
            <Text style={{ opacity: 1, fontWeight: "900" }}>
              {user?.nativeLang ? `${FLAGS[user.nativeLang] ?? "🌐"} ${user.nativeLang.toUpperCase()}` : "—"}
            </Text>
            {learnLine ? (
              <>
                {"  •  "}
                {t("learning")}: <Text style={{ opacity: 1, fontWeight: "900" }}>{learnLine}</Text>
              </>
            ) : null}
          </Text>
        ) : null}

        {/* Stories */}
        {stories.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "900" }}>{t("stories")}</Text>
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