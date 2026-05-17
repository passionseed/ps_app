import React from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import Svg, { Circle, Line, Path, Rect, G, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { AppText } from "../../AppText";
import { Ionicons } from "@expo/vector-icons";

const BG = "#03050a";
const CYAN = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const GREEN = "#4ECDC4";
const ORANGE = "#FFA500";

// The cycle loop diagram: Hypothesis → Pretotype → หาคน → ทดสอบ → Synthesis → (repeat)
function CycleLoopDiagram() {
  const cx = 130;
  const cy = 90;
  const r = 62;
  const steps = [
    { label: "สมมติฐาน", angle: -90, color: CYAN },
    { label: "Pretotype", angle: -18, color: CYAN },
    { label: "หาคน", angle: 54, color: CYAN },
    { label: "ทดสอบ", angle: 126, color: CYAN },
    { label: "สรุปผล", angle: 198, color: GREEN },
  ];

  return (
    <Svg width={260} height={180}>
      <Defs>
        <LinearGradient id="loopGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={CYAN} stopOpacity="0.3" />
          <Stop offset="1" stopColor={GREEN} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>
      {/* Ring */}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(145,196,227,0.15)" strokeWidth={28} />
      {/* Arrow arc hint */}
      <Path
        d={`M ${cx + r - 2} ${cy - 8} L ${cx + r + 6} ${cy} L ${cx + r - 2} ${cy + 8}`}
        fill="none"
        stroke={CYAN}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {steps.map((s) => {
        const rad = (s.angle * Math.PI) / 180;
        const nx = cx + r * Math.cos(rad);
        const ny = cy + r * Math.sin(rad);
        return (
          <G key={s.label}>
            <Circle cx={nx} cy={ny} r={7} fill={BG} stroke={s.color} strokeWidth={1.5} />
            <Circle cx={nx} cy={ny} r={3} fill={s.color} />
          </G>
        );
      })}
      {/* Center label */}
      {/* Labels outside — done in RN below */}
    </Svg>
  );
}

// Simple "build fast, test, learn" diagram
function BuildTestLearnDiagram({ lang }: { lang: "th" | "en" }) {
  const labels = lang === "th"
    ? ["สร้าง", "ทดสอบ", "เรียนรู้"]
    : ["Build", "Test", "Learn"];
  return (
    <Svg width={280} height={56}>
      {/* Build */}
      <Rect x={0} y={4} width={80} height={36} rx={8} fill={CYAN20} stroke={CYAN45} strokeWidth={1} />
      <SvgText x={40} y={27} textAnchor="middle" fill={WHITE} fontSize={13} fontFamily="BaiJamjuree_400Regular">{labels[0]}</SvgText>
      {/* Arrow */}
      <Line x1={84} y1={22} x2={96} y2={22} stroke={CYAN45} strokeWidth={1.5} />
      <Path d="M 92 17 L 98 22 L 92 27" fill="none" stroke={CYAN45} strokeWidth={1.5} strokeLinecap="round" />
      {/* Test */}
      <Rect x={100} y={4} width={80} height={36} rx={8} fill={CYAN20} stroke={CYAN45} strokeWidth={1} />
      <SvgText x={140} y={27} textAnchor="middle" fill={WHITE} fontSize={13} fontFamily="BaiJamjuree_400Regular">{labels[1]}</SvgText>
      {/* Arrow */}
      <Line x1={184} y1={22} x2={196} y2={22} stroke={CYAN45} strokeWidth={1.5} />
      <Path d="M 192 17 L 198 22 L 192 27" fill="none" stroke={CYAN45} strokeWidth={1.5} strokeLinecap="round" />
      {/* Learn */}
      <Rect x={200} y={4} width={80} height={36} rx={8} fill="rgba(78,205,196,0.15)" stroke={GREEN} strokeWidth={1} />
      <SvgText x={240} y={27} textAnchor="middle" fill={GREEN} fontSize={13} fontFamily="BaiJamjuree_400Regular">{labels[2]}</SvgText>
    </Svg>
  );
}

interface CycleIntroProps {
  cycleNumber: number;
  onStart: () => void;
  lang?: "th" | "en";
}

export default function CycleIntro({ cycleNumber, onStart, lang = "th" }: CycleIntroProps) {
  const isFirst = cycleNumber <= 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.cycleBadge}>
          <AppText style={styles.cycleBadgeText}>
            {lang === "th" ? `Cycle ${cycleNumber}` : `Cycle ${cycleNumber}`}
          </AppText>
        </View>
        {isFirst && (
          <View style={styles.newBadge}>
            <AppText style={styles.newBadgeText}>{lang === "th" ? "เริ่มต้น" : "Start"}</AppText>
          </View>
        )}
      </View>

      <AppText variant="bold" style={styles.title}>
        {lang === "th"
          ? isFirst ? "ยินดีต้อนรับสู่ Phase 3" : `เริ่ม Cycle ${cycleNumber}`
          : isFirst ? "Welcome to Phase 3" : `Starting Cycle ${cycleNumber}`}
      </AppText>
      <AppText style={styles.subtitle}>
        {lang === "th"
          ? "วนซ้ำจนกว่าจะรู้ว่าสิ่งที่สร้างมีคนต้องการจริง"
          : "Loop until you know what you're building is actually wanted"}
      </AppText>

      {/* Why section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="help-circle" size={18} color={CYAN} />
          <AppText variant="bold" style={styles.sectionTitle}>
            {lang === "th" ? "ทำไมถึงต้องทำแบบนี้?" : "Why do this?"}
          </AppText>
        </View>
        <AppText style={styles.body}>
          {lang === "th"
            ? "ไอเดียส่วนใหญ่ผิด — ไม่ใช่เพราะทีมไม่เก่ง แต่เพราะยังไม่ได้ทดสอบกับคนจริง Phase 3 ช่วยให้ทีมค้นพบความจริงได้เร็วที่สุดก่อนลงทุนสร้างจริง"
            : "Most ideas are wrong — not because the team is bad, but because they haven't tested with real people yet. Phase 3 helps you find the truth as fast as possible before investing in building."}
        </AppText>
      </View>

      {/* How section with diagram */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="git-merge" size={18} color={CYAN} />
          <AppText variant="bold" style={styles.sectionTitle}>
            {lang === "th" ? "ทำอย่างไร?" : "How does it work?"}
          </AppText>
        </View>
        <AppText style={styles.body}>
          {lang === "th"
            ? "ทีมจะวนซ้ำผ่าน 5 ขั้นตอนในแต่ละ Cycle:"
            : "Your team loops through 5 steps each cycle:"}
        </AppText>

        <View style={styles.diagramCenter}>
          <CycleLoopDiagram />
        </View>

        {[
          { icon: "bulb", label: lang === "th" ? "สมมติฐาน" : "Hypothesis", desc: lang === "th" ? "เขียนสิ่งที่เชื่อว่าจริง วัดได้" : "Write what you believe, make it measurable" },
          { icon: "cube", label: "Pretotype", desc: lang === "th" ? "สร้างเวอร์ชันที่ทดสอบได้เร็วที่สุด" : "Build the fastest testable version" },
          { icon: "people", label: lang === "th" ? "หาคนทดสอบ" : "Find Testers", desc: lang === "th" ? "หาคนที่เหมาะสมและบันทึกพื้นฐาน" : "Find the right people and record their background" },
          { icon: "eye", label: lang === "th" ? "ทดสอบ" : "Test", desc: lang === "th" ? "สังเกตพฤติกรรมจริง ไม่ใช่ความคิดเห็น" : "Observe real behavior, not opinions" },
          { icon: "analytics", label: lang === "th" ? "สรุปผล" : "Synthesis", desc: lang === "th" ? "ตัดสินใจ: ยืนยัน / ไม่ผ่าน / ปรับแก้" : "Decide: confirm / kill / refine" },
        ].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepIconWrap}>
              <Ionicons name={step.icon as any} size={16} color={i === 4 ? GREEN : CYAN} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bold" style={[styles.stepLabel, i === 4 && { color: GREEN }]}>{step.label}</AppText>
              <AppText style={styles.stepDesc}>{step.desc}</AppText>
            </View>
          </View>
        ))}
      </View>

      {/* Build-Test-Learn */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="refresh" size={18} color={ORANGE} />
          <AppText variant="bold" style={styles.sectionTitle}>
            {lang === "th" ? "หลักการหลัก" : "Core principle"}
          </AppText>
        </View>
        <View style={styles.diagramCenter}>
          <BuildTestLearnDiagram lang={lang} />
        </View>
        <AppText style={styles.body}>
          {lang === "th"
            ? "เปลี่ยนเพียง 1 ตัวแปรต่อ Cycle เพื่อให้รู้ว่าอะไรเป็นสาเหตุของผลลัพธ์"
            : "Change only 1 variable per cycle so you know what caused the result"}
        </AppText>
      </View>

      {/* Rule card */}
      <View style={styles.ruleCard}>
        <Ionicons name="warning" size={16} color={ORANGE} />
        <AppText style={styles.ruleText}>
          {lang === "th"
            ? "ห้ามถามว่า \"ชอบไหม?\" — สังเกตสิ่งที่เขา ทำ เท่านั้น"
            : "Never ask \"do you like it?\" — only observe what they DO"}
        </AppText>
      </View>

      <Pressable style={styles.startButton} onPress={onStart}>
        <AppText variant="bold" style={styles.startButtonText}>
          {lang === "th" ? "เริ่ม Cycle นี้เลย" : "Start this cycle"}
        </AppText>
        <Ionicons name="arrow-forward" size={18} color={BG} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingVertical: 16, gap: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cycleBadge: {
    backgroundColor: CYAN20,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: CYAN45,
  },
  cycleBadgeText: { color: CYAN, fontSize: 13 },
  newBadge: {
    backgroundColor: "rgba(78,205,196,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: GREEN,
  },
  newBadgeText: { color: GREEN, fontSize: 12 },
  title: { color: WHITE, fontSize: 24 },
  subtitle: { color: WHITE55, fontSize: 14, lineHeight: 20, marginTop: -12 },
  section: {
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { color: CYAN, fontSize: 16 },
  body: { color: WHITE75, fontSize: 14, lineHeight: 22 },
  diagramCenter: { alignItems: "center", gap: 0 },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CYAN20,
    borderWidth: 1,
    borderColor: CYAN45,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepLabel: { color: CYAN, fontSize: 14 },
  stepDesc: { color: WHITE55, fontSize: 12, lineHeight: 18, marginTop: 2 },
  ruleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255,165,0,0.08)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.3)",
  },
  ruleText: { color: WHITE75, fontSize: 14, lineHeight: 20, flex: 1 },
  startButton: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  startButtonText: { color: BG, fontSize: 16 },
});
