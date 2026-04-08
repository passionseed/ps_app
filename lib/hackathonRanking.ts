export type TeamScoreRow = {
  team_id: string;
  total_score: number | null;
};

export function computeTeamRank(
  teamId: string,
  allTeamIds: string[],
  scoreRows: TeamScoreRow[],
): number | null {
  const uniqueTeamIds = Array.from(
    new Set(allTeamIds.filter((candidate): candidate is string => Boolean(candidate))),
  );

  if (uniqueTeamIds.length === 0 || !uniqueTeamIds.includes(teamId)) {
    return null;
  }

  const scoreMap = new Map<string, number>();

  for (const row of scoreRows) {
    if (!row?.team_id) continue;
    scoreMap.set(row.team_id, Math.max(0, row.total_score ?? 0));
  }

  const teamScore = scoreMap.get(teamId) ?? 0;
  const higherScoreCount = uniqueTeamIds.reduce((count, candidateId) => {
    const candidateScore = scoreMap.get(candidateId) ?? 0;
    return candidateScore > teamScore ? count + 1 : count;
  }, 0);

  return higherScoreCount + 1;
}
