// app/(tabs)/home.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useThemeMode } from "../../src/theme";
import { PROFILES } from "../../src/mock/profiles";
import { calculateCompatibility } from "../../src/matching/calculateCompatibility";

type AnyProfile = any;
type DiscoverProfile = {
  id: string;
  name: string;
  country?: string;
  native?: string;
  nativeLang?: string;
  learning?: any;
  learningLabel?: string;
  interests?: string[];
  score?: number;
};

const FLAGS: Record<string, string> = {
  es: "🇦🇷", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
};

function learningToLabel(learning: any): string {
  if (!learning) return "—";
  if (typeof learning === "string") return learning;
  if (Array.isArray(learning)) {
    const parts = learning.map((x) => {
      const code = (x?.code ?? x?.lang ?? "").toString().toUpperCase().trim();
      const lvl = (x?.level ?? "").toString().toUpperCase().trim();
      return [code, lvl].filter(Boolean).join(" ") || null;
    }).filter(Boolean) as string[];
    return parts.length ? parts.join(", ") : "—";
  }
  return "—";
}

function normalizeProfile(p: AnyProfile): DiscoverProfile {
  return {
    id: String(p?.id ?? ""),
    name: String(p?.name ?? "—"),
    country: p?.country ? String(p.country) : undefined,
    native: String(p?.native ?? p?.nativeLang ?? ""),
    nativeLang: String(p?.native ?? p?.nativeLang ?? ""),
    learning: p?.learning,
    learningLabel: learningToLabel(p?.learning),
    interests: Array.isArray(p?.interests) ? p.interests.map(String) : [],
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"discover" | "chats">("discover");

  const me = useMemo(() => ({
    interests: ["Fitness", "Trading", "Tech", "Music", "Travel", "Movies"],
    goalLanguage: "EN",
  }), []);

  const scored = useMemo(() => {
    const base = (PROFILES as AnyProfile[]).map(normalizeProfile);
    const list = base.map((p) => ({ ...p, score: calculateCompatibility(me, p as any) }));
    const q = query.trim().toLowerCase();
    const filtered = q.length === 0 ? list : list.filter((p) =>
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.country ?? "").toLowerCase().includes(q) ||
      (p.interests ?? []).some((x: string) => x.toLowerCase().includes(q))
    );
    return filtered.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [query, me]);

  const top3 = scored.slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* HEADER */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 54 : 22,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>Descubrí gente</Text>
        <Text style={{ color: colors.fg, opacity: 0.5, marginTop: 2, fontWeight: "700" }}>
          Ordenado por compatibilidad
        </Text>

        {/* Buscador */}
        <View style={{
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 12,
        }}>
          <Text style={{ opacity: 0.4, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nombre, país o interés…"
            placeholderTextColor={colors.fg + "55"}
            style={{
              flex: 1,
              color: colors.fg,
              paddingVertical: 12,
              fontWeight: "700",
            }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Text style={{ color: colors.fg, opacity: 0.4, fontSize: 18, paddingLeft: 8 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* TOP 3 */}
        {query.length === 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              
              <View>
                <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>Top picks para vos</Text>
                <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", fontSize: 13 }}>
                  Los 3 más compatibles ahora mismo
                </Text>
              </View>
            </View>
            <View style={{ gap: 12 }}>
              {top3.map((p, i) => (
                <ProfileCard key={p.id} p={p} colors={colors} index={i}
                  onOpen={() => router.push(`/(tabs)/chat/${p.id}` as any)} />
              ))}
            </View>
          </View>
        )}

        {/* TODOS */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>
            {query.length > 0 ? `Resultados` : "Más perfiles"}
          </Text>
          <View style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 99,
            paddingVertical: 4,
            paddingHorizontal: 12,
          }}>
            <Text style={{ color: colors.fg, opacity: 0.6, fontWeight: "800", fontSize: 13 }}>
              {scored.length} personas
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {(query.length > 0 ? scored : scored.slice(3)).map((p, i) => (
            <ProfileCard key={p.id} p={p} colors={colors} index={i}
              onOpen={() => router.push(`/(tabs)/chat/${p.id}` as any)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ProfileCard({ p, colors, index, onOpen }: {
  p: DiscoverProfile; colors: any; index: number; onOpen: () => void;
}) {
  const score = Math.max(0, Math.min(100, Math.round((p.score ?? 0) * 100)));
  const nativeLang = p.nativeLang ?? p.native ?? "";
  const learningArr = Array.isArray(p.learning) ? p.learning : [];

  return (
    <Pressable
      onPress={onOpen}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Avatar */}
        <View style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: colors.accent + "33",
          alignItems: "center", justifyContent: "center",
          marginRight: 12,
        }}>
          <Text style={{ fontSize: 22 }}>{FLAGS[nativeLang.toLowerCase()] ?? "🌐"}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 17 }}>
                {p.name}{p.country ? ` • ${p.country}` : ""}
              </Text>
              <Text style={{ color: colors.fg, opacity: 0.55, fontWeight: "700", marginTop: 2, fontSize: 13 }}>
                Nativo: {nativeLang.toUpperCase() || "—"}
                {p.learningLabel && p.learningLabel !== "—" ? ` · Aprende: ${p.learningLabel}` : ""}
              </Text>
            </View>
            {/* Score */}
            <View style={{ alignItems: "center" }}>
              <Text style={{
                color: score >= 50 ? colors.accent : colors.fg,
                fontWeight: "900", fontSize: 16,
              }}>{score}%</Text>
              <Text style={{ color: colors.fg, opacity: 0.45, fontSize: 11, fontWeight: "800" }}>match</Text>
            </View>
          </View>

          {/* Intereses */}
          {(p.interests ?? []).length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {(p.interests ?? []).slice(0, 4).map((it: string) => (
                <View key={it} style={{
                  paddingVertical: 4, paddingHorizontal: 10,
                  borderRadius: 99,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                  <Text style={{ color: colors.fg, fontWeight: "800", fontSize: 12, opacity: 0.85 }}>{it}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* CTA */}
      <View style={{
        marginTop: 14,
        backgroundColor: colors.accent,
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: "center",
      }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>Abrir chat</Text>
      </View>
    </Pressable>
  );
}