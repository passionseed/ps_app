import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY length:', SUPABASE_SERVICE_KEY.length);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkGuides() {
  const { data: guides, error } = await supabase
    .from('mentor_guides')
    .select('id, mentor_name, mentor_photo_url');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\nFound ${guides?.length || 0} mentor guides:`);
  guides?.forEach(g => {
    console.log(`  - ${g.mentor_name}: ${g.mentor_photo_url || 'No photo'}`);
  });
}

checkGuides().catch(console.error);
