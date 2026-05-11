import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_URL must be set');
  process.exit(1);
}
const sb = createClient(supabaseUrl, process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await sb.from('hackathon_phase_activities').select('id, title, phase_id').ilike('title', '%');
  console.log(data);
}
run();
