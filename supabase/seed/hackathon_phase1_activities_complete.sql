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
  -- Original activities 1-5 (display_order 0-4)
  ('fa100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000010', 'What You''ll Walk Away With', 'By the end of Phase 1, you''ll know how to find a good problem, validate a real pain point, and define the right target user with our guide.', 0, 1, true, false),
  ('fa100000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000010', 'Customer Discovery Interview', 'Run an engaging Empathize + Define interview where the participant is the interviewee. The chatbot should uncover behaviors, pain, and motivation without revealing too early what they are being interviewed for.', 1, 5, true, false),
  ('fa100000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000010', '5min Mascot 5-Whys', 'Learn the 5-Whys technique before interviewing real users.', 2, 5, true, false),
  ('fa100000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000010', '10min สัมภาษณ์ AI', 'Let the AI act as the interviewer and test how your team answers.', 3, 10, true, false),
  ('fa100000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000010', '20min Create Persona', 'Draft the first persona based on the strongest patterns you see so far.', 4, 20, true, false),
  -- Checkpoint 1 (display_order 5)
  ('fa100000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000010', '🚦 Checkpoint 1: Real User or Just a Guess?', 'Stop. Look at your persona. Can you name an actual human who matches this? If not, pivot back to activities 2-4. If yes, proceed.', 5, 10, true, false),
  -- Original activities 6-10 (shifted to display_order 6-10)
  ('fa100000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000010', '30min Real Interview Guidelines', 'Review the field guide before talking to real people.', 6, 30, true, false),
  ('fa100000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000010', '10min Upload Interview Evidence', 'Upload the strongest evidence gathered from your real interviews.', 7, 10, true, false),
  ('fa100000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000010', '10min AI Comment on Interview', 'Review AI feedback on the uploaded interview evidence.', 8, 10, true, false),
  ('fa100000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000010', '5min Problem Statement Guidelines', 'Use the infographic to tighten the problem statement.', 9, 5, true, false),
  ('fa100000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000010', '30min Discuss in Group', 'Synthesize your findings as a team before rewriting the persona and problem.', 10, 30, true, false),
  -- Checkpoint 2 (display_order 11)
  ('fa100000-0000-0000-0000-000000000012', 'f1000000-0000-0000-0000-000000000010', '🚦 Checkpoint 2: Validated or Assumed?', 'You''ve interviewed and synthesized. Is this problem based on real evidence or assumptions? Be honest.', 11, 10, true, false),
  -- Original activities 11-14 (shifted to display_order 12-15)
  ('fa100000-0000-0000-0000-000000000013', 'f1000000-0000-0000-0000-000000000010', 'Updated Persona & Statement', 'Submit the revised persona and problem statement together.', 12, 20, true, false),
  ('fa100000-0000-0000-0000-000000000014', 'f1000000-0000-0000-0000-000000000010', 'AI Comment on Final Assets', 'Read the AI critique on your updated persona and problem statement.', 13, 10, true, false),
  ('fa100000-0000-0000-0000-000000000015', 'f1000000-0000-0000-0000-000000000010', '5min NotebookLM Guidelines', 'Prepare your evidence so it is ready for NotebookLM synthesis.', 14, 5, true, false),
  ('fa100000-0000-0000-0000-000000000016', 'f1000000-0000-0000-0000-000000000010', '30min Submit 3 Trustful Sources', 'Add the most credible sources backing your customer problem.', 15, 30, true, false),
  -- Checkpoint 3 (display_order 16)
  ('fa100000-0000-0000-0000-000000000017', 'f1000000-0000-0000-0000-000000000010', '🚦 Checkpoint 3: Ready for Mentor Review?', 'Final check before submission. Do you have enough evidence to defend this problem to a mentor?', 16, 10, true, false),
  -- Original activities 15-16 (shifted to display_order 17-18)
  ('fa100000-0000-0000-0000-000000000018', 'f1000000-0000-0000-0000-000000000010', '30min Book Mentor', 'Book a mentor slot before moving to the final handoff.', 17, 30, true, false),
  ('fa100000-0000-0000-0000-000000000019', 'f1000000-0000-0000-0000-000000000010', 'Submit Final Changes', 'Send the final Phase 1 package into the standard mentor-gated workflow.', 18, 15, true, false);

insert into public.hackathon_phase_activity_content (
  id, activity_id, content_type, content_title, content_body, content_url, display_order, metadata
)
values
  ('fb100000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-000000000001', 'webtoon', 'What You''ll Walk Away With', null, null, 0, '{"variant":"webtoon","chunks":[{"id":"c1","order":1,"image_key":"webtoon1-1"},{"id":"c2","order":2,"image_key":"webtoon1-2"},{"id":"c3","order":3,"image_key":"webtoon1-3"},{"id":"c4","order":4,"image_key":"webtoon1-4"}]}'::jsonb),
  ('fb100000-0000-0000-0000-000000000002', 'fa100000-0000-0000-0000-000000000002', 'ai_chat', 'Empathize + Define Chatbot', 'An engaging chatbot interviews the participant as the interviewee, surfacing real behavior, friction, and motivation without making the setup feel obvious or cliche.', null, 0, '{"chat_mode":"interviewee","reveal_goal_early":false,"tone":"engaging_not_cliche","design_thinking_stage":["empathize","define"]}'::jsonb),
  ('fb100000-0000-0000-0000-000000000003', 'fa100000-0000-0000-0000-000000000003', 'short_video', 'Mascot 5-Whys', 'Watch the mascot break down how to keep digging past the first surface answer.', null, 0, '{"teaches":"five-whys"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000004', 'fa100000-0000-0000-0000-000000000004', 'ai_chat', 'AI interviewer', 'Let the AI ask your team questions and pressure-test the clarity of your answers.', null, 0, '{"chat_mode":"interviewer"}'::jsonb),
  -- Checkpoint 1 content
  ('fb100000-0000-0000-0000-000000000013', 'fa100000-0000-0000-0000-000000000006', 'text', 'Checkpoint 1 Guidance', 'This is a decision point, not a task. Your goal is to decide whether to proceed, pivot, or kill this direction.', null, 0, '{"checkpoint_type":"user_validation","gate_rule":"mentor_flag_if_vague"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000005', 'fa100000-0000-0000-0000-000000000007', 'pdf', 'Real interview guide', 'Review the checklist before going into the field.', null, 0, '{"resource_kind":"guide"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000006', 'fa100000-0000-0000-0000-000000000009', 'text', 'AI interview feedback', 'This step is reserved for automated AI commentary on the uploaded interview evidence.', null, 0, '{"automation":"interview_feedback"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000007', 'fa100000-0000-0000-0000-000000000010', 'image', 'Problem statement rules', 'Use the infographic to ensure the customer, pain, and context are explicit.', null, 0, '{"resource_kind":"infographic"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000008', 'fa100000-0000-0000-0000-000000000011', 'text', 'Group synthesis prompt', 'Compare evidence across interviews, find repeated pains, then decide what changed your team''s mental model.', null, 0, '{"activity_mode":"team_discussion"}'::jsonb),
  -- Checkpoint 2 content
  ('fb100000-0000-0000-0000-000000000014', 'fa100000-0000-0000-0000-000000000012', 'text', 'Checkpoint 2 Guidance', 'Reflect on your evidence. Are you proceeding because you have real validation, or because you''re attached to the idea?', null, 0, '{"checkpoint_type":"evidence_quality","gate_rule":"auto_pass_with_reflection"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000009', 'fa100000-0000-0000-0000-000000000014', 'text', 'AI final asset feedback', 'This step returns AI commentary on the revised persona and problem statement.', null, 0, '{"automation":"final_asset_feedback"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000010', 'fa100000-0000-0000-0000-000000000015', 'short_video', 'NotebookLM guide', 'Learn how to organize evidence so NotebookLM can synthesize it effectively.', null, 0, '{"resource_kind":"tutorial"}'::jsonb),
  -- Checkpoint 3 content
  ('fb100000-0000-0000-0000-000000000015', 'fa100000-0000-0000-0000-000000000017', 'text', 'Checkpoint 3 Guidance', 'You''re about to book a mentor. Do you have enough evidence to have a productive conversation?', null, 0, '{"checkpoint_type":"mentor_readiness","gate_rule":"trigger_mentor_booking"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000011', 'fa100000-0000-0000-0000-000000000018', 'text', 'Book mentor', 'Use your mentor scheduling link or internal booking workflow before final submission.', null, 0, '{"external_action":"mentor_booking"}'::jsonb),
  ('fb100000-0000-0000-0000-000000000012', 'fa100000-0000-0000-0000-000000000019', 'text', 'Final handoff', 'Submit the final package once mentor booking and evidence synthesis are complete.', null, 0, '{"workflow_step":"final_submission"}'::jsonb);

insert into public.hackathon_phase_activity_assessments (
  id, activity_id, assessment_type, points_possible, is_graded, metadata
)
values
  ('fc100000-0000-0000-0000-000000000000', 'fa100000-0000-0000-0000-000000000001', 'text_answer', null, false, '{"submission_label":"Your commitment","prompt":"ทำไมคุณถึงเลือกเข้าร่วมงานนี้ และ อยากได้อะไรกลับไป","placeholder":"พิมพ์คำตอบของคุณที่นี่..."}'::jsonb),
  ('fc100000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-000000000005', 'text_answer', null, false, '{"submission_label":"Persona draft","fields":["persona_name","persona_context","pain_summary"]}'::jsonb),
  -- Checkpoint 1 assessment
  ('fc100000-0000-0000-0000-000000000006', 'fa100000-0000-0000-0000-000000000006', 'text_answer', null, false, '{"submission_label":"Checkpoint 1: User Evidence","prompt":"Who is your real user? Name them. What specific evidence do you have that they exist?","placeholder":"Be specific — name, role, context, evidence..."}'::jsonb),
  ('fc100000-0000-0000-0000-000000000002', 'fa100000-0000-0000-0000-000000000008', 'file_upload', null, false, '{"submission_label":"Interview evidence","accepted_types":["audio","video"]}'::jsonb),
  ('fc100000-0000-0000-0000-000000000003', 'fa100000-0000-0000-0000-000000000013', 'text_answer', null, false, '{"submission_label":"Updated persona and problem statement","fields":["persona","problem_statement"]}'::jsonb),
  -- Checkpoint 2 assessment
  ('fc100000-0000-0000-0000-000000000012', 'fa100000-0000-0000-0000-000000000012', 'text_answer', null, false, '{"submission_label":"Checkpoint 2: Decision","prompt":"Kill / Pivot / Proceed — which decision and why?","placeholder":"What evidence supports this decision? What would make you change your mind?"}'::jsonb),
  ('fc100000-0000-0000-0000-000000000004', 'fa100000-0000-0000-0000-000000000016', 'text_answer', null, false, '{"submission_label":"Three trustworthy sources","min_items":3}'::jsonb),
  -- Checkpoint 3 assessment
  ('fc100000-0000-0000-0000-000000000017', 'fa100000-0000-0000-0000-000000000017', 'text_answer', null, false, '{"submission_label":"Checkpoint 3: Confidence Check","prompt":"On a scale of 0-100, how confident are you that this is a real problem? What''s your weakest piece of evidence?","placeholder":"Confidence % + weakest evidence..."}'::jsonb),
  ('fc100000-0000-0000-0000-000000000005', 'fa100000-0000-0000-0000-000000000019', 'text_answer', null, false, '{"submission_label":"Final Phase 1 changes","workflow":"mentor_gated"}'::jsonb);
