// app/(tabs)/chats.tsx
import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MATCHES } from "../../src/mock/matches";
import { useTranslation } from "react-i18next";
import { useThemeMode } from "../../src/theme";

export default function ChatsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useThemeMode();

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 22, fontWeight: "900", marginBottom: 12, color: colors.fg }}>
        {t("chats")}
      </Text>

      <FlatList
        data={MATCHES}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}` as any)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.fg }}>
              {item.name} • {item.country}
            </Text>

            <Text style={{ marginTop: 6, color: colors.fg, opacity: 0.75 }}>{item.bio}</Text>

            <Text style={{ marginTop: 8, color: colors.fg, opacity: 0.7 }}>
              Native: {item.nativeLang.toUpperCase()} • Learning:{" "}
              {item.learning.map((l) => `${l.lang.toUpperCase()} ${l.level}`).join(", ")}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
