import { supabase } from '../lib/supabase';

export async function updateProfile(data: any): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(data, { returning: 'minimal' });

  if (error) {
    throw error;
  }
}

export async function updateStory(data: any): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .upsert(data, { returning: 'minimal' });

  if (error) {
    throw error;
  }
}