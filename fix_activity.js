import fs from 'fs';

const file = 'app/(hackathon)/activity/[nodeId].tsx';
let txt = fs.readFileSync(file, 'utf8');

// Replace PastSubmissionsList
const pastSubListRegex = /function PastSubmissionsList\(\{(.|\n)*?(?=function SubmissionCard\(\{)/;
const newPastSubList = `function PastSubmissionsList({
  submissions,
  highlight,
  onRevise,
  revisionFeedback,
}: {
  submissions: SubmissionRecord[];
  highlight?: boolean;
  onRevise?: () => void;
  revisionFeedback?: InboxItemWithUnread | null;
}) {
  console.log('[PastSubmissionsList] submissions count:', submissions.length, 'first:', submissions[0]?.id);
  if (submissions.length === 0) return null;
  return (
    <View
      style={[
        styles.pastSubmissionsBlock,
        highlight && styles.pastSubmissionsBlockHighlight,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText style={styles.assessmentLabel}>ผลงานของคุณ</AppText>
        {onRevise && (
          <Pressable
            style={({ pressed }) => [
              styles.reviseInlineBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={onRevise}
          >
            <AppText style={styles.reviseInlineText}>แก้ไข →</AppText>
          </Pressable>
        )}
      </View>

      {/* Feedback inline in submissions list */}
      {revisionFeedback && (
        <View style={styles.feedbackInlineCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Ionicons name="chatbubble-ellipses" size={14} color="#91C4E3" />
            <AppText style={{ fontSize: 10, color: "#91C4E3", fontFamily: "BaiJamjuree_700Bold", textTransform: "uppercase", letterSpacing: 1 }}>
              Mentor Feedback
            </AppText>
          </View>
          <AppText style={{ fontSize: 14, lineHeight: 22, color: "#FFFFFF", fontFamily: "BaiJamjuree_400Regular" }}>
            {revisionFeedback.body}
          </AppText>
        </View>
      )}

      <View style={styles.submissionThread}>
        {submissions.map((sub, index) => (
          <SubmissionCard key={sub.id} submission={sub} attempt={submissions.length - index} />
        ))}
      </View>
    </View>
  );
}

`;
txt = txt.replace(pastSubListRegex, newPastSubList);

// Replace SubmissionCard
const subCardRegex = /function SubmissionCard\(\{(.|\n)*?(?=function TeammateSubmissionsList\(\{)/;
const newSubCard = `function SubmissionCard({
  submission,
  attempt,
}: {
  submission: SubmissionRecord | TeammateSubmissionRecord;
  attempt?: number;
}) {
  const participantName =
    "participant_name" in submission ? submission.participant_name : null;

  return (
    <View style={styles.pastSubmissionCard}>
      <View style={styles.submissionCardHeader}>
        {participantName ? (
          <AppText variant="bold" style={styles.teammateName}>
            {participantName}
          </AppText>
        ) : attempt ? (
          <View style={styles.attemptBadge}>
            <AppText style={styles.attemptBadgeText}>ATTEMPT {attempt}</AppText>
          </View>
        ) : null}
        <AppText style={styles.pastSubmissionTime}>
          {new Date(submission.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </AppText>
      </View>
      {submission.text_answer ? (
        <View style={styles.submissionContentBlock}>
          <AppText style={styles.bodyText}>{submission.text_answer}</AppText>
        </View>
      ) : null}
      {submission.image_url ? (
        <Image
          source={{ uri: submission.image_url }}
          style={styles.pastSubmissionImage}
          resizeMode="cover"
        />
      ) : null}
      {submission.file_urls?.[0] ? (
        <View style={styles.submissionFileBlock}>
          <Ionicons name="document-outline" size={16} color="#91C4E3" />
          <AppText style={styles.pastSubmissionFile}>
            {submission.file_urls[0].split("/").pop()}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

`;
txt = txt.replace(subCardRegex, newSubCard);

// Replace TeammateSubmissionsList
const teamListRegex = /function TeammateSubmissionsList\(\{(.|\n)*?(?=\/\/ ── Main screen ───────────────────────────────────────────────────)/;
const newTeamList = `function TeammateSubmissionsList({
  submissions,
  blurred,
}: {
  submissions: TeammateSubmissionRecord[];
  blurred: boolean;
}) {
  return (
    <View style={styles.pastSubmissionsBlock}>
      <AppText style={styles.assessmentLabel}>ผลงานของเพื่อนร่วมทีม</AppText>
      <View style={styles.teammateSubmissionsWrap}>
        {submissions.length === 0 ? (
          <AppText style={styles.teammateEmptyText}>
            ยังไม่มีการส่งจากเพื่อนร่วมทีม
          </AppText>
        ) : (
          <View style={styles.submissionThread}>
            {submissions.map((sub) => (
              <SubmissionCard key={sub.id} submission={sub} />
            ))}
          </View>
        )}

        {blurred ? (
          <View style={styles.teammateBlurOverlay} pointerEvents="none">
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
            <LinearGradient
              colors={["rgba(3,5,10,0.6)", "rgba(3,5,10,0.9)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.teammateBlurCopy}>
              <View style={styles.blurIconCircle}>
                <Ionicons name="lock-closed" size={24} color="#91C4E3" />
              </View>
              <AppText variant="bold" style={styles.teammateBlurTitle}>
                Locked
              </AppText>
              <AppText style={styles.teammateBlurBody}>
                Submit your own answer first to unlock your teammates' submissions.
              </AppText>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

`;
txt = txt.replace(teamListRegex, newTeamList);

// Styles
const stylesRegex = /\/\/ Past Submissions(.|\n)*?(?=\/\/ Assessment)/;
const newStyles = `// Past Submissions
  pastSubmissionsBlock: { gap: Space.sm, marginTop: Space.md },
  pastSubmissionsBlockHighlight: {
    backgroundColor: "rgba(145,196,227,0.04)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    borderRadius: 16,
    padding: Space.md,
    marginHorizontal: -Space.md,
  },
  reviseInlineBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(157,129,172,0.15)",
    borderWidth: 1,
    borderColor: "rgba(157,129,172,0.3)",
    marginLeft: 'auto'
  },
  reviseInlineText: {
    fontSize: 11,
    color: "#9D81AC",
    fontFamily: "BaiJamjuree_700Bold",
  },
  feedbackInlineCard: {
    backgroundColor: "rgba(145,196,227,0.08)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  submissionThread: {
    gap: 12,
  },
  pastSubmissionCard: {
    backgroundColor: "rgba(13,18,25,0.7)",
    borderWidth: 1,
    borderColor: "rgba(74,107,130,0.35)",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  submissionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attemptBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  attemptBadgeText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "BaiJamjuree_700Bold",
    letterSpacing: 1,
  },
  pastSubmissionTime: { fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "BaiJamjuree_400Regular" },
  submissionContentBlock: {
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  pastSubmissionImage: { width: "100%", height: 180, borderRadius: 10, marginTop: 4 },
  submissionFileBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  pastSubmissionFile: { fontSize: 13, color: "#91C4E3", fontFamily: "BaiJamjuree_400Regular" },
  teammateName: { fontSize: 13, color: "#FFFFFF", fontFamily: "BaiJamjuree_700Bold" },
  teammateEmptyText: { fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 20 },
  teammateSubmissionsWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 120,
  },
  teammateBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: Space.lg,
  },
  blurIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(145,196,227,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  teammateBlurCopy: {
    maxWidth: 320,
    alignItems: "center",
    gap: Space.xs,
  },
  teammateBlurTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  teammateBlurBody: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_400Regular"
  },

  // Assessment`;
txt = txt.replace(stylesRegex, newStyles);

fs.writeFileSync(file, txt);
console.log("Updated activity/[nodeId].tsx");
