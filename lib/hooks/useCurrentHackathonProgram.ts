import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { queryKeys, staleTimes } from "../queryClient";
import type { HackathonProgram } from "../../types/hackathon-program";

async function fetchCurrentHackathonProgram(): Promise<HackathonProgram | null> {
  const { data: programs, error } = await supabase
    .from("hackathon_programs")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("[useCurrentHackathonProgram] failed to load program", error.message);
    return null;
  }

  return programs as HackathonProgram | null;
}

export function useCurrentHackathonProgram() {
  return useQuery({
    queryKey: queryKeys.hackathon.currentProgram(),
    queryFn: fetchCurrentHackathonProgram,
    staleTime: staleTimes.reference,
  });
}
