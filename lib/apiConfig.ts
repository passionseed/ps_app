const DEFAULT_API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "";

export function getApiUrl(path: string): string {
  if (!DEFAULT_API_BASE) {
    return "";
  }
  
  const base = DEFAULT_API_BASE.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  
  return `${base}${normalizedPath}`;
}

export function isApiConfigured(): boolean {
  return Boolean(DEFAULT_API_BASE);
}

export const apiEndpoints = {
  hackathon: {
    homeBundle: (participantId: string) => 
      `/api/hackathon/home-bundle?participant_id=${encodeURIComponent(participantId)}`,
    team: (teamId: string) => 
      `/api/hackathon/team/${encodeURIComponent(teamId)}`,
    phase: (phaseId: string) => 
      `/api/hackathon/phase/${encodeURIComponent(phaseId)}`,
    programPhases: (programId: string) => 
      `/api/hackathon/program/${encodeURIComponent(programId)}/phases`,
  },
};
