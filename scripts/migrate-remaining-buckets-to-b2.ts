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

interface BucketFile {
  name: string
  id: string
  created_at: string
  bucket_id: string
  metadata: any
}

async function listBucketFiles(bucketId: string): Promise<BucketFile[]> {
  const { data, error } = await supabase
    .from('storage.objects')
    .select('name, id, created_at, bucket_id, metadata')
    .eq('bucket_id', bucketId)
  
  if (error) {
    console.error(`Error listing ${bucketId}:`, error)
    return []
  }
  
  return data || []
}

async function downloadFile(bucketId: string, path: string): Promise<Buffer> {
  const { data, error } = await supabase
    .storage
    .from(bucketId)
    .download(path)
  
  if (error || !data) {
    throw new Error(`Download failed: ${error?.message || 'No data'}`)
  }
  
  return Buffer.from(await data.arrayBuffer())
}

async function uploadToB2(key: string, data: Buffer, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
  
  // Upload to B2
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: data,
    headers: {
      'Content-Type': contentType,
    },
  })
  
  if (!response.ok) {
    throw new Error(`B2 upload failed: ${response.status} ${await response.text()}`)
  }
  
  return `https://${CLOUDFLARE_DOMAIN}/${key}`
}

async function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'pdf': 'application/pdf',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
  }
  return types[ext || ''] || 'application/octet-stream'
}

async function migrateBucket(bucketId: string, b2Folder: string) {
  console.log(`\n📦 Migrating ${bucketId}...`)
  
  const files = await listBucketFiles(bucketId)
  console.log(`  Found ${files.length} files`)
  
  if (files.length === 0) {
    console.log(`  ✅ No files to migrate in ${bucketId}`)
    return { success: 0, failed: 0, total: 0 }
  }
  
  let success = 0
  let failed = 0
  
  for (const file of files) {
    try {
      console.log(`  📥 ${file.name}...`)
      
      // Download from Supabase
      const data = await downloadFile(bucketId, file.name)
      
      // Upload to B2
      const b2Key = `${b2Folder}/${file.name}`
      const contentType = getContentType(file.name)
      const publicUrl = await uploadToB2(b2Key, data, contentType)
      
      console.log(`  ✅ Uploaded to ${publicUrl}`)
      success++
    } catch (error) {
      console.error(`  ❌ Failed: ${file.name}`, error)
      failed++
    }
  }
  
  console.log(`\n  ${bucketId} complete: ${success} success, ${failed} failed, ${files.length} total`)
  return { success, failed, total: files.length }
}

async function migrateMentorPhotos() {
  return migrateBucket('mentor-photos', 'mentor-photos')
}

async function migratePathlabVideos() {
  return migrateBucket('pathlab-videos', 'pathlab-videos')
}

async function migrateSeedAssets() {
  return migrateBucket('seed-assets', 'seed-assets')
}

async function main() {
  console.log('🚀 Starting remaining bucket migrations to B2...')
  console.log(`   B2 Bucket: ${B2_BUCKET}`)
  console.log(`   CDN Domain: ${CLOUDFLARE_DOMAIN}`)
  
  // Migrate each bucket
  const mentorResults = await migrateMentorPhotos()
  const videoResults = await migratePathlabVideos()
  const seedResults = await migrateSeedAssets()
  
  console.log('\n📊 Final Summary:')
  console.log(`  Mentor Photos: ${mentorResults.success}/${mentorResults.total}`)
  console.log(`  PathLab Videos: ${videoResults.success}/${videoResults.total}`)
  console.log(`  Seed Assets: ${seedResults.success}/${seedResults.total}`)
  console.log(`  Total: ${mentorResults.success + videoResults.success + seedResults.success}/${mentorResults.total + videoResults.total + seedResults.total}`)
  
  console.log('\n✅ Migration complete!')
}

main().catch(console.error)
