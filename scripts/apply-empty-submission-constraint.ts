import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Need SUPABASE_SERVICE_ROLE_KEY for DDL')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyConstraint() {
  console.log('🔍 Checking for existing constraint...')
  
  // Check if constraint already exists
  const { data: existing, error: checkError } = await supabase.rpc('check_constraint_exists', {
    table_name: 'hackathon_phase_activity_submissions',
    constraint_name: 'check_not_empty_submission'
  })
  
  // If RPC doesn't exist, we'll try to create it or just proceed
  console.log('📝 Applying constraint to prevent empty submissions...')
  
  // First, clean up any empty submissions
  const { error: deleteError } = await supabase
    .from('hackathon_phase_activity_submissions')
    .delete()
    .is('text_answer', null)
    .is('image_url', null)
    .or('file_urls.is.null,file_urls.eq.{}')
  
  if (deleteError) {
    console.error('⚠️ Cleanup error:', deleteError.message)
  } else {
    console.log('✅ Cleaned up any empty submissions')
  }
  
  // Apply the constraint using SQL
  const sql = `
    ALTER TABLE public.hackathon_phase_activity_submissions
    DROP CONSTRAINT IF EXISTS check_not_empty_submission;
    
    ALTER TABLE public.hackathon_phase_activity_submissions
    ADD CONSTRAINT check_not_empty_submission
    CHECK (
      text_answer IS NOT NULL 
      OR image_url IS NOT NULL 
      OR (file_urls IS NOT NULL AND array_length(file_urls, 1) > 0)
    );
    
    COMMENT ON CONSTRAINT check_not_empty_submission ON public.hackathon_phase_activity_submissions 
    IS 'Prevents submissions with no content - must have text, image, or files';
  `
  
  const { error: sqlError } = await supabase.rpc('exec_sql', { sql })
  
  if (sqlError) {
    // Try direct SQL execution
    console.log('⚠️ RPC failed, trying direct SQL...')
    
    // Use raw SQL endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ query: sql })
    })
    
    if (!response.ok) {
      console.error('❌ Failed to apply constraint:', await response.text())
      console.log('\n⚠️ Manual action required:')
      console.log('Run this SQL in Supabase Dashboard SQL Editor:')
      console.log(sql)
      process.exit(1)
    }
  }
  
  console.log('✅ Constraint applied successfully!')
}

applyConstraint().catch(err => {
  console.error('Error:', err)
  console.log('\n⚠️ Please apply the migration manually via Supabase Dashboard:')
  console.log('File: supabase/migrations/20260417000000_prevent_empty_submissions.sql')
  process.exit(1)
})
