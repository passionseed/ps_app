import { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Path as SvgPath,
  Circle,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { AppText } from "../../components/AppText";

const { width: SW } = Dimensions.get("window");

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SEEDS: Record<
  string,
  {
    title: string;
    titleTh: string;
    npcName: string;
    npcImage: any;
    totalDays: number;
    currentDay: number;
    days: { title: string; titleTh: string; done: boolean }[];
    dialogs: string[];
    enrolled: number;
    retentionByDay: number[]; // % retained after each day
    leftStudents: { name: string; reason: string; day: number }[];
  }
> = {
  "sample-6": {
    title: "Mechanical Engineer",
    titleTh: "วิศวกรเครื่องกล",
    npcName: "Mek",
    npcImage: require("../../assets/images/mech_eng_npc.png"),
    totalDays: 5,
    currentDay: 2,
    days: [
      {
        title: "What Machines Do",
        titleTh: "เครื่องจักรทำงานยังไง",
        done: true,
      },
      { title: "Forces & Motion", titleTh: "แรงและการเคลื่อนที่", done: false },
      {
        title: "Design a Gear System",
        titleTh: "ออกแบบระบบเฟือง",
        done: false,
      },
      { title: "Build a Prototype", titleTh: "สร้างต้นแบบ", done: false },
      {
        title: "Present Your Engine",
        titleTh: "นำเสนอเครื่องยนต์",
        done: false,
      },
    ],
    dialogs: [
      "สวัสดี! ผมชื่อเม็ค 🔧 พร้อมเรียนรู้ว่าเครื่องจักรจริงๆ ทำงานยังไงมั้ย? เราจะออกแบบเฟือง สร้างโมเดล และคิดแบบวิศวกร!",
      "เฟืองทำให้โลกหมุนได้จริงๆ นะ! 🌍 มาหาคำตอบกันเถอะ",
      "วันนี้เราจะสำรวจแรง ดัน ดึง บิด — วิศวกรคิดเรื่องพวกนี้ทั้งหมด! 💪",
    ],
    enrolled: 127,
    retentionByDay: [100, 92, 85, 78, 72],
    leftStudents: [
      { name: "Alex K.", reason: "ยากเกินไป", day: 2 },
      { name: "Mina R.", reason: "ไม่สนใจแล้ว", day: 1 },
      { name: "James L.", reason: "ไม่มีเวลา", day: 3 },
      { name: "Siri P.", reason: "เปลี่ยนไป Software", day: 2 },
      { name: "Tom W.", reason: "ทฤษฎีเยอะ", day: 1 },
    ],
  },
  "sample-2": {
    title: "UX Designer",
    titleTh: "นักออกแบบประสบการณ์",
    npcName: "Aria",
    npcImage: require("../../assets/images/ux_designer_npc.png"),
    totalDays: 5,
    currentDay: 1,
    days: [
      { title: "Understand Users", titleTh: "เข้าใจผู้ใช้งาน", done: false },
      { title: "Define the Problem", titleTh: "กำหนดปัญหา", done: false },
      {
        title: "Sketch & Wireframe",
        titleTh: "ร่างและทำ Wireframe",
        done: false,
      },
      { title: "Prototype & Test", titleTh: "ทำต้นแบบและทดสอบ", done: false },
      { title: "Present Your Design", titleTh: "นำเสนอผลงาน", done: false },
    ],
    dialogs: [
      "สวัสดี ฉันชื่อ Aria 🎨 UX ไม่ใช่แค่การทำให้สวย — มันคือการแก้ปัญหาที่แท้จริงของผู้คน มาเรียนรู้ด้วยกันนะ",
      "การออกแบบที่ดีเริ่มจากการเข้าใจคน ไม่ใช่จากโปรแกรม หรือเครื่องมือ 💡",
      "Wireframe คือภาษาของนักออกแบบ วาดมันออกมาก่อน อย่าเพิ่งเขียนโค้ด ✏️",
    ],
    enrolled: 218,
    retentionByDay: [100, 95, 88, 83, 79],
    leftStudents: [
      { name: "Noon P.", reason: "คิดว่าต้องใช้ Photoshop", day: 1 },
      { name: "Chris M.", reason: "ยากกว่าที่คิด", day: 2 },
      { name: "Fern A.", reason: "ไปทำ Graphic Design แทน", day: 3 },
      { name: "Dana K.", reason: "ไม่มีเวลา", day: 2 },
    ],
  },
  "sample-1": {
    title: "Software Engineer",
    titleTh: "วิศวกรซอฟต์แวร์",
    npcName: "Byte",
    npcImage: require("../../assets/images/se_cover_1773089983030.png"),
    totalDays: 5,
    currentDay: 5,
    days: [
      { title: "Hello World", titleTh: "สวัสดีชาวโลก", done: true },
      { title: "Data Structures", titleTh: "โครงสร้างข้อมูล", done: true },
      { title: "Build an App", titleTh: "สร้างแอป", done: true },
      { title: "Test & Debug", titleTh: "ทดสอบและแก้บัค", done: true },
      { title: "Ship It!", titleTh: "ปล่อยผลงาน!", done: true },
    ],
    dialogs: [
      "ยินดีด้วย! คุณผ่านครบ 5 วันแล้ว! 🎉 ตอนนี้คุณเป็นนักพัฒนาแล้ว!",
      "โค้ดที่ดีคือโค้ดที่ใช้งานได้จริง — จำไว้นะ! 💻",
    ],
    enrolled: 342,
    retentionByDay: [100, 88, 79, 71, 65],
    leftStudents: [
      { name: "Kim S.", reason: "ชอบดีไซน์มากกว่า", day: 2 },
      { name: "Park J.", reason: "โค้ดเยอะเกิน", day: 3 },
      { name: "Nong A.", reason: "เปลี่ยนไป Data Science", day: 4 },
    ],
  },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MockSeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [dialogIdx, setDialogIdx] = useState(0);

  const data = MOCK_SEEDS[id || ""];

  // Fallback
  if (!data) {
    return (
      <LinearGradient
        colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
        style={s.container}
      >
        <StatusBar style="dark" />
        <View style={[s.center, { paddingTop: insets.top + 16 }]}>
          <Pressable
            style={[s.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <AppText style={s.backBtnIcon}>←</AppText>
          </Pressable>
          <AppText
            variant="bold"
            style={{ fontSize: 24, color: "#111", marginBottom: 8 }}
          >
            Coming Soon!
          </AppText>
          <AppText
            style={{
              fontSize: 14,
              color: "#6B7280",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            เส้นทางนี้กำลังพัฒนาอยู่ กลับมาดูใหม่นะ!
          </AppText>
          <Pressable style={s.ctaBtn} onPress={() => router.back()}>
            <AppText variant="bold" style={s.ctaBtnText}>
              กลับ
            </AppText>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const nextDialog = () => setDialogIdx((p) => (p + 1) % data.dialogs.length);
  const retained = data.retentionByDay[data.retentionByDay.length - 1];

  return (
    <LinearGradient
      colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
      style={s.container}
    >
      <StatusBar style="dark" />

      <Pressable
        style={[s.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <AppText style={s.backBtnIcon}>←</AppText>
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Top Header Blends to Safe Area ──────────────────── */}
        <View
          style={[s.heroRow, { paddingTop: Math.max(insets.top + 16, 60) }]}
        >
          {/* Bleeding Portrait on Left */}
          <View style={s.heroPortraitWrapper}>
            <Image
              source={data.npcImage}
              style={s.heroPortrait}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              style={s.heroGradient}
            >
              <AppText variant="bold" style={s.npcName}>
                {data.npcName}
              </AppText>
            </LinearGradient>
          </View>

          {/* Titles & Chat on Right */}
          <View style={s.heroTitleCol}>
            <AppText variant="bold" style={s.heroTitle}>
              {data.title}
            </AppText>
            <AppText style={s.heroTitleTh}>{data.titleTh}</AppText>

            {/* Speech Bubble */}
            <Pressable onPress={nextDialog} style={s.dialogCard}>
              <View style={s.dialogTail} />
              <AppText style={s.dialogText}>{data.dialogs[dialogIdx]}</AppText>
              <View style={s.dialogBottomRow}>
                <AppText style={s.dialogHint}>แตะอ่านต่อ...</AppText>
                <AppText style={s.dialogCount}>
                  {dialogIdx + 1}/{data.dialogs.length}
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Retention Stats (Moved Up & Compacted) ────────────────── */}
        <View style={s.compactStatsCard}>
          <View style={s.statsHeaderRow}>
            <View>
              <AppText variant="bold" style={s.compactStatsTitle}>
                📊 ผู้รอดชีวิต
              </AppText>
              <AppText style={s.compactStatsSubtitle}>
                จาก {data.enrolled} คน · รอด {retained}%
              </AppText>
            </View>
          </View>

          <View style={s.retentionGraphCompact}>
            <Svg width={SW - 80} height={100}>
              {/* Grid lines */}
              {[0, 50, 100].map((pct) => {
                const y = 80 - (pct / 100) * 70;
                return (
                  <Line
                    key={pct}
                    x1={30}
                    y1={y}
                    x2={SW - 110}
                    y2={y}
                    stroke="#F3F4F6"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Y-axis labels */}
              {[0, 50, 100].map((pct) => {
                const y = 80 - (pct / 100) * 70;
                return (
                  <SvgText
                    key={`y-${pct}`}
                    x={24}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={8}
                    fill="#9CA3AF"
                  >
                    {pct}%
                  </SvgText>
                );
              })}

              {/* Area fill & Line */}
              {(() => {
                const gw = SW - 140;
                const points = data.retentionByDay.map((pct, i) => {
                  const x = 30 + (gw / 4) * i;
                  const y = 80 - (pct / 100) * 70;
                  return { x, y };
                });

                const areaPath =
                  `M ${points[0].x} ${points[0].y} ` +
                  points
                    .slice(1)
                    .map((p) => `L ${p.x} ${p.y}`)
                    .join(" ") +
                  ` L ${points[points.length - 1].x} 80 L ${points[0].x} 80 Z`;

                const linePath =
                  `M ${points[0].x} ${points[0].y} ` +
                  points
                    .slice(1)
                    .map((p) => `L ${p.x} ${p.y}`)
                    .join(" ");

                return (
                  <>
                    <SvgPath d={areaPath} fill="rgba(16, 185, 129, 0.12)" />
                    <SvgPath
                      d={linePath}
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="none"
                    />
                    {points.map((p, i) => (
                      <Circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={3}
                        fill="#fff"
                        stroke="#10B981"
                        strokeWidth={2}
                      />
                    ))}
                    {points.map((p, i) => (
                      <SvgText
                        key={`l-${i}`}
                        x={p.x}
                        y={p.y - 8}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight="600"
                        fill="#10B981"
                      >
                        {data.retentionByDay[i]}%
                      </SvgText>
                    ))}
                  </>
                );
              })()}
            </Svg>

            {/* X-axis labels */}
            <View style={s.xLabelsRowCompact}>
              {data.days.map((d, i) => (
                <AppText key={i} style={s.xLabelCompact}>
                  ว.{i + 1}
                </AppText>
              ))}
            </View>
          </View>
        </View>

        {/* ── Vertical 5-Day Journey ─────────────────── */}
        <View style={s.journeyCard}>
          <AppText variant="bold" style={s.cardTitle}>
            📅 เส้นทาง 5 วัน
          </AppText>

          {data.days.map((day, i) => {
            const isActive = i === data.currentDay - 1;
            const isDone = day.done;
            return (
              <View key={i}>
                <View style={s.dayRow}>
                  {/* Connector Line */}
                  {i > 0 && (
                    <View
                      style={[
                        s.connectorLine,
                        isDone || data.days[i - 1].done
                          ? s.connectorDone
                          : s.connectorPending,
                      ]}
                    />
                  )}

                  {/* Circle */}
                  <View
                    style={[
                      s.dayCircle,
                      isDone && s.dayCircleDone,
                      isActive && s.dayCircleActive,
                    ]}
                  >
                    {isDone ? (
                      <AppText style={s.dayCheckmark}>✓</AppText>
                    ) : (
                      <AppText
                        style={[s.dayNum, isActive && { color: "#fff" }]}
                      >
                        {i + 1}
                      </AppText>
                    )}
                  </View>

                  {/* Label */}
                  <View style={s.dayLabelCol}>
                    <AppText
                      variant={isActive ? "bold" : "regular"}
                      style={[s.dayTitle, isDone && s.dayTitleDone]}
                    >
                      Day {i + 1}: {day.titleTh}
                    </AppText>
                    <AppText style={s.daySubtitle}>{day.title}</AppText>
                  </View>

                  {/* Status */}
                  {isDone && (
                    <View style={s.dayDoneBadge}>
                      <AppText style={s.dayDoneText}>เสร็จ</AppText>
                    </View>
                  )}
                  {isActive && (
                    <View style={s.dayActiveBadge}>
                      <AppText style={s.dayActiveText}>วันนี้</AppText>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Who Left (Moved from Stats Card) ──────────────────────── */}
        <View style={s.journeyCard}>
          <AppText variant="bold" style={s.cardTitle}>
            😵 ใครเลิกไปแล้วบ้าง?
          </AppText>
          <View style={s.leftSection}>
            {data.leftStudents.map((st, i) => (
              <View key={i} style={s.leftRow}>
                <View style={s.leftDot}>
                  <AppText style={s.leftDotText}>{st.name.charAt(0)}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={s.leftName}>{st.name}</AppText>
                  <AppText style={s.leftReason}>
                    "{st.reason}" · เลิกเรียนวันที่ {st.day}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={[s.ctaBar, { paddingBottom: insets.bottom + 20 }]}>
        <LinearGradient
          colors={["rgba(238, 242, 255, 0)", "#EEF2FF", "#EEF2FF"]}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable
          style={({ pressed }) => [
            s.ctaBtn,
            pressed && { backgroundColor: "#9FE800" },
          ]}
          onPress={() => router.back()}
        >
          <AppText variant="bold" style={s.ctaBtnText}>
            {data.currentDay >= data.totalDays
              ? "🎉 ดูใบรับรอง"
              : `เริ่มวัน ${data.currentDay}`}
          </AppText>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgb(206,206,206)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnIcon: { fontSize: 20, color: "#111" },

  scrollContent: { paddingHorizontal: 0, paddingBottom: 100 },

  // ─── Hero Row ──────────────────────────────────────────
  heroRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginBottom: 0,
    gap: 16,
  },
  heroPortraitWrapper: {
    width: 140,
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgb(206,206,206)",
    backgroundColor: "#F3F4F6",
  },
  heroPortrait: { width: "100%", height: "100%" },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 40,
  },
  npcName: { fontSize: 16, color: "#fff" },

  heroTitleCol: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    color: "#111827",
    lineHeight: 30,
    marginBottom: 4,
  },
  heroTitleTh: {
    fontSize: 14,
    color: "#6B7280",
  },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
  },
  listenBtnIcon: { fontSize: 14 },
  listenBtnText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },

  // ─── Dialog ─────────────────────────────────────
  dialogCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgb(206,206,206)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
    flex: 1,
  },
  dialogTail: {
    position: "absolute",
    top: 24,
    left: -8,
    width: 16,
    height: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgb(206,206,206)",
    transform: [{ rotate: "45deg" }],
  },
  dialogText: { fontSize: 13, color: "#374151", lineHeight: 20 },
  dialogBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  dialogHint: { fontSize: 10, color: "#9CA3AF" },
  dialogCount: { fontSize: 10, color: "#9CA3AF" },

  // ─── Journey Card ───────────────────────────────
  journeyCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgb(206,206,206)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, color: "#111827", marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: "#6B7280", marginBottom: 16 },

  // ─── Day Rows ───────────────────────────────────
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  connectorLine: {
    position: "absolute",
    left: 15,
    top: -10,
    width: 2,
    height: 20,
  },
  connectorDone: { backgroundColor: "#10B981" },
  connectorPending: { backgroundColor: "#E5E7EB" },

  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dayCircleDone: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  dayCircleActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
    shadowColor: "rgba(59,130,246,0.4)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  dayCheckmark: { fontSize: 14, color: "#fff" },
  dayNum: { fontSize: 13, color: "#9CA3AF" },

  dayLabelCol: { flex: 1 },
  dayTitle: { fontSize: 14, color: "#111827", lineHeight: 18 },
  dayTitleDone: { color: "#10B981" },
  daySubtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

  dayDoneBadge: {
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayDoneText: { fontSize: 10, color: "#10B981" },
  dayActiveBadge: {
    backgroundColor: "rgba(59,130,246,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayActiveText: { fontSize: 10, color: "#3B82F6" },

  // ─── Compact Stats Layer ─────────────────────────────────────
  compactStatsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgb(206,206,206)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  compactStatsTitle: { fontSize: 14, color: "#111827" },
  compactStatsSubtitle: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  retentionGraphCompact: { marginTop: 0, alignItems: "center" },
  xLabelsRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingLeft: 24,
    paddingRight: 8,
    marginTop: 0,
  },
  xLabelCompact: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "center",
    flex: 1,
  },

  // ─── Who Left ───────────────────────────────────
  leftSection: {
    marginTop: 8,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  leftDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  leftDotText: { fontSize: 12, color: "#EF4444" },
  leftName: { fontSize: 13, color: "#374151" },
  leftReason: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

  // ─── CTA ────────────────────────────────────────
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  ctaBtn: {
    backgroundColor: "#BFFF00",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  ctaBtnText: { fontSize: 17, color: "#111" },
});
