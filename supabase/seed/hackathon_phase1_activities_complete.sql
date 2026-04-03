update public.hackathon_program_phases
set
  title = 'Phase 1: Customer Discovery',
  description = 'Rapid, evidence-driven customer discovery with AI practice, interviews, synthesis, and mentor handoff.',
  due_at = '2026-04-26T23:59:59Z'
where id = 'f1000000-0000-0000-0000-000000000010';

delete from public.hackathon_phase_activity_content
where activity_id in (
  select id
  from public.hackathon_phase_activities
  where phase_id = 'f1000000-0000-0000-0000-000000000010'
);

delete from public.hackathon_phase_activity_assessments
where activity_id in (
  select id
  from public.hackathon_phase_activities
  where phase_id = 'f1000000-0000-0000-0000-000000000010'
);

delete from public.hackathon_phase_activities
where phase_id = 'f1000000-0000-0000-0000-000000000010';

insert into public.hackathon_phase_activities (
  id, phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft
)
values
  ('fa100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000010', 'Show the Outcome', 'Show the outcome first: what the participant will get, who they could become, the skills they will build, how those skills help them fix the problem, and the challenge they will face.', 0, 1, true, false),
  ('fa100000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000010', 'Customer Discovery Interview', 'Run an engaging Empathize + Define interview where the participant is the interviewee. The chatbot should uncover behaviors, pain, and motivation without revealing too early what they are being interviewed for.', 1, 5, true, false),
  ('fa100000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000010', '5min Mascot 5-Whys', 'Learn the 5-Whys technique before interviewing real users.', 2, 5, true, false),
  ('fa100000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000010', '10min สัมภาษณ์ AI', 'Let the AI act as the interviewer and test how your team answers.', 3, 10, true, false),
  ('fa100000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000010', '20min Create Persona', 'Draft the first persona based on the strongest patterns you see so far.', 4, 20, true, false),
  ('fa100000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000010', '30min Real Interview Guidelines', 'Review the field guide before talking to real people.', 5, 30, true, false),
  ('fa100000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000010', '10min Upload Interview Evidence', 'Upload the strongest evidence gathered from your real interviews.', 6, 10, true, false),
  ('fa100000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000010', '10min AI Comment on Interview', 'Review AI feedback on the uploaded interview evidence.', 7, 10, true, false),
  ('fa100000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000010', '5min Problem Statement Guidelines', 'Use the infographic to tighten the problem statement.', 8, 5, true, false),
  ('fa100000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000010', '30min Discuss in Group', 'Synthesize your findings as a team before rewriting the persona and problem.', 9, 30, true, false),
  ('fa100000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000010', 'Updated Persona & Statement', 'Submit the revised persona and problem statement together.', 10, 20, true, false),
  ('fa100000-0000-0000-0000-000000000012', 'f1000000-0000-0000-0000-000000000010', 'AI Comment on Final Assets', 'Read the AI critique on your updated persona and problem statement.', 11, 10, true, false),
  ('fa100000-0000-0000-0000-000000000013', 'f1000000-0000-0000-0000-000000000010', '5min NotebookLM Guidelines', 'Prepare your evidence so it is ready for NotebookLM synthesis.', 12, 5, true, false),
  ('fa100000-0000-0000-0000-000000000014', 'f1000000-0000-0000-0000-000000000010', '30min Submit 3 Trustful Sources', 'Add the most credible sources backing your customer problem.', 13, 30, true, false),
  ('fa100000-0000-0000-0000-000000000015', 'f1000000-0000-0000-0000-000000000010', '30min Book Mentor', 'Book a mentor slot before moving to the final handoff.', 14, 30, true, false),
  ('fa100000-0000-0000-0000-000000000016', 'f1000000-0000-0000-0000-000000000010', 'Submit Final Changes', 'Send the final Phase 1 package into the standard mentor-gated workflow.', 15, 15, true, false);

insert into public.hackathon_phase_activity_content (
  id, activity_id, content_type, content_title, content_body, content_url, display_order, metadata
)
values
  ('fb100000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-000000000001', 'text', 'Evidence First', 'See how vague signals become a validated pain point, a clear target user, and a guide-backed next step.', null, 0, '{"variant":"evidence_first","panels":[{"id":"noise","order":1,"headline":"Most teams start with a vague idea.","body":"Trends, guesses, and half-formed assumptions all sound important at first.","image_key":"phase1-noise","accent":"amber"},{"id":"evidence","order":2,"headline":"Real interviews reveal repeated pain.","body":"Patterns matter more than opinions. We look for friction people already feel.","image_key":"phase1-evidence","accent":"cyan"},{"id":"validation","order":3,"headline":"A good problem becomes specific.","body":"One clear person. One real pain. One concrete context.","image_key":"phase1-validation","accent":"blue"},{"id":"outcome","order":4,"headline":"By the end of Phase 1, you leave with evidence.","body":"A validated pain point, a clear target user, and a guide for what to do next.","image_key":"phase1-outcome","accent":"cyan"}]}'::jsonb),
  ('fb100000-0000-0000-0000-000000000002', 'fa100000-0000-0000-0000-000000000002', 'ai_chat', 'Empathize + Define Chatbot', 'An engaging chatbot interviews the participant as the interviewee, surfacing real behavior, friction, and motivation without making the setup feel obvious or cliche.', null, 0, '{"chat_mode":"interviewee","reveal_goal_early":false,"tone":"engaging_not_cliche","design_thinking_stage":["empathize","define"]}'::jsonb),
  ('fb100000-0000-0000-0000-000000000003', 'fa100000-0000-0000-0000-000000000003', 'short_video', 'Mascot 5-Whys', 'Watch the mascot break down how to keep digging past the first surface answer.', null, 0, '{"teaches":"five-whys"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000004', 'fa100000-0000-0000-0000-000000000004', 'ai_chat', 'AI interviewer', 'Let the AI ask your team questions and pressure-test the clarity of your answers.', null, 0, '{"chat_mode":"interviewer"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000005', 'fa100000-0000-0000-0000-000000000006', 'pdf', 'Real interview guide', 'Review the checklist before going into the field.', null, 0, '{"resource_kind":"guide"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000006', 'fa100000-0000-0000-0000-000000000008', 'text', 'AI interview feedback', 'This step is reserved for automated AI commentary on the uploaded interview evidence.', null, 0, '{"automation":"interview_feedback"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000007', 'fa100000-0000-0000-0000-000000000009', 'image', 'Problem statement rules', 'Use the infographic to ensure the customer, pain, and context are explicit.', null, 0, '{"resource_kind":"infographic"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000008', 'fa100000-0000-0000-0000-000000000010', 'text', 'Group synthesis prompt', 'Compare evidence across interviews, find repeated pains, then decide what changed your team''s mental model.', null, 0, '{"activity_mode":"team_discussion"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000009', 'fa100000-0000-0000-0000-000000000012', 'text', 'AI final asset feedback', 'This step returns AI commentary on the revised persona and problem statement.', null, 0, '{"automation":"final_asset_feedback"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000010', 'fa100000-0000-0000-0000-000000000013', 'short_video', 'NotebookLM guide', 'Learn how to organize evidence so NotebookLM can synthesize it effectively.', null, 0, '{"resource_kind":"tutorial"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000011', 'fa100000-0000-0000-0000-000000000015', 'text', 'Book mentor', 'Use your mentor scheduling link or internal booking workflow before final submission.', null, 0, '{"external_action":"mentor_booking"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000012', 'fa100000-0000-0000-0000-000000000016', 'text', 'Final handoff', 'Submit the final package once mentor booking and evidence synthesis are complete.', null, 0, '{"workflow_step":"final_submission"}'::jsonb);

insert into public.hackathon_phase_activity_assessments (
  id, activity_id, assessment_type, points_possible, is_graded, metadata
)
values
  ('fc100000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-000000000005', 'text_answer', null, false, '{"submission_label":"Persona draft","fields":["persona_name","persona_context","pain_summary"]}'::jsonb),
  ('fc100000-0000-0000-0000-000000000002', 'fa100000-0000-0000-0000-000000000007', 'file_upload', null, false, '{"submission_label":"Interview evidence","accepted_types":["audio","video"]}'::jsonb),
  ('fc100000-0000-0000-0000-000000000003', 'fa100000-0000-0000-0000-000000000011', 'text_answer', null, false, '{"submission_label":"Updated persona and problem statement","fields":["persona","problem_statement"]}'::jsonb),
  ('fc100000-0000-0000-0000-000000000004', 'fa100000-0000-0000-0000-000000000014', 'text_answer', null, false, '{"submission_label":"Three trustworthy sources","min_items":3}'::jsonb),
  ('fc100000-0000-0000-0000-000000000005', 'fa100000-0000-0000-0000-000000000016', 'text_answer', null, false, '{"submission_label":"Final Phase 1 changes","workflow":"mentor_gated"}'::jsonb);
