INSERT INTO public.hackathon_programs (id, slug, title, description, status)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'super-seed-hackathon',
  'Super Seed Hackathon',
  'Three hackathon phases delivered as a playlist of team-based PathLab modules.',
  'active'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.hackathon_program_phases (
  id,
  program_id,
  slug,
  title,
  description,
  phase_number,
  starts_at,
  ends_at
)
VALUES (
  'f1000000-0000-0000-0000-000000000010',
  'f1000000-0000-0000-0000-000000000001',
  'phase-1-customer-discovery',
  'Phase 1: Customer Discovery',
  'Find real customer pain, validate it with interviews, and synthesize it into a stronger problem direction.',
  1,
  '2026-04-07T00:00:00Z',
  '2026-04-26T23:59:59Z'
)
ON CONFLICT (program_id, slug) DO NOTHING;

INSERT INTO public.hackathon_phase_playlists (
  id,
  phase_id,
  slug,
  title,
  description,
  display_order
)
VALUES (
  'f1000000-0000-0000-0000-000000000020',
  'f1000000-0000-0000-0000-000000000010',
  'customer-discovery-core',
  'Customer Discovery Core Playlist',
  'Interview, evidence, pain point, persona, research, and reflection.',
  1
)
ON CONFLICT (phase_id, slug) DO NOTHING;

INSERT INTO public.hackathon_phase_modules (
  id,
  playlist_id,
  slug,
  title,
  summary,
  display_order,
  workflow_scope,
  gate_rule,
  review_mode,
  required_member_count
)
VALUES
  (
    'f1000000-0000-0000-0000-000000000101',
    'f1000000-0000-0000-0000-000000000020',
    'interview-mindset',
    'Interview Mindset',
    'Practice the 5 Whys and interview behavior before talking to real users.',
    1,
    'individual',
    'all_members_complete',
    'auto',
    4
  ),
  (
    'f1000000-0000-0000-0000-000000000102',
    'f1000000-0000-0000-0000-000000000020',
    'real-customer-evidence',
    'Real Customer Evidence',
    'Collect real interview artifacts and route them through mentor review.',
    2,
    'hybrid',
    'mentor_pass',
    'mentor',
    4
  ),
  (
    'f1000000-0000-0000-0000-000000000103',
    'f1000000-0000-0000-0000-000000000020',
    'pain-point-definition',
    'Pain Point Definition',
    'Synthesize interview evidence into a validated problem definition with AI critique.',
    3,
    'team',
    'team_submission_pass',
    'auto_then_mentor',
    4
  ),
  (
    'f1000000-0000-0000-0000-000000000104',
    'f1000000-0000-0000-0000-000000000020',
    'persona-jtbd',
    'Persona + JTBD Workspace',
    'Build the persona, journey, JTBD, and pains/gains in a shared team workspace.',
    4,
    'team',
    'team_submission_pass',
    'auto',
    4
  ),
  (
    'f1000000-0000-0000-0000-000000000105',
    'f1000000-0000-0000-0000-000000000020',
    'research-reflection',
    'Research + Reflection',
    'Create the NotebookLM-ready evidence pack and capture what the team learned.',
    5,
    'hybrid',
    'all_members_complete',
    'auto',
    4
  )
ON CONFLICT (playlist_id, slug) DO NOTHING;

-- Phase 1 activities (direct activity list, no day layer)
-- due_at for phase 1
UPDATE public.hackathon_program_phases
SET due_at = '2026-04-26T23:59:59Z'
WHERE id = 'f1000000-0000-0000-0000-000000000010';

-- Activity 1: Watch intro video
INSERT INTO public.hackathon_phase_activities (
  id, phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft
) VALUES (
  'fa000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000010',
  'Customer Discovery Overview',
  'Watch this short video to understand what customer discovery means and why it matters.',
  0, 5, true, false
) ON CONFLICT (phase_id, display_order) DO NOTHING;

INSERT INTO public.hackathon_phase_activity_content (
  id, activity_id, content_type, content_title, content_url, display_order
) VALUES (
  'fb000000-0000-0000-0000-000000000001',
  'fa000000-0000-0000-0000-000000000001',
  'video',
  'What is Customer Discovery?',
  'https://www.youtube.com/watch?v=IVhPCOKu7Rs',
  0
) ON CONFLICT (activity_id, display_order) DO NOTHING;

-- Activity 2: Read the brief
INSERT INTO public.hackathon_phase_activities (
  id, phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft
) VALUES (
  'fa000000-0000-0000-0000-000000000002',
  'f1000000-0000-0000-0000-000000000010',
  'Read the Problem Brief',
  'Read your track''s problem brief carefully before conducting interviews.',
  1, 10, true, false
) ON CONFLICT (phase_id, display_order) DO NOTHING;

INSERT INTO public.hackathon_phase_activity_content (
  id, activity_id, content_type, content_title, content_body, display_order
) VALUES (
  'fb000000-0000-0000-0000-000000000002',
  'fa000000-0000-0000-0000-000000000002',
  'text',
  'Problem Brief Guide',
  'Your goal this phase is to identify the real pain behind your track''s problem statement. Talk to at least 5 people. Ask open-ended questions. Focus on behaviors, not opinions.',
  0
) ON CONFLICT (activity_id, display_order) DO NOTHING;

-- Activity 3: Submit interview notes (individual submission)
INSERT INTO public.hackathon_phase_activities (
  id, phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft
) VALUES (
  'fa000000-0000-0000-0000-000000000003',
  'f1000000-0000-0000-0000-000000000010',
  'Submit Interview Notes',
  'Conduct at least 3 customer interviews and submit your notes summarizing what you learned.',
  2, 60, true, false
) ON CONFLICT (phase_id, display_order) DO NOTHING;

INSERT INTO public.hackathon_phase_activity_assessments (
  id, activity_id, assessment_type, is_graded, metadata
) VALUES (
  'fc000000-0000-0000-0000-000000000001',
  'fa000000-0000-0000-0000-000000000003',
  'text_answer',
  false,
  '{"submission_label": "Interview Notes", "min_words": 100, "rubric": "Summarize what you heard from each interviewee. What pain points came up most?"}'::jsonb
) ON CONFLICT (activity_id) DO NOTHING;
