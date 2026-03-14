import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tu-supabase-url.supabase.co';
const supabaseKey = 'tu-supabase-key';

const supabaseOptions: Record<string, unknown> = {};

if ('headers' in supabaseOptions) {
  delete supabaseOptions.headers;
}

const supabase = createClient(supabaseUrl, supabaseKey, supabaseOptions);

export default supabase;