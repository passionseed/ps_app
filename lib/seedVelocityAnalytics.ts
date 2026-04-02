import type { Seed } from "../types/seeds";

type SeedAnalyticsContext = Pick<Seed, "id" | "category_id" | "tags">;
type SeedAnalyticsPayloadContext = Pick<Seed, "id" | "title" | "category_id" | "tags">;

type SeedEventParams = {
  seed: SeedAnalyticsContext;
  pathId: string;
  enrollmentId: string;
};

type SeedAnalyticsPayloadParams = {
  seed: SeedAnalyticsPayloadContext;
  pathId: string | null;
};

function normalizeSeedTags(tags: string[] | null | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function buildSeedContext(seed: SeedAnalyticsContext) {
  return {
    seed_id: seed.id,
    seed_category_id: seed.category_id ?? null,
    seed_tags: normalizeSeedTags(seed.tags),
  };
}

export function buildSeedStartedEventData({
  seed,
  pathId,
  enrollmentId,
}: SeedEventParams) {
  return {
    ...buildSeedContext(seed),
    path_id: pathId,
    enrollment_id: enrollmentId,
    source: "seed_detail" as const,
  };
}

export function buildSeedCompletedEventData({
  seed,
  pathId,
  enrollmentId,
  dayNumber,
}: SeedEventParams & { dayNumber: number }) {
  return {
    ...buildSeedContext(seed),
    path_id: pathId,
    enrollment_id: enrollmentId,
    day_number: dayNumber,
    completion_type: "final_reflection" as const,
  };
}

export function buildDirectionFinderViewedEventData() {
  return {
    source: "profile_ikigai" as const,
  };
}

export function buildSeedAnalyticsPayload({
  seed,
  pathId,
}: SeedAnalyticsPayloadParams) {
  return {
    seed_id: seed.id,
    path_id: pathId,
    seed_title: seed.title,
    category_id: seed.category_id ?? null,
    tags: normalizeSeedTags(seed.tags),
  };
}

export function getCompletedSeedMilestone(completedSeeds: number) {
  if (completedSeeds === 1 || completedSeeds === 2 || completedSeeds === 3 || completedSeeds === 5) {
    return completedSeeds;
  }

  return null;
}
