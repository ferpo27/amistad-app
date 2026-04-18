// app/(tabs)/profile.tsx
//
// ══════════════════════════════════════════════════════════════════════════════
// PERFIL PROPIO
//
// CAMBIOS vs versión anterior:
//   - Usa profilesStorage (Supabase + cache) en lugar de storage.ts directo
//   - useThemeMode → useAppTheme (consistente con el resto de la app)
//   - addStoryPhoto / removeStoryPhoto desde profilesStorage
//   - updateProfile desde profilesStorage (persiste en Supabase)
//   - Indicador de sync status (pastilla discreta en el header)
//   - pickProfilePhoto sube el URI y sincroniza remotamente
//   - Sin console.log en producción
// ══════════════════════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Platform,
  Image,
  Alert,
  AppState,
  StyleSheet,
  ActivityIndicator,
  type AppStateStatus,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAppTheme } from '../../src/theme';
import {
  getProfile,
  updateProfile,
  addStoryPhoto,
  removeStoryPhoto,
  getSyncStatus,
  refreshProfile,
  type SyncStatus,
} from '../../src/storage/profilesStorage';
import type { LearningLang, StoryItem } from '../../src/storage';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const FLAGS: Record<string, string> = {
  es: '🇦🇷',
  en: '🇺🇸',
  de: '🇩🇪',
  ja: '🇯🇵',
  ru: '🇷🇺',
  zh: '🇨🇳',
};

const LANG_NAMES: Record<string, string> = {
  es: 'Español',
  en: 'English',
  de: 'Deutsch',
  ja: '日本語',
  ru: 'Русский',
  zh: '中文',
};

const HOURS_OPTIONS: (24 | 48)[] = [24, 48];

const SYNC_STATUS_LABEL: Record<SyncStatus, string | null> = {
  synced:  null,     // Silencioso cuando todo OK
  pending: '↑',
  error:   '!',
  offline: '✈',
};

const SYNC_STATUS_COLOR: Record<SyncStatus, string> = {
  synced:  '#3DD68C',
  pending: '#FFB547',
  error:   '#FF5C5C',
  offline: '#8A8A8E',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function timeLeft(expiresAt?: number): string | null {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          color:       colors.fg,
          opacity:     0.4,
          fontWeight:  '800',
          fontSize:    11,
          letterSpacing: 1.2,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function SyncBadge({
  status,
  colors,
}: {
  status: SyncStatus;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  const label = SYNC_STATUS_LABEL[status];
  if (!label) return null;

  return (
    <View
      style={{
        position:        'absolute',
        top:             Platform.OS === 'ios' ? 56 : 20,
        right:           20,
        backgroundColor: SYNC_STATUS_COLOR[status],
        borderRadius:    99,
        paddingHorizontal: 8,
        paddingVertical:   3,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>{label}</Text>
    </View>
  );
}

function StoryCard({
  story,
  onLongPress,
  colors,
}: {
  story: StoryItem;
  onLongPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  const left = timeLeft(story.expiresAt);

  return (
    <Pressable onLongPress={onLongPress}>
      <Image
        source={{ uri: story.uri }}
        style={styles.storyImage}
        resizeMode="cover"
      />
      <View
        style={[
          styles.storyBorder,
          { borderColor: colors.accent },
        ]}
        pointerEvents="none"
      />
      {left ? (
        <View style={styles.storyTimerWrapper}>
          <View style={styles.storyTimerPill}>
            <Text style={styles.storyTimerText}>{left}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

function AddStoryCard({
  colors,
  onPress,
}: {
  colors: ReturnType<typeof useAppTheme>['colors'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.storyAddCard,
        {
          borderColor:     colors.border,
          backgroundColor: colors.card,
        },
      ]}
    >
      <Ionicons name="add" size={24} color={colors.fg} style={{ opacity: 0.3 }} />
      <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 10, fontWeight: '700' }}>
        Agregar
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router   = useRouter();
  const { colors } = useAppTheme();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estado del perfil
  const [pName,     setPName]     = useState('');
  const [pUser,     setPUser]     = useState('');
  const [pCountry,  setPCountry]  = useState('');
  const [pNative,   setPNative]   = useState('');
  const [pBio,      setPBio]      = useState('');
  const [learning,  setLearning]  = useState<LearningLang[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [stories,   setStories]   = useState<StoryItem[]>([]);
  const [photoUri,  setPhotoUri]  = useState<string | null>(null);

  // UI state
  const [storyDuration, setStoryDuration] = useState<24 | 48>(24);
  const [syncStatus,    setSyncStatus]    = useState<SyncStatus>('synced');
  const [loadingPhoto,  setLoadingPhoto]  = useState(false);

  // ── Carga del perfil ────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    const prof = await getProfile();
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

    const status = await getSyncStatus();
    setSyncStatus(status);
  }, []);

  // ── Timers ──────────────────────────────────────────────────────────────────

  // Limpia stories expiradas cada minuto
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > Date.now()));
    }, 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Limpia al volver al primer plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > Date.now()));
      }
    });
    return () => sub.remove();
  }, []);

  // Recarga al hacer focus (puede haber cambios desde Settings o Onboarding)
  useFocusEffect(
    useCallback(() => {
      refreshProfile().then((prof) => {
        const now = Date.now();
        setPName(prof.displayName ?? '');
        setPUser(prof.username ?? '');
        setPCountry(prof.country ?? '');
        setPNative(prof.nativeLang ?? '');
        setPBio(prof.bio ?? '');
        setLearning(prof.languageLearning?.learn ?? []);
        setInterests(prof.interests ?? []);
        setStories((prof.stories ?? []).filter((s) => !s.expiresAt || s.expiresAt > now));
        setPhotoUri(prof.photoUri ?? null);
      });
      getSyncStatus().then(setSyncStatus);
    }, []),
  );

  // ── Acciones ────────────────────────────────────────────────────────────────

  const pickProfilePhoto = async () => {
    if (loadingPhoto) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cambiar la foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setLoadingPhoto(true);
      setPhotoUri(uri); // optimistic

      const { syncStatus: status } = await updateProfile({ photoUri: uri } as any);
      setSyncStatus(status);

    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo actualizar la foto.');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const addStory = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      const expiresAt = Date.now() + storyDuration * 3_600_000;
      const { syncStatus: status } = await addStoryPhoto(uri, '', expiresAt);
      setSyncStatus(status);
      await loadProfile();

    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo agregar la historia.');
    }
  };

  const confirmDeleteStory = (id: string) => {
    Alert.alert('Eliminar historia', '¿Seguro que querés eliminarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { syncStatus: status } = await removeStoryPhoto(id);
          setSyncStatus(status);
          await loadProfile();
        },
      },
    ]);
  };

  // ── Derivados ───────────────────────────────────────────────────────────────

  const hasBasics  = pName.trim().length > 0;
  const initials   = pName.trim().slice(0, 2).toUpperCase() || '?';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Sync badge */}
      <SyncBadge status={syncStatus} colors={colors} />

      {/* ── HERO ── */}
      <View
        style={[
          styles.hero,
          {
            paddingTop:        Platform.OS === 'ios' ? 64 : 32,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Avatar */}
        <Pressable onPress={pickProfilePhoto} style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatar,
              {
                borderColor:     colors.accent,
                backgroundColor: colors.accent,
                shadowColor:     colors.accent,
              },
            ]}
          >
            {loadingPhoto ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <View style={[styles.cameraButton, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>

        {/* Info */}
        <Text style={[styles.heroName, { color: colors.fg }]}>
          {pName || 'Tu perfil'}
        </Text>
        {pUser ? (
          <Text style={[styles.heroUsername, { color: colors.accent }]}>@{pUser}</Text>
        ) : null}
        {pCountry ? (
          <View style={styles.heroLocation}>
            <Ionicons name="location-outline" size={13} color={colors.fg} style={{ opacity: 0.4 }} />
            <Text style={[styles.heroLocationText, { color: colors.fg }]}>{pCountry}</Text>
          </View>
        ) : null}
        {pBio ? (
          <Text style={[styles.heroBio, { color: colors.fg }]}>{pBio}</Text>
        ) : null}

        {/* CTA Edit */}
        <Pressable
          onPress={() => router.push('/onboarding' as any)}
          style={[styles.editButton, { backgroundColor: colors.accent }]}
        >
          <Ionicons name={hasBasics ? 'pencil' : 'person-add'} size={15} color="#fff" />
          <Text style={styles.editButtonText}>
            {hasBasics ? 'Editar perfil' : 'Completar perfil'}
          </Text>
        </Pressable>
      </View>

      {/* ── CONTENIDO ── */}
      <View style={styles.content}>

        {/* HISTORIAS */}
        <View style={{ gap: 10 }}>
          <View style={styles.storyHeader}>
            <Text style={[styles.sectionLabel, { color: colors.fg }]}>HISTORIAS</Text>
            <View style={styles.storyControls}>
              {HOURS_OPTIONS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setStoryDuration(h)}
                  style={[
                    styles.hourPill,
                    {
                      borderColor:     storyDuration === h ? colors.accent : colors.border,
                      backgroundColor: storyDuration === h ? colors.accentSoft : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.hourPillText,
                      { color: storyDuration === h ? colors.accent : colors.fg },
                    ]}
                  >
                    {h}h
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={addStory}
                style={[styles.addStoryButton, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.addStoryButtonText}>+ Agregar</Text>
              </Pressable>
            </View>
          </View>

          {stories.length === 0 ? (
            <Pressable
              onPress={addStory}
              style={[
                styles.storiesEmpty,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="images-outline" size={28} color={colors.fg} style={{ opacity: 0.25 }} />
              <Text style={[styles.storiesEmptyText, { color: colors.fg }]}>
                Tocá para agregar una historia ({storyDuration}h)
              </Text>
            </Pressable>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {stories.map((s) => (
                <StoryCard
                  key={s.id}
                  story={s}
                  onLongPress={() => confirmDeleteStory(s.id)}
                  colors={colors}
                />
              ))}
              <AddStoryCard colors={colors} onPress={addStory} />
            </ScrollView>
          )}
          <Text style={[styles.storyHint, { color: colors.fg }]}>
            Mantené presionada para eliminar
          </Text>
        </View>

        {/* IDIOMA NATIVO */}
        {pNative ? (
          <Section label="IDIOMA NATIVO" colors={colors}>
            <View
              style={[
                styles.langCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={styles.langFlag}>{FLAGS[pNative] ?? '🌍'}</Text>
              <Text style={[styles.langName, { color: colors.fg }]}>
                {LANG_NAMES[pNative] ?? pNative}
              </Text>
            </View>
          </Section>
        ) : null}

        {/* APRENDIENDO */}
        <Section label="APRENDIENDO" colors={colors}>
          {learning.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyText, { color: colors.fg }]}>
                Elegí idiomas en el onboarding.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {learning.map((l, idx) => (
                <View
                  key={`${l.lang}-${idx}`}
                  style={[
                    styles.langCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.langFlag}>{FLAGS[l.lang] ?? '🌍'}</Text>
                  <Text style={[styles.langName, { color: colors.fg, flex: 1 }]}>
                    {LANG_NAMES[l.lang] ?? l.lang}
                  </Text>
                  {l.level ? (
                    <View style={[styles.levelBadge, { backgroundColor: colors.accentSoft }]}>
                      <Text style={[styles.levelBadgeText, { color: colors.accent }]}>
                        {l.level}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* INTERESES */}
        <Section label="INTERESES" colors={colors}>
          {interests.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.fg }]}>
              Sumá intereses en el onboarding.
            </Text>
          ) : (
            <View style={styles.tagsContainer}>
              {interests.slice(0, 20).map((x) => (
                <View
                  key={x}
                  style={[
                    styles.tag,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.tagText, { color: colors.fg }]}>{x}</Text>
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
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: {
    paddingBottom:    32,
    paddingHorizontal: 24,
    alignItems:       'center',
    borderBottomWidth: 1,
  },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  3,
    overflow:     'hidden',
    alignItems:   'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius:  14,
    elevation:    10,
  },
  avatarImage:    { width: 100, height: 100 },
  avatarInitials: { color: '#fff', fontSize: 36, fontWeight: '900' },
  cameraButton: {
    position:     'absolute',
    bottom:       2,
    right:        2,
    width:        30,
    height:       30,
    borderRadius: 15,
    borderWidth:  2,
    alignItems:   'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize:   26,
    fontWeight: '900',
    marginTop:  14,
    textAlign:  'center',
  },
  heroUsername: {
    fontWeight: '700',
    marginTop:  3,
    fontSize:   14,
  },
  heroLocation: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginTop:     5,
  },
  heroLocationText: { opacity: 0.4, fontWeight: '600', fontSize: 13 },
  heroBio: {
    opacity:         0.6,
    fontWeight:      '500',
    marginTop:       10,
    textAlign:       'center',
    lineHeight:      20,
    fontSize:        14,
    paddingHorizontal: 16,
  },
  editButton: {
    marginTop:       20,
    flexDirection:   'row',
    gap:             6,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius:    99,
    alignItems:      'center',
  },
  editButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Contenido
  content: { padding: 20, gap: 24 },

  // Section label
  sectionLabel: { opacity: 0.4, fontWeight: '800', fontSize: 11, letterSpacing: 1.2 },

  // Stories
  storyHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storyControls: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  hourPill: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      99,
    borderWidth:       1,
  },
  hourPillText:     { fontWeight: '700', fontSize: 11 },
  addStoryButton:   { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 2 },
  addStoryButtonText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  storiesEmpty: {
    borderWidth:   1,
    borderStyle:   'dashed',
    borderRadius:  16,
    padding:       24,
    alignItems:    'center',
    gap:           8,
  },
  storiesEmptyText: { opacity: 0.35, fontWeight: '600', fontSize: 13 },
  storyHint:        { opacity: 0.25, fontSize: 11 },

  // Story card
  storyImage: {
    width:        90,
    height:       140,
    borderRadius: 14,
  },
  storyBorder: {
    position:     'absolute',
    top:          0,
    left:         0,
    width:        90,
    height:       140,
    borderRadius: 14,
    borderWidth:  2,
  },
  storyTimerWrapper: {
    position:  'absolute',
    bottom:    8,
    left:      0,
    right:     0,
    alignItems: 'center',
  },
  storyTimerPill: {
    backgroundColor:   'rgba(0,0,0,0.6)',
    borderRadius:      99,
    paddingHorizontal: 7,
    paddingVertical:   3,
  },
  storyTimerText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  storyAddCard: {
    width:          90,
    height:         140,
    borderRadius:   14,
    borderWidth:    1.5,
    borderStyle:    'dashed',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
  },

  // Lang cards
  langCard: {
    borderWidth:   1,
    borderRadius:  14,
    padding:       14,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  langFlag: { fontSize: 22 },
  langName: { fontWeight: '700', fontSize: 15 },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      99,
  },
  levelBadgeText: { fontWeight: '800', fontSize: 12 },

  // Empty
  emptyCard: {
    borderWidth:  1,
    borderRadius: 14,
    padding:      16,
  },
  emptyText: { opacity: 0.35 },

  // Tags
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderWidth:       1,
    borderRadius:      99,
    paddingHorizontal: 14,
    paddingVertical:   7,
  },
  tagText: { fontWeight: '600', fontSize: 13 },
});