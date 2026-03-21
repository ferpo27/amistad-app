import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import type { BlockedListType } from './types';

enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  OTHER = 'other',
}

/**
 * Reporta a un usuario.
 * @param userId ID del usuario a reportar.
 * @param reason Motivo del reporte.
 * @param details Información adicional opcional.
 */
export const reportUser = async (
  userId: string,
  reason: ReportReason,
  details?: string,
): Promise<void> => {
  try {
    const { error } = await supabase.from('reports').insert({
      reported_user_id: userId,
      reason,
      details: details ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error al reportar al usuario:', err);
    throw err;
  }
};

/**
 * Bloquea a un usuario y lo guarda en AsyncStorage.
 * @param userId ID del usuario a bloquear.
 */
export const blockUser = async (userId: string): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem('blockedList');
    const blocked: string[] = stored ? JSON.parse(stored) : [];

    if (!blocked.includes(userId)) {
      blocked.push(userId);
      await AsyncStorage.setItem('blockedList', JSON.stringify(blocked));
    }
  } catch (err) {
    console.error('Error al bloquear al usuario:', err);
    throw err;
  }
};

/**
 * Verifica si un usuario está bloqueado.
 * @param userId ID del usuario a comprobar.
 * @returns true si está bloqueado, false en caso contrario.
 */
export const isBlocked = async (userId: string): Promise<boolean> => {
  try {
    const stored = await AsyncStorage.getItem('blockedList');
    const blocked: string[] = stored ? JSON.parse(stored) : [];
    return blocked.includes(userId);
  } catch (err) {
    console.error('Error al comprobar bloqueo:', err);
    return false;
  }
};

/**
 * Obtiene la lista de usuarios bloqueados.
 * @returns Array de IDs de usuarios bloqueados.
 */
type BlockedListType = string[];
export const getBlockedList = async (): Promise<BlockedListType> => {
  try {
    const stored = await AsyncStorage.getItem('blockedList');
    const blocked: BlockedListType = stored ? JSON.parse(stored) : [];
    return blocked;
  } catch (err) {
    console.error('Error al obtener la lista de bloqueados:', err);
    return [];
  }
};