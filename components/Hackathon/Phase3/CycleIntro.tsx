import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Svg, { Circle, Path, G, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { AppText } from "../../AppText";
import { Ionicons } from "@expo/vector-icons";

const BG     = "#03050a";
const CYAN   = "#91C4E3";
const CYAN45 = "rgba(145,196,227,0.45)";
const CYAN20 = "rgba(145,196,227,0.20)";
const WHITE  = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const GREEN  = "#4ECDC4";
const ORANGE = "#FFA500";

// ── Lean Cycle Diagram ────────────────────────────────────────────
// 4 nodes on a circle, clockwise arrows between them
function LeanCycleDiagram({ lang }: { lang: "th" | "en" }) {
  const W = 300, H = 240;
  const cx = 150, cy = 118, r = 68;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Nodes at cardinal positions (degrees)
  const nodes = [
    { angle: -90, label: lang === "th" ? "สมมติฐาน" : "Hypothesis", sub: lang === "th" ? "เชื่ออะไร?" : "Believe what?", color: CYAN },
    { angle:   0, label: lang === "th" ? "สร้าง Pretotype" : "Pretotype", sub: lang === "th" ? "เร็วที่สุด" : "Fastest", color: CYAN },
    { angle:  90, label: lang === "th" ? "ทดสอบ" : "Test", sub: lang === "th" ? "คนจริง" : "Real people", color: GREEN },
    { angle: 180, label: lang === "th" ? "สรุปผล" : "Synthesize", sub: lang === "th" ? "เรียนรู้" : "Learn", color: CYAN },
  ];

  // Arrow arrowhead triangles at arc midpoints (clockwise between nodes)
  const arrowAngles = [-45, 45, 135, 225];

  function arrowPath(midAngle: number) {
    const rad = toRad(midAngle);
    const ax = cx + r * Math.cos(rad);
    const ay = cy + r * Math.sin(rad);
    // Clockwise tangent at midAngle: (-sin, cos) in standard coords → (+sin, -cos) in screen coords
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const L = 9, W2 = 4;
    // perpendicular
    const nx = -dy, ny = dx;
    const tx = ax - dx * L, ty = ay - dy * L;
    const lx = tx + nx * W2, ly = ty + ny * W2;
    const rx2 = tx - nx * W2, ry = ty - ny * W2;
    return `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${lx.toFixed(1)} ${ly.toFixed(1)} L ${rx2.toFixed(1)} ${ry.toFixed(1)} Z`;
  }

  // Label positions (outside the ring)
  function labelPos(angle: number) {
    const rad = toRad(angle);
    const lr = r + 28;
    return { x: cx + lr * Math.cos(rad), y: cy + lr * Math.sin(rad) };
  }

  function textAnchor(angle: number): "middle" | "start" | "end" {
    const norm = ((angle % 360) + 360) % 360;
    if (norm > 315 || norm < 45) return "start";
    if (norm > 135 && norm < 225) return "end";
    return "middle";
  }

  return (
    <Svg width={W} height={H}>
      <Defs>
        <SvgLinearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={CYAN} stopOpacity="0.18" />
          <Stop offset="1" stopColor={GREEN} stopOpacity="0.18" />
        </SvgLinearGradient>
      </Defs>

      {/* Glow ring */}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(145,196,227,0.10)" strokeWidth={30} />
      {/* Dashed track */}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(145,196,227,0.30)" strokeWidth={1.5} strokeDasharray="4 6" />

      {/* Clockwise arrow triangles */}
      {arrowAngles.map((ang) => (
        <Path key={ang} d={arrowPath(ang)} fill={ang === 135 ? GREEN : CYAN} opacity={0.85} />
      ))}

      {/* Center label */}
      <Circle cx={cx} cy={cy} r={22} fill="rgba(145,196,227,0.06)" stroke={CYAN45} strokeWidth={1} />
      <SvgText x={cx} y={cy - 5} textAnchor="middle" fill={CYAN} fontSize={11} fontFamily="BaiJamjuree_700Bold">
        LEAN
      </SvgText>
      <SvgText x={cx} y={cy + 10} textAnchor="middle" fill={CYAN} fontSize={11} fontFamily="BaiJamjuree_700Bold">
        CYCLE
      </SvgText>

      {/* Nodes + labels */}
      {nodes.map((n) => {
        const rad = toRad(n.angle);
        const nx = cx + r * Math.cos(rad);
        const ny = cy + r * Math.sin(rad);
        const lp = labelPos(n.angle);
        const anchor = textAnchor(n.angle);
        return (
          <G key={n.angle}>
            {/* Node dot */}
            <Circle cx={nx} cy={ny} r={9} fill={BG} stroke={n.color} strokeWidth={2} />
            <Circle cx={nx} cy={ny} r={4} fill={n.color} />
            {/* Label */}
            <SvgText
              x={lp.x}
              y={lp.y - 6}
              textAnchor={anchor}
              fill={n.color}
              fontSize={12}
              fontFamily="BaiJamjuree_700Bold"
            >
              {n.label}
            </SvgText>
            <SvgText
              x={lp.x}
              y={lp.y + 8}
              textAnchor={anchor}
              fill={WHITE55}
              fontSize={10}
              fontFamily="BaiJamjuree_400Regular"
            >
              {n.sub}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Component ─────────────────────────────────────────────────────

interface CycleIntroProps {
  cycleNumber: number;
  onStart: () => void;
  lang?: "th" | "en";
  readOnly?: boolean;
}

export default function CycleIntro({ cycleNumber, onStart, lang = "th", readOnly = false }: CycleIntroProps) {
  const isFirst = cycleNumber <= 1;

  return (
    <View style={styles.content}>

      {/* Cycle badge header — workspace only */}
      {!readOnly && (
        <View style={styles.headerRow}>
          <View style={styles.cycleBadge}>
            <AppText style={styles.cycleBadgeText}>{`Cycle ${cycleNumber}`}</AppText>
          </View>
          {isFirst && (
            <View style={styles.newBadge}>
              <AppText style={styles.newBadgeText}>{lang === "th" ? "เริ่มต้น" : "Start"}</AppText>
            </View>
          )}
        </View>
      )}

      {/* Title */}
      <View style={styles.titleBlock}>
        <AppText variant="bold" style={styles.title}>
          {readOnly
            ? (lang === "th" ? "เฟส 3 เปิดแล้ว!" : "Phase 3 is Open!")
            : (lang === "th"
              ? isFirst ? "ยินดีต้อนรับสู่ Phase 3!" : `เริ่ม Cycle ${cycleNumber}`
              : isFirst ? "Welcome to Phase 3!" : `Starting Cycle ${cycleNumber}`)}
        </AppText>
        <AppText style={styles.subtitle}>
          {lang === "th"
            ? "เฟสนี้ต่อยอดจาก workshop — นำ idea ที่คิดมาทดสอบกับกลุ่มเป้าหมายจริง แล้วพัฒนาจากสิ่งที่เรียนรู้"
            : "This phase builds on the workshop — take your idea, test it with your target group, and develop from what you learn."}
        </AppText>
      </View>

      {/* What judges assess — backward design */}
      <View style={styles.highlightCard}>
        <View style={styles.highlightIcon}>
          <Ionicons name="trophy" size={20} color={ORANGE} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <AppText variant="bold" style={styles.highlightTitle}>
            {lang === "th" ? "พี่ตัดสินจากอะไร?" : "What are judges looking at?"}
          </AppText>
          <AppText style={styles.highlightBody}>
            {lang === "th" ? "คำถามหลักที่ใช้วัดผลมีอยู่ 2 ข้อ:" : "Two core questions guide the assessment:"}
          </AppText>
          {[
            lang === "th" ? "ปัญหาที่แก้เป็นปัญหาจริงของกลุ่มเป้าหมายไหม?" : "Is the problem you're solving a real problem for your target group?",
            lang === "th" ? "วิธีการแก้ปัญหาของทีมใช้งานได้จริงไหม?" : "Does your solution actually work for them?",
          ].map((q, i) => (
            <View key={i} style={styles.judgeCriteriaRow}>
              <AppText style={styles.judgeCriteriaNum}>{i + 1}</AppText>
              <AppText style={styles.judgeCriteriaText}>{q}</AppText>
            </View>
          ))}
        </View>
      </View>

      {/* Reassurance — don't fear changing */}
      <View style={styles.reassureCard}>
        <View style={styles.reassureIcon}>
          <Ionicons name="shield-checkmark" size={20} color={GREEN} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <AppText variant="bold" style={styles.reassureTitle}>
            {lang === "th" ? "ไม่ต้องกลัวที่จะเปลี่ยน" : "Don't be afraid to change"}
          </AppText>
          <AppText style={styles.reassureBody}>
            {lang === "th"
              ? "พี่ไม่ได้ตัดสินว่า idea ของน้อง work ไหมจากผลการทดสอบ แต่ดูว่าน้องเรียนรู้จากการทดสอบและพัฒนา idea ยังไง — ถ้าทดสอบแล้ว idea เดิมไม่ work แล้วปรับแก้ นั่นแหละคือสิ่งที่พี่อยากเห็น"
              : "Judges don't assess whether your idea passes or fails the test — they assess how you learn from testing and develop your idea. If you test and pivot because it doesn't work, that's exactly what we want to see."}
          </AppText>
        </View>
      </View>

      {/* Lean Cycle diagram */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="refresh-circle" size={18} color={CYAN} />
          <AppText variant="bold" style={styles.sectionTitle}>
            {lang === "th" ? "วิธีการทำงาน — Lean Cycle" : "How it works — Lean Cycle"}
          </AppText>
        </View>
        <AppText style={styles.body}>
          {lang === "th"
            ? "Loop 4 ขั้นตอนนี้อย่างน้อย 3 รอบกับกลุ่มเป้าหมาย — เปลี่ยนแค่ 1 ตัวแปรต่อรอบ เพื่อให้รู้ชัดว่าอะไรเป็นสาเหตุ"
            : "Loop through these 4 steps at least 3 times with your target group — change only 1 variable per loop so you know exactly what caused the result"}
        </AppText>
        <View style={styles.diagramWrap}>
          <LeanCycleDiagram lang={lang} />
        </View>
      </View>

      {/* Tips */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={16} color={CYAN} />
          <AppText variant="bold" style={styles.sectionTitle}>Tips</AppText>
        </View>
        {[
          lang === "th"
            ? "ดู พฤติกรรม ไม่ใช่ความคิดเห็น — ห้ามถามว่า \"ชอบไหม?\" ดูแค่ว่ากลุ่มเป้าหมาย ทำ อะไร"
            : "Watch behavior, not opinions — never ask \"do you like it?\" only watch what your target group actually DOES",
          lang === "th"
            ? "ยิ่ง loop เยอะ ยิ่งรู้ความจริงเร็ว — ต้องทำอย่างน้อย 3 รอบ"
            : "More loops = faster truth — aim for at least 3 cycles",
          lang === "th"
            ? "เปลี่ยนแค่ 1 อย่างต่อรอบ ไม่งั้นจะไม่รู้ว่าอะไรเป็นสาเหตุ"
            : "Change only 1 thing per loop — or you won't know what caused the result",
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipDot} />
            <AppText style={styles.tipText}>{tip}</AppText>
          </View>
        ))}
      </View>

      {/* Start button — workspace only */}
      {!readOnly && (
        <Pressable style={styles.startButton} onPress={onStart}>
          <AppText variant="bold" style={styles.startButtonText}>
            {lang === "th" ? "เริ่ม Cycle นี้เลย!" : "Start this cycle!"}
          </AppText>
          <Ionicons name="arrow-forward" size={18} color={BG} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 8, gap: 20 },

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

  titleBlock: { gap: 6 },
  title: { color: WHITE, fontSize: 22, lineHeight: 30 },
  subtitle: { color: WHITE55, fontSize: 14, lineHeight: 21 },

  highlightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255,165,0,0.07)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.25)",
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,165,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  highlightTitle: { color: ORANGE, fontSize: 14 },
  highlightBody: { color: WHITE75, fontSize: 13, lineHeight: 20 },

  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { color: CYAN, fontSize: 15 },
  body: { color: WHITE75, fontSize: 13, lineHeight: 20 },
  diagramWrap: { alignItems: "center" },

  judgeCriteriaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  judgeCriteriaNum: {
    color: ORANGE,
    fontSize: 13,
    fontFamily: "BaiJamjuree_700Bold",
    width: 16,
    marginTop: 1,
  },
  judgeCriteriaText: { color: WHITE75, fontSize: 13, lineHeight: 19, flex: 1 },

  reassureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(78,205,196,0.07)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.25)",
  },
  reassureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(78,205,196,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  reassureTitle: { color: GREEN, fontSize: 14 },
  reassureBody: { color: WHITE75, fontSize: 13, lineHeight: 20 },

  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CYAN,
    marginTop: 7,
  },
  tipText: { color: WHITE75, fontSize: 13, lineHeight: 20, flex: 1 },

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
