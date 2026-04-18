import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listFiles(bucketId: string, path = '') {
  const { data, error } = await supabase
    .storage
    .from(bucketId)
    .list(path);
  
  if (error) {
    console.error(`  Error listing ${bucketId}/${path}:`, error.message);
    return [];
  }
  
  let files: string[] = [];
  
  for (const item of data || []) {
    if (item.id) {
      // It's a file
      files.push(path ? `${path}/${item.name}` : item.name);
    } else {
      // It's a folder - we need to get public URL
      const subFiles = await listFiles(bucketId, path ? `${path}/${item.name}` : item.name);
      files = files.concat(subFiles);
    }
  }
  
  return files;
}

async function checkBucket(bucketId: string) {
  console.log(`\n📦 Checking bucket: ${bucketId}`);
  const files = await listFiles(bucketId);
  console.log(`  Found ${files.length} files`);
  files.slice(0, 10).forEach(f => console.log(`    - ${f}`));
  if (files.length > 10) console.log(`    ... and ${files.length - 10} more`);
  return files;
}

async function main() {
  const photos = await checkBucket('mentor-photos');
  const videos = await checkBucket('pathlab-videos');
  const assets = await checkBucket('seed-assets');
  
  console.log('\n📊 Summary:');
  console.log(`  mentor-photos: ${photos.length} files`);
  console.log(`  pathlab-videos: ${videos.length} files`);
  console.log(`  seed-assets: ${assets.length} files`);
  console.log(`  Total: ${photos.length + videos.length + assets.length} files`);
}

main().catch(console.error);
