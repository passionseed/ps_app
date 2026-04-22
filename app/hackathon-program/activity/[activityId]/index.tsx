import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Bridge from hackathon-program stack → hackathon tab activity.
 * Push notifications and inbox use `/hackathon-program/activity/:id` so we avoid
 * colliding with PathLab's root `/activity/[activityId]` route.
 */
export default function HackathonProgramActivityBridge() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  if (!activityId) {
    return <Redirect href="/hackathon-program" />;
  }
  return (
    <Redirect
      href={{
        pathname: "/(hackathon)/activity/[nodeId]",
        params: { nodeId: activityId },
      }}
    />
  );
}
