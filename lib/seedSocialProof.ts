import type { SeedSocialProof, SeedWithEnrollment } from "../types/seeds";

export interface SeedSocialProofBadge {
  label: string;
  tone: "exploring" | "completed";
}

export function getEmptySeedSocialProof(): SeedSocialProof {
  return {
    exploringCount: 0,
    completedCount: 0,
  };
}

export function getSeedSocialProofBadge(
  seed: Pick<SeedWithEnrollment, "enrollment" | "socialProof">,
): SeedSocialProofBadge | null {
  const status = seed.enrollment?.status;
  const isInProgress = status === "active" || status === "paused";
  if (isInProgress) return null;

  const exploringCount = seed.socialProof?.exploringCount ?? 0;
  if (exploringCount > 0) {
    return {
      label: `${exploringCount} student${exploringCount === 1 ? "" : "s"} exploring`,
      tone: "exploring",
    };
  }

  const completedCount = seed.socialProof?.completedCount ?? 0;
  if (completedCount > 0) {
    return {
      label: `${completedCount} completed`,
      tone: "completed",
    };
  }

  return null;
}
