// app/(tabs)/profile/[id].tsx
import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../../src/theme";
import StoryRow from "../../../src/components/StoryRow";
import StoryViewer from "../../../src/components/StoryViewer";
import type { StoryItem } from "../../../src/storage";
import { PROFILES } from "../../../src/mock/profiles";

export default function PublicProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const user = useMemo(() => PROFILES.find((p) => p.id === id), [id]);

  const [openStory, setOpenStory] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);

  const learnLine = useMemo(() => {
    const learn = user?.learning ?? [];
    if (!learn.length) return "-";
    return learn.map((x: any) => `${x.lang.toUpperCase()}:${x.level ?? "-"}`).join("  •  ");
  }, [user]);

  const stories: StoryItem[] = (user?.stories ?? []) as any;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: "900" }}>
          {user?.name ?? t("profile")}
        </Text>
        <Text style={{ marginTop: 6, color: colors.fg, opacity: 0.75, fontWeight: "800" }}>
          {user?.country ?? ""}
        </Text>

        <Text style={{ marginTop: 10, color: colors.fg, opacity: 0.7, fontWeight: "800" }}>
          {t("native")}:{" "}
          <Text style={{ opacity: 1, fontWeight: "900" }}>{user?.nativeLang?.toUpperCase() ?? "-"}</Text>
          {"  •  "}
          {t("learning")}:{" "}
          <Text style={{ opacity: 1, fontWeight: "900" }}>{learnLine}</Text>
        </Text>

        {/* Stories */}
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

        {/* Info real */}
        <View style={{ marginTop: 18, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 14 }}>
          <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "900" }}>{t("aboutMe")}</Text>

          <Text style={{ marginTop: 10, color: colors.fg, opacity: 0.7, fontWeight: "800" }}>{t("city")}</Text>
          <Text style={{ marginTop: 4, color: colors.fg, fontWeight: "900" }}>{user?.city ?? "-"}</Text>

          <Text style={{ marginTop: 12, color: colors.fg, opacity: 0.7, fontWeight: "800" }}>{t("favoriteFood")}</Text>
          <Text style={{ marginTop: 4, color: colors.fg, fontWeight: "900" }}>{user?.favoriteFood ?? "-"}</Text>

          <Text style={{ marginTop: 12, color: colors.fg, opacity: 0.7, fontWeight: "800" }}>{t("bio")}</Text>
          <Text style={{ marginTop: 4, color: colors.fg, fontWeight: "800" }}>{user?.bio ?? "-"}</Text>

          <Text style={{ marginTop: 12, color: colors.fg, opacity: 0.7, fontWeight: "800" }}>{t("interests")}</Text>
          <Text style={{ marginTop: 4, color: colors.fg, fontWeight: "800" }}>
            {(user?.interests?.length ? user.interests.join(" • ") : "-")}
          </Text>
        </View>
      </ScrollView>

      <StoryViewer
        visible={openStory}
        onClose={() => setOpenStory(false)}
        story={selectedStory}
      />
    </View>
  );
}
