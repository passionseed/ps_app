#!/usr/bin/env npx ts-node
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url!, key!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  // Get an approved expert profile
  const { data: expert } = await supabase
    .from('expert_profiles')
    .select('id, name, title')
    .eq('status', 'approved')
    .limit(1)
    .single();

  if (!expert) {
    console.log('No approved expert found');
    return;
  }

  console.log('Using expert:', expert);

  // Create an expert_pathlab record for testing
  const { data: pathlab, error } = await supabase
    .from('expert_pathlabs')
    .insert({
      expert_profile_id: expert.id,
      generation_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.log('Error creating pathlab:', error.message);
  } else {
    console.log('Created expert_pathlab:', pathlab);
  }
}

main();