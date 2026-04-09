// app/(tabs)/chats.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, Image, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Animated,
  StatusBar, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chat {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  other_user_native_lang: string;
  last_message: string;
  last_message_at: string;
  is_online: boolean;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

const T = {
  bg:          '#09090F',
  surface:     '#111118',
  card:        '#16161F',
  cardHover:   '#1C1C27',
  border:      '#1F1F2E',
  borderSoft:  '#16161F',
  accent:      '#7C6FF7',
  accentDim:   '#2D2960',
  accentGlow:  '#7C6FF720',
  text:        '#EEEEF5',
  textSub:     '#9898B8',
  textMuted:   '#55556A',
  online:      '#34D399',
  unread:      '#F87171',
  white:       '#FFFFFF',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'ahora';
  if (mins < 60)  return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d`;
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

function languageFlag(lang: string): string {
  const flags: Record<string, string> = {
    es: '🇪🇸', en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪',
    it: '🇮🇹', pt: '🇧🇷', ru: '🇷🇺', zh: '🇨🇳',
    ja: '🇯🇵', ko: '🇰🇷', ar: '🇸🇦', hi: '🇮🇳',
  };
  return flags[lang?.toLowerCase()] ?? '🌐';
}

// ─── Components ──────────────────────────────────────────────────────────────

function AvatarBubble({ name, avatar, online, size = 54 }: {
  name: string; avatar: string | null; online: boolean; size?: number;
}) {
  const initials = (name ?? '')
    .split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';

  return (
    <View style={{ width: size, height: size }}>
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.card }}
        />
      ) : (
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: T.accentDim,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1.5, borderColor: T.accent + '40',
        }}>
          <Text style={{ color: T.accent, fontWeight: '700', fontSize: size * 0.33 }}>
            {initials}
          </Text>
        </View>
      )}
      {online && (
        <View style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 13, height: 13, borderRadius: 7,
          backgroundColor: T.online,
          borderWidth: 2, borderColor: T.bg,
        }} />
      )}
    </View>
  );
}

function ChatRow({ item, onPress }: { item: Chat; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.chatRow, { transform: [{ scale }] }]}>
        <AvatarBubble name={item.other_user_name} avatar={item.other_user_avatar} online={item.is_online} />

        <View style={styles.chatBody}>
          <View style={styles.chatTop}>
            <View style={styles.nameRow}>
              <Text style={styles.chatName} numberOfLines={1}>{item.other_user_name}</Text>
              {item.other_user_native_lang ? (
                <Text style={styles.langFlag}>{languageFlag(item.other_user_native_lang)}</Text>
              ) : null}
            </View>
            <Text style={styles.chatTime}>{formatTime(item.last_message_at)}</Text>
          </View>

          <View style={styles.chatBottom}>
            <Text style={styles.chatPreview} numberOfLines={1}>
              {item.last_message || 'Iniciá la conversación'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function EmptyState({ search }: { search: boolean }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name={search ? 'search-outline' : 'chatbubbles-outline'} size={32} color={T.accent} />
      </View>
      <Text style={styles.emptyTitle}>
        {search ? 'Sin resultados' : 'Sin conversaciones'}
      </Text>
      <Text style={styles.emptyText}>
        {search
          ? 'Probá con otro nombre'
          : 'Cuando hagás match con alguien, el chat aparecerá acá'}
      </Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatsScreen() {
  const router = useRouter();
  const [chats,      setChats]      = useState<Chat[]>([]);
  const [filtered,   setFiltered]   = useState<Chat[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);

  const fetchChats = useCallback(async () => {
    setErrorMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChats([]); setFiltered([]); return; }

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) { setErrorMsg('No se pudieron cargar los chats'); return; }

      const rows: any[] = Array.isArray(data) ? data : [];

      const previews: Chat[] = await Promise.all(
        rows.map(async (conv) => {
          const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
          let otherName   = 'Usuario';
          let otherAvatar = null;
          let nativeLang  = '';

          if (otherId) {
            const { data: p } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, native_language')
              .eq('id', otherId)
              .single();
            if (p) {
              otherName   = p.full_name    ?? 'Usuario';
              otherAvatar = p.avatar_url   ?? null;
              nativeLang  = p.native_language ?? '';
            }
          }

          return {
            id:                    conv.id,
            other_user_id:         otherId      ?? '',
            other_user_name:       otherName,
            other_user_avatar:     otherAvatar,
            other_user_native_lang: nativeLang,
            last_message:          conv.last_message    ?? '',
            last_message_at:       conv.last_message_at ?? '',
            is_online:             false,
          };
        })
      );

      setChats(previews);
      applySearch(previews, search);
    } catch {
      setErrorMsg('Error inesperado. Tirá para recargar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  const applySearch = (data: Chat[], q: string) => {
    if (!q.trim()) { setFiltered(data); return; }
    setFiltered(data.filter(c =>
      c.other_user_name.toLowerCase().includes(q.toLowerCase())
    ));
  };

  useFocusEffect(useCallback(() => { fetchChats(); }, []));

  const handleSearch = (text: string) => {
    setSearch(text);
    applySearch(chats, text);
  };

  const handleRefresh = () => { setRefreshing(true); fetchChats(); };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mensajes</Text>
          {chats.length > 0 && (
            <Text style={styles.headerSub}>{chats.length} conversaciones</Text>
          )}
        </View>
        <Pressable style={styles.headerBtn} onPress={() => searchRef.current?.focus()}>
          <Ionicons name="options-outline" size={20} color={T.textSub} />
        </Pressable>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={15} color={T.textMuted} />
        <TextInput
          ref={searchRef}
          style={styles.searchInput}
          placeholder="Buscar conversación..."
          placeholderTextColor={T.textMuted}
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => handleSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={T.textMuted} />
          </Pressable>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.accent} size="large" />
          <Text style={styles.loadingText}>Cargando chats...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={T.textMuted} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchChats}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <ChatRow
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: item.id, userId: item.other_user_id },
                } as any)
              }
            />
          )}
          ListEmptyComponent={<EmptyState search={search.length > 0} />}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={T.accent}
              colors={[T.accent]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 30, fontWeight: '700', color: T.text, letterSpacing: -0.8 },
  headerSub:   { fontSize: 13, color: T.textMuted, marginTop: 2 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.card,
    marginHorizontal: 16, marginBottom: 6,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: T.border,
  },
  searchInput: { flex: 1, color: T.text, fontSize: 15, padding: 0 },

  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13,
    gap: 14,
  },
  chatBody:   { flex: 1 },
  chatTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  chatName:   { fontSize: 16, fontWeight: '600', color: T.text, flexShrink: 1 },
  langFlag:   { fontSize: 14 },
  chatTime:   { fontSize: 12, color: T.textMuted },
  chatBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatPreview:{ fontSize: 14, color: T.textSub, flex: 1 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: T.border, marginLeft: 88 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: T.textMuted, marginTop: 14, fontSize: 14 },
  errorText:   { color: T.textSub, marginTop: 14, fontSize: 15, textAlign: 'center' },
  retryBtn: {
    marginTop: 20, paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: T.accentDim, borderRadius: 12,
    borderWidth: 1, borderColor: T.accent + '50',
  },
  retryText: { color: T.accent, fontWeight: '600', fontSize: 15 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: T.accentGlow, borderWidth: 1, borderColor: T.accent + '30',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 10 },
  emptyText:  { fontSize: 15, color: T.textSub, textAlign: 'center', lineHeight: 22 },
});