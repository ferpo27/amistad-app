import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tu-supabase-url.supabase.co';
const supabaseKey = 'tu-supabase-key';
const supabaseSecret = 'tu-supabase-secret';

const supabase = createClient(supabaseUrl, supabaseKey, supabaseSecret);

async function getBlockedList() {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id, user_id, blocked_user_id');

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default getBlockedList;