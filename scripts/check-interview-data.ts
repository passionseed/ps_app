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
  const { data, error } = await supabase
    .from('expert_profiles')
    .select('id, name, interview_data, interview_transcript')
    .eq('id', 'f99af598-9ef9-4117-a84f-c16c689b87ba')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('Expert:', data?.name);
  console.log('Has interview_data:', !!data?.interview_data);
  console.log('Has interview_transcript:', !!data?.interview_transcript);
  console.log('Interview data keys:', data?.interview_data ? Object.keys(data.interview_data) : 'none');
  console.log('Transcript length:', data?.interview_transcript?.length || 0);
}

main();