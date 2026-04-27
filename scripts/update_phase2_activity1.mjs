// Updates Phase 2 Activity 1 chat_comic content:
// - Replace พี่ไก่ → P'Seed
// - Text 1: รอดมาได้, no PROCEED, Thai phrasing
// - Text 2: No กระโดด, reason in Thai
// Idempotent: deletes then reinserts content for activity 1.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '[REDACTED_SUPABASE_URL]';
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SB_SVC) {
  console.error('Missing service role key env var');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SB_SVC, { auth: { persistSession: false } });

const ACTIVITY_ID = 'c08b9d37-4637-45bc-9834-4cc082747e84';
const CONTENT_ID = 'b103f9c5-554f-4222-a91a-6d1cff7ea7ba';

const newContentBody = JSON.stringify({
  messages: [
    {
      sender: "P'Seed",
      avatar: 'pseed',
      type: 'text',
      content: 'ยินดีด้วยที่รอดมาได้ 🎉 และตัดสินใจลุยกันต่อ ตอนนี้จะทำอะไรต่อ?',
    },
    {
      sender: "P'Seed",
      avatar: 'pseed',
      type: 'text',
      content:
        'ทีมส่วนใหญ่เริ่มสร้างกันเลย ทำแอปไป 2-3 อาทิตย์... สุดท้ายสรุปว่าไม่มีคนใช้',
    },
    {
      sender: 'ทีม Alpha',
      avatar: '🧑‍💻',
      type: 'text',
      content: 'แต่พวกเรารู้ว่าคนเขาต้องการสิ่งนี้นะ! พวกเราสัมภาษณ์มา 8 คนเลย!',
    },
    {
      sender: "P'Seed",
      avatar: 'pseed',
      type: 'text',
      content: 'รู้ว่าปัญหามีอยู่จริง ≠ รู้ว่าคนจะใช้สิ่งที่เราสร้าง',
    },
    {
      sender: "P'Seed",
      avatar: 'pseed',
      type: 'image',
      content: 'https://storage.passionseed.com/hackathon/phase2/hypothesis-example.png',
      caption: 'ดูความต่างนะ',
    },
    {
      sender: "P'Seed",
      avatar: 'pseed',
      type: 'text',
      content:
        'ก่อนจะสร้างอะไร ให้เขียน Hypothesis ก่อน:\n\nพวกเราเชื่อว่า [กลุ่มคน] ต้องการ [สิ่งที่จะสร้าง] เพราะ [หลักฐานจาก Phase 1]',
    },
    {
      sender: 'ทีม Beta',
      avatar: '👩‍💻',
      type: 'text',
      content:
        'อย่างเช่น... พวกเราเชื่อว่าผู้สูงอายุที่เป็นเบาหวานต้องการตัวเตือนยาผ่าน LINE เพราะ 7/8 คนลืมกินยา?',
    },
    {
      sender: "P'Seed",
      avatar: 'pseed',
      type: 'text',
      content:
        'ใช่เลย! แต่เพิ่มอีกนิด:\n\nพวกเราจะรู้ว่าถูก ถ้า [ผลลัพธ์ที่วัดได้]\nพวกเราจะรู้ว่าผิด ถ้า [ผลลัพธ์ที่บอกว่าผิด]',
    },
    {
      sender: "P'Seed",
      avatar: 'pseed',
      type: 'video',
      content: 'https://storage.passionseed.com/hackathon/phase2/hypothesis-guide.mp4',
      caption: 'ดูคำแนะนำ 2 นาที',
    },
    {
      sender: "P'Seed",
      avatar: 'pseed',
      type: 'text',
      content:
        'ตอนนี้ถึงตาพวกเราแล้ว เขียน Hypothesis ของทีมด้านล่างเลย ต้องเจาะจง ต้องพิสูจน์ได้ (falsifiable)',
    },
  ],
});

const newMetadata = {
  chat_style: 'whatsapp',
  click_to_reveal: true,
  show_typing_indicator: true,
};

async function run() {
  // Delete existing content
  const { error: deleteError } = await sb
    .from('hackathon_phase_activity_content')
    .delete()
    .eq('id', CONTENT_ID);

  if (deleteError) {
    console.error('Delete error:', deleteError);
  } else {
    console.log('Deleted old content OK');
  }

  // Insert updated content
  const { error: insertError } = await sb
    .from('hackathon_phase_activity_content')
    .insert({
      id: CONTENT_ID,
      activity_id: ACTIVITY_ID,
      content_type: 'chat_comic',
      content_title: 'The Hypothesis Chat',
      content_url: null,
      content_body: newContentBody,
      display_order: 1,
      metadata: newMetadata,
    });

  if (insertError) {
    console.error('Insert error:', insertError);
  } else {
    console.log('Inserted updated content OK');
  }

  // Verify
  const { data: verify } = await sb
    .from('hackathon_phase_activity_content')
    .select('id, content_body')
    .eq('id', CONTENT_ID)
    .single();

  console.log('\nVerification:');
  console.log('ID:', verify?.id);
  const parsed = JSON.parse(verify?.content_body ?? '{}');
  console.log('Messages:');
  parsed.messages?.forEach((m, i) => {
    console.log(`  [${i + 1}] ${m.sender}: ${m.content.slice(0, 60)}...`);
  });
}

run().catch(console.error);
