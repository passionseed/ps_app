// Full rewrite of Phase 2 Activity 3 "Build the Pretotype".
// Replaces chat_comic content with P'Seed teaching each pretotype method.
// Idempotent: deletes old content/assessment, inserts new.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SB_SVC) { console.error('Missing service role key'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

const ACTIVITY_ID = '9f2244c3-f1a8-4b39-8b76-906cec2e111a';
const CONTENT_ID = '2244e80b-ac76-46d5-b483-bee4041430c1';
const ASSESSMENT_ID = '645e9646-842c-434a-9c79-6034248f6897';

const messages = [
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'เอาล่ะ ได้เวลาลงมือแล้ว\n\nหยุดคิดเรื่อง "จะทำให้สวย"\nโฟกัสอย่างเดียว: ทำยังไงให้ user "ทำพฤติกรรม" ตามสมมติฐาน ภายใน 2 ชั่วโมง',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'แต่ละวิธี ทำแบบนี้',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🧙‍♂️ Wizard of Oz (ดูเหมือนอัตโนมัติ แต่คนทำหลังบ้าน)',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'เทคนิค:\n* user ต้องคิดว่ามัน auto\n* แต่จริงๆ พวกคุณตอบเองทั้งหมด\n\nทำยังไง:\n* ใช้ Google Forms / LINE / chat อะไรก็ได้\n* ตั้ง expectation ว่า "ระบบจะตอบ"\n* หลังบ้าน: ทีมคอยตอบ manual ให้เร็ว\n\nข้อห้าม:\n* ห้ามปล่อยช้า (user จะรู้ว่า fake)\n* ห้ามสร้างระบบจริง\n\nเช็คว่าโอเค:\n→ user ใช้มันซ้ำ โดยไม่รู้ว่ามีคนอยู่หลังบ้าน',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🚪 Fake Door (มีปุ่ม แต่ยังไม่มีของจริง)',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'เทคนิค:\n* ขาย "promise" ก่อน\n* ยังไม่ต้องมี product\n\nทำยังไง:\n* ทำ landing page สั้นมาก (v0 / lovable / AI tools)\n* มีปุ่มเดียว: "เริ่มใช้" / "ลองเลย"\n* กดแล้ว → form / waitlist / message\n\nข้อห้าม:\n* ห้ามมีหลายปุ่ม (จะงง data)\n* ห้ามอธิบายยาว\n\nเช็คว่าโอเค:\n→ คน "พยายามจะเข้าไปใช้" ไม่ใช่แค่ดูผ่าน',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🛎️ Concierge (ทำให้ user ด้วยมือทั้งหมด)',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'เทคนิค:\n* ทำ service จริง แต่ manual 100%\n\nทำยังไง:\n* รับเคสจริงจาก user\n* ทำให้เขาทีละคน (เช่น แนะนำ / จัดให้ / ส่งให้)\n* track ทุก interaction ใน spreadsheet\n\nข้อห้าม:\n* ห้าม automate\n* ห้าม scale\n\nเช็คว่าโอเค:\n→ user กลับมาใช้ซ้ำ หรือขอเพิ่มเอง',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '🤥 Pinocchio (ของปลอมที่ดูเหมือนใช้ได้)',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'เทคนิค:\n* ทำให้ "ดูเหมือนใช้ได้" เร็วที่สุด\n\nทำยังไง:\n* ใช้ Canva / Figma / กระดาษ\n* simulate flow: กด → ได้ผลลัพธ์ (แม้จะ fake)\n* ให้ user "ลองใช้" ไม่ใช่แค่ดู\n\nข้อห้าม:\n* ห้าม present แบบ slide\n* ต้องมี interaction\n\nเช็คว่าโอเค:\n→ user เข้าใจวิธีใช้เอง และลองเล่นจนจบ flow',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'เลือกให้ตรงสมมติฐาน:\n\nอยากรู้ว่า "จะใช้จริงไหม" → Wizard of Oz / Concierge\nอยากรู้ว่า "จะพยายามเข้าไหม" → Fake Door\nอยากรู้ว่า "เข้าใจ / react ยังไง" → Pinocchio',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'สุดท้าย:\n\nถ้าวิธีที่เลือก\n"ไม่สามารถทำให้สมมติฐานพังได้"\n\nแปลว่าเลือกผิด\n\nกลับไปแก้ข้อที่แล้วละมาสร้างกันใหม่',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'ตัวอย่างชัดๆ ว่า "เลือกวิธีผิด เพราะมันทำให้สมมติฐานพังไม่ได้"',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '❌ Case 1\n\nสมมติฐาน:\n"นักเรียนจะใช้ LINE นี้เพื่อระบายความเครียดจริง"\n\nแต่เลือก: Pinocchio (mockup ใน Figma)\n\nปัญหา:\nuser แค่ดู / ลองกดเล่น\nไม่ได้ "ระบายจริง"\n\n→ ต่อให้ทุกคนบอกว่า "น่าใช้"\nก็ยังไม่รู้ว่าเขาจะใช้จริงไหม\n\nสรุป:\nวิธีนี้ ไม่มีทางพิสูจน์ว่าสมมติฐานผิด\n= เลือกผิด',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '❌ Case 2\n\nสมมติฐาน:\n"คนจะกลับมาใช้ service นี้ซ้ำภายใน 3 วัน"\n\nแต่เลือก: Fake Door (landing page + signup)\n\nปัญหา:\nFake Door วัดได้แค่ว่า "อยากลองครั้งแรกไหม"\nแต่วัด "การกลับมาใช้ซ้ำ" ไม่ได้\n\n→ ต่อให้มีคนสมัครเยอะ\nก็ยังไม่รู้ว่าเขาจะกลับมาไหม\n\nสรุป:\nวัด behavior ที่สำคัญไม่ได้\n= เลือกผิด',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '❌ Case 3\n\nสมมติฐาน:\n"คนจะยอมจ่ายเงินเพื่อให้ช่วยจัดตารางอ่านหนังสือ"\n\nแต่เลือก: Pinocchio (โชว์หน้าจอสวยๆ)\n\nปัญหา:\nไม่มี moment ที่ user ต้อง "จ่ายจริง"\n\n→ ทุกคนอาจบอกว่า "ดี น่าสนใจ"\nแต่ไม่มีใครต้องควักเงินจริง\n\nสรุป:\nไม่มีความเสี่ยงจริง → สมมติฐานพังไม่ได้\n= เลือกผิด',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '✅ Case 4 (ถูก)\n\nสมมติฐาน:\n"คนจะใช้บริการจัดตาราง และกลับมาใช้ซ้ำ"\n\nเลือก: Concierge\n\nทำ:\n* ให้ user 5 คน\n* จัดตารางให้จริง\n* track ว่ากลับมาขออีกไหม\n\nผล:\n* ถ้าไม่มีใครกลับมา → สมมติฐานพังทันที\n* ถ้ามี → เริ่มมีสัญญาณจริง\n\nสรุป:\nวิธีนี้ "เปิดโอกาสให้แพ้"\n= เลือกถูก',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'กฎสั้นๆ:\n\nถ้าผลลัพธ์ออกมายังไง\nคุณก็ยัง "เชื่อสมมติฐานต่อได้"\n\n→ แปลว่า test นั้น ไม่มีค่า',
  },
];

async function run() {
  // 1. Update activity title + instructions
  const { error: actErr } = await sb
    .from('hackathon_phase_activities')
    .update({
      title: 'สร้าง Pretotype',
      instructions:
        'จากวิธีที่เลือกใน Activity 2 → สร้าง pretotype ที่ทดสอบสมมติฐานได้จริงภายใน 2 ชั่วโมง เน้นพฤติกรรมของ user ไม่ใช่ความสวย',
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
      content_title: 'เคส Aurora: ขั้นตอนสร้าง pretotype ทีละวิธี',
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

  // 4. Verify
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
}

run().catch(console.error);
