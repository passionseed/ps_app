/**
 * Student plan (scale spec 2.5, D5): the day plan and the interview guide come from the mentors'
 * `shift_curriculum`. When the bundle has no plan, the guide falls back to the built-in copy of
 * SHIFT2_INTERVIEW (`pseed lib/content/shift2-curriculum.ts`) and day screens show only the
 * session line.
 */
import type { Lang, PlanDay, PlanInterview, RoundPlan } from "./types";

/** Built-in copy of SHIFT2_INTERVIEW (Thai is the source; English for the EN preference). */
export const BUILTIN_INTERVIEW: Record<Lang, PlanInterview> = {
  th: {
    intro: "คุยสั้น ๆ 10 นาที เป้าหมายคือรู้ว่าเขาเจอปัญหานี้จริงไหม และตอนนี้แก้ยังไง ไม่ใช่ขายไอเดีย",
    dm: "สวัสดีครับ/ค่ะ เราเป็นนักเรียน กำลังทำโปรเจกต์เรื่อง [ปัญหา] ขอคุยสั้น ๆ 10 นาทีพรุ่งนี้ได้ไหม อยากฟังว่าตอนนี้คุณจัดการเรื่องนี้ยังไง ไม่ได้ขายอะไร",
    questions: [
      "ครั้งล่าสุดที่เจอเรื่องนี้คือเมื่อไหร่ เล่าให้ฟังหน่อย",
      "ตอนนั้นทำยังไง ใช้อะไรช่วย",
      "ตรงไหนยากหรือเสียเวลาที่สุด",
      "เคยลองวิธีอื่นไหม ทำไมไม่ใช้ต่อ",
      "มีใครอีกที่เจอแบบนี้ แนะนำให้หน่อยได้ไหม",
    ],
    dos: [
      "ถามเรื่องที่เกิดขึ้นแล้ว ไม่ใช่เรื่องสมมติ",
      "ฟังมากกว่าพูด ถาม \"ทำไม\" ต่ออีกชั้น",
      "จดคำพูดของเขาตรง ๆ ไม่สรุปเอง",
      "จบด้วยขอบคุณ และขอคนต่อไป",
    ],
    donts: [
      "อย่าเล่าไอเดียหรือแอปของเราก่อน",
      "อย่าถาม \"ถ้ามีแอปแบบนี้จะใช้ไหม\" คนส่วนใหญ่ตอบว่าใช้ แต่ไม่ใช้จริง",
      "อย่าถามนำ หรือเถียงเมื่อเขาไม่เห็นด้วย",
    ],
  },
  en: {
    intro: "A short 10-minute talk. The goal is to learn whether they really have this problem and how they handle it today, not to sell your idea.",
    dm: "Hi! I'm a student working on a project about [problem]. Could we talk for 10 minutes tomorrow? I'd like to hear how you deal with this today. I'm not selling anything.",
    questions: [
      "When did this last happen to you? Tell me about it.",
      "What did you do then? What did you use?",
      "Which part was hardest or took the most time?",
      "Have you tried other ways? Why did you stop?",
      "Who else has this problem? Could you introduce me?",
    ],
    dos: [
      "Ask about things that already happened, not what-ifs",
      "Listen more than you talk; ask \"why\" one more time",
      "Write down their exact words; don't summarize",
      "End with a thank-you and ask who to talk to next",
    ],
    donts: [
      "Don't pitch your idea or app first",
      "Don't ask \"would you use an app like this?\": most people say yes and never do",
      "Don't ask leading questions or argue when they disagree",
    ],
  },
};

/** The plan's guide when present (mentors write it in Thai), else the built-in copy. */
export function interviewGuide(plan: RoundPlan | null | undefined, lang: Lang): { guide: PlanInterview; source: "plan" | "builtin" } {
  if (plan?.interview && (plan.interview.dm.trim() || plan.interview.questions.length)) {
    return { guide: plan.interview, source: "plan" };
  }
  return { guide: BUILTIN_INTERVIEW[lang], source: "builtin" };
}

export function planDay(plan: RoundPlan | null | undefined, day: number): PlanDay | null {
  return plan?.days.find((d) => d.day === day) ?? null;
}
