// app/(tabs)/profile.tsx
import React, { useCallback, useState } from "react";
import {
  ScrollView, Text, View, Pressable, Platform,
  Image, Alert,
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
  es: "Español", en: "English", de: "Deutsch",
  ja: "日本語", ru: "Русский", zh: "中文",
};

const HOURS_OPTIONS: (24 | 48)[] = [24, 48];

function timeLeft(expiresAt?: number): string | null {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expirada";
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
    const validStories = (prof.stories ?? []).filter(
      (s) => !s.expiresAt || s.expiresAt > now
    );
    setStories(validStories);
    setPhotoUri((prof as any).photoUri ?? null);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const hasBasics = pName.trim().length > 0;
  const initials = pName.trim().slice(0, 2).toUpperCase() || "?";

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await updateProfile({ photoUri: uri } as any);
    }
  };

  const addStory = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const expiresAt = Date.now() + storyDuration * 3600000;
      await addStoryPhoto(uri, "", expiresAt);
      load();
    }
  };

  const deleteStory = async (id: string) => {
    Alert.alert("Eliminar historia", "¿Seguro que querés eliminarla?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => { await removeStoryPhoto(id); load(); },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* HERO */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 60 : 30,
        paddingBottom: 32, paddingHorizontal: 24,
        alignItems: "center",
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        {/* Foto de perfil */}
        <Pressable onPress={pickProfilePhoto}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{ width: 90, height: 90, borderRadius: 45 }}
            />
          ) : (
            <View style={{
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: colors.accent,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900" }}>{initials}</Text>
            </View>
          )}
          <View style={{
            position: "absolute", bottom: 0, right: 0,
            backgroundColor: colors.card, borderRadius: 99,
            borderWidth: 1, borderColor: colors.border,
            width: 28, height: 28, alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 14 }}>✎</Text>
          </View>
        </Pressable>

        <Text style={{ color: colors.fg, fontSize: 24, fontWeight: "900", marginTop: 14, textAlign: "center" }}>
          {pName || "Tu perfil"}
        </Text>
        {pUser ? (
          <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", marginTop: 4 }}>@{pUser}</Text>
        ) : null}
        {pCountry ? (
          <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", marginTop: 4 }}>📍 {pCountry}</Text>
        ) : null}
        {pBio ? (
          <Text style={{ color: colors.fg, opacity: 0.7, fontWeight: "700", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
            {pBio}
          </Text>
        ) : null}

        <Pressable
          onPress={() => router.push("/onboarding" as any)}
          style={{
            marginTop: 18, backgroundColor: colors.accent,
            paddingVertical: 12, paddingHorizontal: 32, borderRadius: 99,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
            {hasBasics ? "Editar perfil" : "Completar perfil"}
          </Text>
        </Pressable>
      </View>

      <View style={{ padding: 20, gap: 20 }}>
        {/* HISTORIAS */}
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>
              HISTORIAS
            </Text>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              {HOURS_OPTIONS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setStoryDuration(h)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
                    borderWidth: 1,
                    borderColor: storyDuration === h ? colors.accent : colors.border,
                    backgroundColor: storyDuration === h ? colors.accentSoft : "transparent",
                  }}
                >
                  <Text style={{ color: storyDuration === h ? colors.accent : colors.fg, fontWeight: "900", fontSize: 12 }}>
                    {h}h
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={addStory}
                style={{
                  backgroundColor: colors.accent, borderRadius: 99,
                  paddingHorizontal: 12, paddingVertical: 6, marginLeft: 4,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>+ Agregar</Text>
              </Pressable>
            </View>
          </View>

          {stories.length === 0 ? (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              borderRadius: 18, padding: 20, alignItems: "center",
            }}>
              <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "700" }}>
                No tenés historias activas. Duran {storyDuration}h.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {stories.map((s) => {
                const left = timeLeft(s.expiresAt);
                return (
                  <Pressable key={s.id} onLongPress={() => deleteStory(s.id)}>
                    <Image
                      source={{ uri: s.uri }}
                      style={{ width: 80, height: 120, borderRadius: 14 }}
                    />
                    {left && (
                      <View style={{
                        position: "absolute", bottom: 6, left: 0, right: 0,
                        alignItems: "center",
                      }}>
                        <View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>{left}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* IDIOMA NATIVO */}
        {pNative ? (
          <View>
            <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
              IDIOMA NATIVO
            </Text>
            <View style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14,
            }}>
              <Text style={{ fontSize: 28 }}>{FLAGS[pNative] ?? "🌐"}</Text>
              <View>
                <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 17 }}>
                  {LANG_NAMES[pNative] ?? pNative.toUpperCase()}
                </Text>
                <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "700", marginTop: 2 }}>Hablante nativo</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* APRENDIENDO */}
        <View>
          <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
            APRENDIENDO
          </Text>
          <View style={{
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
            borderRadius: 18, overflow: "hidden",
          }}>
            {learning.length === 0 ? (
              <Pressable
                onPress={() => router.push("/onboarding" as any)}
                style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Text style={{ color: colors.fg, opacity: 0.6, fontWeight: "700" }}>
                  Agregá idiomas que aprendés
                </Text>
              </Pressable>
            ) : (
              learning.map((l, i) => (
                <View key={l.lang} style={{
                  flexDirection: "row", alignItems: "center", padding: 16,
                  borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
                }}>
                  <Text style={{ fontSize: 26, marginRight: 14 }}>{FLAGS[l.lang] ?? "🌐"}</Text>
                  <Text style={{ color: colors.fg, fontWeight: "900", fontSize: 16, flex: 1 }}>
                    {LANG_NAMES[l.lang] ?? l.lang.toUpperCase()}
                  </Text>
                  <View style={{
                    backgroundColor: colors.accentSoft, paddingVertical: 4,
                    paddingHorizontal: 12, borderRadius: 99,
                  }}>
                    <Text style={{ color: colors.accent, fontWeight: "900", fontSize: 13 }}>
                      {l.level ?? "—"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* INTERESES */}
        {interests.length > 0 && (
          <View>
            <Text style={{ color: colors.fg, opacity: 0.5, fontWeight: "800", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
              INTERESES
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {interests.map((item) => (
                <View key={item} style={{
                  paddingVertical: 8, paddingHorizontal: 14,
                  borderRadius: 99, backgroundColor: colors.card,
                  borderWidth: 1, borderColor: colors.border,
                }}>
                  <Text style={{ color: colors.fg, fontWeight: "800", fontSize: 14 }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}