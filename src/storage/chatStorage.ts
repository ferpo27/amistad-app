// src/storage/chatStorage.ts
// Bots → AsyncStorage local | Usuarios reales → Supabase Realtime
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage } from "../storage";

export const BOT_IDS = ["anna_de", "hiro_ja", "li_zh", "ivan_ru", "masha_ru"];
export const isBot = (id: string) => BOT_IDS.includes(id);

// ── LOCAL (bots) ──────────────────────────────────────────────

async function getChatLocal(matchId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(`chat:${matchId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function appendChatLocal(
  matchId: string,
  msg: Omit<ChatMessage, "id" | "ts">
): Promise<ChatMessage[]> {
  const history = await getChatLocal(matchId);
  const newMsg: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ts: Date.now(),
    from: msg.from,
    text: msg.text,
  };
  const updated = [...history, newMsg];
  await AsyncStorage.setItem(`chat:${matchId}`, JSON.stringify(updated));
  return updated;
}

// ── REMOTO (usuarios reales) ──────────────────────────────────

async function getMyUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

async function getChatRemote(conversationId: string): Promise<ChatMessage[]> {
  const myId = await getMyUserId();
  const { data, error } = await supabase
    .from("messages")
    .select("id, ts, sender_id, text")
    .eq("conversation_id", conversationId)
    .order("ts", { ascending: true });

  if (error) {
    console.error("[chatStorage] getChatRemote:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    ts: row.ts,
    from: row.sender_id === myId ? ("me" as const) : ("them" as const),
    text: row.text,
  }));
}

async function appendChatRemote(
  conversationId: string,
  receiverId: string | null,
  msg: Omit<ChatMessage, "id" | "ts">
): Promise<ChatMessage | null> {
  const myId = await getMyUserId();
  if (!myId) return null;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: myId,
      receiver_id: receiverId,
      text: msg.text,
      ts: Date.now(),
      is_bot: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[chatStorage] appendChatRemote:", error.message);
    return null;
  }

  return { id: data.id, ts: data.ts, from: "me", text: data.text };
}

// ── API PÚBLICA ───────────────────────────────────────────────

export async function getChat(matchId: string): Promise<ChatMessage[]> {
  if (isBot(matchId)) return getChatLocal(matchId);
  return getChatRemote(matchId);
}

export async function appendChat(
  matchId: string,
  msg: Omit<ChatMessage, "id" | "ts">
): Promise<ChatMessage[]> {
  if (isBot(matchId)) return appendChatLocal(matchId, msg);
  await appendChatRemote(matchId, matchId, msg);
  return getChatRemote(matchId);
}

// ── REALTIME ─────────────────────────────────────────────────

export function subscribeToChatRealtime(
  matchId: string,
  onNewMessage: (msg: ChatMessage) => void
): () => void {
  if (isBot(matchId)) return () => {};

  const channel = supabase
    .channel(`chat:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${matchId}`,
      },
      async (payload) => {
        const row = payload.new as any;
        const myId = await getMyUserId();
        // Solo mostrar mensajes del otro — los míos ya los agrego localmente
        if (row.sender_id !== myId) {
          onNewMessage({ id: row.id, ts: row.ts, from: "them", text: row.text });
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}