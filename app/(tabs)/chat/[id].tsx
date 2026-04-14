// app/(tabs)/chat/[id].tsx
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
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// @types/react-native@0.73 has incomplete Modal typings for RN 0.81
const TypedModal = Modal as React.ComponentType<{
  visible: boolean; transparent?: boolean; animationType?: string;
  onRequestClose?: () => void; statusBarTranslucent?: boolean;
  children?: React.ReactNode;
}>;

import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../../src/lib/supabase';
import { useThemeMode } from '../../../src/theme.tsx';
import { useAudioRecorder, useAudioPlayer } from '../../../src/hooks/useAudioRecorder';
import MessageBubble, { type ChatMessage } from '../../../src/components/chat/MessageBubble';
import TypingIndicator from '../../../src/components/chat/TypingIndicator';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DBMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  audio_url: string | null;
  created_at: string;
  is_read: boolean;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  native_language: string | null;
  learning_language: string | null;
};

type TranslatorState = {
  visible: boolean;
  text: string;
  translating: boolean;
  result: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildConversationId(userA: string, userB: string): string {
  return [userA, userB].sort().join('_');
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = diffMs / 3_600_000;

  if (diffH < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffH < 48) return 'Ayer';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function dbMessageToChatMessage(msg: DBMessage, myUserId: string): ChatMessage {
  return {
    id: msg.id,
    text: msg.content ?? (msg.audio_url ? '🎵 Audio' : ''),
    from: msg.sender_id === myUserId ? 'me' : 'them',
    ts: new Date(msg.created_at).getTime(),
    status: msg.is_read ? 'seen' : 'sent',
    audioUrl: msg.audio_url ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

function MessageSkeleton({ colors }: { colors: any }) {
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

  const bar = (width: number | string, alignSelf: 'flex-start' | 'flex-end', mt = 0) => (
    <Animated.View
      style={{
        width,
        height: 42,
        borderRadius: 18,
        backgroundColor: colors.card,
        opacity,
        marginTop: mt,
        alignSelf,
        marginHorizontal: 12,
      }}
    />
  );

  return (
    <View style={{ paddingVertical: 12 }}>
      {bar('55%', 'flex-start')}
      {bar('70%', 'flex-end', 8)}
      {bar('42%', 'flex-start', 8)}
      {bar('65%', 'flex-end', 8)}
      {bar('50%', 'flex-start', 8)}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio bubble (mensajes de audio recibidos/enviados)
// ─────────────────────────────────────────────────────────────────────────────

function AudioBubble({
  msg,
  colors,
}: {
  msg: ChatMessage & { audioUrl: string };
  colors: any;
}) {
  const { playingUri, progress, play } = useAudioPlayer();
  const isPlaying = playingUri === msg.audioUrl;
  const isMe = msg.from === 'me';

  return (
    <View style={{ paddingHorizontal: 12, marginVertical: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
        <Pressable
          onPress={() => play(msg.audioUrl)}
          accessibilityLabel={isPlaying ? 'Detener audio' : 'Reproducir audio'}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isMe ? colors.accent : colors.card,
            borderRadius: 18,
            borderTopLeftRadius: isMe ? 18 : 6,
            borderTopRightRadius: isMe ? 6 : 18,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderWidth: isMe ? 0 : 1,
            borderColor: colors.border,
            gap: 10,
            minWidth: 140,
          }}
        >
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={28}
            color={isMe ? '#fff' : colors.accent}
          />
          {/* waveform simulada */}
          <View style={{ flex: 1, height: 20, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {Array.from({ length: 18 }).map((_, i) => {
              const barH = 4 + Math.abs(Math.sin(i * 0.8)) * 12;
              const filled = progress > 0 && i / 18 <= progress;
              return (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: barH,
                    borderRadius: 2,
                    backgroundColor: filled
                      ? isMe ? '#fff' : colors.accent
                      : isMe ? 'rgba(255,255,255,0.35)' : colors.border,
                  }}
                />
              );
            })}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Translator bottom sheet inline
// ─────────────────────────────────────────────────────────────────────────────

async function quickTranslate(text: string, targetLang: string): Promise<string | null> {
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx' +
      '&sl=auto&tl=' + targetLang +
      '&dt=t&q=' + encodeURIComponent(text);
    const res = await Promise.race([
      fetch(url),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!res || typeof res === 'object' && !('ok' in res)) return null;
    if (!(res as Response).ok) return null;
    const data = await (res as Response).json();
    const segments: string[] = ((data as any[][])[0] ?? []).map((s: any[]) => s[0] ?? '');
    return segments.join('').trim() || null;
  } catch {
    return null;
  }
}

function TranslatorSheet({
  state,
  onClose,
  targetLang,
  colors,
}: {
  state: TranslatorState;
  onClose: () => void;
  targetLang: string;
  colors: any;
}) {
  const slideY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (state.visible) {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [state.visible, slideY]);

  if (!state.visible && !state.text) return null;

  return (
    <TypedModal
      visible={state.visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
        onPress={onClose}
        accessibilityLabel="Cerrar traductor"
        accessibilityRole="button"
      />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingBottom: Platform.OS === 'ios' ? 40 : 24,
          paddingTop: 20,
          transform: [{ translateY: slideY }],
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        }}
      >
        {/* handle */}
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
            alignSelf: 'center',
            marginBottom: 18,
          }}
        />

        <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          ORIGINAL
        </Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 16, lineHeight: 22 }}>
          {state.text}
        </Text>

        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />

        <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          TRADUCCIÓN
        </Text>
        {state.translating ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '800', lineHeight: 26 }}>
            {state.result ?? '—'}
          </Text>
        )}

        <TouchableOpacity
          onPress={onClose}
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
          style={{
            marginTop: 24,
            backgroundColor: colors.accent + '18',
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 15 }}>Cerrar</Text>
        </TouchableOpacity>
      </Animated.View>
    </TypedModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recording overlay
// ─────────────────────────────────────────────────────────────────────────────

function RecordingOverlay({
  seconds,
  onCancel,
  colors,
}: {
  seconds: number;
  onCancel: () => void;
  colors: any;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingVertical: 18,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Animated.View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#f44336',
          transform: [{ scale: pulse }],
        }}
      />
      <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 18 }}>
        {mm}:{ss}
      </Text>
      <TouchableOpacity
        onPress={onCancel}
        accessibilityLabel="Cancelar grabación"
        accessibilityRole="button"
      >
        <Text style={{ color: '#f44336', fontWeight: '700', fontSize: 15 }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id: friendId } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { colors } = useThemeMode();
  const insets = useSafeAreaInsets();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const conversationId = useMemo(
    () => (myUserId && friendId ? buildConversationId(myUserId, friendId) : null),
    [myUserId, friendId]
  );

  // ── Remote state ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [theyAreTyping, setTheyAreTyping] = useState(false);

  // ── Input state ───────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // ── Audio ─────────────────────────────────────────────────────────────────
  const { isRecording, recordSeconds, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder();

  // ── Translator ────────────────────────────────────────────────────────────
  const [translator, setTranslator] = useState<TranslatorState>({
    visible: false,
    text: '',
    translating: false,
    result: null,
  });

  // ── Refs ──────────────────────────────────────────────────────────────────
  const listRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Bootstrap
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user.id ?? null);
    });
  }, []);

  // Load friend profile
  useEffect(() => {
    if (!friendId) return;
    supabase
      .from('profiles')
      .select('id, username, avatar_url, native_language, learning_language')
      .eq('id', friendId)
      .single()
      .then(({ data }) => {
        if (data) setFriendProfile(data as Profile);
      });
  }, [friendId]);

  // Set nav header
  useLayoutEffect(() => {
    if (!friendProfile) return;
    navigation.setOptions({
      title: friendProfile.username,
      headerBackTitle: '',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
      ),
    });
  }, [friendProfile, navigation, router, colors.accent]);

  // Load + subscribe messages
  useEffect(() => {
    if (!conversationId || !myUserId) return;

    let isMounted = true;

    // Ensure conversation row exists (upsert safe)
    supabase
      .from('conversations')
      .upsert({ id: conversationId, users: [myUserId, friendId] }, { ignoreDuplicates: true })
      .then(() => {
        // Load initial messages
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            if (!isMounted) return;
            if (error) {
              setLoading(false);
              return;
            }
            const mapped = (data ?? []).map((m) =>
              dbMessageToChatMessage(m as DBMessage, myUserId)
            );
            setMessages(mapped);
            setLoading(false);
          });
      });

    // Realtime subscription
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const incoming = payload.new as DBMessage;
          // Skip optimistic messages we already added
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, dbMessageToChatMessage(incoming, myUserId)];
          });
          // Mark as read if from friend
          if (incoming.sender_id !== myUserId) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', incoming.id)
              .then(() => {});
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== myUserId) {
          setTheyAreTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTheyAreTyping(false), 3000);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      isMounted = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, myUserId, friendId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const broadcastTyping = useCallback(() => {
    typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: myUserId },
    });
  }, [myUserId]);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputText(text);
      broadcastTyping();
    },
    [broadcastTyping]
  );

  const sendTextMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !myUserId || !conversationId || sending) return;

    setSendError(null);
    setInputText('');

    // Optimistic update
    const optimisticId = `opt_${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      text,
      from: 'me',
      ts: Date.now(),
      status: 'sent',
    };
    setMessages((prev) => [...prev, optimistic]);

    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: myUserId,
        content: text,
        audio_url: null,
        is_read: false,
      })
      .select('id')
      .single();
    setSending(false);

    if (error) {
      // Rollback optimistic update
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setSendError('No se pudo enviar. Intentá de nuevo.');
      setInputText(text);
      return;
    }

    // Replace optimistic with real ID
    if (data?.id) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, id: data.id } : m))
      );
    }
  }, [inputText, myUserId, conversationId, sending]);

  const handleAudioSend = useCallback(async () => {
    if (!myUserId || !conversationId) return;

    const audio = await stopRecording();
    if (!audio) return;

    const fileName = `${myUserId}/${Date.now()}.m4a`;

    // React Native: pass the file object directly — Supabase JS client
    // accepts { uri, type, name } as a React Native file descriptor.
    const rnFile = {
      uri: audio.uri,
      name: fileName.split('/').pop() ?? 'audio.m4a',
      type: 'audio/m4a',
    } as unknown as File;

    setSending(true);
    const { error: uploadError } = await supabase.storage
      .from('audio-messages')
      .upload(fileName, rnFile, { contentType: 'audio/m4a', upsert: false });

    if (uploadError) {
      setSending(false);
      Alert.alert('Error', 'No se pudo subir el audio.');
      return;
    }

    const { data: urlData } = supabase.storage
      .from('audio-messages')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Optimistic
    const optimisticId = `opt_audio_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, text: '🎵 Audio', from: 'me', ts: Date.now(), status: 'sent', audioUrl: publicUrl },
    ]);

    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: myUserId,
        content: null,
        audio_url: publicUrl,
        is_read: false,
      })
      .select('id')
      .single();

    setSending(false);

    if (insertError) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      Alert.alert('Error', 'No se pudo enviar el audio.');
      return;
    }

    if (data?.id) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, id: data.id } : m))
      );
    }
  }, [myUserId, conversationId, stopRecording]);

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      await handleAudioSend();
    } else {
      const started = await startRecording();
      if (!started) {
        Alert.alert('Permiso requerido', 'Necesitás dar permiso de micrófono para enviar audios.');
      }
    }
  }, [isRecording, handleAudioSend, startRecording]);

  const handleTranslate = useCallback(async (text: string) => {
    setTranslator({ visible: true, text, translating: true, result: null });
    // Use 'es' as default target (user's app language)
    const result = await quickTranslate(text, 'es');
    setTranslator((prev) => ({ ...prev, translating: false, result }));
  }, []);

  const closeTranslator = useCallback(() => {
    setTranslator((prev) => ({ ...prev, visible: false }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage & { audioUrl?: string } }) => {
      if (item.audioUrl) {
        return (
          <AudioBubble
            msg={item as ChatMessage & { audioUrl: string }}
            colors={colors}
          />
        );
      }
      return (
        <MessageBubble
          msg={item}
          onPressThemMessage={handleTranslate}
        />
      );
    },
    [colors, handleTranslate]
  );

  const renderDateSeparator = useCallback(
    (ts: number) => (
      <View
        style={{ alignItems: 'center', marginVertical: 10 }}
        key={`date_${ts}`}
      >
        <Text
          style={{
            color: colors.subtext,
            fontSize: 12,
            fontWeight: '600',
            backgroundColor: colors.card,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          {formatTimestamp(new Date(ts).toISOString())}
        </Text>
      </View>
    ),
    [colors]
  );

  // Inject date separators between messages
  const messagesWithSeparators = useMemo(() => {
    const result: Array<ChatMessage & { _dateSep?: boolean }> = [];
    let lastDate = '';
    for (const msg of messages) {
      const d = new Date(msg.ts ?? 0).toDateString();
      if (d !== lastDate) {
        result.push({ ...msg, id: `sep_${msg.id}`, _dateSep: true });
        lastDate = d;
      }
      result.push(msg);
    }
    return result;
  }, [messages]);

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
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        backBtn: {
          marginRight: 8,
          padding: 4,
        },
        avatar: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: colors.accent + '30',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        },
        avatarText: {
          color: colors.accent,
          fontWeight: '800',
          fontSize: 15,
        },
        headerName: {
          color: colors.fg,
          fontWeight: '800',
          fontSize: 17,
        },
        headerLang: {
          color: colors.subtext,
          fontSize: 12,
          fontWeight: '600',
          marginTop: 1,
        },
        listContent: {
          paddingTop: 12,
          paddingBottom: 8,
        },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 8,
        },
        textInput: {
          flex: 1,
          backgroundColor: colors.bg,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
          color: colors.fg,
          fontSize: 15,
          maxHeight: 110,
          fontWeight: '500',
        },
        sendBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        micBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        errorBanner: {
          backgroundColor: '#f44336',
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        errorText: {
          color: '#fff',
          fontWeight: '700',
          fontSize: 13,
          flex: 1,
        },
        typingRow: {
          paddingHorizontal: 16,
          paddingBottom: 8,
        },
        emptyState: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          gap: 12,
        },
        emptyIcon: {
          opacity: 0.2,
        },
        emptyText: {
          color: colors.fg,
          opacity: 0.45,
          fontWeight: '600',
          fontSize: 15,
          textAlign: 'center',
        },
      }),
    [colors, insets]
  );

  const initials = friendProfile?.username?.slice(0, 2).toUpperCase() ?? '??';
  const hasText = inputText.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            {friendProfile?.username ?? '...'}
          </Text>
          {friendProfile?.native_language ? (
            <Text style={styles.headerLang}>
              {friendProfile.native_language}
              {friendProfile.learning_language
                ? ` → aprende ${friendProfile.learning_language}`
                : ''}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityLabel="Más opciones"
          accessibilityRole="button"
          onPress={() => {}}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      {/* Error banner */}
      {sendError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{sendError}</Text>
          <TouchableOpacity onPress={() => setSendError(null)}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <MessageSkeleton colors={colors} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={56}
              color={colors.fg}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>
              Todavía no hay mensajes.{'\n'}¡Mandá el primero!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messagesWithSeparators}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item }) => {
              if ((item as any)._dateSep) {
                return renderDateSeparator(item.ts ?? 0);
              }
              return renderMessage({ item });
            }}
            ListFooterComponent={
              theyAreTyping ? (
                <View style={styles.typingRow}>
                  <TypingIndicator />
                </View>
              ) : null
            }
          />
        )}

        {/* Recording overlay */}
        {isRecording ? (
          <RecordingOverlay
            seconds={recordSeconds}
            onCancel={cancelRecording}
            colors={colors}
          />
        ) : (
          /* Input row */
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={handleTextChange}
              placeholder="Escribí un mensaje…"
              placeholderTextColor={colors.subtext}
              multiline
              returnKeyType="default"
              accessibilityLabel="Campo de mensaje"
              accessibilityRole="none"
            />
            {hasText ? (
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={sendTextMessage}
                disabled={sending}
                accessibilityLabel="Enviar mensaje"
                accessibilityRole="button"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micBtn}
                onPress={handleMicPress}
                accessibilityLabel="Grabar audio"
                accessibilityRole="button"
              >
                <Ionicons name="mic" size={20} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Translator sheet */}
      <TranslatorSheet
        state={translator}
        onClose={closeTranslator}
        targetLang="es"
        colors={colors}
      />
    </View>
  );
}