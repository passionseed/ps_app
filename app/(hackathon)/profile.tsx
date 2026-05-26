import { useCallback, useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

import { HackathonJellyfishLoader } from "../../components/Hackathon/HackathonJellyfishLoader";
import { ProfileHeroCard } from "../../components/Hackathon/Profile/ProfileHeroCard";
import {
  ProfileTeamCard,
  ProfileTeamEmptyCard,
} from "../../components/Hackathon/Profile/ProfileTeamCard";
import { ProfileAccordionSection } from "../../components/Hackathon/Profile/ProfileAccordionSection";
import {
  ProfileSocialFields,
  buildSocialSummary,
} from "../../components/Hackathon/Profile/ProfileSocialCard";
import {
  ProfileQuestionnaireFields,
  ProfileQuestionnaireEmptyFields,
  buildQuestionnaireSummary,
} from "../../components/Hackathon/Profile/ProfileQuestionnaireCard";
import { ProfileSettingsCard } from "../../components/Hackathon/Profile/ProfileSettingsCard";
import { useAuth } from "../../lib/auth";
import { Space } from "../../lib/theme";
import { HACK_COLORS } from "../../lib/hackathonTheme";
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

export default function HackathonProfileScreen() {
  const { signOutHackathon, user } = useAuth();
  const participant = useHackathonParticipant();
  const insets = useSafeAreaInsets();

  const [team, setTeam] = useState<HackathonTeam | null>(null);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const hasLoadedRef = useRef(false);

  const [instagramHandle, setInstagramHandle] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  const [teamEmoji, setTeamEmoji] = useState<string | null>(null);
  const [emojiRollCount, setEmojiRollCount] = useState(0);
  const [rollingEmoji, setRollingEmoji] = useState(false);

  const [teamAvatarUrl, setTeamAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [hasPushToken, setHasPushToken] = useState(false);
  const [pushChecked, setPushChecked] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const [socialExpanded, setSocialExpanded] = useState(false);
  const [questionnaireExpanded, setQuestionnaireExpanded] = useState(false);

  const applySnapshot = useCallback((snapshot: HackathonProfileSnapshot) => {
    setTeam(snapshot.team);
    setQuestionnaire(snapshot.questionnaire);
    setInstagramHandle(snapshot.instagramHandle);
    setDiscordUsername(snapshot.discordUsername);
    setTeamEmoji(snapshot.teamEmoji);
    setEmojiRollCount(snapshot.emojiRollCount);
    setTeamAvatarUrl(snapshot.teamAvatarUrl);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadProfileData() {
        const p = await readHackathonParticipant();
        if (!p?.id) {
          setLoading(false);
          return;
        }

        supabase
          .from("hackathon_participant_push_tokens")
          .select("id")
          .eq("participant_id", p.id)
          .limit(1)
          .then(({ data }) => {
            setHasPushToken(!!data?.length);
            setPushChecked(true);
          })
          .then(undefined, () => {
            setPushChecked(true);
          });

        let cachedSnapshot: HackathonProfileSnapshot | null = null;
        try {
          cachedSnapshot = readCachedHackathonProfile(p.id);
        } catch {
          cachedSnapshot = null;
        }

        if (cachedSnapshot) {
          applySnapshot(cachedSnapshot);
          setLoading(false);
        }

        const cacheStatus = getHackathonProfileCacheStatus(cachedSnapshot);
        const isFirstLoad = !hasLoadedRef.current;
        hasLoadedRef.current = true;

        if (cacheStatus.isFresh && !isFirstLoad) {
          return;
        }

        if (!cachedSnapshot) setLoading(true);

        try {
          const [homeData, { data: qData }, { data: participantData }] =
            await Promise.all([
              getCurrentHackathonProgramHome(),
              supabase
                .from("hackathon_pre_questionnaires")
                .select("*")
                .eq("participant_id", p.id)
                .maybeSingle(),
              supabase
                .from("hackathon_participants")
                .select(
                  "instagram_handle, discord_username, team_emoji, emoji_roll_count",
                )
                .eq("id", p.id)
                .maybeSingle(),
            ]);

          if (cancelled) return;

          setTeam(homeData.team);
          setQuestionnaire(qData);

          let igHandle = "";
          let discord = "";
          let emoji: string | null = null;
          let rollCount = 0;
          let avatarUrl: string | null = null;

          if (participantData) {
            igHandle = participantData.instagram_handle || "";
            discord = participantData.discord_username || "";
            emoji = participantData.team_emoji;
            rollCount = participantData.emoji_roll_count || 0;
            setInstagramHandle(igHandle);
            setDiscordUsername(discord);
            setTeamEmoji(emoji);
            setEmojiRollCount(rollCount);
          }

          if (homeData.team?.team_avatar_url) {
            avatarUrl = homeData.team.team_avatar_url;
            setTeamAvatarUrl(avatarUrl);
          }

          setLoading(false);

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
          try {
            writeCachedHackathonProfile(p.id, snapshot);
          } catch {}
        } catch (err) {
          console.error("[Profile] load error", err);
          if (!cancelled) setLoading(false);
        }
      }

      loadProfileData();
      return () => {
        cancelled = true;
      };
    }, [applySnapshot]),
  );

  useEffect(() => {
    if (!loading && !teamEmoji && team?.id && participant?.id) {
      void handleAutoRollEmoji();
    }
  }, [loading, teamEmoji, team?.id, participant?.id]);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminRole() {
      if (isHackathonAdminEmail(participant?.email)) {
        setIsAdmin(true);
        return;
      }

      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!cancelled) {
        setIsAdmin(!error && Boolean(data));
      }
    }

    void checkAdminRole();

    return () => {
      cancelled = true;
    };
  }, [participant?.email, user?.id]);

  const handleEnablePush = async () => {
    if (!participant?.id) return;
    setEnablingPush(true);
    try {
      const token = await requestAndRegisterPushToken(participant.id);
      if (token) {
        setHasPushToken(true);
        Alert.alert(
          "Notifications Enabled",
          "You'll receive updates from your team and mentors.",
        );
      } else {
        Alert.alert(
          "Notifications",
          "Could not enable notifications. Please check your device settings.",
        );
      }
    } catch {
      Alert.alert("Error", "Failed to enable notifications.");
    }
    setEnablingPush(false);
  };

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
        if (team.members) {
          setTeam({
            ...team,
            members: team.members.filter(Boolean).map((m) =>
              m.participant_id === participant.id
                ? { ...m, team_emoji: emoji }
                : m,
            ),
          });
        }
        try {
          const cached = readCachedHackathonProfile(participant.id);
          if (cached) {
            writeCachedHackathonProfile(participant.id, {
              ...cached,
              teamEmoji: emoji,
              emojiRollCount: rollCount,
            });
          }
        } catch {}
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
        try {
          const cached = readCachedHackathonProfile(participant.id);
          if (cached) {
            writeCachedHackathonProfile(participant.id, {
              ...cached,
              instagramHandle: instagramHandle.trim(),
              discordUsername: discordUsername.trim(),
            });
          }
        } catch {}
        Alert.alert("Saved", "Your social media handles have been updated.");
        setSocialExpanded(false);
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

    const { emoji, newRollCount } = getNextEmoji(
      team.id,
      participant.id,
      emojiRollCount,
    );

    try {
      const { error } = await supabase
        .from("hackathon_participants")
        .update({ team_emoji: emoji, emoji_roll_count: newRollCount })
        .eq("id", participant.id);

      if (!error) {
        setTeamEmoji(emoji);
        setEmojiRollCount(newRollCount);
        if (team.members) {
          setTeam({
            ...team,
            members: team.members.filter(Boolean).map((m) =>
              m.participant_id === participant.id
                ? { ...m, team_emoji: emoji }
                : m,
            ),
          });
        }
        try {
          const cached = readCachedHackathonProfile(participant.id);
          if (cached) {
            writeCachedHackathonProfile(participant.id, {
              ...cached,
              teamEmoji: emoji,
              emojiRollCount: newRollCount,
            });
          }
        } catch {}
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

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant access to your photo library to upload an avatar.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Error", "No image was selected.");
        return;
      }

      setUploadingAvatar(true);

      const fileExt =
        asset.mimeType?.split("/").pop()?.split("+")[0] ||
        asset.uri.split(".").pop()?.split("?")[0] ||
        "jpg";
      const fileName = `avatar.${fileExt}`;

      let uploadResult;
      try {
        uploadResult = await uploadAssetToSupabase(
          { uri: asset.uri, fileName, mimeType: asset.mimeType ?? "image/jpeg" },
          "hackathon-team-avatars",
          () => `${team.id}/${fileName}`,
        );
      } catch (e: unknown) {
        const message = formatUploadError(e);
        console.error("[Profile] avatar upload failed", e);
        Alert.alert("Error", message);
        return;
      }

      const avatarUrl = uploadResult.url;

      const { error: updateError } = await supabase
        .from("hackathon_teams")
        .update({ team_avatar_url: avatarUrl })
        .eq("id", team.id);

      if (updateError) {
        Alert.alert("Error", "Failed to update team avatar.");
      } else {
        setTeamAvatarUrl(avatarUrl);
        try {
          if (participant?.id) {
            const cached = readCachedHackathonProfile(participant.id);
            if (cached) {
              writeCachedHackathonProfile(participant.id, {
                ...cached,
                teamAvatarUrl: avatarUrl,
              });
            }
          }
        } catch {}
        Alert.alert("Success", "Team avatar updated!");
      }
    } catch (err) {
      console.error("[Profile] upload avatar error", err);
      Alert.alert("Error", "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getTeamInitials = () => {
    const displayName = team?.team_name || team?.name;
    if (!displayName) return "??";
    const words = displayName.split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  };

  const handleDebugInfo = async () => {
    const token = await getExistingPushToken().catch(() => null);
    const ctx = getSentryRuntimeContext();
    Alert.alert(
      "Debug Info",
      [
        `App: ${Constants.expoConfig?.version ?? "?"}+${ctx.dist ?? "?"}`,
        `Runtime: ${ctx.runtimeVersion ?? "?"}`,
        `Channel: ${ctx.channel ?? "?"}`,
        `Update: ${ctx.updateId ?? "none"}`,
        `OS: ${Platform.OS} ${Platform.Version}`,
        `Env: ${ctx.environment ?? "?"}`,
        "",
        `User: ${user?.id ?? "null"}`,
        `Participant: ${participant?.id ?? "null"}`,
        `Team: ${team?.id ?? "null"}`,
        `Push: ${token ?? "none"}`,
        `Push saved: ${hasPushToken}`,
      ].join("\n"),
    );
  };

  const socialSummary = buildSocialSummary(instagramHandle, discordUsername);
  const questionnaireSummary = buildQuestionnaireSummary(questionnaire);
  const showInitialLoader = loading && !team && !participant?.email;

  if (showInitialLoader) {
    return (
      <View style={[styles.root, styles.loaderRoot]}>
        <HackathonJellyfishLoader />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Space.md },
        ]}
      >
        <ProfileHeroCard
          name={participant?.name ?? "Participant"}
          email={participant?.email ?? "—"}
          university={participant?.university ?? "—"}
          role={participant?.role ?? "—"}
          teamEmoji={teamEmoji}
          emojiRollCount={emojiRollCount}
          rollingEmoji={rollingEmoji}
          canRoll={Boolean(team?.id && participant?.id)}
          onRollEmoji={handleRollEmoji}
        />

        {team ? (
          <ProfileTeamCard
            team={team}
            teamAvatarUrl={teamAvatarUrl}
            teamInitials={getTeamInitials()}
            currentParticipantId={participant?.id}
            uploadingAvatar={uploadingAvatar}
            onUploadAvatar={handleUploadTeamAvatar}
          />
        ) : (
          <ProfileTeamEmptyCard />
        )}

        <ProfileAccordionSection
          title="Social links"
          summary={socialSummary}
          expanded={socialExpanded}
          onToggle={() => setSocialExpanded((v) => !v)}
        >
          <ProfileSocialFields
            instagramHandle={instagramHandle}
            discordUsername={discordUsername}
            saving={savingSocial}
            onChangeInstagram={setInstagramHandle}
            onChangeDiscord={setDiscordUsername}
            onSave={handleSaveSocial}
          />
        </ProfileAccordionSection>

        <ProfileAccordionSection
          title="Pre-hackathon profile"
          summary={questionnaireSummary}
          expanded={questionnaireExpanded}
          onToggle={() => setQuestionnaireExpanded((v) => !v)}
        >
          {questionnaire ? (
            <ProfileQuestionnaireFields questionnaire={questionnaire} />
          ) : (
            <ProfileQuestionnaireEmptyFields />
          )}
        </ProfileAccordionSection>

        <ProfileSettingsCard
          showPushRow={pushChecked && !hasPushToken}
          enablingPush={enablingPush}
          onEnablePush={handleEnablePush}
          isAdmin={isAdmin}
          onDebugInfo={handleDebugInfo}
          onSignOut={() => signOutHackathon()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HACK_COLORS.bgDeep,
  },
  loaderRoot: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Space.lg,
    paddingBottom: 120,
    gap: Space.sm,
  },
});
