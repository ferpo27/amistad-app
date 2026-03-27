// src/storage/profilesStorage.ts
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

export type RemoteProfile = {
  id: string;
  displayName: string;
  username: string;
  country?: string;
  city?: string;
  nativeLang: string;
  bio?: string;
  interests: string[];
  learning: { lang: string; level?: string }[];
  photoUrl?: string | null;
};

const CACHE_KEY = 'discovery_profiles_cache';

export async function getDiscoveryProfiles(limit = 30): Promise<RemoteProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, displayName:display_name, username, country, city, nativeLang:native_lang, bio, interests, learning, photoUrl:photo_url')
      .limit(limit);

    if (error || !data) return [];
    const profiles = data as RemoteProfile[];
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(profiles));
    return profiles;
  } catch {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached) as RemoteProfile[];
    } catch { /* noop */ }
    return [];
  }
}

export async function getProfileById(id: string): Promise<RemoteProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, displayName:display_name, username, country, city, nativeLang:native_lang, bio, interests, learning, photoUrl:photo_url')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as RemoteProfile;
  } catch {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const profiles: RemoteProfile[] = JSON.parse(cached);
        return profiles.find((p) => p.id === id) ?? null;
      }
    } catch { /* noop */ }
    return null;
  }
}

// No se utiliza colors.accentSoft en este archivo, por lo que no hay nada que reemplazar.
// Si se necesitara utilizar colors.accentSoft en el futuro, se podría reemplazar de la siguiente manera:
// const accentSoft = colors.accent + '33';