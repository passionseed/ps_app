import { supabase } from "./supabase";
import type { PathReflectionDecision } from "../types/pathlab";

export type PathNotificationEvent =
  | { type: "day_ready"; dayNumber: number }
  | { type: "streak_milestone"; streakDays: 3 | 7 | 14 };

export function getPathNotificationEventsForEnrollment(): PathNotificationEvent[] {
  return [{ type: "day_ready", dayNumber: 1 }];
}

export function getPathNotificationEventsForReflection(params: {
  completedDayNumber: number;
  decision: PathReflectionDecision;
}): PathNotificationEvent[] {
  const events: PathNotificationEvent[] = [];

  if (params.decision === "continue_tomorrow" || params.decision === "pause") {
    events.push({
      type: "day_ready",
      dayNumber: params.completedDayNumber + 1,
    });
  }

  if ([3, 7, 14].includes(params.completedDayNumber)) {
    events.push({
      type: "streak_milestone",
      streakDays: params.completedDayNumber as 3 | 7 | 14,
    });
  }

  return events;
}

export async function sendPathNotificationEvent(
  event: PathNotificationEvent,
): Promise<void> {
  const { error } = await supabase.functions.invoke("push-notifications", {
    body: event,
  });

  if (error) {
    throw new Error(error.message);
  }
}
