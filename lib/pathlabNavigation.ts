import type { Href } from "expo-router";

type PathlabSeedEntryRouteParams = {
  enrollmentId: string;
  hasIncompleteActivities: boolean;
};

type PathlabActivityRouteParams = {
  enrollmentId: string;
  activityId: string;
  pageIndex: number;
  totalPages: number;
};

type PathlabSeedDayActivityRouteParams = {
  isCurrentDay: boolean;
} & PathlabActivityRouteParams;

export function getPathlabActivityRoute(
  params: PathlabActivityRouteParams,
): Href {
  return {
    pathname: "/pathlab-activity/[activityId]",
    params: {
      activityId: params.activityId,
      enrollmentId: params.enrollmentId,
      pageIndex: String(params.pageIndex),
      totalPages: String(params.totalPages),
    },
  };
}

export function getPathlabReflectionRoute(enrollmentId: string): Href {
  return {
    pathname: "/reflection/[enrollmentId]",
    params: { enrollmentId },
  };
}

export function getPathlabDayRoute(enrollmentId: string): Href {
  return {
    pathname: "/path/[enrollmentId]",
    params: { enrollmentId },
  };
}

type PathlabSeedDayActivityRouteResult = Href;

type PathlabSeedEntryRouteResult = Href;

type PathlabSeedDayActivityRouteInput = {
  isCurrentDay: boolean;
} & PathlabActivityRouteParams;

export function getPathlabSeedEntryRoute(
  params: PathlabSeedEntryRouteParams,
) : PathlabSeedEntryRouteResult {
  return params.hasIncompleteActivities
    ? getPathlabDayRoute(params.enrollmentId)
    : getPathlabReflectionRoute(params.enrollmentId);
}

export function getPathlabSeedDayActivityRoute(
  params: PathlabSeedDayActivityRouteInput,
): PathlabSeedDayActivityRouteResult {
  if (params.isCurrentDay) {
    return getPathlabDayRoute(params.enrollmentId);
  }

  return getPathlabActivityRoute(params);
}
