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
          icon: isDark ? ('moon' as const) : ('sunny-outline' as const),
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
      content
    />
  );
}