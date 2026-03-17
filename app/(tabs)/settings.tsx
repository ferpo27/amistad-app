// app/(tabs)/settings.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Switch, Alert, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode } from '../../src/theme';
import { clearAll, setAuthOk, setOnboardingDone } from '../../src/storage';
import { useCallback } from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, setMode } = useThemeMode();
  const [notificaciones, setNotificaciones] = useState(true);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => {
          await setAuthOk(false);
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  const handleResetApp = () => {
    Alert.alert('Resetear app', 'Esto borrará todos tus datos. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resetear', style: 'destructive',
        onPress: async () => {
          await clearAll();
          await setAuthOk(false);
          await setOnboardingDone(false);
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  const sections = [
    {
      title: 'Cuenta',
      rows: [
        { icon: 'person-outline' as const, label: 'Editar perfil', onPress: () => router.push('/onboarding' as any) },
        { icon: 'language-outline' as const, label: 'Idiomas', onPress: () => router.push('/languages' as any) },
        { icon: 'heart-outline' as const, label: 'Intereses', onPress: () => router.push('/interests' as any) },
      ],
    },
    {
      title: 'Preferencias',
      rows: [
        {
          icon: (isDark ? 'moon' : 'sunny-outline') as const,
          label: isDark ? 'Modo oscuro' : 'Modo claro',
          isToggle: true, value: isDark,
          onPress: () => setMode(isDark ? 'light' : 'dark'),
        },
        {
          icon: 'notifications-outline' as const,
          label: 'Notificaciones',
          isToggle: true, value: notificaciones,
          onPress: () => setNotificaciones((v) => !v),
        },
      ],
    },
    {
      title: 'Seguridad',
      rows: [
        { icon: 'shield-outline' as const, label: 'Privacidad', onPress: () => Alert.alert('Próximamente') },
        { icon: 'ban-outline' as const, label: 'Usuarios bloqueados', onPress: () => Alert.alert('Próximamente') },
      ],
    },
    {
      title: 'Sesión',
      rows: [
        { icon: 'log-out-outline' as const, label: 'Cerrar sesión', danger: true, onPress: handleLogout },
        { icon: 'trash-outline' as const, label: 'Resetear app (dev)', danger: true, onPress: handleResetApp },
      ],
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 54 : 22,
        paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ color: colors.fg, fontSize: 28, fontWeight: '900' }}>Ajustes</Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={{ marginTop: 28 }}>
          <Text style={{
            color: colors.fg, opacity: 0.4, fontSize: 11,
            fontWeight: '800', letterSpacing: 1.2,
            paddingHorizontal: 20, marginBottom: 8,
          }}>
            {section.title.toUpperCase()}
          </Text>
          <View style={{
            marginHorizontal: 16, backgroundColor: colors.card,
            borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
          }}>
            {section.rows.map((row, i) => (
              <Pressable
                key={row.label}
                onPress={row.onPress}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 15,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border,
                  backgroundColor: pressed ? colors.border + '40' : 'transparent',
                })}
              >
                <View style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: (row as any).danger ? '#FF375F20' : colors.accent + '20',
                  alignItems: 'center', justifyContent: 'center', marginRight: 14,
                }}>
                  <Ionicons name={row.icon} size={17} color={(row as any).danger ? '#FF375F' : colors.accent} />
                </View>
                <Text style={{ flex: 1, color: (row as any).danger ? '#FF375F' : colors.fg, fontWeight: '600', fontSize: 15 }}>
                  {row.label}
                </Text>
                {(row as any).isToggle ? (
                  <Switch
                    value={(row as any).value}
                    onValueChange={row.onPress}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor="#fff"
                  />
                ) : (
                  !(row as any).danger && (
                    <Ionicons name="chevron-forward" size={16} color={colors.fg} style={{ opacity: 0.3 }} />
                  )
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Text style={{ color: colors.fg, opacity: 0.2, fontSize: 12, textAlign: 'center', marginTop: 36 }}>
        Amistad App · v1.0.0
      </Text>
    </ScrollView>
  );
}