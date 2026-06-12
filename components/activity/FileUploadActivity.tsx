import { useState } from "react";
import { View, StyleSheet, Alert, Pressable } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";
import { GlassButton } from "../Glass/GlassButton";
import {
  Text as ThemeText,
  Space,
  Radius,
  Shadow,
} from "../../lib/theme";
import type { PathActivityWithContent, PathAssessment } from "../../types/pathlab-content";

interface Props {
  activity: PathActivityWithContent;
  onComplete: (fileUrl: string) => void;
}

export default function FileUploadActivity({ activity, onComplete }: Props) {
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);

  const assessment = activity.path_assessment as PathAssessment | null;

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({ name: file.name, uri: file.uri });
        onComplete(file.uri);
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file");
    }
  };

  if (!assessment) return null;

  return (
    <GlassCard style={styles.assessmentCard}>
      <AppText variant="bold" style={styles.assessmentType}>
        {assessment.assessment_type.replace(/_/g, " ").toUpperCase()}
      </AppText>

      <View style={styles.uploadContainer}>
        <GlassButton
          variant="secondary"
          style={styles.uploadButton}
          textStyle={styles.glassButtonText}
          onPress={handlePickFile}
        >
          📎 Choose File
        </GlassButton>
        {selectedFile && (
          <GlassCard style={styles.selectedFileCard}>
            <AppText style={styles.selectedFileName}>📄 {selectedFile.name}</AppText>
          </GlassCard>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  assessmentCard: {
    marginBottom: Space.lg,
  },
  assessmentType: {
    fontSize: 11,
    fontWeight: "600",
    color: ThemeText.muted,
    marginBottom: 12,
  },
  uploadContainer: {
    marginTop: 12,
  },
  uploadButton: {
    flex: 1,
  },
  glassButtonText: {
    fontFamily: "BaiJamjuree_700Bold",
  },
  selectedFileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Space.md,
  },
  selectedFileName: {
    fontSize: 14,
    color: ThemeText.primary,
    flex: 1,
  },
});
