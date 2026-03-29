import { StyleSheet, TextInput, View } from "react-native";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";

export type WorkspaceField = {
  key: string;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
};

export function TeamWorkspaceSection({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields: WorkspaceField[];
}) {
  return (
    <GlassCard variant="neutral" style={styles.card}>
      <View style={styles.header}>
        <AppText variant="bold" style={styles.title}>
          {title}
        </AppText>
        <AppText style={styles.description}>{description}</AppText>
      </View>

      {fields.map((field) => (
        <View key={field.key} style={styles.field}>
          <AppText variant="bold" style={styles.fieldLabel}>
            {field.label}
          </AppText>
          <TextInput
            value={field.value}
            onChangeText={field.onChangeText}
            placeholder={field.placeholder}
            placeholderTextColor="rgba(255,255,255,0.45)"
            multiline={field.multiline}
            textAlignVertical={field.multiline ? "top" : "center"}
            style={[styles.input, field.multiline ? styles.textarea : null]}
          />
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 18,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.84,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(8,13,30,0.35)",
    color: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  textarea: {
    minHeight: 124,
  },
});
