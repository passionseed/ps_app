// PathLab API functions for mobile app
import { supabase } from "./supabase";
import type { Seed, SeedWithEnrollment } from "../types/seeds";
import type {
  Path,
  PathDay,
  PathEnrollment,
  PathReflection,
  PathReflectionDecision,
} from "../types/pathlab";
import type { MapNode, StudentNodeProgress } from "../types/map";

// ============ Seeds ============

export async function getAvailableSeeds(): Promise<SeedWithEnrollment[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("seeds")
    .select(`
      *,
      category:seed_categories(*),
      path:paths(id, total_days)
    `)
    .eq("seed_type", "pathlab")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // If user is logged in, get their enrollments
  if (user) {
    const seeds = data as Seed[];
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

  return (data as Seed[]).map(s => ({ ...s, enrollment: null }));
}

export async function getSeedById(seedId: string): Promise<Seed | null> {
  const { data, error } = await supabase
    .from("seeds")
    .select(`
      *,
      category:seed_categories(*),
      path:paths(id, total_days)
    `)
    .eq("id", seedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Seed | null;
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

// ============ Path Days & Nodes ============

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

export async function getNodesByIds(nodeIds: string[]): Promise<MapNode[]> {
  if (nodeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("map_nodes")
    .select("*")
    .in("id", nodeIds);

  if (error) throw new Error(error.message);
  return data || [];
}

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

export async function updateNodeProgress(params: {
  nodeId: string;
  status: string;
  submission?: Record<string, unknown>;
  score?: number;
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
      score: params.score || null,
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

  const { data, error } = await supabase
    .from("path_enrollments")
    .select(`
      *,
      path:paths(
        *,
        seed:seeds(*)
      )
    `)
    .eq("user_id", user.id)
    .in("status", ["active", "paused"])
    .order("enrolled_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getUserCompletedEnrollments() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("path_enrollments")
    .select(`
      *,
      path:paths(
        *,
        seed:seeds(*)
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "explored")
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
