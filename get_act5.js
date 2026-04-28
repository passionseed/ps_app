import { createClient } from '@supabase/supabase-js';
const sb = createClient('[REDACTED_SUPABASE_URL]', process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await sb.from('hackathon_phase_activities').select('id, title, phase_id').ilike('title', '%');
  console.log(data);
}
run();
