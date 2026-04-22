import { Redirect, useLocalSearchParams } from "expo-router";

/** Bridge to `(hackathon)/activity/[nodeId]/comments` from hackathon-program flows. */
export default function HackathonProgramActivityCommentsBridge() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  if (!activityId) {
    return <Redirect href="/hackathon-program" />;
  }
  return (
    <Redirect
      href={{
        pathname: "/(hackathon)/activity/[nodeId]/comments",
        params: { nodeId: activityId },
      }}
    />
  );
}
