// app/(tabs)/home.tsx
//
// ══════════════════════════════════════════════════════════════════════════════
// HOME — Lista de matches del usuario actual.
//
// SCHEMA REAL (tabla matches):
//   id, user1_id, user2_id, created_at
//   → siempre user1_id < user2_id (constraint del trigger)
//   → NO tiene conversation_id ni matched_user_id
//
// ESTRATEGIA DE QUERY:
//   1. Fetch matches donde user1_id = me  OR  user2_id = me
//   2. Por cada match, determinar el otherId
//   3. Fetch profiles de todos los otherIds en una sola query
//   4. Merge → MatchPreview[]
//
// CONVERSATION ID:
//   Se deriva de los dos UUIDs ordenados alfabéticamente (igual que buildConversationId.ts)
//   para garantizar consistencia con chat/[id].tsx
//
// REALTIME:
//   Suscripción a INSERT en matches para que aparezcan nuevos matches en vivo
//   sin necesidad de pull-to-refresh.
// ══════════════════════════════════════════════════════════════════════════════

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Image,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../src/lib/supabase';
import { useAppTheme } from '../../src/theme';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

interface MatchPreview {
  /** ID del match en la tabla matches */
  matchId: string;
  /** ID del otro usuario (no el mío) */
  otherId: string;
  displayName: string;
  username: string | null;
  country: string | null;
  nativeLang: string | null;
  photoUri: string | null;
  /** ID de conversación derivado de los dos UUIDs, compatible con chat/[id].tsx */
  conversationId: string;
  matchedAt: string;
}

interface SupabaseMatchRow {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

interface SupabaseProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  native_language: string | null;
  avatar_url: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera el conversation_id a partir de dos user UUIDs.
 * Siempre ordena alfabéticamente para que A↔B y B↔A generen el mismo ID.
 * Debe ser idéntico a la lógica de buildConversationId.ts
 */
function buildConversationId(userA: string, userB: string): string {
  return [userA, userB].sort().join('_');
}

const FLAGS: Record<string, string> = {
  es: '🇦🇷', en: '🇺🇸', de: '🇩🇪',
  ja: '🇯🇵', ru: '🇷🇺', zh: '🇨🇳',
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);
  if (min < 1)  return 'ahora';
  if (min < 60) return `hace ${min}m`;
  if (h < 24)   return `hace ${h}h`;
  if (d === 1)  return 'ayer';
  if (d < 7)    return `hace ${d}d`;
  return new Date(isoDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({
  item,
  onPress,
  colors,
  spacing,
  radii,
  fontSizes,
}: {
  item: MatchPreview;
  onPress: () => void;
  colors:    ReturnType<typeof useAppTheme>['colors'];
  spacing:   ReturnType<typeof useAppTheme>['spacing'];
  radii:     ReturnType<typeof useAppTheme>['radii'];
  fontSizes: ReturnType<typeof useAppTheme>['fontSizes'];
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();

  const initials = item.displayName.trim().slice(0, 2).toUpperCase() || '?';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor:     colors.border,
            borderRadius:    radii.md,
            marginHorizontal: spacing.md,
            marginBottom:    spacing.sm,
          },
        ]}
        accessibilityLabel={`Chat con ${item.displayName}`}
        accessibilityRole="button"
      >
        {/* Avatar */}
        {item.photoUri ? (
          <Image
            source={{ uri: item.photoUri }}
            style={[styles.avatar, { borderRadius: radii.full }]}
            accessibilityLabel={`Foto de ${item.displayName}`}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: colors.accentSoft,
                borderRadius:    radii.full,
              },
            ]}
          >
            <Text style={[styles.avatarInitials, { color: colors.accent, fontSize: fontSizes.lg }]}>
              {initials}
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardName, { color: colors.fg, fontSize: fontSizes.md }]}
            numberOfLines={1}
          >
            {item.displayName}
          </Text>
          <View style={styles.cardMeta}>
            {item.country ? (
              <Text style={[styles.cardSub, { color: colors.subtext }]} numberOfLines={1}>
                {item.country}
              </Text>
            ) : null}
            {item.nativeLang ? (
              <View style={[styles.langBadge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.langBadgeText, { color: colors.accent }]}>
                  {FLAGS[item.nativeLang] ?? '🌍'} {item.nativeLang.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.cardTime, { color: colors.subtext }]}>
            {formatRelativeTime(item.matchedAt)}
          </Text>
        </View>

        {/* CTA */}
        <View style={[styles.chatIcon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="chatbubble-ellipses" size={18} color={colors.accent} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState({ colors, onExplore }: {
  colors: ReturnType<typeof useAppTheme>['colors'];
  onExplore: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🌍</Text>
      <Text style={[styles.emptyTitle, { color: colors.fg }]}>
        Todavía no tenés matches
      </Text>
      <Text style={[styles.emptySub, { color: colors.subtext }]}>
        Explorá perfiles, dale like a quien te interese y cuando sea mutuo aparece acá.
      </Text>
      <Pressable
        onPress={onExplore}
        style={[styles.exploreBtn, { backgroundColor: colors.accent }]}
      >
        <Ionicons name="search" size={16} color="#fff" />
        <Text style={styles.exploreBtnText}>Explorar perfiles</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ message, onRetry, colors }: {
  message: string;
  onRetry: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="cloud-offline-outline" size={52} color={colors.subtext} style={{ opacity: 0.4 }} />
      <Text style={[styles.errorMsg, { color: colors.subtext }]}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={[styles.retryBtn, { backgroundColor: colors.accent }]}
      >
        <Text style={styles.retryBtnText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function NewMatchBanner({ count, onPress, colors }: {
  count: number;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  if (count === 0) return null;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.newMatchBanner, { backgroundColor: colors.accent }]}
    >
      <Ionicons name="heart" size={14} color="#fff" />
      <Text style={styles.newMatchBannerText}>
        {count === 1 ? '1 nuevo match' : `${count} nuevos matches'`} — Tocá para actualizar
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, fontSizes, radii } = useAppTheme();

  const [matches,    setMatches]    = useState<MatchPreview[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [newCount,   setNewCount]   = useState(0);

  const currentUserIdRef = useRef<string | null>(null);

  // ── Carga de matches ────────────────────────────────────────────────────────

  const loadMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      currentUserIdRef.current = user.id;

      // PASO 1: Traer todos los matches donde soy user1 o user2
      const { data: matchRows, error: matchErr } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (matchErr) throw matchErr;
      if (!matchRows || matchRows.length === 0) {
        setMatches([]);
        return;
      }

      // PASO 2: Determinar IDs del otro usuario en cada match
      const rows = matchRows as SupabaseMatchRow[];
      const otherIds = rows.map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id,
      );

      // PASO 3: Traer perfiles de todos los otros usuarios en una sola query
      const { data: profileRows, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, username, country, native_language, avatar_url')
        .in('id', otherIds);

      if (profileErr) throw profileErr;

      const profileMap = new Map<string, SupabaseProfileRow>(
        (profileRows ?? []).map((p: SupabaseProfileRow) => [p.id, p]),
      );

      // PASO 4: Merge
      const previews: MatchPreview[] = rows.map((m) => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        const prof    = profileMap.get(otherId);
        return {
          matchId:        m.id,
          otherId,
          displayName:    prof?.full_name    ?? 'Usuario',
          username:       prof?.username     ?? null,
          country:        prof?.country      ?? null,
          nativeLang:     prof?.native_language ?? null,
          photoUri:       prof?.avatar_url   ?? null,
          conversationId: buildConversationId(user.id, otherId),
          matchedAt:      m.created_at,
        };
      });

      setMatches(previews);
      setNewCount(0);

    } catch (e: any) {
      setError('No se pudieron cargar los matches. Revisá tu conexión.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Focus refresh ───────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches]),
  );

  // ── Realtime: nuevos matches en vivo ────────────────────────────────────────

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`home_matches_${user.id}`)
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'matches',
            // Supabase realtime filtra en el cliente para OR
          },
          (payload) => {
            const row = payload.new as SupabaseMatchRow;
            const isMyMatch =
              row.user1_id === user.id || row.user2_id === user.id;
            if (isMyMatch) {
              setNewCount((c) => c + 1);
            }
          },
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches(true);
  };

  const handleNewMatchBanner = () => {
    setNewCount(0);
    loadMatches(true);
  };

  // ── Estados de carga/error ──────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ErrorState message={error} onRetry={() => loadMatches()} colors={colors} />
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 24 }]}>
        <Text style={[styles.headerTitle, { color: colors.fg, fontSize: fontSizes.xl }]}>
          Tus conexiones 🌍
        </Text>
        <Text style={[styles.headerSub, { color: colors.subtext }]}>
          {matches.length === 0
            ? 'Acá aparecerán tus matches'
            : `${matches.length} ${matches.length === 1 ? 'conexión' : 'conexiones'}`}
        </Text>
      </View>

      {/* Banner de nuevos matches en tiempo real */}
      <NewMatchBanner
        count={newCount}
        onPress={handleNewMatchBanner}
        colors={colors}
      />

      {/* Lista o empty state */}
      {matches.length === 0 ? (
        <EmptyState
          colors={colors}
          onExplore={() => router.push('/(tabs)/matches' as any)}
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.matchId}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          renderItem={({ item }) => (
            <MatchCard
              item={item}
              colors={colors}
              spacing={spacing}
              radii={radii}
              fontSizes={fontSizes}
              onPress={() =>
                router.push(`/(tabs)/chat/${item.conversationId}` as any)
              }
            />
          )}
          // Optimizaciones de rendimiento
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={12}
          getItemLayout={(_, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom:     12,
  },
  headerTitle: { fontWeight: '900', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, marginTop: 2, fontWeight: '500' },

  // Banner
  newMatchBanner: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'center',
    gap:              6,
    marginHorizontal: 16,
    marginBottom:     8,
    paddingVertical:  10,
    borderRadius:     12,
  },
  newMatchBannerText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Card
  card: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       12,
    borderWidth:   1,
  },
  avatar: {
    width:       52,
    height:      52,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width:          52,
    height:         52,
    marginRight:    12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontWeight: '800' },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardSub:  { fontSize: 12 },
  cardTime: { fontSize: 11, marginTop: 2 },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      99,
  },
  langBadgeText: { fontSize: 10, fontWeight: '700' },
  chatIcon: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    marginLeft:     8,
  },

  // Empty
  emptyContainer: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        32,
    gap:            12,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptySub:   { fontSize: 14, textAlign: 'center', lineHeight: 20, opacity: 0.7 },
  exploreBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius:    99,
    marginTop:       8,
  },
  exploreBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Error
  errorMsg:     { textAlign: 'center', fontSize: 14, lineHeight: 20, marginTop: 12 },
  retryBtn:     { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryBtnText: { color: '#fff', fontWeight: '700' },
});