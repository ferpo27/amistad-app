// app/(tabs)/matches.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useRouter, type Href } from "expo-router";

import { useThemeMode } from "../../src/theme";
import { MATCHES } from "../../../src/mock/matches";
import { getProfile, type LanguageCode } from "../../../src/storage";
import { calculateCompatibility } from "../../../src/matching/calculateCompatibility";

type AnyProfile = any;

type RowProfile = {
  id: string;
  name: string;
  country?: string;
  nativeLang?: LanguageCode;
  learning?: any;
  interests?: string[];
  score?: number;
};

function learningToLabel(learning: any): string {
  if (!learning) return "—";
  if (typeof learning === "string") return learning;

  if (Array.isArray(learning)) {
    const langs = learning
      .map((x) => x?.lang ?? x)
      .filter(Boolean)
      .slice(0, 3)
      .map((x) => String(x).toUpperCase());
    return langs.length ? langs.join(", ") : "—";
  }
  return "—";
}

function normalize(p: AnyProfile): RowProfile {
  return {
    id: String(p?.id ?? ""),
    name: String(p?.name ?? "—"),
    country: p?.country ? String(p.country) : undefined,
    nativeLang: p?.nativeLang,
    learning: p?.learning,
    interests: Array.isArray(p?.interests) ? p.interests.map(String) : [],
  };
}

function Pill({ text, colors }: { text: string; colors: any }) {
  return (
    <View
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
      }}
    >
      <Text style={{ color: colors.fg, fontWeight: "900" }}>{text}</Text>
    </View>
  );
}

export default function MatchesScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();

  const [me, setMe] = useState<{
    interests: string[];
    nativeLang?: LanguageCode;
    learning: LanguageCode[];
    dob?: any;
  } | null>(null);

  const [onlyTop, setOnlyTop] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      const learning = (p.languageLearning?.learn ?? [])
        .map((x) => x.lang)
        .filter(Boolean) as LanguageCode[];

      setMe({
        interests: (p.interests ?? []).filter(Boolean),
        nativeLang: p.nativeLang,
        learning,
        dob: p.dob,
      });
    })();
  }, []);

  const ranked = useMemo(() => {
    const base = (MATCHES as AnyProfile[]).map(normalize);

    const list = base
      .map((p) => ({
        ...p,
        score: me
          ? calculateCompatibility(
              {
                interests: me.interests ?? [],
                nativeLang: me.nativeLang,
                learning: me.learning ?? [],
                dob: me.dob,
              } as any,
              p as any
            )
          : 0,
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return onlyTop ? list.slice(0, 25) : list;
  }, [me, onlyTop]);

  // ✅ FIX DEFINITIVO: typed-routes a veces no incluye rutas nuevas/dinámicas.
  // Usamos Href + cast para evitar el error TS y seguir navegando perfecto.
  const goProfilePreview = (id: string) => {
    const href = {
      pathname: "/profile-preview/[id]",
      params: { id },
    } as unknown as Href;
    router.push(href);
  };

  const goChat = (id: string) => {
    const href = {
      pathname: "/(tabs)/chat/[id]",
      params: { id },
    } as unknown as Href;
    router.push(href);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 54 : 22,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>
          Matches
        </Text>
        <Text style={{ color: colors.fg, opacity: 0.75, marginTop: 4, fontWeight: "700" }}>
          Primero afinidad. Después conversación.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Pressable
            onPress={() => setOnlyTop((v) => !v)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: onlyTop ? colors.accentSoft : colors.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.fg, fontWeight: "900" }}>
              {onlyTop ? "Top" : "All"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/home" as any)}
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.fg, fontWeight: "900" }}>Volver</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {ranked.map((p) => {
          const score = typeof p.score === "number" ? p.score : 0;
          const scorePct = Math.max(0, Math.min(100, Math.round(score * 100)));
          const learnLabel = learningToLabel(p.learning);

          return (
            <View
              key={p.id}
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 20,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>
                    {p.name} {p.country ? `• ${p.country}` : ""}
                  </Text>

                  <Text style={{ color: colors.fg, opacity: 0.7, fontWeight: "700", marginTop: 2 }}>
                    Nativo: {(p.nativeLang ?? "—").toString().toUpperCase()} • Aprende: {learnLabel}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>
                    {scorePct}%
                  </Text>
                  <Text style={{ color: colors.fg, opacity: 0.6, fontWeight: "800" }}>afinidad</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {(p.interests ?? []).slice(0, 6).map((it) => (
                  <Pill key={it} text={it} colors={colors} />
                ))}
              </View>

              {/* CTA */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => goProfilePreview(String(p.id))}
                  style={{
                    flex: 1,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 12,
                    borderRadius: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.fg, fontWeight: "900" }}>Ver perfil</Text>
                </Pressable>

                <Pressable
                  onPress={() => goChat(String(p.id))}
                  style={{
                    flex: 1,
                    backgroundColor: colors.accent,
                    paddingVertical: 12,
                    borderRadius: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>Iniciar chat</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
