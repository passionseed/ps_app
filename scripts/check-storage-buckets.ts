import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listBucketFiles(bucketId: string) {
  console.log(`\n📦 Checking bucket: ${bucketId}`);
  
  // Try listing from storage.objects table
  const { data: objects, error } = await supabase
    .from('storage.objects')
    .select('name, id, created_at')
    .eq('bucket_id', bucketId);
  
  if (error) {
    console.error(`  Error: ${error.message}`);
    return 0;
  }
  
  console.log(`  Found ${objects?.length || 0} files`);
  objects?.forEach((obj, i) => {
    if (i < 10) console.log(`    - ${obj.name}`);
  });
  if ((objects?.length || 0) > 10) console.log(`    ... and ${objects!.length - 10} more`);
  
  return objects?.length || 0;
}

async function main() {
  const photos = await listBucketFiles('mentor-photos');
  const videos = await listBucketFiles('pathlab-videos');
  const assets = await listBucketFiles('seed-assets');
  
  console.log('\n📊 Summary:');
  console.log(`  mentor-photos: ${photos} files`);
  console.log(`  pathlab-videos: ${videos} files`);
  console.log(`  seed-assets: ${assets} files`);
  console.log(`  Total: ${photos + videos + assets} files`);
}

main().catch(console.error);
