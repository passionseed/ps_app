import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SB_SVC) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

async function run() {
  // Get phase 2
  const { data: phases } = await sb
    .from('hackathon_program_phases')
    .select('id, title, phase_number, slug')
    .eq('phase_number', 2);

  console.log('=== Phase 2 ===');
  console.log(JSON.stringify(phases, null, 2));

  if (!phases || !phases[0]) {
    console.log('No phase 2 found');
    return;
  }
  const phaseId = phases[0].id;

  // Get activities for phase 2
  const { data: activities } = await sb
    .from('hackathon_phase_activities')
    .select('id, title, instructions, display_order, estimated_minutes, submission_scope, status')
    .eq('phase_id', phaseId)
    .order('display_order');

  console.log('\n=== Phase 2 Activities ===');
  console.log(JSON.stringify(activities, null, 2));

  if (!activities || !activities[0]) {
    console.log('No activities found');
    return;
  }
  const activity1 = activities[0];

  // Get content for activity 1
  const { data: content } = await sb
    .from('hackathon_phase_activity_content')
    .select('*')
    .eq('activity_id', activity1.id)
    .order('display_order');

  console.log('\n=== Activity 1 Content ===');
  console.log(JSON.stringify(content, null, 2));

  // Get assessments for activity 1
  const { data: assessments } = await sb
    .from('hackathon_phase_activity_assessments')
    .select('*')
    .eq('activity_id', activity1.id)
    .order('display_order');

  console.log('\n=== Activity 1 Assessments ===');
  console.log(JSON.stringify(assessments, null, 2));
}

run().catch(console.error);
