// app/(tabs)/profile.tsx
//
// ══════════════════════════════════════════════════════════════════════════════
// PERFIL PROPIO — Meta-scale production
//
// Pipeline de imágenes:
//   avatar → compressImage(uri, 'avatar') → ≤300 KB, max 800px → updateProfile
//   story  → compressImage(uri, 'story')  → ≤600 KB, max 1200px → addStoryPhoto
//
// FIX: compressionErrorMessage usaba 'FILE_TOO_LARGE' (código de AudioUploadError).
//      ImageCompressionError tiene 'SIZE_EXCEEDED'. Corregido.
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
import {
  compressImage,
  ImageCompressionError,
} from '../../src/utils/imageCompressor';

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

const HOURS_OPTIONS: (24 | 48)[] = [24, 48];

const SYNC_STATUS_LABEL: Record<SyncStatus, string | null> = {
  synced:  null,
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

/**
 * Traduce un código de ImageCompressionError a mensaje legible.
 *
 * FIX: 'FILE_TOO_LARGE' pertenece a AudioUploadError, NO a ImageCompressionError.
 *      ImageCompressionError usa 'SIZE_EXCEEDED' para imágenes que superan el límite.
 */
function compressionErrorMessage(err: unknown): string {
  if (err instanceof ImageCompressionError) {
    switch (err.code) {
      case 'SIZE_EXCEEDED':   return 'La imagen es demasiado grande. Intentá con otra foto.';
      case 'READ_FAILED':     return 'No se pudo leer la imagen. Intentá de nuevo.';
      case 'COMPRESS_FAILED': return 'No se pudo comprimir la imagen. Intentá de nuevo.';
      default:                return 'Error procesando la imagen.';
    }
  }
  return (err as Error)?.message ?? 'Error inesperado.';
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE ESTADO DE CARGA DE IMAGEN
// ─────────────────────────────────────────────────────────────────────────────

type PhotoLoadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';
type StoryLoadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

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
      <Text style={[styles.sectionLabel, { color: colors.fg }]}>{label}</Text>
      {children}
    </View>
  );
}

function SyncBadge({
  status,
}: {
  status: SyncStatus;
}) {
  const label = SYNC_STATUS_LABEL[status];
  if (!label) return null;
  return (
    <View
      style={[
        styles.syncBadge,
        { backgroundColor: SYNC_STATUS_COLOR[status] },
      ]}
    >
      <Text style={styles.syncBadgeText}>{label}</Text>
    </View>
  );
}

function AvatarOverlay({ state }: { state: PhotoLoadState }) {
  if (state === 'idle' || state === 'done') return null;
  const label =
    state === 'compressing' ? 'Comprimiendo…' :
    state === 'uploading'   ? 'Guardando…'    : '';
  return (
    <View style={styles.avatarOverlay}>
      <ActivityIndicator color="#fff" size="small" />
      <Text style={styles.avatarOverlayText}>{label}</Text>
    </View>
  );
}

function StoryCard({
  story,
  onLongPress,
  colors,
}: {
  story:       StoryItem;
  onLongPress: () => void;
  colors:      ReturnType<typeof useAppTheme>['colors'];
}) {
  const left = timeLeft(story.expiresAt);
  return (
    <Pressable onLongPress={onLongPress} style={{ position: 'relative' }}>
      <Image
        source={{ uri: story.uri }}
        style={styles.storyImage}
        resizeMode="cover"
      />
      <View
        style={[styles.storyBorder, { borderColor: colors.accent }]}
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
  onPress,
  colors,
  isLoading,
}: {
  onPress:   () => void;
  colors:    ReturnType<typeof useAppTheme>['colors'];
  isLoading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.storyAddCard, { borderColor: colors.border, backgroundColor: colors.card }]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <>
          <Ionicons name="add" size={24} color={colors.fg} style={{ opacity: 0.3 }} />
          <Text style={[styles.storyAddText, { color: colors.fg }]}>Agregar</Text>
        </>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router     = useRouter();
  const { colors } = useAppTheme();
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Estado del perfil ───────────────────────────────────────────────────────
  const [pName,     setPName]     = useState('');
  const [pUser,     setPUser]     = useState('');
  const [pCountry,  setPCountry]  = useState('');
  const [pNative,   setPNative]   = useState('');
  const [pBio,      setPBio]      = useState('');
  const [learning,  setLearning]  = useState<LearningLang[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [stories,   setStories]   = useState<StoryItem[]>([]);
  const [photoUri,  setPhotoUri]  = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [storyDuration, setStoryDuration] = useState<24 | 48>(24);
  const [syncStatus,    setSyncStatus]    = useState<SyncStatus>('synced');
  const [photoState,    setPhotoState]    = useState<PhotoLoadState>('idle');
  const [storyState,    setStoryState]    = useState<StoryLoadState>('idle');

  // ── Carga ───────────────────────────────────────────────────────────────────

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

  // Timer: elimina stories expiradas cada minuto
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setStories((prev) => prev.filter((s) => !s.expiresAt || s.expiresAt > Date.now()));
    }, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  // Recarga al hacer focus (cambios desde Settings / Onboarding)
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
    if (photoState !== 'idle') return;
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
        quality: 1, // sin compresión del picker — la hacemos nosotros
      });
      if (result.canceled) return;
      const rawUri = result.assets?.[0]?.uri;
      if (!rawUri) return;

      // Paso 1: comprimir
      setPhotoState('compressing');
      setPhotoUri(rawUri); // preview optimista

      const compressed = await compressImage(rawUri, 'avatar');

      // Paso 2: guardar
      setPhotoState('uploading');
      const { syncStatus: status } = await updateProfile({ photoUri: compressed.uri } as Parameters<typeof updateProfile>[0]);
      setPhotoUri(compressed.uri);
      setSyncStatus(status);
      setPhotoState('done');

    } catch (err) {
      setPhotoState('error');
      Alert.alert('Error al actualizar foto', compressionErrorMessage(err));
    } finally {
      // Reset a idle después de 1.5s para que el usuario vea el estado
      setTimeout(() => setPhotoState('idle'), 1_500);
    }
  };

  const addStory = async () => {
    if (storyState !== 'idle') return;
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
        quality: 1,
      });
      if (result.canceled) return;
      const rawUri = result.assets?.[0]?.uri;
      if (!rawUri) return;

      // Paso 1: comprimir
      setStoryState('compressing');
      const compressed = await compressImage(rawUri, 'story');

      // Paso 2: guardar
      setStoryState('uploading');
      const expiresAt = Date.now() + storyDuration * 3_600_000;
      const { syncStatus: status } = await addStoryPhoto(compressed.uri, '', expiresAt);
      setSyncStatus(status);
      setStoryState('done');
      await loadProfile();

    } catch (err) {
      setStoryState('error');
      Alert.alert('Error al agregar historia', compressionErrorMessage(err));
    } finally {
      setTimeout(() => setStoryState('idle'), 1_500);
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

  const hasBasics = pName.trim().length > 0;
  const initials  = pName.trim().slice(0, 2).toUpperCase() || '?';
  const isPhotoLoading = photoState === 'compressing' || photoState === 'uploading';
  const isStoryLoading = storyState === 'compressing' || storyState === 'uploading';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      <SyncBadge status={syncStatus} />

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
        <Pressable
          onPress={pickProfilePhoto}
          style={styles.avatarWrapper}
          disabled={isPhotoLoading}
          accessibilityRole="button"
          accessibilityLabel="Cambiar foto de perfil"
        >
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
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
            <AvatarOverlay state={photoState} />
          </View>
          <View
            style={[
              styles.cameraButton,
              { backgroundColor: colors.accent, borderColor: colors.bg },
            ]}
          >
            {isPhotoLoading ? (
              <ActivityIndicator color="#fff" size="small" style={{ transform: [{ scale: 0.6 }] }} />
            ) : (
              <Ionicons name="camera" size={14} color="#fff" />
            )}
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

        {/* CTA */}
        <Pressable
          onPress={() => router.push('/onboarding' as any)}
          style={[styles.editButton, { backgroundColor: colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel={hasBasics ? 'Editar perfil' : 'Completar perfil'}
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
                  accessibilityRole="button"
                  accessibilityLabel={`Duración ${h} horas`}
                >
                  <Text style={[styles.hourPillText, { color: storyDuration === h ? colors.accent : colors.fg }]}>
                    {h}h
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={addStory}
                disabled={isStoryLoading}
                style={[
                  styles.addStoryButton,
                  { backgroundColor: colors.accent, opacity: isStoryLoading ? 0.6 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Agregar historia"
              >
                {isStoryLoading ? (
                  <ActivityIndicator color="#fff" size="small" style={{ transform: [{ scale: 0.7 }] }} />
                ) : (
                  <Text style={styles.addStoryButtonText}>+ Agregar</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Estado de carga de story */}
          {storyState === 'compressing' ? (
            <View style={[styles.storyProgressBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.storyProgressText, { color: colors.fg }]}>Comprimiendo imagen…</Text>
            </View>
          ) : storyState === 'uploading' ? (
            <View style={[styles.storyProgressBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.storyProgressText, { color: colors.fg }]}>Guardando historia…</Text>
            </View>
          ) : null}

          {stories.length === 0 ? (
            <Pressable
              onPress={addStory}
              disabled={isStoryLoading}
              style={[
                styles.storiesEmpty,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Agregar historia de ${storyDuration} horas`}
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
              <AddStoryCard
                colors={colors}
                onPress={addStory}
                isLoading={isStoryLoading}
              />
            </ScrollView>
          )}
          <Text style={[styles.storyHint, { color: colors.fg }]}>
            Mantené presionada para eliminar
          </Text>
        </View>

        {/* IDIOMA NATIVO */}
        {pNative ? (
          <Section label="IDIOMA NATIVO" colors={colors}>
            <View style={[styles.langCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.fg }]}>
                Elegí idiomas en el onboarding.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {learning.map((l, idx) => (
                <View
                  key={`${l.lang}-${idx}`}
                  style={[styles.langCard, { backgroundColor: colors.card, borderColor: colors.border }]}
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
                  style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}
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

  // Sync badge
  syncBadge: {
    position:          'absolute',
    top:               Platform.OS === 'ios' ? 56 : 20,
    right:             20,
    zIndex:            99,
    borderRadius:      99,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  syncBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },

  // Hero
  hero: {
    paddingBottom:     32,
    paddingHorizontal: 24,
    alignItems:        'center',
    borderBottomWidth: 1,
  },
  avatarWrapper:  { position: 'relative', marginBottom: 4 },
  avatar: {
    width:          100,
    height:         100,
    borderRadius:   50,
    borderWidth:    3,
    overflow:       'hidden',
    alignItems:     'center',
    justifyContent: 'center',
    shadowOffset:   { width: 0, height: 6 },
    shadowOpacity:  0.3,
    shadowRadius:   14,
    elevation:      10,
  },
  avatarImage:    { width: 100, height: 100 },
  avatarInitials: { color: '#fff', fontSize: 36, fontWeight: '900' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             4,
  },
  avatarOverlayText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  cameraButton: {
    position:       'absolute',
    bottom:         2,
    right:          2,
    width:          30,
    height:         30,
    borderRadius:   15,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize:   26,
    fontWeight: '900',
    marginTop:  14,
    textAlign:  'center',
  },
  heroUsername: { fontWeight: '700', marginTop: 3, fontSize: 14 },
  heroLocation: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginTop:     5,
  },
  heroLocationText: { opacity: 0.4, fontWeight: '600', fontSize: 13 },
  heroBio: {
    opacity:           0.6,
    fontWeight:        '500',
    marginTop:         10,
    textAlign:         'center',
    lineHeight:        20,
    fontSize:          14,
    paddingHorizontal: 16,
  },
  editButton: {
    marginTop:         20,
    flexDirection:     'row',
    gap:               6,
    paddingVertical:   12,
    paddingHorizontal: 28,
    borderRadius:      99,
    alignItems:        'center',
  },
  editButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Contenido
  content: { padding: 20, gap: 24 },

  // Labels
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
  hourPillText:       { fontWeight: '700', fontSize: 11 },
  addStoryButton:     { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 2, minWidth: 70, alignItems: 'center' },
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
  storyProgressBar: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    borderWidth:    1,
    borderRadius:   12,
    padding:        12,
  },
  storyProgressText: { fontSize: 13, fontWeight: '600', opacity: 0.7 },

  // Story card
  storyImage: { width: 90, height: 140, borderRadius: 14 },
  storyBorder: {
    position:     'absolute',
    top: 0, left: 0,
    width:        90,
    height:       140,
    borderRadius: 14,
    borderWidth:  2,
  },
  storyTimerWrapper: {
    position:   'absolute',
    bottom:     8,
    left:       0,
    right:      0,
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
  storyAddText: { opacity: 0.3, fontSize: 10, fontWeight: '700' },

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
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 16 },
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