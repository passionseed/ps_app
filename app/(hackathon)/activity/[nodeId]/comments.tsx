// app/(hackathon)/activity/[nodeId]/comments.tsx
// Dedicated comments page for viewing all comments on an activity
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppText } from "../../../../components/AppText";
import { SkiaBackButton } from "../../../../components/navigation/SkiaBackButton";
import { ActivityCommentsFull } from "../../../../components/Hackathon/ActivityCommentsFull";
import { useHackathonParticipant } from "../../../../lib/hackathon-mode";

// ── Bioluminescent tokens ─────────────────────────────────────────
const BG = "#03050a";
const CYAN = "#91C4E3";
const WHITE = "#FFFFFF";

export default function CommentsScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const insets = useSafeAreaInsets();
  const participant = useHackathonParticipant();

  const participantId = participant?.id ?? "";
  const isAdmin = participant?.role === "admin" || participant?.role === "organizer";

  return (
    <View style={styles.root}>
      {/* Glow orb */}
      <View style={styles.glowCyan} pointerEvents="none" />

      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <SkiaBackButton
          variant="dark"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        />
        <AppText variant="bold" style={styles.title}>Comments</AppText>
        <View style={styles.placeholder} />
      </View>

      {/* Comments list */}
      <View style={styles.content}>
        {participantId ? (
          <ActivityCommentsFull
            activityId={nodeId}
            participantId={participantId}
            isAdmin={isAdmin}
          />
        ) : (
          <View style={styles.emptyState}>
            <AppText style={styles.emptyText}>
              Please sign in to view comments
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  glowCyan: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: CYAN,
    opacity: 0.04,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    color: WHITE,
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 38, // Same width as SkiaBackButton for balance
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
});
