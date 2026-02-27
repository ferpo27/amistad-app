import type { MatchProfile } from "../mock/matches";
import type { ProfileData } from "../storage";

/**
 * Genera sugerencias reales para iniciar conversación
 */
export function generateConversationStarters(me: ProfileData, other: MatchProfile) {
  const starters: string[] = [];

  const myInterests = me.interests ?? [];
  const common = (other.interests ?? []).filter((i) => myInterests.includes(i));

  if (common.length > 0) {
    starters.push(`How did you get into ${common[0]}?`);
    starters.push(`What’s your favorite thing about ${common[0]}?`);
  }

  starters.push(`What is something people misunderstand about ${other.country}?`);
  starters.push(`What music is popular in ${other.country} right now?`);
  starters.push(`How do people usually make friends in ${other.country}?`);

  return starters.slice(0, 4);
}

export function generateSmartIntro(me: ProfileData, other: MatchProfile) {
  const myInterests = me.interests ?? [];
  const common = (other.interests ?? []).filter((i) => myInterests.includes(i));

  if (common.length > 0) {
    return `You both like ${common[0]}. That’s a great place to start.`;
  }

  return `You’re connecting with someone from ${other.country}. Ask something unique about their culture.`;
}

// ✅ Alias por compat (tu error decía que faltaba connectionEngine)
export const connectionEngine = {
  generateConversationStarters,
  generateSmartIntro,
};