// PathLab API functions for mobile app
import { supabase } from "./supabase";
import type { Seed, SeedWithEnrollment, SeedNpcAvatar } from "../types/seeds";
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

// ============ Seeds ============

export async function getAvailableSeeds(): Promise<SeedWithEnrollment[]> {
  const { data: { user } } = await supabase.auth.getUser();

  console.log("[getAvailableSeeds] Starting query...");

  // Get seeds
  const { data: seedsData, error: seedsError } = await supabase
    .from("seeds")
    .select("*")
    .eq("seed_type", "pathlab")
    .order("created_at", { ascending: false });

  console.log("[getAvailableSeeds] Query result:", {
    count: seedsData?.length || 0,
    error: seedsError,
    sampleSeed: seedsData?.[0],
  });

  if (seedsError) {
    console.error("Error loading seeds:", seedsError);
    throw new Error(seedsError.message);
  }

  if (!seedsData || seedsData.length === 0) {
    console.log("[getAvailableSeeds] No PathLab seeds found in database");
    return [];
  }

  // Get paths for these seeds
  const { data: pathsData } = await supabase
    .from("paths")
    .select("id, seed_id, total_days")
    .in("seed_id", seedsData.map(s => s.id));

  // Combine seeds with their paths
  const seeds = seedsData.map(seed => ({
    ...seed,
    path: pathsData?.find(p => p.seed_id === seed.id) || null,
  })) as Seed[];

  // If user is logged in, get their enrollments
  if (user) {
    const pathIds = seeds.map(s => s.path?.id).filter(Boolean);

    if (pathIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("path_enrollments")
        .select("id, path_id, current_day, status")
        .eq("user_id", user.id)
        .in("path_id", pathIds);

      return seeds.map(seed => ({
        ...seed,
        enrollment: enrollments?.find(e => e.path_id === seed.path?.id) || null,
      }));
    }
  }

  return seeds.map(s => ({ ...s, enrollment: null }));
}

export async function getSeedById(seedId: string): Promise<Seed | null> {
  const { data: seedData, error: seedError } = await supabase
    .from("seeds")
    .select("*")
    .eq("id", seedId)
    .maybeSingle();

  if (seedError) {
    console.error("Error loading seed:", seedError);
    throw new Error(seedError.message);
  }

  if (!seedData) return null;

  // Get the path for this seed
  const { data: pathData } = await supabase
    .from("paths")
    .select("id, total_days")
    .eq("seed_id", seedId)
    .maybeSingle();

  return {
    ...seedData,
    path: pathData || null,
  } as Seed;
}

export async function getSeedNpcAvatar(seedId: string): Promise<SeedNpcAvatar | null> {
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
  const { data, error } = await supabase
    .from("paths")
    .select("*")
    .eq("seed_id", seedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getUserEnrollment(pathId: string): Promise<PathEnrollment | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("path_enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("path_id", pathId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
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
  return data;
}

// ============ Path Days & Activities ============

export async function getPathDay(pathId: string, dayNumber: number): Promise<PathDay | null> {
  const { data, error } = await supabase
    .from("path_days")
    .select("*")
    .eq("path_id", pathId)
    .eq("day_number", dayNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getPathDays(pathId: string): Promise<PathDay[]> {
  const { data, error } = await supabase
    .from("path_days")
    .select("day_number, title")
    .eq("path_id", pathId)
    .order("day_number", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// NEW: Get activities for a specific day
export async function getPathDayActivities(
  pathDayId: string,
  enrollmentId?: string
): Promise<PathActivityWithContent[]> {
  // Get activities
  const { data: activities, error: activitiesError } = await supabase
    .from("path_activities")
    .select("*")
    .eq("path_day_id", pathDayId)
    .eq("is_draft", false)
    .order("display_order", { ascending: true });

  if (activitiesError) throw new Error(activitiesError.message);
  if (!activities || activities.length === 0) return [];

  const activityIds = activities.map(a => a.id);

  // Get content for these activities
  const { data: content } = await supabase
    .from("path_content")
    .select("*")
    .in("activity_id", activityIds)
    .order("display_order", { ascending: true });

  // Get assessments for these activities
  const { data: assessments } = await supabase
    .from("path_assessments")
    .select("*")
    .in("activity_id", activityIds);

  // Get quiz questions if there are any quiz assessments
  let quizQuestions: PathQuizQuestion[] = [];
  if (assessments && assessments.length > 0) {
    const assessmentIds = assessments.map(a => a.id);
    const { data: questions } = await supabase
      .from("path_quiz_questions")
      .select("*")
      .in("assessment_id", assessmentIds);
    quizQuestions = questions || [];
  }

  // Get progress if enrollment ID provided
  let progress: PathActivityProgress[] = [];
  if (enrollmentId) {
    const { data: progressData } = await supabase
      .from("path_activity_progress")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .in("activity_id", activityIds);
    progress = progressData || [];
  }

  // Combine everything - new schema: path_content and path_assessment
  return activities.map(activity => {
    const activityContent = (content || []).filter(c => c.activity_id === activity.id);
    const activityAssessments = (assessments || []).filter(a => a.activity_id === activity.id);

    // Build path_assessment (single assessment or null)
    let pathAssessment = null;
    if (activityAssessments.length > 0) {
      pathAssessment = {
        ...activityAssessments[0],
        quiz_questions: quizQuestions.filter(q => q.assessment_id === activityAssessments[0].id),
      };
    }

    return {
      ...activity,
      path_content: activityContent,
      path_assessment: pathAssessment,
      progress: progress.find(p => p.activity_id === activity.id),
    };
  });
}

// NEW: Update activity progress
export async function updateActivityProgress(params: {
  enrollmentId: string;
  activityId: string;
  status: "in_progress" | "completed" | "skipped";
  timeSpentSeconds?: number;
}): Promise<PathActivityProgress> {
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

  const { data, error } = await supabase
    .from("path_activity_progress")
    .upsert(updateData, {
      onConflict: "enrollment_id,activity_id",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
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
  const { data, error } = await supabase
    .from("path_reflections")
    .insert({
      enrollment_id: params.enrollmentId,
      day_number: params.dayNumber,
      energy_level: params.energyLevel,
      confusion_level: params.confusionLevel,
      interest_level: params.interestLevel,
      open_response: params.openResponse || null,
      decision: params.decision,
      time_spent_minutes: params.timeSpentMinutes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update enrollment based on decision
  if (params.decision === "continue_tomorrow" || params.decision === "continue_now") {
    await supabase
      .from("path_enrollments")
      .update({ current_day: params.dayNumber + 1 })
      .eq("id", params.enrollmentId);
  } else if (params.decision === "pause") {
    await supabase
      .from("path_enrollments")
      .update({ status: "paused" })
      .eq("id", params.enrollmentId);
  } else if (params.decision === "quit") {
    await supabase
      .from("path_enrollments")
      .update({ status: "quit" })
      .eq("id", params.enrollmentId);
  } else if (params.decision === "final_reflection") {
    await supabase
      .from("path_enrollments")
      .update({ status: "explored", completed_at: new Date().toISOString() })
      .eq("id", params.enrollmentId);
  }

  return data;
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
