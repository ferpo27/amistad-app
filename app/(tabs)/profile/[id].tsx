// app/(tabs)/profile.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView, Text, View, Pressable, Platform,
  Image, Alert, AppState, type AppStateStatus,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import {
  getProfile, updateProfile, addStoryPhoto, removeStoryPhoto,
  type LearningLang, type StoryItem,
} from "@/src/storage";
import * as ImagePicker from "expo-image-picker";

const FLAGS: Record<string, string> = {
  es: "🇦🇷", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
};
const LANG_NAMES: Record<string, string> = {
  es: "Español", en: "English", de: "Deutsch", ja: "日本語", ru: "Русский", zh: "中文",
};
const HOURS_OPTIONS: (24 | 48)[] = [24, 48];

function timeLeft(expiresAt?: number): string | null {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return null; // ya expirada, no mostrar
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function MyProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [pName, setPName] = useState("");
  const [pUser, setPUser] = useState("");
  const [pCountry, setPCountry] = useState("");
  const [pNative, setPNative] = useState("");
  const [pBio, setPBio] = useState("");
  const [learning, setLearning] = useState<LearningLang[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [storyDuration, setStoryDuration] = useState<24 | 48>(24);

  // Timer para refrescar expiración en vivo
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const prof = await getProfile();
    setPName(prof.displayName ?? "");
    setPUser(prof.username ?? "");
    setPCountry(prof.country ?? "");
    setPNative(prof.nativeLang ?? "");
    setPBio((prof as any).bio ?? "");
    setLearning(prof.languageLearning?.learn ?? []);
    setInterests(prof.interests ?? []);
    const now = Date.now();
    // Filtrar historias expiradas al cargar
    const valid = (prof.stories ?? []).filter((s) => !s.expiresAt || s.expiresAt > now);
    setStories(valid);
    setPhotoUri((prof as any).photoUri ?? null);
  }, []);

  // Refresca historias en vivo cada minuto para detectar expiraciones
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > now));
    }, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // También refresca cuando la app vuelve al frente
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        const now = Date.now();
        setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > now));
      }
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const hasBasics = pName.trim().length > 0;
  const initials = pName.trim().slice(0, 2).toUpperCase() || "?";

  const pickProfilePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Permiso necesario",
          "Necesitamos acceso a tu galería para cambiar la foto de perfil.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Error", "No se pudo leer la imagen.");
        return;
      }

      setPhotoUri(asset.uri);
      await updateProfile({ photoUri: asset.uri } as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo actualizar la foto.");
    }
  };

  const addStory = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const expiresAt = Date.now() + storyDuration * 3_600_000;
      await addStoryPhoto(asset.uri, "", expiresAt);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo agregar la historia.");
    }
  };

  const deleteStory = (id: string) => {
    Alert.alert("Eliminar historia", "¿Seguro que querés eliminarla?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          await removeStoryPhoto(id);
          await load();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 64 : 32,
        paddingBottom: 36, paddingHorizontal: 24,
        alignItems: "center",
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        {/* Foto de perfil */}
        <Pressable onPress={pickProfilePhoto} style={{ marginBottom: 4 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            borderWidth: 3, borderColor: colors.accent,
            overflow: "hidden",
            backgroundColor: colors.accent,
            alignItems: "center", justifyContent: "center",
          }}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={{ width: 100, height: 100 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 36, fontWeight: "900" }}>{initials}</Text>
            )}
          </View>
          {/* Badge de edición */}
          <View style={{
            position: "absolute", bottom: 2, right: 2,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: colors.accent,
            borderWidth: 2, borderColor: colors.bg,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 13 }}>📷</Text>
          </View>
        </Pressable>

        <Text style={{
          color: colors.fg, fontSize: 26, fontWeight: "900",
          marginTop: 16, textAlign: "center",
        }}>
          {pName || "Tu perfil"}
        </Text>

        {pUser ? (
          <Text style={{ color: colors.fg, opacity: 0.45, fontWeight: "700", marginTop: 4, fontSize: 14 }}>
            @{pUser}
          </Text>
        ) : null}

        {pCountry ? (
          <Text style={{ color: colors.fg, opacity: 0.45, fontWeight: "700", marginTop: 4, fontSize: 14 }}>
            📍 {pCountry}
          </Text>
        ) : null}

        {pBio ? (
          <Text style={{
            color: colors.fg, opacity: 0.65, fontWeight: "600",
            marginTop: 10, textAlign: "center", lineHeight: 20,
            paddingHorizontal: 16, fontSize: 14,
          }}>
            {pBio}
          </Text>
        ) : null}

        <Pressable
          onPress={() => router.push("/onboarding" as any)}
          style={{
            marginTop: 20, backgroundColor: colors.accent,
            paddingVertical: 13, paddingHorizontal: 36,
            borderRadius: 99,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
            {hasBasics ? "✏️ Editar perfil" : "Completar perfil"}
          </Text>
        </Pressable>
      </View>

      <View style={{ padding: 20, gap: 24 }}>

        {/* ── HISTORIAS ──────────────────────────────────────────────── */}
        <View>
          <View style={{
            flexDirection: "row", alignItems: "center",
            justifyContent: "space-between", marginBottom: 12,
          }}>
            <Text style={{
              color: colors.fg, opacity: 0.5, fontWeight: "800",
              fontSize: 12, letterSpacing: 1,
            }}>
              HISTORIAS
            </Text>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              {HOURS_OPTIONS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setStoryDuration(h)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 5,
                    borderRadius: 99, borderWidth: 1,
                    borderColor: storyDuration === h ? colors.accent : colors.border,
                    backgroundColor: storyDuration === h ? colors.accentSoft : "transparent",
                  }}
                >
                  <Text style={{
                    color: storyDuration === h ? colors.accent : colors.fg,
                    fontWeight: "800", fontSize: 12,
                  }}>
                    {h}h
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={addStory}
                style={{
                  backgroundColor: colors.accent,
                  borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7,
                  marginLeft: 4,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>+ Agregar</Text>
              </Pressable>
            </View>
          </View>

          {stories.length === 0 ? (
            <Pressable
              onPress={addStory}
              style={{
                backgroundColor: colors.card, borderWidth: 1,
                borderColor: colors.border, borderStyle: "dashed",
                borderRadius: 18, padding: 24,
                alignItems: "center", gap: 8,
              }}
            >
              <Text style={{ fontSize: 28 }}>📸</Text>
              <Text style={{ color: colors.fg, opacity: 0.45, fontWeight: "700", fontSize: 13 }}>
                Tocá para agregar una historia ({storyDuration}h)
              </Text>
            </Pressable>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {stories.map((s) => {
                const left = timeLeft(s.expiresAt);
                return (
                  <Pressable
                    key={s.id}
                    onLongPress={() => deleteStory(s.id)}
                    style={{ position: "relative" }}
                  >
                    <Image
                      source={{ uri: s.uri }}
                      style={{
                        width: 90, height: 140, borderRadius: 16,
                        borderWidth: 2, borderColor: colors.accent,
                      }}
                    />
                    {left && (
                      <View style={{
                        position: "absolute", bottom: 8, left: 0, right: 0,
                        alignItems: "center",
                      }}>
                        <View style={{
                          backgroundColor: "rgba(0,0,0,0.65)",
                          borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>{left}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}

              {/* Botón + al final */}
              <Pressable
                onPress={addStory}
                style={{
                  width: 90, height: 140, borderRadius: 16,
                  borderWidth: 2, borderColor: colors.border,
                  borderStyle: "dashed",
                  backgroundColor: colors.card,
                  alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <Text style={{ fontSize: 24 }}>+</Text>
                <Text style={{ color: colors.fg, opacity: 0.45, fontSize: 10, fontWeight: "700" }}>
                  Agregar
                </Text>
              </Pressable>
            </ScrollView>
          )}
          <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 11, fontWeight: "600", marginTop: 8 }}>
            Mantené presionada una historia para eliminarla
          </Text>
        </View>

        {/* ── IDIOMA NATIVO ──────────────────────────────────────────── */}
        {pNative ? (
          <View>
            <Text style={{
              color: colors.fg, opacity: 0.5, fontWeight: "800",
              fontSize: 12, letterSpacing: 1, marginBottom: 10,
            }}>
              IDIOMA NATIVO
            </Text>
            <View style={{
              backgroundColor: colors.card, borderWidth: 1,
              borderColor: colors.border, borderRadius: 16,
              padding: 16, flexDirection: "row",
              alignItems: "center", justifyContent: "space-between",
            }}>
              <Text style={{ color: colors.fg, fontSize: 17, fontWeight: "900" }}>
                {FLAGS[pNative] ?? "🌍"}  {LANG_NAMES[pNative] ?? pNative}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── APRENDIENDO ────────────────────────────────────────────── */}
        <View>
          <Text style={{
            color: colors.fg, opacity: 0.5, fontWeight: "800",
            fontSize: 12, letterSpacing: 1, marginBottom: 10,
          }}>
            APRENDIENDO
          </Text>
          {learning.length === 0 ? (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1,
              borderColor: colors.border, borderRadius: 16, padding: 16,
            }}>
              <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600" }}>
                Elegí idiomas en el onboarding.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {learning.map((l, idx) => (
                <View key={`${l.lang}-${idx}`} style={{
                  backgroundColor: colors.card, borderWidth: 1,
                  borderColor: colors.border, borderRadius: 16,
                  padding: 16, flexDirection: "row",
                  alignItems: "center", justifyContent: "space-between",
                }}>
                  <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "900" }}>
                    {FLAGS[l.lang] ?? "🌍"}  {LANG_NAMES[l.lang] ?? l.lang}
                  </Text>
                  <View style={{
                    backgroundColor: colors.accentSoft, borderWidth: 1,
                    borderColor: colors.accent + "40", borderRadius: 99,
                    paddingHorizontal: 12, paddingVertical: 5,
                  }}>
                    <Text style={{ color: colors.accent, fontWeight: "900", fontSize: 13 }}>
                      {l.level ?? "—"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── INTERESES ──────────────────────────────────────────────── */}
        <View>
          <Text style={{
            color: colors.fg, opacity: 0.5, fontWeight: "800",
            fontSize: 12, letterSpacing: 1, marginBottom: 10,
          }}>
            INTERESES
          </Text>
          {interests.length === 0 ? (
            <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600" }}>
              Sumá intereses en el onboarding.
            </Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {interests.slice(0, 20).map((x) => (
                <View key={x} style={{
                  backgroundColor: colors.card, borderWidth: 1,
                  borderColor: colors.border, borderRadius: 99,
                  paddingHorizontal: 14, paddingVertical: 7,
                }}>
                  <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 13 }}>{x}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

      </View>
    </ScrollView>
  );
}