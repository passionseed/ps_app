import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { CopyKey, CopyParams } from "../../../lib/round/copy";
import { Field, RTextInput } from "../primitives";

type T = (key: CopyKey, params?: CopyParams) => string;

const PROMPTS = [
  { key: "built", label: "capture.daily.built", max: 500 },
  { key: "broke", label: "capture.daily.broke", max: 500 },
  { key: "heard", label: "capture.daily.heard", max: 500 },
] as const;

/**
 * Daily Show composer (scale spec 4.1, step 8): what you built today (required), what broke and
 * what users said (optional). The optional link sits under "เพิ่มเติม" in the capture screen.
 */
export function DailyComposer({
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
  return (
    <View style={styles.wrap}>
      {PROMPTS.map((p) => {
        const value = typeof fields[p.key] === "string" ? (fields[p.key] as string) : "";
        return (
          <Field key={p.key} label={t(p.label)} error={errors[p.key] || null}>
            <RTextInput
              ref={inputRef?.(p.key)}
              value={value}
              editable={!readOnly}
              multiline
              onChangeText={(v) => onChange(p.key, v)}
              accessibilityLabel={t(p.label)}
              maxLength={p.max}
              invalid={!!errors[p.key]}
              style={styles.input}
            />
          </Field>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  input: { minHeight: 76 },
});
