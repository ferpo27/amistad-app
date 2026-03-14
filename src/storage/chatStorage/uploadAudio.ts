import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tu-supabase-url.supabase.co';
const supabaseKey = 'tu-supabase-key';
const supabaseSecret = 'tu-supabase-secret';

const supabase = createClient(supabaseUrl, supabaseKey, supabaseSecret);

async function uploadAudio(audio: File): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('audios')
      .upload(audio, {
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return data.publicUrl;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export { uploadAudio };