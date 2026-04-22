// Rewrites Phase 1 Activity 8 "Problem Pack (สิ่งที่ต้องส่งสุดท้าย)".
// Thai copy, 4 content threads + 1 growth reflection.
// Backward-designed from docs/specs/2026-04-07-phase1-systems-thinking-spec.md
// Idempotent: deletes then reinserts content & assessments.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
// TODO: replace with your Supabase service role key before running
const SB_SVC = process.env.SB_SVC ?? "";

const s = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

const ACTIVITY_ID = '9df72229-3395-4da1-81ce-3aab245806ce';

const NEW_TITLE = 'Problem Pack (สิ่งที่ต้องส่งสุดท้าย)';
const NEW_INSTRUCTIONS =
  'นี่คือสิ่งที่ต้องส่งสุดท้ายของ Phase 1 คุณไม่ได้เริ่มใหม่ — แต่เอาของที่ทีมทำมาแล้ว (System Map, บทสัมภาษณ์, หลักฐาน, การตัดสินใจ Proceed/Pivot/Kill) มาร้อยให้เป็น Problem Pack ที่ mentor จะรีวิวก่อนเข้า Phase 2 ตอบให้เฉพาะเจาะจง อิงจากสิ่งที่ทีมเห็นจริง ไม่ใช่เดา';
const NEW_ESTIMATED_MINUTES = 35;

const contentBlocks = [
  {
    display_order: 0,
    content_type: 'text',
    content_title: 'มองย้อนสิ่งที่ทีมคุณทำมาแล้ว',
    content_body: [
      'ก่อนเริ่มเขียน Problem Pack ลองมองสิ่งที่ทีมเพิ่งผ่านมาใน Phase 1:',
      '',
      '1. System Map v1 — ภาพแรกของระบบที่ทีมวาดก่อนคุยใคร',
      '2. บทสัมภาษณ์ — 5 ถึง 10 คนจริง ๆ พร้อมพฤติกรรม trade-off และ workaround',
      '3. Evidence ที่อัปโหลด — โน้ต คลิป คำพูด รูปที่ใช้ยืนยันได้',
      '4. System Map v2 — actors, loops, bottlenecks, leverage point ที่สรุปจากหลักฐานจริง',
      '5. คำอธิบาย Leverage Point — อะไรที่ทำให้ปัญหาอยู่ต่อ และจุดงัดเล็ก ๆ อยู่ตรงไหน',
      '6. Decision Gate — ตอนที่ทีมตัดสิน Proceed / Pivot / Kill',
      '',
      'นั่นคืองานจริงที่ทีมทำมา กิจกรรมนี้ไม่ใช่งานใหม่ — มันคือเส้นที่จะร้อยทุกอย่างให้ mentor เห็นในหน้าเดียว',
    ].join('\n'),
    metadata: {
      section: 'recap',
      artifacts_to_thread: [
        'system_map_v1',
        'interview_evidence',
        'evidence_bundle',
        'system_map_v2',
        'leverage_point',
        'decision_gate',
      ],
    },
  },
  {
    display_order: 1,
    content_type: 'text',
    content_title: 'วิธีเชื่อมโยงหลักฐาน (อย่าเดา)',
    content_body: [
      'ทุกคำตอบข้างล่างต้องดึงมาจาก artifact จริงของทีม ตอบเฉพาะเจาะจงเสมอ',
      '',
      'ตัวอย่างที่ดี (ใช้ได้): "P3 (ม.3, กทม.) ทำการบ้านไม่เสร็จ 5 วันติด พอถึงเช้าวันส่งก็ก๊อปเพื่อน — ตรงกับ loop \'shortcut economy\' ใน System Map v2 ของทีม"',
      '',
      'ตัวอย่างที่ไม่พอ (อย่าตอบแบบนี้): "นักเรียนเครียดเรื่องการบ้าน"',
      '',
      'กติกาเวลาตอบ:',
      '- อ้างอิงคนจริงในบทสัมภาษณ์ (ใช้อักษรย่อ + อายุ + บริบท ก็พอ)',
      '- ชี้ให้เห็น loop หรือ node ใน System Map v2',
      '- ใช้พฤติกรรมที่ทีมสังเกตเห็น ไม่ใช่ความเห็นของทีมเอง',
      '- ถ้าร้อยหลักฐานไม่ได้ กลับไปคุยเพิ่มอีก 1 คน ห้ามเดา',
    ].join('\n'),
    metadata: {
      section: 'how_to',
      anti_patterns: ['generalization', 'opinion_as_evidence', 'fabrication'],
    },
  },
  {
    display_order: 2,
    content_type: 'text',
    content_title: 'Mentor จะดู 4 เรื่องนี้',
    content_body: [
      'Mentor จะให้ feedback บน 4 มิตินี้ ให้เขียนเพื่อให้ทั้ง 4 ข้อชัด:',
      '',
      '1. Reality — อิงจากพฤติกรรมจริงที่เห็น ไม่ใช่ความรู้สึก',
      '2. Systems understanding — เห็นระบบที่ทำให้ปัญหาอยู่ต่อ ไม่ใช่แค่ symptom',
      '3. Specificity — user / บริบท / Problem Statement คมพอ',
      '4. Decision quality — Impact × Feasibility มีเหตุผลจริง ไม่ใช่ "ชอบ"',
      '',
      'ถ้าข้อไหนยังรู้สึกลอย ๆ ย้อนกลับไปดึง quote หรือ moment ที่แหลมกว่านี้จากบทสัมภาษณ์ก่อนกดส่ง',
    ].join('\n'),
    metadata: {
      section: 'rubric',
      rubric_dimensions: ['reality', 'systems_understanding', 'specificity', 'decision_quality'],
    },
  },
];

const assessments = [
  {
    display_order: 0,
    assessment_type: 'text_answer',
    points_possible: null,
    is_graded: false,
    metadata: {
      thread: 'problem_statement',
      rubric_focus: ['specificity', 'reality'],
      submission_label: '1. Problem Statement (1–2 ประโยค)',
      prompt:
        '1. Problem Statement (1–2 ประโยค)\nปัญหาคืออะไร? เกิดกับใคร + ที่ไหน + เมื่อไหร่\n\nใช้ format นี้:\n"[กลุ่มคน] ใน [สถานที่] กำลังเจอ [ปัญหา] เนื่องจาก [สาเหตุหลัก] ส่งผลให้ [ผลกระทบ]"',
      placeholder:
        'นักเรียน ม.3 ใน กทม. กำลังเจอ การต้องก๊อปการบ้านตอนเช้า เนื่องจาก ระบบให้คะแนนการส่งมากกว่าความเข้าใจ ส่งผลให้ เรียนไปโดยไม่รู้เรื่องจริง',
      is_group_submission: true,
    },
  },
  {
    display_order: 1,
    assessment_type: 'text_answer',
    points_possible: null,
    is_graded: false,
    metadata: {
      thread: 'evidence',
      rubric_focus: ['reality', 'systems_understanding'],
      submission_label: '2. Evidence (หลักฐานว่าปัญหาจริง)',
      prompt:
        '2. Evidence (หลักฐานว่าปัญหาจริง)\nมีอะไรยืนยันว่าปัญหานี้มีอยู่จริง? (data / observation / interview / ข่าว)\n\nอ้างจากบทสัมภาษณ์ หรือข้อมูลที่ทีมเก็บเอง อย่างน้อย 3 ชิ้น ให้ mentor ตามไปดูของจริงได้',
      placeholder:
        '• บทสัมภาษณ์ P1, P3, P5 — เจอพฤติกรรม... ซ้ำ\n• สังเกตที่โรงเรียน — เห็น...\n• ข่าว/สถิติ — ...\n• workaround ที่ผู้ใช้คิดเอง — ...',
      is_group_submission: true,
    },
  },
  {
    display_order: 2,
    assessment_type: 'text_answer',
    points_possible: null,
    is_graded: false,
    metadata: {
      thread: 'current_solutions',
      rubric_focus: ['systems_understanding', 'specificity'],
      submission_label: '3. Current Solutions (ของที่มีอยู่แล้ว)',
      prompt:
        '3. Current Solutions (ของที่มีอยู่แล้ว)\nตอนนี้มีใครแก้ปัญหานี้อยู่ไหม แล้วมัน fail ตรงไหน / ยังไม่พออะไร?\n\nลิสต์อย่างน้อย 2 ทางที่คนใช้อยู่จริง (แอป ครู ผู้ปกครอง workaround) แล้วบอกว่าทำไมยังไม่พอ',
      placeholder:
        '• [วิธีที่ 1] — ยังไม่พอเพราะ...\n• [วิธีที่ 2] — fail ตรง...\n• workaround ที่ผู้ใช้คิดเอง — แก้ได้แค่ชั่วคราวเพราะ...',
      is_group_submission: true,
    },
  },
  {
    display_order: 3,
    assessment_type: 'text_answer',
    points_possible: null,
    is_graded: false,
    metadata: {
      thread: 'why_this_problem',
      rubric_focus: ['decision_quality'],
      submission_label: '4. Why This Problem (เหตุผลที่เลือก)',
      prompt:
        '4. Why This Problem (เหตุผลที่เลือก)\nทำไมทีมคุณเลือกปัญหานี้ (อิงจาก Impact × Feasibility)\n\nImpact — ถ้าแก้ได้ ใครได้ประโยชน์ มากแค่ไหน?\nFeasibility — ทีมเรามีโอกาสแก้ได้จริงใน 2 เดือนที่เหลือไหม ด้วยอะไร?\n\nปิดท้ายด้วย: Proceed / Pivot / Kill — และหลักฐานอะไรจะทำให้ทีมเปลี่ยนใจ?',
      placeholder:
        'Impact: ถ้าแก้ได้ [ใคร] จะได้ [อะไร] ขนาด [เท่าไร]\nFeasibility: ทีมเราทำได้เพราะมี [resource/skill/access]\nProceed/Pivot/Kill: [เลือก 1 คำ] — เพราะ...\nสิ่งที่จะทำให้เปลี่ยนใจ: ถ้าเจอ...',
      is_group_submission: true,
      decision_options: ['Proceed', 'Pivot', 'Kill'],
    },
  },
  {
    display_order: 4,
    assessment_type: 'text_answer',
    points_possible: null,
    is_graded: false,
    metadata: {
      thread: 'growth_and_phase2_readiness',
      rubric_focus: ['reality', 'decision_quality'],
      submission_label: '5. ทีมเราโตขึ้นยังไง + พร้อมไป Phase 2 แค่ไหน',
      prompt:
        '5. ทีมเราโตขึ้นยังไง และพร้อมไป Phase 2 แค่ไหน\n\nตอบ 3 ข้อสั้น ๆ:\n(1) ตอนเริ่ม Phase 1 ทีมเคยเชื่ออะไรที่ตอนนี้ไม่เชื่อแล้ว?\n(2) ทักษะที่ทีมสร้างได้จริงใน Phase 1 คืออะไร (ทักษะที่ใช้ได้ ไม่ใช่ทักษะที่แค่อ่านเจอ)?\n(3) เอาอะไรเข้าไป Phase 2 — เชื่ออะไร ทำอะไรเป็นนิสัย หรือยังสงสัยอะไรอยู่?',
      placeholder:
        '(1) ตอนแรกทีมเชื่อว่า... ตอนนี้ไม่เชื่อแล้วเพราะ...\n(2) ทักษะที่ทีมได้คือ... เห็นชัดตอน...\n(3) เข้า Phase 2 ด้วย...',
      is_group_submission: true,
      section: 'growth_reflection',
    },
  },
];

async function main() {
  console.log('\n== Updating activity metadata ==');
  const { error: upErr } = await s
    .from('hackathon_phase_activities')
    .update({
      title: NEW_TITLE,
      instructions: NEW_INSTRUCTIONS,
      estimated_minutes: NEW_ESTIMATED_MINUTES,
    })
    .eq('id', ACTIVITY_ID);
  if (upErr) throw upErr;
  console.log('Activity row updated.');

  console.log('\n== Deleting existing content blocks ==');
  const { error: dcErr, count: dcCount } = await s
    .from('hackathon_phase_activity_content')
    .delete({ count: 'exact' })
    .eq('activity_id', ACTIVITY_ID);
  if (dcErr) throw dcErr;
  console.log('Deleted content blocks:', dcCount);

  console.log('\n== Deleting existing assessments ==');
  const { error: daErr, count: daCount } = await s
    .from('hackathon_phase_activity_assessments')
    .delete({ count: 'exact' })
    .eq('activity_id', ACTIVITY_ID);
  if (daErr) throw daErr;
  console.log('Deleted assessments:', daCount);

  console.log('\n== Inserting new content blocks ==');
  const contentRows = contentBlocks.map((b) => ({ ...b, activity_id: ACTIVITY_ID }));
  const { data: cIns, error: cInsErr } = await s
    .from('hackathon_phase_activity_content')
    .insert(contentRows)
    .select('id, display_order, content_title');
  if (cInsErr) throw cInsErr;
  cIns
    .sort((a, b) => a.display_order - b.display_order)
    .forEach((c) => console.log(`  [${c.display_order}] ${c.content_title}`));

  console.log('\n== Inserting new assessments ==');
  const assRows = assessments.map((a) => ({ ...a, activity_id: ACTIVITY_ID }));
  const { data: aIns, error: aInsErr } = await s
    .from('hackathon_phase_activity_assessments')
    .insert(assRows)
    .select('id, display_order, assessment_type, metadata');
  if (aInsErr) throw aInsErr;
  aIns
    .sort((a, b) => a.display_order - b.display_order)
    .forEach((a) =>
      console.log(
        `  [${a.display_order}] ${a.assessment_type} :: ${a.metadata?.submission_label ?? '(no label)'}`
      )
    );

  console.log('\n== Verifying final state ==');
  const { data: verify, error: vErr } = await s
    .from('hackathon_phase_activities')
    .select(
      'id, title, instructions, estimated_minutes, submission_scope, hackathon_phase_activity_content(content_title, display_order), hackathon_phase_activity_assessments(assessment_type, display_order, metadata)'
    )
    .eq('id', ACTIVITY_ID)
    .single();
  if (vErr) throw vErr;
  console.log('Title:', verify.title);
  console.log('Minutes:', verify.estimated_minutes, '| Scope:', verify.submission_scope);
  console.log(
    'Content blocks:',
    verify.hackathon_phase_activity_content
      .sort((x, y) => x.display_order - y.display_order)
      .map((c) => `${c.display_order}:${c.content_title}`)
  );
  console.log(
    'Assessments:',
    verify.hackathon_phase_activity_assessments
      .sort((x, y) => x.display_order - y.display_order)
      .map((a) => `${a.display_order}:${a.metadata?.submission_label}`)
  );
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
