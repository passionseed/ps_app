import { shiftStorage } from "./shiftStorage";
import { isIsoDate, type CompanionCohort, type CompanionStatus } from "./shiftCompanionRules";

export type CompanionAccess = CompanionStatus & { fromDevice?: boolean };
export type CompanionResume = { cohortId: string; date: string };

function parseCohorts(raw: string | null): CompanionCohort[] | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || !data.length) return null;
    if (!data.every(c => c && typeof c.id === "string" && c.id.trim() && typeof c.name === "string" &&
      isIsoDate(c.starts_on) && (c.ends_on === null || isIsoDate(c.ends_on)))) return null;
    return data.map(({ id, name, starts_on, ends_on }) => ({ id, name, starts_on, ends_on }));
  } catch { return null; }
}

function parseResume(raw: string | null): CompanionResume | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value.cohortId === "string" && value.cohortId.trim() && isIsoDate(value.date)
      ? { cohortId: value.cohortId, date: value.date } : null;
  } catch { return null; }
}

export async function loadCompanionAccess(
  userId: string,
  load: () => Promise<CompanionStatus | null>,
): Promise<CompanionAccess | null> {
  if (!userId) return null;
  const key = `shift-linked-cohorts:${userId}`;
  try {
    const status = await load();
    if (status?.linked) {
      const metadata = status.cohorts.map(({ id, name, starts_on, ends_on }) => ({ id, name, starts_on, ends_on }));
      await shiftStorage.setItem(key, JSON.stringify(metadata)).catch(() => {});
    } else {
      // A confirmed unlink supersedes an old snapshot. Personal drafts remain intact.
      await shiftStorage.removeItem(key).catch(() => {});
    }
    return status;
  } catch (error) {
    // Only transport failures permit offline metadata. Authorization failures do not.
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (typeof code === "string" && code) throw error;
    const message = error instanceof Error ? error.message : "";
    if (!/network|fetch|offline|connection|timeout|timed out/i.test(message)) throw error;
    const cohorts = parseCohorts(await shiftStorage.getItem(key).catch(() => null));
    if (!cohorts) throw error;
    return { ok: true, linked: true, email: null, mobile: null, cohorts, fromDevice: true };
  }
}

export async function loadCompanionResume(userId: string): Promise<CompanionResume | null> {
  if (!userId) return null;
  return parseResume(await shiftStorage.getItem(`shift-resume:${userId}`).catch(() => null));
}

export async function rememberCompanionResume(userId: string, resume: CompanionResume): Promise<void> {
  if (!userId || !parseResume(JSON.stringify(resume))) return;
  await shiftStorage.setItem(`shift-resume:${userId}`, JSON.stringify(resume));
}

export async function clearCompanionResume(userId: string): Promise<void> {
  if (userId) await shiftStorage.removeItem(`shift-resume:${userId}`).catch(() => {});
}

export function permittedCompanionResume(resume: CompanionResume | null, cohorts: readonly CompanionCohort[]): CompanionResume | null {
  return resume && cohorts.some(c => c.id === resume.cohortId) ? resume : null;
}

export async function rememberActiveComposer(userId: string, resume: CompanionResume): Promise<void> {
  if (userId) await shiftStorage.setItem(`shift-active-composer:${userId}`, JSON.stringify(resume)).catch(() => {});
}

export async function preserveInterruptedComposer(userId: string): Promise<void> {
  if (!userId) return;
  const active = parseResume(await shiftStorage.getItem(`shift-active-composer:${userId}`).catch(() => null));
  if (active) await rememberCompanionResume(userId, active).catch(() => {});
}
