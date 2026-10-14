import { Redirect } from "expo-router";

/** Deep link `passion-seed://round` (nudges, round published) opens the Shift tab. */
export default function RoundIndex() {
  return <Redirect href="/(tabs)/shift" />;
}
