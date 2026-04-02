// PathLab API functions for mobile app
import { supabase } from "./supabase";
import { getResetTimestamp, clearResetTimestamp } from "./pathlabSession";
import {
  getPathNotificationEventsForEnrollment,
  getPathNotificationEventsForReflection,
  sendPathNotificationEvent,
} from "./pathNotifications";

// ============ Activity Cache ============
// Short-lived cache so navigating from path screen → activity screen
// doesn't re-fetch data that was just loaded. Expires after 30s.
interface ActivityCacheEntry {
  activities: PathActivityWithContent[];
  pathDayId: string;
  enrollmentId: string;
  ts: number;
}
let _activityCache: ActivityCacheEntry | null = null;
const CACHE_TTL_MS = 30_000;

async function dispatchPathNotificationEvents(
  events: ReturnType<typeof getPathNotificationEventsForReflection>,
) {
  for (const event of events) {
    try {
      await sendPathNotificationEvent(event);
    } catch (error) {
      console.warn("[notifications] Failed to send path notification event", {
        event,
        error,
      });
    }
  }
}

export function setCachedActivities(
  pathDayId: string,
  enrollmentId: string,
  activities: PathActivityWithContent[]
) {
  _activityCache = { activities, pathDayId, enrollmentId, ts: Date.now() };
}

export function getCachedActivity(
  activityId: string,
  enrollmentId: string
): PathActivityWithContent | null {
  if (!_activityCache) return null;
  if (_activityCache.enrollmentId !== enrollmentId) return null;
  if (Date.now() - _activityCache.ts > CACHE_TTL_MS) {
    _activityCache = null;
    return null;
  }
  return _activityCache.activities.find(a => a.id === activityId) ?? null;
}

export function getCachedDayActivities(
  enrollmentId: string
): PathActivityWithContent[] | null {
  if (!_activityCache) return null;
  if (_activityCache.enrollmentId !== enrollmentId) return null;
  if (Date.now() - _activityCache.ts > CACHE_TTL_MS) {
    _activityCache = null;
    return null;
  }
  return _activityCache.activities;
}

export function invalidateActivityCache() {
  _activityCache = null;
}
import type {
  Seed,
  SeedWithEnrollment,
  SeedNpcAvatar,
} from "../types/seeds";
import type {
  Path,
  PathDay,
  PathEnrollment,
  PathReflection,
  PathReflectionDecision,
} from "../types/pathlab";
import type { MapNode, StudentNodeProgress } from "../types/map";
import type {
  PathActivity,
  PathActivityWithContent,
  PathContent,
  PathAssessment,
  PathAssessmentWithQuestions,
  PathQuizQuestion,
  PathActivityProgress,
  PathAssessmentSubmission,
} from "../types/pathlab-content";
import {
  buildFallbackRecommendations,
  isRecommendationPayloadFresh,
  readCachedPathDayBundle,
  readCachedSeedRecommendations,
  type SeedRecommendationsPayload,
  writeCachedPathDayBundle,
  writeCachedSeedRecommendations,
} from "./seedRecommendations";
import { logSeedCompleted } from "./eventLogger";
import {
  buildSeedAnalyticsPayload,
  getCompletedSeedMilestone,
} from "./seedVelocityAnalytics";
import { computeAffinityProfile } from "./userSignals";

export type EnrollmentWithPath = PathEnrollment & {
  path: {
    id: string;
    total_days: number;
    seed: {
      id: string;
      title: string;
    };
  };
};

export interface PathDayBundle {
  enrollment: EnrollmentWithPath;
  pathDay: PathDay;
  activities: PathActivityWithContent[];
  loadedAt?: number;
}

const RETRYABLE_STATUS_CODES = ["408", "425", "429", "500", "502", "503", "504", "520", "521", "522", "523", "524", "525", "526"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringifyError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isRetryableSupabaseError(error: unknown) {
  const message = stringifyError(error).toLowerCase();

  return (
    message.includes("ssl handshake failed") ||
    message.includes("cloudflare") ||
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("<!doctype html>") ||
    RETRYABLE_STATUS_CODES.some((code) => message.includes(`error code ${code}`) || message.includes(`status ${code}`))
  );
}

function toUserFacingPathlabError(error: unknown, fallback: string) {
  const message = stringifyError(error);

  if (isRetryableSupabaseError(error)) {
    return `${fallback}. The connection to our server failed temporarily. Please try again.`;
  }

  return message || fallback;
}

async function withSupabaseRetry<T>(
  task: () => Promise<T>,
  fallback: string,
  attempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (!isRetryableSupabaseError(error) || attempt === attempts) {
        throw new Error(toUserFacingPathlabError(error, fallback));
      }

      await sleep(250 * attempt);
    }
  }

  throw new Error(toUserFacingPathlabError(lastError, fallback));
}

// ============ Seeds ============

/** Shown on Discover; users already enrolled may still access other visibilities. */
export function isPathlabSeedExploreVisible(
  visibility: string | null | undefined
): boolean {
  return visibility === "visible" || visibility === "featured";
}

type GetAvailableSeedsOptions = {
  userId?: string | null;
  forceRefresh?: boolean;
};

const AVAILABLE_SEEDS_CACHE_TTL_MS = 5 * 60 * 1000;
const availableSeedsInFlight = new Map<string, Promise<SeedWithEnrollment[]>>();
const recommendedSeedsInFlight = new Map<string, Promise<SeedRecommendationsPayload>>();
const availableSeedsCache = new Map<
  string,
  { data: SeedWithEnrollment[]; cachedAt: number }
>();
const recommendedSeedsCache = new Map<
  string,
  { data: SeedRecommendationsPayload; cachedAt: number }
>();

function getDiscoverCacheKey(userId?: string | null): string {
  return userId ?? "__public__";
}

function isFresh(cachedAt: number, ttlMs: number): boolean {
  return Date.now() - cachedAt <= ttlMs;
}

function readAvailableSeedsMemoryCache(
  userId?: string | null,
): SeedWithEnrollment[] | null {
  const entry = availableSeedsCache.get(getDiscoverCacheKey(userId));
  if (!entry || !isFresh(entry.cachedAt, AVAILABLE_SEEDS_CACHE_TTL_MS)) {
    return null;
  }
  return entry.data;
}

function writeAvailableSeedsMemoryCache(
  userId: string | null | undefined,
  data: SeedWithEnrollment[],
) {
  availableSeedsCache.set(getDiscoverCacheKey(userId), {
    data,
    cachedAt: Date.now(),
  });
}

function readRecommendedSeedsMemoryCache(
  userId?: string | null,
): SeedRecommendationsPayload | null {
  const entry = recommendedSeedsCache.get(getDiscoverCacheKey(userId));
  if (!entry || !isRecommendationPayloadFresh(entry.data)) {
    return null;
  }
  return entry.data;
}

function writeRecommendedSeedsMemoryCache(
  userId: string | null | undefined,
  data: SeedRecommendationsPayload,
) {
  recommendedSeedsCache.set(getDiscoverCacheKey(userId), {
    data,
    cachedAt: Date.now(),
  });
}

export function getCachedAvailableSeeds(
  userId?: string | null,
): SeedWithEnrollment[] | null {
  return readAvailableSeedsMemoryCache(userId);
}

export function getCachedRecommendedSeeds(
  userId?: string | null,
): SeedRecommendationsPayload | null {
  return readRecommendedSeedsMemoryCache(userId);
}

async function loadAvailableSeeds({
  userId,
}: GetAvailableSeedsOptions = {}): Promise<SeedWithEnrollment[]> {
  const sessionUserId = (await supabase.auth.getSession()).data.session?.user?.id ?? null;
  const resolvedUserId = userId ?? sessionUserId;

  return withSupabaseRetry(async () => {
    console.log("[getAvailableSeeds] Starting query...");

    const seedSelect = "*, paths(id, seed_id, total_days)";
    type SeedRow = Omit<Seed, "path"> & {
      paths?:
        | Array<{ id: string; seed_id: string; total_days: number }>
        | { id: string; seed_id: string; total_days: number }
        | null;
    };
    const mapSeedRow = (seed: Record<string, unknown>): Seed => {
      const seedRow = seed as unknown as SeedRow;
      const pathsVal = seedRow.paths;
      return {
        ...seedRow,
        path: Array.isArray(pathsVal)
          ? ((pathsVal[0] as Seed["path"]) ?? null)
          : ((pathsVal as Seed["path"]) ?? null),
      };
    };

    const { data: visibleRows, error: visibleError } = await supabase
      .from("seeds")
      .select(seedSelect)
      .eq("seed_type", "pathlab")
      .in("visibility", ["visible", "featured"])
      .order("created_at", { ascending: false });

    if (visibleError) {
      console.error("Error loading seeds:", visibleError);
      throw visibleError;
    }

    let seeds = (visibleRows ?? []).map((row) =>
      mapSeedRow(row as Record<string, unknown>)
    );

    console.log("[getAvailableSeeds] Query result:", {
      count: seeds.length,
      sampleSeed: seeds[0],
    });

    if (seeds.length === 0) {
      console.log("[getAvailableSeeds] No PathLab seeds found in database");
      return [];
    }

    const pathIds = seeds
      .map((seed) => seed.path?.id)
      .filter((id): id is string => Boolean(id));

    if (resolvedUserId) {
      if (pathIds.length > 0) {
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("path_enrollments")
          .select("id, path_id, current_day, status")
          .eq("user_id", resolvedUserId)
          .in("path_id", pathIds);

        if (enrollmentsError) throw enrollmentsError;

        const enrollmentByPathId = new Map(enrollments?.map((e) => [e.path_id, e]) ?? []);
        return seeds.map((seed) => ({
          ...seed,
          enrollment: seed.path?.id ? enrollmentByPathId.get(seed.path.id) ?? null : null,
        }));
      }
    }

    return seeds.map(s => ({ ...s, enrollment: null }));
  }, "Unable to load paths");
}

export async function getAvailableSeeds(
  options: GetAvailableSeedsOptions = {}
): Promise<SeedWithEnrollment[]> {
  const resolvedUserId =
    options.userId === undefined
      ? (await supabase.auth.getSession()).data.session?.user?.id ?? null
      : options.userId;

  if (!options.forceRefresh) {
    const cached = readAvailableSeedsMemoryCache(resolvedUserId);
    if (cached) return cached;
  }

  const requestKey = getDiscoverCacheKey(resolvedUserId);
  const inFlight = availableSeedsInFlight.get(requestKey);
  if (inFlight) return inFlight;

  const promise = loadAvailableSeeds({
    ...options,
    userId: resolvedUserId,
  })
    .then((data) => {
      writeAvailableSeedsMemoryCache(resolvedUserId, data);
      return data;
    })
    .finally(() => {
      if (availableSeedsInFlight.get(requestKey) === promise) {
        availableSeedsInFlight.delete(requestKey);
      }
    });

  availableSeedsInFlight.set(requestKey, promise);
  return promise;
}

export async function getSeedById(seedId: string): Promise<Seed | null> {
  // Check if this is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(seedId)) {
    console.log("[getSeedById] Invalid UUID format, skipping database query:", seedId);
    return null;
  }

  return withSupabaseRetry(async () => {
    const [
      { data: seedData, error: seedError },
      { data: pathData, error: pathError },
    ] = await Promise.all([
      supabase
        .from("seeds")
        .select("*")
        .eq("id", seedId)
        .maybeSingle(),
      supabase
        .from("paths")
        .select("id, total_days")
        .eq("seed_id", seedId)
        .maybeSingle(),
    ]);

    if (seedError) {
      console.error("Error loading seed:", seedError);
      throw seedError;
    }

    if (pathError) {
      throw pathError;
    }

    if (!seedData) return null;

    const seed = {
      ...seedData,
      path: pathData || null,
    } as Seed;

    if (
      seed.seed_type === "pathlab" &&
      !isPathlabSeedExploreVisible(seed.visibility)
    ) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || !pathData?.id) return null;
      const { data: enrollmentRow } = await supabase
        .from("path_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("path_id", pathData.id)
        .maybeSingle();
      if (!enrollmentRow) return null;
    }

    return seed;
  }, "Unable to load this path");
}

export interface ExpertInfo {
  name: string;
  title: string;
  company: string;
}

export async function getExpertForSeed(seedId: string): Promise<ExpertInfo | null> {
  // Check if this is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(seedId)) {
    return null;
  }

  return withSupabaseRetry(async () => {
    const { data: pathlabData, error: pathlabError } = await supabase
      .from("expert_pathlabs")
      .select("expert_profile_id")
      .eq("seed_id", seedId)
      .maybeSingle();

    if (pathlabError || !pathlabData) return null;

    const { data: expertData, error: expertError } = await supabase
      .from("expert_profiles")
      .select("name, title, company")
      .eq("id", pathlabData.expert_profile_id)
      .maybeSingle();

    if (expertError || !expertData) return null;

    return expertData;
  }, "Unable to load expert details");
}

export async function getSeedNpcAvatar(seedId: string): Promise<SeedNpcAvatar | null> {
  // Check if this is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(seedId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("seed_npc_avatars")
    .select("*")
    .eq("seed_id", seedId)
    .maybeSingle();

  if (error) {
    console.error("Error loading NPC avatar:", error);
    return null;
  }

  return data;
}

// ============ Path Enrollment ============

export async function getPathBySeedId(seedId: string): Promise<Path | null> {
  // Check if this is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(seedId)) {
    return null;
  }

  return withSupabaseRetry(async () => {
    const { data, error } = await supabase
      .from("paths")
      .select("*")
      .eq("seed_id", seedId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, "Unable to load this path");
}

export async function getUserEnrollment(pathId: string): Promise<PathEnrollment | null> {
  return withSupabaseRetry(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("path_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("path_id", pathId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, "Unable to load your progress");
}

export async function enrollInPath(params: {
  pathId: string;
  whyJoined?: string;
}): Promise<PathEnrollment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check for existing enrollment
  const { data: existing } = await supabase
    .from("path_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("path_id", params.pathId)
    .maybeSingle();

  if (existing) {
    // Resume existing enrollment
    const { data, error } = await supabase
      .from("path_enrollments")
      .update({
        status: existing.status === "explored" ? "explored" : "active",
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data: pathRow, error: pathLookupError } = await supabase
    .from("paths")
    .select("seed_id")
    .eq("id", params.pathId)
    .maybeSingle();
  if (pathLookupError) throw new Error(pathLookupError.message);
  if (!pathRow?.seed_id) throw new Error("Path not found");

  const { data: seedRow, error: seedLookupError } = await supabase
    .from("seeds")
    .select("visibility, seed_type")
    .eq("id", pathRow.seed_id)
    .maybeSingle();
  if (seedLookupError) throw new Error(seedLookupError.message);
  if (
    seedRow?.seed_type === "pathlab" &&
    !isPathlabSeedExploreVisible(seedRow.visibility)
  ) {
    throw new Error("This path is not available to join right now.");
  }

  // Create new enrollment
  const { data, error } = await supabase
    .from("path_enrollments")
    .insert({
      user_id: user.id,
      path_id: params.pathId,
      why_joined: params.whyJoined || null,
      current_day: 1,
      status: "active",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  await dispatchPathNotificationEvents(getPathNotificationEventsForEnrollment());
  return data;
}

// ============ Path Days & Activities ============

export async function getPathDay(pathId: string, dayNumber: number): Promise<PathDay | null> {
  return withSupabaseRetry(async () => {
    const { data, error } = await supabase
      .from("path_days")
      .select("*")
      .eq("path_id", pathId)
      .eq("day_number", dayNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, "Unable to load this day");
}

export async function getEnrollmentDayBundle(
  enrollmentId: string
): Promise<PathDayBundle | null> {
  try {
    const bundle = await withSupabaseRetry(async () => {
      const { data: enrollmentData, error: enrollError } = await supabase
        .from("path_enrollments")
        .select(`
          *,
          path:paths(
            id,
            total_days,
            seed:seeds(id, title)
          )
        `)
        .eq("id", enrollmentId)
        .single();

      if (enrollError) throw enrollError;
      if (!enrollmentData) return null;
      if (!enrollmentData.path_id || !enrollmentData.current_day || enrollmentData.current_day < 1) {
        throw new Error("Enrollment is missing path_id or current_day");
      }

      const pathDay = await getPathDay(enrollmentData.path_id, enrollmentData.current_day);
      if (!pathDay) return null;

      const activities = await getPathDayActivities(pathDay.id, enrollmentId);

      return {
        enrollment: enrollmentData as EnrollmentWithPath,
        pathDay,
        activities,
      };
    }, "Unable to load your current day");

    if (bundle) {
      await writeCachedPathDayBundle(enrollmentId, {
        ...bundle,
        loadedAt: Date.now(),
      });
    }

    return bundle;
  } catch (error) {
    const cached = await readCachedPathDayBundle(enrollmentId);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export async function getPathDays(pathId: string): Promise<Pick<PathDay, "id" | "day_number" | "title">[]> {
  return withSupabaseRetry(async () => {
    const { data, error } = await supabase
      .from("path_days")
      .select("id, day_number, title")
      .eq("path_id", pathId)
      .order("day_number", { ascending: true });

    if (error) throw error;
    return (data || []) as Pick<PathDay, "id" | "day_number" | "title">[];
  }, "Unable to load the path outline");
}

// NEW: Get activities for a specific day
export async function getPathDayActivities(
  pathDayId: string,
  enrollmentId?: string
): Promise<PathActivityWithContent[]> {
  return withSupabaseRetry(async () => {
    const { data: activities, error: activitiesError } = await supabase
      .from("path_activities")
      .select("*")
      .eq("path_day_id", pathDayId)
      .eq("is_draft", false)
      .order("display_order", { ascending: true });

    if (activitiesError) throw activitiesError;
    if (!activities || activities.length === 0) return [];

    const activityIds = activities.map(a => a.id);

    const [
      { data: content, error: contentError },
      { data: assessments, error: assessmentsError },
      { data: progressData, error: progressError },
    ] = await Promise.all([
      supabase
        .from("path_content")
        .select("*")
        .in("activity_id", activityIds)
        .order("display_order", { ascending: true }),
      supabase
        .from("path_assessments")
        .select("*")
        .in("activity_id", activityIds),
      enrollmentId
        ? supabase
            .from("path_activity_progress")
            .select("*")
            .eq("enrollment_id", enrollmentId)
            .in("activity_id", activityIds)
        : Promise.resolve({ data: [] as PathActivityProgress[], error: null }),
    ]);

    if (contentError) throw contentError;
    if (assessmentsError) throw assessmentsError;
    if (progressError) throw progressError;

    let progress: PathActivityProgress[] = progressData || [];
    console.log("[getPathDayActivities] Raw progress from DB:", progress.map(p => ({ id: p.id, activity_id: p.activity_id, status: p.status })));

    // If a reset happened recently, discard any progress rows that predate the reset
    if (enrollmentId) {
      const resetAt = getResetTimestamp(enrollmentId);
      if (resetAt) {
        const before = progress.length;
        progress = progress.filter(p => new Date(p.updated_at).getTime() > resetAt);
        console.log(`[getPathDayActivities] Reset filter: ${before} -> ${progress.length} rows`);
        // Keep the timestamp for 30s to handle repeated fetches from PostgREST cache
        if (Date.now() - resetAt > 30_000) clearResetTimestamp(enrollmentId);
      }
    }

    // Fetch assessment submissions for completed activities
    let submissions: PathAssessmentSubmission[] = [];
    const completedProgressIds = progress.filter(p => p.status === "completed").map(p => p.id);
    if (completedProgressIds.length > 0) {
      const { data: submissionData } = await supabase
        .from("path_assessment_submissions")
        .select("*")
        .in("progress_id", completedProgressIds);
      submissions = submissionData || [];
    }

    // Only fetch quiz questions for quiz-type assessments
    let quizQuestions: PathQuizQuestion[] = [];
    const quizAssessments = (assessments || []).filter(a => a.assessment_type === 'quiz');
    if (quizAssessments.length > 0) {
      const assessmentIds = quizAssessments.map(a => a.id);
      const { data: questions, error: questionsError } = await supabase
        .from("path_quiz_questions")
        .select("*")
        .in("assessment_id", assessmentIds);

      if (questionsError) throw questionsError;
      quizQuestions = questions || [];
    }

    return activities.map(activity => {
      const activityContent = (content || []).filter(c => c.activity_id === activity.id);
      const activityAssessments = (assessments || []).filter(a => a.activity_id === activity.id);

      let pathAssessment = null;
      if (activityAssessments.length > 0) {
        pathAssessment = {
          ...activityAssessments[0],
          quiz_questions: quizQuestions.filter(q => q.assessment_id === activityAssessments[0].id),
        };
      }

      const activityProgress = progress.find(p => p.activity_id === activity.id);
      const activitySubmission = activityProgress
        ? submissions.find(s => s.progress_id === activityProgress.id) ?? null
        : null;

      return {
        ...activity,
        path_content: activityContent,
        path_assessment: pathAssessment,
        progress: activityProgress,
        submission: activitySubmission,
      };
    });
  }, "Unable to load day activities");
}

export async function ensureActivityProgress(
  enrollmentId: string,
  activityId: string
): Promise<PathActivityProgress> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("path_activity_progress")
    .insert({
      enrollment_id: enrollmentId,
      activity_id: activityId,
      status: "in_progress",
      started_at: now,
    })
    .select()
    .single();

  if (!error && data) {
    return data;
  }

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  const { data: existingProgress, error: existingProgressError } = await supabase
    .from("path_activity_progress")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("activity_id", activityId)
    .single();

  if (existingProgressError) {
    throw new Error(existingProgressError.message);
  }

  return existingProgress;
}

// NEW: Update activity progress
export async function updateActivityProgress(params: {
  enrollmentId: string;
  activityId: string;
  status: "in_progress" | "completed" | "skipped";
  timeSpentSeconds?: number;
}): Promise<void> {
  const now = new Date().toISOString();

  const updateData: any = {
    enrollment_id: params.enrollmentId,
    activity_id: params.activityId,
    status: params.status,
    updated_at: now,
  };

  if (params.status === "in_progress" && !updateData.started_at) {
    updateData.started_at = now;
  }

  if (params.status === "completed") {
    updateData.completed_at = now;
  }

  if (params.timeSpentSeconds !== undefined) {
    updateData.time_spent_seconds = params.timeSpentSeconds;
  }

  const { error } = await supabase
    .from("path_activity_progress")
    .upsert(updateData, {
      onConflict: "enrollment_id,activity_id",
    });

  if (error) throw new Error(error.message);
}

// Reset enrollment progress (for testing)
export async function resetEnrollment(enrollmentId: string): Promise<void> {
  const { data: progressRows, error: fetchError } = await supabase
    .from("path_activity_progress")
    .select("id")
    .eq("enrollment_id", enrollmentId);

  console.log("[Reset] Progress rows to delete:", progressRows?.length, fetchError?.message);

  // Delete assessment submissions first (FK constraint)
  if (progressRows && progressRows.length > 0) {
    const progressIds = progressRows.map(r => r.id);
    const { error: subError } = await supabase
      .from("path_assessment_submissions")
      .delete()
      .in("progress_id", progressIds);
    console.log("[Reset] Submissions delete error:", subError?.message ?? "none");
  }

  const { error: progressError } = await supabase
    .from("path_activity_progress")
    .delete()
    .eq("enrollment_id", enrollmentId);
  console.log("[Reset] Progress delete error:", progressError?.message ?? "none");

  await supabase
    .from("path_reflections")
    .delete()
    .eq("enrollment_id", enrollmentId);

  const { error } = await supabase
    .from("path_enrollments")
    .update({ current_day: 1, status: "active" })
    .eq("id", enrollmentId);

  console.log("[Reset] Enrollment update error:", error?.message ?? "none");
  if (error) throw new Error(error.message);

  // Bust PostgREST cache with a no-op update touch on the enrollment
  await supabase
    .from("path_enrollments")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", enrollmentId);
}

// NEW: Submit assessment
export async function submitAssessment(params: {
  progressId: string;
  assessmentId: string;
  textAnswer?: string;
  fileUrls?: string[];
  imageUrl?: string;
  quizAnswers?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<PathAssessmentSubmission> {
  const { data, error } = await supabase
    .from("path_assessment_submissions")
    .insert({
      progress_id: params.progressId,
      assessment_id: params.assessmentId,
      text_answer: params.textAnswer || null,
      file_urls: params.fileUrls || null,
      image_url: params.imageUrl || null,
      quiz_answers: params.quizAnswers || null,
      metadata: params.metadata || null,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// LEGACY: Keep for backwards compatibility during transition
export async function getNodesByIds(nodeIds: string[]): Promise<MapNode[]> {
  if (nodeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("map_nodes")
    .select(`
      *,
      node_content(*),
      node_assessments(
        id,
        assessment_type,
        quiz_questions(*)
      )
    `)
    .in("id", nodeIds);

  if (error) throw new Error(error.message);

  // Map database schema to mobile app schema
  return (data || []).map(node => ({
    ...node,
    content: node.metadata || {},
    position_x: 0,
    position_y: 0,
  }));
}

// LEGACY: Keep for backwards compatibility during transition
export async function getNodeProgress(nodeIds: string[]): Promise<StudentNodeProgress[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || nodeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("student_node_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("node_id", nodeIds);

  if (error) throw new Error(error.message);
  return data || [];
}

// LEGACY: Keep for backwards compatibility during transition
export async function updateNodeProgress(params: {
  nodeId: string;
  status: string;
  submission?: Record<string, unknown>;
}): Promise<StudentNodeProgress> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("student_node_progress")
    .upsert({
      user_id: user.id,
      node_id: params.nodeId,
      status: params.status,
      submission: params.submission || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,node_id",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ============ Reflections ============

export async function submitDailyReflection(params: {
  enrollmentId: string;
  dayNumber: number;
  energyLevel: number;
  confusionLevel: number;
  interestLevel: number;
  openResponse?: string;
  decision: PathReflectionDecision;
  timeSpentMinutes?: number;
}): Promise<PathReflection> {
  console.log('[submitDailyReflection] Inserting reflection:', params);

  const reflectionData = {
    enrollment_id: params.enrollmentId,
    day_number: params.dayNumber,
    energy_level: params.energyLevel,
    confusion_level: params.confusionLevel,
    interest_level: params.interestLevel,
    open_response: params.openResponse || null,
    decision: params.decision,
    time_spent_minutes: params.timeSpentMinutes || null,
  };

  console.log('[submitDailyReflection] Reflection data to insert:', reflectionData);

  const { data, error } = await supabase
    .from("path_reflections")
    .insert(reflectionData)
    .select()
    .single();

  console.log('[submitDailyReflection] Insert result:', { data, error });

  if (error) {
    console.error('[submitDailyReflection] Insert error:', error);
    throw new Error(error.message);
  }

  // Update enrollment based on decision
  console.log('[submitDailyReflection] Updating enrollment based on decision:', params.decision);

  if (params.decision === "continue_tomorrow" || params.decision === "continue_now") {
    const { data: updateData, error: updateError } = await supabase
      .from("path_enrollments")
      .update({ current_day: params.dayNumber + 1 })
      .eq("id", params.enrollmentId)
      .select();
    console.log('[submitDailyReflection] Enrollment update (continue):', { updateData, updateError });
  } else if (params.decision === "pause") {
    const { data: updateData, error: updateError } = await supabase
      .from("path_enrollments")
      .update({ status: "paused" })
      .eq("id", params.enrollmentId)
      .select();
    console.log('[submitDailyReflection] Enrollment update (pause):', { updateData, updateError });
  } else if (params.decision === "quit") {
    const { data: updateData, error: updateError } = await supabase
      .from("path_enrollments")
      .update({ status: "quit" })
      .eq("id", params.enrollmentId)
      .select();
    console.log('[submitDailyReflection] Enrollment update (quit):', { updateData, updateError });
  } else if (params.decision === "final_reflection") {
    const { data: updateData, error: updateError } = await supabase
      .from("path_enrollments")
      .update({ status: "explored", completed_at: new Date().toISOString() })
      .eq("id", params.enrollmentId)
      .select();
    console.log('[submitDailyReflection] Enrollment update (final):', { updateData, updateError });
    await logSeedCompletionAnalytics(params.enrollmentId);
  }

  await dispatchPathNotificationEvents(
    getPathNotificationEventsForReflection({
      completedDayNumber: params.dayNumber,
      decision: params.decision,
    }),
  );

  console.log('[submitDailyReflection] Complete! Returning data:', data);
  return data;
}

async function logSeedCompletionAnalytics(enrollmentId: string): Promise<void> {
  try {
    const { data: enrollmentRow, error: enrollmentError } = await supabase
      .from("path_enrollments")
      .select("id, user_id, path_id")
      .eq("id", enrollmentId)
      .single();

    if (enrollmentError || !enrollmentRow?.user_id || !enrollmentRow?.path_id) {
      return;
    }

    const { data: pathRow, error: pathError } = await supabase
      .from("paths")
      .select("seed:seeds(id, title, category_id, tags)")
      .eq("id", enrollmentRow.path_id)
      .single();

    if (pathError) {
      return;
    }

    const seedRow = Array.isArray(pathRow?.seed) ? pathRow.seed[0] : pathRow?.seed;
    if (!seedRow?.id || !seedRow?.title) {
      return;
    }

    const { count, error: countError } = await supabase
      .from("path_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", enrollmentRow.user_id)
      .eq("status", "explored");

    if (countError) {
      return;
    }

    const completedSeedCount = count ?? 0;
    const payload = buildSeedAnalyticsPayload({
      seed: {
        id: seedRow.id,
        title: seedRow.title,
        category_id: seedRow.category_id ?? null,
        tags: seedRow.tags ?? [],
      },
      pathId: enrollmentRow.path_id,
    });

    await logSeedCompleted({
      enrollmentId,
      seedId: payload.seed_id,
      pathId: payload.path_id,
      seedTitle: payload.seed_title,
      categoryId: payload.category_id,
      tags: payload.tags,
      completedSeedCount,
      milestoneSeedCount: getCompletedSeedMilestone(completedSeedCount),
    });
  } catch (error) {
    console.error("[submitDailyReflection] Seed analytics logging failed:", error);
  }
}

export async function getReflectionsForEnrollment(enrollmentId: string): Promise<PathReflection[]> {
  const { data, error } = await supabase
    .from("path_reflections")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("day_number", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// ============ User Enrollments ============

export async function getUserActiveEnrollments() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: enrollments, error: enrollError } = await supabase
    .from("path_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "paused"])
    .order("enrolled_at", { ascending: false });

  if (enrollError) {
    console.error("Error loading active enrollments:", enrollError);
    throw new Error(enrollError.message);
  }

  if (!enrollments || enrollments.length === 0) return [];

  // Get paths for these enrollments
  const pathIds = enrollments.map(e => e.path_id);
  const { data: paths } = await supabase
    .from("paths")
    .select("*")
    .in("id", pathIds);

  if (!paths) return enrollments;

  // Get seeds for these paths
  const seedIds = paths.map(p => p.seed_id);
  const { data: seeds } = await supabase
    .from("seeds")
    .select("*")
    .in("id", seedIds);

  // Combine the data
  return enrollments.map(enrollment => ({
    ...enrollment,
    path: {
      ...paths.find(p => p.id === enrollment.path_id),
      seed: seeds?.find(s => s.id === paths.find(p => p.id === enrollment.path_id)?.seed_id),
    },
  }));
}

export async function getUserCompletedEnrollments() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: enrollments, error: enrollError } = await supabase
    .from("path_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "explored")
    .order("completed_at", { ascending: false });

  if (enrollError) {
    console.error("Error loading completed enrollments:", enrollError);
    throw new Error(enrollError.message);
  }

  if (!enrollments || enrollments.length === 0) return [];

  // Get paths for these enrollments
  const pathIds = enrollments.map(e => e.path_id);
  const { data: paths } = await supabase
    .from("paths")
    .select("*")
    .in("id", pathIds);

  if (!paths) return enrollments;

  // Get seeds for these paths
  const seedIds = paths.map(p => p.seed_id);
  const { data: seeds } = await supabase
    .from("seeds")
    .select("*")
    .in("id", seedIds);

  // Combine the data
  return enrollments.map(enrollment => ({
    ...enrollment,
    path: {
      ...paths.find(p => p.id === enrollment.path_id),
      seed: seeds?.find(s => s.id === paths.find(p => p.id === enrollment.path_id)?.seed_id),
    },
  }));
}

export async function getRecommendedSeeds(options?: {
  forceRefresh?: boolean;
  fallbackSeeds?: SeedWithEnrollment[];
  userId?: string | null;
}): Promise<SeedRecommendationsPayload> {
  const resolvedUserId =
    options?.userId === undefined
      ? (await supabase.auth.getSession()).data.session?.user?.id ?? null
      : options.userId;

  try {
    if (!options?.forceRefresh) {
      const cached = readRecommendedSeedsMemoryCache(resolvedUserId);
      if (cached) {
        return cached;
      }
    }

    const requestKey = `${getDiscoverCacheKey(resolvedUserId)}:${options?.forceRefresh ? "refresh" : "default"}`;
    const inFlight = recommendedSeedsInFlight.get(requestKey);
    if (inFlight) {
      return await inFlight;
    }

    const promise = (async () => {
      const { data, error } = await supabase.functions.invoke("seed-recommendations", {
        body: {
          force_refresh: options?.forceRefresh ?? false,
        },
      });

      if (error) {
        throw error;
      }

      await writeCachedSeedRecommendations(data as SeedRecommendationsPayload);
      writeRecommendedSeedsMemoryCache(
        resolvedUserId,
        data as SeedRecommendationsPayload,
      );
      return data as SeedRecommendationsPayload;
    })().finally(() => {
      if (recommendedSeedsInFlight.get(requestKey) === promise) {
        recommendedSeedsInFlight.delete(requestKey);
      }
    });

    recommendedSeedsInFlight.set(requestKey, promise);
    return await promise;
  } catch (error) {
    const cached = await readCachedSeedRecommendations();
    if (cached) {
      writeRecommendedSeedsMemoryCache(resolvedUserId, cached);
      return {
        ...cached,
        source: "cache",
      };
    }

    const availableSeeds =
      options?.fallbackSeeds ??
      await getAvailableSeeds({ userId: resolvedUserId });
    const affinity = resolvedUserId
      ? await computeAffinityProfile(resolvedUserId)
      : null;
    const fallback = buildFallbackRecommendations(availableSeeds, affinity);
    writeRecommendedSeedsMemoryCache(resolvedUserId, fallback);
    return fallback;
  }
}

export async function preloadDiscoverData(options?: {
  userId?: string | null;
  includeRecommendations?: boolean;
}): Promise<void> {
  try {
    const seeds = await getAvailableSeeds({ userId: options?.userId });
    if (options?.includeRecommendations) {
      await getRecommendedSeeds({
        userId: options?.userId,
        fallbackSeeds: seeds,
      });
    }
  } catch (error) {
    console.warn("[preloadDiscoverData] Prefetch failed:", error);
  }
}
