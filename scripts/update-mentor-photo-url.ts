import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const B2_ENDPOINT = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
const B2_BUCKET = process.env.B2_BUCKET_NAME || 'pseed-dev';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateMentorPhotoUrl() {
  console.log('🎓 Updating mentor guide photo URL...\n');
  
  const newPhotoUrl = `https://${B2_ENDPOINT}/${B2_BUCKET}/mentor-photos/mentors/8ae7935e-5075-4de2-990b-070561c48da4.jpg`;
  
  // Get the guide
  const { data: guides, error: fetchError } = await supabase
    .from('mentor_guides')
    .select('id, mentor_name, mentor_photo_url');
  
  if (fetchError) {
    console.error('Error fetching guides:', fetchError);
    return;
  }
  
  console.log(`Found ${guides?.length || 0} mentor guide(s)`);
  
  for (const guide of guides || []) {
    console.log(`\nGuide: ${guide.mentor_name}`);
    console.log(`  Current URL: ${guide.mentor_photo_url || 'None'}`);
    
    if (!guide.mentor_photo_url || guide.mentor_photo_url.includes('backblazeb2.com')) {
      console.log(`  ⏭️  Already on B2 or no photo`);
      continue;
    }
    
    // Update to B2 URL
    const { error: updateError } = await supabase
      .from('mentor_guides')
      .update({ mentor_photo_url: newPhotoUrl })
      .eq('id', guide.id);
    
    if (updateError) {
      console.error(`  ❌ Update failed:`, updateError);
    } else {
      console.log(`  ✅ Updated to: ${newPhotoUrl}`);
    }
  }
}

updateMentorPhotoUrl().catch(console.error);
