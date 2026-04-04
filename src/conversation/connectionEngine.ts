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
 * Genera sugerencias reales para iniciar conversación
 */
export function generateConversationStarters(me: ProfileData, other: MatchProfile) {
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

export function generateSmartIntro(me: ProfileData, other: MatchProfile) {
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
  connect: (me: ProfileData, other: MatchProfile) => {
    console.log(`Conectando a ${me.name} con ${other.name}...`);
    return true;
  },
  disconnect: (me: ProfileData, other: MatchProfile) => {
    console.log(`Desconectando a ${me.name} de ${other.name}...`);
    return true;
  },
  sendMessage: (me: ProfileData, other: MatchProfile, message: string) => {
    console.log(`Enviando mensaje de ${me.name} a ${other.name}: ${message}`);
    return true;
  },
};

export function startConversation(me: ProfileData, other: MatchProfile) {
  const starters = generateConversationStarters(me, other);
  const intro = generateSmartIntro(me, other);
  console.log(`Iniciando conversación entre ${me.name} y ${other.name}...`);
  console.log(`Sugerencias de conversación: ${starters.join(', ')}`);
  console.log(`Introducción: ${intro}`);
  return true;
}

export function endConversation(me: ProfileData, other: MatchProfile) {
  console.log(`Finalizando conversación entre ${me.name} y ${other.name}...`);
  return true;
}

export function getConnectionStatus(me: ProfileData, other: MatchProfile) {
  console.log(`Obteniendo estado de la conexión entre ${me.name} y ${other.name}...`);
  return true;
}

export function sendVoiceMessage(me: ProfileData, other: MatchProfile, message: string) {
  console.log(`Enviando mensaje de voz de ${me.name} a ${other.name}: ${message}`);
  return true;
}

export function sendImageMessage(me: ProfileData, other: MatchProfile, image: string) {
  console.log(`Enviando mensaje de imagen de ${me.name} a ${other.name}: ${image}`);
  return true;
}

export function getMessages(me: ProfileData, other: MatchProfile) {
  console.log(`Obteniendo lista de mensajes entre ${me.name} y ${other.name}...`);
  return [];
}

export function getContacts(me: ProfileData) {
  console.log(`Obteniendo lista de contactos de ${me.name}...`);
  return [];
}

export function getConversationHistory(me: ProfileData, other: MatchProfile) {
  console.log(`Obteniendo historial de conversaciones entre ${me.name} y ${other.name}...`);
  return [];
}

export function getRealTimeConnectionStatus(me: ProfileData, other: MatchProfile) {
  console.log(`Obteniendo estado de la conexión en tiempo real entre ${me.name} y ${other.name}...`);
  return true;
}

export function sendFormattedMessage(me: ProfileData, other: MatchProfile, message: string) {
  console.log(`Enviando mensaje de texto con formato de ${me.name} a ${other.name}: ${message}`);
  return true;
}

export function getUnreadMessages(me: ProfileData, other: MatchProfile) {
  console.log(`Obteniendo lista de mensajes no leídos entre ${me.name} y ${other.name}...`);
  return [];
}