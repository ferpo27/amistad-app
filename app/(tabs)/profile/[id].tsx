// app/(tabs)/profile/[id].tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView, Text, View, Pressable, Platform,
  Image, ActivityIndicator, Animated, Dimensions,
  AppState, type AppStateStatus, Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import {
  getProfile, updateProfile, addStoryPhoto, removeStoryPhoto,
  type LearningLang, type StoryItem,
} from "@/src/storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  getProfileById, type RemoteProfile,
} from "../../../src/storage/profilesStorage";
import { PROFILES } from "../../../src/mock/profiles";
import { MATCHES } from "../../../src/mock/matches";
 
const _Animated_ViewFixed = (Animated as any).View;
const _Animated_ScrollViewFixed = (Animated as any).ScrollView;
 
const { width: SCREEN_W } = Dimensions.get("window");
 
const FLAGS: Record<string, string> = {
  es: "🇪🇸", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
};
const LANG_NAMES: Record<string, string> = {
  es: "Español", en: "English", de: "Deutsch",
  ja: "日本語", ru: "Русский", zh: "中文",
};
const LEVEL_COLORS: Record<string, string> = {
  A1: "#34C759", A2: "#30D158",
  B1: "#007AFF", B2: "#0A84FF",
  C1: "#AF52DE", C2: "#BF5AF2",
  Beginner: "#34C759", Intermediate: "#007AFF", Advanced: "#AF52DE",
};
const HOURS_OPTIONS: (24 | 48)[] = [24, 48];
 
function timeLeft(expiresAt?: number): string | null {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
 
function StatBadge({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{
      flex: 1, backgroundColor: colors.card,
      borderRadius: 16, borderWidth: 1, borderColor: colors.border,
      padding: 14, alignItems: "center", gap: 4,
    }}>
      <Text style={{ color: colors.fg, fontWeight: "800", fontSize: 18 }}>{value}</Text>
      <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600", fontSize: 11 }}>{label}</Text>
    </View>
  );
}
 
function PublicProfile({ id }: { id: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
 
  const [profile, setProfile] = useState<RemoteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
 
  const avatarScale = scrollY.interpolate({
    inputRange: [-80, 0], outputRange: [1.3, 1], extrapolate: "clamp",
  });
  const avatarOpacity = scrollY.interpolate({
    inputRange: [0, 120], outputRange: [1, 0], extrapolate: "clamp",
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 140], outputRange: [0, 1], extrapolate: "clamp",
  });
 
  useEffect(() => {
    (async () => {
      setLoading(true);
      const remote = await getProfileById(id);
      if (remote && remote.displayName) {
        setProfile(remote);
        setLoading(false);
        return;
      }
      const p = (PROFILES as any[]).find((x) => String(x.id) === id);
      if (p) {
        setProfile({
          id: p.id, displayName: p.name, username: p.username ?? "",
          country: p.country, city: p.city ?? "",
          nativeLang: p.nativeLang, bio: p.bio ?? "",
          interests: p.interests ?? [],
          learning: p.learning ?? [],
          photoUrl: p.photos?.[0] ?? null,
        });
        setLoading(false);
        return;
      }
      const m = (MATCHES as any[]).find((x) => String(x.id) === id);
      if (m) {
        setProfile({
          id: m.id, displayName: m.name, username: "",
          country: m.country, city: "",
          nativeLang: m.nativeLang, bio: m.bio ?? "",
          interests: m.interests ?? [],
          learning: m.learning ?? [],
          photoUrl: m.photos?.[0] ?? null,
        });
      }
      setLoading(false);
    })();
  }, [id]);
 
  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
 
  if (!profile) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Ionicons name="person-outline" size={48} color={colors.fg} style={{ opacity: 0.2 }} />
      <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600", fontSize: 15 }}>Perfil no encontrado</Text>
      <Pressable onPress={() => router.back()} style={{
        paddingHorizontal: 20, paddingVertical: 10,
        backgroundColor: colors.accent, borderRadius: 99,
      }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>Volver</Text>
      </Pressable>
    </View>
  );
 
  const initials = profile.displayName.slice(0, 2).toUpperCase();
  const hasPhoto = !!profile.photoUrl;
 
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
 
      {/* Header flotante */}
      <_Animated_ViewFixed style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
        paddingTop: Platform.OS === "ios" ? 54 : 20,
        paddingBottom: 12, paddingHorizontal: 16,
        backgroundColor: colors.bg,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        flexDirection: "row", alignItems: "center", gap: 10,
        opacity: headerOpacity,
      }}>
        <Pressable onPress={() => router.back()} style={{
          width: 36, height: 36, borderRadius: 18,
          borderWidth: 1, borderColor: colors.border,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="chevron-back" size={20} color={colors.fg} />
        </Pressable>
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: colors.accent, overflow: "hidden",
          alignItems: "center", justifyContent: "center",
        }}>
          {hasPhoto
            ? <Image source={{ uri: profile.photoUrl! }} style={{ width: 32, height: 32 }} />
            : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{initials}</Text>
          }
        </View>
        <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 16, flex: 1 }} numberOfLines={1}>
          {profile.displayName}
        </Text>
      </_Animated_ViewFixed>
 
      <_Animated_ScrollViewFixed
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* HERO */}
        <View style={{ alignItems: "center", paddingBottom: 28 }}>
 
          <View style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 200,
            backgroundColor: colors.accent + "18",
          }} />
 
          <View style={{
            position: "absolute", top: Platform.OS === "ios" ? 54 : 20, left: 16, zIndex: 10,
          }}>
            <Pressable onPress={() => router.back()} style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: colors.bg + "dd",
              borderWidth: 1, borderColor: colors.border,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="chevron-back" size={22} color={colors.fg} />
            </Pressable>
          </View>
 
          <View style={{
            position: "absolute", top: Platform.OS === "ios" ? 54 : 20, right: 16, zIndex: 10,
          }}>
            <Pressable
              onPress={() => setLiked((v) => !v)}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: liked ? "#FF375F" : colors.bg + "dd",
                borderWidth: 1, borderColor: liked ? "#FF375F" : colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={20}
                color={liked ? "#fff" : colors.fg}
              />
            </Pressable>
          </View>
 
          {/* Avatar */}
          <_Animated_ViewFixed style={{
            marginTop: Platform.OS === "ios" ? 110 : 80,
            transform: [{ scale: avatarScale }],
          }}>
            <View style={{
              width: 104, height: 104, borderRadius: 52,
              borderWidth: 3, borderColor: colors.accent,
              overflow: "hidden", backgroundColor: colors.accent,
              alignItems: "center", justifyContent: "center",
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 12,
            }}>
              {hasPhoto
                ? <Image source={{ uri: profile.photoUrl! }} style={{ width: 104, height: 104 }} resizeMode="cover" />
                : <Text style={{ color: "#fff", fontSize: 38, fontWeight: "900" }}>{initials}</Text>
              }
            </View>
          </_Animated_ViewFixed>
 
          <Text style={{
            color: colors.fg, fontSize: 26, fontWeight: "900",
            marginTop: 14, textAlign: "center",
          }}>
            {profile.displayName}
          </Text>
 
          {profile.username ? (
            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 14, marginTop: 2 }}>
              @{profile.username}
            </Text>
          ) : null}
 
          {(profile.city || profile.country) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
              <Ionicons name="location-outline" size={14} color={colors.fg} style={{ opacity: 0.4 }} />
              <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600", fontSize: 13 }}>
                {[profile.city, profile.country].filter(Boolean).join(", ")}
              </Text>
            </View>
          ) : null}
 
          {profile.bio ? (
            <Text style={{
              color: colors.fg, opacity: 0.65, lineHeight: 21,
              marginTop: 12, textAlign: "center", fontSize: 14, fontWeight: "500",
              paddingHorizontal: 32,
            }}>
              {profile.bio}
            </Text>
          ) : null}
 
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20, paddingHorizontal: 24, width: "100%" }}>
            <StatBadge label="Idioma nativo" value={FLAGS[profile.nativeLang] ?? "🌐"} colors={colors} />
            <StatBadge label="Aprendiendo" value={String(profile.learning?.length ?? 0)} colors={colors} />
            <StatBadge label="Intereses" value={String(profile.interests?.length ?? 0)} colors={colors} />
          </View>
        </View>
 
        {/* CTA CHAT */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Pressable
            onPress={() => router.push(`/(tabs)/chat/${profile.id}` as any)}
            style={{
              backgroundColor: colors.accent, paddingVertical: 15,
              borderRadius: 16, flexDirection: "row",
              alignItems: "center", justifyContent: "center", gap: 8,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Chatear con {profile.displayName.split(" ")[0]}
            </Text>
          </Pressable>
        </View>
 
        <View style={{ paddingHorizontal: 20, gap: 20 }}>
 
          {/* IDIOMAS */}
          <Section label="IDIOMAS" colors={colors}>
            <View style={{
              backgroundColor: colors.card, borderRadius: 14,
              borderWidth: 1, borderColor: colors.border,
              padding: 14, flexDirection: "row",
              alignItems: "center", gap: 12,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: colors.accent + "20",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 20 }}>{FLAGS[profile.nativeLang] ?? "🌐"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 15 }}>
                  {LANG_NAMES[profile.nativeLang] ?? profile.nativeLang}
                </Text>
                <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600", fontSize: 12 }}>
                  Idioma nativo
                </Text>
              </View>
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4,
                borderRadius: 99, backgroundColor: "#34C75920",
              }}>
                <Text style={{ color: "#34C759", fontWeight: "700", fontSize: 12 }}>Nativo</Text>
              </View>
            </View>
 
            {(profile.learning ?? []).map((l, i) => {
              const levelColor = LEVEL_COLORS[l.level ?? ""] ?? colors.accent;
              return (
                <View key={i} style={{
                  backgroundColor: colors.card, borderRadius: 14,
                  borderWidth: 1, borderColor: colors.border,
                  padding: 14, flexDirection: "row",
                  alignItems: "center", gap: 12,
                }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: levelColor + "20",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 20 }}>{FLAGS[l.lang] ?? "🌐"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 15 }}>
                      {LANG_NAMES[l.lang] ?? l.lang}
                    </Text>
                    <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600", fontSize: 12 }}>
                      Aprendiendo
                    </Text>
                  </View>
                  {l.level ? (
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4,
                      borderRadius: 99,
                      backgroundColor: levelColor + "20",
                    }}>
                      <Text style={{ color: levelColor, fontWeight: "700", fontSize: 12 }}>{l.level}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Section>
 
          {/* INTERESES */}
          {(profile.interests ?? []).length > 0 && (
            <Section label="INTERESES" colors={colors}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {profile.interests.map((x) => (
                  <View key={x} style={{
                    backgroundColor: colors.card,
                    borderWidth: 1, borderColor: colors.border,
                    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7,
                  }}>
                    <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 13 }}>{x}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}
 
        </View>
      </_Animated_ScrollViewFixed>
 
      {/* BOTTOM BAR */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: colors.bg,
        borderTopWidth: 1, borderTopColor: colors.border,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 28 : 16,
        flexDirection: "row", gap: 10,
      }}>
        <Pressable
          onPress={() => setLiked((v) => !v)}
          style={{
            width: 50, height: 50, borderRadius: 14,
            borderWidth: 1,
            borderColor: liked ? "#FF375F" : colors.border,
            backgroundColor: liked ? "#FF375F15" : colors.card,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={22}
            color={liked ? "#FF375F" : colors.fg}
          />
        </Pressable>
 
        <Pressable
          onPress={() => router.push(`/(tabs)/chat/${profile.id}` as any)}
          style={{
            flex: 1, height: 50, borderRadius: 14,
            backgroundColor: colors.accent,
            flexDirection: "row", alignItems: "center",
            justifyContent: "center", gap: 8,
          }}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
            Enviar mensaje
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
 
function Section({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{
        color: colors.fg, opacity: 0.4, fontWeight: "800",
        fontSize: 11, letterSpacing: 1.2,
      }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
 
function MyProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
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
    const valid = (prof.stories ?? []).filter((s) => !s.expiresAt || s.expiresAt > now);
    setStories(valid);
    setPhotoUri((prof as any).photoUri ?? null);
  }, []);
 
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > now));
    }, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
 
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
        Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
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
        allowsEditing: true, aspect: [9, 16], quality: 0.85,
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
      { text: "Eliminar", style: "destructive", onPress: async () => { await removeStoryPhoto(id); await load(); } },
    ]);
  };
 
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <View style={{
        paddingTop: Platform.OS === "ios" ? 64 : 32,
        paddingBottom: 32, paddingHorizontal: 24,
        alignItems: "center",
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={pickProfilePhoto} style={{ marginBottom: 4 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            borderWidth: 3, borderColor: colors.accent,
            overflow: "hidden", backgroundColor: colors.accent,
            alignItems: "center", justifyContent: "center",
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 14, elevation: 10,
          }}>
            {photoUri
              ? <Image source={{ uri: photoUri }} style={{ width: 100, height: 100 }} resizeMode="cover" />
              : <Text style={{ color: "#fff", fontSize: 36, fontWeight: "900" }}>{initials}</Text>
            }
          </View>
          <View style={{
            position: "absolute", bottom: 2, right: 2,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: colors.accent,
            borderWidth: 2, borderColor: colors.bg,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
 
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: "900", marginTop: 14, textAlign: "center" }}>
          {pName || "Tu perfil"}
        </Text>
        {pUser ? <Text style={{ color: colors.accent, fontWeight: "700", marginTop: 3, fontSize: 14 }}>@{pUser}</Text> : null}
        {pCountry ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
            <Ionicons name="location-outline" size={13} color={colors.fg} style={{ opacity: 0.4 }} />
            <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "600", fontSize: 13 }}>{pCountry}</Text>
          </View>
        ) : null}
        {pBio ? (
          <Text style={{
            color: colors.fg, opacity: 0.6, fontWeight: "500",
            marginTop: 10, textAlign: "center", lineHeight: 20, fontSize: 14, paddingHorizontal: 16,
          }}>
            {pBio}
          </Text>
        ) : null}
 
        <Pressable
          onPress={() => router.push("/onboarding" as any)}
          style={{
            marginTop: 20, flexDirection: "row", gap: 6,
            backgroundColor: colors.accent, paddingVertical: 12,
            paddingHorizontal: 28, borderRadius: 99,
            alignItems: "center",
          }}
        >
          <Ionicons name={hasBasics ? "pencil" : "person-add"} size={15} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
            {hasBasics ? "Editar perfil" : "Completar perfil"}
          </Text>
        </Pressable>
      </View>
 
      <View style={{ padding: 20, gap: 24 }}>
 
        {/* HISTORIAS */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: "800", fontSize: 11, letterSpacing: 1.2 }}>
              HISTORIAS
            </Text>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              {HOURS_OPTIONS.map((h) => (
                <Pressable key={h} onPress={() => setStoryDuration(h)} style={{
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
                  borderWidth: 1,
                  borderColor: storyDuration === h ? colors.accent : colors.border,
                  backgroundColor: storyDuration === h ? colors.accentSoft : "transparent",
                }}>
                  <Text style={{
                    color: storyDuration === h ? colors.accent : colors.fg,
                    fontWeight: "700", fontSize: 11,
                  }}>{h}h</Text>
                </Pressable>
              ))}
              <Pressable onPress={addStory} style={{
                backgroundColor: colors.accent, borderRadius: 99,
                paddingHorizontal: 12, paddingVertical: 5, marginLeft: 2,
              }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>+ Agregar</Text>
              </Pressable>
            </View>
          </View>
 
          {stories.length === 0 ? (
            <Pressable onPress={addStory} style={{
              backgroundColor: colors.card, borderWidth: 1,
              borderColor: colors.border, borderStyle: "dashed",
              borderRadius: 16, padding: 24, alignItems: "center", gap: 8,
            }}>
              <Ionicons name="images-outline" size={28} color={colors.fg} style={{ opacity: 0.25 }} />
              <Text style={{ color: colors.fg, opacity: 0.35, fontWeight: "600", fontSize: 13 }}>
                Tocá para agregar una historia ({storyDuration}h)
              </Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {stories.map((s) => {
                const left = timeLeft(s.expiresAt);
                return (
                  <Pressable key={s.id} onLongPress={() => deleteStory(s.id)}>
                    <Image source={{ uri: s.uri }} style={{
                      width: 90, height: 140, borderRadius: 14,
                      borderWidth: 2, borderColor: colors.accent,
                    }} />
                    {left && (
                      <View style={{
                        position: "absolute", bottom: 8, left: 0, right: 0, alignItems: "center",
                      }}>
                        <View style={{
                          backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 99,
                          paddingHorizontal: 7, paddingVertical: 3,
                        }}>
                          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{left}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              <Pressable onPress={addStory} style={{
                width: 90, height: 140, borderRadius: 14,
                borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed",
                backgroundColor: colors.card, alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <Ionicons name="add" size={24} color={colors.fg} style={{ opacity: 0.3 }} />
                <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 10, fontWeight: "700" }}>Agregar</Text>
              </Pressable>
            </ScrollView>
          )}
          <Text style={{ color: colors.fg, opacity: 0.25, fontSize: 11, fontWeight: "500" }}>
            Mantenés presionada para eliminar
          </Text>
        </View>
 
        {/* IDIOMA NATIVO */}
        {pNative ? (
          <Section label="IDIOMA NATIVO" colors={colors}>
            <View style={{
              backgroundColor: colors.card, borderWidth: 1,
              borderColor: colors.border, borderRadius: 14, padding: 14,
              flexDirection: "row", alignItems: "center", gap: 12,
            }}>
              <Text style={{ fontSize: 22 }}>{FLAGS[pNative] ?? "🌐"}</Text>
              <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 16 }}>
                {LANG_NAMES[pNative] ?? pNative}
              </Text>
            </View>
          </Section>
        ) : null}
 
        {/* APRENDIENDO */}
        <Section label="APRENDIENDO" colors={colors}>
          {learning.length === 0 ? (
            <View style={{
              backgroundColor: colors.card, borderWidth: 1,
              borderColor: colors.border, borderRadius: 14, padding: 16,
            }}>
              <Text style={{ color: colors.fg, opacity: 0.35, fontWeight: "500" }}>
                Elegí idiomas en el onboarding.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {learning.map((l, idx) => {
                const lc = LEVEL_COLORS[l.level ?? ""] ?? colors.accent;
                return (
                  <View key={`${l.lang}-${idx}`} style={{
                    backgroundColor: colors.card, borderWidth: 1,
                    borderColor: colors.border, borderRadius: 14, padding: 14,
                    flexDirection: "row", alignItems: "center", gap: 12,
                  }}>
                    <Text style={{ fontSize: 22 }}>{FLAGS[l.lang] ?? "🌐"}</Text>
                    <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 15, flex: 1 }}>
                      {LANG_NAMES[l.lang] ?? l.lang}
                    </Text>
                    {l.level ? (
                      <View style={{
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
                        backgroundColor: lc + "20",
                      }}>
                        <Text style={{ color: lc, fontWeight: "800", fontSize: 12 }}>{l.level}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </Section>
 
        {/* INTERESES */}
        <Section label="INTERESES" colors={colors}>
          {interests.length === 0 ? (
            <Text style={{ color: colors.fg, opacity: 0.35, fontWeight: "500" }}>
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
                  <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 13 }}>{x}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>
 
      </View>
    </ScrollView>
  );
}
 
export default function ProfileRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (id) return <PublicProfile id={id} />;
  return <MyProfileScreen />;
}
 