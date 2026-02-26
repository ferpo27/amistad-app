// app/(tabs)/chats.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList, Pressable, Text, View,
  Platform, ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MATCHES } from "../../src/mock/matches";
import { getChat, type ChatMessage } from "../../src/storage";
import { useThemeMode } from "../../src/theme";

type ChatPreview = {
  id: string;
  name: string;
  country: string;
  nativeLang: string;
  lastMessage: string;
  lastTs: number;
  unread: number;
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return mins + "m";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h";
  const days = Math.floor(hrs / 24);
  return days + "d";
}

export default function ChatsScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [previews, setPreviews] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPreviews() {
    const results: ChatPreview[] = [];
    for (const match of MATCHES) {
      const history: ChatMessage[] = await getChat(match.id);
      const last = history[history.length - 1];
      results.push({
        id: match.id,
        name: match.name,
        country: match.country,
        nativeLang: match.nativeLang,
        lastMessage: last ? last.text : "Sin mensajes aún",
        lastTs: last ? last.ts : 0,
        unread: 0,
      });
    }
    // ordenar: con mensajes primero, luego por recencia
    results.sort((a, b) => b.lastTs - a.lastTs);
    setPreviews(results);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { loadPreviews(); }, []));

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 54 : 22,
        paddingHorizontal: 16, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>Chats</Text>
        <Text style={{ color: colors.fg, opacity: 0.6, marginTop: 2, fontWeight: "700" }}>
          {previews.filter((p) => p.lastTs > 0).length} conversaciones activas
        </Text>
      </View>

      <FlatList
        data={previews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const hasChat = item.lastTs > 0;
          return (
            <Pressable
              onPress={() => router.push("/(tabs)/chat/" + item.id as any)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.accentSoft : colors.card,
                borderRadius: 16, padding: 14,
                borderWidth: 1, borderColor: colors.border,
                flexDirection: "row", alignItems: "center", gap: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {/* Avatar */}
              <View style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: colors.accentSoft,
                alignItems: "center", justifyContent: "center",
                borderWidth: 1, borderColor: colors.accent + "44",
              }}>
                <Text style={{ fontSize: 20, fontWeight: "900" }}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>
                    {item.name}
                  </Text>
                  {hasChat && (
                    <Text style={{ color: colors.fg, opacity: 0.45, fontSize: 12, fontWeight: "700" }}>
                      {timeAgo(item.lastTs)}
                    </Text>
                  )}
                </View>
                <Text style={{
                  color: colors.fg, opacity: hasChat ? 0.7 : 0.4,
                  fontWeight: hasChat ? "700" : "600",
                  marginTop: 2, fontSize: 14,
                }} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                <Text style={{ color: colors.fg, opacity: 0.45, fontSize: 11, marginTop: 3, fontWeight: "700" }}>
                  {item.country} • {item.nativeLang.toUpperCase()}
                </Text>
              </View>

              {/* Chevron */}
              <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 18 }}>›</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
            <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>
              Sin chats todavía
            </Text>
            <Text style={{ color: colors.fg, opacity: 0.6, marginTop: 6, textAlign: "center" }}>
              Explorá perfiles y empezá una conversación
            </Text>
          </View>
        }
      />
    </View>
  );
}