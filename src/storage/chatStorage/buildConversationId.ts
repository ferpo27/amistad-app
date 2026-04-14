// src/storage/chatStorage/buildConversationId.ts
//
// FIX 1: El ID de conversación ahora es SIMÉTRICO.
//   Antes: `${userId}_${friendId}` → user A+B y user B+A creaban 2 conversaciones distintas.
//   Ahora: los UUIDs se ordenan alfabéticamente → siempre el mismo ID sin importar quién inicia.
//
// FIX 2: Ya no crea un SupabaseClient propio con process.env.SUPABASE_URL / SUPABASE_KEY
//   (esas vars NO existen en React Native). Usa el cliente compartido de src/lib/supabase.ts.
//
// FIX 3: Usa upsert para que no falle si la conversación ya existe.

import { supabase } from '../../lib/supabase';

/**
 * Retorna el conversation_id para el par (userId, friendId).
 * El ID es idempotente: buildConversationId(A,B) === buildConversationId(B,A).
 */
export async function buildConversationId(
  userId: string,
  friendId: string,
): Promise<string> {
  // Orden lexicográfico → mismo ID sin importar quién llama primero
  const [a, b] = [userId, friendId].sort();
  const conversationId = `${a}_${b}`;

  const { error } = await supabase
    .from('conversations')
    .upsert(
      { id: conversationId, user_a: a, user_b: b },
      { onConflict: 'id', ignoreDuplicates: true },
    );

  if (error) {
    throw new Error(`Error creando conversación: ${error.message}`);
  }

  return conversationId;
}