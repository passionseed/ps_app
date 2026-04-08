update public.hackathon_program_phases
set
  title = 'Phase 1: Customer Discovery',
  description = 'Systems-thinking customer discovery: understand the system, gather interview evidence, map leverage points, and decide whether to proceed.',
  status = 'released',
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
  id, phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft, status
)
values
  (
    'fa100000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000010',
    'What You''ll Walk Away With',
    'Start with the end in mind. By the end of Phase 1, your team should leave with a Problem Proof Pack and a clear Proceed, Pivot, or Kill decision.',
    0,
    5,
    true,
    false,
    'released'
  ),
  (
    'fa100000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000010',
    'See the System, Not Just the Symptom',
    'Use a systems-thinking lens before you interview anyone. Look for actors, friction, incentives, workarounds, and loops instead of chasing one root cause.',
    1,
    15,
    true,
    false,
    'locked'
  ),
  (
    'fa100000-0000-0000-0000-000000000003',
    'f1000000-0000-0000-0000-000000000010',
    'Interview Real Humans',
    'Talk to real people and trace what actually happened. Focus on behavior, sequence, friction, workarounds, and tradeoffs.',
    2,
    45,
    true,
    false,
    'locked'
  ),
  (
    'fa100000-0000-0000-0000-000000000004',
    'f1000000-0000-0000-0000-000000000010',
    'Upload Evidence',
    'Upload the strongest evidence from your interviews so your claims can be inspected by teammates and mentors.',
    3,
    15,
    true,
    false,
    'locked'
  ),
  (
    'fa100000-0000-0000-0000-000000000005',
    'f1000000-0000-0000-0000-000000000010',
    'Map the System',
    'Turn the raw evidence into structure. Show the actors, recurring pain points, workarounds, incentives, constraints, loops, and leverage points.',
    4,
    25,
    true,
    false,
    'locked'
  ),
  (
    'fa100000-0000-0000-0000-000000000006',
    'f1000000-0000-0000-0000-000000000010',
    'Decision Gate: Proceed / Pivot / Kill',
    'Decide what the evidence means. This is where your team commits to Proceed, Pivot, or Kill and prepares the reasoning mentors should react to.',
    5,
    20,
    true,
    false,
    'locked'
  ),
  (
    'fa100000-0000-0000-0000-000000000007',
    'f1000000-0000-0000-0000-000000000010',
    'Submit Problem Proof Pack',
    'Submit the final Phase 1 artifact: target user, system map, interview evidence, problem statement, and decision. This is the mentor-ready package for review.',
    6,
    30,
    true,
    false,
    'locked'
  );

insert into public.hackathon_phase_activity_content (
  id, activity_id, content_type, content_title, content_body, content_url, display_order, metadata
)
values
  (
    'fb100000-0000-0000-0000-000000000001',
    'fa100000-0000-0000-0000-000000000001',
    'webtoon',
    'Phase 1 Promise Page',
    null,
    null,
    0,
    '{"variant":"webtoon","originalWidth":981,"originalHeight":32768,"panelWidth":981,"panelHeight":1280,"chunks":[{"id":"c1","order":1,"imageKey":"phase1-act1-00","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-00.png"},{"id":"c2","order":2,"imageKey":"phase1-act1-01","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-01.png"},{"id":"c3","order":3,"imageKey":"phase1-act1-02","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-02.png"},{"id":"c4","order":4,"imageKey":"phase1-act1-03","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-03.png"},{"id":"c5","order":5,"imageKey":"phase1-act1-04","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-04.png"},{"id":"c6","order":6,"imageKey":"phase1-act1-05","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-05.png"},{"id":"c7","order":7,"imageKey":"phase1-act1-06","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-06.png"},{"id":"c8","order":8,"imageKey":"phase1-act1-07","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-07.png"},{"id":"c9","order":9,"imageKey":"phase1-act1-08","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-08.png"},{"id":"c10","order":10,"imageKey":"phase1-act1-09","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-09.png"},{"id":"c11","order":11,"imageKey":"phase1-act1-10","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-10.png"},{"id":"c12","order":12,"imageKey":"phase1-act1-11","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-11.png"},{"id":"c13","order":13,"imageKey":"phase1-act1-12","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-12.png"},{"id":"c14","order":14,"imageKey":"phase1-act1-13","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-13.png"},{"id":"c15","order":15,"imageKey":"phase1-act1-14","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-14.png"},{"id":"c16","order":16,"imageKey":"phase1-act1-15","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-15.png"},{"id":"c17","order":17,"imageKey":"phase1-act1-16","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-16.png"},{"id":"c18","order":18,"imageKey":"phase1-act1-17","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-17.png"},{"id":"c19","order":19,"imageKey":"phase1-act1-18","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-18.png"},{"id":"c20","order":20,"imageKey":"phase1-act1-19","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-19.png"},{"id":"c21","order":21,"imageKey":"phase1-act1-20","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-20.png"},{"id":"c22","order":22,"imageKey":"phase1-act1-21","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-21.png"},{"id":"c23","order":23,"imageKey":"phase1-act1-22","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-22.png"},{"id":"c24","order":24,"imageKey":"phase1-act1-23","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-23.png"},{"id":"c25","order":25,"imageKey":"phase1-act1-24","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-24.png"},{"id":"c26","order":26,"imageKey":"phase1-act1-25","imageUrl":"https://iikrvgjfkuijcpvdwzvv.supabase.co/storage/v1/object/public/webtoons/phase1-act1/phase1-act1-25.png"}]}'::jsonb
  ),
  (
    'fb100000-0000-0000-0000-000000000002',
    'fa100000-0000-0000-0000-000000000001',
    'text',
    'What success looks like',
    'By the end of Phase 1, your team should be able to say: We understand the system, we have evidence from real people, and we know whether this problem is worth solving.' || E'\n\n' ||
    'Your Problem Proof Pack should include:' || E'\n' ||
    '- target user' || E'\n' ||
    '- system map' || E'\n' ||
    '- interview evidence' || E'\n' ||
    '- problem statement' || E'\n' ||
    '- Proceed / Pivot / Kill decision' || E'\n\n' ||
    'Mentors are most useful after you have this pack, not before.',
    null,
    1,
    '{"stage":"outcome_first","mentor_role":"review_after_pack"}'::jsonb
  ),
  (
    'fb100000-0000-0000-0000-000000000003',
    'fa100000-0000-0000-0000-000000000002',
    'text',
    'Systems Thinking Primer',
    'Before you interview anyone, train your eye to see the system.' || E'\n\n' ||
    'Look for:' || E'\n' ||
    '- who is involved' || E'\n' ||
    '- what happens first, next, and after that' || E'\n' ||
    '- where the friction appears' || E'\n' ||
    '- what workaround people use' || E'\n' ||
    '- what incentives keep the problem alive' || E'\n' ||
    '- what happens when someone tries to fix it' || E'\n' ||
    '- where loops or repeated patterns exist' || E'\n\n' ||
    'Do not turn this into academic theory. Use practical prompts: What keeps this going? Who is stuck in it? What are they optimizing for? Where could a small intervention change a lot?',
    null,
    0,
    '{"tool":"loopy_or_equivalent","artifact":"system_map_v1"}'::jsonb
  ),
  (
    'fb100000-0000-0000-0000-000000000004',
    'fa100000-0000-0000-0000-000000000003',
    'text',
    'Interview Guide',
    'Do not teach or use 5 Whys here. Teach students to trace the system through real behavior.' || E'\n\n' ||
    'Ask about:' || E'\n' ||
    '- what happened last time' || E'\n' ||
    '- what they did step by step' || E'\n' ||
    '- who else was involved' || E'\n' ||
    '- what made it difficult' || E'\n' ||
    '- what workaround they used' || E'\n' ||
    '- what tradeoff they made' || E'\n' ||
    '- what happened after the workaround' || E'\n' ||
    '- what made the problem continue' || E'\n\n' ||
    'Avoid leading questions, pitching your solution, or collecting abstract opinions with no behavior behind them.',
    null,
    0,
    '{"target_interviews":"5-10","focus":"behavior_not_opinion"}'::jsonb
  ),
  (
    'fb100000-0000-0000-0000-000000000005',
    'fa100000-0000-0000-0000-000000000004',
    'text',
    'Evidence Bundle Guidance',
    'Upload the raw evidence that proves the problem is real. Think like a mentor reviewing your work: can they see what people said, did, and struggled with?' || E'\n\n' ||
    'Good evidence includes interview notes, transcripts, screenshots, observations, and field notes organized into one clean bundle.',
    null,
    0,
    '{"review_audience":"team_and_mentors","artifact":"evidence_bundle"}'::jsonb
  ),
  (
    'fb100000-0000-0000-0000-000000000006',
    'fa100000-0000-0000-0000-000000000005',
    'text',
    'System Synthesis Guide',
    'Turn your evidence into structure.' || E'\n\n' ||
    'Your team should produce:' || E'\n' ||
    '- key actors' || E'\n' ||
    '- recurring pain points' || E'\n' ||
    '- existing workarounds' || E'\n' ||
    '- incentives and constraints' || E'\n' ||
    '- reinforcing or balancing loops' || E'\n' ||
    '- one plausible leverage point' || E'\n\n' ||
    'This is the artifact a mentor should challenge: does the map explain what keeps the problem alive, or is it just a list of complaints?',
    null,
    0,
    '{"artifact":"system_map_v2","mentor_focus":"loops_workarounds_leverage_point"}'::jsonb
  ),
  (
    'fb100000-0000-0000-0000-000000000007',
    'fa100000-0000-0000-0000-000000000006',
    'text',
    'Decision Gate Guidance',
    'Now decide what the evidence means.' || E'\n\n' ||
    'Proceed = strong enough evidence and a clear leverage point.' || E'\n' ||
    'Pivot = the problem is real, but the framing, user, or leverage point is wrong.' || E'\n' ||
    'Kill = the evidence is weak, low-value, or not worth building around.' || E'\n\n' ||
    'Mentors should react to the quality of your reasoning here, not replace it.',
    null,
    0,
    '{"decision_options":["Proceed","Pivot","Kill"],"mentor_role":"react_to_reasoning"}'::jsonb
  ),
  (
    'fb100000-0000-0000-0000-000000000008',
    'fa100000-0000-0000-0000-000000000007',
    'text',
    'Problem Proof Pack Checklist',
    'Your final submission should contain:' || E'\n' ||
    '1. Target user - who specifically, in what context, and why this group matters' || E'\n' ||
    '2. System map - actors, loops, bottlenecks, and leverage point' || E'\n' ||
    '3. Evidence summary - 5 to 10 interviews, strongest patterns, surprising findings, and workarounds' || E'\n' ||
    '4. Problem statement - specific, evidence-backed, and grounded in system behavior' || E'\n' ||
    '5. Decision - Proceed, Pivot, or Kill, and why' || E'\n\n' ||
    'This is the artifact mentors should review before Phase 2.',
    null,
    0,
    '{"artifact":"problem_proof_pack","mentor_role":"phase_gate_review"}'::jsonb
  );

insert into public.hackathon_phase_activity_assessments (
  id, activity_id, assessment_type, display_order, points_possible, is_graded, metadata
)
values
  (
    'fc100000-0000-0000-0000-000000000000',
    'fa100000-0000-0000-0000-000000000001',
    'text_answer',
    0,
    null,
    false,
    '{"submission_label":"มุมมองตั้งต้นของคุณ","prompt":"ตอบสั้นๆ ทั้ง 2 ข้อ\n1. ตอนนี้ทีมของคุณกำลังสนใจจะแก้ปัญหาหรือความท้าทายอะไรใน hackathon นี้? คุณคิดว่านี่เป็น wicked problem ไหม? เพราะอะไร\n2. คุณรู้สึกอย่างไรกับปัญหาที่เลือกตอนนี้: ง่ายไป ยากไป น่ากลัว ท้อ น่าตื่นเต้น หรือยังไม่ชัด? อะไรทำให้คุณรู้สึกแบบนั้น","placeholder":"1. ปัญหาหรือความท้าทายที่ทีมสนใจ:\nฉันคิดว่านี่เป็น / ไม่เป็น wicked problem เพราะ...\n\n2. ตอนนี้ฉันรู้สึกว่า:\nเหตุผลคือ..."}'::jsonb
  ),
  (
    'fc100000-0000-0000-0000-000000000001',
    'fa100000-0000-0000-0000-000000000002',
    'image_upload',
    0,
    null,
    false,
    '{"submission_label":"Rough System Map v1","prompt":"Upload a sketch or screenshot of your first-pass system map. Show actors, sequence, friction, workarounds, and at least one loop or repeated pattern."}'::jsonb
  ),
  (
    'fc100000-0000-0000-0000-000000000007',
    'fa100000-0000-0000-0000-000000000002',
    'text_answer',
    1,
    null,
    false,
    '{"submission_label":"What You Think Is Happening","prompt":"Answer all 3:\\n1. What loop or repeated pattern do you think is happening in this system?\\n2. What workaround did you include in your map?\\n3. What do you want to verify in interviews before you trust this map?","placeholder":"1. The loop or repeated pattern I see is...\\n\\n2. The workaround I included is...\\n\\n3. In interviews, I want to verify whether..."}'::jsonb
  ),
  (
    'fc100000-0000-0000-0000-000000000002',
    'fa100000-0000-0000-0000-000000000004',
    'file_upload',
    0,
    null,
    false,
    '{"submission_label":"Interview evidence bundle","prompt":"Upload one clean bundle of interview notes, transcripts, screenshots, or field notes that proves the problem is real.","accepted_types":["pdf","docx","pptx"]}'::jsonb
  ),
  (
    'fc100000-0000-0000-0000-000000000003',
    'fa100000-0000-0000-0000-000000000005',
    'image_upload',
    0,
    null,
    false,
    '{"submission_label":"System Map v2","prompt":"Upload your synthesized system map showing actors, loops, bottlenecks, and your best current leverage point."}'::jsonb
  ),
  (
    'fc100000-0000-0000-0000-000000000004',
    'fa100000-0000-0000-0000-000000000005',
    'text_answer',
    1,
    null,
    false,
    '{"submission_label":"Leverage point explanation","prompt":"What keeps this problem alive in the system? Where is the leverage point? What changed between System Map v1 and v2?","placeholder":"Name the loop or pattern, explain the leverage point, and describe the strongest insight from your synthesis."}'::jsonb
  ),
  (
    'fc100000-0000-0000-0000-000000000005',
    'fa100000-0000-0000-0000-000000000006',
    'text_answer',
    0,
    null,
    false,
    '{"submission_label":"Proceed / Pivot / Kill decision","prompt":"Start with one word: Proceed, Pivot, or Kill. Then answer: What is the strongest evidence this problem is real? What keeps it alive in the system? Where is the leverage point? Why is this your decision? What evidence would make you change your mind?","placeholder":"Proceed / Pivot / Kill ..."}'::jsonb
  ),
  (
    'fc100000-0000-0000-0000-000000000006',
    'fa100000-0000-0000-0000-000000000007',
    'text_answer',
    0,
    null,
    false,
    '{"submission_label":"Problem Proof Pack","prompt":"Submit your final Phase 1 pack with these sections: Target user, System map, Evidence summary, Problem statement, and Proceed / Pivot / Kill decision. Write it so a mentor can review it without extra explanation.","placeholder":"1. Target user...\n2. System map...\n3. Evidence summary...\n4. Problem statement...\n5. Decision..."}'::jsonb
  );
