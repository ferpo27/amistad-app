import { SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient = new SupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function buildConversationId(userId: string, friendId: string): Promise<{ data: any, error: any }> {
  const conversationId = `${userId}_${friendId}`;
  const { data, error } = await supabase
    .from('conversations')
    .insert({ id: conversationId, users: [userId, friendId] })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Error creating conversation ID: ${error.message}`);
  }

  return { data, error };
}