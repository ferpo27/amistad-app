import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_PREFIX = 'chat:';

export async function saveMessage(chatId: string, message: any): Promise<void> {
  const key = `${CHAT_PREFIX}${chatId}`;
  const stored = await AsyncStorage.getItem(key);
  const messages = stored ? JSON.parse(stored) : [];
  messages.push(message);
  await AsyncStorage.setItem(key, JSON.stringify(messages));
}

export async function getMessages(chatId: string): Promise<any[]> {
  const key = `${CHAT_PREFIX}${chatId}`;
  const stored = await AsyncStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}