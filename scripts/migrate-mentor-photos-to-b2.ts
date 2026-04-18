#!/usr/bin/env node
/**
 * Migrate mentor photos from Supabase Storage to Backblaze B2
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Backblaze B2 Configuration
const B2_CONFIG = {
  endpoint: process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com',
  bucketName: process.env.B2_BUCKET_NAME || 'pseed-dev',
  region: 'us-east-005',
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('SUPABASE_URL:', SUPABASE_URL ? 'Set ✓' : 'Missing ✗');
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'Set ✓' : 'Missing ✗');
console.log('B2_APPLICATION_KEY_ID:', B2_CONFIG.credentials.accessKeyId ? 'Set ✓' : 'Missing ✗');
console.log('B2_APPLICATION_KEY:', B2_CONFIG.credentials.secretAccessKey ? 'Set ✓' : 'Missing ✗');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const s3Client = new S3Client({
  endpoint: `https://${B2_CONFIG.endpoint}`,
  region: B2_CONFIG.region,
  credentials: B2_CONFIG.credentials,
});

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function uploadToB2(key: string, data: Buffer, contentType: string): Promise<string> {
  try {
    // Check if already exists
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: B2_CONFIG.bucketName,
        Key: key,
      }));
      console.log(`  ↳ Already exists: ${key}`);
      return `https://${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${key}`;
    } catch {
      // Doesn't exist, upload
    }

    await s3Client.send(new PutObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));

    const publicUrl = `https://${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${key}`;
    console.log(`  ↳ Uploaded: ${key}`);
    return publicUrl;
  } catch (error) {
    throw new Error(`Failed to upload: ${error}`);
  }
}

async function migrateMentorPhotos(): Promise<{ success: number; failed: number }> {
  console.log('\n🎓 Migrating mentor photos...');
  
  const { data: guides, error } = await supabase
    .from('mentor_guides')
    .select('id, mentor_photo_url')
    .not('mentor_photo_url', 'is', null);
  
  if (error) {
    console.error('Failed to fetch guides:', error);
    return { success: 0, failed: 0 };
  }
  
  let success = 0;
  let failed = 0;
  
  for (const guide of guides || []) {
    if (!guide.mentor_photo_url) continue;
    
    // Skip if already on B2
    if (guide.mentor_photo_url.includes('backblazeb2.com') || guide.mentor_photo_url.includes('cdn.passionseed.org')) {
      console.log(`  Guide ${guide.id.substring(0, 8)}...: Already on B2 ✓`);
      success++;
      continue;
    }
    
    // Check if it's a Supabase URL or just a filename
    let sourceUrl = guide.mentor_photo_url;
    if (!sourceUrl.startsWith('http')) {
      // It's a storage path, construct the public URL
      sourceUrl = `${SUPABASE_URL}/storage/v1/object/public/mentor-photos/${sourceUrl}`;
    }
    
    try {
      const urlObj = new URL(sourceUrl);
      const pathParts = urlObj.pathname.split('/');
      const filename = pathParts.pop() || `${guide.id}.jpg`;
      const b2Key = `mentor-photos/${guide.id}/${filename}`;
      
      console.log(`  Guide ${guide.id.substring(0, 8)}...: Downloading...`);
      const imageData = await downloadImage(sourceUrl);
      
      const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      console.log(`  Guide ${guide.id.substring(0, 8)}...: Uploading to B2...`);
      const newUrl = await uploadToB2(b2Key, imageData, contentType);
      
      // Update database
      const { error: updateError } = await supabase
        .from('mentor_guides')
        .update({ mentor_photo_url: newUrl })
        .eq('id', guide.id);
      
      if (updateError) {
        console.error(`  Guide ${guide.id.substring(0, 8)}...: DB update failed:`, updateError);
        failed++;
      } else {
        console.log(`  Guide ${guide.id.substring(0, 8)}...: ✓ Migrated`);
        success++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  Guide ${guide.id.substring(0, 8)}...: ✗ Failed:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}

async function main() {
  console.log('🚀 Mentor Photos Migration: Supabase → Backblaze B2');
  console.log('=====================================================\n');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  if (!B2_CONFIG.credentials.accessKeyId || !B2_CONFIG.credentials.secretAccessKey) {
    console.error('❌ Missing B2 credentials');
    process.exit(1);
  }
  
  const results = await migrateMentorPhotos();
  
  console.log('\n=====================================================');
  console.log('✅ Migration Complete!');
  console.log(`\nSuccess: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
