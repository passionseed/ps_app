import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../AppText";
import { HackathonGlassCard } from "../HackathonGlassCard";
import { Space } from "../../../lib/theme";
import { HACK_ALPHA, HACK_COLORS } from "../../../lib/hackathonTheme";
import type { HackathonTeam } from "../../../types/hackathon-program";

type ProfileTeamCardProps = {
  team: HackathonTeam;
  teamAvatarUrl: string | null;
  teamInitials: string;
  currentParticipantId?: string;
  uploadingAvatar: boolean;
  onUploadAvatar: () => void;
};

export function ProfileTeamCard({
  team,
  teamAvatarUrl,
  teamInitials,
  currentParticipantId,
  uploadingAvatar,
  onUploadAvatar,
}: ProfileTeamCardProps) {
  const displayName = team.team_name || team.name || "Unnamed Team";
  const members = team.members?.filter(Boolean) ?? [];

  return (
    <HackathonGlassCard compact gradient="subtle">
      <View style={styles.headerRow}>
        <AppText variant="bold" style={styles.sectionEyebrow}>
          YOUR TEAM
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upload team avatar"
          style={({ pressed }) => [
            styles.uploadIconBtn,
            pressed && { opacity: 0.75 },
            uploadingAvatar && { opacity: 0.5 },
          ]}
          onPress={onUploadAvatar}
          disabled={uploadingAvatar}
        >
          {uploadingAvatar ? (
            <ActivityIndicator color={HACK_COLORS.cyan} size="small" />
          ) : (
            <AppText style={styles.uploadIcon}>📷</AppText>
          )}
        </Pressable>
      </View>

      <View style={styles.teamRow}>
        {teamAvatarUrl ? (
          <Image source={{ uri: teamAvatarUrl }} style={styles.teamAvatar} />
        ) : (
          <View style={styles.teamAvatarPlaceholder}>
            <AppText variant="bold" style={styles.teamInitials}>
              {teamInitials}
            </AppText>
          </View>
        )}
        <View style={styles.teamMeta}>
          <AppText variant="bold" style={styles.teamName} numberOfLines={2}>
            {displayName}
          </AppText>
          <AppText style={styles.memberCount}>
            {members.length} member{members.length === 1 ? "" : "s"}
          </AppText>
        </View>
      </View>

      <View style={styles.chipRow}>
        {members.map((member) => {
          const isYou = member.participant_id === currentParticipantId;
          return (
            <View
              key={member.participant_id}
              style={[styles.chip, isYou && styles.chipYou]}
            >
              <AppText style={styles.chipText} numberOfLines={1}>
                {member.team_emoji ? `${member.team_emoji} ` : ""}
                {member.name}
                {isYou ? " · you" : ""}
              </AppText>
            </View>
          );
        })}
      </View>
    </HackathonGlassCard>
  );
}

export function ProfileTeamEmptyCard() {
  return (
    <HackathonGlassCard compact gradient="subtle">
      <AppText variant="bold" style={styles.sectionEyebrow}>
        YOUR TEAM
      </AppText>
      <AppText style={styles.emptyText}>Not assigned to a team yet.</AppText>
    </HackathonGlassCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    fontSize: 10,
    color: "rgba(145,196,227,0.55)",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  uploadIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(145,196,227,0.1)",
  },
  uploadIcon: {
    fontSize: 16,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  teamAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(145, 196, 227, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  teamInitials: {
    fontSize: 14,
    color: HACK_COLORS.cyan,
    fontFamily: "BaiJamjuree_700Bold",
  },
  teamMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  teamName: {
    fontSize: 16,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_700Bold",
  },
  memberCount: {
    fontSize: 11,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: HACK_COLORS.bgElevated,
    borderWidth: 1,
    borderColor: HACK_ALPHA.glassBorder,
  },
  chipYou: {
    borderColor: HACK_ALPHA.cyanBorderStrong,
    backgroundColor: "rgba(145,196,227,0.12)",
  },
  chipText: {
    fontSize: 12,
    color: HACK_COLORS.white,
    fontFamily: "BaiJamjuree_500Medium",
  },
  emptyText: {
    fontSize: 13,
    color: HACK_ALPHA.white55,
    fontFamily: "BaiJamjuree_400Regular",
  },
});
