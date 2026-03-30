import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

interface VoiceAIReflectionProps {
  onSave: (transcript: string) => void;
  onDismiss: () => void;
}

export function VoiceAIReflection({
  onSave,
  onDismiss,
}: VoiceAIReflectionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);

      // Mock Whisper processing delay
      setTimeout(() => {
        setIsProcessing(false);
        setTranscript(
          "I found the customer interview task really interesting. It was cool to hear real problems people face, but creating the solution was a bit confusing.",
        );
      }, 1500);
    } else {
      setIsRecording(true);
      setTranscript("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Reflection</Text>
      <Text style={styles.prompt}>
        How did this quest make you feel about the career? What was the best
        part?
      </Text>

      <View style={styles.recordContainer}>
        <Pressable
          style={[styles.recordButton, isRecording && styles.recordingActive]}
          onPress={toggleRecording}
        >
          <Text style={styles.recordIcon}>{isRecording ? "⏹" : "🎤"}</Text>
        </Pressable>
        <Text style={styles.statusText}>
          {isRecording
            ? "Recording... Tap to stop"
            : isProcessing
              ? "Transcribing..."
              : "Tap to speak"}
        </Text>
      </View>

      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptText}>{transcript}</Text>
          <View style={styles.actions}>
            <Pressable
              style={styles.saveBtn}
              onPress={() => onSave(transcript)}
            >
              <Text style={styles.saveBtnText}>Save Reflection</Text>
            </Pressable>
            <Pressable
              style={styles.retryBtn}
              onPress={() => setTranscript("")}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!transcript && !isRecording && !isProcessing && (
        <Pressable style={styles.skipBtn} onPress={onDismiss}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    fontFamily: "LibreFranklin_400Regular",
    textAlign: "center",
  },
  prompt: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "LibreFranklin_400Regular",
  },
  recordContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  recordingActive: {
    backgroundColor: "#FEE2E2", // Light red
    borderColor: "#EF4444",
  },
  recordIcon: {
    fontSize: 24,
  },
  statusText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "LibreFranklin_400Regular",
  },
  transcriptBox: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  transcriptText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#BFFF00",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  retryBtnText: {
    fontSize: 14,
    color: "#6B7280",
    textDecorationLine: "underline",
  },
  skipBtn: {
    alignItems: "center",
    marginTop: 8,
  },
  skipText: {
    fontSize: 14,
    color: "#9CA3AF",
    textDecorationLine: "underline",
  },
});
