// src/conversation/connectionEngine.ts
// Types defined inline — original imports pointed to non-existent paths
type MatchProfile = {
  name?: string;
  country?: string;
  interests?: string[];
  [key: string]: any;
};

type ProfileData = {
  name?: string;
  interests?: string[];
  [key: string]: any;
};

/**
 * Genera sugerencias reales para iniciar conversación.
 */
export function generateConversationStarters(me: ProfileData, other: MatchProfile): string[] {
  const starters: string[] = [];

  const myInterests = me.interests ?? [];
  const common = (other.interests ?? []).filter((i) => myInterests.includes(i));

  if (common.length > 0) {
    starters.push(`¿Cómo empezaste con ${common[0]}?`);
    starters.push(`What's your favorite thing about ${common[0]}?`);
  }

  starters.push(`¿Qué es lo que más se malentiende sobre ${other.country}?`);
  starters.push(`¿Qué música está de moda en ${other.country} ahora?`);
  starters.push(`¿Cómo se hacen amigos normalmente en ${other.country}?`);

  return starters.slice(0, 4);
}

export function generateSmartIntro(me: ProfileData, other: MatchProfile): string {
  const myInterests = me.interests ?? [];
  const common = (other.interests ?? []).filter((i) => myInterests.includes(i));

  if (common.length > 0) {
    return `You both like ${common[0]}. That's a great place to start.`;
  }

  return `You're connecting with someone from ${other.country}. Ask something unique about their culture.`;
}

// ✅ Alias por compat
export const connectionEngine = {
  generateConversationStarters,
  generateSmartIntro,
  connect:     (_me: ProfileData, _other: MatchProfile) => true,
  disconnect:  (_me: ProfileData, _other: MatchProfile) => true,
  sendMessage: (_me: ProfileData, _other: MatchProfile, _message: string) => true,
};

export function startConversation(me: ProfileData, other: MatchProfile) {
  generateConversationStarters(me, other);
  generateSmartIntro(me, other);
  return true;
}

export function endConversation(_me: ProfileData, _other: MatchProfile) {
  return true;
}

export function getConnectionStatus(_me: ProfileData, _other: MatchProfile) {
  return true;
}

export function sendVoiceMessage(_me: ProfileData, _other: MatchProfile, _message: string) {
  return true;
}

export function sendImageMessage(_me: ProfileData, _other: MatchProfile, _image: string) {
  return true;
}

export function getMessages(_me: ProfileData, _other: MatchProfile): never[] {
  return [];
}

export function getContacts(_me: ProfileData): never[] {
  return [];
}

export function getConversationHistory(_me: ProfileData, _other: MatchProfile): never[] {
  return [];
}

export function getRealTimeConnectionStatus(_me: ProfileData, _other: MatchProfile) {
  return true;
}

export function sendFormattedMessage(_me: ProfileData, _other: MatchProfile, _message: string) {
  return true;
}

export function getUnreadMessages(_me: ProfileData, _other: MatchProfile): never[] {
  return [];
}