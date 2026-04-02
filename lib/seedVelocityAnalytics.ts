import type { Seed } from "../types/seeds";

type SeedAnalyticsContext = Pick<Seed, "id" | "title" | "category_id" | "tags">;
type SeedAnalyticsPayloadParams = {
  seed: SeedAnalyticsContext;
  pathId: string | null;
};

function normalizeSeedTags(tags: string[] | null | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
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

export function buildSeedStartedEventData(params: {
  seed: SeedAnalyticsContext;
  pathId: string;
  enrollmentId: string;
}) {
  return {
    ...buildSeedAnalyticsPayload({
      seed: params.seed,
      pathId: params.pathId,
    }),
    enrollment_id: params.enrollmentId,
    source: "seed_detail" as const,
  };
}

export function buildSeedCompletedEventData(params: {
  enrollmentId: string;
  seedId: string;
  pathId: string | null;
  seedTitle: string;
  categoryId: string | null;
  tags: string[];
  completedSeedCount: number;
  milestoneSeedCount: 1 | 2 | 3 | 5 | null;
}) {
  return {
    enrollment_id: params.enrollmentId,
    seed_id: params.seedId,
    path_id: params.pathId,
    seed_title: params.seedTitle,
    category_id: params.categoryId,
    tags: normalizeSeedTags(params.tags),
    completed_seed_count: params.completedSeedCount,
    milestone_seed_count: params.milestoneSeedCount,
  };
}

export function getCompletedSeedMilestone(completedSeeds: number) {
  if (completedSeeds === 1 || completedSeeds === 2 || completedSeeds === 3 || completedSeeds === 5) {
    return completedSeeds;
  }

  return null;
}
