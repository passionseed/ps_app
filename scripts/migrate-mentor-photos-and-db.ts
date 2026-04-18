import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// B2 Configuration
const B2_ENDPOINT = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com'
const B2_BUCKET = process.env.B2_BUCKET_NAME || 'pseed-dev'
const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID!
const B2_KEY = process.env.B2_APPLICATION_KEY!
const CLOUDFLARE_DOMAIN = process.env.CLOUDFLARE_DOMAIN || 'cdn.passionseed.org'

const s3Client = new S3Client({
  endpoint: `https://${B2_ENDPOINT}`,
  region: 'us-east-005',
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_KEY,
  },
})

// Track URL mappings for database updates
const urlMappings: Array<{ oldUrl: string; newUrl: string; guideId: string }> = []

async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function uploadToB2(key: string, data: Buffer, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: data,
    headers: { 'Content-Type': contentType },
  })
  
  if (!response.ok) {
    throw new Error(`B2 upload failed: ${response.status}`)
  }
  
  return `https://${CLOUDFLARE_DOMAIN}/${key}`
}

async function migrateMentorPhotosWithDbUpdate() {
  console.log('\n🎓 Migrating mentor photos...')
  
  // Get all mentor guides with photos
  const { data: guides, error } = await supabase
    .from('mentor_guides')
    .select('id, mentor_photo_url')
    .not('mentor_photo_url', 'is', null)
  
  if (error) {
    console.error('Error fetching guides:', error)
    return { success: 0, failed: 0, updated: 0 }
  }
  
  console.log(`  Found ${guides?.length || 0} guides with photos`)
  
  let success = 0
  let failed = 0
  let skipped = 0
  
  for (const guide of guides || []) {
    if (!guide.mentor_photo_url) continue
    
    // Skip if already on B2
    if (guide.mentor_photo_url.includes('backblazeb2.com') || guide.mentor_photo_url.includes('cdn.passionseed.org')) {
      console.log(`  ⏭️  Already on B2: ${guide.mentor_photo_url.substring(0, 50)}...`)
      skipped++
      continue
    }
    
    try {
      console.log(`  📥 ${guide.id}: ${guide.mentor_photo_url.substring(0, 50)}...`)
      
      // Extract filename
      const url = new URL(guide.mentor_photo_url)
      const pathname = url.pathname
      const filename = pathname.split('/').pop() || `${guide.id}.jpg`
      
      // Download
      const data = await downloadFile(guide.mentor_photo_url)
      
      // Upload to B2
      const b2Key = `mentor-photos/${guide.id}/${filename}`
      const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg'
      const newUrl = await uploadToB2(b2Key, data, contentType)
      
      // Track mapping
      urlMappings.push({ oldUrl: guide.mentor_photo_url, newUrl, guideId: guide.id })
      
      console.log(`  ✅ Uploaded to ${newUrl}`)
      success++
    } catch (err) {
      console.error(`  ❌ Failed for guide ${guide.id}:`, err)
      failed++
    }
  }
  
  console.log(`\n  Upload complete: ${success} success, ${failed} failed, ${skipped} skipped`)
  
  // Update database
  console.log('\n  Updating database...')
  let updated = 0
  for (const mapping of urlMappings) {
    const { error: updateError } = await supabase
      .from('mentor_guides')
      .update({ mentor_photo_url: mapping.newUrl })
      .eq('id', mapping.guideId)
    
    if (updateError) {
      console.error(`  ❌ DB update failed for ${mapping.guideId}:`, updateError)
    } else {
      console.log(`  ✅ Updated ${mapping.guideId}`)
      updated++
    }
  }
  
  console.log(`  DB update: ${updated}/${urlMappings.length} updated`)
  return { success, failed, skipped, updated }
}

async function main() {
  console.log('🚀 Migrating mentor photos to B2...')
  const results = await migrateMentorPhotosWithDbUpdate()
  console.log('\n📊 Summary:', results)
}

main().catch(console.error)
