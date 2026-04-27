// Rewrites Phase 2 Activity 4 "ทดสอบกับคนจริง + ตัดสินใจ".
// Thai copy, chat comic (น้ำอ้อย + นัท + P'Seed) + 2 assessment prompts.
// Backward-designed from docs/specs/phase2/sprint-step-c-test-users.md
//                        + docs/specs/phase2/sprint-step-d-synthesize-gate.md
// Idempotent: deletes then reinserts content & assessments.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
const SB_SVC = process.env.SB_SVC ?? '';

const s = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

const ACTIVITY_ID = '91b30821-5b6b-4945-a543-99c1404e98df';

const NEW_TITLE = 'ทดสอบกับคนจริง + ตัดสินใจ';
const NEW_INSTRUCTIONS =
  'ทดสอบ pretotype กับคนจริงอย่างน้อย 5 คน — ไม่ใช่คนในทีม จับพฤติกรรมที่เห็น ไม่ใช่แค่ความเห็น แล้วตัดสินใจ Persevere / Pivot / Kill บนหลักฐานที่มี';
const NEW_ESTIMATED_MINUTES = 45;
const NEW_SUBMISSION_SCOPE = 'team';

const chatComicMessages = [
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'พวกคุณทดสอบ pretotype กับใครบ้าง?',
  },
  {
    sender: 'น้ำอ้อย',
    avatar: '🙋‍♀️',
    type: 'text',
    content: 'ทดสอบกับเพื่อนในทีม 4 คน เขาชอบมากเลยพี่!',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'นั่นคือทีม ไม่ใช่ผู้ใช้ เพื่อนรู้ว่าคุณทำอะไรอยู่ เขาจะไม่บอกว่ามันพัง',
  },
  {
    sender: 'นัท',
    avatar: '🙋‍♂️',
    type: 'text',
    content: 'แล้วจะหาคนทดสอบจากไหนได้บ้างพี่?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'เดินออกจากห้องนี้เลย หา 5 คนที่ตรงกับ user ของคุณ ผู้ใช้จริงอยู่ข้างนอก ไม่ใช่ในทีม',
  },
  {
    sender: 'น้ำอ้อย',
    avatar: '🙋‍♀️',
    type: 'text',
    content:
      'กลับมาแล้วพี่ ได้ 6 คน — 4 คนกด button แรก แต่ 2 คนหยุดอยู่ที่หน้า 2 ไม่รู้จะทำอะไรต่อ',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ดี — นั่นคือข้อมูลพฤติกรรม ไม่ใช่แค่ความเห็น',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'คนที่หยุดที่หน้า 2 — นั่นคือปัญหา ไม่ใช่ idea ปัญหาอยู่ที่ UX ของหน้านั้น ไม่ใช่ที่ solution',
  },
  {
    sender: 'นัท',
    avatar: '🙋‍♂️',
    type: 'text',
    content: 'แต่ข้อมูลมันก้ำกึ่งพี่ 4 ผ่าน 2 ไม่ผ่าน จะตัดสินใจยังไงดี?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'ถามตัวเองว่า: ถ้า mentor ถามว่า "ทำไมถึงตัดสินแบบนี้" — คุณมี data point ที่ชัดพอจะตอบได้ไหม?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'PERSEVERE = สัญญาณชัด demand มีอยู่จริง ไปต่อ\nPIVOT = ปัญหายังจริง แต่วิธีแก้ต้องเปลี่ยน\nKILL = สัญญาณอ่อนเกินไป หยุดแล้วเริ่มปัญหาใหม่',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'Data ไม่ตัดสินใจแทนคุณ — แต่ reasoning ที่ดีต้องอ้าง data ได้ ไม่ใช่แค่ความรู้สึก',
  },
];

const contentBlocks = [
  {
    display_order: 1,
    content_type: 'chat_comic',
    content_title: 'ทดสอบยังไง ตัดสินใจยังไง',
    content_url: null,
    content_body: JSON.stringify({ messages: chatComicMessages }),
    metadata: {
      chat_style: 'whatsapp',
      click_to_reveal: true,
      show_typing_indicator: true,
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
      thread: 'test_results',
      rubric_focus: ['evidence_quality', 'behavioral_observation'],
      submission_label: 'ผลการทดสอบ',
      prompt:
        'เล่าผลการทดสอบ:\n\n• ทดสอบกับใคร กี่คน (ต้องไม่ใช่คนในทีม)\n• เห็นพฤติกรรมอะไร — สิ่งที่เขาทำ ไม่ใช่แค่สิ่งที่เขาพูด\n• อะไรที่เซอร์ไพรส์ทีมมากที่สุด',
      placeholder:
        'ทดสอบกับ 6 คน (นักศึกษาปี 1 ที่ไม่รู้จักทีมเรามาก่อน)\nพฤติกรรม: 4 คนกด button แรก แต่ 2 คนหยุดที่หน้า 2 ไม่กดต่อ\nที่เซอร์ไพรส์: คนที่หยุดไม่ได้บอกว่าไม่ชอบ idea — เขาไม่รู้ว่าต้องทำอะไรถัดไป',
      is_group_submission: true,
    },
  },
  {
    display_order: 1,
    assessment_type: 'text_answer',
    points_possible: null,
    is_graded: false,
    metadata: {
      thread: 'decision',
      rubric_focus: ['decision_quality', 'evidence_grounding'],
      submission_label: 'การตัดสินใจ',
      prompt:
        'PERSEVERE / PIVOT / KILL\n\nเลือก 1 แล้วอธิบาย:\n• data point ที่ชัดเจนที่สุดที่ทำให้ตัดสินใจแบบนี้\n• อะไรจะทำให้ทีมเปลี่ยนใจ',
      placeholder:
        'PERSEVERE\nเพราะ: 4 ใน 6 คนกด button แรกได้โดยไม่ต้องอธิบาย — นั่นคือสัญญาณว่า idea เข้าใจง่าย ปัญหาอยู่ที่ flow ของหน้า 2 ไม่ใช่ที่ตัว concept\nอะไรจะเปลี่ยนใจ: ถ้าในรอบถัดไปยังมีคนหยุดที่หน้า 2 อีก และไม่มีใครเลยที่ complete ทั้ง flow',
      is_group_submission: true,
      decision_options: ['Persevere', 'Pivot', 'Kill'],
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
      submission_scope: NEW_SUBMISSION_SCOPE,
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
    .select('id, display_order, metadata');
  if (aInsErr) throw aInsErr;
  aIns
    .sort((a, b) => a.display_order - b.display_order)
    .forEach((a) =>
      console.log(`  [${a.display_order}] ${a.metadata?.submission_label ?? '(no label)'}`)
    );

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
