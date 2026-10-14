import React from "react";
import { StyleSheet, Switch, TextInput, View } from "react-native";
import { Ink, Status, Surface, Violet } from "../../../lib/theme";
import type { CopyKey, CopyParams } from "../../../lib/round/copy";
import { canAddIdea, canRemoveIdea, type IdeaRow } from "../../../lib/round/ideas";
import { GlassCard } from "../GlassCard";
import { Icon } from "../Icons";
import { Key } from "../Key";
import { RTextInput, TextButton } from "../primitives";
import { RText } from "../RText";

type T = (key: CopyKey, params?: CopyParams) => string;

/**
 * Ideas composer (scale spec 4.1, step 1): 3 to 6 rows of "ไอเดีย" + "ใครเจอ", a radio to pick
 * one, add/remove rows, and the "ทักกลุ่มนี้ได้เอง" switch (D: pick a group you can reach
 * yourself, without asking a teacher or adult).
 */
export function IdeasComposer({
  rows,
  pickedId,
  reachable,
  rowErrors,
  listError,
  pickError,
  readOnly,
  t,
  onChangeRow,
  onPick,
  onAdd,
  onRemove,
  onReachable,
  inputRef,
}: {
  rows: IdeaRow[];
  pickedId: string | null;
  reachable: boolean;
  /** Error per row id, with the field at fault. */
  rowErrors: Record<string, { key: "text" | "who"; message: string }>;
  listError: string | null;
  pickError: string | null;
  readOnly: boolean;
  t: T;
  onChangeRow: (id: string, patch: Partial<Pick<IdeaRow, "text" | "who">>) => void;
  onPick: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onReachable: (value: boolean) => void;
  inputRef?: (key: string) => (input: TextInput | null) => void;
}) {
  const removable = canRemoveIdea(rows) && !readOnly;
  return (
    <View style={styles.wrap}>
      <RText variant="meta">{t("capture.ideas.hint")}</RText>
      <View accessibilityRole="radiogroup" style={styles.list}>
        {rows.map((row, i) => {
          const picked = row.id === pickedId;
          const error = rowErrors[row.id];
          return (
            <GlassCard key={row.id} padding={14} style={[styles.row, picked && styles.rowPicked]}>
              <View style={styles.head}>
                <RText variant="label" style={styles.flex}>
                  {t("capture.ideas.label", { n: i + 1 })}
                </RText>
                <Key
                  size="sm"
                  tone={picked ? "shift" : "porcelain"}
                  label={t("capture.ideas.pick")}
                  accessibilityRole="radio"
                  accessibilityLabel={`${t("capture.ideas.pick")}: ${t("capture.ideas.label", { n: i + 1 })}`}
                  selected={picked}
                  down={picked}
                  led={picked ? "on" : "off"}
                  haptic="select"
                  disabled={readOnly}
                  onPress={() => onPick(row.id)}
                />
                {removable ? (
                  <Key round size="sm" icon="trash" label={`${t("capture.ideas.remove")} ${i + 1}`} onPress={() => onRemove(row.id)} />
                ) : null}
              </View>
              <RTextInput
                ref={inputRef?.(`ideas.${row.id}.text`)}
                value={row.text}
                editable={!readOnly}
                onChangeText={(text) => onChangeRow(row.id, { text })}
                placeholder={t("capture.ideas.text")}
                accessibilityLabel={`${t("capture.ideas.text")} ${i + 1}`}
                maxLength={120}
                invalid={error?.key === "text"}
              />
              <RTextInput
                ref={inputRef?.(`ideas.${row.id}.who`)}
                value={row.who}
                editable={!readOnly}
                onChangeText={(who) => onChangeRow(row.id, { who })}
                placeholder={t("capture.ideas.who")}
                accessibilityLabel={`${t("capture.ideas.who")} ${i + 1}`}
                maxLength={60}
                invalid={error?.key === "who"}
              />
              {error ? <ErrorLine text={error.message} /> : null}
            </GlassCard>
          );
        })}
      </View>
      {listError ? <ErrorLine text={listError} /> : null}
      {pickError ? <ErrorLine text={pickError} /> : null}
      {canAddIdea(rows) && !readOnly ? (
        <View style={styles.start}>
          <TextButton label={t("capture.ideas.add")} icon="plus" onPress={onAdd} />
        </View>
      ) : null}
      <View style={styles.switchRow}>
        <RText variant="body" color={Ink.primary} style={styles.flex}>
          {t("capture.ideas.reachable")}
        </RText>
        <Switch
          value={reachable}
          disabled={readOnly}
          onValueChange={onReachable}
          accessibilityLabel={t("capture.ideas.reachable")}
          trackColor={{ false: Surface.control, true: Violet[600] }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={Surface.control}
        />
      </View>
    </View>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <Icon name="alert" size={16} color={Status.error} />
      <RText variant="small" color={Status.error} style={styles.flex}>
        {text}
      </RText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  list: { gap: 10 },
  row: { gap: 8 },
  rowPicked: { borderColor: "#BDB5EE", borderWidth: 1.5 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  error: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  start: { alignItems: "flex-start" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
});
