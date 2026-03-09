import { supabase } from "./supabase";

export async function getJourneySimulations() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("journey_simulations")
    .select(`
      id,
      label,
      passion_score,
      aptitude_score,
      journey_score,
      passion_confidence,
      pivot_triggered,
      pathlab_ids,
      university_ids,
      jobs (
        id, title, viability_score, demand_trend
      )
    `)
    .eq("student_id", user.id);

  if (error) {
    console.error("Error fetching simulations:", error);
    throw error;
  }
  return data;
}

export async function getUniversities(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase
    .from("universities")
    .select("id, name, programs")
    .in("id", ids);

  if (error) throw error;
  return data;
}

export async function getPathLabs(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase
    .from("paths")
    .select(`
      id,
      seeds ( title )
    `)
    .in("id", ids);

  if (error) throw error;
  return data;
}

// Helper to assemble full payload for the UI
export async function getFullJourneyBoardData() {
  const sims = await getJourneySimulations();

  const allUniIds = new Set<string>();
  const allPathIds = new Set<string>();

  sims.forEach((sim) => {
    (sim.university_ids || []).forEach((id: string) => allUniIds.add(id));
    (sim.pathlab_ids || []).forEach((id: string) => allPathIds.add(id));
  });

  const [unis, paths] = await Promise.all([
    getUniversities(Array.from(allUniIds)),
    getPathLabs(Array.from(allPathIds)),
  ]);

  const uniMap = new Map(unis.map((u) => [u.id, u]));
  const pathMap = new Map(paths.map((p) => [p.id, p]));

  return sims.map((sim) => {
    // Supabase might return a single object or array depending on the foreign key setup
    const jobData: any = Array.isArray(sim.jobs) && sim.jobs.length > 0 ? sim.jobs[0] : (!Array.isArray(sim.jobs) ? sim.jobs : null);

    return {
      id: sim.id,
      label: sim.label || "My Journey",
      passion_score: sim.passion_score,
      aptitude_score: sim.aptitude_score,
      journey_score: sim.journey_score,
      passion_confidence: sim.passion_confidence || "low",
      pivot_triggered: sim.pivot_triggered,
      job: jobData
        ? {
            id: jobData.id,
            title: jobData.title,
            viabilityScore: jobData.viability_score,
            trend: jobData.demand_trend,
          }
        : null,
      universities: (sim.university_ids || [])
        .map((id: string) => {
          const u = uniMap.get(id);
          return u
            ? {
                id: u.id,
                name: u.name,
                programs:
                  Array.isArray(u.programs) && u.programs.length > 0
                    ? [(u.programs[0] as any).name]
                    : ["Degree Program"],
                duration:
                  Array.isArray(u.programs) && u.programs.length > 0
                    ? `${(u.programs[0] as any).duration_yrs} yrs`
                    : "3 yrs",
              }
            : null;
        })
        .filter(Boolean),
      pathlabs: (sim.pathlab_ids || [])
        .map((id: string) => {
          const p = pathMap.get(id);
          return p
            ? {
                id: p.id,
                title: (p.seeds as any)?.title || "Unknown Path",
                completed: false, // Defaulting for now
                passionScore: sim.passion_score,
              }
            : null;
        })
        .filter(Boolean),
    };
  });
}
