import { supabase } from '../lib/supabase';

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