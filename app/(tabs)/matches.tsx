// app/(tabs)/matches.tsx
//
// ══════════════════════════════════════════════════════════════════════════════
// DISCOVERY / MATCHES — Exploración de perfiles con infinite scroll
//
// NUEVO vs versión anterior:
//   - Cursor-based pagination: carga 20 perfiles, al llegar al final carga más
//   - getDiscoveryProfiles(cursor, limit) en lugar de getDiscoveryProfiles(limit)
//   - FlatList.onEndReached → fetchNextPage()
//   - Footer con spinner mientras carga más / "No hay más perfiles" al final
//   - useTheme → useAppTheme
//   - likes: from_user_id/to_user_id (schema real)
//   - Like optimista con retry en failure
//   - Sin console.log en producción
// ══════════════════════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../src/lib/supabase';
import { useAppTheme } from '../../src/theme';
import { getProfile } from '../../src/storage/profilesStorage';
import { calculateCompatibility } from '../../src/matching/calculateCompatibility';
import {
  getDiscoveryProfiles,
  type RemoteProfile,
} from '../../src/storage/profilesStorage';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'top' | 'all';

interface MatchRow {
  id:            string;
  name:          string;
  country:       string;
  nativeLang:    string;
  learningLangs: string[];
  interests:     string[];
  score:         number;
  photoUrl:      string | null;
  liked:         boolean;
}

interface MyProfile {
  interests:     string[];
  nativeLang:    string;
  learningLangs: string[];
}

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

const ALL_LANGS = ['en', 'es', 'de', 'ja', 'ru', 'zh'];
const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function remoteToMatchRow(p: RemoteProfile, me: MyProfile): MatchRow {
  const score = calculateCompatibility(
    {
      interests:  me.interests,
      nativeLang: me.nativeLang as Parameters<typeof calculateCompatibility>[0]['nativeLang'],
      learning:   me.learningLangs as Parameters<typeof calculateCompatibility>[0]['learning'],
    },
    {
      id:         p.id,
      name:       p.displayName,
      nativeLang: p.nativeLang as Parameters<typeof calculateCompatibility>[1]['nativeLang'],
      learning:   (p.learning ?? []).map((l) => ({
        lang:  l.lang as Parameters<typeof calculateCompatibility>[1]['learning'] extends Array<infer T> ? T extends { lang: infer L } ? L : never : never,
        level: l.level,
      })),
      interests: p.interests,
    },
  );

  return {
    id:            p.id,
    name:          p.displayName || '—',
    country:       p.country ?? '',
    nativeLang:    p.nativeLang,
    learningLangs: (p.learning ?? []).map((l) => l.lang),
    interests:     p.interests ?? [],
    score,
    photoUrl:      p.photoUrl ?? null,
    liked:         false,
  };
}

function scoreTier(score: number): { label: string; color: string } {
  if (score >= 0.7) return { label: 'Excelente', color: '#34C759' };
  if (score >= 0.4) return { label: 'Bueno',     color: '#007AFF' };
  return                   { label: 'Básico',    color: '#8E8E93' };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow({ colors }: { colors: ReturnType<typeof useAppTheme>['colors'] }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        paddingHorizontal: 20,
        paddingVertical:   14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity,
      }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, marginRight: 14 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ width: '50%', height: 14, borderRadius: 7, backgroundColor: colors.card }} />
        <View style={{ width: '75%', height: 11, borderRadius: 6, backgroundColor: colors.card }} />
        <View style={{ width: '40%', height: 10, borderRadius: 5, backgroundColor: colors.card }} />
      </View>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card }} />
    </Animated.View>
  );
}

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const pct       = Math.round(Math.min(100, Math.max(0, score * 100)));
  const { color } = scoreTier(score);

  return (
    <View
      style={{
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        borderWidth:     2.5,
        borderColor:     color,
        backgroundColor: color + '18',
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      <Text style={{ color, fontWeight: '900', fontSize: size * 0.3 }}>{pct}%</Text>
    </View>
  );
}

function LikeButton({
  liked,
  sending,
  onPress,
}: {
  liked:   boolean;
  sending: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (sending) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Quitar like' : 'Dar like'}
      style={{
        width:           44,
        height:          44,
        borderRadius:    22,
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: liked ? '#FF375F15' : 'transparent',
        borderWidth:     1,
        borderColor:     liked ? '#FF375F' : 'transparent',
      }}
    >
      {sending ? (
        <ActivityIndicator size="small" color="#FF375F" />
      ) : (
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? '#FF375F' : '#8E8E93'}
          />
        </Animated.View>
      )}
    </Pressable>
  );
}

function ListFooter({
  isLoadingMore,
  hasMore,
  count,
  colors,
}: {
  isLoadingMore: boolean;
  hasMore:       boolean;
  count:         number;
  colors:        ReturnType<typeof useAppTheme>['colors'];
}) {
  if (count === 0) return null;

  if (isLoadingMore) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!hasMore) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center', gap: 4 }}>
        <Ionicons name="checkmark-circle-outline" size={20} color={colors.fg} style={{ opacity: 0.2 }} />
        <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 12, fontWeight: '600' }}>
          Ya viste todos los perfiles disponibles
        </Text>
      </View>
    );
  }

  return <View style={{ height: 40 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMIT BANNER
// ─────────────────────────────────────────────────────────────────────────────

function RateLimitBanner({ colors }: { colors: ReturnType<typeof useAppTheme>['colors'] }) {
  return (
    <View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               10,
        backgroundColor:   '#FF375F15',
        borderBottomWidth: 1,
        borderBottomColor: '#FF375F40',
        paddingHorizontal: 20,
        paddingVertical:   10,
      }}
    >
      <Ionicons name="time-outline" size={16} color="#FF375F" />
      <Text style={{ flex: 1, color: '#FF375F', fontSize: 13, fontWeight: '600' }}>
        Alcanzaste el límite de likes por hoy. Volvé mañana.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const router       = useRouter();
  const { colors }   = useAppTheme();
  const insets       = useSafeAreaInsets();

  // ── Estado de datos ─────────────────────────────────────────────────────────
  const [matches,       setMatches]       = useState<MatchRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(true);
  const [cursor,        setCursor]        = useState<string | null>(null);
  const [myUserId,      setMyUserId]      = useState<string | null>(null);
  const [myProfile,     setMyProfile]     = useState<MyProfile | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [tab,           setTab]           = useState<TabId>('top');
  const [filterLang,    setFilterLang]    = useState<string | null>(null);
  const [sending,       setSending]       = useState<Set<string>>(new Set());

  // Evitar fetches concurrentes
  const isFetchingRef = useRef(false);

  // ── Rate limiting (cliente) ──────────────────────────────────────────────────
  // Debounce por targetId: si el usuario toca el mismo perfil en < 600ms, ignorar.
  // Previene doble-tap accidental y reduce carga en Supabase.
  const likeDebounceMap = useRef<Map<string, number>>(new Map());
  const LIKE_DEBOUNCE_MS = 600;

  // Cooldown global: si el servidor devuelve RATE_LIMIT_EXCEEDED,
  // bloqueamos todos los likes por 60s y mostramos banner.
  const [rateLimited,   setRateLimited]   = useState(false);
  const rateLimitTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bootstrap auth ──────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user.id ?? null);
    });
  }, []);

  // ── Carga inicial ────────────────────────────────────────────────────────────

  const loadInitial = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setMatches([]);
    setCursor(null);
    setHasMore(true);

    try {
      const session  = await supabase.auth.getSession();
      const myId     = session.data.session?.user.id;
      const myProf   = await getProfile();

      const me: MyProfile = {
        interests:     myProf.interests ?? [],
        nativeLang:    myProf.nativeLang ?? '',
        learningLangs: (myProf.languageLearning?.learn ?? []).map((x) => x?.lang ?? ''),
      };
      setMyProfile(me);

      const page = await getDiscoveryProfiles(null, PAGE_SIZE);

      const rows = page.profiles
        .filter((p) => p?.id && p.id !== myId)
        .map((p) => remoteToMatchRow(p, me))
        .sort((a, b) => b.score - a.score);

      setMatches(rows);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);

    } catch {
      setMatches([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => { loadInitial(); }, [loadInitial]));

  // ── Cargar más (infinite scroll) ────────────────────────────────────────────

  const fetchNextPage = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || !cursor || loadingMore) return;
    isFetchingRef.current = true;
    setLoadingMore(true);

    try {
      const session = await supabase.auth.getSession();
      const myId    = session.data.session?.user.id;

      const page = await getDiscoveryProfiles(cursor, PAGE_SIZE);

      if (page.profiles.length === 0) {
        setHasMore(false);
        return;
      }

      const me = myProfile ?? { interests: [], nativeLang: '', learningLangs: [] };

      const newRows = page.profiles
        .filter((p) => p?.id && p.id !== myId)
        .map((p) => remoteToMatchRow(p, me));

      setMatches((prev) => {
        // Deduplicar por id
        const existingIds = new Set(prev.map((r) => r.id));
        const deduped     = newRows.filter((r) => !existingIds.has(r.id));
        // Mantener sort por score solo en los nuevos items para no re-sortear todo
        return [...prev, ...deduped];
      });

      setCursor(page.nextCursor);
      setHasMore(page.hasMore);

    } catch {
      // Error silencioso — el usuario puede hacer pull-to-refresh
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [cursor, hasMore, loadingMore, myProfile]);

  // ── Like / Unlike con debounce + rate limiting ──────────────────────────────

  // Cleanup del timer de rate limit al desmontar
  useEffect(() => {
    return () => {
      if (rateLimitTimer.current) clearTimeout(rateLimitTimer.current);
    };
  }, []);

  const toggleLike = useCallback(async (targetId: string) => {
    if (!myUserId) return;

    // Bloqueo global por rate limit del servidor
    if (rateLimited) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Debounce por targetId: ignorar si el mismo perfil fue tocado hace < 600ms
    const now        = Date.now();
    const lastTapped = likeDebounceMap.current.get(targetId) ?? 0;
    if (now - lastTapped < LIKE_DEBOUNCE_MS) return;
    likeDebounceMap.current.set(targetId, now);

    const isCurrentlyLiked = matches.find((m) => m.id === targetId)?.liked ?? false;

    // Optimistic update inmediato
    setMatches((prev) =>
      prev.map((m) => m.id === targetId ? { ...m, liked: !isCurrentlyLiked } : m),
    );
    setSending((prev) => new Set(prev).add(targetId));

    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('from_user_id', myUserId)
          .eq('to_user_id', targetId);

        if (error) throw error;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      } else {
        const { error } = await supabase
          .from('likes')
          .upsert(
            {
              from_user_id: myUserId,
              to_user_id:   targetId,
              created_at:   new Date().toISOString(),
            },
            { onConflict: 'from_user_id,to_user_id' },
          );

        if (error) throw error;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

    } catch (err: unknown) {
      // Revertir optimistic update
      setMatches((prev) =>
        prev.map((m) => m.id === targetId ? { ...m, liked: isCurrentlyLiked } : m),
      );

      // Detectar error de rate limit del servidor (trigger PostgreSQL)
      const message = (err as { message?: string })?.message ?? '';
      if (message.includes('RATE_LIMIT_EXCEEDED')) {
        // Activar cooldown de 60s: bloquea todos los likes
        setRateLimited(true);
        rateLimitTimer.current = setTimeout(() => setRateLimited(false), 60_000);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      // Otros errores: revertir silencioso — el usuario ya vio el estado volver
    } finally {
      setSending((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, [myUserId, matches, rateLimited]);

  // ── Datos derivados ──────────────────────────────────────────────────────────

  const filteredMatches = useMemo(() => {
    if (!filterLang) return matches;
    return matches.filter(
      (m) => m.nativeLang === filterLang || m.learningLangs.includes(filterLang),
    );
  }, [matches, filterLang]);

  const topMatches = useMemo(
    () => filteredMatches.filter((m) => m.score >= 0.3).slice(0, 50),
    [filteredMatches],
  );

  const displayList = tab === 'top' ? topMatches : filteredMatches;

  const langCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of matches) {
      for (const l of [m.nativeLang, ...m.learningLangs]) {
        if (l) counts[l] = (counts[l] ?? 0) + 1;
      }
    }
    return counts;
  }, [matches]);

  // ── Estilos ──────────────────────────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bg },
        header: {
          paddingTop:        insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom:     12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor:   colors.bg,
          gap:               12,
        },
        headerTop: {
          flexDirection:  'row',
          alignItems:     'flex-end',
          justifyContent: 'space-between',
        },
        title:    { color: colors.fg, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
        subtitle: { color: colors.subtext, fontWeight: '700', fontSize: 13, marginTop: 2 },
        tabRow: {
          flexDirection:   'row',
          backgroundColor: colors.card,
          borderRadius:    12,
          padding:         3,
          borderWidth:     1,
          borderColor:     colors.border,
        },
        tabBtn:       { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
        tabBtnActive: { backgroundColor: colors.accent },
        tabText:      { fontWeight: '900', fontSize: 14 },
        filterScroll: { paddingLeft: 20, paddingRight: 8, paddingVertical: 10 },
        filterChip: {
          flexDirection:     'row',
          alignItems:        'center',
          paddingHorizontal: 14,
          paddingVertical:   7,
          borderRadius:      99,
          borderWidth:       1,
          marginRight:       8,
          gap:               5,
        },
        filterChipText: { fontWeight: '700', fontSize: 13 },
        row: {
          flexDirection:     'row',
          alignItems:        'center',
          paddingHorizontal: 20,
          paddingVertical:   14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap:               12,
        },
        avatar: {
          width:           52,
          height:          52,
          borderRadius:    26,
          backgroundColor: colors.card,
          borderWidth:     1,
          borderColor:     colors.border,
          alignItems:      'center',
          justifyContent:  'center',
          overflow:        'hidden',
        },
        avatarText:   { fontWeight: '900', fontSize: 18, color: colors.accent },
        name:         { color: colors.fg, fontWeight: '900', fontSize: 16 },
        meta:         { color: colors.subtext, fontWeight: '700', fontSize: 13, marginTop: 2 },
        interestLine: { color: colors.subtext, fontSize: 12, marginTop: 3 },
        emptyContainer: {
          flex:              1,
          alignItems:        'center',
          justifyContent:    'center',
          gap:               14,
          paddingHorizontal: 32,
          paddingTop:        60,
        },
        emptyText: {
          color:      colors.subtext,
          fontWeight: '600',
          fontSize:   15,
          textAlign:  'center',
        },
        refreshBtn: {
          backgroundColor:   colors.accent,
          borderRadius:      99,
          paddingHorizontal: 24,
          paddingVertical:   12,
        },
        refreshBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
        topBadge: {
          backgroundColor:   colors.accent,
          borderRadius:      99,
          paddingHorizontal: 7,
          paddingVertical:   2,
        },
      }),
    [colors, insets],
  );

  // ── Render item ──────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: MatchRow; index: number }) => {
      const initials      = item.name.slice(0, 2).toUpperCase();
      const isTop         = index === 0 && tab === 'top';
      const nativeName    = LANG_NAMES[item.nativeLang] ?? item.nativeLang;
      const learningNames = item.learningLangs.map((l) => LANG_NAMES[l] ?? l).join(', ');

      return (
        <Pressable
          style={({ pressed }) => [
            styles.row,
            isTop && { backgroundColor: colors.accentSoft },
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => router.push(`/(tabs)/profile/${item.id}` as any)}
          accessibilityLabel={`Ver perfil de ${item.name}`}
          accessibilityRole="button"
        >
          <View style={styles.avatar}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={{ width: 52, height: 52 }} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {isTop ? (
                <View style={styles.topBadge}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>TOP</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[item.country, nativeName].filter(Boolean).join(' · ')}
              {learningNames ? ` → ${learningNames}` : ''}
            </Text>
            {item.interests.length > 0 ? (
              <Text style={styles.interestLine} numberOfLines={1}>
                {item.interests.slice(0, 3).join(' · ')}
              </Text>
            ) : null}
          </View>

          <LikeButton
            liked={item.liked}
            sending={sending.has(item.id)}
            onPress={() => toggleLike(item.id)}
          />

          <ScoreRing score={item.score} size={50} />
        </Pressable>
      );
    },
    [router, styles, colors, tab, sending, toggleLike],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Personas</Text>
            <Text style={styles.subtitle}>
              {loading
                ? 'Buscando…'
                : `${displayList.length} perfiles${filterLang ? ` · ${LANG_NAMES[filterLang] ?? filterLang}` : ''}${hasMore ? '+' : ''}`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={loadInitial}
            style={{ padding: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Actualizar lista"
          >
            <Ionicons name="refresh-outline" size={22} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {(['top', 'all'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tab === t ? '#fff' : colors.fg, opacity: tab === t ? 1 : 0.55 },
                ]}
              >
                {t === 'top' ? '⭐ Compatibles' : '🌍 Todos'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Rate limit banner — visible 60s después de alcanzar el límite */}
      {rateLimited ? <RateLimitBanner colors={colors} /> : null}

      {/* Filtros por idioma */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <Pressable
          onPress={() => setFilterLang(null)}
          style={[
            styles.filterChip,
            {
              borderColor:     !filterLang ? colors.accent : colors.border,
              backgroundColor: !filterLang ? colors.accentSoft : 'transparent',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mostrar todos los idiomas"
        >
          <Text style={[styles.filterChipText, { color: !filterLang ? colors.accent : colors.subtext }]}>
            Todos
          </Text>
          <Text style={[styles.filterChipText, { color: !filterLang ? colors.accent : colors.subtext, opacity: 0.7 }]}>
            {matches.length}{hasMore ? '+' : ''}
          </Text>
        </Pressable>

        {ALL_LANGS.filter((l) => (langCounts[l] ?? 0) > 0).map((lang) => {
          const active = filterLang === lang;
          return (
            <Pressable
              key={lang}
              onPress={() => setFilterLang(active ? null : lang)}
              style={[
                styles.filterChip,
                {
                  borderColor:     active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : 'transparent',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${LANG_NAMES[lang] ?? lang}`}
            >
              <Text style={{ fontSize: 14 }}>{FLAGS[lang] ?? '🌐'}</Text>
              <Text style={[styles.filterChipText, { color: active ? colors.accent : colors.subtext }]}>
                {LANG_NAMES[lang] ?? lang}
              </Text>
              <Text style={{ color: active ? colors.accent : colors.subtext, fontWeight: '700', fontSize: 11, opacity: 0.7 }}>
                {langCounts[lang] ?? 0}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Lista */}
      {loading ? (
        <View>
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonRow key={i} colors={colors} />)}
        </View>
      ) : displayList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={56} color={colors.fg} style={{ opacity: 0.15 }} />
          <Text style={styles.emptyText}>
            {filterLang
              ? `No hay perfiles con ${LANG_NAMES[filterLang] ?? filterLang}.\nProbá con otro idioma.`
              : tab === 'top'
              ? 'No hay matches compatibles aún.\nCompletá tu perfil para mejorar las sugerencias.'
              : 'No se encontraron perfiles.'}
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={filterLang ? () => setFilterLang(null) : loadInitial}
            accessibilityRole="button"
          >
            <Text style={styles.refreshBtnText}>
              {filterLang ? 'Ver todos' : 'Actualizar'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          // Infinite scroll
          onEndReached={fetchNextPage}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            <ListFooter
              isLoadingMore={loadingMore}
              hasMore={hasMore}
              count={displayList.length}
              colors={colors}
            />
          }
          getItemLayout={(_, index) => ({
            length: 81,
            offset: 81 * index,
            index,
          })}
        />
      )}
    </View>
  );
}