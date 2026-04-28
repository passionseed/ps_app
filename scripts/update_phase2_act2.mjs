// Full rewrite of Phase 2 Activity 2 "Choose Your Pretotype".
// Replaces chat_comic content with Aurora team scenario + 4 pretotype methods.
// Idempotent: deletes old content/assessment, inserts new.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SB_SVC) { console.error('Missing service role key'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

const ACTIVITY_ID = 'aeefd678-28d2-4f61-b287-6ae1d2fad544';
const CONTENT_ID = '6350674e-5fef-4aa2-9aa7-b0a54bcefe53';
const ASSESSMENT_ID = '69fe694b-3749-4880-9606-44c408df22a1';

const messages = [
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'โอเคทีม~ ตอนนี้พวกเรามีสมมติฐานแล้วใช่ไหม 😊\nคำถามต่อไปคือ…\n\n👉 จะ "พิสูจน์" มันยังไง โดยไม่ต้องสร้างของจริง?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'ก็…เราคงต้องเริ่มเขียนแอปเลยไหมครับ?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      '❌ นี่แหละทางลัดไปสู่ความล่มจม\n\nพี่ถามตรงๆ นะ\n👉 ถ้าใช้เวลา 2 สัปดาห์สร้าง แล้วไม่มีใครใช้…โอเคไหม?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'ไม่โอเคครับ 😭',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'งั้นเราจะใช้สิ่งนี้แทน\n\n👉 Pretotype = วิธีเล่นเป็นระบบเพื่อเทสอย่างเร็ว\n\nไม่ใช่การสร้างของจริง\nแต่เป็นการ "fake" เพื่อดูว่าไอเดียเราจะรอดไหม',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'แต่ระวังนะ…\n👉 ไม่มีวิธีไหน "ดีที่สุด"\n👉 มีแต่วิธีที่ "เหมาะกับสมมติฐานของเรา"',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'มาดูของทีมเราก่อน สมมติฐานคือ\n\nถ้าส่งข้อความ anonymous ผ่าน LINE\n→ นักเรียนจะระบายความรู้สึกแทนการเลื่อน TikTok\n\nคำถามคือ…\n\n👉 เราต้องพิสูจน์อะไร?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'ว่าคนจะ "ตอบกลับจริง" ใช่ไหมครับ?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'ถูก 👍\nงั้นเราต้อง "เห็นพฤติกรรมการตอบ" ไม่ใช่แค่ความสนใจ',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🧙‍♂️ วิธีที่ 1: Wizard of Oz',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'ถ้าเราสร้าง LINE bot ปลอม…\nแต่จริงๆ มีคนตอบอยู่หลังบ้านล่ะ?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'อ๋อ เหมือนแกล้งเป็น AI?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ใช่เลย\n\n👉 User คิดว่าเป็นระบบ\n👉 แต่จริงๆ เราทำ manual',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      '🧠 ใช้เมื่อ:\nต้องทดสอบ "interaction"\nต้องดูว่าคน "ใช้ต่อเนื่องไหม"',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'สำหรับทีมเรา…\n\n👉 ถ้าอยากรู้ว่า "เขาจะคุยต่อไหม"\nWizard of Oz = ใช้ได้ดีมาก',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🚪 วิธีที่ 2: Fake Door',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'อีกแบบหนึ่ง\n\nเราทำหน้าเว็บเขียนว่า\n"AI ดูแลสุขภาพจิต 24 ชม."\n\nแล้วมีปุ่ม: "เริ่มใช้งาน"\n\nแต่…กดแล้วไม่มีอะไร 😶',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'เอ้า ทำไปทำไม 😅',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'มันไม่ได้ไม่มีความหมายนะ\nมันคือการวัด "ความสนใจ"\n\n🧠 ใช้เมื่อ:\nอยากรู้ว่า "คนอยากลองไหม"\nยังไม่ต้อง test behavior ลึก',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'แต่สำหรับทีมเรา…\n\n👉 แค่กด ≠ จะระบายความรู้สึก\n\nดังนั้น…\n\n❌ Fake Door อย่างเดียว "ไม่พอ"',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🛎️ วิธีที่ 3: Concierge',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ลองคิดแบบนี้\n\nเราไม่ต้องมีระบบเลย\nเราดูแล user "ด้วยมือ" 100%',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'แบบ…คุยกับเขาจริงๆ เลย?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'ใช่ แทนที่จะเป็น AI ใช้คน ทำบริการเลยตรงๆ\n\n👉 เขาเครียด → เราทัก\n👉 เขาตอบ → เราฟัง + ตอบกลับ',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🧠 ใช้เมื่อ:\nอยากเข้าใจ user ลึกมาก\nbehavior ยังไม่ชัด',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ข้อดี:\ninsight ลึกมาก\n\nข้อเสีย:\nscale ไม่ได้',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'สำหรับทีมเรา…\n\n👉 ถ้ายังไม่รู้ว่า "เขาจะเปิดใจไหม"\nConcierge = ดีมาก',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🤥 วิธีที่ 4: Pinocchio',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'สุดท้าย\n\nเราทำ prototype ที่ "ดูเหมือนใช้ได้"\nแต่จริงๆ มันไม่ทำงาน',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'แบบ UI สวยๆ แต่กดแล้ว fake?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'ใช่\n\n👉 ใช้ดู "reaction"\nไม่ใช่ "behavior จริง"',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🧠 ใช้เมื่อ:\ntest first impression\ntest concept',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'แต่จำไว้\n\n👉 คนพูดว่า "ดี" ไม่สำคัญ\n👉 คน "ใช้" ต่างหากที่สำคัญ',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '⚠️ Moment of Truth',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'งั้นพี่ถามเลยนะ\n\n👉 ทีมเราควรใช้วิธีไหนดี?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'น่าจะ Wizard of Oz หรือ Concierge…\nเพราะเราต้องดูว่าเขาจะ "ตอบจริงไหม"',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ใช่ 👍\n\nและนี่คือ logic ที่พวกเราต้องใช้:\n\nถ้าจะวัด "ความสนใจ" → Fake Door\nถ้าจะวัด "reaction" → Pinocchio\nถ้าจะวัด "behavior จริง" → Wizard of Oz / Concierge',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'จำไว้นะน้องๆ\n\nอย่าเลือกวิธีที่ "ทำง่าย"\nให้เลือกวิธีที่ "เทสสมมติฐานได้จริง"',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'ขอบคุณครับพี่',
  },
];

const assessmentPrompt = `📝 Assignment: เลือก Pretotype ที่เหมาะกับสมมติฐานของทีม

🎯 Goal
จากสมมติฐานที่เขียนใน Activity 1 → เลือกวิธี pretotype ที่จะ "พิสูจน์" มันได้จริง

⚠️ ก่อนเลือก — ตอบคำถามนี้ก่อน

1. สมมติฐานของเราคืออะไร?
   (copy มาจาก Activity 1)

2. สิ่งที่เราต้องพิสูจน์ คืออะไร?
   ○ คน "สนใจ" ไหม (interest)
   ○ คน "reaction" เป็นยังไง (first impression)
   ○ คน "ใช้ต่อเนื่อง" ไหม (behavior จริง)

3. ถ้าเราใช้เวลา 2 สัปดาห์สร้าง แล้วไม่มีใครใช้…โอเคไหม?
   (ถ้าไม่โอเค = ต้อง pretotype ก่อน)

4. เลือกวิธี
   ○ Wizard of Oz — ปลอมเป็นระบบ แต่มีคนจริงทำอยู่ข้างหลัง
   ○ Fake Door — ทำหน้าตา แต่กดแล้วไม่มีอะไร (วัดความสนใจ)
   ○ Concierge — ดูแล user ด้วยมือ 100% (ไม่มีระบบ)
   ○ Pinocchio — prototype ที่ดูเหมือนใช้ได้ แต่ไม่ทำงานจริง

5. ทำไมเลือกวิธีนี้?
   (อธิบายเป็นภาษาของตัวเอง — ห้าม copy จาก chat)

6. ขั้นตอนถัดไป
   อธิบายว่าจะ "เล่นเป็นระบบ" ยังไง
   กี่คน ทำอะไร วันละกี่ชั่วโมง

⚠️ ห้ามเลือกวิธีที่ "ทำง่ายที่สุด"
⚠️ ต้องเลือกวิธีที่ "เทสสมมติฐานได้จริง"

📋 Example Reference (ดูเป็น reference เท่านั้น)

สมมติฐาน: ถ้าส่งข้อความ anonymous ผ่าน LINE → นักเรียนจะระบายความรู้สึกแทนการเลื่อน TikTok

สิ่งที่ต้องพิสูจน์: behavior จริง (คนจะ "ตอบ" ไหม)

เลือก: Wizard of Oz
เหตุผล: เราต้องเห็นว่าคนจะ "คุยต่อ" ไหม ไม่ใช่แค่กด หรือบอกว่าชอบ — Wizard of Oz ให้เรา "เห็น behavior จริง" ได้เร็วที่สุด

ขั้นตอนถัดไป:
- สร้าง LINE bot ปลอม
- 2 คนในทีม รับลำดับ (สลับกัน) ทุกวัน 10.00-22.00
- เทสกับนักเรียน 5 คน นาน 3 วัน`;

async function run() {
  // 1. Update activity title + instructions
  const { error: actErr } = await sb
    .from('hackathon_phase_activities')
    .update({
      title: 'เลือกวิธี Pretotype',
      instructions:
        'จากสมมติฐานที่เขียนใน Activity 1 → เลือกวิธี pretotype ที่พิสูจน์ได้จริงว่า hypothesis ของเราจะรอด โดยไม่ต้องสร้างของจริง',
    })
    .eq('id', ACTIVITY_ID);
  console.log('Activity update:', actErr ? actErr.message : 'OK');

  // 2. Delete old content
  const { error: delC } = await sb
    .from('hackathon_phase_activity_content')
    .delete()
    .eq('id', CONTENT_ID);
  console.log('Delete content:', delC ? delC.message : 'OK');

  // 3. Insert new content
  const { error: insC } = await sb
    .from('hackathon_phase_activity_content')
    .insert({
      id: CONTENT_ID,
      activity_id: ACTIVITY_ID,
      content_type: 'chat_comic',
      content_title: 'เคส Aurora: เลือกวิธี pretotype ให้ตรงกับสมมติฐาน',
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

  // 4. Delete old assessment
  const { error: delA } = await sb
    .from('hackathon_phase_activity_assessments')
    .delete()
    .eq('id', ASSESSMENT_ID);
  console.log('Delete assessment:', delA ? delA.message : 'OK');

  // 5. Insert new assessment
  const { error: insA } = await sb
    .from('hackathon_phase_activity_assessments')
    .insert({
      id: ASSESSMENT_ID,
      activity_id: ACTIVITY_ID,
      assessment_type: 'text_answer',
      display_order: 0,
      points_possible: 10,
      is_graded: true,
      metadata: {
        prompt: assessmentPrompt,
        min_words: 80,
        placeholder:
          '1. สมมติฐาน: ถ้า... → จะทำให้...\n2. สิ่งที่ต้องพิสูจน์: (interest / reaction / behavior จริง)\n3. ถ้า 2 สัปดาห์ล้มเหลว โอเคไหม: (ใช่/ไม่)\n4. เลือก: (Wizard of Oz / Fake Door / Concierge / Pinocchio)\n5. เหตุผล: ...\n6. ขั้นตอนถัดไป: ...',
        show_example: false,
        submission_label: 'Pretotype ที่เลือก',
      },
    });
  console.log('Insert assessment:', insA ? insA.message : 'OK');

  // 6. Verify
  const { data: verify } = await sb
    .from('hackathon_phase_activity_content')
    .select('id, content_title, content_body')
    .eq('id', CONTENT_ID)
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
  console.log(`Activity instructions: "${act?.instructions?.slice(0, 60)}..."`);
}

run().catch(console.error);
