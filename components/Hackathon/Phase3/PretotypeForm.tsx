import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { AppText } from "../../AppText";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { uploadToBackblaze } from "../../../lib/backblazeUpload";
import { getPretotypeArtifactImageUri, isPretotypeImageUri } from "../../../lib/hackathonPretotypeArtifact";
import type { AICoachResponse } from "../../../types/hackathon-phase3";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE28 = "rgba(255,255,255,0.28)";
const RED = "#FF6B6B";
const GREEN = "#4ECDC4";
const YELLOW = "#FFA500";

interface PretotypeFormProps {
  cycleId: string;
  priorVariable?: string | null;
  onSubmit: (data: {
    method: string;
    variableChanged: string;
    artifactUrl: string | null;
    description: string;
  }) => void;
  aiFeedback?: AICoachResponse | null;
  lang?: "th" | "en";
  status?: "draft" | "submitted" | "ai_reviewed" | "mentor_reviewed" | "locked";
  initialData?: {
    method: string | null;
    variableChanged: string | null;
    artifactUrl: string | null;
    description: string | null;
  } | null;
}

const METHODS = [
  {
    value: "video_prototype",
    label: "Video Prototype",
    description: "Fake demo video of product experience",
  },
  {
    value: "fake_door",
    label: "Fake Door",
    description: "Landing page with fake buy button to test demand",
  },
  {
    value: "demo",
    label: "Live Demo",
    description: "Wizard-of-Oz mockup you control",
  },
  {
    value: "concierge",
    label: "Concierge",
    description: "Manual service pretending to be product",
  },
  {
    value: "digital_mockup",
    label: "Digital Mockup",
    description: "Figma / sketch of interface",
  },
  {
    value: "physical_mockup",
    label: "Physical Mockup",
    description: "Cardboard / paper prototype",
  },
];

export default function PretotypeForm({
  priorVariable,
  onSubmit,
  aiFeedback,
  lang = "th",
  status = "draft",
  initialData = null,
}: PretotypeFormProps) {
  const [method, setMethod] = useState(initialData?.method ?? "");
  const [variableChanged, setVariableChanged] = useState(initialData?.variableChanged ?? "");
  const [artifactUrl, setArtifactUrl] = useState(initialData?.artifactUrl ?? "");
  const [artifactImageUri, setArtifactImageUri] = useState<string | null>(getPretotypeArtifactImageUri(initialData?.artifactUrl));
  const [artifactImageUrl, setArtifactImageUrl] = useState<string | null>(getPretotypeArtifactImageUri(initialData?.artifactUrl));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [showMethodInfo, setShowMethodInfo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (initialData?.method) setMethod(initialData.method);
    if (initialData?.variableChanged) setVariableChanged(initialData.variableChanged);
    if (initialData?.artifactUrl) {
      setArtifactUrl(initialData.artifactUrl);
      setArtifactImageUri(getPretotypeArtifactImageUri(initialData.artifactUrl));
      setArtifactImageUrl(getPretotypeArtifactImageUri(initialData.artifactUrl));
    }
    if (initialData?.description) setDescription(initialData.description);
  }, [initialData?.method, initialData?.variableChanged, initialData?.artifactUrl, initialData?.description]);

  const selectedMethod = METHODS.find((m) => m.value === method);
  const hasMethod = method.length > 0;
  const hasVariable = variableChanged.trim().length > 0;
  const hasDescription = description.trim().length > 0;
  const canSubmit = hasMethod && hasVariable && hasDescription;

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setArtifactImageUri(asset.uri);
    setUploadingImage(true);
    try {
      const uploadResult = await uploadToBackblaze(
        asset.uri,
        asset.uri.split("/").pop() ?? "pretotype.jpg",
        asset.mimeType ?? "image/jpeg"
      );
      setArtifactImageUrl(uploadResult.url);
      setArtifactUrl(uploadResult.url);
    } catch (e) {
      console.error("Image upload failed", e);
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setArtifactImageUri(null);
    setArtifactImageUrl(null);
    setArtifactUrl("");
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({
      method,
      variableChanged,
      artifactUrl: artifactUrl.trim() || artifactImageUrl || null,
      description,
    });
  }, [canSubmit, method, variableChanged, artifactUrl, artifactImageUrl, description, onSubmit]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="bold" style={styles.title}>
        {lang === "th" ? "ขั้นตอนที่ 2: Pretotype" : "Step 2: Pretotype"}
      </AppText>
      <AppText style={styles.subtitle}>
        {lang === "th" ? "สร้างเวอร์ชันที่ทดสอบได้เร็วที่สุด" : "Build the smallest testable version"}
      </AppText>

      {status !== "draft" && !isEditing && initialData?.method && (
        <View style={styles.submittedView}>
          <View style={styles.submittedHeader}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} />
            <AppText variant="bold" style={styles.submittedTitle}>
              {lang === "th" ? "ส่งแล้ว ✓" : "Submitted ✓"}
            </AppText>
          </View>
          <View style={styles.submittedBody}>
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>Method</AppText>
              <AppText style={styles.submittedValue}>{METHODS.find(m => m.value === initialData.method)?.label ?? initialData.method}</AppText>
            </View>
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>Variable</AppText>
              <AppText style={styles.submittedValue}>{initialData.variableChanged}</AppText>
            </View>
            {initialData.artifactUrl && (
              <View style={styles.submittedRow}>
                <AppText style={styles.submittedLabel}>Artifact</AppText>
                {isPretotypeImageUri(initialData.artifactUrl) ? (
                  <Image source={{ uri: initialData.artifactUrl }} style={styles.submittedImage} />
                ) : (
                  <AppText style={styles.submittedValue}>{initialData.artifactUrl}</AppText>
                )}
              </View>
            )}
            <View style={styles.submittedRow}>
              <AppText style={styles.submittedLabel}>Test Plan</AppText>
              <AppText style={styles.submittedValue}>{initialData.description}</AppText>
            </View>
          </View>
          <Pressable
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={16} color={CYAN} />
            <AppText style={styles.editButtonText}>
              {lang === "th" ? "แก้ไข" : "Edit"}
            </AppText>
          </Pressable>
        </View>
      )}

      <View style={styles.divider} />

      <View>
        <View style={styles.fieldHeader}>
          <AppText variant="bold" style={styles.fieldLabel}>
            {lang === "th" ? "วิธี Pretotype *" : "Pretotype Method *"}
          </AppText>
          <Ionicons
            name={hasMethod ? "checkmark-circle" : "close-circle"}
            size={20}
            color={hasMethod ? GREEN : RED}
          />
        </View>
        <AppText style={styles.fieldHint}>
          {lang === "th" ? "เลือกวิธีที่เร็วที่สุดในการทดสอบสมมติฐาน" : "Choose the fastest way to test your hypothesis"}
        </AppText>
        <View style={styles.methodGrid}>
          {METHODS.map((m) => (
            <Pressable
              key={m.value}
              style={[
                styles.methodCard,
                method === m.value && styles.methodCardActive,
              ]}
              onPress={() => {
                setMethod(m.value);
                setShowMethodInfo(
                  showMethodInfo === m.value ? null : m.value
                );
              }}
            >
              <View style={styles.methodHeader}>
                <Ionicons
                  name={
                    m.value === "video_prototype"
                      ? "videocam"
                      : m.value === "fake_door"
                      ? "browsers"
                      : m.value === "demo"
                      ? "play-circle"
                      : m.value === "concierge"
                      ? "hand-left"
                      : m.value === "digital_mockup"
                      ? "desktop"
                      : "cube"
                  }
                  size={18}
                  color={method === m.value ? CYAN : WHITE55}
                />
                <AppText
                  style={[
                    styles.methodLabel,
                    method === m.value && styles.methodLabelActive,
                  ]}
                >
                  {m.label}
                </AppText>
              </View>
              {showMethodInfo === m.value && (
                <AppText style={styles.methodDescription}>
                  {m.description}
                </AppText>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <View>
        <View style={styles.fieldHeader}>
          <AppText variant="bold" style={styles.fieldLabel}>
            {lang === "th" ? "เปลี่ยน 1 ตัวแปร *" : "ONE Variable Changed *"}
          </AppText>
          <Ionicons
            name={hasVariable ? "checkmark-circle" : "close-circle"}
            size={20}
            color={hasVariable ? GREEN : RED}
          />
        </View>
        <AppText style={styles.fieldHint}>
          {lang === "th" ? "สิ่งเดียวที่คุณเปลี่ยนจาก Cycle ก่อน" : "What is the ONE thing you changed from the last cycle?"}
        </AppText>
        {priorVariable && (
          <View style={styles.priorVariableBlock}>
            <AppText style={styles.priorVariableLabel}>{lang === "th" ? "ตัวแปรก่อนหน้า:" : "Prior variable:"}</AppText>
            <AppText style={styles.priorVariableText}>{priorVariable}</AppText>
          </View>
        )}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={lang === "th" ? "เราเปลี่ยน ___ เพราะเราได้เรียนรู้ ___" : "We changed ___ because we learned ___"}
          placeholderTextColor={WHITE28}
          value={variableChanged}
          onChangeText={setVariableChanged}
          multiline
        />
        <AppText style={styles.variableTip}>
          <Ionicons name="bulb" size={12} color={YELLOW} /> {lang === "th" ? "เปลี่ยนเพียง 1 ตัวแปรต่อ Cycle มิฉะนั้นจะไม่รู้ว่าอะไรเป็นสาเหตุ" : "Tip: Change only ONE variable per cycle. Otherwise you won't know what caused the result."}
        </AppText>
      </View>

      <View style={styles.divider} />

      <View>
        <AppText variant="bold" style={styles.fieldLabel}>
          {lang === "th" ? "Pretotype Artifact" : "Pretotype Artifact"}
        </AppText>
        <AppText style={styles.fieldHint}>
          {lang === "th" ? "ลิงก์หรือรูปภาพของ prototype" : "Link or image of your prototype"}
        </AppText>

        {artifactImageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: artifactImageUri }} style={styles.imagePreview} />
            <Pressable style={styles.removeImageButton} onPress={handleRemoveImage}>
              <Ionicons name="close-circle" size={24} color={RED} />
            </Pressable>
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={CYAN} />
              </View>
            )}
          </View>
        )}

        {!artifactImageUri && (
          <View style={styles.artifactRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="https://..."
              placeholderTextColor={WHITE28}
              value={artifactUrl}
              onChangeText={setArtifactUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Pressable
              style={styles.imageUploadButton}
              onPress={handlePickImage}
              disabled={uploadingImage}
            >
              <Ionicons name="image" size={20} color={CYAN} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View>
        <View style={styles.fieldHeader}>
          <AppText variant="bold" style={styles.fieldLabel}>
            {lang === "th" ? "วิธีทดสอบ *" : "How You Will Test *"}
          </AppText>
          <Ionicons
            name={hasDescription ? "checkmark-circle" : "close-circle"}
            size={20}
            color={hasDescription ? GREEN : RED}
          />
        </View>
        <AppText style={styles.fieldHint}>
          {lang === "th" ? "อธิบายว่าผู้ใช้จะโต้ตอบกับ pretotype อย่างไร" : "Describe exactly how someone will interact with your pretotype"}
        </AppText>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={lang === "th" ? "ผู้ใช้จะเห็น ___ แล้ว ___" : "User will see ___ and then ___"}
          placeholderTextColor={WHITE28}
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </View>

      {selectedMethod && (
        <View style={styles.previewBlock}>
          <AppText variant="bold" style={styles.previewTitle}>
            {lang === "th" ? "แผน Pretotype" : "Pretotype Plan"}
          </AppText>
          <View style={styles.previewRow}>
            <AppText style={styles.previewLabel}>{lang === "th" ? "วิธี:" : "Method:"}</AppText>
            <AppText style={styles.previewValue}>
              {selectedMethod.label}
            </AppText>
          </View>
          <View style={styles.previewRow}>
            <AppText style={styles.previewLabel}>{lang === "th" ? "ตัวแปร:" : "Variable:"}</AppText>
            <AppText style={styles.previewValue}>{variableChanged}</AppText>
          </View>
          <View style={styles.previewRow}>
            <AppText style={styles.previewLabel}>{lang === "th" ? "ทดสอบ:" : "Test:"}</AppText>
            <AppText style={styles.previewValue}>{description}</AppText>
          </View>
        </View>
      )}

      <Pressable
        style={[
          styles.submitButton,
          !canSubmit && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        <AppText variant="bold" style={styles.submitButtonText}>
          {lang === "th" ? "ส่ง Pretotype" : "Submit Pretotype"}
        </AppText>
      </Pressable>

      {aiFeedback && (
        <View style={styles.aiFeedback}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={16} color={CYAN} />
            <AppText variant="bold" style={styles.aiTitle}>
              {lang === "th" ? "โค้ช AI" : "AI Coach"}
            </AppText>
          </View>
          {aiFeedback.flags.map((flag: any, i: number) => (
            <View key={i} style={styles.aiFlag}>
              <Ionicons
                name={
                  flag.severity === "blocking"
                    ? "close-circle"
                    : flag.severity === "warning"
                    ? "warning"
                    : "information-circle"
                }
                size={16}
                color={
                  flag.severity === "blocking"
                    ? RED
                    : flag.severity === "warning"
                    ? YELLOW
                    : CYAN
                }
              />
              <AppText style={styles.aiFlagText}>{flag.message}</AppText>
            </View>
          ))}
          {aiFeedback.response && (
            <AppText style={styles.aiResponse}>
              {aiFeedback.response}
            </AppText>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: {
    paddingVertical: 16,
    gap: 20,
  },
  title: { color: WHITE, fontSize: 22, marginBottom: 4 },
  subtitle: { color: WHITE55, fontSize: 14, marginBottom: 4 },
  divider: {
    height: 1,
    backgroundColor: "rgba(74,107,130,0.2)",
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fieldLabel: { color: CYAN, fontSize: 16 },
  fieldHint: { color: WHITE55, fontSize: 12, marginBottom: 8 },
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
  },
  methodCardActive: {
    backgroundColor: CYAN20,
    borderColor: CYAN,
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  methodLabel: { color: WHITE75, fontSize: 14 },
  methodLabelActive: { color: WHITE, fontWeight: "600" },
  methodDescription: {
    color: WHITE55,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    paddingLeft: 28,
  },
  priorVariableBlock: {
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: CYAN45,
    marginBottom: 10,
  },
  priorVariableLabel: { color: WHITE55, fontSize: 11, marginBottom: 4 },
  priorVariableText: { color: WHITE75, fontSize: 13 },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: WHITE,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  variableTip: {
    color: WHITE55,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  previewBlock: {
    borderLeftWidth: 3,
    borderLeftColor: CYAN,
    paddingLeft: 12,
  },
  previewTitle: { color: CYAN, fontSize: 14, marginBottom: 10 },
  previewRow: {
    flexDirection: "row",
    marginBottom: 6,
    gap: 8,
  },
  previewLabel: { color: WHITE55, fontSize: 12, width: 70 },
  previewValue: { color: WHITE, fontSize: 13, flex: 1, lineHeight: 18 },
  submitButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: { backgroundColor: CYAN20, opacity: 0.5 },
  submitButtonText: { color: BG, fontSize: 16 },
  aiFeedback: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(74,107,130,0.2)",
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  aiTitle: { color: CYAN, fontSize: 14 },
  aiFlag: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  aiFlagText: { color: WHITE75, fontSize: 13, flex: 1 },
  aiResponse: { color: WHITE75, fontSize: 13, marginTop: 8, lineHeight: 18 },
  artifactRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  imageUploadButton: {
    backgroundColor: CYAN20,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: CYAN45,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.25)",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: BG,
    borderRadius: 12,
    zIndex: 2,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(3,5,10,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  submittedView: {
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)",
    borderRadius: 12,
  },
  submittedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  submittedTitle: { color: GREEN, fontSize: 16 },
  submittedBody: { gap: 10 },
  submittedRow: { gap: 2 },
  submittedLabel: { color: WHITE55, fontSize: 11, textTransform: "uppercase" },
  submittedValue: { color: WHITE, fontSize: 14, lineHeight: 20 },
  submittedImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    resizeMode: "cover",
    marginTop: 4,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: CYAN20,
    alignSelf: "flex-start",
  },
  editButtonText: { color: CYAN, fontSize: 13 },
});
