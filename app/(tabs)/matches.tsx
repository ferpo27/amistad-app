// app/(tabs)/matches.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useThemeMode } from "../../src/theme";
import { PROFILES } from "../../src/mock/profiles";
import { calculateCompatibility } from "../../src/matching/calculateCompatibility";

type AnyProfile = any;
type RowProfile = {
  id: string; name: string; country?: string;
  native?: string; nativeLang?: string;
  learningLabel?: string; interests?: string[]; score?: number;
};

const FLAGS: Record<string, string> = {
  es: "🇦🇷", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
};
const LANG_NAMES: Record<string, string> = {
  es: "Español", en: "English", de: "Deutsch", ja: "日本語", ru: "Русский", zh: "中文",
};

function learningToLabel(learning: any): string {
  if (!learning) return "—";
  if (typeof learning === "string") return learning;
  if (Array.isArray(learning)) {
    const parts = learning.map((x: any) => {
      const code = (x?.code ?? x?.lang ?? "").toString().toUpperCase().trim();
      const lvl = (x?.level ?? "").toString().toUpperCase().trim();
      return [code, lvl].filter(Boolean).join(" ") || null;
    }).filter(Boolean) as string[];
    return parts.length ? parts.join(", ") : "—";
  }
  return "—";
}

function normalize(p: AnyProfile): RowProfile {
  return {
    id: String(p?.id ?? ""),
    name: String(p?.name ?? "—"),
    country: p?.country ? String(p.country) : undefined,
    native: String(p?.native ?? p?.nativeLang ?? ""),
    nativeLang: String(p?.native ?? p?.nativeLang ?? ""),
    learningLabel: learningToLabel(p?.learning),
    interests: Array.isArray(p?.interests) ? p.interests.map(String) : [],
  };
}

function groupByLetter(list: RowProfile[]): { letter: string; items: RowProfile[] }[] {
  const map: Record<string, RowProfile[]> = {};
  for (const p of list) {
    const letter = (p.name[0] ?? "#").toUpperCase();
    if (!map[letter]) map[letter] = [];
    map[letter].push(p);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, items]) => ({ letter, items }));
}

export default function MatchesScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [tab, setTab] = useState<"compatibles" | "contactos">("compatibles");

  const me = useMemo(() => ({
    interests: ["Fitness", "Trading", "Tech", "Music", "Travel", "Movies"],
    goalLanguage: "EN",
  }), []);

  const ranked = useMemo(() => {
    return (PROFILES as AnyProfile[])
      .map(normalize)
      .map((p) => ({ ...p, score: calculateCompatibility(me, p as any) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [me]);

  const alphabetical = useMemo(() => {
    return groupByLetter([...ranked].sort((a, b) => a.name.localeCompare(b.name)));
  }, [ranked]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: Platform.OS === "ios" ? 54 : 22,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>Personas</Text>
        <Text style={{ color: colors.fg, opacity: 0.5, marginTop: 2, fontWeight: "700" }}>
          {ranked.length} perfiles disponibles
        </Text>

        <View style={{
          flexDirection: "row", marginTop: 14,
          backgroundColor: colors.card, borderRadius: 12,
          padding: 3, borderWidth: 1, borderColor: colors.border,
        }}>
          {(["compatibles", "contactos"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center",
                backgroundColor: tab === t ? colors.accent : "transparent",
              }}
            >
              <Text style={{
                color: tab === t ? "#fff" : colors.fg,
                fontWeight: "900", fontSize: 14, opacity: tab === t ? 1 : 0.6,
              }}>
                {t === "compatibles" ? "Compatibles" : "Contactos"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "compatibles" ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {ranked.map((p, i) => {
            const scorePct = Math.max(0, Math.min(100, Math.round((p.score ?? 0) * 100)));
            const nativeLang = (p.nativeLang ?? p.native ?? "").toLowerCase();
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/(tabs)/chat/${p.id}` as any)}
                style={{
                  flexDirection: "row", alignItems: "center",
                  paddingHorizontal: 20, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: colors.border,
                  backgroundColor: i === 0 ? colors.accentSoft : "transparent",
                }}
              >
                <View style={{
                  width: 50, height: 50, borderRadius: 25,
                  backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                  alignItems: "center", justifyContent: "center", marginRight: 14,
                }}>
                  <Text style={{ fontSize: 22 }}>{FLAGS[nativeLang] ?? "🌐"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{p.name}</Text>
                    {i === 0 && (
                      <View style={{ backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>TOP</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", marginTop: 2, fontSize: 13 }}>
                    {p.country ?? "—"} · {LANG_NAMES[nativeLang] ?? nativeLang.toUpperCase()}
                  </Text>
                  {(p.interests ?? []).length > 0 && (
                    <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                      {(p.interests ?? []).slice(0, 3).join(" · ")}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
                  <Text style={{ color: scorePct >= 40 ? colors.accent : colors.fg, fontWeight: "900", fontSize: 18 }}>
                    {scorePct}%
                  </Text>
                  <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 11, fontWeight: "700" }}>match</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {alphabetical.map(({ letter, items }) => (
            <View key={letter}>
              <View style={{
                paddingHorizontal: 20, paddingVertical: 6,
                backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <Text style={{ color: colors.accent, fontWeight: "900", fontSize: 13 }}>{letter}</Text>
              </View>
              {items.map((p) => {
                const nativeLang = (p.nativeLang ?? p.native ?? "").toLowerCase();
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/(tabs)/chat/${p.id}` as any)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      paddingHorizontal: 20, paddingVertical: 14,
                      borderBottomWidth: 1, borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                      alignItems: "center", justifyContent: "center", marginRight: 14,
                    }}>
                      <Text style={{ fontSize: 20 }}>{FLAGS[nativeLang] ?? "🌐"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{p.name}</Text>
                      <Text style={{ color: colors.fg, opacity: 0.5, fontSize: 13, fontWeight: "700", marginTop: 1 }}>
                        {p.country ?? "—"} · Aprende: {p.learningLabel ?? "—"}
                      </Text>
                    </View>
                    <Text style={{ color: colors.fg, opacity: 0.25, fontSize: 18 }}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}