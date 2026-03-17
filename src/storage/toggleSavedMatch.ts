import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_MATCHES_KEY = 'savedMatches';

export async function toggleSavedMatch(matchId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SAVED_MATCHES_KEY);
    const saved: string[] = stored ? JSON.parse(stored) : [];

    const idx = saved.indexOf(matchId);
    if (idx >= 0) {
      saved.splice(idx, 1);
    } else {
      saved.push(matchId);
    }

    await AsyncStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(saved));
  } catch (e) {
    // error handling can be added here if needed
  }
}