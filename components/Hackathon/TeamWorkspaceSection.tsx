import { StyleSheet, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../AppText";
import { Radius, Space } from "../../lib/theme";

const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE45 = "rgba(255,255,255,0.45)";

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
    <View style={styles.card}>
      <LinearGradient colors={["#01040A", "#030B17"]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <AppText variant="bold" style={styles.title}>
          {title}
        </AppText>
        <AppText style={styles.description}>{description}</AppText>
      </View>

      {fields.map((field) => (
        <View key={field.key} style={styles.field}>
          <AppText style={styles.fieldLabel}>
            {field.label}
          </AppText>
          <TextInput
            value={field.value}
            onChangeText={field.onChangeText}
            placeholder={field.placeholder}
            placeholderTextColor={WHITE45}
            multiline={field.multiline}
            textAlignVertical={field.multiline ? "top" : "center"}
            style={[styles.input, field.multiline ? styles.textarea : null]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    padding: Space.lg,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 17,
    color: WHITE,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: WHITE75,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 10,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(0,240,255,0.15)",
    backgroundColor: "rgba(0,240,255,0.03)",
    color: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
  },
  textarea: {
    minHeight: 124,
  },
});
