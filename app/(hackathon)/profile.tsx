import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { AppText } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { Space, Radius } from "../../lib/theme";
import { useHackathonParticipant, readHackathonParticipant } from "../../lib/hackathon-mode";
import { isHackathonAdminEmail } from "../../lib/hackathonAdminAccess";
import { getCurrentHackathonProgramHome } from "../../lib/hackathonProgram";
import { supabase } from "../../lib/supabase";
import { getInitialEmoji, getNextEmoji } from "../../lib/hackathon-emoji";
import {
  uploadAssetToSupabase,
  formatUploadError,
} from "../../lib/storageUpload";
import {
  readCachedHackathonProfile,
  writeCachedHackathonProfile,
  getHackathonProfileCacheStatus,
  type HackathonProfileSnapshot,
} from "../../lib/hackathonProfileCache";
import type { HackathonTeam } from "../../types/hackathon-program";
import { requestAndRegisterPushToken } from "../../lib/hackathonPushTokens";
import { getExistingPushToken } from "../../lib/notifications";
import { getSentryRuntimeContext } from "../../lib/sentry";
import Constants from "expo-constants";

const BG = "#03050a";
const CYAN = "#91C4E3";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE35 = "rgba(255,255,255,0.35)";
const AMBER = "#F59E0B";

// ─── Shared color constants ───────────────────────────────────────────────────
const CARD_BG = "rgba(145,196,227,0.04)";
const CARD_BORDER = "rgba(145,196,227,0.12)";
const CARD_BORDER_ACTIVE = "rgba(145,196,227,0.25)";
const INPUT_BG = "rgba(255,255,255,0.05)";
const YOU_BADGE_BG = "rgba(145,196,227,0.12)";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileState {
  team: HackathonTeam | null;
  questionnaire: any | null;
  instagramHandle: string;
  discordUsername: string;
  teamEmoji: string | null;
  emojiRollCount: number;
  teamAvatarUrl: string | null;
  loading: boolean;
  hasPushToken: boolean;
  pushChecked: boolean;
}

// ─── Memoized sub-components ──────────────────────────────────────────────────
const MemoizedInfoRow = React.memo(function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={infoRowStyles.row}>
      <AppText style={infoRowStyles.label}>{label}</AppText>
      <AppText variant="bold" style={infoRowStyles.value}>{value}</AppText>
    </View>
  );
});

const infoRowStyles = StyleSheet.create({
  row: { gap: 4, paddingVertical: Space.xs },
  label: {
    fontSize: 10,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: "BaiJamjuree_700Bold",
  },
  value: {
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_500Medium",
  },
});

const MemoizedQItem = React.memo(function QItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={qItemStyles.item}>
      <AppText style={qItemStyles.label}>{label}</AppText>
      <AppText style={qItemStyles.value}>{value}</AppText>
    </View>
  );
});

const qItemStyles = StyleSheet.create({
  item: {
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Space.md,
    borderRadius: Radius.md,
  },
  label: {
    fontSize: 11,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "BaiJamjuree_700Bold",
  },
  value: {
    fontSize: 14,
    color: WHITE,
    lineHeight: 20,
    fontFamily: "BaiJamjuree_400Regular",
  },
});

const MemoizedRosterMember = React.memo(function RosterMember({
  emoji,
  name,
  meta,
  isYou,
}: {
  emoji: string | null;
  name: string;
  meta: string;
  isYou: boolean;
}) {
  return (
    <View style={rosterStyles.member}>
      <View style={rosterStyles.dot} />
      <View style={rosterStyles.info}>
        <AppText variant="bold" style={rosterStyles.name}>
          {emoji ? `${emoji} ` : ""}{name}
        </AppText>
        {meta ? <AppText style={rosterStyles.meta}>{meta}</AppText> : null}
      </View>
      {isYou && (
        <View style={rosterStyles.youBadge}>
          <AppText style={rosterStyles.youBadgeText}>YOU</AppText>
        </View>
      )}
    </View>
  );
});

const rosterStyles = StyleSheet.create({
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CYAN,
  },
  info: { flex: 1 },
  name: {
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  meta: {
    fontSize: 12,
    color: WHITE55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  youBadge: {
    backgroundColor: YOU_BADGE_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER_ACTIVE,
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
});

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function HackathonProfileScreen() {
  const { signOutHackathon, user } = useAuth();
  const participant = useHackathonParticipant();
  const insets = useSafeAreaInsets();

  const hasLoadedRef = useRef(false);
  const adminCheckedRef = useRef(false);

  // ── Single composite state ─────────────────────────────────────────────────
  const [state, setState] = useState<ProfileState>({
    team: null,
    questionnaire: null,
    instagramHandle: "",
    discordUsername: "",
    teamEmoji: null,
    emojiRollCount: 0,
    teamAvatarUrl: null,
    loading: true,
    hasPushToken: false,
    pushChecked: false,
  });

  // Action-specific loading states (fine-grained, don't affect render tree much)
  const [savingSocial, setSavingSocial] = useState(false);
  const [rollingEmoji, setRollingEmoji] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Derived values (computed once per render, not stored in state) ─────────
  const teamInitials = useMemo(() => {
    const displayName = state.team?.team_name || state.team?.name;
    if (!displayName) return "??";
    const words = displayName.split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }, [state.team?.team_name, state.team?.name]);

  const filteredMembers = useMemo(
    () => state.team?.members?.filter(Boolean) ?? [],
    [state.team?.members],
  );

  // ── Load profile data ───────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadProfileData() {
        const p = await readHackathonParticipant();
        if (!p?.id) {
          if (!cancelled) setState((s) => ({ ...s, loading: false }));
          return;
        }

        // Push token check (fire-and-forget, doesn't block render)
        Promise.resolve(
          supabase
            .from("hackathon_participant_push_tokens")
            .select("id")
            .eq("participant_id", p.id)
            .limit(1)
        )
          .then(({ data }) => {
            if (!cancelled) setState((s) => ({ ...s, hasPushToken: !!data?.length, pushChecked: true }));
          })
          .catch(() => {
            if (!cancelled) setState((s) => ({ ...s, pushChecked: true }));
          });

        // Try cache for instant render
        const cachedSnapshot = readCachedHackathonProfile(p.id);
        if (cachedSnapshot && !cancelled) {
          setState((s) => ({
            ...s,
            team: cachedSnapshot.team,
            questionnaire: cachedSnapshot.questionnaire,
            instagramHandle: cachedSnapshot.instagramHandle,
            discordUsername: cachedSnapshot.discordUsername,
            teamEmoji: cachedSnapshot.teamEmoji,
            emojiRollCount: cachedSnapshot.emojiRollCount,
            teamAvatarUrl: cachedSnapshot.teamAvatarUrl,
            loading: false,
          }));
        }

        const cacheStatus = getHackathonProfileCacheStatus(cachedSnapshot);
        const isFirstLoad = !hasLoadedRef.current;
        hasLoadedRef.current = true;

        if (cacheStatus.isFresh && !isFirstLoad) return;
        if (!cachedSnapshot && !cancelled) setState((s) => ({ ...s, loading: true }));

        try {
          const [homeData, { data: qData }, { data: participantData }] = await Promise.all([
            getCurrentHackathonProgramHome(),
            supabase
              .from("hackathon_pre_questionnaires")
              .select("*")
              .eq("participant_id", p.id)
              .maybeSingle(),
            supabase
              .from("hackathon_participants")
              .select("instagram_handle, discord_username, team_emoji, emoji_roll_count")
              .eq("id", p.id)
              .maybeSingle(),
          ]);

          if (cancelled) return;

          const igHandle = participantData?.instagram_handle ?? "";
          const discord = participantData?.discord_username ?? "";
          const emoji = participantData?.team_emoji ?? null;
          const rollCount = participantData?.emoji_roll_count ?? 0;
          const avatarUrl = homeData.team?.team_avatar_url ?? null;

          const snapshot: HackathonProfileSnapshot = {
            version: 1,
            cachedAt: new Date().toISOString(),
            team: homeData.team,
            questionnaire: qData,
            instagramHandle: igHandle,
            discordUsername: discord,
            teamEmoji: emoji,
            emojiRollCount: rollCount,
            teamAvatarUrl: avatarUrl,
          };

          setState({
            team: homeData.team,
            questionnaire: qData,
            instagramHandle: igHandle,
            discordUsername: discord,
            teamEmoji: emoji,
            emojiRollCount: rollCount,
            teamAvatarUrl: avatarUrl,
            loading: false,
            hasPushToken: state.hasPushToken,
            pushChecked: state.pushChecked,
          });

          try { writeCachedHackathonProfile(p.id, snapshot); } catch {}
        } catch (err) {
          console.error("[Profile] load error", err);
          if (!cancelled) setState((s) => ({ ...s, loading: false }));
        }
      }

      loadProfileData();
      return () => { cancelled = true; };
    }, []),
  );

  // ── Auto-roll emoji once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.loading && !state.teamEmoji && state.team?.id && participant?.id) {
      const { emoji, rollCount } = getInitialEmoji(state.team.id, participant.id);
      supabase
        .from("hackathon_participants")
        .update({ team_emoji: emoji, emoji_roll_count: rollCount })
        .eq("id", participant.id)
        .then(({ error }) => {
          if (!error) {
            setState((s) => ({ ...s, teamEmoji: emoji, emojiRollCount: rollCount }));
          }
        });
    }
  }, [state.loading, state.teamEmoji, state.team?.id, participant?.id]);

  // ── Admin check (runs once via ref guard) ───────────────────────────────────
  useEffect(() => {
    if (adminCheckedRef.current) return;
    adminCheckedRef.current = true;

    if (isHackathonAdminEmail(participant?.email)) {
      setIsAdmin(true);
      return;
    }
    if (!user?.id) return;

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setIsAdmin(true);
      });
  }, [participant?.email, user?.id]);

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleEnablePush = async () => {
    if (!participant?.id) return;
    setEnablingPush(true);
    try {
      const token = await requestAndRegisterPushToken(participant.id);
      if (token) {
        setState((s) => ({ ...s, hasPushToken: true }));
        Alert.alert("Notifications Enabled", token);
      } else {
        Alert.alert("Notifications", "Could not enable notifications. Please check your device settings.");
      }
    } catch {
      Alert.alert("Error", "Failed to enable notifications.");
    } finally {
      setEnablingPush(false);
    }
  };

  const handleSaveSocial = async () => {
    if (!participant?.id) return;
    setSavingSocial(true);
    try {
      const { error } = await supabase
        .from("hackathon_participants")
        .update({
          instagram_handle: state.instagramHandle.trim() || null,
          discord_username: state.discordUsername.trim() || null,
        })
        .eq("id", participant.id);

      if (error) {
        Alert.alert("Error", "Failed to save social media handles.");
      } else {
        if (participant.id) {
          const cached = readCachedHackathonProfile(participant.id);
          if (cached) {
            writeCachedHackathonProfile(participant.id, {
              ...cached,
              instagramHandle: state.instagramHandle.trim(),
              discordUsername: state.discordUsername.trim(),
            });
          }
        }
        Alert.alert("Saved", "Your social media handles have been updated.");
      }
    } catch {
      Alert.alert("Error", "Failed to save social media handles.");
    } finally {
      setSavingSocial(false);
    }
  };

  const handleRollEmoji = async () => {
    if (!state.team?.id || !participant?.id) return;
    setRollingEmoji(true);
    const { emoji, newRollCount } = getNextEmoji(state.team.id, participant.id, state.emojiRollCount);
    try {
      const { error } = await supabase
        .from("hackathon_participants")
        .update({ team_emoji: emoji, emoji_roll_count: newRollCount })
        .eq("id", participant.id);

      if (!error) {
        setState((s) => ({ ...s, teamEmoji: emoji, emojiRollCount: newRollCount }));
      } else {
        Alert.alert("Error", "Failed to roll emoji.");
      }
    } catch {
      Alert.alert("Error", "Failed to roll emoji.");
    } finally {
      setRollingEmoji(false);
    }
  };

  const handleUploadTeamAvatar = async () => {
    if (!state.team?.id) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Please grant access to your photo library to upload an avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    const fileExt =
      asset.mimeType?.split("/").pop()?.split("+")[0] ||
      asset.uri.split(".").pop()?.split("?")[0] ||
      "jpg";

    setUploadingAvatar(true);
    try {
      const uploadResult = await uploadAssetToSupabase(
        { uri: asset.uri, fileName: `avatar.${fileExt}`, mimeType: asset.mimeType },
        "hackathon-team-avatars",
        () => `${state.team!.id}/avatar.${fileExt}`,
      );

      const { error } = await supabase
        .from("hackathon_teams")
        .update({ team_avatar_url: uploadResult.url })
        .eq("id", state.team!.id);

      if (error) {
        Alert.alert("Error", "Failed to update team avatar.");
      } else {
        setState((s) => ({ ...s, teamAvatarUrl: uploadResult.url }));
        Alert.alert("Success", "Team avatar updated!");
      }
    } catch (e: unknown) {
      Alert.alert("Error", formatUploadError(e));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Static style references (avoid re-creation on every render) ─────────────
  const diceBtnDisabledStyle = useMemo(() => [styles.diceBtn, { opacity: 0.5 }], []);
  const diceBtnNormalStyle = useMemo(() => styles.diceBtn, []);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <AppText variant="bold" style={styles.eyebrow}>YOUR PROFILE</AppText>

        <View style={styles.titleRow}>
          {state.teamEmoji && <AppText style={styles.titleEmoji}>{state.teamEmoji}</AppText>}
          <View style={styles.titleTextWrap}>
            <AppText variant="bold" style={styles.title}>
              {participant?.name ?? "Participant"}
            </AppText>
            {state.emojiRollCount > 0 && (
              <AppText style={styles.rollCountInline}>Rolled {state.emojiRollCount} times</AppText>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Roll profile emoji"
            style={rollingEmoji ? diceBtnDisabledStyle : diceBtnNormalStyle}
            onPress={handleRollEmoji}
            disabled={rollingEmoji || !state.team?.id || !participant?.id}
          >
            {rollingEmoji
              ? <ActivityIndicator color={WHITE} size="small" />
              : <AppText style={styles.diceText}>🎲</AppText>}
          </Pressable>
        </View>

        {/* ── Basic Info Card ───────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <MemoizedInfoRow label="EMAIL" value={participant?.email ?? "—"} />
          <View style={styles.divider} />
          <MemoizedInfoRow label="UNIVERSITY" value={participant?.university ?? "—"} />
          <View style={styles.divider} />
          <MemoizedInfoRow label="ROLE" value={participant?.role ?? "—"} />
        </View>

        {/* ── Push Notification Banner ───────────────────────────────────────── */}
        {state.pushChecked && !state.hasPushToken && !state.loading && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enable push notifications"
            style={[styles.pushBanner, enablingPush && { opacity: 0.5 }]}
            onPress={handleEnablePush}
            disabled={enablingPush}
          >
            <View style={styles.pushBannerContent}>
              <AppText style={styles.pushBannerIcon}>🔔</AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="bold" style={styles.pushBannerTitle}>Enable Notifications</AppText>
                <AppText style={styles.pushBannerText}>Get updates from your team and mentors</AppText>
              </View>
              {enablingPush
                ? <ActivityIndicator color={AMBER} size="small" />
                : <AppText variant="bold" style={styles.pushBannerAction}>ENABLE</AppText>}
            </View>
          </Pressable>
        )}

        {/* ── Loading state ──────────────────────────────────────────────────── */}
        {state.loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={CYAN} />
            <AppText style={styles.loadingText}>Loading profile data...</AppText>
          </View>
        ) : (
          <>
            {/* ── Social Media Card ─────────────────────────────────────────── */}
            <View style={styles.sectionCard}>
              <AppText variant="bold" style={styles.sectionTitle}>Social Media</AppText>

              <View style={styles.socialInputRow}>
                <AppText style={styles.socialIcon}>📷</AppText>
                <TextInput
                  style={styles.socialInput}
                  placeholder="Instagram handle"
                  placeholderTextColor={WHITE35}
                  value={state.instagramHandle}
                  onChangeText={(text) => setState((s) => ({ ...s, instagramHandle: text }))}
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
                  value={state.discordUsername}
                  onChangeText={(text) => setState((s) => ({ ...s, discordUsername: text }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable
                style={[styles.saveBtn, savingSocial && { opacity: 0.5 }]}
                onPress={handleSaveSocial}
                disabled={savingSocial}
              >
                {savingSocial
                  ? <ActivityIndicator color={CYAN} size="small" />
                  : <AppText variant="bold" style={styles.saveBtnText}>Save Changes</AppText>}
              </Pressable>
            </View>

            {/* ── Team Card ─────────────────────────────────────────────────── */}
            {state.team ? (
              <View style={styles.sectionCard}>
                <View style={styles.teamHeader}>
                  {state.teamAvatarUrl
                    ? <Image source={{ uri: state.teamAvatarUrl }} style={styles.teamAvatar} />
                    : (
                      <View style={styles.teamAvatarPlaceholder}>
                        <AppText variant="bold" style={styles.teamInitials}>{teamInitials}</AppText>
                      </View>
                    )}
                  <View style={styles.teamNameContainer}>
                    <AppText variant="bold" style={styles.sectionTitle}>
                      Team: {state.team.team_name || state.team.name || "Unnamed Team"}
                    </AppText>
                  </View>
                </View>

                <Pressable
                  style={[styles.uploadBtn, uploadingAvatar && { opacity: 0.5 }]}
                  onPress={handleUploadTeamAvatar}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar
                    ? <ActivityIndicator color={CYAN} size="small" />
                    : <AppText variant="bold" style={styles.uploadBtnText}>
                        {state.teamAvatarUrl ? "Change Avatar" : "Upload Team Avatar"}
                      </AppText>}
                </Pressable>

                {/* ── Team Roster (FlatList for performance) ──────────────────── */}
                <View style={styles.rosterList}>
                  {filteredMembers.map((member) => (
                    <MemoizedRosterMember
                      key={member.participant_id}
                      emoji={member.team_emoji ?? null}
                      name={member.name}
                      meta={[member.track, member.university].filter(Boolean).join(" • ")}
                      isYou={member.participant_id === participant?.id}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <AppText variant="bold" style={styles.placeholderTitle}>Team Roster</AppText>
                <AppText style={styles.placeholderText}>You are not assigned to a team yet.</AppText>
              </View>
            )}

            {/* ── Pre-Hackathon Questionnaire ────────────────────────────────── */}
            {state.questionnaire ? (
              <View style={styles.sectionCard}>
                <AppText variant="bold" style={styles.sectionTitle}>Pre-Hackathon Profile</AppText>
                <View style={styles.qList}>
                  {state.questionnaire.dream_faculty && (
                    <MemoizedQItem label="Dream Faculty" value={state.questionnaire.dream_faculty} />
                  )}
                  {state.questionnaire.team_role_preference && (
                    <MemoizedQItem label="Preferred Role" value={state.questionnaire.team_role_preference} />
                  )}
                  {state.questionnaire.ai_proficiency && (
                    <MemoizedQItem label="AI Proficiency" value={state.questionnaire.ai_proficiency} />
                  )}
                  {state.questionnaire.why_hackathon && (
                    <MemoizedQItem label="Goal" value={state.questionnaire.why_hackathon} />
                  )}
                  {state.questionnaire.loves && (
                    <MemoizedQItem label="Passions" value={state.questionnaire.loves} />
                  )}
                  {state.questionnaire.good_at && (
                    <MemoizedQItem label="Strengths" value={state.questionnaire.good_at} />
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <AppText variant="bold" style={styles.placeholderTitle}>Pre-Hackathon Profile</AppText>
                <AppText style={styles.placeholderText}>You haven't filled out your pre-hackathon questionnaire yet.</AppText>
                <Pressable
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL("https://www.passionseed.org/hackathon/onboarding")}
                >
                  <AppText variant="bold" style={styles.linkBtnText}>Complete Questionnaire</AppText>
                </Pressable>
              </View>
            )}

            {/* ── Knowledge Vault Placeholder ────────────────────────────────── */}
            <View style={styles.placeholderCard}>
              <AppText variant="bold" style={styles.placeholderTitle}>Knowledge Vault</AppText>
              <AppText style={styles.placeholderText}>
                Your completed activities, generated ideas, and reflections in one place.
              </AppText>
              <AppText variant="bold" style={styles.placeholderBadge}>Coming Soon</AppText>
            </View>

            {/* ── Admin Card ─────────────────────────────────────────────────── */}
            {isAdmin && (
              <View style={styles.adminCard}>
                <AppText variant="bold" style={styles.adminTitle}>Hackathon Admin</AppText>
                <AppText style={styles.adminText}>Review app stats, activity submissions, and team progress.</AppText>
                <Pressable
                  style={styles.adminBtn}
                  onPress={() => router.push("/admin/hackathon" as any)}
                >
                  <AppText variant="bold" style={styles.adminBtnText}>Open Dashboard</AppText>
                </Pressable>
              </View>
            )}

            {/* ── Debug Info ─────────────────────────────────────────────────── */}
            <Pressable
              style={styles.signOutBtn}
              onPress={async () => {
                const token = await getExistingPushToken().catch(() => null);
                const ctx = getSentryRuntimeContext();
                Alert.alert("Debug Info", [
                  `App: ${Constants.expoConfig?.version ?? "?"}+${ctx.dist ?? "?"}`,
                  `Runtime: ${ctx.runtimeVersion ?? "?"}`,
                  `Channel: ${ctx.channel ?? "?"}`,
                  `Update: ${ctx.updateId ?? "none"}`,
                  `OS: ${Platform.OS} ${Platform.Version}`,
                  `Env: ${ctx.environment ?? "?"}`,
                  "",
                  `User: ${user?.id ?? "null"}`,
                  `Participant: ${participant?.id ?? "null"}`,
                  `Team: ${state.team?.id ?? "null"}`,
                  `Push: ${token ?? "none"}`,
                  `Push saved: ${state.hasPushToken}`,
                ].join("\n"));
              }}
            >
              <AppText style={styles.signOutText}>ℹ️ Debug Info</AppText>
            </Pressable>

            {/* ── Sign Out ───────────────────────────────────────────────────── */}
            <Pressable style={styles.signOutBtn} onPress={() => signOutHackathon()}>
              <AppText style={styles.signOutText}>Sign Out</AppText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
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
  titleEmoji: { fontSize: 36 },
  titleTextWrap: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  rollCountInline: {
    fontSize: 11,
    color: WHITE55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  diceBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  diceText: { fontSize: 24, lineHeight: 30 },

  // Info card — flat background, no native gradient
  infoCard: {
    backgroundColor: "rgba(20,28,41,0.6)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: Space.lg,
    marginTop: Space.sm,
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

  // Section card — flat background, no native gradient
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: Space.lg,
    gap: Space.md,
    marginTop: Space.sm,
  },
  sectionTitle: {
    fontSize: 18,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },

  // Social media
  socialInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    backgroundColor: INPUT_BG,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  socialIcon: { fontSize: 20 },
  socialInput: {
    flex: 1,
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_400Regular",
    padding: 0,
  },
  saveBtn: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER_ACTIVE,
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

  // Team
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
    backgroundColor: "rgba(145,196,227,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  teamInitials: {
    fontSize: 16,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  teamNameContainer: { flex: 1 },
  uploadBtn: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER_ACTIVE,
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

  // Questionnaire
  qList: { gap: Space.md },

  // Placeholder
  placeholderCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: Space.lg,
    gap: Space.xs,
    marginTop: Space.sm,
  },
  placeholderTitle: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  placeholderText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "BaiJamjuree_400Regular",
  },
  placeholderBadge: {
    fontSize: 10,
    color: AMBER,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: Space.xs,
    fontFamily: "BaiJamjuree_700Bold",
  },

  // Admin
  adminCard: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(101,171,252,0.28)",
    padding: Space.lg,
    gap: Space.sm,
    marginTop: Space.sm,
  },
  adminTitle: {
    fontSize: 17,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  adminText: {
    fontSize: 13,
    lineHeight: 19,
    color: WHITE75,
    fontFamily: "BaiJamjuree_400Regular",
  },
  adminBtn: {
    backgroundColor: "rgba(101,171,252,0.14)",
    borderWidth: 1,
    borderColor: "rgba(101,171,252,0.4)",
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: Space.xs,
  },
  adminBtnText: {
    color: CYAN,
    fontSize: 12,
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Link button
  linkBtn: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER_ACTIVE,
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

  // Sign out / debug
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

  // Push banner
  pushBanner: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    backgroundColor: "rgba(245,158,11,0.08)",
    padding: Space.md,
    marginTop: Space.sm,
  },
  pushBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  pushBannerIcon: { fontSize: 24 },
  pushBannerTitle: {
    fontSize: 14,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  pushBannerText: {
    fontSize: 12,
    color: WHITE55,
    fontFamily: "BaiJamjuree_400Regular",
  },
  pushBannerAction: {
    fontSize: 11,
    color: AMBER,
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1,
  },
});
