// app/(tabs)/matches.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform, ActivityIndicator, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useThemeMode } from "../../src/theme";
import { PROFILES } from "../../src/mock/profiles";
import { calculateCompatibility } from "../../src/matching/calculateCompatibility";
import { getProfile } from "../../src/storage";
import { getDiscoveryProfiles, type RemoteProfile } from "../../src/storage/profilesStorage";

type AnyProfile = any;
type RowProfile = {
  id: string; name: string; country?: string;
  native?: string; nativeLang?: string;
  learningLabel?: string; interests?: string[];
  score?: number; photoUrl?: string | null; isReal?: boolean;
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
    name: String(p?.name ?? p?.displayName ?? "—"),
    country: p?.country ? String(p.country) : undefined,
    native: String(p?.native ?? p?.nativeLang ?? ""),
    nativeLang: String(p?.native ?? p?.nativeLang ?? ""),
    learningLabel: learningToLabel(p?.learning),
    interests: Array.isArray(p?.interests) ? p.interests.map(String) : [],
    photoUrl: p?.photoUrl ?? null,
    isReal: p?.isReal ?? false,
  };
}

function normalizeRemote(p: RemoteProfile): RowProfile {
  return {
    id: p.id,
    name: p.displayName || "—",
    country: p.country || undefined,
    native: p.nativeLang,
    nativeLang: p.nativeLang,
    learningLabel: learningToLabel(p.learning),
    interests: p.interests,
    photoUrl: p.photoUrl,
    isReal: true,
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
  const [myProfile, setMyProfile] = useState<any>(null);
  const [remoteProfiles, setRemoteProfiles] = useState<RowProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    getProfile().then(setMyProfile);
    setLoading(true);
    getDiscoveryProfiles(30)
      .then((data) => setRemoteProfiles(data.map(normalizeRemote)))
      .catch(() => setRemoteProfiles([]))
      .finally(() => setLoading(false));
  }, []));

  const me = useMemo(() => {
    if (myProfile) {
      const learningLangs = (myProfile.languageLearning?.learn ?? []).map((x: any) => x.lang);
      return {
        interests: myProfile.interests ?? [],
        nativeLang: myProfile.nativeLang,
        learning: learningLangs,
        goalLanguage: learningLangs[0] ?? "EN",
      };
    }
    return { interests: ["Fitness", "Trading", "Tech", "Music", "Travel", "Movies"], goalLanguage: "EN" };
  }, [myProfile]);

  const ranked = useMemo(() => {
    const mocks = (PROFILES as AnyProfile[]).map(normalize);
    const all = [...remoteProfiles, ...mocks];
    return all
      .map((p) => ({ ...p, score: calculateCompatibility(me, p as any) }))
      .sort((a, b) => {
        if (a.isReal && !b.isReal) return -1;
        if (!a.isReal && b.isReal) return 1;
        return (b.score ?? 0) - (a.score ?? 0);
      });
  }, [me, remoteProfiles]);

  const alphabetical = useMemo(() => {
    return groupByLetter([...ranked].sort((a, b) => a.name.localeCompare(b.name)));
  }, [ranked]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: Platform.OS === "ios" ? 54 : 22,
        paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>Personas</Text>
        <Text style={{ color: colors.fg, opacity: 0.5, marginTop: 2, fontWeight: "700" }}>
          {loading ? "Cargando..." : `${ranked.length} perfiles · ${remoteProfiles.length} usuarios reales`}
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

      {loading && (
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {tab === "compatibles" ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {ranked.map((p, i) => {
            const scorePct = Math.max(0, Math.min(100, Math.round((p.score ?? 0) * 100)));
            const nativeLang = (p.nativeLang ?? p.native ?? "").toLowerCase();
            const initials = (p.name ?? "?").slice(0, 2).toUpperCase();
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/(tabs)/profile/${p.id}` as any)}
                style={{
                  flexDirection: "row", alignItems: "center",
                  paddingHorizontal: 20, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: colors.border,
                  backgroundColor: i === 0 ? colors.accentSoft : "transparent",
                }}
              >
                {p.photoUrl ? (
                  <Image source={{ uri: p.photoUrl }} style={{ width: 50, height: 50, borderRadius: 25, marginRight: 14 }} />
                ) : (
                  <View style={{
                    width: 50, height: 50, borderRadius: 25,
                    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                    alignItems: "center", justifyContent: "center", marginRight: 14,
                  }}>
                    <Text style={{ fontSize: p.isReal ? 18 : 22 }}>
                      {p.isReal ? initials : (FLAGS[nativeLang] ?? "🌐")}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{p.name}</Text>
                    {i === 0 && (
                      <View style={{ backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>TOP</Text>
                      </View>
                    )}
                    {p.isReal && (
                      <View style={{ backgroundColor: "#22c55e22", borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ color: "#22c55e", fontSize: 10, fontWeight: "900" }}>● REAL</Text>
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

                <View style={{ alignItems: "flex-end", marginLeft: 10, gap: 4 }}>
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
                backgroundColor: colors.card,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <Text style={{ color: colors.accent, fontWeight: "900", fontSize: 13 }}>{letter}</Text>
              </View>
              {items.map((p) => {
                const nativeLang = (p.nativeLang ?? p.native ?? "").toLowerCase();
                const initials = (p.name ?? "?").slice(0, 2).toUpperCase();
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/(tabs)/profile/${p.id}` as any)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      paddingHorizontal: 20, paddingVertical: 14,
                      borderBottomWidth: 1, borderBottomColor: colors.border,
                    }}
                  >
                    {p.photoUrl ? (
                      <Image source={{ uri: p.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 14 }} />
                    ) : (
                      <View style={{
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                        alignItems: "center", justifyContent: "center", marginRight: 14,
                      }}>
                        <Text style={{ fontSize: p.isReal ? 16 : 20 }}>
                          {p.isReal ? initials : (FLAGS[nativeLang] ?? "🌐")}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16 }}>{p.name}</Text>
                        {p.isReal && (
                          <View style={{ backgroundColor: "#22c55e22", borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ color: "#22c55e", fontSize: 10, fontWeight: "900" }}>● REAL</Text>
                          </View>
                        )}
                      </View>
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