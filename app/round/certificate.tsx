import React, { useState } from "react";
import { ActivityIndicator, Image, Linking, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useQueryClient } from "@tanstack/react-query";
import { Ink, Violet } from "../../lib/theme";
import { roundApi } from "../../lib/round/api";
import { errorCopy } from "../../lib/round/copy";
import { useRoundHome, useRoundLang, useRoundUser } from "../../lib/round/hooks";
import { roundKeys } from "../../lib/round/queryCore";
import { formatDate } from "../../lib/round/time";
import { certificateImageUrl } from "../../lib/round/certificate";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { PillowButton } from "../../components/round/PillowButton";
import { Banner, Field, IconButton, RTextInput, SoftButton, Tag, TextButton } from "../../components/round/primitives";
import { ChipPicker } from "../../components/round/ChipPicker";
import { ListSkeleton } from "../../components/round/Skeleton";
import { GlassCard } from "../../components/round/GlassCard";
import { HeroCard } from "../../components/round/HeroCard";
import { GemIcon } from "../../components/round/GemIcon";
import { useToast } from "../../components/round/Toast";

export default function CertificateScreen() {
  const { userId } = useRoundUser();
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const queryClient = useQueryClient();
  const toast = useToast();
  const bundle = home.data?.bundle ?? null;
  const cert = bundle?.certificate ?? null;
  const entry = bundle?.entry ?? null;
  const [imageState, setImageState] = useState<"loading" | "ok" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [display, setDisplay] = useState<"handle" | "legal" | null>(null);
  const [legalName, setLegalName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));

  if (home.isPending) {
    return (
      <RoundShell>
        <ListSkeleton rows={2} />
      </RoundShell>
    );
  }
  if (!cert || cert.tombstone || !entry || !bundle) {
    return (
      <RoundShell>
        <View style={styles.top}>
          <IconButton icon="back" label={t("ui.back")} onPress={close} />
        </View>
        <Banner tone="violet" text={t("ui.cert.none")} />
      </RoundShell>
    );
  }

  const base = bundle.flags.web_base_url;
  const verifyUrl = cert.verify_url;
  const shownDisplay = display ?? entry.name_display;
  const roundName = bundle.round ? t("round.tag", { n: bundle.round.number }) : "SHIFT";

  if (cert.status === "revoked") {
    return (
      <RoundShell>
        <View style={styles.top}>
          <IconButton icon="back" label={t("ui.back")} onPress={close} />
        </View>
        <HeroCard>
          <View style={styles.revoked}>
            <GemIcon icon="alert" size={48} muted />
            <RText variant="title" accessibilityRole="header">
              {t("cert.revoked.title")}
            </RText>
            <RText variant="body">{t("cert.revoked.body", { date: formatDate(cert.revoked_at ?? bundle.now, lang) })}</RText>
          </View>
        </HeroCard>
      </RoundShell>
    );
  }

  const share = async (format: "story" | "square") => {
    setSharing(true);
    setError(null);
    try {
      const target = `${FileSystem.cacheDirectory ?? ""}shift-certificate-${cert.public_id}-${format}-${cert.render_version}.png`;
      const result = await FileSystem.downloadAsync(certificateImageUrl(base, cert.public_id, format, cert.render_version), target);
      if (result.status !== 200) throw new Error("render_failed");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: "image/png", dialogTitle: t("cert.share.story") });
      }
      void roundApi.logShare(cert.id, format, "share_sheet");
    } catch {
      setError(t("cert.render_failed"));
    } finally {
      setSharing(false);
    }
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(verifyUrl);
    setCopied(true);
    toast.show(t("cert.share.copied"));
    void roundApi.logShare(cert.id, "link", "copy");
  };

  const saveName = async () => {
    if (!display) return;
    if (display === "legal" && (legalName.trim().length < 2 || legalName.trim().length > 80)) {
      setError(t("error.invalid_field", { field: t("cert.name.legal") }));
      return;
    }
    setSaving(true);
    const result = await roundApi.setCertificateName(cert.id, display, display === "legal" ? legalName.trim() : null);
    setSaving(false);
    if (!result.ok) {
      setError(errorCopy(lang, result.error, { field: t("cert.name.title") }));
      return;
    }
    setDisplay(null);
    setAttempt((a) => a + 1);
    setImageState("loading");
    await queryClient.invalidateQueries({ queryKey: roundKeys.user(userId) });
  };

  const previewName = shownDisplay === "legal" ? legalName.trim() || "…" : entry.handle;

  return (
    <RoundShell
      keyboard
      dock={<PillowButton label={t("cert.share.story")} icon="share" busy={sharing} disabled={imageState === "failed"} onPress={() => void share("story")} />}
    >
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <Tag label={roundName} tone="success" />
      </View>
      <RText variant="display" accessibilityRole="header">
        {t("home.cert.issued.title")}
      </RText>
      <RText variant="meta">{t("ui.cert.issued_on", { date: formatDate(cert.issued_at, lang) })}</RText>
      {error ? <Banner tone="error" text={error} /> : null}

      <HeroCard padding={10}>
        <View style={styles.imageWrap}>
          {imageState !== "failed" ? (
            <Image
              key={`${cert.render_version}-${attempt}`}
              source={{ uri: certificateImageUrl(base, cert.public_id, "story", cert.render_version) }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setImageState("ok")}
              onError={() => setImageState("failed")}
              accessibilityLabel={t("home.cert.issued.title")}
            />
          ) : null}
          {imageState === "loading" ? (
            <View style={styles.overlay}>
              <ActivityIndicator color={Violet[600]} />
              <RText variant="meta">{t("cert.rendering")}</RText>
            </View>
          ) : null}
          {imageState === "failed" ? (
            <View style={styles.overlay}>
              <RText variant="body">{t("cert.render_failed")}</RText>
              <TextButton
                label={t("cert.retry")}
                onPress={() => {
                  setImageState("loading");
                  setAttempt((a) => a + 1);
                }}
              />
            </View>
          ) : null}
        </View>
      </HeroCard>

      <View style={styles.row}>
        <SoftButton label={t("cert.share.square")} icon="share" onPress={() => void share("square")} disabled={sharing} />
        <SoftButton label={copied ? t("cert.share.copied") : t("cert.share.copy")} icon="copy" onPress={() => void copyLink()} />
      </View>
      {copied ? <RText variant="small">{t("cert.share.tip")}</RText> : null}
      <TextButton label={t("cert.verify_url", { url: verifyUrl.replace(/^https:\/\//, "") })} icon="link" onPress={() => void Linking.openURL(verifyUrl)} />

      <GlassCard style={{ gap: 10 }}>
        <RText variant="label">{t("cert.name.title")}</RText>
        <ChipPicker
          chips={[
            { value: "handle", label: t("cert.name.handle", { handle: entry.handle }) },
            { value: "legal", label: t("cert.name.legal") },
          ]}
          value={shownDisplay}
          onChange={(v) => {
            setDisplay(v as "handle" | "legal");
            setError(null);
          }}
          accessibilityLabel={t("cert.name.title")}
        />
        {shownDisplay === "legal" && display === "legal" ? (
          <Field hint={t("cert.name.legal_note")}>
            <RTextInput value={legalName} onChangeText={setLegalName} maxLength={80} accessibilityLabel={t("cert.name.legal")} />
          </Field>
        ) : null}
        <View style={styles.preview}>
          <RText variant="meta">{t("cert.name.preview")}</RText>
          <RText variant="title" color={Ink.primary}>
            {previewName}
          </RText>
        </View>
        {display && display !== entry.name_display ? (
          <TextButton label={t("ui.save")} onPress={() => void saveName()} disabled={saving} />
        ) : display === "legal" && entry.name_display === "legal" ? (
          <TextButton label={t("ui.save")} onPress={() => void saveName()} disabled={saving} />
        ) : null}
      </GlassCard>

      <TextButton label={t("summary.cta")} icon="pencil" onPress={() => router.push("/round/summary")} />
    </RoundShell>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  imageWrap: { width: "100%", aspectRatio: 1080 / 1920, maxHeight: 520, borderRadius: 18, backgroundColor: Violet[50], overflow: "hidden", alignSelf: "center" },
  image: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
  row: { gap: 10 },
  preview: { backgroundColor: "rgba(241,236,255,0.8)", borderRadius: 16, padding: 12, gap: 4 },
  revoked: { gap: 10, alignItems: "flex-start" },
});
