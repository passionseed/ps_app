import { QueryClient } from "@tanstack/react-query";

/**
 * Optimized React Query client for the Passion Seed app.
 * 
 * Cache Strategy:
 * - staleTime: 5 minutes for reference data (phases, programs, activities)
 * - staleTime: 30 seconds for user-specific data (submissions, progress)
 * - gcTime: 10 minutes to keep data in memory longer
 * - refetchOnWindowFocus: false (mobile app - no window focus)
 * - retry: 2 with exponential backoff
 * 
 * Based on HAR analysis showing 95+ redundant requests to Supabase,
 * primarily for: team_members, submissions, phases, participants.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reference data (phases, programs, activities) - cache 5 min
      staleTime: 1000 * 60 * 5,
      // Keep in garbage collection for 10 min after unused
      gcTime: 1000 * 60 * 10,
      // Don't refetch when app regains focus (mobile)
      refetchOnWindowFocus: false,
      // Don't refetch when reconnecting (we handle this manually)
      refetchOnReconnect: false,
      // Retry failed requests with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

/**
 * Query key factory for consistent cache keys.
 * Organized by feature/domain for easy invalidation.
 */
export const queryKeys = {
  // Hackathon domain
  hackathon: {
    all: ["hackathon"] as const,
    home: () => [...queryKeys.hackathon.all, "home"] as const,
    teamMembership: (participantId: string) =>
      [...queryKeys.hackathon.all, "teamMembership", participantId] as const,
    team: (teamId: string) =>
      [...queryKeys.hackathon.all, "team", teamId] as const,
    program: (programId: string) =>
      [...queryKeys.hackathon.all, "program", programId] as const,
    phases: (programId: string) =>
      [...queryKeys.hackathon.all, "phases", programId] as const,
    phase: (phaseId: string) =>
      [...queryKeys.hackathon.all, "phase", phaseId] as const,
    submissions: (activityId: string) =>
      [...queryKeys.hackathon.all, "submissions", activityId] as const,
    moduleProgress: (moduleId: string, userId: string) =>
      [...queryKeys.hackathon.all, "moduleProgress", moduleId, userId] as const,
    teamScores: (teamId: string) =>
      [...queryKeys.hackathon.all, "teamScores", teamId] as const,
  },

  // Participants
  participants: {
    all: ["participants"] as const,
    detail: (id: string) => [...queryKeys.participants.all, id] as const,
    byTeam: (teamId: string) =>
      [...queryKeys.participants.all, "byTeam", teamId] as const,
  },

  // User profile
  profile: {
    all: ["profile"] as const,
    detail: (userId: string) => [...queryKeys.profile.all, userId] as const,
  },

  // Seeds/Paths
  seeds: {
    all: ["seeds"] as const,
    detail: (id: string) => [...queryKeys.seeds.all, id] as const,
    paths: (seedId: string) => [...queryKeys.seeds.all, "paths", seedId] as const,
  },
};

/**
 * Stale time presets for different data types.
 * Use these when overriding default staleTime for specific queries.
 */
export const staleTimes = {
  // Static reference data - rarely changes
  reference: 1000 * 60 * 30, // 30 minutes
  // User-generated content - might change
  userContent: 1000 * 60 * 2, // 2 minutes
  // Real-time data - changes frequently
  realtime: 1000 * 30, // 30 seconds
  // Progressive data that accumulates
  progressive: 1000 * 60 * 5, // 5 minutes
};
