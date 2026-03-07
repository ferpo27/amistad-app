// app/(tabs)/home.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Platform, ActivityIndicator, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useThemeMode } from "../../src/theme";
import { PROFILES } from "../../src/mock/profiles";
import { calculateCompatibility } from "../../src/matching/calculateCompatibility";
import { getProfile } from "../../src/storage";
import { getDiscoveryProfiles, type RemoteProfile } from "../../src/storage/profilesStorage";

type AnyProfile = any;

type DiscoverProfile = {
  id: string;
  name: string;
  country?: string;
  native?: string;
  learning?: any;
  learningLabel?: string;
  interests?: string[];
  score?: number;
  photoUrl?: string | null;
  isReal?: boolean;
};

function learningToLabel(learning: any): string {
  if (!learning) return "—";
  if (typeof learning === "string") return learning;
  if (Array.isArray(learning)) {
    const parts = learning
      .map((x) => {
        const code = (x?.code ?? x?.lang ?? "").toString().toUpperCase().trim();
        const lvl = (x?.level ?? "").toString().toUpperCase().trim();
        const s = [code, lvl].filter(Boolean).join(" ");
        return s || null;
      })
      .filter(Boolean) as string[];
    return parts.length ? parts.join(", ") : "—";
  }
  return "—";
}

function normalizeProfile(p: AnyProfile): DiscoverProfile {
  return {
    id: String(p?.id ?? ""),
    name: String(p?.name ?? p?.displayName ?? "—"),
    country: p?.country ? String(p.country) : undefined,
    native: String(p?.native ?? p?.nativeLang ?? "—"),
    learning: p?.learning,
    learningLabel: learningToLabel(p?.learning),
    interests: Array.isArray(p?.interests) ? p.interests.map(String) : [],
    photoUrl: p?.photoUrl ?? null,
    isReal: p?.isReal ?? false,
  };
}

function normalizeRemote(p: RemoteProfile): DiscoverProfile {
  return {
    id: p.id,
    name: p.displayName || "—",
    country: p.country || undefined,
    native: p.nativeLang,
    learning: p.learning,
    learningLabel: learningToLabel(p.learning),
    interests: p.interests,
    photoUrl: p.photoUrl,
    isReal: true,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [query, setQuery] = useState("");
  const [onlyTop, setOnlyTop] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [remoteProfiles, setRemoteProfiles] = useState<DiscoverProfile[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);

  useFocusEffect(useCallback(() => {
    getProfile().then(setMyProfile);
    // Cargar perfiles reales de Supabase
    setLoadingRemote(true);
    getDiscoveryProfiles(30)
      .then((data) => setRemoteProfiles(data.map(normalizeRemote)))
      .catch(() => setRemoteProfiles([]))
      .finally(() => setLoadingRemote(false));
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

  const scored = useMemo(() => {
    // Combinar perfiles reales (primero) + mocks de bots
    const mockBase = (PROFILES as AnyProfile[]).map(normalizeProfile);
    const all = [...remoteProfiles, ...mockBase];
    const list = all.map((p) => ({ ...p, score: calculateCompatibility(me, p as any) }));
    const q = query.trim().toLowerCase();
    const filtered = q.length === 0 ? list : list.filter((p) => {
      return (
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q) ||
        (p.interests ?? []).some((x: string) => x.toLowerCase().includes(q))
      );
    });
    filtered.sort((a, b) => {
      // Perfiles reales primero, luego por score
      if (a.isReal && !b.isReal) return -1;
      if (!a.isReal && b.isReal) return 1;
      return (b.score ?? 0) - (a.score ?? 0);
    });
    return onlyTop ? filtered.slice(0, 12) : filtered;
  }, [query, onlyTop, me, remoteProfiles]);

  const top3 = scored.slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: Platform.OS === "ios" ? 54 : 22,
        paddingHorizontal: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: "900" }}>
          {myProfile?.displayName ? `Hola, ${myProfile.displayName.split(" ")[0]} 👋` : "Descubrí gente"}
        </Text>
        <Text style={{ color: colors.fg, opacity: 0.75, marginTop: 4 }}>
          {loadingRemote ? "Cargando perfiles..." : `${remoteProfiles.length} usuarios reales · ordenado por compatibilidad`}
        </Text>

        <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={query} onChangeText={setQuery}
              placeholder="Buscar por nombre, país o interés…"
              placeholderTextColor={colors.fg + "88"}
              style={{
                color: colors.fg, backgroundColor: colors.card,
                borderWidth: 1, borderColor: colors.border,
                borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontWeight: "700",
              }}
            />
          </View>
          <Pressable
            onPress={() => setOnlyTop((v) => !v)}
            style={{
              paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
              borderWidth: 1, borderColor: colors.border,
              backgroundColor: onlyTop ? colors.accentSoft : colors.card,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.fg, fontWeight: "900" }}>{onlyTop ? "Top" : "All"}</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pressable
            onPress={() => router.push("/(tabs)/matches")}
            style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 16, alignItems: "center" }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>Ver matches</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/chats")}
            style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, borderRadius: 16, alignItems: "center" }}
          >
            <Text style={{ color: colors.fg, fontWeight: "900" }}>Mis chats</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loadingRemote && (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>Top picks para vos</Text>
        <Text style={{ color: colors.fg, opacity: 0.7, marginTop: 4 }}>
          Los 3 perfiles más compatibles ahora mismo.
        </Text>

        <View style={{ marginTop: 12, gap: 12 }}>
          {top3.map((p, i) => (
            <ProfileCard
              key={p.id} p={p} colors={colors} isTop={i === 0}
              onOpen={() => router.push(`/(tabs)/chat/${p.id}` as any)}
              onProfile={() => router.push(`/(tabs)/profile/${p.id}` as any)}
            />
          ))}
        </View>

        <View style={{ marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>Más perfiles</Text>
          <Text style={{ color: colors.fg, opacity: 0.65, fontWeight: "800" }}>{scored.length} resultados</Text>
        </View>

        <View style={{ marginTop: 12, gap: 12 }}>
          {scored.slice(3).map((p) => (
            <ProfileCard
              key={p.id} p={p} colors={colors}
              onOpen={() => router.push(`/(tabs)/chat/${p.id}` as any)}
              onProfile={() => router.push(`/(tabs)/profile/${p.id}` as any)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ProfileCard({ p, colors, isTop, onOpen, onProfile }: {
  p: DiscoverProfile; colors: any; isTop?: boolean;
  onOpen: () => void; onProfile: () => void;
}) {
  const score = typeof p.score === "number" ? p.score : 0;
  const scorePct = Math.max(0, Math.min(100, Math.round(score * 100)));
  const scoreColor = scorePct >= 60 ? "#22c55e" : scorePct >= 35 ? colors.accent : colors.fg;
  const initials = (p.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <View style={{
      backgroundColor: colors.card, borderWidth: 1,
      borderColor: isTop ? colors.accent + "66" : colors.border,
      borderRadius: 18, padding: 14,
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", gap: 10, flex: 1, marginRight: 8 }}>
          {/* Avatar */}
          {p.photoUrl ? (
            <Image source={{ uri: p.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
          ) : (
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent + "44",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: colors.accent, fontWeight: "900", fontSize: 16 }}>{initials}</Text>
            </View>
          )}
          <View style={{ gap: 2, flexShrink: 1, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 18 }}>
                {p.name} {p.country ? `• ${p.country}` : ""}
              </Text>
              {isTop && (
                <View style={{ backgroundColor: "#FFD700", borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: "#000", fontSize: 10, fontWeight: "900" }}>✦ TOP</Text>
                </View>
              )}
              {p.isReal && (
                <View style={{ backgroundColor: "#22c55e22", borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: "#22c55e", fontSize: 10, fontWeight: "900" }}>● REAL</Text>
                </View>
              )}
            </View>
            <Text style={{ color: colors.fg, opacity: 0.75, fontWeight: "700" }}>
              Native: {p.native ?? "—"} • Learning: {p.learningLabel ?? "—"}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: scoreColor, fontWeight: "900" }}>{scorePct}%</Text>
          <Text style={{ color: colors.fg, opacity: 0.6, fontWeight: "800" }}>match</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {(p.interests ?? []).slice(0, 6).map((it: string) => (
          <View key={it} style={{
            paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
            backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.fg, fontWeight: "800", opacity: 0.9 }}>{it}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Pressable
          onPress={onProfile}
          style={{
            paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
            backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: "center",
          }}
        >
          <Text style={{ color: colors.fg, fontWeight: "900" }}>Ver perfil</Text>
        </Pressable>
        <Pressable
          onPress={onOpen}
          style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 14, alignItems: "center" }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>Abrir chat</Text>
        </Pressable>
      </View>
    </View>
  );
}