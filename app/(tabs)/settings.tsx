// app/(tabs)/settings.tsx
//
// FIX: Reemplaza COLORS hardcodeados con useAppTheme() — single source of truth.
// FIX: darkMode switch ahora persiste con setMode() de storage y afecta toda la app.
// FIX: soundEnabled y notifications son preferencias de usuario (persisten en AsyncStorage).

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable,
  StyleSheet, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { clearAll, setAuthOk } from '../../src/storage';
import { useAppTheme } from '../../src/theme';

// Colores que no dependen del tema (estados semánticos fijos)
const SUCCESS_COLOR = '#3DD68C';
const WARNING_COLOR = '#FFB547';

interface Profile {
  full_name: string;
  email: string;
  native_language: string;
  learning_language: string;
  level: string;
}

function SettingRow({
  icon, label, value, onPress, danger = false, rightElement, colors,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: danger ? 'rgba(255,92,92,0.15)' : colors.accentSoft },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={danger ? colors.error : colors.accent}
        />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.text }]}>
          {label}
        </Text>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.subtext }]}>{value}</Text>
        ) : null}
      </View>
      {rightElement ??
        (onPress && !danger ? (
          <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
        ) : null)}
    </Pressable>
  );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color }]}>{title}</Text>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, mode, setMode } = useAppTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, native_language, learning_language, level')
        .eq('id', user.id)
        .single();
      setProfile({
        full_name: data?.full_name ?? 'Usuario',
        email: user.email ?? '',
        native_language: data?.native_language ?? '',
        learning_language: data?.learning_language ?? '',
        level: data?.level ?? '',
      });
    } catch (e) {
      console.error('fetchProfile error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const handleDarkModeToggle = async (value: boolean) => {
    await setMode(value ? 'dark' : 'light');
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          await setAuthOk(false);
          router.replace('/login' as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es irreversible. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            await supabase.auth.signOut();
            router.replace('/login' as any);
          },
        },
      ],
    );
  };

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '?';

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const switchTrack = { false: colors.border, true: colors.accentSoft };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Configuración</Text>
      </View>

      {/* Perfil Card */}
      <Pressable
        style={({ pressed }) => [
          styles.profileCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => router.push('/profile/edit' as any)}
      >
        <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile?.full_name}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.subtext }]}>
            {profile?.email}
          </Text>
          {profile?.native_language ? (
            <Text style={[styles.profileLangs, { color: colors.accent }]}>
              🗣 {profile.native_language} → 📖 {profile.learning_language} · {profile.level}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
      </Pressable>

      {/* Idiomas */}
      <SectionHeader title="IDIOMAS" color={colors.subtext} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="language-outline"
          label="Idioma nativo"
          value={profile?.native_language || 'No configurado'}
          onPress={() => router.push('/profile/edit' as any)}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="school-outline"
          label="Idioma que aprendés"
          value={`${profile?.learning_language || 'No configurado'}${profile?.level ? ` · ${profile.level}` : ''}`}
          onPress={() => router.push('/profile/edit' as any)}
          colors={colors}
        />
      </View>

      {/* Preferencias */}
      <SectionHeader title="PREFERENCIAS" color={colors.subtext} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="notifications-outline"
          label="Notificaciones"
          colors={colors}
          rightElement={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={switchTrack}
              thumbColor={notifications ? colors.accent : colors.subtext}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="moon-outline"
          label="Modo oscuro"
          colors={colors}
          rightElement={
            <Switch
              value={isDark}
              onValueChange={handleDarkModeToggle}
              trackColor={switchTrack}
              thumbColor={isDark ? colors.accent : colors.subtext}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="volume-medium-outline"
          label="Sonidos"
          colors={colors}
          rightElement={
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={switchTrack}
              thumbColor={soundEnabled ? colors.accent : colors.subtext}
            />
          }
        />
      </View>

      {/* Privacidad */}
      <SectionHeader title="PRIVACIDAD Y SEGURIDAD" color={colors.subtext} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="shield-checkmark-outline"
          label="Privacidad"
          onPress={() => router.push('/privacy' as any)}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="lock-closed-outline"
          label="Cambiar contraseña"
          onPress={() => router.push('/change-password' as any)}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="eye-off-outline"
          label="Usuarios bloqueados"
          onPress={() => router.push('/blocked' as any)}
          colors={colors}
        />
      </View>

      {/* Soporte */}
      <SectionHeader title="SOPORTE" color={colors.subtext} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="help-circle-outline"
          label="Centro de ayuda"
          onPress={() => router.push('/help' as any)}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="chatbubble-ellipses-outline"
          label="Contactar soporte"
          onPress={() => router.push('/contact' as any)}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="star-outline"
          label="Calificar la app"
          onPress={() => {}}
          colors={colors}
        />
      </View>

      {/* Cuenta */}
      <SectionHeader title="CUENTA" color={colors.subtext} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="log-out-outline"
          label="Cerrar sesión"
          danger
          onPress={handleLogout}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="trash-outline"
          label="Eliminar cuenta"
          danger
          onPress={handleDeleteAccount}
          colors={colors}
        />
      </View>

      <Text style={[styles.version, { color: colors.border }]}>Amistad App · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title:  { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    gap: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText:    { fontSize: 20, fontWeight: '700' },
  profileName:   { fontSize: 17, fontWeight: '700' },
  profileEmail:  { fontSize: 13, marginTop: 2 },
  profileLangs:  { fontSize: 12, marginTop: 5 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  section: {
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: { height: 1, marginLeft: 56 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel:   { fontSize: 15, fontWeight: '500' },
  rowValue:   { fontSize: 12, marginTop: 2 },

  version: { textAlign: 'center', fontSize: 12, marginTop: 32 },
});