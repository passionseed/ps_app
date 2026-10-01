import type { ShiftSnapshot, ShiftUpdate } from "../types/shift";

export const SHIFT_DAYS = [
  {
    title: ["Choose one problem", "เลือกปัญหาเดียว"],
    why: [
      "A small scope lets you test your own idea.",
      "โจทย์เล็กช่วยให้เราได้ลองความคิดของตัวเองจริง",
    ],
    action: [
      "Name who has the problem and one thing you want to test.",
      "บอกว่าใครเจอปัญหานี้ และเลือกหนึ่งสิ่งที่อยากทดสอบ",
    ],
  },
  {
    title: ["Talk to real people", "คุยกับคนที่เจอปัญหาจริง"],
    why: [
      "Their experience may change what you build.",
      "ประสบการณ์ของเขาอาจทำให้เราเปลี่ยนสิ่งที่จะสร้าง",
    ],
    action: [
      "Talk to three people. Write their words and what surprised you.",
      "คุยกับคนสามคน จดคำพูดของเขาและสิ่งที่เราไม่คาดคิด",
    ],
  },
  {
    title: ["Make a first version", "สร้างเวอร์ชันแรก"],
    why: [
      "Something usable gives you something to learn from.",
      "ของที่ใช้ได้ทำให้เราได้เรียนรู้จากของจริง",
    ],
    action: [
      "Build one usable thing. Paper, zero-code, and hardware all count.",
      "สร้างของที่ใช้ได้หนึ่งอย่าง กระดาษ เครื่องมือไม่เขียนโค้ด หรือฮาร์ดแวร์ก็ได้",
    ],
  },
  {
    title: ["Let others try it", "ให้คนนอกลองใช้"],
    why: [
      "Real use shows what a polished presentation cannot.",
      "การใช้จริงทำให้เห็นสิ่งที่สไลด์สวยๆ บอกไม่ได้",
    ],
    action: [
      "Ask people outside your project to try it. Observe where they get stuck.",
      "ให้คนที่ไม่ได้ทำโปรเจกต์ลองใช้ สังเกตว่าเขาติดตรงไหน",
    ],
  },
  {
    title: ["Fix and change", "แก้และเปลี่ยน"],
    why: [
      "A failed attempt can show a better direction.",
      "สิ่งที่ไม่เวิร์กช่วยให้เห็นทางที่ดีขึ้น",
    ],
    action: [
      "Record what broke, what you changed, and why.",
      "จดว่าอะไรพัง เราเปลี่ยนอะไร และเพราะอะไร",
    ],
  },
  {
    title: ["Measure one outcome", "วัดผลหนึ่งอย่าง"],
    why: [
      "Evidence helps you decide what to do next.",
      "หลักฐานช่วยให้เราตัดสินใจว่าจะทำอะไรต่อ",
    ],
    action: [
      "Choose one meaningful number you can measure again.",
      "เลือกตัวเลขที่มีความหมายหนึ่งอย่างที่วัดซ้ำได้",
    ],
  },
  {
    title: ["Show what you learned", "โชว์สิ่งที่เรียนรู้"],
    why: [
      "Your decisions and learning are part of the work.",
      "การตัดสินใจและสิ่งที่เรียนรู้เป็นส่วนหนึ่งของผลงาน",
    ],
    action: [
      "Present the problem, usable result, testing evidence, changes, and learning.",
      "นำเสนอปัญหา ของที่ใช้ได้ หลักฐานการทดสอบ สิ่งที่เปลี่ยน และสิ่งที่เรียนรู้",
    ],
  },
] as const;
export const SHIFT_SKILLS = [
  {
    id: "discovery",
    name: ["Customer discovery", "คุยเพื่อเข้าใจปัญหา"],
    tip: [
      "Ask about the last time the problem happened. Listen before offering your idea.",
      "ถามถึงครั้งล่าสุดที่เจอปัญหา ฟังก่อนเสนอไอเดียของเรา",
    ],
  },
  {
    id: "testers",
    name: ["Find testers", "หาคนทดสอบ"],
    tip: [
      "Ask people who experience the problem directly, with a small specific request.",
      "ชวนคนที่เจอปัญหานี้จริงๆ โดยบอกให้ชัดว่าอยากให้ลองอะไร",
    ],
  },
  {
    id: "ai",
    name: ["Use AI thoughtfully", "ใช้ AI อย่างมีวิจารณญาณ"],
    tip: [
      "Ask for a small prototype. Check its behavior and make your own decisions.",
      "ขอต้นแบบเล็กๆ ตรวจว่าทำงานอย่างไร และตัดสินใจด้วยตัวเอง",
    ],
  },
  {
    id: "zero-code",
    name: ["Build without code", "สร้างโดยไม่เขียนโค้ด"],
    tip: [
      "Try a form, simple page, paper prototype, or existing tools before building more.",
      "ลองใช้ฟอร์ม หน้าเว็บง่ายๆ ต้นแบบกระดาษ หรือเครื่องมือที่มีอยู่ก่อน",
    ],
  },
  {
    id: "measure",
    name: ["Measure one thing", "วัดผลหนึ่งอย่าง"],
    tip: [
      "Record how many people finish the task, or where they stop. Repeat after a change.",
      "จดว่ากี่คนทำจนจบ หรือติดตรงไหน วัดซ้ำหลังปรับ",
    ],
  },
  {
    id: "decisions",
    name: ["Own your decisions", "ตัดสินใจด้วยตัวเอง"],
    tip: [
      "Explain why you chose an approach. You can disagree with peers or AI.",
      "อธิบายว่าทำไมเลือกวิธีนี้ เราคิดต่างจากเพื่อนหรือ AI ได้",
    ],
  },
] as const;
export function shiftDay(startsOn: string, now = new Date()): number {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => today.find((p) => p.type === type)?.value;
  const utcToday = Date.UTC(
    Number(part("year")),
    Number(part("month")) - 1,
    Number(part("day")),
  );
  const [year, month, day] = startsOn.split("-").map(Number);
  return Math.floor((utcToday - Date.UTC(year, month - 1, day)) / 86400000) + 1;
}
export function myProject(s: ShiftSnapshot) {
  return s.projects.find((p) => p.members.includes(s.user_id));
}
export function myGroup(s: ShiftSnapshot) {
  return s.groups.find((g) => g.members.includes(s.user_id));
}
export function peerUpdates(s: ShiftSnapshot): ShiftUpdate[] {
  const group = myGroup(s);
  const own = myProject(s);
  const peerProjects = s.projects
    .filter(
      (p) =>
        p.id !== own?.id && p.members.some((id) => group?.members.includes(id)),
    )
    .map((p) => p.id);
  const eligible = s.updates.filter(
    (u) => u.published_at && !u.hidden && u.project_id !== own?.id,
  );
  return eligible
    .filter(
      (u) =>
        !s.comments.some(
          (c) => c.post_id === u.post_id && c.author_id === s.user_id,
        ),
    )
    .sort(
      (a, b) =>
        Number(peerProjects.includes(b.project_id)) -
          Number(peerProjects.includes(a.project_id)) ||
        b.updated_at.localeCompare(a.updated_at),
    );
}
export function validateUpdate(
  body: { link?: string; shipped?: string; problem?: string; learned?: string },
  day: number,
  publish: boolean,
): string | null {
  if (body.link && !/^https?:\/\/\S+$/.test(body.link))
    return "Use an http or https project link.";
  if (publish && !body.shipped?.trim())
    return "Tell your group what you tried or made.";
  if (publish && day === 7 && (!body.problem?.trim() || !body.learned?.trim()))
    return "Add the problem and what you learned for your final demo.";
  return null;
}
