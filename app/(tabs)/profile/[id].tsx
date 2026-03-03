// app/(tabs)/profile/[id].tsx
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme";
import StoryRow from "@/src/components/StoryRow";
import StoryViewer from "@/src/components/StoryViewer";
import type { StoryItem } from "@/src/storage";
import { PROFILES } from "@/src/mock/profiles";
import { MATCHES } from "@/src/mock/matches";

const FLAGS: Record<string, string> = {
  es: "🇦🇷",
  en: "🇺🇸",
  de: "🇩🇪",
  ja: "🇯🇵",
  ru: "🇷🇺",
  zh: "🇨🇳",
};
const LANG_NAMES: Record<string, string> = {
  es: "Español",
  en: "English",
  de: "Deutsch",
  ja: "日本語",
  ru: "Русский",
  zh: "中文",
};

export default function PublicProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Busca en PROFILES (discover) y también en MATCHES
  const user = useMemo(() => {
    const fromProfiles = (PROFILES as any[]).find((p) => String(p.id) === String(id));
    if (fromProfiles) return fromProfiles;
    return (MATCHES as any[]).find((m) => String(m.id) === String(id)) ?? null;
  }, [id]);

  const [openStory, setOpenStory] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);

  const learnLine = useMemo(() => {
    const learn = user?.learning ?? user?.languageLearning?.learn ?? [];
    if (!learn.length) return "";
    return learn
      .map((x: any) => {
        const lang = String(x.lang ?? x.code ?? "").toUpperCase();
        const level = x.level ? ` ${x.level}` : "";
        return `${lang}${level}`;
      })
      .join("  •  ");
  }, [user]);

  // Filtra stories expiradas igual que profile.tsx
  const stories: StoryItem[] = useMemo(() => {
    const raw = user?.stories ?? [];
    const now = Date.now();
    return raw
      .filter((s: any) => !s.expiresAt || s.expiresAt > now)
      .map((s: any) => ({
        id: s.id,
        uri: s.photos?.[0] ?? s.uri ?? "",
        title: s.title ?? "",
        ts: s.ts ?? Date.now(),
        expiresAt: s.expiresAt,
      }))
      .filter((x: any) => !!x.uri);
  }, [user]);

  const interests: string[] = useMemo(() => {
    return Array.isArray(user?.interests) ? user.interests : [];
  }, [user]);

  const nativeLang: string = user?.nativeLang ?? user?.native ?? "";
  const photoUri: string | null = user?.photoUri ?? null;
  const initials = (user?.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── HEADER ── */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 54 : 22,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.fg, fontWeight: "900" }}>←</Text>
        </Pressable>
        <Text
          style={{ color: colors.fg, fontSize: 20, fontWeight: "900", flex: 1 }}
          numberOfLines={1}
        >
          {user?.name ?? t("profile")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── HERO ── */}
        <View
          style={{
            paddingTop: 28,
            paddingBottom: 24,
            paddingHorizontal: 24,
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* Foto o iniciales */}
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
            />
          ) : (
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900" }}>{initials}</Text>
            </View>
          )}

          <Text
            style={{
              color: colors.fg,
              fontSize: 24,
              fontWeight: "900",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            {user?.name ?? t("profile")}
          </Text>

          {(user?.country || user?.city) ? (
            <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", marginTop: 4 }}>
              📍 {user?.country ?? ""}{user?.city ? ` • ${user.city}` : ""}
            </Text>
          ) : null}

          {(nativeLang || learnLine) ? (
            <Text
              style={{
                marginTop: 8,
                color: colors.fg,
                opacity: 0.7,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              {nativeLang
                ? `${FLAGS[nativeLang] ?? "🌐"} ${LANG_NAMES[nativeLang] ?? nativeLang.toUpperCase()}`
                : ""}
              {learnLine ? `  •  aprende: ${learnLine}` : ""}
            </Text>
          ) : null}

          {/* Bio */}
          {user?.bio ? (
            <Text
              style={{
                color: colors.fg,
                opacity: 0.7,
                fontWeight: "700",
                marginTop: 10,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {user.bio}
            </Text>
          ) : null}
        </View>

        <View style={{ padding: 20, gap: 20 }}>
          {/* ── HISTORIAS ── */}
          {stories.length > 0 && (
            <View>
              <Text
                style={{
                  color: colors.fg,
                  opacity: 0.5,
                  fontWeight: "800",
                  fontSize: 12,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                HISTORIAS
              </Text>
              <StoryRow
                stories={stories}
                onOpen={(st) => {
                  setSelectedStory(st);
                  setOpenStory(true);
                }}
              />
            </View>
          )}

          {/* ── IDIOMAS ── */}
          {nativeLang ? (
            <View>
              <Text
                style={{
                  color: colors.fg,
                  opacity: 0.5,
                  fontWeight: "800",
                  fontSize: 12,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                IDIOMA NATIVO
              </Text>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 18,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "900" }}>
                  {FLAGS[nativeLang] ?? "🌍"} {LANG_NAMES[nativeLang] ?? nativeLang}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── INTERESES ── */}
          {interests.length > 0 && (
            <View>
              <Text
                style={{
                  color: colors.fg,
                  opacity: 0.5,
                  fontWeight: "800",
                  fontSize: 12,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                INTERESES
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {interests.map((it: string) => (
                  <View
                    key={it}
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: colors.fg, fontWeight: "800" }}>{it}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── CTA FIJO ABAJO ── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: Platform.OS === "ios" ? 32 : 16,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => router.push(`/(tabs)/chat/${id}` as any)}
          style={{
            backgroundColor: colors.accent,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
            Abrir chat →
          </Text>
        </Pressable>
      </View>

      <StoryViewer
        visible={openStory}
        onClose={() => setOpenStory(false)}
        story={selectedStory}
      />
    </View>
  );
}