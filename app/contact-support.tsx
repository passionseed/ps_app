import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { AppText as Text } from "../components/AppText";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  Text as ThemeColors,
  Radius,
  Space,
} from "../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { PathLabSkiaLoader } from "../components/PathLabSkiaLoader";
import Constants from "expo-constants";

export default function ContactSupportScreen() {
  const insets = useSafeAreaInsets();
  const { user, appLanguage } = useAuth();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isThai = appLanguage === "th";
  const copy = {
    back: isThai ? "กลับ" : "Back",
    title: isThai ? "ติดต่อฝ่ายสนับสนุน" : "Contact Support",
    description: isThai
      ? "หากคุณพบปัญหาหรือมีข้อเสนอแนะ โปรดส่งข้อความหาเรา ทีมงานของเราจะรีบดำเนินการตรวจสอบและช่วยเหลือคุณโดยเร็วที่สุด"
      : "If you encounter any issues or have feedback, please send us a message. Our team will review and assist you as soon as possible.",
    placeholder: isThai ? "พิมพ์ข้อความของคุณที่นี่..." : "Type your message here...",
    submit: isThai ? "ส่งข้อความ" : "Send Message",
    submitting: isThai ? "กำลังส่ง..." : "Sending...",
    successTitle: isThai ? "ส่งข้อความสำเร็จ" : "Message Sent",
    successMsg: isThai
      ? "ขอบคุณที่ติดต่อเรา ทีมงานจะติดต่อกลับไปโดยเร็วที่สุด"
      : "Thank you for contacting us. Our team will get back to you shortly.",
    errorTitle: isThai ? "เกิดข้อผิดพลาด" : "Error",
    errorMsg: isThai
      ? "ไม่สามารถส่งข้อความได้ โปรดลองอีกครั้งในภายหลัง"
      : "Could not send the message. Please try again later.",
    emptyMsg: isThai ? "กรุณาใส่ข้อความ" : "Please enter a message",
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert("", copy.emptyMsg);
      return;
    }

    if (!user?.id) return;

    setSubmitting(true);
    try {
      const deviceInfo = `\n\n---\nDevice Info:\nPlatform: ${Platform.OS}\nApp Version: ${Constants.expoConfig?.version || "Unknown"}`;
      const finalMessage = message.trim() + deviceInfo;

      const { error } = await supabase.from("support_messages").insert({
        user_id: user.id,
        message: finalMessage,
      });

      if (error) throw error;

      Alert.alert(copy.successTitle, copy.successMsg, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error submitting support message:", error);
      Alert.alert(copy.errorTitle, copy.errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={["#FFFFFF", "#F9F5FF", "#F3EAFF"]} style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ {copy.back}</Text>
        </Pressable>
        <Text style={styles.title}>{copy.title}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Space["2xl"] },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.description}>{copy.description}</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder={copy.placeholder}
              placeholderTextColor={ThemeColors.muted}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>

          <Pressable
            style={[
              styles.submitBtn,
              (!message.trim() || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!message.trim() || submitting}
          >
            {submitting ? (
              <PathLabSkiaLoader size="tiny" />
            ) : (
              <Text style={styles.submitBtnText}>{copy.submit}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  backBtn: {
    paddingRight: Space.lg,
    paddingVertical: Space.sm,
  },
  backBtnText: {
    fontSize: 16,
    color: ThemeColors.secondary,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: ThemeColors.primary,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space["2xl"],
    gap: Space.xl,
  },
  description: {
    fontSize: 15,
    color: ThemeColors.secondary,
    lineHeight: 22,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 200,
  },
  input: {
    flex: 1,
    padding: Space.lg,
    fontSize: 16,
    color: ThemeColors.primary,
    lineHeight: 24,
  },
  submitBtn: {
    backgroundColor: "#8B5CF6",
    borderRadius: Radius.xl,
    paddingVertical: Space.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: Space.md,
  },
  submitBtnDisabled: {
    backgroundColor: "#C4B5FD",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
