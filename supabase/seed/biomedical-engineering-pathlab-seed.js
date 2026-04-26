/**
 * Seed script: วิศวกรรมชีวการแพทย์ (Biomedical Engineering) PathLab
 * Run: node supabase/seed/biomedical-engineering-pathlab-seed.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

const ADMIN_USER_ID = '47fcee20-8515-42ed-bffb-efc4f56f559d';
const TECHSEED_CATEGORY_ID = '3264387a-42ce-403e-8878-31414dc03098';

async function seed() {
  console.log('🏥 Seeding Biomedical Engineering PathLab...\n');

  // ── 1. Learning Map ──────────────────────────────────────────────────────────
  const { data: map, error: mapErr } = await supabase
    .from('learning_maps')
    .insert({ title: 'Biomedical Engineering PathLab Journey' })
    .select()
    .single();
  if (mapErr) throw new Error('Map: ' + mapErr.message);
  console.log('✅ Map:', map.id);

  // ── 2. Seed ──────────────────────────────────────────────────────────────────
  const { data: seed, error: seedErr } = await supabase
    .from('seeds')
    .insert({
      map_id: map.id,
      title: 'วิศวกรรมชีวการแพทย์',
      description:
        'ลองออกแบบอุปกรณ์ช่วยผู้ป่วยจริง — ตั้งแต่วันแรก คุณจะทดสอบ สร้าง protect และ defend งานของตัวเอง ภายใน 5 วัน',
      slogan: 'คุณออกแบบอุปกรณ์ที่ช่วยให้คนมีชีวิตอยู่',
      seed_type: 'pathlab',
      category_id: TECHSEED_CATEGORY_ID,
      visibility: 'hidden',
    })
    .select()
    .single();
  if (seedErr) throw new Error('Seed: ' + seedErr.message);
  console.log('✅ Seed:', seed.id);

  // ── 3. NPC Avatar ────────────────────────────────────────────────────────────
  const { error: npcErr } = await supabase.from('seed_npc_avatars').insert({
    seed_id: seed.id,
    name: 'Dr. Mint',
    description:
      'วิศวกรชีวการแพทย์รุ่นใหม่จาก Mahidol. ชอบแก้ปัญหาจริงจากผู้ป่วยจริง ไม่ชอบทฤษฎีที่ไม่มีใครใช้ได้จริง',
    svg_data: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="100" fill="#E8F5E9"/>
  <circle cx="100" cy="80" r="35" fill="#81C784"/>
  <rect x="55" y="125" width="90" height="60" rx="20" fill="#81C784"/>
  <circle cx="85" cy="75" r="6" fill="white"/>
  <circle cx="115" cy="75" r="6" fill="white"/>
  <circle cx="86" cy="76" r="3" fill="#2E7D32"/>
  <circle cx="116" cy="76" r="3" fill="#2E7D32"/>
  <path d="M85 95 Q100 107 115 95" stroke="#2E7D32" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <rect x="88" y="45" width="24" height="8" rx="4" fill="#4CAF50"/>
  <line x1="100" y1="45" x2="100" y2="38" stroke="#4CAF50" stroke-width="2"/>
</svg>`,
  });
  if (npcErr) throw new Error('NPC: ' + npcErr.message);
  console.log('✅ NPC Avatar created');

  // ── 4. Path ──────────────────────────────────────────────────────────────────
  const { data: path, error: pathErr } = await supabase
    .from('paths')
    .insert({ seed_id: seed.id, total_days: 5, created_by: ADMIN_USER_ID })
    .select()
    .single();
  if (pathErr) throw new Error('Path: ' + pathErr.message);
  console.log('✅ Path:', path.id);

  // ── 5. Days ──────────────────────────────────────────────────────────────────
  const days = [
    {
      day_number: 1,
      title: 'ลองเป็นผู้ใช้ก่อน แล้วค่อยเป็นวิศวกร',
      context_text:
        'วิศวกรชีวการแพทย์ที่ดีเริ่มจากการเข้าใจผู้ป่วยจริงๆ — ไม่ใช่จากตำรา วันนี้คุณจะใช้ร่างกายตัวเองเป็นเครื่องมือทดสอบ',
      reflection_prompts: [
        'กิจกรรมไหนที่ทำได้ยากที่สุดตอนผูกมือ?',
        'ปัญหาที่คุณเลือกสำคัญแค่ไหนสำหรับคนที่เจอมันทุกวัน?',
      ],
    },
    {
      day_number: 2,
      title: 'สร้างจากของบนโต๊ะ',
      context_text:
        'วิศวกรชีวการแพทย์ต้องสร้างได้จากข้อจำกัดจริง — ไม่มีงบมากมาย ไม่มีวัสดุพิเศษ มีแค่ความเข้าใจปัญหาและมือสองข้าง',
      reflection_prompts: [
        'ไอเดียแรกของคุณต้องเปลี่ยนอะไรบ้างหลังทดสอบ?',
        'ส่วนไหนของ prototype ที่คุณภูมิใจที่สุด และทำไม?',
      ],
    },
    {
      day_number: 3,
      title: 'มีคนบอกว่า design ของคุณพัง',
      context_text:
        'ทุก design มีจุดอ่อน — คนที่เก่งไม่ใช่คนที่ design ดีตั้งแต่แรก แต่คือคนที่รับ feedback แล้วแก้ได้เร็วที่สุด',
      reflection_prompts: [
        'Feedback ข้อไหนที่ทำให้คุณเซอร์ไพรส์มากที่สุด?',
        'คุณเลือกแก้หรือ defend? และทำไม?',
      ],
    },
    {
      day_number: 4,
      title: 'อธิบายให้คนที่ไม่รู้เรื่องเข้าใจ',
      context_text:
        'วิศวกรที่สร้างของดีแต่อธิบายไม่ได้ = ของนั้นไม่ถูกใช้ วันนี้คุณจะฝึก "ขาย" idea โดยไม่ใช้ภาษาวิศวกร',
      reflection_prompts: [
        'คำถามไหนที่ตอบยากที่สุด และทำไมคุณไม่รู้คำตอบ?',
        'ถ้าทำอีกครั้ง คุณจะเตรียม pitch ต่างออกไปยังไง?',
      ],
    },
    {
      day_number: 5,
      title: 'เขียน 1 หน้า ให้คนอื่น build ต่อได้',
      context_text:
        'Document ที่ดีคือมรดกของวิศวกร ถ้าคุณหายไปพรุ่งนี้ คนอื่นต้อง build งานของคุณต่อได้จากสิ่งที่คุณเขียนวันนี้',
      reflection_prompts: [
        'หลัง 5 วันนี้ คุณรู้สึกอยากทำงานแบบนี้ไปอีก 5 ปีไหม?',
        'อะไรที่คุณไม่รู้เกี่ยวกับวิศวะการแพทย์ แล้วอยากรู้เพิ่ม?',
        'ถ้าให้บอกเพื่อนว่างานนี้เป็นยังไง จะบอกว่าอะไร?',
      ],
    },
  ];

  const dayRecords = [];
  for (const d of days) {
    const { data: day, error: dayErr } = await supabase
      .from('path_days')
      .insert({
        path_id: path.id,
        day_number: d.day_number,
        title: d.title,
        context_text: d.context_text,
        reflection_prompts: d.reflection_prompts,
        node_ids: [],
        migrated_from_nodes: true,
      })
      .select()
      .single();
    if (dayErr) throw new Error(`Day ${d.day_number}: ` + dayErr.message);
    dayRecords.push(day);
    console.log(`✅ Day ${d.day_number}:`, day.id);
  }

  // ── 6. Activities, Content & Assessments ─────────────────────────────────────
  const activitiesData = [
    // ── Day 1 ──
    {
      dayIndex: 0,
      activities: [
        {
          title: 'ผูกมือแล้วลอง 5 อย่าง',
          instructions:
            'ผูกมือข้างที่ถนัดด้วยเชือกหรือผ้า ให้ขยับได้น้อยมาก แล้วลองทำ 5 อย่างนี้: (1) เปิดขวดน้ำ, (2) เขียนชื่อตัวเอง, (3) กดโทรศัพท์ปลดล็อค, (4) ติดกระดุมหรือรูดซิป, (5) ฉีกซองขนม บันทึกในตาราง: กิจกรรม | ปัญหาที่เจอ | ระดับความยาก 1-5',
          display_order: 0,
          estimated_minutes: 20,
          content_type: 'text',
          content_body:
            '## คู่มือ Day 1: ลองเป็นผู้ใช้\n\n**สิ่งที่ต้องใช้:** เชือกหรือผ้า 1 ผืน, กระดาษ, ปากกา\n\n**ขั้นตอน:**\n1. ผูกมือข้างถนัดให้ขยับได้น้อย (ไม่ต้องแน่นจนปวด)\n2. ทำ 5 กิจกรรมด้านล่าง **ห้ามเอาเชือกออกระหว่างทำ**\n3. บันทึกในตาราง\n\n**5 กิจกรรม:**\n- เปิดขวดน้ำ\n- เขียนชื่อตัวเอง\n- กดโทรศัพท์ปลดล็อค\n- ติดกระดุมหรือรูดซิป\n- ฉีกซองขนม\n\n**ตารางบันทึก:**\n| กิจกรรม | ปัญหาที่เจอ | ระดับความยาก (1-5) |\n|---------|------------|-------------------|\n| เปิดขวดน้ำ | | |\n| เขียนชื่อ | | |\n| กดโทรศัพท์ | | |\n| ติดกระดุม/ซิป | | |\n| ฉีกซอง | | |',
          assessment_type: 'image_upload',
          assessment_metadata: {
            instructions: 'ถ่ายรูปตารางบันทึกที่กรอกครบแล้ว',
          },
        },
        {
          title: 'เลือก 1 ปัญหา เขียน 1 ประโยค',
          instructions:
            'จาก 5 กิจกรรม เลือกปัญหาที่รู้สึกว่า "ถ้าแก้ได้จะเปลี่ยนชีวิตคนได้จริง" แล้วเขียน 1 ประโยค: "คนที่มีปัญหานี้คือ ___ และเขาอยากทำ ___ แต่ทำไม่ได้เพราะ ___"',
          display_order: 1,
          estimated_minutes: 10,
          content_type: 'text',
          content_body:
            '## เลือกปัญหาที่ใช่\n\nมองดูตารางที่กรอกมา แล้วถามตัวเองว่า:\n- ปัญหาไหนที่ดู "เล็กน้อย" แต่จริงๆ กวนชีวิตมาก?\n- ถ้ามีคนเจอปัญหานี้ทุกวัน (เช่น คนมือสั่น ผู้สูงอายุ คนแขนขาด) มันหนักแค่ไหน?\n\n**เขียนประโยคนี้:**\n> "คนที่มีปัญหานี้คือ ___ และเขาอยากทำ ___ แต่ทำไม่ได้เพราะ ___"',
          assessment_type: 'text_answer',
          assessment_metadata: {
            submission_label: 'ประโยค Problem Statement',
            min_words: 10,
            rubric: 'ระบุให้ชัดว่าใคร อยากทำอะไร และติดขัดตรงไหน',
          },
        },
      ],
    },
    // ── Day 2 ──
    {
      dayIndex: 1,
      activities: [
        {
          title: 'สร้าง Prototype จากของบนโต๊ะ',
          instructions:
            'ใช้ปัญหาจาก Day 1 — สร้าง prototype ที่ช่วยแก้ปัญหานั้น จากวัสดุที่หาได้: กระดาษแข็ง, เทป, ยางรัด, ฟองน้ำ, ไม้ไอศกรีม, ดินน้ำมัน ห้ามใช้ไฟฟ้า/battery/กาวร้อน ทดสอบกับตัวเองโดยยังผูกมือข้างถนัดอยู่ แก้ไข 1 รอบหลังทดสอบ',
          display_order: 0,
          estimated_minutes: 40,
          content_type: 'text',
          content_body:
            '## คู่มือ Day 2: Build It\n\n**วัสดุที่ใช้ได้:**\n- กระดาษแข็ง / ลัง\n- เทปกาว / เทปผ้า\n- ยางรัดของ\n- ฟองน้ำ\n- ไม้ไอศกรีม\n- ดินน้ำมัน\n- ด้าย / เชือก\n\n**ข้อห้าม:** ไฟฟ้า, battery, กาวร้อน\n\n**ขั้นตอน:**\n1. ดูปัญหาที่เลือกไว้จาก Day 1\n2. Sketch ไอเดียคร่าวๆ ก่อน (แค่ 5 นาที อย่าคิดนาน)\n3. Build เลย — ห้ามรอให้ perfect\n4. ผูกมือข้างถนัดแล้วทดสอบกับตัวเอง\n5. บันทึก: "อะไรทำงานได้ อะไรทำงานไม่ได้"\n6. แก้ไข 1 จุดที่แย่ที่สุด\n7. ถ่ายรูปก่อนและหลังแก้ไข',
          assessment_type: 'image_upload',
          assessment_metadata: {
            instructions: 'ถ่ายรูป prototype ที่สร้างเสร็จแล้ว (รูปเดียวหรือหลายมุม)',
          },
        },
        {
          title: 'อธิบาย prototype ใน 3 bullet',
          instructions:
            'เขียน 3 bullet สั้นๆ: (1) มันทำอะไร, (2) ทำงานยังไง, (3) แก้ปัญหาอะไรของใคร',
          display_order: 1,
          estimated_minutes: 10,
          content_type: 'text',
          content_body:
            '## เขียนสรุป Prototype\n\nเขียนให้ชัดแบบนี้:\n\n**ตัวอย่าง:**\n- มันทำอะไร: "ช้อนที่มีด้ามหนาและมีน้ำหนักถ่วง"\n- ทำงานยังไง: "น้ำหนัก 150g ต้านทาน tremor ทำให้ช้อนนิ่งขึ้น"\n- แก้ปัญหาของใคร: "คนที่มีอาการมือสั่น กินข้าวได้ยาก"',
          assessment_type: 'text_answer',
          assessment_metadata: {
            submission_label: 'คำอธิบาย Prototype',
            rubric: 'ต้องมีครบ 3 ข้อ ชัดเจน ไม่ต้องยาว',
          },
        },
      ],
    },
    // ── Day 3 ──
    {
      dayIndex: 2,
      activities: [
        {
          title: 'แลก Prototype รับ Feedback',
          instructions:
            'ส่ง prototype ให้เพื่อน 1 คน ให้เพื่อนผูกมือข้างถนัด แล้วทดสอบ 5 นาที เพื่อนต้องหา 3 จุดที่ใช้ไม่ได้หรือไม่สะดวก คุณฟังโดยไม่แก้ตัว บันทึก feedback ทุกข้อ',
          display_order: 0,
          estimated_minutes: 20,
          content_type: 'text',
          content_body:
            '## คู่มือ Day 3: Feedback Session\n\n**กฎของ feedback giver (เพื่อน):**\n- ผูกมือข้างถนัดแล้วทดสอบ prototype 5 นาที\n- ต้องหา 3 จุดที่ใช้ไม่ได้หรือไม่สะดวก (ไม่ใช่แค่ "ดีนะ")\n- พูดตรงๆ เหมือนคุณเป็นผู้ป่วยจริง\n\n**กฎของคุณ (designer):**\n- ห้ามแก้ตัวหรืออธิบายขณะที่เพื่อนพูด\n- จด feedback ทุกข้อลงกระดาษ\n- พูดได้แค่ "ขอบคุณ" และถามคำถาม clarify\n\n**Feedback checklist สำหรับเพื่อน:**\n- [ ] จับถนัดไหม?\n- [ ] ขนาดเหมาะมือไหม?\n- [ ] หลุด / พัง / ล้มได้ง่ายไหม?\n- [ ] ถ้าใช้ทุกวัน 6 เดือน ยังอยากใช้อยู่ไหม?',
          assessment_type: 'text_answer',
          assessment_metadata: {
            submission_label: 'Feedback ที่ได้รับ + การตัดสินใจ',
            rubric:
              'บอก 3 feedback ที่ได้, บอกว่าเลือกแก้หรือ defend, และเหตุผลที่เลือกแบบนั้น',
          },
        },
        {
          title: 'แก้หรือ Defend — แล้วถ่ายรูปผล',
          instructions:
            'ตัดสินใจ: แก้ 1 จุดจาก feedback (มีเวลา 15 นาที ไม่มีของเพิ่ม) หรือเลือก defend ว่าทำไมถึงไม่แก้ แล้วถ่ายรูป prototype เวอร์ชั่นสุดท้าย',
          display_order: 1,
          estimated_minutes: 20,
          content_type: 'text',
          content_body:
            '## แก้หรือ Defend?\n\n**ถ้าเลือกแก้:**\n- เวลา 15 นาที ของเดิม ไม่มีวัสดุเพิ่ม\n- แก้ได้แค่ 1 จุด — เลือกจุดที่สำคัญที่สุด\n- ถ่ายรูปหลังแก้\n\n**ถ้าเลือก defend:**\n- เขียนเหตุผล 2-3 ประโยคว่าทำไม feedback นั้นไม่ valid\n- ต้องมีเหตุผลที่ defend ได้ ไม่ใช่แค่ "ไม่อยากแก้"\n\n**ทุกคนต้องทำ:** ถ่ายรูป prototype เวอร์ชั่นสุดท้ายของวันนี้',
          assessment_type: 'image_upload',
          assessment_metadata: {
            instructions: 'ถ่ายรูป prototype เวอร์ชั่นสุดท้ายหลัง feedback session',
          },
        },
      ],
    },
    // ── Day 4 ──
    {
      dayIndex: 3,
      activities: [
        {
          title: 'เตรียม Pitch 3 นาที',
          instructions:
            'เตรียม pitch สั้น 3 นาทีสำหรับ "ครอบครัวของผู้ป่วย" ใช้ของจริงประกอบ ห้ามใช้ภาษาวิศวกรรม เตรียมตอบ 3 คำถามนี้: (1) ถ้าหักหรือพังจะอันตรายไหม? (2) ราคาเท่าไหร่ คุ้มไหม? (3) ทดสอบกับคนจริงแล้วหรือยัง?',
          display_order: 0,
          estimated_minutes: 15,
          content_type: 'text',
          content_body:
            '## คู่มือ Day 4: Pitch ให้ครอบครัวผู้ป่วย\n\n**เป้าหมาย:** ครอบครัวผู้ป่วยที่ไม่รู้เรื่องวิศวกรรม ต้องเข้าใจและรู้สึกว่า "น่าเชื่อถือ"\n\n**Structure Pitch 3 นาที:**\n1. ปัญหา: "พ่อของคุณมีปัญหา..." (30 วินาที)\n2. Solution: "เราสร้างสิ่งนี้..." (1 นาที — ใช้ของจริง)\n3. ทำไมมันปลอดภัย: (1 นาที)\n4. ขั้นตอนต่อไป: (30 วินาที)\n\n**ห้ามพูดคำเหล่านี้:**\n- torque, tensile, prototype, iteration, ergonomic\n- แทนด้วยภาษาปกติ\n\n**3 คำถามที่จะถูกถาม (เตรียมไว้ก่อน):**\n- "ถ้าหักหรือพังจะเป็นอันตรายไหม?"\n- "ราคาเท่าไหร่ คุ้มไหม?"\n- "ทดสอบกับคนจริงแล้วหรือยัง?"',
          assessment_type: null,
        },
        {
          title: 'Pitch แล้วบันทึกบทเรียน',
          instructions:
            'Pitch ให้เพื่อนหรือ facilitator ฟัง ห้ามบอกว่า "ยังไม่ได้คิด" — ต้องตอบทุกข้อแม้จะเป็นการเดา หลัง pitch ให้ผู้ฟัง vote: ซื้อ / ไม่ซื้อ / อยากแก้ก่อน จดบันทึก: คำถามไหนที่ตอบไม่ได้ และสิ่งที่วิศวกรต้องรู้ก่อน build',
          display_order: 1,
          estimated_minutes: 25,
          content_type: 'text',
          content_body:
            '## หลัง Pitch\n\nหลังจาก pitch เสร็จ:\n\n**ผู้ฟัง vote (ใช้กระดาษเขียน):**\n- ✅ ซื้อ / ใช้เลย\n- ❌ ไม่ซื้อ เพราะ...\n- 🔄 อยากแก้ก่อน เรื่อง...\n\n**คุณต้องบันทึก:**\n- คำถามที่ตอบไม่ได้ (ซื่อสัตย์กับตัวเอง)\n- สิ่งที่รู้ว่าต้องรู้ก่อน build ครั้งหน้า',
          assessment_type: 'text_answer',
          assessment_metadata: {
            submission_label: '3 สิ่งที่วิศวกรต้องรู้ก่อน Build',
            rubric: 'เขียนจาก experience ของวันนี้จริงๆ ไม่ใช่คาดเดา',
          },
        },
      ],
    },
    // ── Day 5 ──
    {
      dayIndex: 4,
      activities: [
        {
          title: 'กรอก Device Summary Sheet',
          instructions:
            'กรอก template ด้านล่างให้ครบ ทุกช่องต้องกรอก ไม่มีช่องว่าง แล้วให้เพื่อนที่ไม่เคยเห็น prototype อ่านแล้วลองสร้าง — ถ้าสิ่งที่เพื่อนสร้างไม่ตรง ให้แก้ sheet ใหม่',
          display_order: 0,
          estimated_minutes: 30,
          content_type: 'text',
          content_body:
            '## Device Summary Sheet Template\n\nกรอกให้ครบทุกข้อ — ถ้าเพื่อนอ่านแล้วสร้างได้โดยไม่ต้องถาม แสดงว่า sheet คุณดี\n\n---\n\n**ชื่ออุปกรณ์:**\n\n**ผู้ใช้เป้าหมาย:** (ระบุให้ชัด เช่น "ผู้สูงอายุอายุ 65+ ที่มีอาการมือสั่น")\n\n**ปัญหาที่แก้:** (1-2 ประโยค)\n\n**วิธีใช้งาน:**\n1.\n2.\n3.\n\n**วัสดุที่ใช้:** (ระบุแต่ละชิ้น)\n\n**ขนาดโดยประมาณ:**\n\n**สิ่งที่ยังไม่ได้แก้ / จุดอ่อนที่รู้อยู่:**\n\n**ถ้ามีเวลาอีก 1 สัปดาห์ จะปรับอะไร:**\n\n---\n\n**ขั้นตอนต่อไป:**\nให้เพื่อนที่ไม่เคยเห็น prototype อ่าน sheet นี้แล้วลองสร้าง 10 นาที\nถ้าสิ่งที่เพื่อนสร้างไม่ตรงกับที่คุณคิด → แก้ sheet ใหม่',
          assessment_type: 'text_answer',
          assessment_metadata: {
            submission_label: 'Device Summary Sheet (ฉบับสมบูรณ์)',
            rubric:
              'ครบทุกช่อง, คนอื่นอ่านแล้วเข้าใจได้โดยไม่ต้องอธิบายเพิ่ม',
          },
        },
        {
          title: 'สะท้อนตัวเอง: งานนี้ใช่คุณไหม?',
          instructions:
            'ตอบคำถามส่วนตัว — ไม่ต้องแชร์กับใครถ้าไม่อยากแชร์ ตอบตามที่รู้สึกจริง ไม่มีคำตอบที่ถูกหรือผิด',
          display_order: 1,
          estimated_minutes: 10,
          content_type: 'text',
          content_body:
            '## สะท้อนตัวเอง\n\nตอบคำถามเหล่านี้ตามที่รู้สึกจริง:\n\n1. **ช่วง 5 วันที่ผ่านมา มีช่วงไหนที่รู้สึก "in the zone" บ้าง?**\n\n2. **ช่วงไหนที่รู้สึกน่าเบื่อหรืออยากหนี?**\n\n3. **ถ้าต้องทำงานแบบนี้ทุกวัน 5 ปี รู้สึกยังไง?**\n   - ตื่นเต้นและอยากลอง\n   - โอเค พอทนได้\n   - ไม่เอา มีงานอื่นที่น่าสนใจกว่า\n\n4. **คนที่เหมาะกับงานนี้ควรจะเป็นยังไง?** (จากที่คุณได้เรียนรู้ ไม่ใช่จาก Google)',
          assessment_type: 'text_answer',
          assessment_metadata: {
            submission_label: 'การสะท้อนตัวเอง',
            rubric:
              'ตอบตามที่รู้สึกจริง ไม่ต้องสวยหรู ตอบสั้นก็ได้ถ้ามันตรงกับที่รู้สึก',
          },
        },
      ],
    },
  ];

  // Insert all activities
  for (const dayData of activitiesData) {
    const dayRecord = dayRecords[dayData.dayIndex];
    for (const act of dayData.activities) {
      const { data: activity, error: actErr } = await supabase
        .from('path_activities')
        .insert({
          path_day_id: dayRecord.id,
          title: act.title,
          instructions: act.instructions,
          display_order: act.display_order,
          estimated_minutes: act.estimated_minutes,
          is_required: true,
          is_draft: false,
        })
        .select()
        .single();
      if (actErr) throw new Error(`Activity "${act.title}": ` + actErr.message);

      // Content
      const { error: contentErr } = await supabase.from('path_content').insert({
        activity_id: activity.id,
        content_type: act.content_type,
        content_body: act.content_body,
        display_order: 0,
        metadata: {},
      });
      if (contentErr) throw new Error(`Content for "${act.title}": ` + contentErr.message);

      // Assessment (optional)
      if (act.assessment_type) {
        const { error: assessErr } = await supabase.from('path_assessments').insert({
          activity_id: activity.id,
          assessment_type: act.assessment_type,
          is_graded: false,
          metadata: act.assessment_metadata || {},
        });
        if (assessErr)
          throw new Error(`Assessment for "${act.title}": ` + assessErr.message);
      }

      console.log(`   ✅ Activity: ${act.title}`);
    }
  }

  console.log('\n🎉 Done! PathLab created successfully.');
  console.log('─────────────────────────────────────────');
  console.log('Seed ID:  ', seed.id);
  console.log('Path ID:  ', path.id);
  console.log('Visibility: hidden (set to visible when ready)');
  console.log('\nTo publish:\n  Update seeds.visibility to "visible" where id =', seed.id);
}

seed().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
