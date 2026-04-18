#!/usr/bin/env node
/**
 * Migrate remaining Supabase Storage files to Backblaze B2
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const s3Client = new S3Client({
  endpoint: `https://${B2_CONFIG.endpoint}`,
  region: B2_CONFIG.region,
  credentials: B2_CONFIG.credentials,
});

async function listFiles(bucketId: string, path = ''): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucketId).list(path);
  if (error) return [];
  
  let files: string[] = [];
  for (const item of data || []) {
    if (item.id) {
      files.push(path ? `${path}/${item.name}` : item.name);
    } else {
      const subFiles = await listFiles(bucketId, path ? `${path}/${item.name}` : item.name);
      files = files.concat(subFiles);
    }
  }
  return files;
}

async function downloadFile(bucketId: string, path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucketId).download(path);
  if (error || !data) throw new Error(`Download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function uploadToB2(key: string, data: Buffer, contentType: string): Promise<string> {
  try {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: B2_CONFIG.bucketName, Key: key }));
      console.log(`    ↳ Already exists: ${key}`);
      return `https://${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${key}`;
    } catch {
      // Doesn't exist
    }

    await s3Client.send(new PutObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));

    console.log(`    ↳ Uploaded: ${key}`);
    return `https://${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${key}`;
  } catch (error) {
    throw new Error(`Upload failed: ${error}`);
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
    'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
    'pdf': 'application/pdf'
  };
  return types[ext] || 'application/octet-stream';
}

async function migrateBucketFiles(bucketId: string, folderPrefix: string, migrateDbFn?: (oldUrl: string, newUrl: string) => Promise<boolean>) {
  console.log(`\n📦 Migrating ${bucketId}...`);
  const files = await listFiles(bucketId);
  const validFiles = files.filter(f => !f.includes('.emptyFolderPlaceholder'));
  
  console.log(`  Found ${validFiles.length} files`);
  
  let success = 0, failed = 0;
  
  for (const file of validFiles) {
    try {
      console.log(`  📥 ${file}...`);
      const data = await downloadFile(bucketId, file);
      const b2Key = `${folderPrefix}/${file}`;
      const contentType = getContentType(file);
      const newUrl = await uploadToB2(b2Key, data, contentType);
      
      if (migrateDbFn) {
        const oldUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketId}/${file}`;
        const dbUpdated = await migrateDbFn(oldUrl, newUrl);
        console.log(`    ${dbUpdated ? '✓ DB updated' : '⚠ DB update skipped'}`);
      }
      
      success++;
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.error(`  ✗ Failed:`, error);
      failed++;
    }
  }
  
  return { success, failed, total: validFiles.length };
}

async function migrateMentorPhotoWithDbUpdate() {
  return migrateBucketFiles('mentor-photos', 'mentor-photos', async (oldUrl, newUrl) => {
    const { data: guides } = await supabase.from('mentor_guides').select('id, mentor_photo_url');
    for (const guide of guides || []) {
      if (guide.mentor_photo_url?.includes(oldUrl) || guide.mentor_photo_url?.includes('mentor-photos')) {
        const { error } = await supabase.from('mentor_guides').update({ mentor_photo_url: newUrl }).eq('id', guide.id);
        return !error;
      }
    }
    return false;
  });
}

async function main() {
  console.log('🚀 Remaining Storage Migration: Supabase → Backblaze B2');
  console.log('========================================================\n');
  
  if (!SUPABASE_SERVICE_KEY || !B2_CONFIG.credentials.accessKeyId) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }
  
  const mentorResults = await migrateMentorPhotoWithDbUpdate();
  const videoResults = await migrateBucketFiles('pathlab-videos', 'pathlab-videos');
  const assetResults = await migrateBucketFiles('seed-assets', 'seed-assets');
  
  console.log('\n========================================================');
  console.log('✅ Migration Complete!');
  console.log(`\nMentor Photos: ${mentorResults.success}/${mentorResults.total}`);
  console.log(`PathLab Videos: ${videoResults.success}/${videoResults.total}`);
  console.log(`Seed Assets: ${assetResults.success}/${assetResults.total}`);
  console.log(`\nTotal: ${mentorResults.success + videoResults.success + assetResults.success}/${mentorResults.total + videoResults.total + assetResults.total}`);
}

main().catch(console.error);
