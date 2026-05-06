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
    eb: number;
  }>;
  pickCount?: number;
  items?: Array<{ en: string; th: string }>;
  optional?: boolean;
  bgmPrompt?: string | null;
}

export const p3Options: Array<{ en: string; th: string; sq: number; eb: number }> = [
  {
    en: "I drove the team's plan for the day",
    th: "ผลักดันแผนของทีมให้ไปข้างหน้า",
    sq: 0.4,
    eb: 0,
  },
  {
    en: "I worked best alone in the zone",
    th: "ทำงานคนเดียวโฟลวสุดๆ",
    sq: -0.5,
    eb: 0.1,
  },
  {
    en: "I asked the questions no one else was asking",
    th: "ถามคำถามที่ไม่มีใครกล้าถาม",
    sq: 0.1,
    eb: -0.2,
  },
  {
    en: "I made the thing while we figured out the rest",
    th: "ลงมือทำจริงจนเกิดของ",
    sq: -0.2,
    eb: 0.3,
  },
  {
    en: "I kept the team on the same page",
    th: "เป็นสะพานเชื่อมให้ทีมไม่แตกกระจาย",
    sq: 0.5,
    eb: 0,
  },
  {
    en: "I disappeared and came back with stuff",
    th: "หายไปแล้วกลับมาพร้อมของในมือ",
    sq: -0.4,
    eb: 0.2,
  },
  {
    en: "I followed someone else's lead",
    th: "ตามใครสักคนที่เชื่อว่าเขาจะพาไปถูกทาง",
    sq: 0.2,
    eb: 0,
  },
  {
    en: "I sat with the problem more than I made anything",
    th: "นั่งกับปัญหาจนกว่าจะเจอคำตอบ",
    sq: -0.1,
    eb: -0.3,
  },
];

export const prompts: WrappedPrompt[] = [
  {
    id: "p1",
    type: "slider",
    question: {
      en: "In Phase 1, where did your hours actually go?",
      th: "ในPhase 1 คุณใช้เวลาไปกับอะไร?",
    },
    axis: "EB",
    min: 0,
    max: 4,
    labels: {
      en: {
        left: "Mostly talking to people",
        right: "Mostly making things",
      },
      th: {
        left: "คุยกับใครสักคน",
        right: "ส่วนใหญ่ลงมือทำ",
      },
    },
    bgmPrompt:
      "mmx music generate: Curious minimal synthwave with clean stabs, rhythmic sequencers, glitchy micro-percussion, glassy bells, and steady bass pulse. Investigative and cerebral mood. 105 BPM. Bioluminescent theme.",
  },
  {
    id: "p2",
    type: "slider",
    question: {
      en: "How did you feel about your team's idea by the end of Phase 1?",
      th: "พอจบ Phase 1 แล้ว คุณมองไอเดียของทีมยังไง?",
    },
    axis: "SB",
    min: 0,
    max: 4,
    labels: {
      en: {
        left: "I kept poking holes in it",
        right: "Believed in it from day 1",
      },
      th: {
        left: "ยังคงหาจุดบอดของมันอยู่เรื่อยๆ",
        right: "เชื่อมั่นมาตั้งแต่วันแรก",
      },
    },
    bgmPrompt:
      "mmx music generate: Emotional cinematic ambient with vulnerable piano chords, evolving lush pads, haunting strings, gentle delay effects. Shifting between doubt and belief. 80 BPM. Bioluminescent theme.",
  },
  {
    id: "p3",
    type: "multi-select",
    question: {
      en: "What did you lean into most? (pick any that ring true)",
      th: "คุณเล่นบทอะไรใน Phase 1?",
    },
    axis: "SQ",
    secondaryAxis: "EB",
    options: p3Options,
    bgmPrompt:
      "mmx music generate: Contrast electronic with dual-layered beats mixing organic and electronic drums, bright synth leads contrasted against ambient introspective undertones, pulsing bass. Solo vs squad duality. 100-128 BPM variable. Bioluminescent theme.",
  },
  {
    id: "p4",
    type: "drag-rank",
    question: {
      en: "Pick the three Phase 1 moments that meant the most to you. Drag them in order.",
      th: "เลือก 3 ช่วงเวลาจาก Phase 1 ที่คุณจะเก็บไว้ในใจ ลากเรียงลำดับความสำคัญให้หน่อย",
    },
    axis: "PR",
    pickCount: 3,
    items: [
      { en: "The first time the team agreed on something", th: "ครั้งแรกที่ทีมเห็นด้วยกันเรื่องบางอย่าง" },
      { en: "When you finally made the thing work", th: "ตอนที่คุณทำให้มันเวิร์กสักที" },
      { en: "A conversation that changed your mind", th: "บทสนทนาที่เปลี่ยนความคิดคุณ" },
      { en: "The moment you realized the idea was wrong", th: "ตอนที่รู้ว่าไอเดียมันผิด" },
      { en: "When someone helped you unstuck", th: "ตอนที่มีคนช่วยให้คุณผ่านติดขัด" },
      { en: "The late-night push before deadline", th: "การเร่งงานกลางดึกก่อนเดดไลน์" },
    ],
    bgmPrompt:
      "mmx music generate: Nostalgic dream pop with warm pads, wistful chord progressions, soft strings, reverbed guitars, building percussion, emotional risers. Reflective and building. 95 BPM. Bioluminescent theme.",
  },
  {
    id: "p5",
    type: "text",
    question: {
      en: "What's one thing about Phase 1 that surprised you?",
      th: "อะไรใน Phase 1 ที่ทำให้คุณเซอไพรซ์?",
    },
    optional: true,
    bgmPrompt: null,
  },
];
