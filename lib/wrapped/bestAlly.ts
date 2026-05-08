/**
 * Best-Ally lookup table from the v2 spec.
 * Each archetype has a curated partner archetype and a line (EN+TH)
 * explaining why they amplify each other.
 */

import type { ArchetypeId } from "./archetypes";

export interface BestAllyEntry {
  allyArchetypeId: ArchetypeId;
  line: { en: string; th: string };
}

export const bestAllyTable: Record<ArchetypeId, BestAllyEntry> = {
  "the-empath": {
    allyArchetypeId: "the-architect",
    line: {
      en: "You feel one person's truth; an Architect turns it into a system the whole team can see.",
      th: "คุณรู้สึกถึงความจริงของคนหนึ่งคน สถาปนิกจะเปลี่ยนมันเป็นระบบที่ทุกคนมองเห็น",
    },
  },
  "the-advocate": {
    allyArchetypeId: "the-auditor",
    line: {
      en: "You push to ship; an Auditor hands you better evidence to win the argument.",
      th: "คุณดันให้ลุย ผู้ตรวจสอบระบบจะมอบหลักฐานที่ดีกว่าให้คุณใช้ชนะการถกเถียง",
    },
  },
  "the-interrogator": {
    allyArchetypeId: "the-synthesizer",
    line: {
      en: "You crack the story open; a Synthesizer puts it back together cleaner than before.",
      th: "คุณเปิดเรื่องราวให้แตก นักประมวลผลจะประกอบมันกลับมาให้สะอาดขึ้น",
    },
  },
  "the-mythbuster": {
    allyArchetypeId: "the-empath",
    line: {
      en: "You prove what's false; an Empath shows you the story behind why people believed it.",
      th: "คุณพิสูจน์สิ่งที่ปลอม ผู้เข้าอกเข้าใจจะแสดงให้เห็นว่าทำไมคนถึงเชื่อมัน",
    },
  },
  "the-architect": {
    allyArchetypeId: "the-empath",
    line: {
      en: "You see the whole map; an Empath keeps a real person on every node of it.",
      th: "คุณเห็นแผนผังทั้งหมด ผู้เข้าอกเข้าใจจะคอยมีคนจริงๆ ประจำทุกจุด",
    },
  },
  "the-synthesizer": {
    allyArchetypeId: "the-interrogator",
    line: {
      en: "You connect the pattern; an Interrogator asks if the pattern is actually real.",
      th: "คุณเชื่อมโยงรูปแบบ นักซักไซ้จะถามว่ารูปแบบนั้นจริงหรือเปล่า",
    },
  },
  "the-auditor": {
    allyArchetypeId: "the-advocate",
    line: {
      en: "You see what's broken; an Advocate has the energy to push the fix through.",
      th: "คุณเห็นสิ่งที่พัง ผู้พิทักษ์มีพลังที่จะดันการแก้ไขให้เกิดจริง",
    },
  },
  "the-pivot-forcer": {
    allyArchetypeId: "the-architect",
    line: {
      en: "You know when to turn; an Architect tells you which part of the map to keep.",
      th: "คุณรู้ว่าเมื่อไหร่ควรหัก สถาปนิกจะบอกว่าส่วนไหนของแผนผังควรเก็บไว้",
    },
  },
  wanderer: {
    allyArchetypeId: "the-synthesizer",
    line: {
      en: "You're still exploring — a Synthesizer can help you find the pattern in your curiosity.",
      th: "คุณยังคงสำรวจอยู่ — นักประมวลผลจะช่วยคุณหารูปแบบในความอยากรู้อยากเห็น",
    },
  },
};

/**
 * Get the best ally entry for a given archetype ID.
 */
export function getBestAlly(archetypeId: ArchetypeId): BestAllyEntry {
  return bestAllyTable[archetypeId] ?? bestAllyTable["wanderer"];
}
