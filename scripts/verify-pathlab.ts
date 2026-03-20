#!/usr/bin/env npx ts-node
import { config } from 'dotenv';
config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Get the expert_pathlab we just created
  const { data: pathlab } = await supabase
    .from('expert_pathlabs')
    .select('id, generation_status, seed_id, path_id, seeds(title)')
    .eq('expert_profile_id', 'f99af598-9ef9-4117-a84f-c16c689b87ba')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Expert PathLab:', pathlab);

  if (pathlab?.path_id) {
    // Get path with days
    const { data: path } = await supabase
      .from('paths')
      .select(`
        id,
        total_days,
        path_days (
          day_number,
          title,
          context_text
        )
      `)
      .eq('id', pathlab.path_id)
      .single();

    console.log('\nPath:', path);
  }
}

main();