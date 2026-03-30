import type { PathActivityProgress } from "../types/pathlab-content";

export async function ensureActivityHasProgress<
  TActivity extends object,
>(
  activity: TActivity,
  params: {
    enrollmentId?: string;
    activityId?: string;
    ensureProgress: (
      enrollmentId: string,
      activityId: string,
    ) => Promise<PathActivityProgress>;
  },
): Promise<TActivity & { progress?: PathActivityProgress }> {
  const existingProgress = (activity as { progress?: PathActivityProgress | null })
    .progress;

  if (existingProgress || !params.enrollmentId || !params.activityId) {
    return activity as TActivity & { progress?: PathActivityProgress };
  }

  const progress = await params.ensureProgress(
    params.enrollmentId,
    params.activityId,
  );

  return {
    ...activity,
    progress,
  };
}
