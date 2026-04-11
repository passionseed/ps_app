import type { HackathonPhaseActivitySubmissionStatus } from "../types/hackathon-phase-activity";
import type { HackathonReleaseStatus } from "../types/hackathon-release";
import type { HackathonProgramPhase } from "../types/hackathon-program";

export type { HackathonReleaseStatus } from "../types/hackathon-release";

type ActivityAccessInput = {
  phaseStatus: HackathonReleaseStatus | null | undefined;
  activityStatus: HackathonReleaseStatus | null | undefined;
  previousActivitySubmissionStatus:
    | HackathonPhaseActivitySubmissionStatus
    | null
    | undefined;
  isAdmin?: boolean;
};

function isReleased(status: HackathonReleaseStatus | null | undefined) {
  return status === "released";
}

function isCompletedSubmission(
  status: HackathonPhaseActivitySubmissionStatus | null | undefined,
) {
  return status === "submitted" || status === "passed";
}

export function isHackathonActivityAccessible({
  phaseStatus,
  activityStatus,
  previousActivitySubmissionStatus,
  isAdmin,
}: ActivityAccessInput) {
  if (isAdmin) return true;

  if (!isReleased(phaseStatus) || !isReleased(activityStatus)) {
    return false;
  }

  if (previousActivitySubmissionStatus == null) {
    return true;
  }

  return isCompletedSubmission(previousActivitySubmissionStatus);
}

export function getCurrentReleasedPhase(
  phases: HackathonProgramPhase[],
  now = Date.now(),
): HackathonProgramPhase | null {
  const releasedPhases = phases
    .filter((phase) => isReleased(phase.status))
    .sort((a, b) => a.phase_number - b.phase_number);

  if (releasedPhases.length === 0) {
    return null;
  }

  const activePhase = releasedPhases.find((phase) => {
    const deadline = phase.due_at ?? phase.ends_at;
    return deadline ? new Date(deadline).getTime() > now : true;
  });

  return activePhase ?? releasedPhases[releasedPhases.length - 1] ?? null;
}
