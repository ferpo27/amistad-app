import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { supabaseUrl, supabaseAnonKey } = Constants.expoConfig?.extra || {};

if (!supabaseUrl) {
  throw new Error('Missing supabaseUrl in app config extra');
}
if (!supabaseAnonKey) {
  throw new Error('Missing supabaseAnonKey in app config extra');
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string,
  {
    auth: {
      storage: AsyncStorage,
    },
  }
);