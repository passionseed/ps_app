import type {
  HackathonPhaseWithActivities,
  HackathonPhaseActivityDetail,
} from "../types/hackathon-phase-activity";

async function getSupabaseClient() {
  const mod = await import("./supabase");
  return mod.supabase;
}

/**
 * Fetch a single phase with all its activities (content + assessments).
 * Used for the hackathon home screen phase card.
 */
export async function getPhaseWithActivities(
  phaseId: string
): Promise<HackathonPhaseWithActivities | null> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("hackathon_program_phases")
    .select(`
      id,
      program_id,
      slug,
      title,
      description,
      phase_number,
      status,
      starts_at,
      ends_at,
      due_at,
      hackathon_phase_activities (
        id,
        phase_id,
        title,
        instructions,
        display_order,
        estimated_minutes,
        is_required,
        is_draft,
        status,
        submission_scope,
        created_at,
        updated_at,
        hackathon_phase_activity_content (
          id,
          activity_id,
          content_type,
          content_title,
          content_url,
          content_body,
          display_order,
          metadata,
          created_at
        ),
        hackathon_phase_activity_assessments (
          id,
          activity_id,
          assessment_type,
          display_order,
          points_possible,
          is_graded,
          metadata,
          created_at,
          updated_at
        )
      )
    `)
    .eq("id", phaseId)
    .single();

  if (error || !data) return null;

  const activities: HackathonPhaseActivityDetail[] = (
    (data.hackathon_phase_activities as any[]) ?? []
  )
    .filter((a) => !a.is_draft)
    .sort((a, b) => a.display_order - b.display_order)
    .map((a) => ({
      ...a,
      content: (a.hackathon_phase_activity_content ?? []).sort(
        (x: any, y: any) => x.display_order - y.display_order
      ),
      assessments: (a.hackathon_phase_activity_assessments ?? []).sort(
        (x: any, y: any) => x.display_order - y.display_order
      ),
      submission_scope: (a.submission_scope ?? "individual") as "individual" | "team",
    }));

  return {
    id: data.id,
    program_id: data.program_id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    phase_number: data.phase_number,
    status: data.status,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    due_at: (data as any).due_at ?? null,
    activities,
  };
}

/**
 * Fetch all phases for a program that have at least one activity.
 * Used to render the home screen phase list.
 */
export async function getProgramPhasesWithActivities(
  programId: string
): Promise<HackathonPhaseWithActivities[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("hackathon_program_phases")
    .select(`
      id,
      program_id,
      slug,
      title,
      description,
      phase_number,
      status,
      starts_at,
      ends_at,
      due_at,
      hackathon_phase_activities (
        id,
        phase_id,
        title,
        instructions,
        display_order,
        estimated_minutes,
        is_required,
        is_draft,
        status,
        submission_scope,
        created_at,
        updated_at,
        hackathon_phase_activity_content (
          id,
          activity_id,
          content_type,
          content_title,
          content_url,
          content_body,
          display_order,
          metadata,
          created_at
        ),
        hackathon_phase_activity_assessments (
          id,
          activity_id,
          assessment_type,
          display_order,
          points_possible,
          is_graded,
          metadata,
          created_at,
          updated_at
        )
      )
    `)
    .eq("program_id", programId)
    .order("phase_number");

  if (error || !data) return [];

  return data.map((phase) => {
    const activities: HackathonPhaseActivityDetail[] = (
      (phase.hackathon_phase_activities as any[]) ?? []
    )
      .filter((a) => !a.is_draft)
      .sort((a, b) => a.display_order - b.display_order)
      .map((a) => ({
        ...a,
        content: (a.hackathon_phase_activity_content ?? []).sort(
          (x: any, y: any) => x.display_order - y.display_order
        ),
        assessments: (a.hackathon_phase_activity_assessments ?? []).sort(
          (x: any, y: any) => x.display_order - y.display_order
        ),
      }));

    return {
      id: phase.id,
      program_id: phase.program_id,
      slug: phase.slug,
      title: phase.title,
      description: phase.description,
      phase_number: phase.phase_number,
      status: phase.status,
      starts_at: phase.starts_at,
      ends_at: phase.ends_at,
      due_at: (phase as any).due_at ?? null,
      activities,
    };
  });
}

export async function getHackathonActivityDetail(
  activityId: string,
): Promise<HackathonPhaseActivityDetail | null> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("hackathon_phase_activities")
    .select(`
      id,
      phase_id,
      title,
      instructions,
      display_order,
      status,
      estimated_minutes,
      is_required,
      is_draft,
      submission_scope,
      created_at,
      updated_at,
      hackathon_phase_activity_content (
        id,
        activity_id,
        content_type,
        content_title,
        content_url,
        content_body,
        display_order,
        metadata,
        created_at
      ),
      hackathon_phase_activity_assessments (
        id,
        activity_id,
        assessment_type,
        display_order,
        points_possible,
        is_graded,
        metadata,
        created_at,
        updated_at
      )
    `)
    .eq("id", activityId)
    .single();

  if (error || !data) return null;

  return {
    ...(data as any),
    content: ((data as any).hackathon_phase_activity_content ?? []).sort(
      (a: any, b: any) => a.display_order - b.display_order,
    ),
    assessments: ((data as any).hackathon_phase_activity_assessments ?? []).sort(
      (a: any, b: any) => a.display_order - b.display_order,
    ),
    submission_scope: ((data as any).submission_scope ??
      "individual") as "individual" | "team",
  };
}

type HackathonProgramPhaseActivitySummary = {
  id: string;
  status: "locked" | "released";
  activities: Array<{
    id: string;
    title: string;
    display_order: number;
    status: "locked" | "released";
  }>;
};

export async function getProgramPhaseActivitySummaries(
  programId: string
): Promise<HackathonProgramPhaseActivitySummary[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("hackathon_program_phases")
    .select(`
      id,
      status,
      hackathon_phase_activities (
        id,
        title,
        display_order,
        status,
        is_draft
      )
    `)
    .eq("program_id", programId)
    .order("phase_number");

  if (error || !data) return [];

  return data.map((phase) => ({
    id: phase.id,
    status: phase.status,
    activities: ((phase.hackathon_phase_activities as any[]) ?? [])
      .filter((activity) => !activity.is_draft)
      .sort((a, b) => a.display_order - b.display_order)
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        display_order: activity.display_order,
        status: activity.status,
      })),
  }));
}
