import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILES_KEY = 'profiles_storage_key';

export async function getAllProfiles(): Promise<any[]> {
  try {
    const json = await AsyncStorage.getItem(PROFILES_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load profiles:', e);
    return [];
  }
}

export async function addProfile(profile: any): Promise<void> {
  try {
    const profiles = await getAllProfiles();
    profiles.push(profile);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to add profile:', e);
    throw e;
  }
}

export { uploadProfilePhoto, upsertMyProfile };