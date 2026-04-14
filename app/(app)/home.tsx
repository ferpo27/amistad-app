// app/(tabs)/home.tsx
//
// FIX: Pantalla de inicio real con lista de matches.
// Antes era un stub con "TODO: Render list of matches using savedIds".

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  StyleSheet, TouchableOpacity, Image, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAppTheme } from '../../src/theme';

type MatchPreview = {
  id: string;
  name: string;
  country: string;
  photo: string | null;
  nativeLang: string;
  conversationId: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, fontSizes, radii } = useAppTheme();

  const [matches, setMatches] = useState<MatchPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: err } = await supabase
        .from('matches')
        .select(`
          id,
          conversation_id,
          matched_user:profiles!matches_matched_user_id_fkey (
            id, full_name, country, native_lang, photos
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const previews: MatchPreview[] = (data ?? []).map((m: any) => ({
        id: m.matched_user?.id ?? m.id,
        name: m.matched_user?.full_name ?? 'Usuario',
        country: m.matched_user?.country ?? '',
        nativeLang: m.matched_user?.native_lang ?? '',
        photo: m.matched_user?.photos?.[0] ?? null,
        conversationId: m.conversation_id,
      }));

      setMatches(previews);
    } catch (e: any) {
      setError('No se pudieron cargar los matches. Revisá tu conexión.');
      console.error('loadMatches error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches(true);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => loadMatches()}
          accessibilityLabel="Reintentar carga de matches"
          accessibilityRole="button"
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text, fontSize: fontSizes.xl }]}>
        Tus conexiones 🌍
      </Text>

      {matches.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            Todavía no tenés matches.{'\n'}¡Explorá perfiles para conectar!
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  marginHorizontal: spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
              onPress={() =>
                router.push(`/(tabs)/chat/${item.conversationId}` as any)
              }
              accessibilityLabel={`Chat con ${item.name} de ${item.country}`}
              accessibilityRole="button"
            >
              {item.photo ? (
                <Image
                  source={{ uri: item.photo }}
                  style={[styles.avatar, { borderRadius: radii.full }]}
                  accessibilityLabel={`Foto de ${item.name}`}
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      backgroundColor: colors.primarySoft,
                      borderRadius: radii.full,
                    },
                  ]}
                >
                  <Text style={{ fontSize: fontSizes.xl }}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text
                  style={[styles.cardName, { color: colors.text, fontSize: fontSizes.md }]}
                >
                  {item.name}
                </Text>
                <Text style={[styles.cardSub, { color: colors.subtext }]}>
                  {item.country}
                  {item.nativeLang ? ` · ${item.nativeLang.toUpperCase()}` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 20 }}>💬</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, paddingTop: 16 },
  centered:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header:            { fontWeight: '900', paddingHorizontal: 16, marginBottom: 12 },
  emptyText:         { textAlign: 'center', lineHeight: 24, fontSize: 15 },
  errorText:         { textAlign: 'center', marginBottom: 12, fontSize: 15 },
  retryBtn:          { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  avatar:            { width: 52, height: 52, marginRight: 12 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo:          { flex: 1 },
  cardName:          { fontWeight: '700', marginBottom: 2 },
  cardSub:           { fontSize: 13 },
});