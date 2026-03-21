import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseSecret = process.env.SUPABASE_SECRET;

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