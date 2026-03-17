import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export async function getSavedMatches(): Promise<any[]> {
  // Try to fetch from Supabase first
  try {
    const { data, error } = await supabase.from('saved_matches').select('*');
    if (!error && data) {
      // Cache the result locally for offline access
      await AsyncStorage.setItem('savedMatches', JSON.stringify(data));
      return data as any[];
    }
  } catch {
    // Ignore Supabase errors and fall back to local storage
  }

  // Fallback to AsyncStorage
  try {
    const stored = await AsyncStorage.getItem('savedMatches');
    if (stored) {
      return JSON.parse(stored) as any[];
    }
  } catch {
    // If parsing fails, return empty array
  }

  return [];
}