// src/storage/chatStorage/uploadAudio.ts
//
// FIX 1: Retorna la URL pública de Supabase Storage, no `data.path` (ruta relativa interna).
//   Antes los mensajes de audio guardaban algo como "1234567890_voice.m4a" y al renderizarlo
//   no había imagen/audio porque eso no es una URL válida.
//
// FIX 2: Usa el cliente compartido, no uno nuevo con vars de entorno de servidor.
//
// FIX 3: Bucket correcto: 'audio-messages' (el que se creó en Supabase), no 'audios'.
//
// FIX 4: Nombre de archivo único con timestamp + userId para evitar colisiones.

import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';

const AUDIO_BUCKET = 'audio-messages';

/**
 * Sube un archivo de audio (URI local de Expo) a Supabase Storage
 * y devuelve la URL pública para guardar en la base de datos.
 *
 * @param localUri  URI devuelta por expo-av al terminar la grabación (file://…)
 * @param userId    ID del usuario que envía (para rutas únicas)
 * @returns         URL pública permanente del audio
 */
export async function uploadAudio(localUri: string, userId: string): Promise<string> {
  // Leer el archivo como base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convertir a ArrayBuffer
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Nombre único: userId/timestamp.m4a
  const fileName = `${userId}/${Date.now()}.m4a`;

  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(fileName, bytes.buffer, {
      contentType: 'audio/m4a',
      upsert: false,
    });

  if (error) {
    throw new Error(`Error subiendo audio: ${error.message}`);
  }

  // ✅ Obtener la URL pública — esto es lo que hay que guardar en la DB
  const { data: publicData } = supabase.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}