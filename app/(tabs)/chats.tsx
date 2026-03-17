// app/(tabs)/chats.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode } from '../../src/theme';
import { MATCHES } from '../../src/mock/matches';

type ChatPreview = {
  id: string;
  name: string;
  lastMessage: string;
  ts: number;
};

export default function ChatsScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const previews: ChatPreview[] = MATCHES.map((m) => ({
        id: m.id,
        name: m.name,
        lastMessage: `Empezá a hablar con ${m.name}...`,
        ts: Date.now() - Math.random() * 1000 * 60 * 60 * 24,
      }));
      setChats(previews);
      setLoading(false);
    }, [])
  );

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return 'Ahora';
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 54 : 22,
        paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: '900' }}>Chats</Text>
        <Text style={{ color: colors.fg, opacity: 0.4, fontWeight: '700', marginTop: 2 }}>
          {chats.length} conversaciones
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : chats.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="chatbubbles-outline" size={52} color={colors.fg} style={{ opacity: 0.2 }} />
          <Text style={{ color: colors.fg, opacity: 0.35, fontWeight: '600', fontSize: 15 }}>
            Todavía no hay chats
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/matches' as any)}
            style={{ backgroundColor: colors.accent, borderRadius: 99, paddingHorizontal: 22, paddingVertical: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>Buscar personas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const initials = item.name.slice(0, 2).toUpperCase();
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/chat/${item.id}` as any)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 20, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: colors.border,
                }}
              >
                <View style={{
                  width: 50, height: 50, borderRadius: 25,
                  backgroundColor: colors.accent + '30',
                  borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center', justifyContent: 'center', marginRight: 14,
                }}>
                  <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 16 }}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
                  <Text style={{ color: colors.fg, opacity: 0.45, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
                <Text style={{ color: colors.fg, opacity: 0.3, fontSize: 12, fontWeight: '600' }}>
                  {formatTime(item.ts)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}