// app/(tabs)/home.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View, Text, Pressable, Platform, ActivityIndicator,
  Image, ScrollView, Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useThemeMode } from "../../src/theme";
import { Ionicons } from "@expo/vector-icons";
import { PROFILES } from "../../src/mock/profiles";
import { calculateCompatibility } from "../../src/matching/calculateCompatibility";
import { getProfile } from "../../src/storage";
import { getDiscoveryProfiles, type RemoteProfile } from "../../src/storage/profilesStorage";
import * as Haptics from "expo-haptics";

const { width: SW } = Dimensions.get("window");

// ─── Tipos ────────────────────────────────────────────────────────────────────
type DiscoverProfile = {
  id: string;
  name: string;
  country?: string;
  city?: string;
  native?: string;
  learning?: any;
  learningLangs?: string[];
  interests?: string[];
  score?: number;
  photoUrl?: string | null;
  isReal?: boolean;
  bio?: string;
};

const FLAGS: Record<string, string> = {
  es: "🇦🇷", en: "🇺🇸", de: "🇩🇪",
  ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
};
const LANG_NAMES: Record<string, string> = {
  es: "Español", en: "English", de: "Deutsch",
  ja: "日本語", ru: "Русский", zh: "中文",
};
const LANG_CODES = ["en", "de", "ja", "ru", "zh", "es"];

function getLearningLangs(learning: any): string[] {
  if (!learning) return [];
  if (Array.isArray(learning))
    return learning.map((x) => (x?.code ?? x?.lang ?? "").toLowerCase()).filter(Boolean);
  return [];
}

function normalizeProfile(p: any): DiscoverProfile {
  const ll = getLearningLangs(p?.learning);
  return {
    id: String(p?.id ?? ""),
    name: String(p?.name ?? p?.displayName ?? "—"),
    country: p?.country ? String(p.country) : undefined,
    city: p?.city ? String(p.city) : undefined,
    native: String(p?.native ?? p?.nativeLang ?? ""),
    learning: p?.learning,
    learningLangs: ll,
    interests: Array.isArray(p?.interests) ? p.interests.map(String) : [],
    photoUrl: p?.photoUrl ?? p?.photos?.[0] ?? null,
    isReal: false,
    bio: p?.bio ?? "",
  };
}

function normalizeRemote(p: RemoteProfile): DiscoverProfile {
  const ll = getLearningLangs(p.learning);
  return {
    id: p.id,
    name: p.displayName || "—",
    country: p.country || undefined,
    city: p.city || undefined,
    native: p.nativeLang,
    learning: p.learning,
    learningLangs: ll,
    interests: p.interests,
    photoUrl: p.photoUrl,
    isReal: true,
    bio: p.bio ?? "",
  };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ uri, name, size, colors }: {
  uri?: string | null; name: string; size: number; colors: any;
}) {
  const initials = name.slice(0, 2).toUpperCase();
  return uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
    />
  ) : (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.accent + "30",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: colors.accent, fontWeight: "800", fontSize: size * 0.34 }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Lang pill ────────────────────────────────────────────────────────────────
function LangPill({ lang, level, colors, small }: {
  lang: string; level?: string; colors: any; small?: boolean;
}) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 99,
      paddingHorizontal: small ? 8 : 10,
      paddingVertical: small ? 4 : 6,
    }}>
      <Text style={{ fontSize: small ? 13 : 15 }}>{FLAGS[lang] ?? "🌍"}</Text>
      <Text style={{
        color: colors.fg, fontWeight: "700",
        fontSize: small ? 11 : 13,
      }}>
        {LANG_NAMES[lang] ?? lang.toUpperCase()}
      </Text>
      {level ? (
        <Text style={{ color: colors.accent, fontWeight: "800", fontSize: small ? 10 : 11 }}>
          {level}
        </Text>
      ) : null}
    </View>
  );
}

// ─── FEATURED CARD ────────────────────────────────────────────────────────────
function FeaturedCard({ profile, colors, onChat, onProfile, saved, onSave }: {
  profile: DiscoverProfile; colors: any;
  onChat: () => void; onProfile: () => void;
  saved: boolean; onSave: () => void;
}) {
  const learningItems: { lang: string; level?: string }[] = Array.isArray(profile.learning)
    ? profile.learning.map((x: any) => ({ lang: x?.code ?? x?.lang ?? "", level: x?.level }))
    : [];

  return (
    <View style={{
      borderRadius: 24, overflow: "hidden",
      borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card,
      marginHorizontal: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    }}>
      {/* Foto superior */}
      <View style={{ height: 200, backgroundColor: colors.accent + "15" }}>
        {profile.photoUrl ? (
          <Image
            source={{ uri: profile.photoUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View style={{
            flex: 1, alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{
              fontSize: 72, fontWeight: "900",
              color: colors.accent, opacity: 0.25,
            }}>
              {profile.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Badge real */}
        {profile.isReal && (
          <View style={{
            position: "absolute", top: 12, left: 12,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
            flexDirection: "row", alignItems: "center", gap: 5,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#34C759" }} />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>Usuario real</Text>
          </View>
        )}

        {/* Guardar */}
        <Pressable
          onPress={onSave}
          style={{
            position: "absolute", top: 12, right: 12,
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={saved ? colors.accent : "#fff"}
          />
        </Pressable>
      </View>

      {/* Info */}
      <View style={{ padding: 16, gap: 12 }}>
        {/* Nombre + ubicación */}
        <View>
          <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 22 }}>
            {profile.name}
          </Text>
          {(profile.city || profile.country) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
              <Ionicons name="location-outline" size={13} color={colors.fg} style={{ opacity: 0.35 }} />
              <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "500", fontSize: 13 }}>
                {[profile.city, profile.country].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}
        </View>

        {/* Idiomas */}
        <View style={{ gap: 8 }}>
          <Text style={{
            color: colors.fg, opacity: 0.4, fontWeight: "700",
            fontSize: 11, letterSpacing: 1,
          }}>
            IDIOMAS
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {profile.native && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <LangPill lang={profile.native} colors={colors} />
                <Text style={{ color: colors.fg, opacity: 0.35, fontSize: 12, fontWeight: "500" }}>
                  nativo
                </Text>
              </View>
            )}
            {learningItems.slice(0, 3).map((l, i) => l.lang ? (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <LangPill lang={l.lang} level={l.level ?? undefined} colors={colors} />
                <Text style={{ color: colors.fg, opacity: 0.35, fontSize: 12, fontWeight: "500" }}>
                  aprende
                </Text>
              </View>
            ) : null)}
          </View>
        </View>

        {/* Bio */}
        {profile.bio ? (
          <Text style={{
            color: colors.fg, opacity: 0.6, fontSize: 14,
            fontWeight: "500", lineHeight: 20,
          }} numberOfLines={2}>
            {profile.bio}
          </Text>
        ) : null}

        {/* Intereses */}
        {(profile.interests ?? []).length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(profile.interests ?? []).slice(0, 5).map((it) => (
              <View key={it} style={{
                backgroundColor: colors.accentSoft,
                borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
              }}>
                <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 12 }}>{it}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Botones */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
          <Pressable
            onPress={onProfile}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 14,
              borderWidth: 1, borderColor: colors.border,
              backgroundColor: colors.bg,
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 6,
            }}
          >
            <Ionicons name="person-outline" size={16} color={colors.fg} />
            <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 14 }}>Ver perfil</Text>
          </Pressable>
          <Pressable
            onPress={onChat}
            style={{
              flex: 2, paddingVertical: 12, borderRadius: 14,
              backgroundColor: colors.accent,
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 6,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
            }}
          >
            <Ionicons name="language-outline" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
              Practicar juntos
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── ROW CARD (lista compacta) ────────────────────────────────────────────────
function RowCard({ profile, colors, onChat, onProfile, saved, onSave }: {
  profile: DiscoverProfile; colors: any;
  onChat: () => void; onProfile: () => void;
  saved: boolean; onSave: () => void;
}) {
  const learningItems: { lang: string; level?: string }[] = Array.isArray(profile.learning)
    ? profile.learning.map((x: any) => ({ lang: x?.code ?? x?.lang ?? "", level: x?.level }))
    : [];

  return (
    <Pressable
      onPress={onProfile}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16, borderWidth: 1, borderColor: colors.border,
        padding: 12, flexDirection: "row", gap: 12, alignItems: "center",
      }}
    >
      <Avatar uri={profile.photoUrl} name={profile.name} size={52} colors={colors} />

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: colors.fg, fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
            {profile.name}
          </Text>
          {profile.isReal && (
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#34C759" }} />
          )}
        </View>

        {/* Idiomas compactos */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {profile.native && (
            <Text style={{ fontSize: 14 }}>{FLAGS[profile.native] ?? "🌍"}</Text>
          )}
          {profile.native && (
            <Text style={{ color: colors.fg, opacity: 0.45, fontSize: 12, fontWeight: "500" }}>
              {LANG_NAMES[profile.native] ?? profile.native}
            </Text>
          )}
          {learningItems.length > 0 && (
            <Text style={{ color: colors.fg, opacity: 0.25, fontSize: 12 }}>·</Text>
          )}
          {learningItems.slice(0, 2).map((l, i) => l.lang ? (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Text style={{ fontSize: 13 }}>{FLAGS[l.lang] ?? "🌍"}</Text>
              {l.level ? (
                <Text style={{
                  color: colors.accent, fontWeight: "700",
                  fontSize: 11,
                  backgroundColor: colors.accentSoft,
                  paddingHorizontal: 5, paddingVertical: 1,
                  borderRadius: 6,
                }}>
                  {l.level}
                </Text>
              ) : null}
            </View>
          ) : null)}
        </View>

        {/* Intereses */}
        {(profile.interests ?? []).length > 0 && (
          <Text style={{ color: colors.fg, opacity: 0.35, fontSize: 12, fontWeight: "500" }} numberOfLines={1}>
            {(profile.interests ?? []).slice(0, 3).join("  ·  ")}
          </Text>
        )}
      </View>

      {/* Acciones */}
      <View style={{ alignItems: "center", gap: 8 }}>
        <Pressable onPress={onChat} style={{
          backgroundColor: colors.accent,
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
          flexDirection: "row", alignItems: "center", gap: 5,
        }}>
          <Ionicons name="chatbubble-ellipses" size={13} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Practicar</Text>
        </Pressable>
        <Pressable onPress={onSave}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={saved ? colors.accent : colors.fg}
            style={{ opacity: saved ? 1 : 0.3 }}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── FILTER PILL ──────────────────────────────────────────────────────────────
function FilterPill({ lang, active, onPress, colors }: {
  lang: string | null; active: boolean; onPress: () => void; colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        backgroundColor: active ? colors.accentSoft : colors.card,
      }}
    >
      {lang ? (
        <>
          <Text style={{ fontSize: 14 }}>{FLAGS[lang] ?? "🌍"}</Text>
          <Text style={{
            color: active ? colors.accent : colors.fg,
            fontWeight: "700", fontSize: 13,
          }}>
            {LANG_NAMES[lang] ?? lang.toUpperCase()}
          </Text>
        </>
      ) : (
        <Text style={{
          color: active ? colors.accent : colors.fg,
          fontWeight: "700", fontSize: 13,
        }}>
          Todos
        </Text>
      )}
    </Pressable>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [myProfile, setMyProfile] = useState<any>(null);
  const [remoteProfiles, setRemoteProfiles] = useState<DiscoverProfile[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [filterLang, setFilterLang] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    getProfile().then(setMyProfile);
    setLoadingRemote(true);
    getDiscoveryProfiles(30)
      .then((data) => setRemoteProfiles(data.map(normalizeRemote)))
      .catch(() => setRemoteProfiles([]))
      .finally(() => setLoadingRemote(false));
  }, []));

  const me = useMemo(() => {
    if (!myProfile) return { interests: [], goalLanguage: "EN" };
    const learningLangs = (myProfile.languageLearning?.learn ?? []).map((x: any) => x.lang);
    return {
      interests: myProfile.interests ?? [],
      nativeLang: myProfile.nativeLang,
      learning: learningLangs,
      goalLanguage: learningLangs[0] ?? "EN",
    };
  }, [myProfile]);

  const allProfiles = useMemo(() => {
    const mockBase = (PROFILES as any[]).map(normalizeProfile);
    const all = [...remoteProfiles, ...mockBase];
    return all
      .map((p) => ({ ...p, score: calculateCompatibility(me, p as any) }))
      .sort((a, b) => {
        if (a.isReal && !b.isReal) return -1;
        if (!a.isReal && b.isReal) return 1;
        return (b.score ?? 0) - (a.score ?? 0);
      });
  }, [me, remoteProfiles]);

  const filtered = useMemo(() => {
    if (!filterLang) return allProfiles;
    return allProfiles.filter(
      (p) =>
        p.native === filterLang ||
        (p.learningLangs ?? []).includes(filterLang)
    );
  }, [allProfiles, filterLang]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  function toggleSave(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const firstName = myProfile?.displayName?.split(" ")[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* ── HEADER ── */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 54 : 22,
        paddingHorizontal: 20, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: colors.fg, fontSize: 26, fontWeight: "900" }}>
              {firstName ? `Hola, ${firstName} 👋` : "Descubrí gente"}
            </Text>
            <Text style={{ color: colors.fg, opacity: 0.38, fontSize: 13, fontWeight: "500", marginTop: 2 }}>
              {loadingRemote
                ? "Buscando personas..."
                : `${allProfiles.length} personas para practicar`}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
            <Pressable
              onPress={() => router.push("/(tabs)/chats")}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.fg} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/matches")}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="people-outline" size={18} color={colors.fg} />
            </Pressable>
          </View>
        </View>

        {/* Filtros por idioma */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 14, paddingRight: 4 }}
        >
          <FilterPill lang={null} active={filterLang === null} onPress={() => setFilterLang(null)} colors={colors} />
          {LANG_CODES.map((lang) => (
            <FilterPill
              key={lang} lang={lang}
              active={filterLang === lang}
              onPress={() => setFilterLang(filterLang === lang ? null : lang)}
              colors={colors}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── CONTENIDO ── */}
      <ScrollView
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 60, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {loadingRemote && (
          <View style={{ alignItems: "center", paddingVertical: 16 }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {/* Featured */}
        {featured && (
          <View style={{ gap: 10 }}>
            <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: colors.accent,
              }} />
              <Text style={{
                color: colors.fg, opacity: 0.4, fontWeight: "700",
                fontSize: 11, letterSpacing: 1.2,
              }}>
                MEJOR COMPATIBILIDAD
              </Text>
            </View>
            <FeaturedCard
              profile={featured}
              colors={colors}
              saved={savedIds.includes(featured.id)}
              onSave={() => toggleSave(featured.id)}
              onChat={() => router.push(`/(tabs)/chat/${featured.id}` as any)}
              onProfile={() => router.push(`/(tabs)/profile/${featured.id}` as any)}
            />
          </View>
        )}

        {/* Lista resto */}
        {rest.length > 0 && (
          <View style={{ gap: 10 }}>
            <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: colors.border,
                }} />
                <Text style={{
                  color: colors.fg, opacity: 0.4, fontWeight: "700",
                  fontSize: 11, letterSpacing: 1.2,
                }}>
                  MÁS PERSONAS
                </Text>
              </View>
              <Text style={{ color: colors.fg, opacity: 0.25, fontWeight: "600", fontSize: 12 }}>
                {rest.length} resultados
              </Text>
            </View>

            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {rest.map((p) => (
                <RowCard
                  key={p.id}
                  profile={p}
                  colors={colors}
                  saved={savedIds.includes(p.id)}
                  onSave={() => toggleSave(p.id)}
                  onChat={() => router.push(`/(tabs)/chat/${p.id}` as any)}
                  onProfile={() => router.push(`/(tabs)/profile/${p.id}` as any)}
                />
              ))}
            </View>
          </View>
        )}

        {filtered.length === 0 && !loadingRemote && (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
            <Ionicons name="search-outline" size={44} color={colors.fg} style={{ opacity: 0.15 }} />
            <Text style={{ color: colors.fg, opacity: 0.35, fontWeight: "600", fontSize: 15 }}>
              No hay perfiles para este idioma
            </Text>
            <Pressable onPress={() => setFilterLang(null)}>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>Ver todos</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}