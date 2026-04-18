import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSubmissions() {
  // Get all submissions to analyze
  const { data: submissions, error } = await supabase
    .from('hackathon_phase_activity_submissions')
    .select('id, text_answer, image_url, file_urls, created_at, participant_id, activity_id')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Total submissions found: ${submissions?.length || 0}`)
  
  // Count by content type
  let emptyCount = 0
  let withTextCount = 0
  let withImageCount = 0
  let withFilesCount = 0
  const emptySubmissions: any[] = []
  
  submissions?.forEach((sub: any) => {
    const hasText = sub.text_answer !== null && sub.text_answer !== ''
    const hasImage = sub.image_url !== null && sub.image_url !== ''
    const hasFiles = sub.file_urls !== null && sub.file_urls.length > 0
    const isEmpty = !hasText && !hasImage && !hasFiles
    
    if (hasText) withTextCount++
    if (hasImage) withImageCount++
    if (hasFiles) withFilesCount++
    if (isEmpty) {
      emptyCount++
      emptySubmissions.push(sub)
    }
  })
  
  console.log('\n--- Summary ---')
  console.log(`Total: ${submissions?.length || 0}`)
  console.log(`Empty: ${emptyCount}`)
  console.log(`With text: ${withTextCount}`)
  console.log(`With image: ${withImageCount}`)
  console.log(`With files: ${withFilesCount}`)
  
  if (emptyCount > 0) {
    console.log('\n--- Empty Submissions ---')
    emptySubmissions.forEach(sub => {
      console.log(`  - ID: ${sub.id}`)
      console.log(`    Participant: ${sub.participant_id}`)
      console.log(`    Activity: ${sub.activity_id}`)
      console.log(`    Created: ${sub.created_at}`)
    })
  }
}

checkSubmissions().catch(console.error)
