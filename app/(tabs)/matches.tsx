// app/(tabs)/matches.tsx
//
// ══════════════════════════════════════════════════════════════════════════════
// DISCOVERY / MATCHES — Exploración de perfiles para dar likes
//
// FIXES vs versión anterior:
//   - useTheme → useAppTheme (single source of truth)
//   - likes table: liker_id/liked_id → from_user_id/to_user_id (schema real)
//   - getDiscoveryProfiles() desde profilesStorage (excluye ya-likeados)
//   - Like button inline en cada card (no requiere abrir el perfil)
//   - Like optimista: UI actualiza inmediatamente, Supabase en background
//   - Animación de like con heart bounce
//   - calculateCompatibility preservado
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
  ActivityIndicator,
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

type MatchRow = {
  id:           string;
  name:         string;
  country:      string;
  nativeLang:   string;
  learningLangs: string[];
  interests:    string[];
  score:        number;
  photoUrl:     string | null;
  liked:        boolean;
};

type MyProfile = {
  interests:    string[];
  nativeLang:   string;
  learningLangs: string[];
};

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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function remoteToMatchRow(p: RemoteProfile, me: MyProfile): MatchRow {
  const score = calculateCompatibility(
    {
      interests:  me.interests,
      nativeLang: me.nativeLang as any,
      learning:   me.learningLangs as any[],
    },
    {
      id:         p.id,
      name:       p.displayName,
      nativeLang: p.nativeLang as any,
      learning:   (p.learning ?? []).map((l) => ({
        lang:  l.lang as any,
        level: l.level,
      })),
      interests: p.interests,
    },
  );

  return {
    id:           p.id,
    name:         p.displayName || '—',
    country:      p.country ?? '',
    nativeLang:   p.nativeLang,
    learningLangs: (p.learning ?? []).map((l) => l.lang),
    interests:    p.interests ?? [],
    score,
    photoUrl:     p.photoUrl ?? null,
    liked:        false,
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
        flexDirection:   'row',
        alignItems:      'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
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

function ScoreRing({
  score,
  size = 48,
}: {
  score: number;
  size?: number;
}) {
  const pct         = Math.round(Math.min(100, Math.max(0, score * 100)));
  const { color }   = scoreTier(score);

  return (
    <View
      style={{
        width:          size,
        height:         size,
        borderRadius:   size / 2,
        borderWidth:    2.5,
        borderColor:    color,
        backgroundColor: color + '18',
        alignItems:     'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontWeight: '900', fontSize: size * 0.3 }}>
        {pct}%
      </Text>
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

  const bounce = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60 }),
    ]).start();
  };

  const handlePress = () => {
    if (sending) return;
    bounce();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Quitar like' : 'Dar like'}
      style={{
        width:          44,
        height:         44,
        borderRadius:   22,
        alignItems:     'center',
        justifyContent: 'center',
        backgroundColor: liked ? '#FF375F15' : 'transparent',
        borderWidth:    1,
        borderColor:    liked ? '#FF375F' : 'transparent',
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

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const router       = useRouter();
  const { colors }   = useAppTheme();
  const insets       = useSafeAreaInsets();

  const [tab,        setTab]        = useState<TabId>('top');
  const [matches,    setMatches]    = useState<MatchRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterLang, setFilterLang] = useState<string | null>(null);
  const [myUserId,   setMyUserId]   = useState<string | null>(null);
  /** IDs de filas con like en proceso (para el spinner individual) */
  const [sending,    setSending]    = useState<Set<string>>(new Set());

  // ── Bootstrap auth ──────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user.id ?? null);
    });
  }, []);

  // ── Carga de perfiles ────────────────────────────────────────────────────────

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const myId    = session.data.session?.user.id;

      const [myProf, remoteProfiles] = await Promise.all([
        getProfile(),
        getDiscoveryProfiles(60),
      ]);

      const me: MyProfile = {
        interests:    myProf.interests ?? [],
        nativeLang:   myProf.nativeLang ?? '',
        learningLangs: (myProf.languageLearning?.learn ?? []).map(
          (x) => (x?.lang ?? '') as string,
        ),
      };

      // getDiscoveryProfiles ya excluye al propio usuario y a los ya-likeados
      const rows = (remoteProfiles ?? [])
        .filter((p) => p?.id && p.id !== myId)
        .map((p) => remoteToMatchRow(p, me))
        .sort((a, b) => b.score - a.score);

      setMatches(rows);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMatches(); }, [loadMatches]));

  // ── Like / Unlike ────────────────────────────────────────────────────────────

  const toggleLike = useCallback(async (targetId: string) => {
    if (!myUserId) return;

    const isCurrentlyLiked = matches.find((m) => m.id === targetId)?.liked ?? false;

    // Optimistic update
    setMatches((prev) =>
      prev.map((m) => m.id === targetId ? { ...m, liked: !isCurrentlyLiked } : m),
    );
    setSending((prev) => new Set(prev).add(targetId));

    try {
      if (isCurrentlyLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('from_user_id', myUserId)
          .eq('to_user_id', targetId);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Like — upsert por si hay race condition
        await supabase
          .from('likes')
          .upsert(
            {
              from_user_id: myUserId,
              to_user_id:   targetId,
              created_at:   new Date().toISOString(),
            },
            { onConflict: 'from_user_id,to_user_id' },
          );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Revertir en caso de error
      setMatches((prev) =>
        prev.map((m) => m.id === targetId ? { ...m, liked: isCurrentlyLiked } : m),
      );
    } finally {
      setSending((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, [myUserId, matches]);

  // ── Datos derivados ──────────────────────────────────────────────────────────

  const filteredMatches = useMemo(() => {
    if (!filterLang) return matches;
    return matches.filter(
      (m) =>
        m.nativeLang === filterLang ||
        m.learningLangs.includes(filterLang),
    );
  }, [matches, filterLang]);

  const topMatches = useMemo(
    () => filteredMatches.filter((m) => m.score >= 0.3).slice(0, 30),
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
          width:          52,
          height:         52,
          borderRadius:   26,
          backgroundColor: colors.card,
          borderWidth:    1,
          borderColor:    colors.border,
          alignItems:     'center',
          justifyContent: 'center',
          overflow:       'hidden',
        },
        avatarText: { fontWeight: '900', fontSize: 18, color: colors.accent },
        name:       { color: colors.fg, fontWeight: '900', fontSize: 16 },
        meta:       { color: colors.subtext, fontWeight: '700', fontSize: 13, marginTop: 2 },
        interestLine: { color: colors.subtext, fontSize: 12, marginTop: 3 },
        emptyContainer: {
          flex:           1,
          alignItems:     'center',
          justifyContent: 'center',
          gap:            14,
          paddingHorizontal: 32,
          paddingTop:     60,
        },
        emptyText: {
          color:      colors.subtext,
          fontWeight: '600',
          fontSize:   15,
          textAlign:  'center',
        },
        refreshBtn: {
          backgroundColor: colors.accent,
          borderRadius:    99,
          paddingHorizontal: 24,
          paddingVertical:   12,
        },
        refreshBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
        topBadge: {
          backgroundColor: colors.accent,
          borderRadius:    99,
          paddingHorizontal: 7,
          paddingVertical: 2,
        },
      }),
    [colors, insets],
  );

  // ── Render item ──────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: MatchRow; index: number }) => {
      const initials    = item.name.slice(0, 2).toUpperCase();
      const isTop       = index === 0 && tab === 'top';
      const nativeName  = LANG_NAMES[item.nativeLang] ?? item.nativeLang;
      const learningNames = item.learningLangs
        .map((l) => LANG_NAMES[l] ?? l)
        .join(', ');

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
          {/* Avatar */}
          <View style={styles.avatar}>
            {item.photoUrl ? (
              <Image
                source={{ uri: item.photoUrl }}
                style={{ width: 52, height: 52 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>

          {/* Info */}
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

          {/* Like button */}
          <LikeButton
            liked={item.liked}
            sending={sending.has(item.id)}
            onPress={() => toggleLike(item.id)}
          />

          {/* Score ring */}
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
                : `${displayList.length} perfiles${filterLang ? ` · ${LANG_NAMES[filterLang] ?? filterLang}` : ''}`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={loadMatches}
            style={{ padding: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Actualizar lista"
          >
            <Ionicons name="refresh-outline" size={22} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
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

      {/* Filtros por idioma */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {/* Chip "Todos" */}
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
            {matches.length}
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
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonRow key={i} colors={colors} />
          ))}
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
            onPress={filterLang ? () => setFilterLang(null) : loadMatches}
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
          windowSize={10}
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