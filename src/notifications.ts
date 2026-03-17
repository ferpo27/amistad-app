import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Tipo de datos que pueden enviarse con la notificación
export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  // Trigger puede ser una fecha o un objeto de repetición (segundos, minutos, etc.)
  trigger?: Notifications.NotificationTriggerInput;
};

// Canal de notificaciones para Android (requiere crear el canal antes de usar)
export const ANDROID_NOTIFICATION_CHANNEL_ID = 'default-channel';

// Configuración global del manejador de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registra el dispositivo para recibir notificaciones push.
 * - Solicita permisos al usuario.
 * - Obtiene el token de Expo (o del proveedor nativo si no es Expo).
 * @returns token de push o null si no se pudo registrar.
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token permission!');
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;

    // En Android, crear canal si aún no existe
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        sound: true,
        vibrate: [0, 250, 250, 250],
      });
    }

    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Programa una notificación local.
 * @param payload Contenido de la notificación.
 */
export async function schedulePushNotification(payload: NotificationPayload): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    },
    trigger: payload.trigger ?? null,
  });
}

/**
 * Envía una notificación push a través del servicio de Expo.
 * @param token Token del dispositivo destino.
 * @param payload Contenido de la notificación.
 */
export async function sendPushNotification(
  token: string,
  payload: NotificationPayload
): Promise<void> {
  const message = {
    to: token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}