export interface WrappedPrompt {
  id: string;
  type: "slider" | "multi-select" | "drag-rank" | "text";
  question: { en: string; th: string };
  axis?: string;
  secondaryAxis?: string;
  min?: number;
  max?: number;
  labels?: {
    en: { left: string; right: string };
    th: { left: string; right: string };
  };
  options?: Array<{
    en: string;
    th: string;
    sq: number;
    mm: number;
  }>;
  pickCount?: number;
  items?: Array<{ en: string; th: string; pr: number; mm?: number; sb?: number }>;
  optional?: boolean;
  bgmPrompt?: string | null;
  maxLength?: number;
}

export const p3Options: Array<{ en: string; th: string; sq: number; mm: number }> = [
  {
    en: "I connected the dots on the system map",
    th: "ฉันเป็นคนเชื่อมโยงจุดต่างๆ บนแผนผังระบบ",
    sq: 0,
    mm: 0.40,
  },
  {
    en: "I locked in and processed the evidence alone",
    th: "ฉันขอเวลาปลีกตัวไปจัดการกับข้อมูลเงียบๆ คนเดียว",
    sq: -0.50,
    mm: 0,
  },
  {
    en: "I asked the hard questions during interviews",
    th: "ฉันเป็นคนยิงคำถามยากๆ ตอนสัมภาษณ์",
    sq: 0.10,
    mm: -0.40,
  },
  {
    en: "I kept everyone aligned on our Decision",
    th: "ฉันคอยดึงให้ทุกคนเห็นตรงกันตอนต้องตัดสินใจ",
    sq: 0.50,
    mm: 0,
  },
  {
    en: "I disappeared into the raw notes and came back with insights",
    th: "ฉันจมไปกับกองข้อมูลดิบ แล้วกลับมาพร้อมบทสรุป",
    sq: -0.40,
    mm: -0.20,
  },
  {
    en: "I zoomed us out when we got stuck in the weeds",
    th: "ฉันดึงทีมให้ถอยมามองภาพกว้างตอนที่เราหลงทาง",
    sq: 0.20,
    mm: 0.30,
  },
];

export const prompts: WrappedPrompt[] = [
  {
    id: "p1",
    type: "slider",
    question: {
      en: "In Phase 1, where did your brain naturally focus?",
      th: "ใน Phase 1 สมองของคุณมักจะโฟกัสไปที่จุดไหน?",
    },
    axis: "MM",
    min: 0,
    max: 4,
    labels: {
      en: {
        left: "Individual human stories and quotes",
        right: "The big picture and system loops",
      },
      th: {
        left: "เรื่องราวและคำพูดของคนแต่ละคน",
        right: "ภาพรวมและวงจรของระบบ",
      },
    },
    bgmPrompt:
      "mmx music generate: Curious minimal synthwave with clean stabs, rhythmic sequencers, glitchy micro-percussion, glassy bells, and steady bass pulse. Investigative and cerebral mood. 105 BPM. Bioluminescent theme.",
  },
  {
    id: "p2",
    type: "slider",
    question: {
      en: "At the final Decision Gate, how did you feel about the problem?",
      th: "ที่จุดตัดสินใจสุดท้าย คุณรู้สึกยังไงกับปัญหาที่เลือกมา?",
    },
    axis: "SB",
    min: 0,
    max: 4,
    labels: {
      en: {
        left: "Looking for reasons to Pivot or Kill",
        right: "Convinced we needed to Proceed",
      },
      th: {
        left: "มองหาเหตุผลที่จะเปลี่ยนทิศหรือล้มเลิก",
        right: "เชื่อมั่นเต็มที่ว่าต้องลุยต่อ",
      },
    },
    bgmPrompt:
      "mmx music generate: Emotional cinematic ambient with vulnerable piano chords, evolving lush pads, haunting strings, gentle delay effects. Shifting between doubt and belief. 80 BPM. Bioluminescent theme.",
  },
  {
    id: "p3",
    type: "multi-select",
    question: {
      en: "What role did you naturally play on the team? (pick any that ring true)",
      th: "คุณมักจะเล่นบทบาทไหนในทีม?",
    },
    axis: "SQ",
    secondaryAxis: "MM",
    options: p3Options,
    bgmPrompt:
      "mmx music generate: Contrast electronic with dual-layered beats mixing organic and electronic drums, bright synth leads contrasted against ambient introspective undertones, pulsing bass. Solo vs squad duality. 100-128 BPM variable. Bioluminescent theme.",
  },
  {
    id: "p4",
    type: "drag-rank",
    question: {
      en: "Pick the three Phase 1 moments that meant the most to you. Drag them in order.",
      th: "เลือก 3 ช่วงเวลาจาก Phase 1 ที่มีความหมายกับคุณที่สุด ลากเรียงลำดับเลย",
    },
    axis: "PR",
    pickCount: 3,
    items: [
      { en: "The interview that completely flipped our assumptions", th: "บทสัมภาษณ์ที่พลิกความคิดเราไปเลย", pr: -0.20, mm: -0.30 },
      { en: "The moment the system map finally clicked", th: "วินาทีที่แผนผังระบบทุกอย่างลงล็อค", pr: -0.10, mm: 0.40 },
      { en: "Debating the Proceed/Pivot/Kill decision", th: "ตอนถกเถียงกันว่าจะ ลุยต่อ พลิกทิศ หรือ ล้มเลิก", pr: 0.30, sb: -0.10 },
      { en: "Realizing our first problem statement was wrong", th: "ตอนที่รู้ตัวว่าปัญหาแรกที่เราตั้งไว้มันผิด", pr: 0.40, sb: -0.20 },
      { en: "Sitting in the mess of data before it made sense", th: "ช่วงที่จมอยู่กับกองข้อมูลที่ดูไม่ปะติดปะต่อ", pr: -0.40 },
      { en: "Catching a recurring pattern in the evidence", th: "ตอนที่เริ่มเห็นรูปแบบซ้ำๆ จากหลักฐาน", pr: -0.20 },
    ],
    bgmPrompt:
      "mmx music generate: Nostalgic dream pop with warm pads, wistful chord progressions, soft strings, reverbed guitars, building percussion, emotional risers. Reflective and building. 95 BPM. Bioluminescent theme.",
  },
  {
    id: "p5",
    type: "text",
    question: {
      en: "What's one piece of evidence that surprised you?",
      th: "มีหลักฐานหรือข้อมูลไหนที่ทำให้คุณประหลาดใจที่สุด?",
    },
    optional: true,
    bgmPrompt: null,
  },
  {
    id: "p6",
    type: "text",
    question: {
      en: "If your Phase 1 had a one-line title, what would it be?",
      th: "ถ้า Phase 1 ของคุณเป็นชื่อหนังสือหนึ่งบรรทัด มันจะชื่อว่าอะไร?",
    },
    optional: true,
    maxLength: 80,
    bgmPrompt: null,
  },
];
