import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tu-supabase-url.supabase.co';
const supabaseKey = 'tu-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPreferences(profileId: string, preferences: any) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ preferences })
      .eq('id', profileId);

    if (error) {
      console.error(error);
    }

    return data;
  } catch (error) {
    console.error(error);
  }
}

export { syncPreferences };