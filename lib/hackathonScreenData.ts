import { readHackathonParticipant, type HackathonParticipant } from "./hackathon-mode";
import { isHackathonAdminEmail } from "./hackathonAdminAccess";
import { getCurrentHackathonProgramHome } from "./hackathonProgram";
import {
  getHackathonActivityDetail,
  getPhaseWithActivities,
  getProgramPhaseActivitySummaries,
} from "./hackathonPhaseActivity";
import {
  fetchActivitySubmissionStatuses,
  fetchActivitySubmissions,
  fetchTeamImpact,
  fetchTeammateActivitySubmissions,
  fetchTeamActivitySubmissionStatuses,
  type SubmissionRecord,
  type TeamImpact,
  type TeammateSubmissionRecord,
} from "./hackathon-submit";
import { getCurrentReleasedPhase, isHackathonActivityAccessible } from "./hackathonRelease";
import { supabase } from "./supabase";
import type {
  HackathonPhaseActivityDetail,
  HackathonPhaseActivitySubmissionStatus,
  HackathonPhaseWithActivities,
} from "../types/hackathon-phase-activity";
import type {
  HackathonProgramHome,
  HackathonProgramPhase,
} from "../types/hackathon-program";

type CacheEntry<T> = {
  cachedAt: number;
  data: T;
};

const CACHE_TTL_MS = 45_000;
const cacheKeys = {
  home: "home",
  journey: "journey",
};

const homeBundleCache = new Map<string, CacheEntry<HackathonHomeBundle>>();
const journeyBundleCache = new Map<string, CacheEntry<HackathonJourneyBundle>>();
const phaseBundleCache = new Map<string, CacheEntry<HackathonPhaseBundle>>();
const activityBundleCache = new Map<string, CacheEntry<HackathonActivityBundle>>();

const homeInflight = new Map<string, Promise<HackathonHomeBundle>>();
const journeyInflight = new Map<string, Promise<HackathonJourneyBundle>>();
const phaseInflight = new Map<string, Promise<HackathonPhaseBundle>>();
const activityInflight = new Map<string, Promise<HackathonActivityBundle>>();

function isFresh(entry: CacheEntry<unknown> | undefined, ttlMs = CACHE_TTL_MS) {
  if (!entry) return false;
  return Date.now() - entry.cachedAt <= ttlMs;
}

function readFresh<T>(
  store: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs = CACHE_TTL_MS,
) {
  const entry = store.get(key);
  if (!entry || !isFresh(entry, ttlMs)) return null;
  return entry.data;
}

function writeCache<T>(store: Map<string, CacheEntry<T>>, key: string, data: T) {
  store.set(key, {
    cachedAt: Date.now(),
    data,
  });
  return data;
}

async function loadCached<T>(
  store: Map<string, CacheEntry<T>>,
  inflight: Map<string, Promise<T>>,
  key: string,
  loader: () => Promise<T>,
  forceRefresh = false,
): Promise<T> {
  const cached = !forceRefresh ? readFresh(store, key) : null;
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = loader()
    .then((data) => writeCache(store, key, data))
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);
  return promise;
}

export type HackathonHomeBundle = {
  currentPhase: HackathonProgramPhase | null;
  impact: TeamImpact | null;
};

export type HackathonJourneyPhaseCard = {
  phase: HackathonProgramPhase;
  activityTitles: string[];
  activityCount: number;
  completedCount: number;
  isActive: boolean;
};

export type HackathonJourneyBundle = {
  data: HackathonProgramHome;
  impact: TeamImpact | null;
  phaseCards: HackathonJourneyPhaseCard[];
  isAdmin: boolean;
};

export type HackathonPhaseActivityWithStatus = HackathonPhaseActivityDetail & {
  submissionStatus: HackathonPhaseActivitySubmissionStatus;
};

export type HackathonPhaseBundle = {
  phase: HackathonPhaseWithActivities | null;
  activities: HackathonPhaseActivityWithStatus[];
  participantId: string | null;
  isAdmin: boolean;
  teamSubmissionStatuses: Record<string, string>;
};

export type HackathonActivitySibling = {
  id: string;
  title: string;
};

export type HackathonActivityBundle = {
  activity: HackathonPhaseActivityDetail | null;
  participant: HackathonParticipant | null;
  pastSubmissions: SubmissionRecord[];
  teammateSubmissions: TeammateSubmissionRecord[];
  siblings: HackathonActivitySibling[];
  blockedMessage: string | null;
  isAdmin: boolean;
};

function buildJourneyPhaseCards(
  home: HackathonProgramHome,
  phaseSummaries: Awaited<ReturnType<typeof getProgramPhaseActivitySummaries>>,
  submissionStatuses: Record<string, string>,
): HackathonJourneyPhaseCard[] {
  const currentPhaseId = home.enrollment?.current_phase_id;
  let foundActive = false;

  const cards = home.phases.filter(Boolean).map((phase) => {
    const phaseData = phaseSummaries.find((summary) => summary.id === phase.id);
    const activities = phaseData?.activities ?? [];
    const isPhaseActive =
      phase.status === "released" && phase.id === currentPhaseId;

    if (isPhaseActive) foundActive = true;

    const completedCount = activities.filter(Boolean).filter((activity) => {
      const status = submissionStatuses[activity.id];
      return (
        status === "submitted" ||
        status === "graded" ||
        status === "completed" ||
        status === "passed"
      );
    }).length;

    return {
      phase,
      activityTitles: activities.filter(Boolean).map((activity) => activity.title),
      activityCount: activities.length,
      completedCount,
      isActive: isPhaseActive,
    };
  });

  if (!foundActive && cards.length > 0) {
    const releasedCurrentPhase = getCurrentReleasedPhase(
      cards.map((card) => card.phase),
    );
    const firstReleasedIncomplete = cards.find(
      (card) =>
        card.phase.status === "released" &&
        card.completedCount < card.activityCount,
    );
    const fallbackCard =
      firstReleasedIncomplete ??
      cards.find((card) => card.phase.id === releasedCurrentPhase?.id) ??
      null;

    if (fallbackCard) {
      fallbackCard.isActive = true;
    }
  }

  return cards;
}

async function createHomeBundle(): Promise<HackathonHomeBundle> {
  const home = await getCurrentHackathonProgramHome();
  const teamId = home.team?.id;

  return {
    currentPhase: getCurrentReleasedPhase(home.phases),
    impact: teamId ? await fetchTeamImpact(teamId).catch(() => null) : null,
  };
}

async function createJourneyBundle(): Promise<HackathonJourneyBundle> {
  const home = await getCurrentHackathonProgramHome();
  const teamId = home.team?.id;
  const impactPromise = teamId ? fetchTeamImpact(teamId).catch(() => null) : Promise.resolve(null);
  const participant = await readHackathonParticipant();
  const isAdmin = await checkIsHackathonAdmin(participant);

  if (!home.program || home.phases.length === 0) {
    return {
      data: home,
      impact: await impactPromise,
      phaseCards: [],
      isAdmin,
    };
  }

  const phaseSummaries = await getProgramPhaseActivitySummaries(home.program.id);
  const allActivityIds = phaseSummaries.flatMap((phase) =>
    (phase.activities ?? []).filter(Boolean).map((activity) => activity.id),
  );
  const submissionStatuses = await fetchActivitySubmissionStatuses(allActivityIds);

  return {
    data: home,
    impact: await impactPromise,
    phaseCards: buildJourneyPhaseCards(home, phaseSummaries, submissionStatuses),
    isAdmin,
  };
}

async function checkIsHackathonAdmin(participant: HackathonParticipant | null): Promise<boolean> {
  if (isHackathonAdminEmail(participant?.email)) {
    console.log("[AdminBypass] Email match:", participant?.email);
    return true;
  }

  // Check user_roles table for admin role using current auth user
  const { data: { user } } = await supabase.auth.getUser();
  console.log("[AdminBypass] Supabase auth user:", user?.id, "participant email:", participant?.email);
  if (!user) return false;

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  console.log("[AdminBypass] user_roles check result:", data);
  return !!data;
}

async function createPhaseBundle(phaseId: string): Promise<HackathonPhaseBundle> {
  const [phase, participant] = await Promise.all([
    getPhaseWithActivities(phaseId),
    Promise.resolve(readHackathonParticipant()),
  ]);

  const isAdmin = await checkIsHackathonAdmin(participant);

  if (!phase) {
    return {
      phase: null,
      activities: [],
      participantId: participant?.id ?? null,
      isAdmin,
      teamSubmissionStatuses: {},
    };
  }

  if (!participant?.id || phase.activities.length === 0) {
    return {
      phase,
      activities: (phase.activities ?? []).filter(Boolean).map((activity) => ({
        ...activity,
        submissionStatus: "not_started",
      })),
      participantId: participant?.id ?? null,
      isAdmin,
      teamSubmissionStatuses: {},
    };
  }

  const activityIds = (phase.activities ?? []).filter(Boolean).map((activity) => activity.id);
  const [statuses, teamStatuses] = await Promise.all([
    fetchActivitySubmissionStatuses(activityIds),
    fetchTeamActivitySubmissionStatuses(activityIds),
  ]);

  return {
    phase,
    activities: (phase.activities ?? []).filter(Boolean).map((activity) => ({
      ...activity,
      submissionStatus:
        (statuses[activity.id] as HackathonPhaseActivitySubmissionStatus | undefined) ??
        "not_started",
    })),
    participantId: participant.id,
    isAdmin,
    teamSubmissionStatuses: teamStatuses,
  };
}

async function buildActivitySiblings(
  activity: HackathonPhaseActivityDetail,
  isAdmin: boolean,
): Promise<{
  blockedMessage: string | null;
  siblings: HackathonActivitySibling[];
}> {
  if (!activity.phase_id) {
    return { blockedMessage: null, siblings: [] };
  }

  const [{ data: phaseData }, { data: siblingRows }] = await Promise.all([
    supabase
      .from("hackathon_program_phases")
      .select("status")
      .eq("id", activity.phase_id)
      .maybeSingle(),
    supabase
      .from("hackathon_phase_activities")
      .select("id, title, display_order, status, is_draft, submission_scope")
      .eq("phase_id", activity.phase_id)
      .order("display_order", { ascending: true }),
  ]);

  const visibleSiblings = (siblingRows ?? []).filter(Boolean).filter((row) => !row.is_draft);
  if (visibleSiblings.length === 0) {
    return { blockedMessage: null, siblings: [] };
  }

  const siblingIds = visibleSiblings.filter(Boolean).map((sibling) => sibling.id);
  const [siblingSubmissionStatuses, siblingTeamStatuses] = await Promise.all([
    fetchActivitySubmissionStatuses(siblingIds),
    fetchTeamActivitySubmissionStatuses(siblingIds),
  ]);

  function getPrevStatus(index: number): HackathonPhaseActivitySubmissionStatus | null {
    if (index <= 0) return null;
    const prev = visibleSiblings[index - 1]!;
    const isTeam = prev.submission_scope === "team";
    const status = isTeam
      ? (siblingTeamStatuses[prev.id] ?? null)
      : (siblingSubmissionStatuses[prev.id] ?? null);
    return (status as HackathonPhaseActivitySubmissionStatus | null) ?? "not_started";
  }

  const siblingsWithAccess = visibleSiblings.filter(Boolean).map((sibling, index) => ({
    id: sibling.id,
    title: sibling.title,
    accessible: isHackathonActivityAccessible({
      phaseStatus: phaseData?.status,
      activityStatus: sibling.status,
      previousActivitySubmissionStatus: getPrevStatus(index),
      isAdmin,
    }),
  }));

  const currentIndex = visibleSiblings.findIndex((sibling) => sibling.id === activity.id);
  const previousSubmissionStatus = getPrevStatus(currentIndex);
  const currentAccessible = isHackathonActivityAccessible({
    phaseStatus: phaseData?.status,
    activityStatus: activity.status,
    previousActivitySubmissionStatus: previousSubmissionStatus,
    isAdmin,
  });

  return {
    blockedMessage: currentAccessible
      ? null
      : phaseData?.status !== "released" || activity.status !== "released"
        ? "This activity has not been released yet."
        : "Complete the previous activity first.",
    siblings: siblingsWithAccess
      .filter((sibling) => sibling.accessible)
      .map(({ id, title }) => ({ id, title })),
  };
}

async function createActivityBundle(activityId: string): Promise<HackathonActivityBundle> {
  const [activity, pastSubmissions, teammateSubmissions, participant] =
    await Promise.all([
      getHackathonActivityDetail(activityId),
      fetchActivitySubmissions(activityId),
      fetchTeammateActivitySubmissions(activityId),
      Promise.resolve(readHackathonParticipant()),
    ]);

  const isAdmin = await checkIsHackathonAdmin(participant);

  if (!activity) {
    return {
      activity: null,
      participant,
      pastSubmissions,
      teammateSubmissions,
      siblings: [],
      blockedMessage: null,
      isAdmin,
    };
  }

  const { siblings, blockedMessage } = await buildActivitySiblings(activity, isAdmin);

  return {
    activity,
    participant,
    pastSubmissions,
    teammateSubmissions,
    siblings,
    blockedMessage,
    isAdmin,
  };
}

export function getCachedHackathonHomeBundle() {
  return readFresh(homeBundleCache, cacheKeys.home);
}

export async function loadHackathonHomeBundle(options?: { forceRefresh?: boolean }) {
  return loadCached(
    homeBundleCache,
    homeInflight,
    cacheKeys.home,
    createHomeBundle,
    options?.forceRefresh,
  );
}

export function preloadHackathonHomeBundle() {
  return loadHackathonHomeBundle().then(() => undefined);
}

export function getCachedHackathonJourneyBundle() {
  return readFresh(journeyBundleCache, cacheKeys.journey);
}

export async function loadHackathonJourneyBundle(options?: { forceRefresh?: boolean }) {
  return loadCached(
    journeyBundleCache,
    journeyInflight,
    cacheKeys.journey,
    createJourneyBundle,
    options?.forceRefresh,
  );
}

export function preloadHackathonJourneyBundle() {
  return loadHackathonJourneyBundle().then(() => undefined);
}

export function getCachedHackathonPhaseBundle(phaseId: string) {
  return readFresh(phaseBundleCache, phaseId);
}

export async function loadHackathonPhaseBundle(
  phaseId: string,
  options?: { forceRefresh?: boolean },
) {
  return loadCached(
    phaseBundleCache,
    phaseInflight,
    phaseId,
    () => createPhaseBundle(phaseId),
    options?.forceRefresh,
  );
}

export function preloadHackathonPhaseBundle(phaseId: string) {
  return loadHackathonPhaseBundle(phaseId).then(() => undefined);
}

export function getCachedHackathonActivityBundle(activityId: string) {
  return readFresh(activityBundleCache, activityId);
}

export async function loadHackathonActivityBundle(
  activityId: string,
  options?: { forceRefresh?: boolean },
) {
  return loadCached(
    activityBundleCache,
    activityInflight,
    activityId,
    () => createActivityBundle(activityId),
    options?.forceRefresh,
  );
}

export function preloadHackathonActivityBundle(activityId: string) {
  return loadHackathonActivityBundle(activityId).then(() => undefined);
}

export function clearHackathonScreenDataCache() {
  homeBundleCache.clear();
  journeyBundleCache.clear();
  phaseBundleCache.clear();
  activityBundleCache.clear();
  homeInflight.clear();
  journeyInflight.clear();
  phaseInflight.clear();
  activityInflight.clear();
}

export function invalidateHackathonProgressCache() {
  homeBundleCache.clear();
  journeyBundleCache.clear();
  phaseBundleCache.clear();
  activityBundleCache.clear();
}
