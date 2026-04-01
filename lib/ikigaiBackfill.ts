type ReflectionRow = {
  id: string;
  enrollment_id: string;
  day_number: number;
  energy_level: number | null;
  confusion_level: number | null;
  interest_level: number | null;
  open_response: string | null;
  created_at: string;
  enrollment: {
    id: string;
    user_id: string;
    status: string;
    path_id: string;
    path?: {
      id: string;
      seed?: {
        id: string;
        title: string | null;
      } | null;
    } | null;
  }[] | null;
};

function normalizeReflections(rows: unknown): ReflectionRow[] {
  return ((rows ?? []) as ReflectionRow[]).map((reflection) => ({
    ...reflection,
    enrollment: Array.isArray(reflection.enrollment)
      ? reflection.enrollment
      : reflection.enrollment
        ? [reflection.enrollment]
        : null,
  }));
}

export async function backfillMissingIkigaiReflections(supabase: any) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated");

  const { data: existingEvents, error: existingEventsError } = await supabase
    .from("score_events")
    .select("reflection_id")
    .eq("user_id", user.id)
    .not("reflection_id", "is", null);

  if (existingEventsError) throw existingEventsError;

  const existingReflectionIds = new Set(
    (existingEvents ?? [])
      .map((event: { reflection_id: string | null }) => event.reflection_id)
      .filter(
        (value: string | null): value is string =>
          typeof value === "string" && value.length > 0
      )
  );

  const { data: reflections, error: reflectionsError } = await supabase
    .from("path_reflections")
    .select(`
      id,
      enrollment_id,
      day_number,
      energy_level,
      confusion_level,
      interest_level,
      open_response,
      created_at,
      enrollment:path_enrollments!inner(
        id,
        user_id,
        status,
        path_id,
        path:paths(
          id,
          seed:seeds(
            id,
            title
          )
        )
      )
    `)
    .eq("path_enrollments.user_id", user.id)
    .not("open_response", "is", null)
    .order("created_at", { ascending: true });

  if (reflectionsError) throw reflectionsError;

  const pendingReflections = normalizeReflections(reflections).filter(
    (reflection) =>
      !existingReflectionIds.has(reflection.id) &&
      typeof reflection.open_response === "string" &&
      reflection.open_response.trim().length > 0 &&
      (reflection.enrollment?.[0]?.user_id ?? null) === user.id
  );

  for (const reflection of pendingReflections) {
    const enrollment = reflection.enrollment?.[0] ?? null;
    const path = Array.isArray(enrollment?.path)
      ? enrollment?.path[0]
      : enrollment?.path;
    const seed = Array.isArray(path?.seed) ? path?.seed[0] : path?.seed;
    const seedTitle = seed?.title ?? undefined;

    const { error } = await supabase.functions.invoke("score-engine/ingest", {
      body: {
        reflectionId: reflection.id,
        enrollmentId: reflection.enrollment_id,
        openResponse: reflection.open_response,
        energyLevel: reflection.energy_level ?? 3,
        confusionLevel: reflection.confusion_level ?? 3,
        interestLevel: reflection.interest_level ?? 3,
        dayNumber: reflection.day_number,
        seedTitle,
      },
    });

    if (error) throw error;
  }

  return {
    processedCount: pendingReflections.length,
  };
}
