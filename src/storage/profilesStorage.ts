import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../theme';

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

    if (error || !data) {
      throw new Error('Error al obtener perfiles');
    }
    const profiles: RemoteProfile[] = data;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(profiles));
    return profiles;
  } catch (error) {
    console.error('Error al obtener perfiles:', error);
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached) as RemoteProfile[];
    } catch (error) {
      console.error('Error al obtener perfiles desde caché:', error);
    }
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

    if (error || !data) {
      throw new Error('Error al obtener perfil');
    }
    return data as RemoteProfile;
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const profiles: RemoteProfile[] = JSON.parse(cached);
        return profiles.find((p) => p.id === id) ?? null;
      }
    } catch (error) {
      console.error('Error al obtener perfil desde caché:', error);
    }
    return null;
  }
}