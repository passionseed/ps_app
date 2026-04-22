import { Redirect } from "expo-router";

/**
 * Web / legacy links use `/hackathon/dashboard`; participant hub lives at `/my-submissions`.
 */
export default function HackathonDashboardRedirect() {
  return <Redirect href="/my-submissions" />;
}
