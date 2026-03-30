import type { MatchProfile } from "../../mock/matches";
import type { ProfileData } from "../../storage";

/**
 * Genera sugerencias reales para iniciar conversación
 */
export function generateConversationStarters(me: ProfileData, other: MatchProfile) {
  const starters: string[] = [];

  const myInterests = me.interests ?? [];
  const common = (other.interests ?? []).filter((i) => myInterests.includes(i));

  if (common.length > 0) {
    starters.push(`¿Cómo empezaste con ${common[0]}?`);
    starters.push(`What’s your favorite thing about ${common[0]}?`);
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
    return `You both like ${common[0]}. That’s a great place to start.`;
  }

  return `You’re connecting with someone from ${other.country}. Ask something unique about their culture.`;
}

// ✅ Alias por compat
export const connectionEngine = {
  generateConversationStarters,
  generateSmartIntro,
  connect: (me: ProfileData, other: MatchProfile) => {
    // Lógica para conectar a dos usuarios
    console.log(`Conectando a ${me.name} con ${other.name}...`);
    return true;
  },
  disconnect: (me: ProfileData, other: MatchProfile) => {
    // Lógica para desconectar a dos usuarios
    console.log(`Desconectando a ${me.name} de ${other.name}...`);
    return true;
  },
  sendMessage: (me: ProfileData, other: MatchProfile, message: string) => {
    // Lógica para enviar un mensaje entre dos usuarios
    console.log(`Enviando mensaje de ${me.name} a ${other.name}: ${message}`);
    return true;
  },
};

// Funciones adicionales para el módulo de conexión
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

// Función adicional para obtener el estado de la conexión
export function getConnectionStatus(me: ProfileData, other: MatchProfile) {
  // Lógica para obtener el estado de la conexión
  console.log(`Obteniendo estado de la conexión entre ${me.name} y ${other.name}...`);
  return true;
}

// Función adicional para enviar un mensaje de voz
export function sendVoiceMessage(me: ProfileData, other: MatchProfile, message: string) {
  // Lógica para enviar un mensaje de voz
  console.log(`Enviando mensaje de voz de ${me.name} a ${other.name}: ${message}`);
  return true;
}

// Función adicional para enviar un mensaje de imagen
export function sendImageMessage(me: ProfileData, other: MatchProfile, image: string) {
  // Lógica para enviar un mensaje de imagen
  console.log(`Enviando mensaje de imagen de ${me.name} a ${other.name}: ${image}`);
  return true;
}

// Función adicional para obtener la lista de mensajes
export function getMessages(me: ProfileData, other: MatchProfile) {
  // Lógica para obtener la lista de mensajes
  console.log(`Obteniendo lista de mensajes entre ${me.name} y ${other.name}...`);
  return [];
}

// Función adicional para obtener la lista de contactos
export function getContacts(me: ProfileData) {
  // Lógica para obtener la lista de contactos
  console.log(`Obteniendo lista de contactos de ${me.name}...`);
  return [];
}

// Función adicional para obtener el historial de conversaciones
export function getConversationHistory(me: ProfileData, other: MatchProfile) {
  // Lógica para obtener el historial de conversaciones
  console.log(`Obteniendo historial de conversaciones entre ${me.name} y ${other.name}...`);
  return [];
}

// Función adicional para obtener el estado de la conexión en tiempo real
export function getRealTimeConnectionStatus(me: ProfileData, other: MatchProfile) {
  // Lógica para obtener el estado de la conexión en tiempo real
  console.log(`Obteniendo estado de la conexión en tiempo real entre ${me.name} y ${other.name}...`);
  return true;
}

// Función adicional para enviar un mensaje de texto con formato
export function sendFormattedMessage(me: ProfileData, other: MatchProfile, message: string) {
  // Lógica para enviar un mensaje de texto con formato
  console.log(`Enviando mensaje de texto con formato de ${me.name} a ${other.name}: ${message}`);
  return true;
}

// Función adicional para obtener la lista de mensajes no leídos
export function getUnreadMessages(me: ProfileData, other: MatchProfile) {
  // Lógica para obtener la lista de mensajes no leídos
  console.log(`Obteniendo lista de mensajes no leídos entre ${me.name} y ${other.name}...`);
  return [];
}