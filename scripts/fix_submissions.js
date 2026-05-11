import fs from 'fs';

const p = 'app/(hackathon)/my-submissions.tsx';
let txt = fs.readFileSync(p, 'utf8');

// Replace constants
txt = txt.replace(/const BORDER_DARK = "[^"]+";/, 'const BORDER_DARK = "#4a6b82";');
txt = txt.replace(/const BORDER_MUTED = "[^"]+";/, 'const BORDER_MUTED = "#5a7a94";');
if (!txt.includes('const BG_ELEVATED')) {
  txt = txt.replace(/const CARD_GRAD_END = "[^"]+";/, 'const CARD_GRAD_END = "rgba(18,28,41,0.8)";\nconst BG_ELEVATED = "#1a2530";');
}

// Replace FeedbackSnippet
const feedbackSnippetRegex = /\/\* ── FeedbackSnippet ─────────────────────────────────────────── \*\/(.|\n)*?(?=\/\* ── ExpandedCard)/;
const newFeedbackSnippet = `/* ── FeedbackSnippet ─────────────────────────────────────────── */
function FeedbackSnippet({ feedback }: { feedback: LatestFeedback }) {
  const accent = feedbackColor(feedback.type);
  return (
    <View style={styles.feedbackWrap}>
      <View style={styles.feedbackHeader}>
        <Ionicons name={feedbackIcon(feedback.type)} size={14} color={accent} />
        <AppText style={[styles.feedbackType, { color: accent }]}>
          {feedback.type === "assessment_review" ? "Assessment" : "Mentor"}
        </AppText>
        {feedback.scoreAwarded != null && feedback.pointsPossible != null && (
          <ScoreBadge awarded={feedback.scoreAwarded} possible={feedback.pointsPossible} />
        )}
        <AppText style={styles.feedbackTime}>{getRelativeTime(feedback.createdAt)}</AppText>
      </View>
      <AppText style={styles.feedbackBody}>{feedback.body}</AppText>
    </View>
  );
}

`;
txt = txt.replace(feedbackSnippetRegex, newFeedbackSnippet);

// Replace ExpandedCard
const expandedCardRegex = /\/\* ── ExpandedCard: inline revision panel ─────────────────────── \*\/(.|\n)*?(?=\/\* ── Main screen ────────────────────────────────────────────────── \*\/)/;
const newExpandedCard = `/* ── ExpandedCard: inline revision panel ─────────────────────── */
function ExpandedCard({
  row,
  onClose,
  onSubmitted,
}: {
  row: ParticipantSubmissionDashboardRow;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const isText = row.assessmentType === "text_answer" || (!row.assessmentType && row.fullText);
  const [text, setText] = useState(row.fullText ?? "");
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [pickedMime, setPickedMime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = isText
    ? text.trim().length > 0
    : pickedUri != null;

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.85 });
    if (result.canceled) return;
    const a = result.assets[0];
    setPickedUri(a.uri);
    setPickedName(a.uri.split("/").pop() ?? "photo.jpg");
    setPickedMime(a.mimeType ?? "image/jpeg");
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const a = result.assets[0];
    setPickedUri(a.uri);
    setPickedName(a.name);
    setPickedMime(a.mimeType ?? "application/octet-stream");
  }

  async function handleSubmit() {
    if (!row.assessmentId) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isText) {
        await submitTextAnswer(row.activityId, row.assessmentId, text.trim());
      } else if (pickedUri && pickedName && pickedMime) {
        await submitFile(row.activityId, row.assessmentId, pickedUri, pickedName, pickedMime);
      }
      invalidateHackathonProgressCache();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      setTimeout(() => onSubmitted(), 1200);
    } catch (e: any) {
      setError(e.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.expandedPanel}>
      {/* Full feedback */}
      {row.latestFeedback && <FeedbackSnippet feedback={row.latestFeedback} />}

      {/* Current submission preview */}
      {(row.fullText || row.hasAttachment) && (
        <View style={styles.submissionReadonlyBlock}>
          <AppText style={styles.submissionReadonlyLabel}>YOUR SUBMISSION</AppText>
          {row.fullText && (
            <AppText style={styles.previewText}>{row.fullText}</AppText>
          )}
          {row.imageUrl && (
            <Image source={{ uri: row.imageUrl }} style={styles.expandedImage} resizeMode="contain" />
          )}
          {row.fileUrls?.[0] && (
            <View style={styles.attachRow}>
              <Ionicons name="document-outline" size={16} color={CYAN} />
              <AppText style={styles.previewMuted} numberOfLines={1}>{row.fileUrls[0].split("/").pop()}</AppText>
            </View>
          )}
        </View>
      )}

      {/* Inline revision area */}
      {row.assessmentId && (
        <View style={styles.revisionArea}>
          <AppText style={styles.revisionLabel}>
            {wantsRevision(row.status) ? "REVISE YOUR ANSWER" : "UPDATE YOUR ANSWER"}
          </AppText>

          {isText ? (
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Type your revised answer…"
              placeholderTextColor={WHITE40}
              value={text}
              onChangeText={setText}
            />
          ) : row.assessmentType === "image_upload" ? (
            <Pressable style={styles.pickBtn} onPress={pickImage}>
              <Ionicons name="camera-outline" size={18} color={CYAN} />
              <AppText style={styles.pickBtnText}>
                {pickedName ?? "Pick new image"}
              </AppText>
            </Pressable>
          ) : (
            <Pressable style={styles.pickBtn} onPress={pickFile}>
              <Ionicons name="attach-outline" size={18} color={CYAN} />
              <AppText style={styles.pickBtnText}>
                {pickedName ?? "Pick new file"}
              </AppText>
            </Pressable>
          )}

          {error && <AppText style={styles.errorInline}>{error}</AppText>}

          <Pressable
            style={[styles.submitBtn, (!canSubmit || submitting) && { opacity: 0.5 }]}
            disabled={!canSubmit || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <AppText variant="bold" style={styles.submitBtnText}>
                {done ? "Submitted ✓" : "Submit revision"}
              </AppText>
            )}
          </Pressable>
        </View>
      )}

      {/* Quick links */}
      <View style={styles.expandedActions}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            hapticLight();
            router.push({ pathname: "/(hackathon)/activity/[nodeId]", params: { nodeId: row.activityId } } as any);
          }}
        >
          <Ionicons name="book-outline" size={16} color={WHITE} />
          <AppText style={styles.secondaryBtnText}>Read content</AppText>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            hapticLight();
            router.push(\`/hackathon-program/activity/\${row.activityId}/comments\` as any);
          }}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={WHITE} />
          <AppText style={styles.secondaryBtnText}>Comments</AppText>
          {row.commentCount > 0 && <View style={styles.commentBadgeWrap}><AppText style={styles.commentBadgeText}>{row.commentCount}</AppText></View>}
        </Pressable>
        <Pressable style={[styles.secondaryBtn, { paddingHorizontal: 12, marginLeft: "auto" }]} onPress={onClose}>
          <Ionicons name="chevron-up" size={18} color={WHITE70} />
        </Pressable>
      </View>
    </View>
  );
}

`;
txt = txt.replace(expandedCardRegex, newExpandedCard);

// Replace collapsed hints
const collapsedOld = `{/* Collapsed: show preview + feedback snippet */}
                          {!isExpanded && (
                            <>
                              {row.textPreview ? (
                                <AppText style={styles.preview} numberOfLines={2}>{row.textPreview}</AppText>
                              ) : row.hasAttachment ? (
                                <View style={styles.attachRow}>
                                  <Ionicons name="attach-outline" size={16} color={CYAN} />
                                  <AppText style={styles.previewMuted}>Attachment submitted</AppText>
                                </View>
                              ) : null}
                              {row.latestFeedback && <FeedbackSnippet feedback={row.latestFeedback} />}
                              {wantsRevision(row.status) && (
                                <View style={styles.revisionHint}>
                                  <Ionicons name="create-outline" size={14} color={PURPLE} />
                                  <AppText style={styles.revisionHintText}>Tap to revise</AppText>
                                </View>
                              )}
                            </>
                          )}`;

const collapsedNew = `{/* Collapsed: show minimal state */}
                          {!isExpanded && (
                            <View style={styles.collapsedHints}>
                              {wantsRevision(row.status) ? (
                                <View style={styles.revisionHintBadge}>
                                  <Ionicons name="alert-circle" size={14} color={AMBER} />
                                  <AppText style={styles.revisionHintText}>Needs Revision</AppText>
                                </View>
                              ) : row.latestFeedback ? (
                                <View style={styles.feedbackHintBadge}>
                                  <Ionicons name="chatbubble-ellipses" size={14} color={CYAN} />
                                  <AppText style={styles.feedbackHintText}>Feedback Available</AppText>
                                </View>
                              ) : null}
                            </View>
                          )}`;
txt = txt.replace(collapsedOld, collapsedNew);

// Replace styles
const oldStylesRegex = /\/\* Feedback snippet \*\/(.|\n)*?(?=}\);)/;
const newStyles = `/* Feedback snippet */
  feedbackWrap: { borderRadius: 12, backgroundColor: "rgba(26,37,48,0.6)", paddingVertical: 12, paddingHorizontal: 14, gap: 6, borderWidth: 1, borderColor: "rgba(74,107,130,0.35)" },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  feedbackType: { fontSize: 10, fontFamily: "BaiJamjuree_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  feedbackTime: { fontSize: 11, color: WHITE40, fontFamily: "BaiJamjuree_400Regular", marginLeft: "auto" },
  feedbackBody: { fontSize: 14, color: WHITE, lineHeight: 22, fontFamily: "BaiJamjuree_400Regular" },
  scoreBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  scoreBadgeText: { fontSize: 11, fontFamily: "BaiJamjuree_700Bold" },

  /* Collapsed Hints */
  collapsedHints: { flexDirection: "row", marginTop: 4 },
  revisionHintBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(251,191,36,0.15)", borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  revisionHintText: { fontSize: 12, color: AMBER, fontFamily: "BaiJamjuree_700Bold" },
  feedbackHintBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(145,196,227,0.15)", borderWidth: 1, borderColor: "rgba(145,196,227,0.3)" },
  feedbackHintText: { fontSize: 12, color: CYAN, fontFamily: "BaiJamjuree_700Bold" },

  /* Expanded panel */
  expandedPanel: { gap: 16, marginTop: 12 },
  expandedImage: { width: "100%", height: 180, borderRadius: 12 },
  
  submissionReadonlyBlock: { gap: 6, backgroundColor: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: BORDER_DARK },
  submissionReadonlyLabel: { fontSize: 10, color: WHITE40, fontFamily: "BaiJamjuree_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  previewText: { fontSize: 14, color: WHITE70, lineHeight: 21, fontFamily: "BaiJamjuree_400Regular" },

  /* Revision area */
  revisionArea: { gap: 10, backgroundColor: BG_ELEVATED, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER_MUTED },
  revisionLabel: { fontSize: 10, color: WHITE70, fontFamily: "BaiJamjuree_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  textArea: { backgroundColor: "rgba(3,5,10,0.5)", borderWidth: 1, borderColor: BORDER_DARK, borderRadius: 12, padding: 16, color: WHITE, fontSize: 14, lineHeight: 21, minHeight: 140, textAlignVertical: "top", fontFamily: "BaiJamjuree_400Regular" },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: CYAN_20, backgroundColor: CYAN_SOFT },
  pickBtnText: { fontSize: 14, color: CYAN, fontFamily: "BaiJamjuree_600SemiBold" },
  
  submitBtn: { paddingVertical: 14, borderRadius: 99, backgroundColor: PURPLE, alignItems: "center", shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },
  submitBtnText: { fontSize: 15, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  errorInline: { fontSize: 13, color: ROSE, fontFamily: "BaiJamjuree_400Regular" },

  /* Ghost buttons -> Secondary Buttons */
  expandedActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  secondaryBtnText: { fontSize: 13, color: WHITE, fontFamily: "BaiJamjuree_600SemiBold" },
  commentBadgeWrap: { backgroundColor: CYAN, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  commentBadgeText: { fontSize: 11, color: "#000", fontFamily: "BaiJamjuree_700Bold" },
`;
txt = txt.replace(oldStylesRegex, newStyles);

fs.writeFileSync(p, txt);
console.log("Updated my-submissions.tsx");
