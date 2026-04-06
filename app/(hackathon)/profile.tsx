import { useCallback, useState, useEffect } from "react";
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, Linking, TextInput, Alert, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { AppText } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { Space, Radius } from "../../lib/theme";
import { useHackathonParticipant } from "../../lib/hackathon-mode";
import { getCurrentHackathonProgramHome } from "../../lib/hackathonProgram";
import { supabase } from "../../lib/supabase";
import { getInitialEmoji, getNextEmoji } from "../../lib/hackathon-emoji";
import type { HackathonTeam } from "../../types/hackathon-program";

const BG = "transparent";
const CYAN = "#91C4E3";
const CYAN_BORDER = "rgba(145,196,227,0.1)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE35 = "rgba(255,255,255,0.35)";
const AMBER = "#F59E0B";
const DARK_BG = "rgba(20, 28, 41, 0.6)";

export default function HackathonProfileScreen() {
  const { signOutHackathon } = useAuth();
  const participant = useHackathonParticipant();
  const insets = useSafeAreaInsets();

  const [team, setTeam] = useState<HackathonTeam | null>(null);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Social media fields
  const [instagramHandle, setInstagramHandle] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  // Emoji state
  const [teamEmoji, setTeamEmoji] = useState<string | null>(null);
  const [emojiRollCount, setEmojiRollCount] = useState(0);
  const [rollingEmoji, setRollingEmoji] = useState(false);

  // Team avatar
  const [teamAvatarUrl, setTeamAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load profile data
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadProfileData() {
        if (!participant?.id) {
          setLoading(false);
          return;
        }

        try {
          const [homeData, { data: qData }, { data: participantData }] = await Promise.all([
            getCurrentHackathonProgramHome(),
            supabase
              .from("hackathon_pre_questionnaires")
              .select("*")
              .eq("participant_id", participant.id)
              .maybeSingle(),
            supabase
              .from("hackathon_participants")
              .select("instagram_handle, discord_username, team_emoji, emoji_roll_count")
              .eq("id", participant.id)
              .maybeSingle(),
          ]);

          if (!cancelled) {
            setTeam(homeData.team);
            setQuestionnaire(qData);

            // Set social fields
            if (participantData) {
              setInstagramHandle(participantData.instagram_handle || "");
              setDiscordUsername(participantData.discord_username || "");
              setTeamEmoji(participantData.team_emoji);
              setEmojiRollCount(participantData.emoji_roll_count || 0);
            }

            // Set team avatar
            if (homeData.team?.team_avatar_url) {
              setTeamAvatarUrl(homeData.team.team_avatar_url);
            }

            setLoading(false);
          }
        } catch (err) {
          console.error("[Profile] load error", err);
          if (!cancelled) setLoading(false);
        }
      }

      loadProfileData();
      return () => {
        cancelled = true;
      };
    }, [participant?.id])
  );

  // Auto-roll emoji if not set
  useEffect(() => {
    if (!loading && !teamEmoji && team?.id && participant?.id) {
      handleAutoRollEmoji();
    }
  }, [loading, teamEmoji, team?.id, participant?.id]);

  const handleAutoRollEmoji = async () => {
    if (!team?.id || !participant?.id) return;

    const { emoji, rollCount } = getInitialEmoji(team.id, participant.id);

    try {
      const { error } = await supabase
        .from("hackathon_participants")
        .update({ team_emoji: emoji, emoji_roll_count: rollCount })
        .eq("id", participant.id);

      if (!error) {
        setTeamEmoji(emoji);
        setEmojiRollCount(rollCount);
        // Update the team members array to reflect the new emoji in the roster
        if (team.members) {
          setTeam({
            ...team,
            members: team.members.map((m) =>
              m.participant_id === participant.id ? { ...m, team_emoji: emoji } : m
            ),
          });
        }
      }
    } catch (err) {
      console.error("[Profile] auto-roll error", err);
    }
  };

  const handleSaveSocial = async () => {
    if (!participant?.id) return;
    setSavingSocial(true);

    try {
      const { error } = await supabase
        .from("hackathon_participants")
        .update({
          instagram_handle: instagramHandle.trim() || null,
          discord_username: discordUsername.trim() || null,
        })
        .eq("id", participant.id);

      if (error) {
        Alert.alert("Error", "Failed to save social media handles.");
      } else {
        Alert.alert("Saved", "Your social media handles have been updated.");
      }
    } catch (err) {
      console.error("[Profile] save social error", err);
      Alert.alert("Error", "Failed to save social media handles.");
    }

    setSavingSocial(false);
  };

  const handleRollEmoji = async () => {
    if (!team?.id || !participant?.id) return;
    setRollingEmoji(true);

    const { emoji, newRollCount } = getNextEmoji(team.id, participant.id, emojiRollCount);

    try {
      const { error } = await supabase
        .from("hackathon_participants")
        .update({ team_emoji: emoji, emoji_roll_count: newRollCount })
        .eq("id", participant.id);

      if (!error) {
        setTeamEmoji(emoji);
        setEmojiRollCount(newRollCount);
        // Update the team members array to reflect the new emoji in the roster
        if (team.members) {
          setTeam({
            ...team,
            members: team.members.map((m) =>
              m.participant_id === participant.id ? { ...m, team_emoji: emoji } : m
            ),
          });
        }
      } else {
        Alert.alert("Error", "Failed to roll emoji.");
      }
    } catch (err) {
      console.error("[Profile] roll emoji error", err);
      Alert.alert("Error", "Failed to roll emoji.");
    }

    setRollingEmoji(false);
  };

  const handleUploadTeamAvatar = async () => {
    if (!team?.id) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your photos to upload a team avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploadingAvatar(true);

    try {
      const uri = result.assets[0].uri;
      const fileExt = uri.split(".").pop() || "jpg";
      const fileName = `avatar.${fileExt}`;
      const filePath = `${team.id}/${fileName}`;

      // Read file as blob
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("hackathon-team-avatars")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert("Error", "Failed to upload avatar.");
        setUploadingAvatar(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("hackathon-team-avatars")
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update team record
      const { error: updateError } = await supabase
        .from("hackathon_teams")
        .update({ team_avatar_url: avatarUrl })
        .eq("id", team.id);

      if (updateError) {
        Alert.alert("Error", "Failed to update team avatar.");
      } else {
        setTeamAvatarUrl(avatarUrl);
        Alert.alert("Success", "Team avatar updated!");
      }
    } catch (err) {
      console.error("[Profile] upload avatar error", err);
      Alert.alert("Error", "Failed to upload avatar.");
    }

    setUploadingAvatar(false);
  };

  // Get team initials for placeholder
  const getTeamInitials = () => {
    if (!team?.team_name) return "??";
    const words = team.team_name.split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return team.team_name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.xl }]}>
        <AppText variant="bold" style={styles.eyebrow}>YOUR PROFILE</AppText>
        <View style={styles.titleRow}>
          {teamEmoji && <AppText style={styles.titleEmoji}>{teamEmoji}</AppText>}
          <AppText variant="bold" style={styles.title}>{participant?.name ?? "Participant"}</AppText>
        </View>

        {/* Basic Info Card */}
        <View style={styles.infoCard}>
          <LinearGradient colors={[DARK_BG, "rgba(8, 14, 22, 0.8)"]} style={StyleSheet.absoluteFill} />
          <InfoRow label="EMAIL" value={participant?.email ?? "—"} />
          <View style={styles.divider} />
          <InfoRow label="UNIVERSITY" value={participant?.university ?? "—"} />
          <View style={styles.divider} />
          <InfoRow label="ROLE" value={participant?.role ?? "—"} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={CYAN} />
            <AppText style={styles.loadingText}>Loading profile data...</AppText>
          </View>
        ) : (
          <>
            {/* Social Media Card */}
            <View style={styles.sectionCard}>
              <LinearGradient colors={["rgba(145, 196, 227, 0.05)", "rgba(145, 196, 227, 0.01)"]} style={StyleSheet.absoluteFill} />
              <AppText variant="bold" style={styles.sectionTitle}>Social Media</AppText>

              <View style={styles.socialInputRow}>
                <AppText style={styles.socialIcon}>📷</AppText>
                <TextInput
                  style={styles.socialInput}
                  placeholder="Instagram handle"
                  placeholderTextColor={WHITE35}
                  value={instagramHandle}
                  onChangeText={setInstagramHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.socialInputRow}>
                <AppText style={styles.socialIcon}>💬</AppText>
                <TextInput
                  style={styles.socialInput}
                  placeholder="Discord username"
                  placeholderTextColor={WHITE35}
                  value={discordUsername}
                  onChangeText={setDiscordUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }, savingSocial && { opacity: 0.5 }]}
                onPress={handleSaveSocial}
                disabled={savingSocial}
              >
                {savingSocial ? (
                  <ActivityIndicator color={CYAN} size="small" />
                ) : (
                  <AppText variant="bold" style={styles.saveBtnText}>Save Changes</AppText>
                )}
              </Pressable>
            </View>

            {/* Team Emoji Card */}
            <View style={styles.sectionCard}>
              <LinearGradient colors={["rgba(145, 196, 227, 0.05)", "rgba(145, 196, 227, 0.01)"]} style={StyleSheet.absoluteFill} />
              <AppText variant="bold" style={styles.sectionTitle}>Your Team Emoji</AppText>

              <View style={styles.emojiDisplay}>
                <AppText style={styles.emojiLarge}>{teamEmoji || "❓"}</AppText>
              </View>

              <Pressable
                style={({ pressed }) => [styles.rollBtn, pressed && { opacity: 0.7 }, rollingEmoji && { opacity: 0.5 }]}
                onPress={handleRollEmoji}
                disabled={rollingEmoji}
              >
                {rollingEmoji ? (
                  <ActivityIndicator color={WHITE} size="small" />
                ) : (
                  <AppText variant="bold" style={styles.rollBtnText}>Roll Again</AppText>
                )}
              </Pressable>

              <AppText style={styles.rollCountText}>You've rolled {emojiRollCount} times</AppText>
            </View>

            {/* Team Card */}
            {team ? (
              <View style={styles.sectionCard}>
                <LinearGradient colors={["rgba(145, 196, 227, 0.05)", "rgba(145, 196, 227, 0.01)"]} style={StyleSheet.absoluteFill} />

                <View style={styles.teamHeader}>
                  {/* Team Avatar */}
                  {teamAvatarUrl ? (
                    <Image source={{ uri: teamAvatarUrl }} style={styles.teamAvatar} />
                  ) : (
                    <View style={styles.teamAvatarPlaceholder}>
                      <AppText variant="bold" style={styles.teamInitials}>{getTeamInitials()}</AppText>
                    </View>
                  )}

                  <View style={styles.teamNameContainer}>
                    <AppText variant="bold" style={styles.sectionTitle}>Team: {team.team_name || "Unnamed Team"}</AppText>
                  </View>
                </View>

                {/* Upload Avatar Button */}
                <Pressable
                  style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.7 }, uploadingAvatar && { opacity: 0.5 }]}
                  onPress={handleUploadTeamAvatar}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator color={CYAN} size="small" />
                  ) : (
                    <AppText variant="bold" style={styles.uploadBtnText}>
                      {teamAvatarUrl ? "Change Avatar" : "Upload Team Avatar"}
                    </AppText>
                  )}
                </Pressable>

                {/* Team Roster */}
                <View style={styles.rosterList}>
                  {team.members?.map((member) => (
                    <View key={member.participant_id} style={styles.rosterItem}>
                      <View style={styles.rosterDot} />
                      <View style={styles.rosterInfo}>
                        <AppText variant="bold" style={styles.rosterName}>
                          {/* Show emoji before name */}
                          {member.team_emoji ? `${member.team_emoji} ` : ""}
                          {member.name}
                        </AppText>
                        {(member.university || member.track) && (
                          <AppText style={styles.rosterMeta}>
                            {[member.track, member.university].filter(Boolean).join(" • ")}
                          </AppText>
                        )}
                      </View>
                      {member.participant_id === participant?.id && (
                        <View style={styles.youBadge}>
                          <AppText style={styles.youBadgeText}>YOU</AppText>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <AppText variant="bold" style={styles.placeholderTitle}>Team Roster</AppText>
                <AppText style={styles.placeholderText}>You are not assigned to a team yet.</AppText>
              </View>
            )}

            {/* Pre-Hackathon Questionnaire */}
            {questionnaire ? (
              <View style={styles.sectionCard}>
                <LinearGradient colors={["rgba(145, 196, 227, 0.05)", "rgba(145, 196, 227, 0.01)"]} style={StyleSheet.absoluteFill} />
                <AppText variant="bold" style={styles.sectionTitle}>Pre-Hackathon Profile</AppText>
                <View style={styles.qList}>
                  {questionnaire.dream_faculty ? <QItem label="Dream Faculty" value={questionnaire.dream_faculty} /> : null}
                  {questionnaire.team_role_preference ? <QItem label="Preferred Role" value={questionnaire.team_role_preference} /> : null}
                  {questionnaire.ai_proficiency ? <QItem label="AI Proficiency" value={questionnaire.ai_proficiency} /> : null}
                  {questionnaire.why_hackathon ? <QItem label="Goal" value={questionnaire.why_hackathon} /> : null}
                  {questionnaire.loves ? <QItem label="Passions" value={questionnaire.loves} /> : null}
                  {questionnaire.good_at ? <QItem label="Strengths" value={questionnaire.good_at} /> : null}
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <AppText variant="bold" style={styles.placeholderTitle}>Pre-Hackathon Profile</AppText>
                <AppText style={styles.placeholderText}>You haven't filled out your pre-hackathon questionnaire yet.</AppText>
                <Pressable
                  style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => Linking.openURL("https://www.passionseed.org/hackathon/onboarding")}
                >
                  <AppText variant="bold" style={styles.linkBtnText}>Complete Questionnaire</AppText>
                </Pressable>
              </View>
            )}

            {/* Knowledge Vault Placeholder */}
            <View style={styles.placeholderCard}>
              <AppText variant="bold" style={styles.placeholderTitle}>Knowledge Vault</AppText>
              <AppText style={styles.placeholderText}>Your completed activities, generated ideas, and reflections in one place.</AppText>
              <AppText variant="bold" style={styles.placeholderBadge}>Coming Soon</AppText>
            </View>

            {/* Sign Out */}
            <Pressable
              style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.75 }]}
              onPress={() => signOutHackathon()}
            >
              <AppText style={styles.signOutText}>Sign Out</AppText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText variant="bold" style={[styles.infoValue, accent && { color: CYAN }]}>{value}</AppText>
    </View>
  );
}

function QItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.qItem}>
      <AppText style={styles.qLabel}>{label}</AppText>
      <AppText style={styles.qValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  content: {
    padding: Space.xl,
    paddingBottom: 120,
    gap: Space.md,
  },
  eyebrow: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  titleEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  infoCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: Space.lg,
    gap: Space.md,
    marginTop: Space.sm,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 10,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: "BaiJamjuree_700Bold",
  },
  infoValue: {
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_500Medium",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  loadingContainer: {
    padding: Space.xl,
    alignItems: "center",
    gap: Space.md,
  },
  loadingText: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_500Medium",
  },
  sectionCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.15)",
    padding: Space.lg,
    gap: Space.md,
    marginTop: Space.sm,
    backgroundColor: "rgba(3, 5, 10, 0.4)",
  },
  sectionTitle: {
    fontSize: 18,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  // Social Media Styles
  socialInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: Radius.md,
    padding: Space.md,
  },
  socialIcon: {
    fontSize: 20,
  },
  socialInput: {
    flex: 1,
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_400Regular",
    padding: 0,
  },
  saveBtn: {
    backgroundColor: "rgba(145, 196, 227, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.3)",
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  saveBtnText: {
    color: CYAN,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Emoji Styles
  emojiDisplay: {
    alignItems: "center",
    paddingVertical: Space.lg,
  },
  emojiLarge: {
    fontSize: 72,
  },
  rollBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: Radius.md,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    alignItems: "center",
    alignSelf: "center",
  },
  rollBtnText: {
    color: WHITE,
    fontSize: 14,
    fontFamily: "BaiJamjuree_700Bold",
  },
  rollCountText: {
    fontSize: 12,
    color: WHITE55,
    textAlign: "center",
    fontFamily: "BaiJamjuree_400Regular",
  },
  // Team Styles
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  teamAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(145, 196, 227, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  teamInitials: {
    fontSize: 16,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  teamNameContainer: {
    flex: 1,
  },
  uploadBtn: {
    backgroundColor: "rgba(145, 196, 227, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(145, 196, 227, 0.2)",
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  uploadBtnText: {
    color: CYAN,
    fontSize: 11,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rosterList: {
    gap: Space.md,
    marginTop: Space.md,
  },
  rosterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  rosterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CYAN,
  },
  rosterInfo: {
    flex: 1,
  },
  rosterName: {
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  rosterMeta: {
    fontSize: 12,
    color: WHITE55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  youBadge: {
    backgroundColor: "rgba(145,196,227,0.15)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 10,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 0.5,
  },
  // Questionnaire Styles
  qList: {
    gap: Space.md,
  },
  qItem: {
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Space.md,
    borderRadius: Radius.md,
  },
  qLabel: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "BaiJamjuree_700Bold",
  },
  qValue: {
    fontSize: 14,
    color: WHITE,
    lineHeight: 20,
    fontFamily: "BaiJamjuree_400Regular",
  },
  // Placeholder Styles
  placeholderCard: {
    backgroundColor: "rgba(145,196,227,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.1)",
    padding: Space.lg,
    gap: Space.xs,
    marginTop: Space.sm,
  },
  placeholderTitle: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  placeholderText: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "BaiJamjuree_400Regular" },
  placeholderBadge: { fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: 1.5, marginTop: Space.xs, fontFamily: "BaiJamjuree_700Bold" },
  linkBtn: {
    backgroundColor: "rgba(145,196,227,0.15)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.3)",
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    alignItems: "center",
    marginTop: Space.sm,
    alignSelf: "flex-start",
  },
  linkBtnText: {
    color: CYAN,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Sign Out
  signOutBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: Space.md,
    alignItems: "center",
    marginTop: Space.lg,
  },
  signOutText: {
    fontSize: 15,
    color: WHITE75,
    fontFamily: "BaiJamjuree_400Regular",
  },
});