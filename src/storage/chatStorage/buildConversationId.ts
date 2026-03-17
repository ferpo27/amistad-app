import { SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient = new SupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export function buildConversationId(userId: string, friendId: string): string {
  const conversationId = `${userId}_${friendId}`;
  const { data, error } = supabase
    .from('conversations')
    .insert({ id: conversationId, users: [userId, friendId] })
    .select('id');

  if (error) {
    throw new Error(`Error creating conversation ID: ${error.message}`);
  }

  return conversationId;
}