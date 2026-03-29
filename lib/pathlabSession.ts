import type { PathDay } from "../types/pathlab";
import type { PathActivityWithContent } from "../types/pathlab-content";
import type { EnrollmentWithPath, PathDayBundle } from "./pathlab";

interface CachedActivityPayload {
  activity: PathActivityWithContent;
  dayActivitiesList: { id: string; display_order: number }[];
  currentPage: number;
  totalPages: number;
}

const dayBundleCache = new Map<string, PathDayBundle>();
const activityCache = new Map<string, CachedActivityPayload>();

function getActivityCacheKey(enrollmentId: string, activityId: string) {
  return `${enrollmentId}:${activityId}`;
}

export function warmPathDayBundle(
  enrollmentId: string,
  bundle: {
    enrollment: EnrollmentWithPath;
    pathDay: PathDay;
    activities: PathActivityWithContent[];
  }
) {
  const dayBundle: PathDayBundle = {
    ...bundle,
    loadedAt: Date.now(),
  };

  dayBundleCache.set(enrollmentId, dayBundle);

  const dayActivitiesList = bundle.activities.map((activity) => ({
    id: activity.id,
    display_order: activity.display_order,
  }));

  bundle.activities.forEach((activity, index) => {
    activityCache.set(getActivityCacheKey(enrollmentId, activity.id), {
      activity,
      dayActivitiesList,
      currentPage: index,
      totalPages: bundle.activities.length,
    });
  });
}

export function getCachedPathDayBundle(enrollmentId: string) {
  return dayBundleCache.get(enrollmentId) ?? null;
}

export function getCachedActivityPayload(enrollmentId: string, activityId: string) {
  return activityCache.get(getActivityCacheKey(enrollmentId, activityId)) ?? null;
}

export function updateCachedActivityProgress(
  enrollmentId: string,
  activityId: string,
  updater: (activity: PathActivityWithContent) => PathActivityWithContent
) {
  const cacheKey = getActivityCacheKey(enrollmentId, activityId);
  const cachedActivity = activityCache.get(cacheKey);

  if (cachedActivity) {
    activityCache.set(cacheKey, {
      ...cachedActivity,
      activity: updater(cachedActivity.activity),
    });
  }

  const dayBundle = dayBundleCache.get(enrollmentId);
  if (dayBundle) {
    dayBundleCache.set(enrollmentId, {
      ...dayBundle,
      activities: dayBundle.activities.map((activity) =>
        activity.id === activityId ? updater(activity) : activity
      ),
    });
  }
}
