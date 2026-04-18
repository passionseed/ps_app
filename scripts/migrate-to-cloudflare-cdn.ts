#!/usr/bin/env node
/**
 * Update all B2 URLs to use Cloudflare CDN
 * 
 * Transforms:
 * - https://s3.us-east-005.backblazeb2.com/pseed-dev/... 
 * - → https://cdn.passionseed.org/...
 * 
 * Usage: npx tsx scripts/migrate-to-cloudflare-cdn.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLOUDFLARE_DOMAIN = process.env.CLOUDFLARE_DOMAIN || 'cdn.passionseed.org';
const B2_ENDPOINT = 's3.us-east-005.backblazeb2.com';
const B2_BUCKET = 'pseed-dev';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function transformB2UrlToCloudflare(b2Url: string): string | null {
  if (!b2Url.includes(B2_ENDPOINT)) {
    // Already Cloudflare or different URL
    return null;
  }
  
  // Extract path after bucket
  // Format: https://s3.us-east-005.backblazeb2.com/pseed-dev/webtoons/...
  const bucketPath = b2Url.replace(`https://${B2_ENDPOINT}/${B2_BUCKET}/`, '');
  
  return `https://${CLOUDFLARE_DOMAIN}/${bucketPath}`;
}

async function updateWebtoons(): Promise<{ updated: number; skipped: number }> {
  console.log('\n📚 Updating webtoon URLs...');
  
  const { data: contents, error } = await supabase
    .from('hackathon_phase_activity_content')
    .select('id, metadata')
    .eq('content_type', 'webtoon');
  
  if (error) {
    console.error('Error fetching webtoons:', error);
    return { updated: 0, skipped: 0 };
  }
  
  let updated = 0;
  let skipped = 0;
  
  for (const content of contents || []) {
    const metadata = content.metadata;
    if (!metadata?.chunks) {
      skipped++;
      continue;
    }
    
    let hasChanges = false;
    const newChunks = metadata.chunks.map((chunk: any) => {
      const oldUrl = chunk.imageUrl || chunk.image_url;
      if (!oldUrl) return chunk;
      
      const newUrl = transformB2UrlToCloudflare(oldUrl);
      if (newUrl && newUrl !== oldUrl) {
        hasChanges = true;
        return { ...chunk, imageUrl: newUrl, image_url: undefined };
      }
      return chunk;
    });
    
    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('hackathon_phase_activity_content')
        .update({ metadata: { ...metadata, chunks: newChunks } })
        .eq('id', content.id);
      
      if (updateError) {
        console.error(`  ✗ Failed to update ${content.id}:`, updateError);
        skipped++;
      } else {
        console.log(`  ✓ Updated webtoon ${content.id.substring(0, 8)}...`);
        updated++;
      }
    } else {
      skipped++;
    }
  }
  
  return { updated, skipped };
}

async function updateTeamAvatars(): Promise<{ updated: number; skipped: number }> {
  console.log('\n👥 Updating team avatar URLs...');
  
  const { data: teams, error } = await supabase
    .from('hackathon_teams')
    .select('id, team_avatar_url')
    .not('team_avatar_url', 'is', null);
  
  if (error) {
    console.error('Error fetching teams:', error);
    return { updated: 0, skipped: 0 };
  }
  
  let updated = 0;
  let skipped = 0;
  
  for (const team of teams || []) {
    if (!team.team_avatar_url) {
      skipped++;
      continue;
    }
    
    const newUrl = transformB2UrlToCloudflare(team.team_avatar_url);
    if (!newUrl || newUrl === team.team_avatar_url) {
      skipped++;
      continue;
    }
    
    const { error: updateError } = await supabase
      .from('hackathon_teams')
      .update({ team_avatar_url: newUrl })
      .eq('id', team.id);
    
    if (updateError) {
      console.error(`  ✗ Failed to update team ${team.id}:`, updateError);
      skipped++;
    } else {
      console.log(`  ✓ Updated team ${team.id.substring(0, 8)}...`);
      updated++;
    }
  }
  
  return { updated, skipped };
}

async function updateSubmissions(): Promise<{ updated: number; skipped: number }> {
  console.log('\n📸 Updating submission image URLs...');
  
  const { data: submissions, error } = await supabase
    .from('hackathon_phase_activity_submissions')
    .select('id, image_url')
    .not('image_url', 'is', null);
  
  if (error) {
    console.error('Error fetching submissions:', error);
    return { updated: 0, skipped: 0 };
  }
  
  let updated = 0;
  let skipped = 0;
  
  for (const sub of submissions || []) {
    if (!sub.image_url) {
      skipped++;
      continue;
    }
    
    const newUrl = transformB2UrlToCloudflare(sub.image_url);
    if (!newUrl || newUrl === sub.image_url) {
      skipped++;
      continue;
    }
    
    const { error: updateError } = await supabase
      .from('hackathon_phase_activity_submissions')
      .update({ image_url: newUrl })
      .eq('id', sub.id);
    
    if (updateError) {
      console.error(`  ✗ Failed to update submission ${sub.id}:`, updateError);
      skipped++;
    } else {
      console.log(`  ✓ Updated submission ${sub.id.substring(0, 8)}...`);
      updated++;
    }
  }
  
  return { updated, skipped };
}

async function main() {
  console.log('☁️  Cloudflare CDN Migration');
  console.log('============================');
  console.log(`Domain: ${CLOUDFLARE_DOMAIN}`);
  console.log(`B2 Endpoint: ${B2_ENDPOINT}`);
  console.log(`B2 Bucket: ${B2_BUCKET}`);
  console.log('');
  console.log('This will transform URLs:');
  console.log(`  FROM: https://${B2_ENDPOINT}/${B2_BUCKET}/...`);
  console.log(`  TO:   https://${CLOUDFLARE_DOMAIN}/...`);
  console.log('');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  // Update all tables
  const webtoonResults = await updateWebtoons();
  const avatarResults = await updateTeamAvatars();
  const submissionResults = await updateSubmissions();
  
  // Summary
  console.log('\n============================');
  console.log('✅ Cloudflare Migration Complete!');
  console.log('\nWebtoons:');
  console.log(`  Updated: ${webtoonResults.updated}`);
  console.log(`  Skipped: ${webtoonResults.skipped}`);
  console.log('\nTeam Avatars:');
  console.log(`  Updated: ${avatarResults.updated}`);
  console.log(`  Skipped: ${avatarResults.skipped}`);
  console.log('\nSubmissions:');
  console.log(`  Updated: ${submissionResults.updated}`);
  console.log(`  Skipped: ${submissionResults.skipped}`);
  console.log('\n⚠️  IMPORTANT: Make sure DNS is configured first!');
  console.log(`   Add CNAME: ${CLOUDFLARE_DOMAIN} → ${B2_ENDPOINT}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
