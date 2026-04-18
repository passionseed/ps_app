import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupEmptySubmissions() {
  console.log('🔍 Finding empty submissions...')
  
  // Find all empty submissions (no text, no image, no files)
  const { data: emptySubmissions, error: findError } = await supabase
    .from('hackathon_phase_activity_submissions')
    .select('id, participant_id, activity_id, created_at')
    .is('text_answer', null)
    .is('image_url', null)
    .or('file_urls.is.null,file_urls.eq.{}')
  
  if (findError) {
    console.error('❌ Error finding empty submissions:', findError)
    return
  }
  
  if (!emptySubmissions || emptySubmissions.length === 0) {
    console.log('✅ No empty submissions found')
    return
  }
  
  console.log(`🗑️ Found ${emptySubmissions.length} empty submissions:`)
  emptySubmissions.forEach(sub => {
    console.log(`  - ID: ${sub.id}, Participant: ${sub.participant_id}, Activity: ${sub.activity_id}`)
  })
  
  // Delete empty submissions
  const emptyIds = emptySubmissions.map(sub => sub.id)
  const { error: deleteError } = await supabase
    .from('hackathon_phase_activity_submissions')
    .delete()
    .in('id', emptyIds)
  
  if (deleteError) {
    console.error('❌ Error deleting empty submissions:', deleteError)
    return
  }
  
  console.log(`✅ Successfully deleted ${emptySubmissions.length} empty submissions`)
}

cleanupEmptySubmissions().catch(console.error)
