import { Redirect } from "expo-router";

/** Deep link `passion-seed://round/squad` (squad assigned push) opens the Squad tab. */
export default function RoundSquadLink() {
  return <Redirect href="/(tabs)/squad" />;
}
