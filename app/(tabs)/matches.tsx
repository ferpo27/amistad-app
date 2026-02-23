// app/(tabs)/matches.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useThemeMode } from "../../src/theme";

import { PROFILES } from "../../src/mock/profiles";
import { calculateCompatibility } from "../../src/matching/calculateCompatibility";

type AnyProfile = any;

type RowProfile = {
  id: string;
  name: string;
  country?: string;
  native?: string;
  learningLabel?: string;
  interests?: string[];
  score?: number;
};

function learningToLabel(learning: any): string {
  if (!learning) return "—";
  if (typeof learning === "string") return learning;
  if (Array.isArray(learning)) {
    const parts = learning
      .map((x) => {
        const code = (x?.code ?? x?.lang ?? "").toString().toUpperCase().trim();
        const lvl = (x?.level ?? "").toString().toUpperCase().trim();
        return [code, lvl].filter(Boolean).join(" ") || null;
      })
      .filter(Boolean) as string[];
    return parts.length ? parts.join(", ") : "—";
  }
  return "—";
}

function normalize(p: AnyProfile): RowProfile {
  return {
    id: String(p?.id ?? ""),
    name: String(p?.name ?? "—"),
    country: p?.country ? String(p.country) : undefined,
    native: String(p?.native ?? p?.nativeLang ?? "—"),
    learningLabel: learningToLabel(p?.learning),
    interests: Array.isArray(p?.interests) ? p.interests.map(String) : [],
  };
}

export default function MatchesScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [onlyTop, setOnlyTop] = useState(true);

  const me = useMemo(
    () => ({
      interests: ["Fitness", "Trading", "Tech", "Music", "Travel", "Movies"],
      goalLanguage: "EN",
    }),
    []
  );

  const ranked = useMemo(() => {
    const base = (PROFILES as AnyProfile[]).map(normalize);
    const list = base
      .map((p) => ({ ...p, score: calculateCompatibility(me, p as any) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return onlyTop ? list.slice(0, 20) : list;
  }, [me, onlyTop]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 54 : 22,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>Matches</Text>
          <Text style={{ color: colors.fg, opacity: 0.75, marginTop: 4 }}>
            Ordenados por compatibilidad
          </Text>
        </View>

        <Pressable
          onPress={() => setOnlyTop((v) => !v)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: onlyTop ? colors.accentSoft : colors.card,
          }}
        >
          <Text style={{ color: colors.fg, fontWeight: "900" }}>
            {onlyTop ? "Top" : "All"}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {ranked.map((p) => {
          const score = typeof p.score === "number" ? p.score : 0;
          const scorePct = Math.max(0, Math.min(100, Math.round(score * 100)));

          return (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/(tabs)/chat/${p.id}`)}
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>
                    {p.name} {p.country ? `• ${p.country}` : ""}
                  </Text>
                  <Text style={{ color: colors.fg, opacity: 0.75, fontWeight: "700", marginTop: 2 }}>
                    Native: {p.native ?? "—"} • Learning: {p.learningLabel ?? "—"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: colors.fg, fontWeight: "900" }}>{scorePct}%</Text>
                  <Text style={{ color: colors.fg, opacity: 0.6, fontWeight: "800" }}>match</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {(p.interests ?? []).slice(0, 6).map((it) => (
                  <View
                    key={it}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: colors.bg,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.fg, fontWeight: "800", opacity: 0.9 }}>{it}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
