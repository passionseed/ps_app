export interface Phase2Hint {
  superpower: { en: string; th: string };
  growthEdge: { en: string; th: string };
}

import type { ArchetypeId } from "./archetypes";

export const phase2Hints: Record<ArchetypeId, Phase2Hint> = {
  "the-empath": {
    superpower: {
      en: "Your superpower is feeling what a user needs.",
      th: "พลังวิเศษของคุณคือการเข้าใจสิ่งที่ผู้ใช้ต้องการ",
    },
    growthEdge: {
      en: "Your growth edge is translating that into *one* concrete feature they can react to.",
      th: "จุดเติบโตของคุณคือการเปลี่ยนมันเป็นหนึ่งฟีเจอร์ที่จับต้องได้",
    },
  },
  "the-advocate": {
    superpower: {
      en: "Your superpower is acting fast on user pain.",
      th: "พลังวิเศษของคุณคือการลุยทันทีเมื่อเห็นปัญหา",
    },
    growthEdge: {
      en: "Your growth edge is slowing down to be precise about *who* you are building for.",
      th: "จุดเติบโตของคุณคือการชะลอตัวลงเพื่อเจาะจงให้ชัดว่าคุณกำลังสร้างเพื่อใคร",
    },
  },
  "the-interrogator": {
    superpower: {
      en: "Your superpower is seeing the gaps.",
      th: "พลังวิเศษของคุณคือการเห็นช่องโหว่",
    },
    growthEdge: {
      en: "Your growth edge is forcing yourself to build *before* you bust, so reality can interrupt your theorizing.",
      th: "จุดเติบโตของคุณคือการบังคับตัวเองให้สร้างมันขึ้นมาก่อนวิจารณ์ เพื่อให้ความจริงมาหยุดทฤษฎีในหัว",
    },
  },
  "the-mythbuster": {
    superpower: {
      en: "Your superpower is seeing through bad ideas.",
      th: "พลังวิเศษของคุณคือการมองทะลุไอเดียแย่ๆ",
    },
    growthEdge: {
      en: "Your growth edge is holding your conviction for one sprint to see what *could* work before tearing it down.",
      th: "จุดเติบโตของคุณคือการให้โอกาสไอเดียสักหนึ่งสปรินต์ ดูว่ามันไปได้ไหมก่อนจะคว่ำมันทิ้ง",
    },
  },
  "the-architect": {
    superpower: {
      en: "Your superpower is seeing the whole system.",
      th: "พลังวิเศษของคุณคือการเห็นระบบทั้งหมด",
    },
    growthEdge: {
      en: "Your growth edge is recognizing that elegant design needs real-world proof. Build one small piece.",
      th: "จุดเติบโตของคุณคือการเข้าใจว่าการออกแบบที่สวยงามต้องมีโลกจริงมารองรับ ลองสร้างส่วนเล็กๆ ขึ้นมาพิสูจน์สิ",
    },
  },
  "the-synthesizer": {
    superpower: {
      en: "Your superpower is connecting patterns.",
      th: "พลังวิเศษของคุณคือการเชื่อมโยงภาพรวม",
    },
    growthEdge: {
      en: "Your growth edge is turning those patterns into a specific proposal—synthesis without construction is just narration.",
      th: "จุดเติบโตของคุณคือการนำมันมาสร้างข้อเสนอที่เป็นรูปธรรม การวิเคราะห์โดยไม่ลงมือทำก็เหมือนแค่นั่งเล่าเรื่อง",
    },
  },
  "the-auditor": {
    superpower: {
      en: "Your superpower is seeing interconnected reality.",
      th: "พลังวิเศษของคุณคือการเห็นความจริงที่ซับซ้อน",
    },
    growthEdge: {
      en: "Your growth edge is understanding that mapping a system is not changing it. Build an artifact to gain leverage.",
      th: "จุดเติบโตของคุณคือการเข้าใจว่าแค่เขียนแผนผังระบบไม่ได้ช่วยเปลี่ยนมัน คุณต้องสร้างบางอย่างเพื่อใช้เป็นคานงัด",
    },
  },
  "the-pivot-forcer": {
    superpower: {
      en: "Your superpower is pivoting fast.",
      th: "พลังวิเศษของคุณคือการพลิกเกมอย่างรวดเร็ว",
    },
    growthEdge: {
      en: "Your growth edge is holding your conviction for one sprint so data, not just instinct, drives the pivot.",
      th: "จุดเติบโตของคุณคือการให้เวลาพิสูจน์มันสักหนึ่งสปรินต์ เพื่อให้ข้อมูลจริงเป็นตัวนำทาง ไม่ใช่แค่สัญชาตญาณ",
    },
  },
  wanderer: {
    superpower: {
      en: "Your superpower is staying open to every possibility.",
      th: "พลังวิเศษของคุณคือการเปิดรับทุกความเป็นไปได้",
    },
    growthEdge: {
      en: "Your growth edge is picking one direction and testing it—any direction beats standing still.",
      th: "จุดเติบโตของคุณคือการเลือกทิศทางหนึ่งแล้วลองทดสอบมัน — ทิศไหนก็ดีกว่ายืนนิ่ง",
    },
  },
};
