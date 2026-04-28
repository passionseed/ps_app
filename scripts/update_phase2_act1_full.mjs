// Full rewrite of Phase 2 Activity 1 content + assessment.
// Replaces chat_comic content with Aurora team scenario.
// Replaces assessment with comprehensive Thai template.
// Idempotent: deletes old content/assessment, inserts new.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SB_SVC) {
  console.error('Missing service role key');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

const ACTIVITY_ID = 'c08b9d37-4637-45bc-9834-4cc082747e84';
const CONTENT_ID = 'b103f9c5-554f-4222-a91a-6d1cff7ea7ba';
const ASSESSMENT_ID = '80986447-8134-4def-bd0f-6435333f909b';

const messages = [
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'สวัสดีทีม~ 😊 วันนี้เราจะมาดูอีกเคสหนึ่งนะ\nทีมนี้อยากแก้ "ปัญหาสุขภาพจิต" ฟังดูดีมากเลยใช่ไหม?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content:
      'ใช่ครับพี่! พวกเรารู้สึกว่าคนรอบตัวเครียดกันเยอะมาก โดยเฉพาะนักเรียน\nเราเลยอยากทำแอปดูแลสุขภาพจิต แบบเช็คอินอารมณ์ทุกวัน + AI คุยให้กำลังใจ',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'โอเค ฟังดี…\nแต่ขอถามตรงๆ นะ 👀\n\nพวกเรารู้ได้ยังไงว่า "คนจะใช้"?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'ก็…เราสัมภาษณ์มา 10 คนเลยนะครับ\n8 คนบอกว่า "อยากมีแอปแบบนี้" 😄',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'อืม…\nงั้นพี่ถามอีกนิดนะ\n\n👉 ตอนนี้เวลาพวกเขาเครียด…เขาทำอะไร?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content:
      'ส่วนใหญ่ก็…\n\n* ดู TikTok\n* คุยกับเพื่อน\n* บางคนก็ปล่อยไว้เฉยๆ',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'แล้วมีใคร "ใช้แอปสุขภาพจิต" ไหม?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'เอ่อ…ไม่มีเลยครับ 😅',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'โอเค งั้นเราหยุดก่อน\n\nตอนนี้สิ่งที่พวกเรามีคือ:\n\n* คน "เครียด" → จริง ✅\n* คน "อยากได้แอป" → อาจจะจริง 🤔\n* แต่ "คนจะใช้แอปของเรา" → ยังไม่มีหลักฐานเลย ❌\n\nนี่แหละจุดที่ทีมส่วนใหญ่พลาด',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ลองเขียนสมมติฐานแบบแรกดูสิ',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content:
      'โอเคครับ\n\n> พวกเราเชื่อว่านักเรียนที่มีความเครียดต้องการแอปเช็คอารมณ์ เพราะ 8/10 คนบอกว่าอยากได้',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '❌ ยังใช้ไม่ได้',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'อ่าว ทำไมล่ะครับ 😭',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'เพราะนี่คือ "สิ่งที่เขาพูด"\nไม่ใช่ "สิ่งที่เขาทำ"\n\nพี่ถามใหม่:\n\n👉 ตอนนี้เขา "จัดการความเครียด" ยังไง?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content:
      'ส่วนใหญ่คือ:\n\n* เปิด TikTok\n* คุยกับเพื่อน\n* ไม่ทำอะไรเลย',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ดี เริ่มเห็นภาพแล้ว\n\nงั้นลองเขียนใหม่ โดยเริ่มจาก "พฤติกรรมจริง"',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content:
      'โอเคครับ…\n\n> พวกเราเชื่อว่านักเรียนที่เครียด มักจะเลื่อน TikTok หรือคุยกับเพื่อน แทนการใช้แอปสุขภาพจิต\n> เพราะจาก 10 คน ไม่มีใครใช้แอปแบบนี้เลย',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'อันนี้เริ่ม "จริง" แล้ว 👍\nแต่ยังไม่ใช่สมมติฐานที่ดีพอ',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'ยังขาดอะไรอีกครับ?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      '👉 ยังไม่มี "การเปลี่ยนพฤติกรรม"\n👉 ยังไม่มี "สิ่งที่เราจะทดสอบ"\n👉 ยังไม่มี "วิธีรู้ว่าผิด"',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'ลองเติมให้ครบ:',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content:
      'โอเคครับ ลองอีกครั้ง\n\n> พวกเราเชื่อว่านักเรียนที่เครียด มักจะเลื่อน TikTok เมื่อรู้สึกเครียด\n> เพราะมันง่ายและไม่ต้องคิด\n>\n> เราคิดว่าถ้าเราส่งข้อความสั้นๆ ผ่าน LINE ที่ให้เขาระบายความรู้สึกได้ทันที\n> เขาจะเลือกใช้แทนการเลื่อน TikTok\n>\n> ✅ จะถูก ถ้า 3/5 คนตอบกลับข้อความและระบายความรู้สึกอย่างน้อย 2 ครั้งใน 3 วัน\n> ❌ จะผิด ถ้าน้อยกว่า 2/5 คนตอบกลับเลย',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: 'อันนี้…ใช้ได้แล้ว 👏',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'แต่พี่จะถามเพิ่มอีกนิดนะ (สำคัญมาก)\n\n👉 ทำไมเขาต้องเลือก LINE ของเรา\nแทน TikTok หรือเพื่อน?',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content: 'เอ่อ…\n\nเพราะ…มันสะดวก?',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content: '"สะดวก" ยังไม่พอ\n\nนี่คือจุดที่สมมติฐานยังอ่อนอยู่',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'ลองคิดแบบนี้:\n\n> ถ้าสิ่งที่เราทำ "ไม่ดีกว่าวิธีเดิมจริง"\n> เขาจะไม่เปลี่ยนพฤติกรรม',
  },
  {
    sender: 'ทีม Aurora',
    avatar: '🧑‍💻',
    type: 'text',
    content:
      'งั้นเราต้องเพิ่มว่า…\n\n> เพราะมัน anonymous และไม่ต้องกลัวโดน judge\n> ต่างจากการคุยกับเพื่อน',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'ดีขึ้นเยอะ 👍\nตอนนี้สมมติฐานของพวกเรามี:\n\n* พฤติกรรมปัจจุบัน ✅\n* สิ่งที่ทดลอง ✅\n* เหตุผลว่าทำไมจะเปลี่ยน ✅\n* วิธีวัดผล ✅\n* เงื่อนไขว่าผิดคืออะไร ✅',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'จำไว้นะทีม\n\n> คนไม่ได้เปลี่ยนพฤติกรรมง่ายๆ\n> โดยเฉพาะเรื่อง "สุขภาพจิต"\n>\n> ถ้าสมมติฐานของเราไม่แรงพอ\n> โลกจริงจะเป็นคนปฏิเสธมันเอง',
  },
  {
    sender: "P'Seed",
    avatar: 'pseed',
    type: 'text',
    content:
      'โอเค ถึงตาพวกเราแล้ว 💪\nลองเขียนสมมติฐานของทีมตัวเอง\n\nแต่ระวังนะ…\n\n👉 อย่าเขียนสิ่งที่ "ฟังดูดี"\n👉 เขียนสิ่งที่ "อาจจะผิดได้จริง"',
  },
];

const assessmentPrompt = `📝 Assignment: From Problem → Testable Hypothesis

🎯 Goal
แปลง Problem Proof Pack → เป็น สมมติฐานเชิงพฤติกรรม ที่สามารถ "พิสูจน์ว่าผิด" ได้ ก่อนสร้างอะไร

⚠️ Rules (non-negotiable)
ห้ามใช้คำว่า: สนใจ / อยาก / น่าจะ / น่าจะใช้
ห้ามใช้ metric: click / like / signup
ต้องมี "พฤติกรรมจริง" เท่านั้น (ทำ / ใช้ / กลับมาใช้)
เปลี่ยนได้แค่ 1 ตัวแปร ต่อสมมติฐาน

👉 ถ้าผิดข้อใดข้อหนึ่ง = ไม่ผ่านทันที

✍️ Template (เขียนตามนี้ทุกช่อง)

1. Current Behavior (สิ่งที่เกิดขึ้นตอนนี้)
[กลุ่มคน] ตอนนี้กำลัง [พฤติกรรมจริง]
เมื่อ [สถานการณ์]

2. Evidence (หลักฐานจาก Phase 1)
เพราะ:
[หลักฐาน 1]
[หลักฐาน 2]

3. Hypothesis (การเปลี่ยนพฤติกรรม)
เราคิดว่า:
ถ้า [สิ่งที่เราทดลอง — เปลี่ยนแค่ 1 อย่าง]
→ จะทำให้ [พฤติกรรมใหม่ที่สังเกตได้]

4. Experiment Plan (วิธีทดสอบ)
เราจะทดสอบโดย:
[ทำอะไร, กับใคร, นานแค่ไหน]

5. ✅ Success Criteria (จะรู้ว่าถูกเมื่อไหร่)
ถ้า [X จาก Y คน]
ทำ [พฤติกรรมที่สังเกตได้]
ภายใน [เวลา]

6. ❌ Failure Criteria (จะรู้ว่าผิดเมื่อไหร่)
ถ้าน้อยกว่า [threshold]
→ เราจะ [pivot / stop / change direction]

🔍 Example (ดูเป็น Reference เท่านั้น)

นักเรียนที่เครียด มักจะเลื่อน TikTok เมื่อรู้สึกเครียด
เพราะ 8/10 คนบอกว่าใช้วิธีนี้ และไม่มีใครใช้ mental health app

เราคิดว่า:
ถ้าส่งข้อความ anonymous ผ่าน LINE
→ จะทำให้เขาระบายความรู้สึกผ่านข้อความแทน

เราจะทดสอบโดย:
ส่งข้อความทุกวัน 3 วัน กับนักเรียน 5 คน

✅ ถ้า 3/5 คนตอบกลับอย่างน้อย 2 ครั้ง
❌ ถ้าน้อยกว่า 2/5 → pivot`;

async function run() {
  // 1. Update activity title and instructions
  const { error: actErr } = await sb
    .from('hackathon_phase_activities')
    .update({
      title: 'จากปัญหาสู่สมมติฐาน',
      instructions:
        'เปลี่ยน Problem Proof Pack จาก Phase 1 ให้เป็นสมมติฐานเชิงพฤติกรรมที่พิสูจน์ว่าผิดได้ — ก่อนลงมือสร้างอะไร เขียนสิ่งที่คิดและวิธีรู้ว่าถูกหรือผิดก่อน',
    })
    .eq('id', ACTIVITY_ID);
  console.log('Activity update:', actErr ? actErr.message : 'OK');

  // 2. Delete old content
  const { error: delContent } = await sb
    .from('hackathon_phase_activity_content')
    .delete()
    .eq('id', CONTENT_ID);
  console.log('Delete content:', delContent ? delContent.message : 'OK');

  // 3. Insert new content
  const { error: insContent } = await sb
    .from('hackathon_phase_activity_content')
    .insert({
      id: CONTENT_ID,
      activity_id: ACTIVITY_ID,
      content_type: 'chat_comic',
      content_title: 'เคส Aurora: สมมติฐานที่ดี vs สมมติฐานที่ฟังดูดี',
      content_url: null,
      content_body: JSON.stringify({ messages }),
      display_order: 1,
      metadata: {
        chat_style: 'whatsapp',
        click_to_reveal: true,
        show_typing_indicator: true,
      },
    });
  console.log('Insert content:', insContent ? insContent.message : 'OK');

  // 4. Delete old assessment
  const { error: delAssess } = await sb
    .from('hackathon_phase_activity_assessments')
    .delete()
    .eq('id', ASSESSMENT_ID);
  console.log('Delete assessment:', delAssess ? delAssess.message : 'OK');

  // 5. Insert new assessment
  const { error: insAssess } = await sb
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
        min_words: 100,
        placeholder:
          '1. Current Behavior: นักเรียนที่เครียด ตอนนี้กำลังเลื่อน TikTok เมื่อรู้สึกเครียด...\n2. Evidence: เพราะ 8/10 คนที่สัมภาษณ์ทำแบบนี้...\n3. Hypothesis: ถ้าเราส่งข้อความ anonymous ผ่าน LINE... → จะทำให้เขาระบายความรู้สึกแทน...\n4. Experiment Plan: ส่งข้อความทุกวัน 3 วัน กับนักเรียน 5 คน...\n5. Success: ถ้า 3/5 คนตอบกลับอย่างน้อย 2 ครั้ง...\n6. Failure: ถ้าน้อยกว่า 2/5 → pivot',
        show_example: false,
        submission_label: 'สมมติฐาน',
      },
    });
  console.log('Insert assessment:', insAssess ? insAssess.message : 'OK');

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
}

run().catch(console.error);
