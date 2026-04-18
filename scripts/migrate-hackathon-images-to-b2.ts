#!/usr/bin/env node
/**
 * Migrate hackathon images from Supabase Storage to Backblaze B2
 * 
 * This migrates:
 * - hackathon_teams.team_avatar_url (hackathon-team-avatars bucket)
 * - hackathon_phase_activity_submissions.image_url (hackathon_submissions bucket)
 * 
 * Usage: npx tsx scripts/migrate-hackathon-images-to-b2.ts
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';

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

function getB2KeyFromSupabaseUrl(url: string, newFolder: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Extract bucket and path from Supabase URL
    // Format: /storage/v1/object/public/{bucket}/{path}
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex === -1) return null;
    
    const bucketAndPath = pathParts.slice(publicIndex + 1);
    const originalPath = bucketAndPath.join('/');
    
    // Map to B2 structure
    return `${newFolder}/${originalPath}`;
  } catch {
    return null;
  }
}

async function migrateTeamAvatars(): Promise<{ success: number; failed: number }> {
  console.log('\n🎨 Migrating team avatars...');
  
  const { data: teams, error } = await supabase
    .from('hackathon_teams')
    .select('id, team_avatar_url')
    .not('team_avatar_url', 'is', null);
  
  if (error) {
    console.error('Failed to fetch teams:', error);
    return { success: 0, failed: 0 };
  }
  
  let success = 0;
  let failed = 0;
  
  for (const team of teams || []) {
    if (!team.team_avatar_url) continue;
    
    // Skip if already on B2
    if (team.team_avatar_url.includes('backblazeb2.com')) {
      console.log(`  Team ${team.id.substring(0, 8)}...: Already on B2 ✓`);
      success++;
      continue;
    }
    
    const b2Key = getB2KeyFromSupabaseUrl(team.team_avatar_url, 'hackathon-team-avatars');
    if (!b2Key) {
      console.error(`  Team ${team.id.substring(0, 8)}...: Invalid URL format`);
      failed++;
      continue;
    }
    
    try {
      console.log(`  Team ${team.id.substring(0, 8)}...: Downloading...`);
      const imageData = await downloadImage(team.team_avatar_url);
      
      const contentType = team.team_avatar_url.endsWith('.png') ? 'image/png' : 'image/jpeg';
      console.log(`  Team ${team.id.substring(0, 8)}...: Uploading to B2...`);
      const newUrl = await uploadToB2(b2Key, imageData, contentType);
      
      // Update database
      const { error: updateError } = await supabase
        .from('hackathon_teams')
        .update({ team_avatar_url: newUrl })
        .eq('id', team.id);
      
      if (updateError) {
        console.error(`  Team ${team.id.substring(0, 8)}...: DB update failed:`, updateError);
        failed++;
      } else {
        console.log(`  Team ${team.id.substring(0, 8)}...: ✓ Migrated`);
        success++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  Team ${team.id.substring(0, 8)}...: ✗ Failed:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}

async function migrateSubmissionImages(): Promise<{ success: number; failed: number }> {
  console.log('\n📸 Migrating submission images...');
  
  const { data: submissions, error } = await supabase
    .from('hackathon_phase_activity_submissions')
    .select('id, image_url')
    .not('image_url', 'is', null);
  
  if (error) {
    console.error('Failed to fetch submissions:', error);
    return { success: 0, failed: 0 };
  }
  
  let success = 0;
  let failed = 0;
  
  for (const sub of submissions || []) {
    if (!sub.image_url) continue;
    
    // Skip if already on B2
    if (sub.image_url.includes('backblazeb2.com')) {
      console.log(`  Submission ${sub.id.substring(0, 8)}...: Already on B2 ✓`);
      success++;
      continue;
    }
    
    const b2Key = getB2KeyFromSupabaseUrl(sub.image_url, 'hackathon-submissions');
    if (!b2Key) {
      console.error(`  Submission ${sub.id.substring(0, 8)}...: Invalid URL format`);
      failed++;
      continue;
    }
    
    try {
      console.log(`  Submission ${sub.id.substring(0, 8)}...: Downloading...`);
      const imageData = await downloadImage(sub.image_url);
      
      const contentType = sub.image_url.endsWith('.png') ? 'image/png' : 'image/jpeg';
      console.log(`  Submission ${sub.id.substring(0, 8)}...: Uploading to B2...`);
      const newUrl = await uploadToB2(b2Key, imageData, contentType);
      
      // Update database
      const { error: updateError } = await supabase
        .from('hackathon_phase_activity_submissions')
        .update({ image_url: newUrl })
        .eq('id', sub.id);
      
      if (updateError) {
        console.error(`  Submission ${sub.id.substring(0, 8)}...: DB update failed:`, updateError);
        failed++;
      } else {
        console.log(`  Submission ${sub.id.substring(0, 8)}...: ✓ Migrated`);
        success++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  Submission ${sub.id.substring(0, 8)}...: ✗ Failed:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}

async function main() {
  console.log('🚀 Hackathon Images Migration: Supabase → Backblaze B2');
  console.log('=======================================================\n');
  
  // Verify environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  if (!B2_CONFIG.credentials.accessKeyId || !B2_CONFIG.credentials.secretAccessKey) {
    console.error('❌ Missing B2 credentials');
    process.exit(1);
  }
  
  // Migrate team avatars
  const avatarResults = await migrateTeamAvatars();
  
  // Migrate submission images  
  const submissionResults = await migrateSubmissionImages();
  
  // Summary
  console.log('\n=======================================================');
  console.log('✅ Migration Complete!');
  console.log('\nTeam Avatars:');
  console.log(`  Success: ${avatarResults.success}`);
  console.log(`  Failed: ${avatarResults.failed}`);
  console.log('\nSubmission Images:');
  console.log(`  Success: ${submissionResults.success}`);
  console.log(`  Failed: ${submissionResults.failed}`);
  console.log('\n⚠️  Test the app to verify images load correctly!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
