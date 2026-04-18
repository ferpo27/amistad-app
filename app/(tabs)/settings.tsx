// app/(tabs)/settings.tsx
//
// ══════════════════════════════════════════════════════════════════════════════
// AJUSTES
//
// CAMBIOS vs versión anterior:
//   - Usa profilesStorage.getProfile() en lugar de supabase.from('profiles') directo
//   - No más desincronización con profile.tsx — misma fuente de datos
//   - Logout limpia el cache de profilesStorage
//   - refreshProfile() al hacer focus
//   - Indicador de sync status
//   - clearAll() + clearProfileCache() en logout/delete para limpieza total
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../src/lib/supabase';
import { clearAll, setAuthOk } from '../../src/storage';
import { useAppTheme } from '../../src/theme';
import {
  refreshProfile,
  clearProfileCache,
  deleteRemoteProfile,
  getSyncStatus,
  type SyncStatus,
} from '../../src/storage/profilesStorage';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS LOCALES
// ─────────────────────────────────────────────────────────────────────────────

interface DisplayProfile {
  displayName: string;
  email:        string;
  nativeLang:   string;
  learningLang: string;
  level:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const SUCCESS_COLOR = '#3DD68C';
const WARNING_COLOR = '#FFB547';

const SYNC_COLORS: Record<SyncStatus, string> = {
  synced:  SUCCESS_COLOR,
  pending: WARNING_COLOR,
  error:   '#FF5C5C',
  offline: '#8A8A8E',
};

const SYNC_LABELS: Record<SyncStatus, string> = {
  synced:  'Sincronizado',
  pending: 'Guardando…',
  error:   'Error de sync',
  offline: 'Sin conexión',
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger = false,
  rightElement,
  colors,
}: {
  icon:         string;
  label:        string;
  value?:       string;
  onPress?:     () => void;
  danger?:      boolean;
  rightElement?: React.ReactNode;
  colors:       ReturnType<typeof useAppTheme>['colors'];
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
          {
            backgroundColor: danger
              ? 'rgba(255,92,92,0.15)'
              : colors.accentSoft,
          },
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

function SyncStatusBar({
  status,
  colors,
}: {
  status: SyncStatus;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  if (status === 'synced') return null;

  return (
    <View
      style={[
        styles.syncBar,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.syncDot, { backgroundColor: SYNC_COLORS[status] }]}
      />
      <Text style={[styles.syncLabel, { color: colors.text }]}>
        {SYNC_LABELS[status]}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router   = useRouter();
  const { colors, isDark, setMode } = useAppTheme();

  const [profile,       setProfile]       = useState<DisplayProfile | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled,  setSoundEnabled]  = useState(true);
  const [syncStatus,    setSyncStatus]    = useState<SyncStatus>('synced');

  // ── Carga del perfil ────────────────────────────────────────────────────────
  // Fuente única: profilesStorage.getProfile() — mismo cache que profile.tsx

  const fetchProfile = useCallback(async () => {
    try {
      const [prof, status, { data: authData }] = await Promise.all([
        refreshProfile(),
        getSyncStatus(),
        supabase.auth.getUser(),
      ]);

      const primaryLang = prof.languageLearning?.learn?.[0] ?? null;

      setProfile({
        displayName: prof.displayName ?? 'Usuario',
        email:       authData.user?.email ?? '',
        nativeLang:  prof.nativeLang ?? '',
        learningLang: primaryLang?.lang ?? '',
        level:        primaryLang?.level ?? '',
      });

      setSyncStatus(status);
    } catch {
      // No rompemos la pantalla si falla el fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchProfile();
  }, [fetchProfile]));

  // ── Handlers ────────────────────────────────────────────────────────────────

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
          await clearProfileCache(); // limpia el cache de profilesStorage
          router.replace('/login' as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es irreversible. Se borrarán todos tus datos. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text:  'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Borra datos locales + registro en Supabase + logout
            await deleteRemoteProfile();
            await clearAll();
            await supabase.auth.signOut();
            router.replace('/login' as any);
          },
        },
      ],
    );
  };

  // ── Derivados ───────────────────────────────────────────────────────────────

  const initials =
    profile?.displayName
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '?';

  const switchTrack = { false: colors.border, true: colors.accentSoft };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Configuración</Text>
      </View>

      {/* Sync status (solo si no está synced) */}
      <SyncStatusBar status={syncStatus} colors={colors} />

      {/* Perfil Card */}
      <Pressable
        style={({ pressed }) => [
          styles.profileCard,
          {
            backgroundColor: colors.card,
            borderColor:     colors.border,
          },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => router.push('/onboarding' as any)}
      >
        <View style={[styles.avatarCircle, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile?.displayName}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.subtext }]}>
            {profile?.email}
          </Text>
          {profile?.nativeLang ? (
            <Text style={[styles.profileLangs, { color: colors.accent }]}>
              🗣 {profile.nativeLang}
              {profile.learningLang ? ` → 📖 ${profile.learningLang}` : ''}
              {profile.level ? ` · ${profile.level}` : ''}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
      </Pressable>

      {/* ── IDIOMAS ── */}
      <SectionHeader title="IDIOMAS" color={colors.subtext} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="language-outline"
          label="Idioma nativo"
          value={profile?.nativeLang || 'No configurado'}
          onPress={() => router.push('/onboarding' as any)}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="school-outline"
          label="Idioma que aprendés"
          value={
            profile?.learningLang
              ? `${profile.learningLang}${profile.level ? ` · ${profile.level}` : ''}`
              : 'No configurado'
          }
          onPress={() => router.push('/onboarding' as any)}
          colors={colors}
        />
      </View>

      {/* ── PREFERENCIAS ── */}
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

      {/* ── PRIVACIDAD ── */}
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

      {/* ── SOPORTE ── */}
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

      {/* ── CUENTA ── */}
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

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title:  { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },

  syncBar: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    marginHorizontal: 16,
    marginTop:       8,
    padding:         10,
    borderRadius:    10,
    borderWidth:     1,
  },
  syncDot:   { width: 8, height: 8, borderRadius: 4 },
  syncLabel: { fontSize: 12, fontWeight: '600' },

  profileCard: {
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  16,
    marginHorizontal: 16,
    marginTop:     16,
    marginBottom:  8,
    padding:       16,
    gap:           14,
    borderWidth:   1,
  },
  avatarCircle: {
    width:          56,
    height:         56,
    borderRadius:   28,
    alignItems:     'center',
    justifyContent: 'center',
  },
  avatarText:    { fontSize: 20, fontWeight: '700' },
  profileName:   { fontSize: 17, fontWeight: '700' },
  profileEmail:  { fontSize: 13, marginTop: 2 },
  profileLangs:  { fontSize: 12, marginTop: 5 },

  sectionTitle: {
    fontSize:    11,
    fontWeight:  '700',
    letterSpacing: 1.2,
    marginTop:   24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  section: {
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth:  1,
    overflow:     'hidden',
  },
  divider: { height: 1, marginLeft: 56 },

  row: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap:             12,
  },
  rowIcon: {
    width:          34,
    height:         34,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel:   { fontSize: 15, fontWeight: '500' },
  rowValue:   { fontSize: 12, marginTop: 2 },

  version: { textAlign: 'center', fontSize: 12, marginTop: 32 },
});