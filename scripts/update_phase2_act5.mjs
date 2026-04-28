// Full rewrite of Phase 2 Activity 5 "Build High-Fidelity Prototype" (or Build Prototype + Test).
// Replaces chat_comic content with Aurora team / P'Seed teaching how to build with Google AI Studio and re-test.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SB_SVC) { console.error('Missing service role key'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

// ID for Activity 5
const ACTIVITY_ID = '738dcd9e-b4b9-4d1f-9275-34c551b492c3';

const messages = [
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ถ้าผลการเทสรอบที่แล้วบอกให้ PERSEVERE...\nยินดีด้วย! 🎉 แปลว่าปัญหาของเรามีอยู่จริงและมีคนพร้อมใช้',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ขั้นตอนต่อไปคือการสร้าง "ของจริง" หรือ Functional Prototype ที่มันทำงานได้ด้วยตัวเอง',
  },
  {
    sender: 'นัท',
    avatar: '🙋‍♂️',
    type: 'text',
    content: 'ต้องเริ่มเขียนโค้ดเองทั้งหมดเลยใช่ไหมครับ? 😅 กลัวทำไม่ทันจัง',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ไม่ต้องห่วง! เดี๋ยวนี้เรามี AI เป็นผู้ช่วย 🚀\nเราจะให้ Google AI Studio (Gemini) ช่วยสร้างกัน',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'Google AI Studio เก่งมาก\nสามารถช่วยคิด Logic หลังบ้าน และเขียน UI หน้าตาแอปให้เราลองเล่นได้เลย เพียงแค่ออกแบบ Prompt ให้ชัดเจน',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ลองดูวิดีโอตัวอย่างด้านล่างนี้ เป็นวิธีการให้ AI Studio ช่วยสร้าง Web App ให้ทำงานได้ทั้ง Frontend/Backend ในเวลาสั้นๆ',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'video',
    content: 'https://www.youtube.com/watch?v=gJYZE9UXiHk',
    caption: 'วิธีใช้ Google AI Studio สร้าง Web App',
  },
  {
    sender: 'น้ำอ้อย',
    avatar: '🙋‍♀️',
    type: 'text',
    content: 'โห เจ๋งมาก! แล้วพอสร้างเสร็จ เราต้องทำอะไรต่อคะ?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ของที่สร้างเสร็จ ยังไม่ใช่จุดจบ... เราต้องเอาไป "ทดสอบรอบสอง"',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'กลับไปหาคนที่เคยเทส Pretotype กับเรา หรือคนที่ให้ข้อมูล / ลงชื่อสนใจไว้\nพวกเขาคือกลุ่มคนที่ดีที่สุดที่จะให้ Feedback เรา',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'แต่เป้าหมายรอบนี้เปลี่ยนไปแล้วนะ\n\nรอบแรกเราวัด "ความสนใจ" และ "พฤติกรรมเบื้องต้น"\nรอบนี้เราจะวัด "Usability" (ใช้งานง่ายไหม) และ "Value" (มันแก้ปัญหาให้เขาได้จริงๆ รึเปล่า)',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ให้เขาลองใช้ Prototype จริงๆ ของเรา\nดูว่าเขาไปต่อไม่ได้ตรงไหน งงตรงไหน หรือชอบฟีเจอร์ไหนมากที่สุด\nแล้วจดทุกอย่างไว้!',
  },
  {
    sender: 'นัท',
    avatar: '🙋‍♂️',
    type: 'text',
    content: 'เข้าใจแล้วครับ ลุยเลย!',
  },
];

const assessmentPrompt = `📝 Assignment: สร้าง Prototype และทดสอบรอบสอง

**1. ฟีเจอร์หลักที่จะสร้าง (Core Features)**
[เลือกแค่ 1-2 อย่างที่จำเป็นที่สุดสำหรับ Prototype นี้]

**2. การใช้ Google AI Studio ช่วยสร้าง**
[เราจะให้ AI Studio ช่วยทำส่วนไหนบ้าง? เช่น สร้าง UI (HTML/CSS), เขียน Logic การทำงาน, หรือสร้าง System Prompt ให้แชทบอท]

**3. กลุ่มเป้าหมายในการทดสอบรอบสอง**
[ใครคือคนที่เราจะเอาไปให้เทส? (แนะนำให้เป็นกลุ่มเดิมจากรอบ Pretotype)]

**4. สิ่งที่จะวัดผลในรอบนี้ (Metrics)**
[พฤติกรรมอะไรที่จะบอกว่า Prototype นี้พร้อมไปต่อ เช่น สามารถทำครบ Flow ได้โดยไม่ต้องถาม 4/5 คน หรือ ผู้ใช้กลับมาใช้ซ้ำในวันถัดไป]

**5. ลิงก์ไปยัง Prototype ของคุณ**
[แปะ Link ของ Web App, แชทบอท, หรือ Prototype ที่สร้างเสร็จแล้ว]`;

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
      title: 'สร้าง Prototype ด้วย Google AI Studio & ทดสอบรอบสอง',
      instructions:
        'ใช้ Google AI Studio ช่วยสร้าง Functional Prototype ที่ทำงานได้จริง ทั้ง Frontend และ Backend แล้วนำกลับไปทดสอบกับกลุ่มเป้าหมายเดิม เพื่อวัด Usability และ Value',
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
  const newContentId = '9b1c1e55-3d9a-4c28-bb71-80a5f019b26b'; // newly generated stable ID
  const { error: insC } = await sb
    .from('hackathon_phase_activity_content')
    .insert({
      id: newContentId,
      activity_id: ACTIVITY_ID,
      content_type: 'chat_comic',
      content_title: 'ลุยของจริง: สร้าง Prototype และเทสรอบสอง',
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

  // 5. Insert new assessment
  const newAssessId = 'dd246261-26c1-4033-9362-e61bebd4e918'; // newly generated stable ID
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
        min_words: 80,
        placeholder:
          '1. ฟีเจอร์หลัก: หน้าให้ user พิมพ์ระบายความรู้สึก และ AI ตอบกลับ\n2. AI Studio ช่วย: เขียน Prompt ตอบกลับ และสร้างหน้าเว็บ HTML ให้คนพิมพ์เข้ามาได้\n3. กลุ่มเป้าหมาย: น้องๆ ม.ปลาย 5 คนเดิมจากรอบที่แล้ว\n4. วัดผล: ผู้ใช้สามารถใช้งานได้จนจบโดยไม่ต้องถามวิธีใช้ และรู้สึกว่าการตอบกลับของ AI ช่วยได้จริง\n5. ลิงก์: https://...',
        show_example: false,
        submission_label: 'Prototype & Test Plan',
      },
    });
  console.log('Insert assessment:', insA ? insA.message : 'OK');

  // 6. Verify
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
