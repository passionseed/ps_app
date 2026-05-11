import { p3Options } from "./prompts";

export interface AxisScores {
  mm: number;
  sb: number;
  pr: number;
  sq: number;
}

export interface ArchetypeResult {
  id: string;
  display: { en: string; th: string };
  caption: { en: string; th: string };
  bgmPrompt: string;
  persona?: { en: string; th: string };
  sqDynamic?: {
    solo: { en: string; th: string };
    squad: { en: string; th: string };
  };
  signs?: { mm: number; sb: number; pr: number; sq: number };
}

export interface WrappedArchetype extends ArchetypeResult {}

export type ArchetypeId =
  | "the-empath"
  | "the-advocate"
  | "the-interrogator"
  | "the-mythbuster"
  | "the-architect"
  | "the-synthesizer"
  | "the-auditor"
  | "the-pivot-forcer"
  | "wanderer";

export const NEUTRAL_THRESHOLD = 0.25;

export const axes = {
  MM: {
    negative: { en: "Micro", th: "มิโคร" },
    positive: { en: "Macro", th: "แมโคร" },
  },
  SB: {
    negative: { en: "Skeptic", th: "ผู้สงสัย" },
    positive: { en: "Believer", th: "ผู้เชื่อมั่น" },
  },
  PR: {
    negative: { en: "Patient", th: "ผู้รอคอย" },
    positive: { en: "Restless", th: "ผู้กระสับกระส่าย" },
  },
  SQ: {
    negative: { en: "Solo", th: "เดี่ยว" },
    positive: { en: "Squad", th: "ทีม" },
  },
};

export const archetypes: WrappedArchetype[] = [
  {
    id: "the-empath",
    display: {
      en: "The Empath",
      th: "ผู้เข้าอกเข้าใจ",
    },
    caption: {
      en: "You let the silences breathe until the real truth came out.",
      th: "คุณให้เวลากับความเงียบจนความจริงปรากฏ",
    },
    persona: {
      en: "You let the silences breathe until the real truth came out. Your belief comes directly from the people who experience it.",
      th: "คุณให้เวลากับความเงียบจนความจริงปรากฏ ความเชื่อของคุณมาจากคนที่เผชิญมันโดยตรง",
    },
    sqDynamic: {
      solo: {
        en: "You work best in 1:1 intimacy—trust your instinct to go deep with a single user.",
        th: "คุณทำงานได้ดีที่สุดในโหมด 1:1 — เชื่อสัญชาตญาณที่จะลงลึกกับผู้ใช้คนเดียว",
      },
      squad: {
        en: "Your superpower works best when you share what you're sensing with the team, not just carry it alone.",
        th: "พลังวิเศษของคุณจะแรงที่สุดตอนที่คุณแบ่งปันสิ่งที่รู้สึกกับทีม ไม่ใช่แบกมันไว้คนเดียว",
      },
    },
    bgmPrompt:
      "mmx music generate: Ethereal ambient electronic with soft evolving pads, gentle arpeggios, subtle field recording textures, glass marimba, warm analog bass. Curious exploratory mood. 100 BPM. Bioluminescent theme.",
    signs: { mm: -1, sb: 1, pr: -1, sq: 0 },
  },
  {
    id: "the-advocate",
    display: {
      en: "The Advocate",
      th: "ผู้พิทักษ์",
    },
    caption: {
      en: "Once you found a user pain point, you were restless to move forward.",
      th: "พบปัญหาผู้ใช้ปุ๊บ คุณก็พร้อมลุยต่อทันที",
    },
    persona: {
      en: "Once you found a user pain point, you were restless to move forward. You championed the users and drove the 'Proceed' decision.",
      th: "พบปัญหาผู้ใช้ปุ๊บ คุณก็พร้อมลุยต่อทันที คุณเป็นผู้พิทักษ์ผู้ใช้และผลักดันการตัดสินใจ 'ลุยต่อ'",
    },
    sqDynamic: {
      solo: {
        en: "You trust your judgment—run with it, but check in with your squad before accelerating.",
        th: "คุณเชื่อในความคิดของตัวเอง — ลุยเลย แต่เช็คอินกับทีมก่อนเร่งเครื่อง",
      },
      squad: {
        en: "Your energy keeps the squad moving, but practice naming your uncertainties before charging forward.",
        th: "พลังของคุณดันให้ทีมเคลื่อนไหว แต่ฝึกพูดความไม่แน่ใจออกมาก่อนจะบุก",
      },
    },
    bgmPrompt:
      "mmx music generate: Warm synth pop with layered lush synths, punchy soft drums, harmonic pads, shimmering leads, warm rounded bass. Heartwarming and energizing. 120 BPM. Bioluminescent theme.",
    signs: { mm: -1, sb: 1, pr: 1, sq: 0 },
  },
  {
    id: "the-interrogator",
    display: {
      en: "The Interrogator",
      th: "นักซักไซ้",
    },
    caption: {
      en: "People tell you what you want to hear. You knew that, and patiently kept asking.",
      th: "คนพูดสิ่งที่คุณอยากฟัง คุณรู้ และอดทนถามต่อไป",
    },
    persona: {
      en: "People tell you what you want to hear. You knew that, and patiently kept asking 'but why?' until the messy behavior emerged.",
      th: "คนพูดสิ่งที่คุณอยากฟัง คุณรู้ และอดทนถาม 'แล้วทำไม?' จนพฤติกรรมที่ยุ่งเหยิงปรากฏ",
    },
    sqDynamic: {
      solo: {
        en: "You do your best thinking in private—protect that, but don't disappear for the whole sprint.",
        th: "คุณคิดได้ดีที่สุดในพื้นที่ส่วนตัว — ปกป้องมัน แต่อย่าหายไปตลอดสปรินต์",
      },
      squad: {
        en: "You protect the team from groupthink; channel that into proposing alternatives, not just problems.",
        th: "คุณปกป้องทีมจาก groupthink; เปลี่ยนมันเป็นข้อเสนอทางเลือก ไม่ใช่แค่ปัญหา",
      },
    },
    bgmPrompt:
      "mmx music generate: Noir synthwave with dark bass synths, jazzy muted keys, sparse percussion, moody filter sweeps, tension-building risers, cool vibraphone. Mysterious detective mood. 90 BPM. Bioluminescent theme.",
    signs: { mm: -1, sb: -1, pr: -1, sq: 0 },
  },
  {
    id: "the-mythbuster",
    display: {
      en: "The Mythbuster",
      th: "ผู้ทำลายมายาคติ",
    },
    caption: {
      en: "You hate wasting time on fake problems.",
      th: "คุณเกลียดการเสียเวลากับปัญหาปลอม",
    },
    persona: {
      en: "You hate wasting time on fake problems. You moved quickly through evidence, actively looking to Pivot or Kill bad ideas.",
      th: "คุณเกลียดการเสียเวลากับปัญหาปลอม คุณเคลื่อนผ่านหลักฐานอย่างรวดเร็ว มองหาโอกาส Pivot หรือ Kill ไอเดียแย่ๆ",
    },
    sqDynamic: {
      solo: {
        en: "You're at your best when stress-testing an idea on your own.",
        th: "คุณอยู่ในจุดที่ดีที่สุดตอน stress-test ไอเดียด้วยตัวเอง",
      },
      squad: {
        en: "Your skepticism is a gift; practice offering 'what could work instead' alongside 'this won't work.'",
        th: "ความสงสัยของคุณคือของขวัญ; ฝักใฝ่เสนอ 'แล้วอะไรจะเวิร์กแทน' ควบคู่กับ 'อันนี้ไม่เวิร์ก'",
      },
    },
    bgmPrompt:
      "mmx music generate: Dynamic breakbeat fusion with punchy break drums, dramatic chord stabs, evolving pads, gritty bass, building risers, textural glitches. Adaptive transformative mood. 125 BPM. Bioluminescent theme.",
    signs: { mm: -1, sb: -1, pr: 1, sq: 0 },
  },
  {
    id: "the-architect",
    display: {
      en: "The Architect",
      th: "สถาปนิกโครงสร้าง",
    },
    caption: {
      en: "While others were lost in individual quotes, you were zooming out.",
      th: "ตอนที่คนอื่นหลงในใบเสนอราคาแต่ละใบ คุณกำลังถอยออกมามองภาพรวม",
    },
    persona: {
      en: "While others were lost in individual quotes, you were zooming out. You patiently built a system map the team could believe in.",
      th: "ตอนที่คนอื่นหลงในใบเสนอราคาแต่ละใบ คุณกำลังถอยออกมามองภาพรวม คุณสร้างแผนผังระบบอย่างอดทนจนทีมเชื่อมั่น",
    },
    sqDynamic: {
      solo: {
        en: "You need space to think big—take it, but bring the team into the vision early.",
        th: "คุณต้องการพื้นที่คิดใหญ่ — เอาเลย แต่ดึงทีมเข้ามาในวิสัยทัศน์ตั้งแต่เนิ่นๆ",
      },
      squad: {
        en: "Your conviction can outpace the team's evidence; ground your architecture in what everyone learned.",
        th: "ความเชื่อมั่นของคุณอาจวิ่งเร็วกว่าหลักฐานของทีม; ยึดสถาปัตยกรรมของคุณไว้กับสิ่งที่ทุกคนเรียนรู้",
      },
    },
    bgmPrompt:
      "mmx music generate: Minimal neo-classical ambient with soft piano motifs, gentle sustained strings, minimal synths, organic textures, warm wooden bass. Grounding and serene mood. 75 BPM. Bioluminescent theme.",
    signs: { mm: 1, sb: 1, pr: -1, sq: 0 },
  },
  {
    id: "the-synthesizer",
    display: {
      en: "The Synthesizer",
      th: "นักประมวลผล",
    },
    caption: {
      en: "You connect dots at high speed, turning a pile of messy evidence into a clear map.",
      th: "คุณเชื่อมจุดได้ด้วยความเร็วสูง เปลี่ยนกองหลักฐานยุ่งเหยิงเป็นแผนที่ชัดเจน",
    },
    persona: {
      en: "You connect dots at high speed, turning a pile of messy evidence into a clear map and a confident 'Proceed.'",
      th: "คุณเชื่อมจุดได้ด้วยความเร็วสูง เปลี่ยนกองหลักฐานยุ่งเหยิงเป็นแผนที่ชัดเจนและการตัดสินใจ 'ลุยต่อ' อย่างมั่นใจ",
    },
    sqDynamic: {
      solo: {
        en: "You connect things best when you observe quietly first.",
        th: "คุณเชื่อมโยงสิ่งต่างๆ ได้ดีที่สุดตอนที่สังเกตเงียบๆ ก่อน",
      },
      squad: {
        en: "You see how ideas fit better than anyone; your job is to propose when you synthesize, not just observe.",
        th: "คุณเห็นว่าไอเดียประกอบกันอย่างไรดีกว่าใคร; งานของคุณคือเสนอตอนที่สังเคราะห์ ไม่ใช่แค่สังเกต",
      },
    },
    bgmPrompt:
      "mmx music generate: Glitch hop with tight glitchy percussion, precise sequenced synths, evolving pads, wobble bass, click textures, crystalline chimes. Methodical and refined mood. 110 BPM. Bioluminescent theme.",
    signs: { mm: 1, sb: 1, pr: 1, sq: 0 },
  },
  {
    id: "the-auditor",
    display: {
      en: "The Systems Auditor",
      th: "ผู้ตรวจสอบระบบ",
    },
    caption: {
      en: "You don't trust a neat map.",
      th: "คุณไม่ไว้ใจแผนที่ที่เรียบร้อย",
    },
    persona: {
      en: "You don't trust a neat map. You heavily scrutinized where the system was actually broken before agreeing to any decision.",
      th: "คุณไม่ไว้ใจแผนที่ที่เรียบร้อย คุณตรวจสอบอย่างหนักว่าระบบพังตรงไหนจริงๆ ก่อนตกลงตัดสินใจอะไร",
    },
    sqDynamic: {
      solo: {
        en: "You need time with complexity—take it, but surface your insights in short, decisive bursts.",
        th: "คุณต้องการเวลากับความซับซ้อน — เอาเลย แต่เอาข้อมูลเชิงลึกขึ้นมาเป็นช่วงสั้นๆ ที่เด็ดขาด",
      },
      squad: {
        en: "Your depth can slow decisions; practice turning systemic warnings into specific recommendations.",
        th: "ความลึกของคุณอาจชะลอการตัดสินใจ; ฝึกเปลี่ยนคำเตือนเชิงระบบเป็นข้อเสนอเฉพาะเจาะจง",
      },
    },
    bgmPrompt:
      "mmx music generate: Industrial ambient with distorted synth textures, mechanical rhythmic elements, glitchy percussives, glassy crystalline chimes, deep sub bass. Questioning yet luminous mood. 95 BPM. Bioluminescent theme.",
    signs: { mm: 1, sb: -1, pr: -1, sq: 0 },
  },
  {
    id: "the-pivot-forcer",
    display: {
      en: "The Pivot-Forcer",
      th: "ผู้ชี้จุดเปลี่ยน",
    },
    caption: {
      en: "Once the map showed a weak problem space, you decisively cut the cord.",
      th: "พอแผนที่แสดงพื้นที่ปัญหาอ่อน คุณก็ตัดสายอย่างเด็ดขาด",
    },
    persona: {
      en: "Once the map showed a weak problem space, you decisively cut the cord to Pivot or Kill, saving the team's time.",
      th: "พอแผนที่แสดงพื้นที่ปัญหาอ่อน คุณก็ตัดสายอย่างเด็ดขาดเพื่อ Pivot หรือ Kill ประหยัดเวลาทีม",
    },
    sqDynamic: {
      solo: {
        en: "You trust your read on the game—follow it, but build a 24-hour rule before you shift completely.",
        th: "คุณเชื่อในการอ่านเกมของตัวเอง — ตามมัน แต่สร้างกฎ 24 ชั่วโมงก่อนจะเปลี่ยนเต็มตัว",
      },
      squad: {
        en: "You pull the team forward with urgency; protect their buy-in by making your pivots explicit and voted on.",
        th: "คุณดึงทีมไปข้างหน้าด้วยความเร่งด่วน; ปกป้องการมีส่วนร่วมของพวกเขาด้วยการทำให้การ pivot ชัดเจนและมีการโหวต",
      },
    },
    bgmPrompt:
      "mmx music generate: Cinematic bass electronic with heavy sub drops, soaring synth leads, punchy impact drums, epic cinematic risers, powerful stabs. Bold instinctive heroic mood. 130 BPM. Bioluminescent theme.",
    signs: { mm: 1, sb: -1, pr: 1, sq: 0 },
  },
  {
    id: "wanderer",
    display: {
      en: "The Wanderer",
      th: "คนเดินสำรวจ",
    },
    caption: {
      en: "Phase 1 doesn't fit one shape yet — you're still scouting the territory.",
      th: "Phase 1 ยังไม่มีรูปทรงแน่ชัดสำหรับคุณ — คุณกำลังสำรวจพื้นที่อยู่ ยังไม่ถึงเวลาตัดสินใจว่าจะเป็นอะไร",
    },
    bgmPrompt:
      "mmx music generate: Dream pop ambient with ethereal wash pads, reverb-drenched guitar, floating textures, soft distant bass, ambient chimes. Free drifting wandering mood. 85 BPM. Bioluminescent theme.",
    signs: { mm: 0, sb: 0, pr: 0, sq: 0 },
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Activity-data signal types
export interface ActivitySignals {
  mm: number;
  sb: number;
  pr: number;
  sq: number;
}

export interface HackathonParticipantSubmission {
  id: string;
  participant_id: string;
  activity_id: string;
  submission_type: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Compute activity-data signals from hackathon participant submissions.
 * Each signal contributes axis weights based on submission patterns.
 *
 * Signals:
 * - 5+ distinct evidence uploads -> MM -0.30 (Micro)
 * - Highly connected System Map -> MM +0.30 (Macro)
 * - Marked "Proceed" at Decision Gate -> SB +0.30 (Believer)
 * - Marked "Pivot" or "Kill" at Decision Gate -> SB -0.30 (Skeptic)
 * - Late submission / close to deadline -> PR +0.20 (Restless)
 * - Evenly distributed uploads -> PR -0.20 (Patient)
 * - Completed team reflection alone -> SQ -0.20 (Solo)
 *
 * @param submissions - Array of participant submissions
 * @returns Activity signal contributions per axis
 */
export function computeActivitySignals(
  submissions: HackathonParticipantSubmission[]
): ActivitySignals {
  const signals: ActivitySignals = { mm: 0, sb: 0, pr: 0, sq: 0 };

  if (!submissions || submissions.length === 0) {
    return signals;
  }

  // Count distinct evidence uploads (submission_type === "evidence" or similar)
  const evidenceSubmissions = submissions.filter(
    (s) =>
      s.submission_type === "evidence" ||
      s.submission_type === "file_upload" ||
      s.submission_type === "upload"
  );

  if (evidenceSubmissions.length >= 5) {
    signals.mm -= 0.30;
  }

  // Check for system map submission (highly connected)
  const hasSystemMap = submissions.some(
    (s) =>
      s.submission_type === "system_map" ||
      s.submission_type === "map" ||
      (s.metadata && (s.metadata as Record<string, unknown>).connected === true)
  );
  if (hasSystemMap) {
    signals.mm += 0.30;
  }

  // Decision gate signals
  const decisionSubmissions = submissions.filter(
    (s) => s.submission_type === "decision" || s.submission_type === "decision_gate"
  );
  for (const ds of decisionSubmissions) {
    const decision =
      (ds.metadata?.decision as string) ||
      (ds.metadata?.status as string) ||
      "";
    if (decision === "proceed") {
      signals.sb += 0.30;
    } else if (decision === "pivot" || decision === "kill") {
      signals.sb -= 0.30;
    }
  }

  // Timing signals for PR axis
  if (submissions.length > 0) {
    const timestamps = submissions
      .map((s) => new Date(s.created_at).getTime())
      .filter((t) => !isNaN(t));
    if (timestamps.length > 1) {
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const range = maxTime - minTime;
      // If all submissions clustered in last 20% of time range -> restless
      // If spread across >50% of range -> patient
      if (range > 0) {
        const firstUpload = minTime;
        const lastUpload = maxTime;
        const phaseDuration = range;
        const uploadSpread = lastUpload - firstUpload;
        // Clustered late = restless
        if (uploadSpread < phaseDuration * 0.2) {
          signals.pr += 0.20;
        } else if (uploadSpread > phaseDuration * 0.5) {
          signals.pr -= 0.20;
        }
      }
    }
  }

  // Solo reflection signal
  const hasSoloReflection = submissions.some(
    (s) =>
      s.submission_type === "reflection" &&
      (s.metadata?.solo === true || (s.metadata as Record<string, unknown>).logged_solo === true)
  );
  if (hasSoloReflection) {
    signals.sq -= 0.20;
  }

  return {
    mm: clamp(signals.mm, -1, 1),
    sb: clamp(signals.sb, -1, 1),
    pr: clamp(signals.pr, -1, 1),
    sq: clamp(signals.sq, -1, 1),
  };
}

/**
 * Compute MM (Micro/Macro) axis score.
 * Formula: clamp((sliderValue - 2) / 2 + sum(P3 MM weights for selected options), -1, 1)
 * @param sliderValue - Prompt 1 slider value (0-4)
 * @param p3SelectedIndices - Indices of selected Prompt 3 options
 */
export function computeMMAxis(
  sliderValue: number,
  p3SelectedIndices: number[]
): number {
  const baseScore = (sliderValue - 2) / 2;
  const uniqueIndices = Array.from(new Set(p3SelectedIndices)).filter(
    (i) => i >= 0 && i < p3Options.length
  );
  const p3Sum = uniqueIndices.reduce((sum, idx) => sum + p3Options[idx].mm, 0);
  return clamp(baseScore + p3Sum, -1, 1);
}

/**
 * Compute SB (Skeptic/Believer) axis score.
 * Formula: clamp((sliderValue - 2) / 2, -1, 1)
 * @param sliderValue - Prompt 2 slider value (0-4)
 */
export function computeSBAxis(sliderValue: number): number {
  return clamp((sliderValue - 2) / 2, -1, 1);
}

/**
 * Compute SQ (Solo/Squad) axis score.
 * Formula: clamp(sum(P3 SQ weights for selected options), -1, 1)
 * @param p3SelectedIndices - Indices of selected Prompt 3 options
 */
export function computeSQAxis(p3SelectedIndices: number[]): number {
  const uniqueIndices = Array.from(new Set(p3SelectedIndices)).filter(
    (i) => i >= 0 && i < p3Options.length
  );
  const p3Sum = uniqueIndices.reduce((sum, idx) => sum + p3Options[idx].sq, 0);
  return clamp(p3Sum, -1, 1);
}

// Prompt 4 item weights for PR axis (restless = positive, patient = negative)
const prItemWeights = [0.5, 0, -0.5, 0.5, -0.5, 0.5];

/**
 * Compute PR (Patient/Restless) axis score from drag-rank indices.
 *
 * Formula: clamp(sum(prItemWeight[itemIndex] / (position + 1)), -1, 1)
 * where position is 0-indexed (0 = first/most meaningful).
 *
 * First rank contributes most positively (divisor = 1),
 * second rank contributes half as much (divisor = 2),
 * third rank contributes one-third (divisor = 3).
 *
 * @param rankedIndices - Ordered array of item indices (first = most meaningful)
 */
export function computePRAxis(rankedIndices: number[]): number {
  let sum = 0;
  for (let position = 0; position < rankedIndices.length; position++) {
    const itemIndex = rankedIndices[position];
    if (
      itemIndex >= 0 &&
      itemIndex < prItemWeights.length &&
      position < 3 // Only first 3 positions matter (pickCount=3)
    ) {
      sum += prItemWeights[itemIndex] / (position + 1);
    }
  }
  return clamp(sum, -1, 1);
}

function signWithThreshold(value: number): number {
  if (value >= NEUTRAL_THRESHOLD) return 1;
  if (value <= -NEUTRAL_THRESHOLD) return -1;
  return 0;
}

/**
 * Blend prompt-based scores with activity-data signals.
 * Weight: 65% prompt / 35% activity.
 *
 * @param promptScores - Axis scores from prompt responses
 * @param activitySignals - Axis contributions from activity data
 * @returns Blended axis scores
 */
export function blendScores(
  promptScores: AxisScores,
  activitySignals: ActivitySignals
): AxisScores {
  return {
    mm: clamp(promptScores.mm * 0.65 + activitySignals.mm * 0.35, -1, 1),
    sb: clamp(promptScores.sb * 0.65 + activitySignals.sb * 0.35, -1, 1),
    pr: clamp(promptScores.pr * 0.65 + activitySignals.pr * 0.35, -1, 1),
    sq: clamp(promptScores.sq * 0.65 + activitySignals.sq * 0.35, -1, 1),
  };
}

/**
 * Classify axis scores into an archetype.
 *
 * Algorithm:
 * 1. Convert each axis score to a sign (-1, 0, +1) using NEUTRAL_THRESHOLD
 * 2. Try exact match against named archetype sign vectors
 * 3. If no exact match:
 *    - For all-positive (+1,+1,+1,+1) or all-negative (-1,-1,-1,-1) extremes,
 *      find the closest archetype by Hamming distance
 *    - Otherwise, return wanderer
 * 4. If all axes are below threshold, return wanderer
 *
 * @param scores - Axis scores {mm, sb, pr, sq}
 * @returns Primary archetype result
 */
export function classifyArchetype(scores: AxisScores): ArchetypeResult {
  const mmSign = signWithThreshold(scores.mm);
  const sbSign = signWithThreshold(scores.sb);
  const prSign = signWithThreshold(scores.pr);
  const sqSign = signWithThreshold(scores.sq);

  // If all axes are neutral, return wanderer
  if (mmSign === 0 && sbSign === 0 && prSign === 0 && sqSign === 0) {
    const wanderer = archetypes.find((a) => a.id === "wanderer")!;
    return {
      id: wanderer.id,
      display: wanderer.display,
      caption: wanderer.caption,
      bgmPrompt: wanderer.bgmPrompt,
      signs: wanderer.signs,
    };
  }

  const inputSigns = { mm: mmSign, sb: sbSign, pr: prSign, sq: sqSign };
  const named = archetypes.filter((a) => a.id !== "wanderer");

  // Try exact match first
  for (const a of named) {
    if (
      a.signs!.mm === inputSigns.mm &&
      a.signs!.sb === inputSigns.sb &&
      a.signs!.pr === inputSigns.pr &&
      a.signs!.sq === inputSigns.sq
    ) {
      return {
        id: a.id,
        display: a.display,
        caption: a.caption,
        bgmPrompt: a.bgmPrompt,
        persona: a.persona,
        sqDynamic: a.sqDynamic,
        signs: a.signs,
      };
    }
  }

  // For extreme all-positive or all-negative, find closest by Hamming distance
  const allPositive = mmSign === 1 && sbSign === 1 && prSign === 1 && sqSign === 1;
  const allNegative = mmSign === -1 && sbSign === -1 && prSign === -1 && sqSign === -1;

  if (allPositive || allNegative) {
    let minDistance = Infinity;
    let closest: WrappedArchetype | null = null;
    let tie = false;

    for (const a of named) {
      const d =
        Math.abs(a.signs!.mm - inputSigns.mm) +
        Math.abs(a.signs!.sb - inputSigns.sb) +
        Math.abs(a.signs!.pr - inputSigns.pr) +
        Math.abs(a.signs!.sq - inputSigns.sq);

      if (d < minDistance) {
        minDistance = d;
        closest = a;
        tie = false;
      } else if (d === minDistance) {
        tie = true;
      }
    }

    if (closest && !tie) {
      return {
        id: closest.id,
        display: closest.display,
        caption: closest.caption,
        bgmPrompt: closest.bgmPrompt,
        persona: closest.persona,
        sqDynamic: closest.sqDynamic,
        signs: closest.signs,
      };
    }
  }

  const wanderer = archetypes.find((a) => a.id === "wanderer")!;
  return {
    id: wanderer.id,
    display: wanderer.display,
    caption: wanderer.caption,
    bgmPrompt: wanderer.bgmPrompt,
    signs: wanderer.signs,
  };
}

/**
 * Get the secondary (runner-up) archetype for a given scores input.
 * Returns the archetype with the second-smallest Hamming distance to the sign pattern.
 * Used when user taps "Not me" during calibration.
 *
 * @param scores - Axis scores {mm, sb, pr, sq}
 * @returns Secondary archetype result
 */
export function getSecondaryArchetype(scores: AxisScores): ArchetypeResult {
  const mmSign = signWithThreshold(scores.mm);
  const sbSign = signWithThreshold(scores.sb);
  const prSign = signWithThreshold(scores.pr);
  const sqSign = signWithThreshold(scores.sq);

  const inputSigns = { mm: mmSign, sb: sbSign, pr: prSign, sq: sqSign };
  const named = archetypes.filter((a) => a.id !== "wanderer");

  const distances = named.map((a) => ({
    archetype: a,
    distance:
      Math.abs(a.signs!.mm - inputSigns.mm) +
      Math.abs(a.signs!.sb - inputSigns.sb) +
      Math.abs(a.signs!.pr - inputSigns.pr) +
      Math.abs(a.signs!.sq - inputSigns.sq),
  }));

  distances.sort((a, b) => a.distance - b.distance);

  const secondary = distances[1]?.archetype || distances[0]?.archetype || named[0];
  return {
    id: secondary.id,
    display: secondary.display,
    caption: secondary.caption,
    bgmPrompt: secondary.bgmPrompt,
    persona: secondary.persona,
    sqDynamic: secondary.sqDynamic,
    signs: secondary.signs,
  };
}

export interface WrappedResponses {
  p1: number;
  p2: number;
  p3: number[];
  p4: number[];
  p5?: string;
  p6?: string;
}

export type ArchetypeFit = "nailed" | "sort_of" | "not_me";

export interface WrappedReflection {
  enrollment_id: string;
  participant_id: string;
  archetype: ArchetypeId;
  archetype_secondary: ArchetypeId;
  axes: { MM: number; SB: number; PR: number; SQ: number };
  surprise_evidence: string;
  phase1_title: string;
  archetype_fit: ArchetypeFit;
  created_at: string;
}
