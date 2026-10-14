import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { CopyKey, CopyParams } from "../../../lib/round/copy";
import { Field, RTextInput } from "../primitives";
import { RText } from "../RText";

type T = (key: CopyKey, params?: CopyParams) => string;

/**
 * Problem statement composer (scale spec 2.2, step 3): one user group ("กลุ่มคนใช้", a role,
 * never contact details) and one problem written with the template
 * "[ใคร] ลำบากกับ [อะไร] ตอน [สถานการณ์] เพราะ [ทำไม จากที่คุยมา]".
 */
export function ProblemComposer({
  fields,
  errors,
  readOnly,
  t,
  onChange,
  inputRef,
}: {
  fields: Record<string, unknown>;
  errors: Record<string, string>;
  readOnly: boolean;
  t: T;
  onChange: (key: string, value: string) => void;
  inputRef?: (key: string) => (input: TextInput | null) => void;
}) {
  const str = (k: string) => (typeof fields[k] === "string" ? (fields[k] as string) : "");
  return (
    <View style={styles.wrap}>
      <Field label={t("capture.problem.user_group")} hint={t("capture.problem.user_group_hint")} error={errors.user_group || null}>
        <RTextInput
          ref={inputRef?.("user_group")}
          value={str("user_group")}
          editable={!readOnly}
          onChangeText={(v) => onChange("user_group", v)}
          accessibilityLabel={t("capture.problem.user_group")}
          maxLength={60}
          invalid={!!errors.user_group}
        />
      </Field>
      <Field label={t("ui.problem_text")} error={errors.text || null}>
        <RText variant="meta">{t("capture.template.problem")}</RText>
        <RTextInput
          ref={inputRef?.("text")}
          value={str("text")}
          editable={!readOnly}
          multiline
          onChangeText={(v) => onChange("text", v)}
          accessibilityLabel={t("ui.problem_text")}
          accessibilityHint={t("capture.template.problem")}
          maxLength={500}
          invalid={!!errors.text}
        />
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
});
