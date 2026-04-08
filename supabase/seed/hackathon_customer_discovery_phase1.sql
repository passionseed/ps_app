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
  status,
  starts_at,
  ends_at
)
VALUES (
  'f1000000-0000-0000-0000-000000000010',
  'f1000000-0000-0000-0000-000000000001',
  'phase-1-customer-discovery',
  'Phase 1: Customer Discovery',
  'Systems-thinking customer discovery: understand the system, gather interview evidence, map leverage points, and decide whether to proceed.',
  1,
  'released',
  '2026-04-07T00:00:00Z',
  '2026-04-26T23:59:59Z'
)
ON CONFLICT (program_id, slug) DO NOTHING;

UPDATE public.hackathon_program_phases
SET
  title = 'Phase 1: Customer Discovery',
  description = 'Systems-thinking customer discovery: understand the system, gather interview evidence, map leverage points, and decide whether to proceed.',
  status = 'released',
  due_at = '2026-04-26T23:59:59Z'
WHERE id = 'f1000000-0000-0000-0000-000000000010';

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
  'Systems Thinking Core Playlist',
  'Start from the desired outcome, gather evidence from reality, synthesize the system, and make a clear decision.',
  1
)
ON CONFLICT (phase_id, slug) DO NOTHING;

UPDATE public.hackathon_phase_playlists
SET
  title = 'Systems Thinking Core Playlist',
  description = 'Start from the desired outcome, gather evidence from reality, synthesize the system, and make a clear decision.'
WHERE id = 'f1000000-0000-0000-0000-000000000020';

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
    'Start With the End',
    'See the Problem Proof Pack and what strong Phase 1 evidence looks like.',
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
    'See the System',
    'Learn to notice actors, incentives, workarounds, and loops before you interview.',
    2,
    'hybrid',
    'all_members_complete',
    'auto',
    4
  ),
  (
    'f1000000-0000-0000-0000-000000000103',
    'f1000000-0000-0000-0000-000000000020',
    'pain-point-definition',
    'Interview and Evidence',
    'Collect and upload real interview evidence grounded in concrete behavior.',
    3,
    'hybrid',
    'all_members_complete',
    'auto',
    4
  ),
  (
    'f1000000-0000-0000-0000-000000000104',
    'f1000000-0000-0000-0000-000000000020',
    'persona-jtbd',
    'System Synthesis',
    'Turn evidence into a shared system map with loops, bottlenecks, and leverage points.',
    4,
    'team',
    'team_submission_pass',
    'auto_then_mentor',
    4
  ),
  (
    'f1000000-0000-0000-0000-000000000105',
    'f1000000-0000-0000-0000-000000000020',
    'research-reflection',
    'Decision and Proof Pack',
    'Make a Proceed, Pivot, or Kill decision and prepare the mentor-ready proof pack.',
    5,
    'team',
    'mentor_pass',
    'mentor',
    4
  )
ON CONFLICT (playlist_id, slug) DO NOTHING;

UPDATE public.hackathon_phase_modules
SET
  title = 'Start With the End',
  summary = 'See the Problem Proof Pack and what strong Phase 1 evidence looks like.',
  workflow_scope = 'individual',
  gate_rule = 'all_members_complete',
  review_mode = 'auto',
  required_member_count = 4
WHERE id = 'f1000000-0000-0000-0000-000000000101';

UPDATE public.hackathon_phase_modules
SET
  title = 'See the System',
  summary = 'Learn to notice actors, incentives, workarounds, and loops before you interview.',
  workflow_scope = 'hybrid',
  gate_rule = 'all_members_complete',
  review_mode = 'auto',
  required_member_count = 4
WHERE id = 'f1000000-0000-0000-0000-000000000102';

UPDATE public.hackathon_phase_modules
SET
  title = 'Interview and Evidence',
  summary = 'Collect and upload real interview evidence grounded in concrete behavior.',
  workflow_scope = 'hybrid',
  gate_rule = 'all_members_complete',
  review_mode = 'auto',
  required_member_count = 4
WHERE id = 'f1000000-0000-0000-0000-000000000103';

UPDATE public.hackathon_phase_modules
SET
  title = 'System Synthesis',
  summary = 'Turn evidence into a shared system map with loops, bottlenecks, and leverage points.',
  workflow_scope = 'team',
  gate_rule = 'team_submission_pass',
  review_mode = 'auto_then_mentor',
  required_member_count = 4
WHERE id = 'f1000000-0000-0000-0000-000000000104';

UPDATE public.hackathon_phase_modules
SET
  title = 'Decision and Proof Pack',
  summary = 'Make a Proceed, Pivot, or Kill decision and prepare the mentor-ready proof pack.',
  workflow_scope = 'team',
  gate_rule = 'mentor_pass',
  review_mode = 'mentor',
  required_member_count = 4
WHERE id = 'f1000000-0000-0000-0000-000000000105';
