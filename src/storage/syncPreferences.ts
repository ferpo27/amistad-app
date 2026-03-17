import AsyncStorage from '@react-native-async-storage/async-storage';

export async function syncPreferences(prefs: any): Promise<void> {
  // Save preferences locally
  await AsyncStorage.setItem('userPreferences', JSON.stringify(prefs));

  // Attempt to sync with remote storage
  try {
    const token = await AsyncStorage.getItem('authToken');
    const endpoint = `${process.env.API_URL ?? ''}/preferences`;

    await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(prefs),
    });
  } catch (error) {
    console.error('Error syncing preferences:', error);
  }
}