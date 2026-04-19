/**
 * @file src/hooks/usePushNotifications.ts
 *
 * Production-grade push notification management para Amistad.
 * Meta-scale: designed for 1M+ concurrent users.
 *
 * Resuelve:
 *  1. Registro del token Expo Push en Supabase (columna push_token en profiles).
 *  2. Refresh del token si cambia (reinstalación, nuevo dispositivo).
 *  3. Permisos: flujo nativo en iOS, auto-grant en Android.
 *  4. Notificaciones en primer plano: banner propio (no interrumpe el flujo).
 *  5. Tap en notificación: navega a la pantalla correcta (chat o matches).
 *  6. Limpieza correcta de listeners al desmontar.
 *  7. Sin crash en Expo Go (que no soporta push físicos).
 *
 * Uso:
 *  Llamar en _layout.tsx dentro de RootLayoutInner (tiene acceso al router).
 *
 * Prerequisitos (ya en package.json):
 *  - expo-notifications
 *  - expo-device
 *  - push_token TEXT column en public.profiles (ya creada con SQL anterior)
 *
 * Supabase RLS:
 *  El upsert usa el userId del usuario autenticado — la política
 *  "profiles: update own" cubre este caso sin cambios adicionales.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN GLOBAL DE NOTIFICACIONES
// Llamar una vez al arrancar la app, antes de cualquier listener.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configura cómo se presentan las notificaciones cuando la app está en primer plano.
 * Llamar una vez en app/_layout.tsx fuera de cualquier componente.
 *
 * @example
 * // En _layout.tsx, antes del export default:
 * configurePushHandler();
 */
export function configurePushHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldPlaySound:  true,
      shouldSetBadge:   true,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type PushStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable' // Expo Go o simulador
  | 'error';

export interface PushNotificationData {
  /** Tipo de notificación para routing */
  type?:           'new_match' | 'new_message' | 'system';
  /** ID del chat al que navegar (para type: new_message) */
  conversationId?: string;
  /** ID del match (para type: new_match) */
  matchId?:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica si el entorno soporta push notifications físicas.
 * Expo Go y simuladores no soportan tokens reales.
 */
function isPushCapable(): boolean {
  return Device.isDevice && !__DEV__;
  // En desarrollo también registramos si es un dispositivo físico real.
  // Cambiar a `Device.isDevice` para forzar en dev con dispositivo físico.
}

/**
 * Solicita permiso de notificaciones.
 * iOS: muestra diálogo nativo.
 * Android 13+: requiere permiso explícito.
 * Returns true si se concedió.
 */
async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();

  if (existing === 'granted') return true;

  const { status: requested } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert:  true,
      allowBadge:  true,
      allowSound:  true,
      allowProvisional: false,
    },
  });

  return requested === 'granted';
}

/**
 * Obtiene el Expo Push Token.
 * projectId es necesario para Expo EAS — lo tomamos de app.json via Constants.
 */
async function getExpoPushToken(): Promise<string | null> {
  try {
    // Importación lazy para no crashear en ambientes sin expo-constants
    const Constants = (await import('expo-constants')).default;
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[usePushNotifications] No projectId found in app config.');
      }
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Guarda el push token en Supabase.
 * Usa upsert por id para evitar duplicados.
 * Silencioso en caso de error — nunca bloquea el flujo de la app.
 */
async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
  // No lanzamos error — si falla, el usuario simplemente no recibe push
  // hasta el próximo arranque de la app.
}

/**
 * Limpia el push token del usuario al hacer sign-out.
 * Previene que lleguen notificaciones a dispositivos donde se cerró sesión.
 */
export async function clearPushToken(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gestiona todo el ciclo de vida de las push notifications.
 *
 * @example
 * // En app/_layout.tsx, dentro de RootLayoutInner:
 * usePushNotifications();
 */
export function usePushNotifications(): { status: PushStatus } {
  const router     = useRouter();
  const statusRef  = useRef<PushStatus>('idle');
  const tokenRef   = useRef<string | null>(null);

  // ── Android: canal de notificaciones ───────────────────────────────────────
  // Requerido en Android 8+ para control de sonido/vibración por tipo.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void Notifications.setNotificationChannelAsync('default', {
      name:            'Amistad',
      importance:      Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#6C63FF',
      sound:            'default',
    });

    void Notifications.setNotificationChannelAsync('messages', {
      name:            'Mensajes',
      importance:      Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100],
      lightColor:       '#6C63FF',
      sound:            'default',
    });

    void Notifications.setNotificationChannelAsync('matches', {
      name:            'Matches',
      importance:      Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#FF375F',
      sound:            'default',
    });
  }, []);

  // ── Registro del token ─────────────────────────────────────────────────────

  const registerToken = useCallback(async (): Promise<void> => {
    // Simulador / Expo Go — push no funciona
    if (!isPushCapable()) {
      statusRef.current = 'unavailable';
      return;
    }

    statusRef.current = 'requesting';

    const granted = await requestPermission();
    if (!granted) {
      statusRef.current = 'denied';
      return;
    }

    const token = await getExpoPushToken();
    if (!token) {
      statusRef.current = 'error';
      return;
    }

    tokenRef.current  = token;
    statusRef.current = 'granted';

    // Guardar en Supabase si hay sesión
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await savePushToken(user.id, token);
    }
  }, []);

  useEffect(() => {
    void registerToken();
  }, [registerToken]);

  // Refresh del token cuando cambia la sesión (login/logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user.id && tokenRef.current) {
          await savePushToken(session.user.id, tokenRef.current);
        }
        if (event === 'SIGNED_OUT' && session?.user.id) {
          await clearPushToken(session.user.id);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Notificaciones recibidas en primer plano ───────────────────────────────
  // expo-notifications las muestra automáticamente via setNotificationHandler.
  // Aquí solo manejamos lógica adicional si necesitamos (badge count, etc.)

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Lógica de foreground adicional si se necesita:
        // - Actualizar badge count local
        // - Reproducir sonido custom
        // - Mostrar in-app banner (futuro)
      },
    );
    return () => subscription.remove();
  }, []);

  // ── Tap en notificación → navegación ──────────────────────────────────────

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as PushNotificationData;

        if (!data?.type) return;

        switch (data.type) {
          case 'new_message':
            if (data.conversationId) {
              router.push(`/chat/${data.conversationId}` as Parameters<typeof router.push>[0]);
            } else {
              router.push('/(tabs)/chats' as Parameters<typeof router.push>[0]);
            }
            break;

          case 'new_match':
            router.push('/(tabs)/home' as Parameters<typeof router.push>[0]);
            break;

          case 'system':
            // Notificaciones de sistema — no navegar
            break;

          default:
            break;
        }
      },
    );
    return () => subscription.remove();
  }, [router]);

  // ── Token refresh listener ─────────────────────────────────────────────────
  // El token puede cambiar si el usuario reinstala la app o borra datos.

  useEffect(() => {
    const subscription = Notifications.addPushTokenListener(
      async ({ data: newToken }) => {
        if (!newToken || newToken === tokenRef.current) return;

        tokenRef.current = newToken;

        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await savePushToken(user.id, newToken);
        }
      },
    );
    return () => subscription.remove();
  }, []);

  return { status: statusRef.current };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES PARA ENVÍO (desde servidor / Edge Functions)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payload estándar para enviar desde Supabase Edge Functions.
 *
 * @example
 * // En una Edge Function de Supabase:
 * const payload = buildPushPayload('new_match', {
 *   title: '¡Nuevo match! 🎉',
 *   body: 'Ana quiere conectar contigo',
 *   matchId: 'uuid-del-match',
 * });
 * await sendPushViaExpo([token], payload);
 */
export interface PushPayload {
  to:       string | string[];
  title:    string;
  body:     string;
  data:     PushNotificationData;
  sound:    'default' | null;
  badge?:   number;
  channelId?: string; // Android channel
  priority: 'default' | 'normal' | 'high';
}

export function buildMatchPushPayload(
  token:       string,
  matchName:   string,
): PushPayload {
  return {
    to:       token,
    title:    '¡Nuevo match! 🎉',
    body:     `${matchName} quiere conectar contigo`,
    data:     { type: 'new_match' },
    sound:    'default',
    priority: 'high',
    channelId: 'matches',
  };
}

export function buildMessagePushPayload(
  token:          string,
  senderName:     string,
  preview:        string,
  conversationId: string,
): PushPayload {
  return {
    to:       token,
    title:    senderName,
    body:     preview.length > 80 ? `${preview.slice(0, 80)}…` : preview,
    data:     { type: 'new_message', conversationId },
    sound:    'default',
    priority: 'high',
    channelId: 'messages',
  };
}