// app/(tabs)/profile/[id].tsx
//
// ══════════════════════════════════════════════════════════════════════════════
// PERFIL DUAL — Mi perfil (editable) o Perfil público (solo lectura)
//
// FIXES vs versión anterior:
//   - useTheme → useAppTheme (single source of truth)
//   - likes table: liker_id/liked_id → from_user_id/to_user_id (schema real)
//   - getProfileById devuelve PublicProfileData, no RemoteProfile
//   - MyProfileScreen usa profilesStorage (updateProfile, addStoryPhoto, etc.)
//     en lugar de storage.ts directo — elimina la desincronización
//   - Chat URL: router.push(`/chat/${buildConversationId(myId, friendId)}`)
//     en lugar de `/chat/${friendId}` (conversationId canónico)
//   - Sin console.log en producción
// ══════════════════════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../../src/lib/supabase';
import { useAppTheme } from '../../../src/theme';
import type { LearningLang, StoryItem } from '../../../src/storage';
import {
  getProfile,
  updateProfile,
  addStoryPhoto,
  removeStoryPhoto,
  refreshProfile,
  getProfileById,
  type PublicProfileData,
} from '../../../src/storage/profilesStorage';
import { calculateCompatibility } from '../../../src/matching/calculateCompatibility';
import SafetyButton from '../../../src/components/SafetyButton';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const FLAGS: Record<string, string> = {
  es: '🇦🇷', en: '🇺🇸', de: '🇩🇪',
  ja: '🇯🇵', ru: '🇷🇺', zh: '🇨🇳',
};

const LANG_NAMES: Record<string, string> = {
  es: 'Español', en: 'English',  de: 'Deutsch',
  ja: '日本語',   ru: 'Русский', zh: '中文',
};

const LEVEL_COLORS: Record<string, string> = {
  A1: '#34C759', A2: '#30D158',
  B1: '#007AFF', B2: '#0A84FF',
  C1: '#AF52DE', C2: '#BF5AF2',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** conversationId canónico: menor UUID primero. Debe coincidir con buildConversationId.ts */
function buildConversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

function timeLeft(expiresAt?: number): string | null {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES COMPARTIDOS
// ─────────────────────────────────────────────────────────────────────────────

function CompatibilityRing({
  score,
  colors,
}: {
  score:  number;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  const pct   = Math.round(Math.min(100, Math.max(0, score * 100)));
  const color = pct >= 70 ? '#34C759' : pct >= 40 ? colors.accent : colors.subtext;

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View
        style={{
          width:          60,
          height:         60,
          borderRadius:   30,
          borderWidth:    3,
          borderColor:    color,
          backgroundColor: color + '18',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color, fontWeight: '900', fontSize: 18 }}>{pct}%</Text>
      </View>
      <Text style={{ color: colors.subtext, fontSize: 11, fontWeight: '700' }}>
        compatibles
      </Text>
    </View>
  );
}

function StatBadge({
  label,
  value,
  colors,
}: {
  label:  string;
  value:  string;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View
      style={{
        flex:           1,
        backgroundColor: colors.card,
        borderRadius:   16,
        borderWidth:    1,
        borderColor:    colors.border,
        padding:        14,
        alignItems:     'center',
        gap:            4,
      }}
    >
      <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 18 }}>{value}</Text>
      <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: '600', fontSize: 11, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

function Section({
  label,
  children,
  colors,
}: {
  label:    string;
  children: React.ReactNode;
  colors:   ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: '800', fontSize: 11, letterSpacing: 1.2 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function LangRow({
  lang,
  level,
  label,
  colors,
}: {
  lang:   string;
  level?: string | null;
  label:  string;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  const levelColor = (level && LEVEL_COLORS[level]) ?? colors.accent;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius:    14,
        borderWidth:     1,
        borderColor:     colors.border,
        padding:         14,
        flexDirection:   'row',
        alignItems:      'center',
        gap:             12,
      }}
    >
      <View
        style={{
          width:          42,
          height:         42,
          borderRadius:   21,
          backgroundColor: levelColor + '20',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22 }}>{FLAGS[lang] ?? '🌐'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 15 }}>
          {LANG_NAMES[lang] ?? lang}
        </Text>
        <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 12, marginTop: 1 }}>
          {label}
        </Text>
      </View>
      {level && level !== 'Nativo' ? (
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: levelColor + '20' }}>
          <Text style={{ color: levelColor, fontWeight: '800', fontSize: 12 }}>{level}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA PÚBLICA DEL PERFIL (otro usuario)
// ─────────────────────────────────────────────────────────────────────────────

function PublicProfileScreen({ friendId }: { friendId: string }) {
  const router     = useRouter();
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const insets     = useSafeAreaInsets();
  const scrollY    = useRef(new Animated.Value(0)).current;

  const [profile,     setProfile]     = useState<PublicProfileData | null>(null);
  const [myProfile,   setMyProfile]   = useState<any>(null);
  const [myUserId,    setMyUserId]    = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [liked,       setLiked]       = useState(false);
  const [likeSending, setLikeSending] = useState(false);

  // Animaciones del scroll
  const headerOpacity = scrollY.interpolate({
    inputRange:  [80, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const avatarScale = scrollY.interpolate({
    inputRange:  [-80, 0],
    outputRange: [1.25, 1],
    extrapolate: 'clamp',
  });

  const compatibilityScore = useMemo(() => {
    if (!myProfile || !profile) return 0;
    const me = {
      interests:  myProfile.interests ?? [],
      nativeLang: myProfile.nativeLang,
      learning:   (myProfile.languageLearning?.learn ?? []).map(
        (x: LearningLang) => x.lang,
      ),
    };
    const them = {
      id:         profile.id,
      name:       profile.displayName,
      nativeLang: profile.nativeLang as any,
      learning:   (profile.languageLearning?.learn ?? []).map((l) => ({
        lang:  l.lang as any,
        level: l.level,
      })),
      interests: profile.interests,
    };
    return calculateCompatibility(me, them);
  }, [myProfile, profile]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const [remote, myProf, { data: sessionData }] = await Promise.all([
        getProfileById(friendId),
        getProfile(),
        supabase.auth.getSession(),
      ]);

      if (!mounted) return;

      if (remote) setProfile(remote);
      setMyProfile(myProf);

      const myId = sessionData?.session?.user.id ?? null;
      setMyUserId(myId);

      if (myId) {
        const { data: likeRow } = await supabase
          .from('likes')
          .select('id')
          .eq('from_user_id', myId)
          .eq('to_user_id', friendId)
          .maybeSingle();

        if (mounted && likeRow) setLiked(true);
      }

      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [friendId]);

  const toggleLike = useCallback(async () => {
    if (likeSending || !myUserId) return;

    setLikeSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newLiked = !liked;
    setLiked(newLiked); // optimistic

    try {
      if (liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('from_user_id', myUserId)
          .eq('to_user_id', friendId);
      } else {
        await supabase
          .from('likes')
          .upsert(
            {
              from_user_id: myUserId,
              to_user_id:   friendId,
              created_at:   new Date().toISOString(),
            },
            { onConflict: 'from_user_id,to_user_id' },
          );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setLiked(liked); // revertir
    } finally {
      setLikeSending(false);
    }
  }, [liked, likeSending, friendId, myUserId]);

  const goToChat = useCallback(() => {
    if (!myUserId) return;
    const conversationId = buildConversationId(myUserId, friendId);
    router.push(`/chat/${conversationId}` as any);
  }, [myUserId, friendId, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Ionicons name="person-outline" size={52} color={colors.fg} style={{ opacity: 0.2 }} />
        <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 15 }}>
          Perfil no encontrado
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 22, paddingVertical: 10 }}
          accessibilityRole="button"
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = profile.displayName.slice(0, 2).toUpperCase();
  const hasPhoto  = !!profile.photoUri;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Sticky header (aparece al scrollear) */}
      <Animated.View
        style={{
          position:          'absolute',
          top: 0, left: 0, right: 0,
          zIndex:            50,
          paddingTop:        insets.top + 8,
          paddingBottom:     12,
          paddingHorizontal: 16,
          backgroundColor:   colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection:     'row',
          alignItems:        'center',
          gap:               10,
          opacity:           headerOpacity,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </TouchableOpacity>
        <View
          style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: colors.accent,
            overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {hasPhoto ? (
            <Image source={{ uri: profile.photoUri! }} style={{ width: 32, height: 32 }} />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{initials}</Text>
          )}
        </View>
        <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16, flex: 1 }} numberOfLines={1}>
          {profile.displayName}
        </Text>
        <SafetyButton
          reportedUserId={profile.id}
          reportedUsername={profile.displayName}
          variant="icon"
          iconSize={20}
        />
      </Animated.View>

      {/* Scroll principal */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* HERO */}
        <View style={{ alignItems: 'center', paddingBottom: 28 }}>

          {/* Fondo degradado */}
          <View
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 220, backgroundColor: colors.accent + '14',
            }}
          />

          {/* Botón volver */}
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16, zIndex: 10 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: colors.bg + 'ee',
                borderWidth: 1, borderColor: colors.border,
                alignItems: 'center', justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="chevron-back" size={22} color={colors.fg} />
            </TouchableOpacity>
          </View>

          {/* Botones top-right */}
          <View
            style={{
              position: 'absolute', top: insets.top + 8, right: 16,
              zIndex: 10, flexDirection: 'row', gap: 8,
            }}
          >
            <SafetyButton
              reportedUserId={profile.id}
              reportedUsername={profile.displayName}
              variant="icon"
              iconSize={18}
            />
            <TouchableOpacity
              onPress={toggleLike}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: liked ? '#FF375F' : colors.bg + 'ee',
                borderWidth: 1, borderColor: liked ? '#FF375F' : colors.border,
                alignItems: 'center', justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Quitar like' : 'Dar like'}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? '#fff' : colors.fg}
              />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <Animated.View style={{ marginTop: insets.top + 80, transform: [{ scale: avatarScale }] }}>
            <View
              style={{
                width: 108, height: 108, borderRadius: 54,
                borderWidth: 3, borderColor: colors.accent,
                overflow: 'hidden', backgroundColor: colors.accent,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
              }}
            >
              {hasPhoto ? (
                <Image source={{ uri: profile.photoUri! }} style={{ width: 108, height: 108 }} resizeMode="cover" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900' }}>{initials}</Text>
              )}
            </View>
          </Animated.View>

          <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '900', marginTop: 14, textAlign: 'center' }}>
            {profile.displayName}
          </Text>

          {profile.username ? (
            <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14, marginTop: 3 }}>
              @{profile.username}
            </Text>
          ) : null}

          {(profile.city ?? profile.country) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="location-outline" size={13} color={colors.subtext} />
              <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 13 }}>
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}

          {profile.bio ? (
            <Text
              style={{
                color: colors.fg, opacity: 0.65, lineHeight: 21,
                marginTop: 12, textAlign: 'center', fontSize: 14,
                fontWeight: '500', paddingHorizontal: 32,
              }}
            >
              {profile.bio}
            </Text>
          ) : null}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, paddingHorizontal: 24, width: '100%' }}>
            <StatBadge
              label="Nativo"
              value={FLAGS[profile.nativeLang ?? ''] ?? '🌐'}
              colors={colors}
            />
            <StatBadge
              label="Aprendiendo"
              value={String(profile.languageLearning?.learn?.length ?? 0)}
              colors={colors}
            />
            <StatBadge
              label="Intereses"
              value={String(profile.interests?.length ?? 0)}
              colors={colors}
            />
            <CompatibilityRing score={compatibilityScore} colors={colors} />
          </View>
        </View>

        {/* CTA chat */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <TouchableOpacity
            onPress={goToChat}
            style={{
              backgroundColor: colors.accent, paddingVertical: 15,
              borderRadius: 16, flexDirection: 'row',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
            }}
            accessibilityRole="button"
            accessibilityLabel={`Chatear con ${profile.displayName}`}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>
              Chatear con {profile.displayName.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 24 }}>

          {/* Idiomas */}
          <Section label="IDIOMAS" colors={colors}>
            {profile.nativeLang ? (
              <LangRow lang={profile.nativeLang} level="Nativo" label="Idioma nativo" colors={colors} />
            ) : null}
            {(profile.languageLearning?.learn ?? []).map((l, i) => (
              <LangRow
                key={`${l.lang}_${i}`}
                lang={l.lang}
                level={l.level}
                label="Aprendiendo"
                colors={colors}
              />
            ))}
          </Section>

          {/* Intereses */}
          {(profile.interests ?? []).length > 0 ? (
            <Section label="INTERESES" colors={colors}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.interests.map((x) => (
                  <View
                    key={x}
                    style={{
                      backgroundColor: colors.card, borderWidth: 1,
                      borderColor: colors.border, borderRadius: 99,
                      paddingHorizontal: 14, paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: colors.fg, fontWeight: '600', fontSize: 13 }}>{x}</Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {/* Reporte */}
          <View
            style={{
              borderTopWidth: 1, borderTopColor: colors.border,
              paddingTop: 20, flexDirection: 'row',
              alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '500' }}>
              ¿Algo está mal con este perfil?
            </Text>
            <SafetyButton
              reportedUserId={profile.id}
              reportedUsername={profile.displayName}
              variant="full"
              iconSize={16}
            />
          </View>

        </View>
      </Animated.ScrollView>

      {/* Bottom action bar */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: colors.bg,
          borderTopWidth: 1, borderTopColor: colors.border,
          paddingHorizontal: 20, paddingTop: 12,
          paddingBottom: insets.bottom + 10,
          flexDirection: 'row', gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={toggleLike}
          style={{
            width: 50, height: 50, borderRadius: 14,
            borderWidth: 1,
            borderColor:     liked ? '#FF375F' : colors.border,
            backgroundColor: liked ? '#FF375F15' : colors.card,
            alignItems: 'center', justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Quitar like' : 'Dar like'}
        >
          {likeSending ? (
            <ActivityIndicator size="small" color="#FF375F" />
          ) : (
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? '#FF375F' : colors.fg}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToChat}
          style={{
            flex: 1, height: 50, borderRadius: 14,
            backgroundColor: colors.accent,
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 8,
          }}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Enviar mensaje</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MI PERFIL (editable)
// ─────────────────────────────────────────────────────────────────────────────

function MyProfileScreen() {
  const router     = useRouter();
  const { colors } = useAppTheme();
  const insets     = useSafeAreaInsets();
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pName,         setPName]         = useState('');
  const [pUser,         setPUser]         = useState('');
  const [pCountry,      setPCountry]      = useState('');
  const [pNative,       setPNative]       = useState('');
  const [pBio,          setPBio]          = useState('');
  const [learning,      setLearning]      = useState<LearningLang[]>([]);
  const [interests,     setInterests]     = useState<string[]>([]);
  const [stories,       setStories]       = useState<StoryItem[]>([]);
  const [photoUri,      setPhotoUri]      = useState<string | null>(null);
  const [storyDuration, setStoryDuration] = useState<24 | 48>(24);

  const load = useCallback(async () => {
    // refreshProfile fuerza re-fetch desde Supabase
    const prof = await refreshProfile();
    const now  = Date.now();

    setPName(prof.displayName ?? '');
    setPUser(prof.username ?? '');
    setPCountry(prof.country ?? '');
    setPNative(prof.nativeLang ?? '');
    setPBio(prof.bio ?? '');
    setLearning(prof.languageLearning?.learn ?? []);
    setInterests(prof.interests ?? []);
    setStories((prof.stories ?? []).filter((s) => !s.expiresAt || s.expiresAt > now));
    setPhotoUri(prof.photoUri ?? null);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > now));
    }, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const now = Date.now();
        setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > now));
      }
    });
    return () => sub.remove();
  }, []);

  const pickProfilePhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.85,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;
      setPhotoUri(uri); // optimistic
      await updateProfile({ photoUri: uri } as any);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar la foto.';
      Alert.alert('Error', msg);
    }
  }, []);

  const handleAddStory = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [9, 16], quality: 0.85,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;
      const expiresAt = Date.now() + storyDuration * 3_600_000;
      await addStoryPhoto(uri, '', expiresAt);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo agregar la historia.';
      Alert.alert('Error', msg);
    }
  }, [storyDuration, load]);

  const confirmDeleteStory = useCallback((id: string) => {
    Alert.alert('Eliminar historia', '¿Seguro que querés eliminarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => { await removeStoryPhoto(id); await load(); },
      },
    ]);
  }, [load]);

  const hasBasics = pName.trim().length > 0;
  const initials  = pName.trim().slice(0, 2).toUpperCase() || '?';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <View
        style={{
          paddingTop:        insets.top + 20,
          paddingBottom:     32,
          paddingHorizontal: 24,
          alignItems:        'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={pickProfilePhoto} style={{ marginBottom: 4 }}>
          <View
            style={{
              width: 100, height: 100, borderRadius: 50,
              borderWidth: 3, borderColor: colors.accent,
              overflow: 'hidden', backgroundColor: colors.accent,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: colors.accent, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 14, elevation: 10,
            }}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 100, height: 100 }} resizeMode="cover" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900' }}>{initials}</Text>
            )}
          </View>
          <View
            style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bg,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>

        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '900', marginTop: 14, textAlign: 'center' }}>
          {pName || 'Tu perfil'}
        </Text>
        {pUser ? (
          <Text style={{ color: colors.accent, fontWeight: '700', marginTop: 3, fontSize: 14 }}>@{pUser}</Text>
        ) : null}
        {pCountry ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
            <Ionicons name="location-outline" size={13} color={colors.subtext} />
            <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 13 }}>{pCountry}</Text>
          </View>
        ) : null}
        {pBio ? (
          <Text style={{ color: colors.fg, opacity: 0.6, fontWeight: '500', marginTop: 10, textAlign: 'center', lineHeight: 20, fontSize: 14, paddingHorizontal: 16 }}>
            {pBio}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={() => router.push('/onboarding' as any)}
          style={{
            marginTop: 20, flexDirection: 'row', gap: 6,
            backgroundColor: colors.accent, paddingVertical: 12,
            paddingHorizontal: 28, borderRadius: 99, alignItems: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={hasBasics ? 'Editar perfil' : 'Completar perfil'}
        >
          <Ionicons name={hasBasics ? 'pencil' : 'person-add'} size={15} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
            {hasBasics ? 'Editar perfil' : 'Completar perfil'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 20, gap: 26 }}>

        {/* HISTORIAS */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.subtext, fontWeight: '800', fontSize: 11, letterSpacing: 1.2 }}>
              HISTORIAS
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {([24, 48] as const).map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setStoryDuration(h)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1,
                    borderColor:     storyDuration === h ? colors.accent : colors.border,
                    backgroundColor: storyDuration === h ? colors.accentSoft : 'transparent',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Duración ${h} horas`}
                >
                  <Text style={{ color: storyDuration === h ? colors.accent : colors.subtext, fontWeight: '700', fontSize: 11 }}>
                    {h}h
                  </Text>
                </Pressable>
              ))}
              <TouchableOpacity
                onPress={handleAddStory}
                style={{ backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 2 }}
                accessibilityRole="button"
                accessibilityLabel="Agregar historia"
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>+ Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {stories.length === 0 ? (
            <Pressable
              onPress={handleAddStory}
              style={{
                backgroundColor: colors.card, borderWidth: 1,
                borderColor: colors.border, borderStyle: 'dashed',
                borderRadius: 16, padding: 24, alignItems: 'center', gap: 8,
              }}
              accessibilityRole="button"
            >
              <Ionicons name="images-outline" size={28} color={colors.fg} style={{ opacity: 0.25 }} />
              <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 13 }}>
                Tocá para agregar una historia ({storyDuration}h)
              </Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {stories.map((s) => {
                const left = timeLeft(s.expiresAt);
                return (
                  <Pressable key={s.id} onLongPress={() => confirmDeleteStory(s.id)}>
                    <Image
                      source={{ uri: s.uri }}
                      style={{ width: 90, height: 140, borderRadius: 14, borderWidth: 2, borderColor: colors.accent }}
                    />
                    {left ? (
                      <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{left}</Text>
                        </View>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              <Pressable
                onPress={handleAddStory}
                style={{
                  width: 90, height: 140, borderRadius: 14,
                  borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
                  backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={24} color={colors.fg} style={{ opacity: 0.3 }} />
                <Text style={{ color: colors.subtext, fontSize: 10, fontWeight: '700' }}>Agregar</Text>
              </Pressable>
            </ScrollView>
          )}
          <Text style={{ color: colors.subtext, fontSize: 11, fontWeight: '500', opacity: 0.6 }}>
            Mantené presionado para eliminar
          </Text>
        </View>

        {/* IDIOMA NATIVO */}
        {pNative ? (
          <Section label="IDIOMA NATIVO" colors={colors}>
            <LangRow lang={pNative} level={null} label="Tu idioma nativo" colors={colors} />
          </Section>
        ) : null}

        {/* APRENDIENDO */}
        <Section label="APRENDIENDO" colors={colors}>
          {learning.length === 0 ? (
            <Pressable
              onPress={() => router.push('/onboarding' as any)}
              style={{
                backgroundColor: colors.card, borderWidth: 1,
                borderColor: colors.border, borderRadius: 14,
                padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
              }}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
              <Text style={{ color: colors.subtext, fontWeight: '500', fontSize: 14 }}>
                Elegí idiomas en el onboarding
              </Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              {learning.map((l, idx) => (
                <LangRow key={`${l.lang}-${idx}`} lang={l.lang} level={l.level} label="Aprendiendo" colors={colors} />
              ))}
            </View>
          )}
        </Section>

        {/* INTERESES */}
        <Section label="INTERESES" colors={colors}>
          {interests.length === 0 ? (
            <Pressable
              onPress={() => router.push('/onboarding' as any)}
              style={{
                backgroundColor: colors.card, borderWidth: 1,
                borderColor: colors.border, borderRadius: 14,
                padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
              }}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
              <Text style={{ color: colors.subtext, fontWeight: '500', fontSize: 14 }}>
                Sumá intereses en el onboarding
              </Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {interests.slice(0, 20).map((x) => (
                <View
                  key={x}
                  style={{
                    backgroundColor: colors.card, borderWidth: 1,
                    borderColor: colors.border, borderRadius: 99,
                    paddingHorizontal: 14, paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: colors.fg, fontWeight: '600', fontSize: 13 }}>{x}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT — Dual mode routing
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileRoute() {
  const { id }           = useLocalSearchParams<{ id?: string }>();
  const [myUserId,       setMyUserId]       = useState<string | null>(null);
  const [authLoading,    setAuthLoading]    = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user.id ?? null);
      setAuthLoading(false);
    });
  }, []);

  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Si hay id y no es el propio → vista pública
  if (id && id !== myUserId) {
    return <PublicProfileScreen friendId={id} />;
  }

  return <MyProfileScreen />;
}