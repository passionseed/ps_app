import type { PathDay } from "../types/pathlab";
import type { PathActivityWithContent } from "../types/pathlab-content";
import type { EnrollmentWithPath, PathDayBundle } from "./pathlab";
import { writeCachedPathDayBundle } from "./seedRecommendations";

export type DayActivityListItem = {
  id: string;
  display_order: number;
  title: string;
};

interface CachedActivityPayload {
  activity: PathActivityWithContent;
  dayActivitiesList: DayActivityListItem[];
  currentPage: number;
  totalPages: number;
}

const dayBundleCache = new Map<string, PathDayBundle>();
const activityCache = new Map<string, CachedActivityPayload>();
const resetTimestamps = new Map<string, number>();

export function markEnrollmentReset(enrollmentId: string) {
  resetTimestamps.set(enrollmentId, Date.now());
}

export function getResetTimestamp(enrollmentId: string): number | null {
  return resetTimestamps.get(enrollmentId) ?? null;
}

export function clearResetTimestamp(enrollmentId: string) {
  resetTimestamps.delete(enrollmentId);
}

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
  void writeCachedPathDayBundle(enrollmentId, dayBundle);

  const dayActivitiesList: DayActivityListItem[] = bundle.activities.map(
    (activity) => ({
      id: activity.id,
      display_order: activity.display_order,
      title: activity.title ?? "",
    }),
  );

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

export function clearEnrollmentCache(enrollmentId: string) {
  dayBundleCache.delete(enrollmentId);
  for (const key of activityCache.keys()) {
    if (key.startsWith(`${enrollmentId}:`)) {
      activityCache.delete(key);
    }
  }
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
