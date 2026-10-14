import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, Share, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Ink, Status, Surface, Violet } from "../../lib/theme";
import { roundApi } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { roundLangKey, useEffectiveFlags, useRoundHome, useRoundLang, useRoundUser } from "../../lib/round/hooks";
import { handleProblem } from "../../lib/round/join";
import { readNudgePreference, setNudgePreference, setShiftLanguage } from "../../lib/round/push";
import { roundKeys } from "../../lib/round/queryCore";
import { formatDate } from "../../lib/round/time";
import type { HomeBundle, Lang } from "../../lib/round/types";
import { AvatarGem } from "./AvatarStack";
import { ChipPicker } from "./ChipPicker";
import { GemIcon } from "./GemIcon";
import { GlassCard } from "./GlassCard";
import { GlowProgress } from "./GlowProgress";
import { HeroCard } from "./HeroCard";
import { Icon, type IconName } from "./Icons";
import { PillowButton } from "./PillowButton";
import { Banner, RTextInput, Tag, TextButton } from "./primitives";
import { ProgressRing } from "./ProgressRing";
import { SkeletonBlock } from "./Skeleton";
import { RoundShell } from "./RoundShell";
import { RText } from "./RText";
import { PillAction } from "./SessionCard";

const TAB_BAR_SPACE = 64;
// react-native-web colours the "on" thumb with its own prop (teal by default).
const WEB_SWITCH = (Platform.OS === "web" ? { activeThumbColor: "#FFFFFF" } : {}) as object;

/** First letter worth showing: skips Thai leading vowels and punctuation. */
export function initialOf(name: string): string {
  const match = name.match(/[A-Za-z0-9ก-ฮ]/);
  return (match ? match[0] : name.trim().charAt(0) || "?").toUpperCase();
}

export type ProfileCert = { key: string; round: number; status: "issued" | "revoked"; current: boolean; url: string };

export type ShiftProfileModel = {
  name: string;
  email: string | null;
  handle: string | null;
  round:
    | null
    | {
        number: number;
        phase: "upcoming" | "active" | "review" | "finished";
        day: number;
        total: number;
        startsAt: string;
        missionsDone: number;
        missionsTotal: number;
      };
  certs: ProfileCert[];
  canEditHandle: boolean;
  isAdmin: boolean;
  nudges: boolean | null;
  version: string;
  /** Home bundle still loading: show placeholders, not "not in a shift". */
  loading?: boolean;
};

export type ShiftProfileActions = {
  onChangeLanguage: (lang: Lang) => void;
  onToggleNudges: (value: boolean) => void;
  onSaveHandle: (handle: string) => Promise<string | null>;
  onOpenHome: () => void;
  onShareCert: (cert: ProfileCert) => void;
  onOpenCert: (cert: ProfileCert) => void;
  onOpenAdmin: () => void;
  onSignOut: () => void;
  onDeleteShiftData: () => void;
  onDeleteAccount: () => void;
};

function Section({ title }: { title: string }) {
  return (
    <RText variant="label" style={styles.section} accessibilityRole="header">
      {title}
    </RText>
  );
}

function Row({
  icon,
  label,
  onPress,
  tone = "ink",
  trailing,
  last,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  tone?: "ink" | "danger" | "violet";
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  const color = tone === "danger" ? Status.error : tone === "violet" ? Violet[700] : Ink.primary;
  const body = (
    <>
      <View style={[styles.rowIcon, tone === "danger" && styles.rowIconDanger]}>
        <Icon name={icon} size={18} color={tone === "danger" ? Status.error : Violet[700]} strokeWidth={2} />
      </View>
      <RText variant="body" color={color} weight="500" style={styles.rowLabel}>
        {label}
      </RText>
      {trailing ?? (onPress ? <Icon name="chevron" size={18} color={Ink.tertiary} /> : null)}
    </>
  );
  const style = [styles.row, !last && styles.rowDivider];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [style, pressed && styles.rowPressed]}>
      {body}
    </Pressable>
  );
}

/** Pure profile view (DESIGN.md v4): identity hero, SHIFT ของฉัน, settings, account, version. */
export function ShiftProfileView({ model, actions, lang }: { model: ShiftProfileModel; actions: ShiftProfileActions; lang: Lang }) {
  const { t } = useRoundLang();
  const [editing, setEditing] = useState(false);
  const [handle, setHandle] = useState(model.handle ?? "");
  const [handleError, setHandleError] = useState<string | null>(null);
  const round = model.round;
  const roundName = round ? t("round.tag", { n: round.number }) : null;
  const roundLine = !round
    ? t("ui.profile.none")
    : round.phase === "active"
      ? t("ui.profile.round.active", { d: round.day, total: round.total })
      : round.phase === "upcoming"
        ? t("ui.profile.round.upcoming", { date: formatDate(round.startsAt, lang) })
        : round.phase === "review"
          ? t("ui.profile.round.review")
          : t("ui.profile.round.finished");

  return (
    <>
      <HeroCard watermark={round ? String(round.number) : undefined} style={styles.hero}>
        <View style={styles.identity}>
          <AvatarGem label={initialOf(model.name)} size={64} />
          <View style={styles.identityText}>
            <RText variant="title" numberOfLines={2} accessibilityRole="header">
              {model.name}
            </RText>
            {model.handle ? (
              <RText variant="meta" color={Ink.secondary} numberOfLines={1}>
                {roundName ? `${model.handle} · ${roundName}` : model.handle}
              </RText>
            ) : model.email ? (
              <RText variant="meta" color={Ink.secondary} numberOfLines={1}>
                {model.email}
              </RText>
            ) : null}
          </View>
          {round ? <ProgressRing value={round.missionsDone} total={round.missionsTotal} size={52} /> : null}
        </View>
        {round && round.phase === "active" ? (
          <View style={styles.progressRow}>
            <RText variant="meta" color={Ink.secondary}>
              {roundLine}
            </RText>
            <GlowProgress value={round.total ? round.day / round.total : 0} accessibilityLabel={roundLine} />
          </View>
        ) : null}
      </HeroCard>

      <Section title={t("ui.profile.my_shift")} />
      <GlassCard padding={6}>
        {model.loading ? (
          <View style={styles.loading} accessibilityState={{ busy: true }}>
            <SkeletonBlock height={40} radius={14} />
            <SkeletonBlock height={40} radius={14} width="70%" />
          </View>
        ) : round ? (
          <Row
            icon="calendar"
            label={`${roundName} · ${roundLine}`}
            onPress={actions.onOpenHome}
            last={!model.certs.length && !model.canEditHandle && !model.handle}
            trailing={<Tag label={t("ui.profile.missions", { n: round.missionsDone, total: round.missionsTotal })} />}
          />
        ) : (
          <View style={styles.none}>
            <GemIcon icon="compass" shape="tile" size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <RText variant="label">{t("ui.profile.none")}</RText>
              <TextButton label={t("ui.profile.none_cta")} icon="arrow" onPress={actions.onOpenHome} />
            </View>
          </View>
        )}
        {model.handle ? (
          editing ? (
            <View style={styles.editBox}>
              <RText variant="meta">{t("ui.profile.handle")}</RText>
              <RTextInput value={handle} onChangeText={setHandle} maxLength={24} autoCorrect={false} accessibilityLabel={t("ui.profile.handle")} invalid={!!handleError} />
              {handleError ? <Banner tone="error" text={handleError} /> : null}
              <View style={styles.inline}>
                <TextButton
                  label={t("ui.save")}
                  onPress={() =>
                    void actions.onSaveHandle(handle).then((problem) => {
                      setHandleError(problem);
                      if (!problem) setEditing(false);
                    })
                  }
                />
                <TextButton label={t("ui.cancel")} tone="ink" onPress={() => setEditing(false)} />
              </View>
            </View>
          ) : (
            <Row
              icon="person"
              label={`${t("ui.profile.handle")}: ${model.handle}`}
              last={!model.certs.length}
              onPress={
                model.canEditHandle
                  ? () => {
                      setHandle(model.handle ?? "");
                      setHandleError(null);
                      setEditing(true);
                    }
                  : undefined
              }
              trailing={model.canEditHandle ? <Icon name="pencil" size={17} color={Violet[700]} /> : <View />}
            />
          )
        ) : null}
        {model.certs.map((cert, i) => (
          <View key={cert.key} style={[styles.cert, i < model.certs.length - 1 && styles.rowDivider]}>
            <GemIcon icon="award" size={36} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <RText variant="label">{t("round.tag", { n: cert.round })}</RText>
              <Tag label={cert.status === "issued" ? t("ui.cert.valid") : t("ui.cert.revoked")} tone={cert.status === "issued" ? "success" : "warning"} />
            </View>
            <View style={styles.certActions}>
              {cert.status === "issued" ? <PillAction label={t("ui.cert.share")} icon="share" onPress={() => actions.onShareCert(cert)} /> : null}
              <PillAction label={t("ui.cert.open")} onPress={() => actions.onOpenCert(cert)} />
            </View>
          </View>
        ))}
      </GlassCard>

      <Section title={t("ui.profile.settings")} />
      <GlassCard style={styles.settings}>
        <View style={styles.settingBlock}>
          <View style={styles.inline}>
            <Icon name="globe" size={18} color={Violet[700]} />
            <RText variant="body" color={Ink.primary} weight="500">
              {t("profile.language")}
            </RText>
          </View>
          <ChipPicker
            chips={[
              { value: "th", label: t("ui.language.th") },
              { value: "en", label: t("ui.language.en") },
            ]}
            value={lang}
            onChange={(v) => actions.onChangeLanguage(v as Lang)}
            accessibilityLabel={t("profile.language")}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.switchRow}>
          <Icon name="bell" size={18} color={Violet[700]} />
          <RText variant="body" color={Ink.primary} weight="500" style={{ flex: 1 }}>
            {t("profile.notifications.shift")}
          </RText>
          <Switch
            value={model.nudges ?? true}
            disabled={model.nudges === null}
            onValueChange={actions.onToggleNudges}
            trackColor={{ true: Violet[600], false: Surface.control }}
            thumbColor="#FFFFFF"
            // react-native-web ignores thumbColor when on and defaults to teal.
            {...({ activeThumbColor: "#FFFFFF" } as object)}
            ios_backgroundColor={Surface.control}
            {...WEB_SWITCH}
            accessibilityLabel={t("profile.notifications.shift")}
          />
        </View>
      </GlassCard>

      {model.isAdmin ? (
        <GlassCard padding={6}>
          <Row icon="shield" label={t("ui.profile.admin")} tone="violet" onPress={actions.onOpenAdmin} last trailing={<Icon name="external" size={17} color={Violet[700]} />} />
        </GlassCard>
      ) : null}

      <Section title={t("ui.profile.account")} />
      <GlassCard padding={6}>
        <Row icon="logout" label={t("ui.profile.sign_out")} onPress={actions.onSignOut} />
        <Row icon="trash" label={t("profile.delete")} tone="danger" onPress={actions.onDeleteShiftData} />
        <Row icon="trash" label={t("ui.profile.delete_account")} tone="danger" onPress={actions.onDeleteAccount} last />
      </GlassCard>

      <RText variant="meta" style={styles.version}>
        {`Passion Seed · ${t("ui.profile.version", { v: model.version })}`}
      </RText>
    </>
  );
}

function useIsAdmin(userId: string) {
  return useQuery({
    queryKey: ["profile", "shift-admin", userId],
    enabled: !!userId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      return !error && !!data;
    },
  });
}

export function buildProfileModel(input: {
  bundle: HomeBundle | null;
  name: string;
  email: string | null;
  isAdmin: boolean;
  nudges: boolean | null;
  version: string;
}): ShiftProfileModel {
  const { bundle } = input;
  const entry = bundle?.entry ?? null;
  const r = bundle?.round ?? null;
  const missions = bundle?.missions ?? null;
  const certs: ProfileCert[] = [
    ...(bundle?.certificate && !bundle.certificate.tombstone && r
      ? [{ key: bundle.certificate.public_id, round: r.number, status: bundle.certificate.status, current: true, url: bundle.certificate.verify_url }]
      : []),
    ...(bundle?.past_certificates ?? [])
      .filter((c) => c.public_id !== bundle?.certificate?.public_id)
      .map((c) => ({ key: c.public_id, round: c.round_number, status: c.status, current: false, url: c.verify_url })),
  ];
  return {
    name: input.name,
    email: input.email,
    handle: entry?.handle ?? null,
    round:
      entry && r
        ? {
            number: r.number,
            phase: r.phase,
            day: Math.max(1, Math.min(r.day, r.duration_days)),
            total: r.duration_days,
            startsAt: r.starts_at,
            missionsDone: missions?.missions_complete ?? 0,
            missionsTotal: missions?.missions_total || missions?.missions.length || 7,
          }
        : null,
    certs,
    canEditHandle: !!entry && !bundle?.certificate,
    isAdmin: input.isAdmin,
    nudges: input.nudges,
    version: input.version,
  };
}

/**
 * Profile tab (spec 4.2): who you are, your SHIFT (current round, certificates), language and
 * notifications, the web admin for admins, sign out, delete SHIFT data, delete account.
 */
export function ShiftProfile() {
  const { user, signOut, exitGuestMode, isGuest } = useAuth();
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const flags = useEffectiveFlags();
  const queryClient = useQueryClient();
  const admin = useIsAdmin(userId);
  const [nudges, setNudges] = useState<boolean | null>(null);

  useEffect(() => {
    if (userId) void readNudgePreference(userId).then(setNudges);
  }, [userId]);

  if (!userId) {
    return (
      <RoundShell bottomInset={TAB_BAR_SPACE} dock={
          <PillowButton
            label={t("ui.sign_in")}
            icon="person"
            onPress={() => {
              // Leave guest mode first, or the guest redirect can win over the sign-in screen.
              if (isGuest) exitGuestMode();
              router.push("/sign-in");
            }}
          />
        }
      >
        <RText variant="display" accessibilityRole="header">
          {t("tab.profile")}
        </RText>
        <HeroCard>
          <View style={styles.guest}>
            <GemIcon icon="person" size={52} />
            <RText variant="h3" style={styles.center}>
              {t("ui.profile.guest.title")}
            </RText>
            <RText variant="body" style={styles.center}>
              {t("ui.profile.guest.body")}
            </RText>
          </View>
        </HeroCard>
        <RText variant="meta" style={styles.version}>
          {`Passion Seed · ${t("ui.profile.version", { v: Constants.expoConfig?.version ?? "dev" })}`}
        </RText>
      </RoundShell>
    );
  }

  const bundle = home.data?.bundle ?? null;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const email = user?.email ?? null;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    bundle?.entry?.handle ||
    (email ? email.split("@")[0] : "") ||
    "SHIFT";
  const model = buildProfileModel({
    bundle,
    name,
    email,
    isAdmin: admin.data === true,
    nudges,
    version: Constants.expoConfig?.version ?? "dev",
  });
  model.loading = home.isPending;

  const actions: ShiftProfileActions = {
    onChangeLanguage: async (next) => {
      if (next === lang) return;
      queryClient.setQueryData(roundLangKey(userId), next);
      const ok = await setShiftLanguage(userId, next);
      if (!ok) queryClient.setQueryData(roundLangKey(userId), lang);
    },
    onToggleNudges: async (value) => {
      setNudges(value);
      const ok = await setNudgePreference(userId, value);
      if (!ok) setNudges(!value);
    },
    onSaveHandle: async (value) => {
      const entry = bundle?.entry;
      if (!entry) return null;
      if (handleProblem(value)) return t("ui.join.handle_invalid");
      const result = await roundApi.setHandle(entry.id, value.trim());
      if (!result.ok) return errorCopy(lang, result.error, { field: t("join.handle.q") });
      await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
      return null;
    },
    onOpenHome: () => router.navigate("/(tabs)/shift"),
    onShareCert: (cert) =>
      void Share.share({ message: t("ui.cert.share_message", { round: t("round.tag", { n: cert.round }), url: cert.url }) }).catch(() => {}),
    onOpenCert: (cert) => (cert.current ? router.push("/round/certificate") : void Linking.openURL(cert.url)),
    onOpenAdmin: () => void WebBrowser.openBrowserAsync(`${flags.web_base_url}/admin/shift/rounds`).catch(() => {}),
    onSignOut: () => {
      const go = async () => {
        await signOut();
        router.replace("/");
      };
      if (Platform.OS === "web") {
        const confirm = (globalThis as { confirm?: (text: string) => boolean }).confirm;
        if (!confirm || confirm(t("ui.profile.sign_out_confirm"))) void go();
        return;
      }
      Alert.alert(t("ui.profile.sign_out"), t("ui.profile.sign_out_confirm"), [
        { text: t("ui.cancel"), style: "cancel" },
        { text: t("ui.profile.sign_out"), style: "destructive", onPress: () => void go() },
      ]);
    },
    onDeleteShiftData: () => router.push("/round/delete-data"),
    onDeleteAccount: () => router.push("/delete-account"),
  };

  return (
    <RoundShell bottomInset={TAB_BAR_SPACE} refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      <ShiftProfileView model={model} actions={actions} lang={lang} />
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 14 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  identityText: { flex: 1, minWidth: 0, gap: 2 },
  progressRow: { gap: 8 },
  section: { marginTop: 8, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Surface.line },
  rowPressed: { backgroundColor: "rgba(241,236,255,0.7)" },
  rowIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: Violet[50], alignItems: "center", justifyContent: "center" },
  rowIconDanger: { backgroundColor: Status.errorBg },
  rowLabel: { flex: 1, minWidth: 0 },
  none: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
  editBox: { gap: 8, padding: 10 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cert: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 10 },
  certActions: { flexDirection: "row", gap: 8 },
  settings: { gap: 12 },
  settingBlock: { gap: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Surface.line },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
  version: { textAlign: "center", marginTop: 6 },
  loading: { gap: 8, padding: 10 },
  guest: { alignItems: "center", gap: 10, paddingVertical: 8 },
  center: { textAlign: "center" },
});
