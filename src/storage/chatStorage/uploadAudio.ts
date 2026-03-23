import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadAudio(audio: File): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('audios')
      .upload(audio.name, audio, {
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return data.path;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export { uploadAudio };