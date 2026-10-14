import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Depth, Ink, Status, Violet } from "../../lib/theme";
import { useRoundHome, useRoundLang } from "../../lib/round/hooks";
import { interviewGuide } from "../../lib/round/plan";
import { RoundShell } from "../../components/round/RoundShell";
import { RText } from "../../components/round/RText";
import { IconButton, Tag } from "../../components/round/primitives";
import { Icon } from "../../components/round/Icons";
import { useToast } from "../../components/round/Toast";

/**
 * วิธีคุยกับคน (scale spec 4.1, mockup D): the mentors' interview guide from the curriculum
 * (`plan.interview`), else the built-in SHIFT2 guide. Copy the DM, the questions, do and don't.
 */
export default function GuideScreen() {
  const { lang, t } = useRoundLang();
  const home = useRoundHome();
  const toast = useToast();
  const { guide } = interviewGuide(home.data?.bundle.plan, lang);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shift"));

  const copyDm = async () => {
    try {
      await Clipboard.setStringAsync(guide.dm);
      toast.show(t("guide.copied"));
    } catch {
      // clipboard unavailable (rare): nothing to undo
    }
  };

  return (
    <RoundShell>
      <View style={styles.top}>
        <IconButton icon="back" label={t("ui.back")} onPress={close} />
        <Tag label={t("guide.tag")} />
      </View>
      <RText variant="display" accessibilityRole="header" style={styles.title}>
        {t("guide.title")}
      </RText>
      {guide.intro ? <RText variant="body">{guide.intro}</RText> : null}

      {guide.dm ? (
        <View style={[styles.dm, Depth.dark]}>
          <LinearGradient colors={["#3A3850", "#2A2838"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, styles.dmRadius]} />
          <RText variant="body" color="#F4F3FF" style={styles.dmText} selectable>
            {`“${guide.dm}”`}
          </RText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("guide.copy")}
            onPress={() => void copyDm()}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
          >
            <LinearGradient colors={["#FFFFFF", "#EBE8FD"]} style={[StyleSheet.absoluteFill, styles.copyRadius]} />
            <Icon name="copy" size={16} color={Ink.primary} strokeWidth={2.1} />
            <RText variant="label" color={Ink.primary} style={styles.copyText}>
              {t("guide.copy")}
            </RText>
          </Pressable>
        </View>
      ) : null}

      {guide.questions.length ? (
        <View style={styles.block}>
          <RText variant="label" accessibilityRole="header">
            {t("guide.questions", { n: guide.questions.length })}
          </RText>
          {guide.questions.map((q, i) => (
            <View key={`${i}-${q}`} style={styles.question}>
              <View style={styles.num}>
                <RText variant="label" latin color={Violet[700]} style={styles.numText}>
                  {String(i + 1)}
                </RText>
              </View>
              <RText variant="body" color={Ink.primary} style={styles.flex}>
                {q}
              </RText>
            </View>
          ))}
        </View>
      ) : null}

      {guide.dos.length || guide.donts.length ? (
        <View style={styles.doDont}>
          {guide.dos.length ? <Rules title={t("guide.do")} items={guide.dos} tone="do" /> : null}
          {guide.donts.length ? <Rules title={t("guide.dont")} items={guide.donts} tone="dont" /> : null}
        </View>
      ) : null}
    </RoundShell>
  );
}

function Rules({ title, items, tone }: { title: string; items: string[]; tone: "do" | "dont" }) {
  const palette = tone === "do" ? { bg: Status.successBg, fg: "#0B5C3A", icon: "check" as const } : { bg: "#FFF1F1", fg: "#9B1C1C", icon: "close" as const };
  return (
    <View style={[styles.rules, { backgroundColor: palette.bg }]}>
      <View style={styles.rulesHead}>
        <Icon name={palette.icon} size={16} color={palette.fg} strokeWidth={2.6} />
        <RText variant="label" color={palette.fg} accessibilityRole="header">
          {title}
        </RText>
      </View>
      {items.map((item, i) => (
        <RText key={`${i}-${item}`} variant="small" color={palette.fg} style={styles.rule}>
          {item}
        </RText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, lineHeight: 34 },
  dm: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    backgroundColor: Platform.OS === "android" ? "#2A2838" : undefined,
  },
  dmRadius: { borderRadius: 20 },
  dmText: { fontSize: 15, lineHeight: 24 },
  copy: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  copyRadius: { borderRadius: 999 },
  copyText: { fontSize: 14 },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.9 },
  block: { gap: 10, marginTop: 4 },
  question: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  num: { width: 26, height: 26, borderRadius: 9, backgroundColor: Violet[50], alignItems: "center", justifyContent: "center", marginTop: 1 },
  numText: { fontSize: 12, lineHeight: 16 },
  flex: { flex: 1, minWidth: 0 },
  doDont: { gap: 10 },
  rules: { borderRadius: 16, padding: 14, gap: 6 },
  rulesHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  rule: { fontSize: 14, lineHeight: 21 },
});
