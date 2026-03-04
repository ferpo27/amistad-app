// src/storage/chatStorage.ts
// ─────────────────────────────────────────────────────────────
//  Chats persistidos en Supabase (tabla messages).
//  Reemplaza AsyncStorage para chats.
//
//  SQL para crear la tabla en Supabase → Editor SQL:
//
//  create table if not exists messages (
//    id          uuid primary key default gen_random_uuid(),
//    match_id    text not null,
//    user_id     uuid not null references auth.users(id) on delete cascade,
//    from_user   text not null check (from_user in ('me','them')),
//    text        text not null,
//    ts          bigint not null default extract(epoch from now()) * 1000
//  );
//  alter table messages enable row level security;
//  create policy "solo yo veo mis mensajes" on messages
//    for all using (auth.uid() = user_id);
// ─────────────────────────────────────────────────────────────
import { supabase } from "../lib/supabase";
import type { ChatMessage } from "../storage";

// ── Leer historial ────────────────────────────────────────────
export async function getChatRemote(matchId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, ts, from_user, text")
    .eq("match_id", matchId)
    .order("ts", { ascending: true });

  if (error) {
    console.error("[chatStorage] getChatRemote:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    ts: row.ts,
    from: row.from_user as "me" | "them",
    text: row.text,
  }));
}

// ── Agregar mensaje ───────────────────────────────────────────
export async function appendChatRemote(
  matchId: string,
  message: Omit<ChatMessage, "id" | "ts"> & Partial<Pick<ChatMessage, "id" | "ts">>
): Promise<ChatMessage | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    console.warn("[chatStorage] No hay usuario autenticado");
    return null;
  }

  const row = {
    match_id: matchId,
    user_id: userId,
    from_user: message.from,
    text: message.text,
    ts: message.ts ?? Date.now(),
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("[chatStorage] appendChatRemote:", error.message);
    return null;
  }

  return {
    id: data.id,
    ts: data.ts,
    from: data.from_user as "me" | "them",
    text: data.text,
  };
}

// ── Suscripción Realtime ──────────────────────────────────────
export function subscribeToChatRealtime(
  matchId: string,
  onNewMessage: (msg: ChatMessage) => void
) {
  const channel = supabase
    .channel(`chat:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        const row = payload.new as any;
        onNewMessage({
          id: row.id,
          ts: row.ts,
          from: row.from_user as "me" | "them",
          text: row.text,
        });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}