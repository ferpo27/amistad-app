// app/(tabs)/settings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable,
  StyleSheet, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { clearAll, setAuthOk, setOnboardingDone } from '../../src/storage';

const COLORS = {
  bg: '#0F0F14',
  surface: '#1A1A24',
  card: '#1E1E2A',
  border: '#2A2A3A',
  accent: '#6C63FF',
  accentSoft: '#3D3780',
  text: '#F0F0F8',
  textMuted: '#8888AA',
  danger: '#FF5C5C',
  success: '#3DD68C',
  warning: '#FFB547',
};

interface Profile {
  full_name: string;
  email: string;
  native_language: string;
  learning_language: string;
  level: string;
}

function SettingRow({
  icon, label, value, onPress, danger = false, rightElement,
}: {
  icon: string; label: string; value?: string;
  onPress?: () => void; danger?: boolean; rightElement?: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, danger && { backgroundColor: '#3A1A1A' }]}>
        <Ionicons name={icon as any} size={18} color={danger ? COLORS.danger : COLORS.accent} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.danger }]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {rightElement ?? (
        onPress && !danger
          ? <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          : null
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
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
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            await clearAll();
            await supabase.auth.signOut();
            router.replace('/login' as any);
          },
        },
      ]
    );
  };

  const initials = profile?.full_name
    ?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Configuración</Text>
      </View>

      {/* Perfil Card */}
      <Pressable
        style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/profile/edit' as any)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{profile?.full_name}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          {profile?.native_language && (
            <Text style={styles.profileLangs}>
              🗣 {profile.native_language} → 📖 {profile.learning_language} · {profile.level}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </Pressable>

      {/* Idiomas */}
      <SectionHeader title="IDIOMAS" />
      <View style={styles.section}>
        <SettingRow
          icon="language-outline"
          label="Idioma nativo"
          value={profile?.native_language || 'No configurado'}
          onPress={() => router.push('/profile/edit' as any)}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="school-outline"
          label="Idioma que aprendés"
          value={`${profile?.learning_language || 'No configurado'}${profile?.level ? ` · ${profile.level}` : ''}`}
          onPress={() => router.push('/profile/edit' as any)}
        />
      </View>

      {/* Preferencias */}
      <SectionHeader title="PREFERENCIAS" />
      <View style={styles.section}>
        <SettingRow
          icon="notifications-outline"
          label="Notificaciones"
          rightElement={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.accentSoft }}
              thumbColor={notifications ? COLORS.accent : COLORS.textMuted}
            />
          }
        />
        <View style={styles.divider} />
        <SettingRow
          icon="moon-outline"
          label="Modo oscuro"
          rightElement={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: COLORS.border, true: COLORS.accentSoft }}
              thumbColor={darkMode ? COLORS.accent : COLORS.textMuted}
            />
          }
        />
        <View style={styles.divider} />
        <SettingRow
          icon="volume-medium-outline"
          label="Sonidos"
          rightElement={
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.accentSoft }}
              thumbColor={soundEnabled ? COLORS.accent : COLORS.textMuted}
            />
          }
        />
      </View>

      {/* Privacidad */}
      <SectionHeader title="PRIVACIDAD Y SEGURIDAD" />
      <View style={styles.section}>
        <SettingRow
          icon="shield-checkmark-outline"
          label="Privacidad"
          onPress={() => router.push('/privacy' as any)}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="lock-closed-outline"
          label="Cambiar contraseña"
          onPress={() => router.push('/change-password' as any)}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="eye-off-outline"
          label="Usuarios bloqueados"
          onPress={() => router.push('/blocked' as any)}
        />
      </View>

      {/* Soporte */}
      <SectionHeader title="SOPORTE" />
      <View style={styles.section}>
        <SettingRow
          icon="help-circle-outline"
          label="Centro de ayuda"
          onPress={() => router.push('/help' as any)}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="chatbubble-ellipses-outline"
          label="Contactar soporte"
          onPress={() => router.push('/contact' as any)}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="star-outline"
          label="Calificar la app"
          onPress={() => {}}
        />
      </View>

      {/* Cuenta */}
      <SectionHeader title="CUENTA" />
      <View style={styles.section}>
        <SettingRow
          icon="log-out-outline"
          label="Cerrar sesión"
          danger
          onPress={handleLogout}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="trash-outline"
          label="Eliminar cuenta"
          danger
          onPress={handleDeleteAccount}
        />
      </View>

      <Text style={styles.version}>Amistad App · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 16,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    padding: 16, gap: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: COLORS.accent },
  profileName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  profileEmail: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  profileLangs: { fontSize: 12, color: COLORS.accent, marginTop: 5 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1.2, marginTop: 24, marginBottom: 8,
    marginHorizontal: 20,
  },
  section: {
    backgroundColor: COLORS.card, borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  rowValue: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  version: {
    textAlign: 'center', fontSize: 12,
    color: COLORS.border, marginTop: 32,
  },
});