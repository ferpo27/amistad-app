import { supabase } from '../supabase';

const isAuthOk = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return data.session !== null;
  } catch (error) {
    console.error(error);
    return false;
  }
};