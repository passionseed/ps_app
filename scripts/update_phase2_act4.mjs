// Full rewrite of Phase 2 Activity 4 "ทดสอบกับคนจริง + ตัดสินใจ".
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SB_SVC) { console.error('Missing service role key'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

const ACTIVITY_ID = '91b30821-5b6b-4945-a543-99c1404e98df';

const messages = [
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'พวกเรามี pretotype แล้ว\nขั้นต่อไปคือ "เอาไปให้เป้าหมายใช้"\n\nไม่ใช่เพื่อน\nไม่ใช่คนในทีม\nไม่ใช่ครอบครัว\n\nถ้าเลือกคนง่ายๆ → data จะหลอกคุณ',
  },
  {
    sender: 'น้ำอ้อย',
    avatar: '🙋‍♀️',
    type: 'text',
    content: 'ต้องทดสอบกี่คนคะ?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ขั้นต่ำ 5 คน\n\nน้อยกว่านี้ → มองไม่เห็น pattern\nมากกว่านี้ → ดี แต่ไม่จำเป็นตอนนี้',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'สิ่งที่ต้องทำระหว่าง test:\n\n* เงียบ แล้วดู\n* ไม่อธิบาย\n* ไม่ช่วย\n* ไม่ขาย\n\nคุณกำลัง test pretotype\nไม่ใช่ test skill การ present',
  },
  {
    sender: 'นัท',
    avatar: '🙋‍♂️',
    type: 'text',
    content: 'แล้วเราควรจดอะไร?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'จด "พฤติกรรม" เท่านั้น\n\nไม่ใช่:\n\n* "เขาบอกว่าชอบ"\n* "เขาคิดว่าน่าสนใจ"\n\nแต่เป็น:\n\n* เขากดไหม\n* เขาใช้จนจบไหม\n* เขากลับมาไหม',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ผูก metric กับวิธีที่เลือก:\n\n* Fake Door → กด / ลงทะเบียน\n* Wizard of Oz → ใช้สำเร็จไหม / ใช้ต่อไหม\n* Concierge → กลับมาใช้ / ขอเพิ่มไหม\n* Pinocchio → ใช้ flow จบเองไหม / งงตรงไหน',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ตอนนี้ส่วนที่สำคัญสุด: "ตัดสินใจ"',
  },
  {
    sender: 'น้ำอ้อย',
    avatar: '🙋‍♀️',
    type: 'text',
    content: 'มีทางเลือกอะไรบ้าง?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '**PERSEVERE** (ทำต่อ)\n→ คนทำพฤติกรรมจริงตามสมมติฐาน\n→ ไปต่อ สร้าง high-fi\n\n**PIVOT** (เปลี่ยนไอเดีย)\n→ ปัญหาจริง แต่สิ่งที่คุณทำ "ไม่เวิร์ค"\n→ เปลี่ยนวิธี ไม่เปลี่ยนปัญหา\n\n**KILL** (พอ — จบ หาปัญหาใหม่)\n→ คนไม่ทำพฤติกรรมนั้น\n→ หยุด เสียเวลาต่อไม่มีค่า',
  },
  {
    sender: 'นัท',
    avatar: '🙋‍♂️',
    type: 'text',
    content: 'ถ้าเทสแล้วเฟล แต่ยังอยากไปต่ออยู่ล่ะ?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ความรู้สึกไม่ใช่หลักฐาน\n\nถ้า data ไม่สนับสนุน → ต้องกล้าหยุด\nแต่ถ้าเราคิดว่าเทสผิดกลุ่มเป้าหมาย ก็อาจจะลองกลุ่มอื่นดูก่อนได้',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ตอบ 4 คำถามนี้ให้ได้:\n\n1. หลักฐานที่แข็งที่สุดคืออะไร\n2. อะไรที่ขัดกับที่คิดไว้\n3. ถ้าอะไรเกิดขึ้น จะทำให้เปลี่ยนใจ\n4. ทำไมถึงเลือก Persevere / Pivot / Kill',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'สุดท้าย:\n\nถ้า report นี้\nยังไม่มี "พฤติกรรมจริงของ user"\n\nแปลว่า\nคุณยังไม่ได้ test',
  },
];

const assessmentPrompt = `📝 Assessment: Pretotype Test Report

**1. สมมติฐานที่ทดสอบ**
[เขียนสมมติฐานเดิมจาก Activity 1]

**2. วิธี Pretotype ที่ใช้**
[Wizard of Oz / Fake Door / Concierge / Pinocchio]

**3. กลุ่มเป้าหมายที่ทดสอบ**
* จำนวน: … คน (≥5)
* ลักษณะ: …

**4. สิ่งที่ user "ทำจริง" (Raw Behavior Data)**

| User | สิ่งที่เกิดขึ้น | สำเร็จ/ไม่สำเร็จ | ใช้ซ้ำ/ไม่ |
| ---- | --------------- | ---------------- | ---------- |
| 1    | …               | …                | …          |
| 2    | …               | …                | …          |
| 3    | …               | …                | …          |
| 4    | …               | …                | …          |
| 5    | …               | …                | …          |

**5. Pattern ที่เห็น (ห้ามใส่ opinion)**
* … / 5 คน ทำพฤติกรรม X
* … / 5 คน หยุดที่ step …
* … / 5 คน กลับมาใช้ซ้ำ

**6. Insight (สั้น, อิง data เท่านั้น)**
* สิ่งที่เวิร์ค: …
* สิ่งที่ไม่เวิร์ค: …

**7. Decision**
เลือก: **PERSEVERE / PIVOT / KILL**

**8. เหตุผล (อิง evidence เท่านั้น)**
* …

**9. Next Step (ขึ้นกับ decision)**
ถ้า PERSEVERE → จะ build อะไรต่อ
ถ้า PIVOT → จะเปลี่ยนอะไร (1 อย่าง)
ถ้า KILL → จะไป problem ไหนต่อ

⚠️ ถ้า report นี้ยังไม่มี "พฤติกรรมจริงของ user" → คุณยังไม่ได้ test`;

async function run() {
  // 1. Get current content/assessment IDs for this activity
  let existingContentId = null;
  try {
    const { data } = await sb
      .from('hackathon_phase_activity_content')
      .select('id')
      .eq('activity_id', ACTIVITY_ID)
      .single();
    existingContentId = data?.id ?? null;
  } catch (_) { /* no content */ }

  const { data: existingAssessList } = await sb
    .from('hackathon_phase_activity_assessments')
    .select('id')
    .eq('activity_id', ACTIVITY_ID);

  // 2. Update activity title + instructions
  const { error: actErr } = await sb
    .from('hackathon_phase_activities')
    .update({
      title: 'ทดสอบกับคนจริง + ตัดสินใจ',
      instructions:
        'เอา pretotype ไปทดสอบกับคนจริง ≥5 คน — เก็บพฤติกรรม ไม่ใช่ความเห็น แล้วตัดสินใจ Persevere / Pivot / Kill บนหลักฐานที่มี',
    })
    .eq('id', ACTIVITY_ID);
  console.log('Activity update:', actErr ? actErr.message : 'OK');

  // 3. Delete old content
  if (existingContentId) {
    const { error: delC } = await sb
      .from('hackathon_phase_activity_content')
      .delete()
      .eq('id', existingContentId);
    console.log('Delete content:', delC ? delC.message : 'OK');
  }

  // 3b. Delete all old assessments
  if (existingAssessList?.length) {
    for (const a of existingAssessList) {
      const { error: delA } = await sb
        .from('hackathon_phase_activity_assessments')
        .delete()
        .eq('id', a.id);
      console.log('Delete assessment', a.id.slice(0,8), ':', delA ? delA.message : 'OK');
    }
  }

  // 4. Insert new content
  const newContentId = '831b0b52-c520-48fc-b12f-92d4efb12e5f';
  const { error: insC } = await sb
    .from('hackathon_phase_activity_content')
    .insert({
      id: newContentId,
      activity_id: ACTIVITY_ID,
      content_type: 'chat_comic',
      content_title: 'เคส Aurora: ทดสอบกับคนจริง และ decision framework',
      content_url: null,
      content_body: JSON.stringify({ messages }),
      display_order: 1,
      metadata: {
        chat_style: 'whatsapp',
        click_to_reveal: true,
        show_typing_indicator: true,
      },
    });
  console.log('Insert content:', insC ? insC.message : 'OK');

  // 6. Insert new assessment
  const newAssessId = 'cc89ad56-1c04-4137-8cc8-014fdec032d2';
  const { error: insA } = await sb
    .from('hackathon_phase_activity_assessments')
    .insert({
      id: newAssessId,
      activity_id: ACTIVITY_ID,
      assessment_type: 'text_answer',
      display_order: 0,
      points_possible: 10,
      is_graded: true,
      metadata: {
        prompt: assessmentPrompt,
        min_words: 100,
        placeholder:
          '1. สมมติฐาน: ถ้า... → จะทำให้...\n2. วิธี: Wizard of Oz\n3. กลุ่มเป้าหมาย: นักเรียน ม.6 5 คน\n4. Behavior table...\n5. Pattern: 4/5 คนกด แต่ 2/5 คนหยุดที่ step 2...\n6. Insight: เวิร์คคือ... ไม่เวิร์คคือ...\n7. Decision: PIVOT\n8. เหตุผล: 4/5 คนกด แต่ไม่มีใครกลับมา...\n9. Next Step: เปลี่ยนวิธี เป็น Concierge...',
        show_example: false,
        submission_label: 'Pretotype Test Report',
      },
    });
  console.log('Insert assessment:', insA ? insA.message : 'OK');

  // 7. Verify
  const { data: verify } = await sb
    .from('hackathon_phase_activity_content')
    .select('id, content_title, content_body')
    .eq('id', newContentId)
    .single();
  const parsed = JSON.parse(verify?.content_body ?? '{}');
  console.log(`\nVerification — content_title: "${verify?.content_title}"`);
  console.log(`Messages count: ${parsed.messages?.length}`);

  const { data: act } = await sb
    .from('hackathon_phase_activities')
    .select('title, instructions')
    .eq('id', ACTIVITY_ID)
    .single();
  console.log(`Activity title: "${act?.title}"`);
}

run().catch(console.error);
