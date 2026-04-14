// app/(tabs)/chats.tsx
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
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ConversationRow = {
  id: string;
  users: string[];
  updated_at?: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  audio_url: string | null;
  created_at: string;
  is_read: boolean;
};

type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type ChatPreview = {
  conversationId: string;
  friendId: string;
  friendUsername: string;
  lastMessage: string;
  lastTs: number;
  unreadCount: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonItem({ colors }: { colors: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        opacity,
      }}
    >
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: colors.card,
          marginRight: 14,
        }}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ width: '45%', height: 14, borderRadius: 7, backgroundColor: colors.card }} />
        <View style={{ width: '70%', height: 12, borderRadius: 6, backgroundColor: colors.card }} />
      </View>
      <View style={{ width: 30, height: 10, borderRadius: 5, backgroundColor: colors.card }} />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Ahora';
  if (h < 24) return `${h}h`;
  if (h < 48) return 'Ayer';
  return `${Math.floor(h / 24)}d`;
}

function previewText(msg: MessageRow): string {
  if (msg.audio_url) return '🎵 Audio';
  return msg.content?.slice(0, 60) ?? 'Empezá la conversación…';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setMyUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    if (!myUserId) return;
    setLoading(true);

    // 1. Get all conversations this user is part of
    const { data: conversations, error: convErr } = await supabase
      .from('conversations')
      .select('id, users, updated_at')
      .contains('users', [myUserId])
      .order('updated_at', { ascending: false });

    if (convErr || !conversations?.length) {
      setChats([]);
      setLoading(false);
      return;
    }

    const convList = conversations as ConversationRow[];

    // 2. Get friend IDs
    const friendIds = convList.map((c) =>
      c.users.find((u) => u !== myUserId) ?? ''
    ).filter(Boolean);

    // 3. Load friend profiles in one query
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', friendIds);

    const profileMap = new Map<string, ProfileRow>(
      ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
    );

    // 4. For each conversation, get last message + unread count
    const previews = await Promise.all(
      convList.map(async (conv) => {
        const friendId = conv.users.find((u) => u !== myUserId) ?? '';
        const friend = profileMap.get(friendId);

        const { data: lastMsgArr } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = (lastMsgArr ?? [])[0] as MessageRow | undefined;

        const { count: unread } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', myUserId);

        return {
          conversationId: conv.id,
          friendId,
          friendUsername: friend?.username ?? 'Usuario',
          lastMessage: lastMsg ? previewText(lastMsg) : 'Empezá la conversación…',
          lastTs: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
          unreadCount: unread ?? 0,
        } satisfies ChatPreview;
      })
    );

    setChats(previews.sort((a, b) => b.lastTs - a.lastTs));
    setLoading(false);
  }, [myUserId]);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  // ── Realtime – update last message badge on new inserts ───────────────────
  useEffect(() => {
    if (!myUserId) return;

    const channel = supabase
      .channel('chats_list_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          loadChats();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myUserId, loadChats]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter(
      (c) =>
        c.friendUsername.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [chats, searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.bg,
        },
        header: {
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
        },
        headerTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        title: {
          color: colors.fg,
          fontSize: 30,
          fontWeight: '900',
          letterSpacing: -0.5,
        },
        subtitle: {
          color: colors.subtext,
          fontWeight: '700',
          fontSize: 13,
          marginTop: 2,
        },
        searchBar: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === 'ios' ? 10 : 8,
          marginTop: 12,
          gap: 8,
        },
        searchInput: {
          flex: 1,
          color: colors.fg,
          fontSize: 15,
          fontWeight: '500',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        avatarCircle: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.accent + '22',
          borderWidth: 1.5,
          borderColor: colors.accent + '44',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        },
        avatarText: {
          color: colors.accent,
          fontWeight: '900',
          fontSize: 17,
        },
        friendName: {
          color: colors.fg,
          fontWeight: '800',
          fontSize: 16,
        },
        lastMsg: {
          color: colors.subtext,
          fontSize: 13,
          marginTop: 2,
          fontWeight: '500',
        },
        timeText: {
          color: colors.subtext,
          fontSize: 12,
          fontWeight: '600',
        },
        badge: {
          backgroundColor: colors.accent,
          borderRadius: 99,
          minWidth: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 5,
          marginTop: 4,
        },
        badgeText: {
          color: '#fff',
          fontWeight: '900',
          fontSize: 11,
        },
        emptyContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          paddingHorizontal: 32,
        },
        emptyText: {
          color: colors.fg,
          opacity: 0.35,
          fontWeight: '600',
          fontSize: 15,
          textAlign: 'center',
        },
        ctaButton: {
          backgroundColor: colors.accent,
          borderRadius: 99,
          paddingHorizontal: 24,
          paddingVertical: 12,
        },
        ctaText: {
          color: '#fff',
          fontWeight: '900',
          fontSize: 15,
        },
      }),
    [colors, insets]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatPreview }) => {
      const initials = item.friendUsername.slice(0, 2).toUpperCase();
      const hasUnread = item.unreadCount > 0;
      return (
        <Pressable
          onPress={() => router.push(`/(tabs)/chat/${item.friendId}` as any)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          accessibilityLabel={`Chat con ${item.friendUsername}`}
          accessibilityRole="button"
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.friendName, hasUnread && { color: colors.accent }]}
              numberOfLines={1}
            >
              {item.friendUsername}
            </Text>
            <Text
              style={[styles.lastMsg, hasUnread && { fontWeight: '700', color: colors.fg }]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={styles.timeText}>
              {item.lastTs > 0 ? formatTime(item.lastTs) : ''}
            </Text>
            {hasUnread ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [router, styles, colors]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Chats</Text>
            <Text style={styles.subtitle}>
              {loading ? '…' : `${filteredChats.length} conversaciones`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSearchVisible((v) => !v);
              if (searchVisible) setSearchQuery('');
            }}
            accessibilityLabel={searchVisible ? 'Cerrar búsqueda' : 'Buscar chats'}
            accessibilityRole="button"
          >
            <Ionicons
              name={searchVisible ? 'close' : 'search'}
              size={22}
              color={colors.fg}
            />
          </TouchableOpacity>
        </View>

        {searchVisible ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.subtext} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por nombre o mensaje…"
              placeholderTextColor={colors.subtext}
              autoFocus
              accessibilityLabel="Buscar chats"
              accessibilityRole="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button">
                <Ionicons name="close-circle" size={16} color={colors.subtext} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonItem key={i} colors={colors} />
          ))}
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubbles-outline"
            size={56}
            color={colors.fg}
            style={{ opacity: 0.15 }}
          />
          <Text style={styles.emptyText}>
            {searchQuery
              ? `Sin resultados para "${searchQuery}"`
              : 'Todavía no hay chats.\n¡Conectate con alguien!'}
          </Text>
          {!searchQuery ? (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)/matches' as any)}
              accessibilityLabel="Buscar personas para chatear"
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>Buscar personas</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}