#!/usr/bin/env node
/**
 * Migrate webtoon images from Supabase Storage to Backblaze B2
 * 
 * Usage: node scripts/migrate-webtoons-to-b2.ts
 * 
 * This script:
 * 1. Fetches all webtoon content from database
 * 2. Downloads images from Supabase Storage
 * 3. Uploads to Backblaze B2
 * 4. Updates database with new B2 URLs
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Backblaze B2 Configuration (S3-compatible)
const B2_CONFIG = {
  endpoint: process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com',
  bucketName: process.env.B2_BUCKET_NAME || 'pseed-dev',
  region: 'us-east-005',
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
};

// Supabase Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const s3Client = new S3Client({
  endpoint: `https://${B2_CONFIG.endpoint}`,
  region: B2_CONFIG.region,
  credentials: B2_CONFIG.credentials,
});

interface WebtoonChunk {
  id: string;
  order: number;
  imageKey?: string;
  imageUrl?: string;
  image_url?: string;
  width?: number;
  height?: number;
}

interface WebtoonContent {
  id: string;
  activity_id: string;
  metadata: {
    variant?: string;
    originalWidth?: number;
    originalHeight?: number;
    panelWidth?: number;
    panelHeight?: number;
    chunks: WebtoonChunk[];
  };
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function uploadToB2(key: string, data: Buffer, contentType: string): Promise<string> {
  try {
    // Check if file already exists
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: B2_CONFIG.bucketName,
        Key: key,
      }));
      console.log(`  ↳ Already exists in B2: ${key}`);
      return `https://${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${key}`;
    } catch {
      // File doesn't exist, proceed with upload
    }

    await s3Client.send(new PutObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));

    const publicUrl = `https://${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${key}`;
    console.log(`  ↳ Uploaded to B2: ${key}`);
    return publicUrl;
  } catch (error) {
    throw new Error(`Failed to upload to B2: ${error}`);
  }
}

function getB2KeyFromSupabaseUrl(url: string, storyId: string): string {
  // Extract filename from Supabase URL
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  return `webtoons/${storyId}/${filename}`;
}

async function migrateWebtoon(content: WebtoonContent): Promise<void> {
  console.log(`\n🎨 Migrating webtoon: ${content.id} (activity: ${content.activity_id})`);
  
  const metadata = content.metadata;
  const chunks = metadata?.chunks || [];
  
  if (chunks.length === 0) {
    console.log('  ⚠️ No chunks found');
    return;
  }

  // Extract story ID from first chunk's URL
  const firstChunkUrl = chunks[0].imageUrl || chunks[0].image_url;
  if (!firstChunkUrl) {
    console.log('  ⚠️ No URLs found in chunks');
    return;
  }

  // Parse story ID from URL path
  const urlMatch = firstChunkUrl.match(/\/webtoons\/([^/]+)\//);
  const storyId = urlMatch ? urlMatch[1] : content.activity_id;

  const updatedChunks: WebtoonChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const oldUrl = chunk.imageUrl || chunk.image_url;
    
    if (!oldUrl) {
      console.log(`  Chunk ${i + 1}: No URL, skipping`);
      updatedChunks.push(chunk);
      continue;
    }

    // Skip if already on B2
    if (oldUrl.includes(B2_CONFIG.endpoint)) {
      console.log(`  Chunk ${i + 1}: Already on B2 ✓`);
      updatedChunks.push(chunk);
      continue;
    }

    try {
      console.log(`  Chunk ${i + 1}: Downloading from Supabase...`);
      const imageData = await downloadImage(oldUrl);
      
      const contentType = oldUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const b2Key = getB2KeyFromSupabaseUrl(oldUrl, storyId);
      
      console.log(`  Chunk ${i + 1}: Uploading to B2...`);
      const newUrl = await uploadToB2(b2Key, imageData, contentType);
      
      updatedChunks.push({
        ...chunk,
        imageUrl: newUrl,
        image_url: undefined, // Clean up old field name if present
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ✗ Chunk ${i + 1} failed:`, error);
      updatedChunks.push(chunk); // Keep original on failure
    }
  }

  // Update database with new URLs
  const updatedMetadata = {
    ...metadata,
    chunks: updatedChunks,
  };

  console.log(`  💾 Updating database...`);
  const { error } = await supabase
    .from('hackathon_phase_activity_content')
    .update({ metadata: updatedMetadata })
    .eq('id', content.id);

  if (error) {
    console.error(`  ✗ Database update failed:`, error);
  } else {
    console.log(`  ✓ Migration complete for ${content.id}`);
  }
}

async function main() {
  console.log('🚀 Webtoon Migration: Supabase → Backblaze B2');
  console.log('================================================');
  
  // Verify environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  if (!B2_CONFIG.credentials.accessKeyId || !B2_CONFIG.credentials.secretAccessKey) {
    console.error('❌ Missing B2 credentials');
    console.error('Required: B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY');
    process.exit(1);
  }

  // Fetch all webtoon content
  console.log('\n📊 Fetching webtoon data from database...');
  const { data: contents, error } = await supabase
    .from('hackathon_phase_activity_content')
    .select('id, activity_id, metadata')
    .eq('content_type', 'webtoon');

  if (error) {
    console.error('❌ Failed to fetch webtoons:', error);
    process.exit(1);
  }

  if (!contents || contents.length === 0) {
    console.log('ℹ️ No webtoons found');
    process.exit(0);
  }

  console.log(`✅ Found ${contents.length} webtoons to migrate`);

  // Migrate each webtoon
  let successCount = 0;
  let failCount = 0;

  for (const content of contents) {
    try {
      await migrateWebtoon(content as WebtoonContent);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to migrate ${content.id}:`, error);
      failCount++;
    }
  }

  console.log('\n================================================');
  console.log('✅ Migration Complete!');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('\n⚠️  Important: Test the app to verify webtoons load correctly!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
