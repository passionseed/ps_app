// @ts-nocheck
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function normalizeWords(input: unknown): string[] {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

async function readLatestTimestamp(
  supabase: ReturnType<typeof createClient>,
  table: string,
  userId: string,
  columns: string[],
): Promise<string | null> {
  for (const column of columns) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .eq("user_id", userId)
        .order(column, { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.[column]) {
        return String(data[column]);
      }
    } catch {
      // Ignore unknown-column errors and try the next candidate.
    }
  }

  return null;
}

async function getLatestSignalTimestamp(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data: enrollmentRows } = await supabase
    .from("path_enrollments")
    .select("id")
    .eq("user_id", userId);

  const enrollmentIds = (enrollmentRows ?? []).map((row) => row.id);
  const reflectionTimestamp = enrollmentIds.length
    ? await supabase
        .from("path_reflections")
        .select("created_at")
        .in("enrollment_id", enrollmentIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => (data?.created_at ? String(data.created_at) : null))
        .catch(() => null)
    : null;

  const timestamps = await Promise.all([
    readLatestTimestamp(supabase, "profiles", userId, ["updated_at", "created_at"]),
    readLatestTimestamp(supabase, "user_interests", userId, ["updated_at", "created_at"]),
    readLatestTimestamp(supabase, "career_goals", userId, ["updated_at", "created_at"]),
    readLatestTimestamp(supabase, "path_enrollments", userId, ["updated_at", "completed_at", "enrolled_at"]),
    Promise.resolve(reflectionTimestamp),
  ]);

  const mostRecent = timestamps
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return mostRecent ?? new Date(0).toISOString();
}

type SeedRecord = {
  id: string;
  title: string;
  description: string | null;
  slogan: string | null;
  cover_image_url: string | null;
  cover_image_blurhash: string | null;
  cover_image_key: string | null;
  cover_image_updated_at: string | null;
  category_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  paths:
    | {
        id: string;
        seed_id: string;
        total_days: number;
      }[]
    | null;
};

type EnrollmentRecord = {
  id: string;
  path_id: string;
  current_day: number;
  status: string;
  enrolled_at?: string | null;
  completed_at?: string | null;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getEmptySocialProof() {
  return {
    exploringCount: 0,
    completedCount: 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let forceRefresh = false;
  try {
    const body = await req.json();
    forceRefresh = Boolean(body?.force_refresh);
  } catch {
    forceRefresh = false;
  }

  const latestSignalAt = await getLatestSignalTimestamp(service, user.id);
  const { data: cachedSnapshot } = await service
    .from("seed_recommendation_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date();
  if (
    !forceRefresh &&
    cachedSnapshot?.snapshot &&
    cachedSnapshot.version === SNAPSHOT_VERSION &&
    new Date(cachedSnapshot.expires_at).getTime() > now.getTime() &&
    new Date(cachedSnapshot.source_updated_at).getTime() >=
      new Date(latestSignalAt).getTime()
  ) {
    return json({
      ...cachedSnapshot.snapshot,
      source: "cache",
    });
  }

  const [
    { data: profileData },
    { data: interestsData },
    { data: careersData },
    { data: seedsData, error: seedsError },
    { data: enrollmentsData },
  ] = await Promise.all([
    service
      .from("profiles")
      .select("preferred_language, school_name, education_level")
      .eq("id", user.id)
      .maybeSingle(),
    service.from("user_interests").select("*").eq("user_id", user.id),
    service.from("career_goals").select("*").eq("user_id", user.id),
    service
      .from("seeds")
      .select("id, title, description, slogan, cover_image_url, cover_image_blurhash, cover_image_key, cover_image_updated_at, category_id, created_by, created_at, updated_at, paths(id, seed_id, total_days)")
      .eq("seed_type", "pathlab")
      .in("visibility", ["visible", "featured"])
      .order("created_at", { ascending: false }),
    service
      .from("path_enrollments")
      .select("id, path_id, current_day, status, enrolled_at, completed_at")
      .eq("user_id", user.id),
  ]);

  if (seedsError) {
    return json({ error: seedsError.message }, 500);
  }

  const seeds = (seedsData ?? []) as SeedRecord[];
  const enrollments = (enrollmentsData ?? []) as EnrollmentRecord[];
  const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
  const pathIds = seeds
    .map((seed) => (Array.isArray(seed.paths) ? seed.paths[0]?.id : null))
    .filter((pathId): pathId is string => Boolean(pathId));

  const { data: allSeedEnrollments } = pathIds.length
    ? await service
        .from("path_enrollments")
        .select("path_id, status")
        .in("path_id", pathIds)
    : { data: [] };

  const socialProofByPathId = new Map<string, ReturnType<typeof getEmptySocialProof>>();
  for (const enrollment of allSeedEnrollments ?? []) {
    const socialProof =
      socialProofByPathId.get(enrollment.path_id) ?? getEmptySocialProof();

    if (enrollment.status === "active" || enrollment.status === "paused") {
      socialProof.exploringCount += 1;
    } else if (enrollment.status === "explored") {
      socialProof.completedCount += 1;
    }

    socialProofByPathId.set(enrollment.path_id, socialProof);
  }

  const { data: reflectionsData } = enrollmentIds.length
    ? await service
        .from("path_reflections")
        .select("enrollment_id, interest_level, energy_level, confusion_level, created_at")
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  const reflectionsByEnrollment = new Map<string, typeof reflectionsData>();
  for (const reflection of reflectionsData ?? []) {
    const existing = reflectionsByEnrollment.get(reflection.enrollment_id) ?? [];
    existing.push(reflection);
    reflectionsByEnrollment.set(reflection.enrollment_id, existing);
  }

  const keywordPool = uniq([
    ...(interestsData ?? []).flatMap((interest) => [
      ...normalizeWords(interest.category_name),
      ...((interest.selected ?? []) as string[]).flatMap((value) =>
        normalizeWords(value),
      ),
      ...((interest.statements ?? []) as string[]).flatMap((value) =>
        normalizeWords(value),
      ),
    ]),
    ...(careersData ?? []).flatMap((career) =>
      normalizeWords(career.career_name),
    ),
    ...normalizeWords(profileData?.school_name),
    ...normalizeWords(profileData?.education_level),
  ]);

  const recommendations = seeds.map((seed) => {
    const path = Array.isArray(seed.paths) ? (seed.paths[0] ?? null) : null;
    const enrollment = enrollments.find((item) => item.path_id === path?.id) ?? null;
    const reflections = enrollment ? reflectionsByEnrollment.get(enrollment.id) ?? [] : [];
    const socialProof = path?.id
      ? socialProofByPathId.get(path.id) ?? getEmptySocialProof()
      : getEmptySocialProof();
    const haystack = normalizeWords(
      [seed.title, seed.slogan, seed.description].filter(Boolean).join(" "),
    );
    const keywordMatches = uniq(
      keywordPool.filter((keyword) => haystack.includes(keyword)),
    );
    const affinityScore = Math.min(100, 20 + keywordMatches.length * 14);
    const reflectionInterest = average(
      reflections.map((reflection) => Number(reflection.interest_level ?? 0)),
    );
    const reflectionEnergy = average(
      reflections.map((reflection) => Number(reflection.energy_level ?? 0)),
    );
    const reflectionPenalty = average(
      reflections.map((reflection) => Number(reflection.confusion_level ?? 0)),
    );
    const explored = Boolean(enrollment);
    const daysCompleted = enrollment
      ? Math.max(
          0,
          enrollment.status === "explored"
            ? path?.total_days ?? enrollment.current_day ?? 0
            : (enrollment.current_day ?? 1) - 1,
        )
      : 0;
    const gapScore = explored ? Math.max(10, 45 - daysCompleted * 6) : 85;
    const recommendationScore = Math.max(
      0,
      Math.min(
        100,
        affinityScore +
          gapScore * 0.35 +
          reflectionInterest * 6 +
          reflectionEnergy * 4 -
          reflectionPenalty * 5 +
          (enrollment?.status === "active" ? 20 : 0),
      ),
    );

    const reasons = [];
    if (enrollment?.status === "active" || enrollment?.status === "paused") {
      reasons.push({
        code: "active_path",
        label: "Continue momentum",
        detail: `You're already on day ${enrollment.current_day}.`,
      });
    }
    if (keywordMatches.length > 0) {
      reasons.push({
        code: "interest_match",
        label: "Matches your interests",
        detail: `Matched ${keywordMatches.slice(0, 3).join(", ")}.`,
      });
    }
    if ((careersData ?? []).some((career) => haystack.includes(String(career.career_name).toLowerCase()))) {
      reasons.push({
        code: "career_match",
        label: "Aligned with your career goals",
        detail: "This path overlaps with careers you selected.",
      });
    }
    if (!explored) {
      reasons.push({
        code: "coverage_gap",
        label: "Expand your coverage",
        detail: "You have not explored this path yet.",
      });
    }
    if (reflectionInterest >= 4 || reflectionEnergy >= 4) {
      reasons.push({
        code: "momentum",
        label: "High recent momentum",
        detail: "Recent reflections show strong interest or energy.",
      });
    }

    let bucket: "continue" | "recommended" | "explore_more" | "deprioritized" =
      "deprioritized";
    if (enrollment?.status === "active" || enrollment?.status === "paused") {
      bucket = "continue";
    } else if (recommendationScore >= 70) {
      bucket = "recommended";
    } else if (recommendationScore >= 40) {
      bucket = "explore_more";
    }

    return {
      id: seed.id,
      map_id: "" as string,
      title: seed.title,
      description: seed.description,
      slogan: seed.slogan,
      cover_image_url: seed.cover_image_url,
      cover_image_blurhash: seed.cover_image_blurhash,
      cover_image_key: seed.cover_image_key,
      cover_image_updated_at: seed.cover_image_updated_at,
      category_id: seed.category_id,
      created_by: seed.created_by,
      created_at: seed.created_at,
      updated_at: seed.updated_at,
      path,
      socialProof,
      enrollment: enrollment
        ? {
            id: enrollment.id,
            current_day: enrollment.current_day,
            status: enrollment.status,
            isDoneToday: reflections.some((reflection) => {
              const createdAt = new Date(reflection.created_at);
              return createdAt.toDateString() === now.toDateString();
            }),
          }
        : null,
      affinityScore: Math.round(affinityScore),
      gapScore: Math.round(gapScore),
      recommendationScore: Math.round(recommendationScore),
      bucket,
      reasons: reasons.slice(0, 3),
      coverage: {
        daysCompleted,
        hasExplored: explored,
        reflectionCount: reflections.length,
        totalDays: path?.total_days ?? 0,
      },
    };
  });

  recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

  const exploredCount = recommendations.filter((item) => item.coverage.hasExplored).length;
  const completedCount = recommendations.filter(
    (item) => item.enrollment?.status === "explored",
  ).length;
  const activeCount = recommendations.filter((item) =>
    ["active", "paused"].includes(item.enrollment?.status ?? ""),
  ).length;

  const payload = {
    version: SNAPSHOT_VERSION,
    computedAt: now.toISOString(),
    source: "fresh",
    coverage: {
      activeCount,
      exploredCount,
      completedCount,
      totalCount: recommendations.length,
      completionPercent:
        recommendations.length === 0
          ? 0
          : Math.round((exploredCount / recommendations.length) * 100),
    },
    seeds: recommendations,
  };

  await service.from("seed_recommendation_snapshots").upsert(
    {
      user_id: user.id,
      snapshot: payload,
      version: SNAPSHOT_VERSION,
      source_updated_at: latestSignalAt,
      computed_at: payload.computedAt,
      expires_at: new Date(now.getTime() + SNAPSHOT_TTL_MS).toISOString(),
      updated_at: payload.computedAt,
    },
    { onConflict: "user_id" },
  );

  return json(payload);
});
