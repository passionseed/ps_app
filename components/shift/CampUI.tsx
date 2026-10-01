import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "../AppText";
import {
  Accent,
  Border,
  PageBg,
  Radius,
  Text as Colors,
} from "../../lib/theme";
import { useShift } from "../../lib/shift-context";
import { campImageUrl } from "../../lib/shift";
import type { ShiftAction, ShiftUpdate } from "../../types/shift";

export function useCampCopy() {
  const { snapshot } = useShift();
  const isThai = snapshot?.introduction?.language === "th";
  return (en: string, th: string) => (isThai ? th : en);
}
export function useCampAction() {
  const { act } = useShift();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (
    action: ShiftAction,
    payload: Record<string, unknown> = {},
  ) => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      await act(action, payload);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error, setError };
}
export function CampShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const camp = useShift();
  const insets = useSafeAreaInsets();
  const t = useCampCopy();
  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(
    useCallback(() => {
      void camp.reload();
    }, [camp.reload]),
  );
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 110 },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await camp.reload();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>
            {camp.snapshot?.cohort.name ?? "SHIFT"}
          </Text>
          <Text variant="bold" style={styles.title}>
            {title}
          </Text>
        </View>
        <Button
          label={t("My work", "ผลงานฉัน")}
          secondary
          onPress={() => router.push("/shift/profile")}
        />
      </View>
      {camp.cohorts.length > 1 && (
        <View style={styles.wrap}>
          {camp.cohorts.map((c) => (
            <Button
              key={c.id}
              label={c.name}
              secondary
              selected={camp.snapshot?.cohort.id === c.id}
              onPress={() => {
                void camp.select(c.id).catch(() => {});
              }}
            />
          ))}
        </View>
      )}
      {camp.error && (
        <Card>
          <Text style={styles.error}>{camp.error}</Text>
          <Button label={t("Try again", "ลองอีกครั้ง")} onPress={camp.reload} />
        </Card>
      )}
      {camp.loading ? (
        <ActivityIndicator
          color={Accent.green}
          accessibilityLabel="Loading camp"
        />
      ) : camp.snapshot ? (
        children
      ) : (
        !camp.error && (
          <Card>
            <Text variant="bold" style={styles.heading}>
              {t(
                "Your next project can start here",
                "โปรเจกต์ต่อไปเริ่มได้ที่นี่",
              )}
            </Text>
            <Text style={styles.body}>
              {t(
                "Your camp will appear when staff enrolls your account. You can explore existing learning experiences meanwhile.",
                "ค่ายจะปรากฏเมื่อทีมงานเพิ่มบัญชีของคุณ ระหว่างนี้ลองดูประสบการณ์เรียนรู้ที่มีอยู่ได้",
              )}
            </Text>
            <Button
              label={t("Browse learning experiences", "ดูประสบการณ์เรียนรู้")}
              onPress={() => router.push("/(tabs)/discover")}
            />
          </Card>
        )
      )}
    </ScrollView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Button({
  label,
  onPress,
  disabled,
  secondary,
  selected,
}: {
  label: string;
  onPress: () => unknown;
  disabled?: boolean;
  secondary?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        selected && styles.selected,
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      <Text
        variant="bold"
        style={[styles.buttonText, secondary && { color: Colors.primary }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = true,
  placeholder,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={Colors.tertiary}
        style={[
          styles.input,
          multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}
export function PrivateImage({ path }: { path: string }) {
  const [uri, setUri] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const t = useCampCopy();
  useEffect(() => {
    let active = true;
    setUri("");
    setFailed(false);
    campImageUrl(path)
      .then((url) => {
        if (active) setUri(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path, attempt]);
  return failed ? (
    <Button
      secondary
      label={t("Reload screenshot", "โหลดภาพอีกครั้ง")}
      onPress={() => setAttempt((n) => n + 1)}
    />
  ) : uri ? (
    <Image
      source={{ uri }}
      style={{ height: 220, borderRadius: Radius.md, width: "100%" }}
      resizeMode="contain"
      accessibilityLabel="Project screenshot"
      onError={() => setFailed(true)}
    />
  ) : (
    <ActivityIndicator />
  );
}
export function UpdateCard({
  update,
  full = false,
}: {
  update: ShiftUpdate;
  full?: boolean;
}) {
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const project = s?.projects.find((p) => p.id === update.project_id);
  const author = s?.participants.find((p) => p.id === update.author_id);
  const fields = [
    ["shipped", "Tried / shipped", "ลอง / สร้าง"],
    ["broke", "Broke / surprised me", "สิ่งที่พัง / ไม่คาดคิด"],
    ["learned", "Learned", "สิ่งที่เรียนรู้"],
    ["help", "Help wanted", "อยากได้ความช่วยเหลือ"],
    ["problem", "The problem", "ปัญหา"],
    ["evidence", "Testing evidence", "หลักฐานการทดสอบ"],
    ["changes", "What changed", "สิ่งที่เปลี่ยน"],
  ] as const;
  return (
    <Card>
      <Text style={styles.eyebrow}>
        {t("Day", "วันที่")} {update.day}
        {!update.published_at && ` · ${t("Draft", "ฉบับร่าง")}`}
        {update.hidden && ` · ${t("Hidden", "ซ่อนอยู่")}`}
      </Text>
      <Text variant="bold" style={styles.heading}>
        {project?.title}
      </Text>
      <Text style={styles.meta}>
        {author?.name ?? "Participant"}
        {update.revision > 1 && ` · ${t("Edited", "แก้ไขแล้ว")}`}
      </Text>
      {fields
        .filter(([key]) => !!update.body[key] && (full || key === "shipped"))
        .map(([key, en, th]) => (
          <View key={key} style={{ gap: 5 }}>
            <Text variant="bold" style={styles.label}>
              {t(en, th)}
            </Text>
            <Text style={styles.body}>{update.body[key]}</Text>
          </View>
        ))}
      {full && (
        <>
          <Text style={styles.meta}>
            {t("Contributors to this update", "ผู้ร่วมทำงานในโพสต์นี้")}:{" "}
            {update.contributor_ids
              .map(
                (id) =>
                  s?.participants.find((p) => p.id === id)?.name ??
                  "Participant",
              )
              .join(", ")}
          </Text>
          {update.body.screenshots?.map((path) => (
            <PrivateImage key={path} path={path} />
          ))}
          {update.body.link && /^https?:\/\//.test(update.body.link) && (
            <Button
              secondary
              label={t("Try the project", "ลองโปรเจกต์")}
              onPress={() => {
                void Linking.openURL(update.body.link!).catch(() => {});
              }}
            />
          )}
        </>
      )}
      {!full && update.published_at && (
        <Button
          secondary
          label={t("View and respond", "ดูและตอบกลับ")}
          onPress={() =>
            router.push({
              pathname: "/shift/post/[id]",
              params: { id: update.id },
            })
          }
        />
      )}
    </Card>
  );
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PageBg.default },
  scroll: { paddingHorizontal: 22, gap: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: { fontSize: 30, color: Colors.primary, lineHeight: 40 },
  eyebrow: { fontSize: 12, color: Colors.tertiary, letterSpacing: 1 },
  heading: { fontSize: 20, color: Colors.primary, lineHeight: 29 },
  card: {
    padding: 20,
    borderRadius: Radius.xl,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Border.light,
    gap: 14,
  },
  body: { fontSize: 16, lineHeight: 25, color: Colors.secondary },
  meta: { fontSize: 13, lineHeight: 20, color: Colors.tertiary },
  label: { fontSize: 15, color: Colors.primary },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Accent.yellow,
    justifyContent: "center",
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: Border.light,
  },
  selected: { borderColor: Accent.green, backgroundColor: "#ECFDF5" },
  buttonText: { fontSize: 15, color: Colors.primary, textAlign: "center" },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: Border.default,
    borderRadius: Radius.md,
    padding: 14,
    color: Colors.primary,
    fontSize: 16,
    minHeight: 48,
  },
  error: { color: "#B91C1C", fontSize: 15, lineHeight: 24 },
});
