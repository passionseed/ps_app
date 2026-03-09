import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path as SvgPath, Circle } from "react-native-svg";
import { SvgXml } from "react-native-svg";
import {
  getSeedById,
  getPathBySeedId,
  getUserEnrollment,
  enrollInPath,
  getPathDays,
  getSeedNpcAvatar,
} from "../../lib/pathlab";
import type { Seed, SeedNpcAvatar } from "../../types/seeds";
import type { Path, PathEnrollment, PathDay } from "../../types/pathlab";
import { AppText } from "../../components/AppText";

export default function SeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [pathDays, setPathDays] = useState<PathDay[]>([]);
  const [npcAvatar, setNpcAvatar] = useState<SeedNpcAvatar | null>(null);
  const [enrollment, setEnrollment] = useState<PathEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const seedData = await getSeedById(id);
        setSeed(seedData);

        if (seedData) {
          const [pathData, npcData] = await Promise.all([
            getPathBySeedId(seedData.id),
            getSeedNpcAvatar(seedData.id),
          ]);

          setPath(pathData);
          setNpcAvatar(npcData);

          if (pathData) {
            const enrollmentData = await getUserEnrollment(pathData.id);
            setEnrollment(enrollmentData);

            const daysData = await getPathDays(pathData.id);
            setPathDays(daysData);
          }
        }
      } catch (error) {
        console.error("Failed to load seed:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleStartPath = async () => {
    if (!path) return;

    setEnrolling(true);
    try {
      const newEnrollment = await enrollInPath({
        pathId: path.id,
      });
      setEnrollment(newEnrollment);
      router.push(`/path/${newEnrollment.id}`);
    } catch (error) {
      console.error("Failed to enroll:", error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinuePath = () => {
    if (enrollment) {
      router.push(`/path/${enrollment.id}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  if (!seed) {
    return (
      <View style={styles.errorContainer}>
        <AppText style={styles.errorText}>Path not found</AppText>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <AppText style={styles.backBtnText}>Go Back</AppText>
        </Pressable>
      </View>
    );
  }

  const isEnrolled = !!enrollment;
  const canContinue = enrollment?.status === "active" || enrollment?.status === "paused";

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Back button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <AppText style={styles.backButtonText}>←</AppText>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <AppText variant="bold" style={styles.title}>
          {seed.title}
        </AppText>

        {/* NPC Character and Speech Bubble Side by Side */}
        <View style={styles.npcContainer}>
          {/* Speech Bubble on Left with Tail */}
          <View style={styles.speechBubbleWrapper}>
            <View style={styles.speechBubble}>
              <AppText style={styles.description}>
                {seed.description || "Explore this exciting career path!"}
              </AppText>
              <AppText style={styles.dayCount}>
                {path?.total_days || 5}/6
              </AppText>
            </View>
            {/* Speech Bubble Tail - Triangle pointing right to NPC */}
            <View style={styles.speechTailOuter} />
            <View style={styles.speechTailInner} />
          </View>

          {/* NPC Character on Right */}
          <View style={styles.npcRightColumn}>
            {npcAvatar?.svg_data ? (
              <View style={styles.npcCharacter}>
                <SvgXml xml={npcAvatar.svg_data} width={240} height={340} />
              </View>
            ) : (
              <View style={styles.npcCharacter}>
                <View style={styles.npcHead}>
                  <View style={styles.npcEye} />
                  <View style={styles.npcMouth} />
                </View>
                <View style={styles.npcBody}>
                  <View style={styles.npcTie} />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* "Click [Name] for more detail" */}
        <AppText style={styles.clickHint}>
          click {npcAvatar?.name || "Sam"} for more detail
        </AppText>

        {/* Timeline Graph */}
        <View style={styles.timelineContainer}>
          <PathTimeline days={pathDays} currentDay={enrollment?.current_day || 0} />
        </View>

        {/* Progress Bar */}
        {isEnrolled && enrollment.current_day > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      ((enrollment.current_day - 1) / (path?.total_days || 5)) * 100
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        {!isEnrolled ? (
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
              enrolling && styles.ctaButtonDisabled,
            ]}
            onPress={handleStartPath}
            disabled={enrolling}
          >
            {enrolling ? (
              <ActivityIndicator color="#111" />
            ) : (
              <AppText variant="bold" style={styles.ctaText}>
                Start
              </AppText>
            )}
          </Pressable>
        ) : canContinue ? (
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleContinuePath}
          >
            <AppText variant="bold" style={styles.ctaText}>
              Continue Day {enrollment.current_day}
            </AppText>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              styles.ctaButtonSecondary,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleContinuePath}
          >
            <AppText variant="bold" style={[styles.ctaText, styles.ctaTextSecondary]}>
              View Report
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function PathTimeline({ days, currentDay }: { days: PathDay[]; currentDay: number }) {
  if (days.length === 0) return null;

  // Calculate positions for the curved line - wider to prevent cramping
  const spacing = 150; // Space between each day
  const width = Math.max(600, days.length * spacing);
  const height = 120;

  const points = days.map((_, i) => {
    const x = 80 + i * spacing;
    const y = height - 40 - Math.sin((i / (days.length - 1)) * Math.PI) * 30;
    return { x, y };
  });

  // Create curved path
  let pathData = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    pathData += ` Q ${cpx} ${prev.y}, ${curr.x} ${curr.y}`;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.timelineScroll}
      contentContainerStyle={styles.timelineScrollContent}
    >
      <View style={styles.timelineWrapper}>
        <Svg width={width} height={height}>
          {/* Curved line */}
          <SvgPath
            d={pathData}
            stroke="#333"
            strokeWidth={3}
            fill="none"
          />

          {/* Day dots */}
          {points.map((point, i) => (
            <Circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={8}
              fill={i < currentDay ? "#BFFF00" : "#fff"}
              stroke="#333"
              strokeWidth={2}
            />
          ))}
        </Svg>

        {/* Day labels */}
        <View style={styles.dayLabelsContainer}>
          {days.map((day, i) => (
            <View
              key={i}
              style={[
                styles.dayLabel,
                { left: points[i].x - 60, top: points[i].y + 20 },
              ]}
            >
              <AppText style={styles.dayLabelText} numberOfLines={3}>
                {day.title}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBtnText: {
    fontSize: 14,
    color: "#BFFF00",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: "#111",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    color: "#111",
    marginBottom: 24,
    textAlign: "center",
  },
  npcContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 0,
    alignItems: "flex-start",
  },
  speechBubbleWrapper: {
    flex: 1,
    position: "relative",
    marginRight: -10,
  },
  speechBubble: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#111",
    padding: 16,
    minHeight: 220,
    position: "relative",
  },
  speechTailOuter: {
    position: "absolute",
    right: -14,
    top: 80,
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 0,
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderLeftColor: "#111",
    borderRightColor: "transparent",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderStyle: "solid",
  },
  speechTailInner: {
    position: "absolute",
    right: -11,
    top: 82,
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderLeftColor: "#fff",
    borderRightColor: "transparent",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderStyle: "solid",
  },
  npcRightColumn: {
    width: 240,
    alignItems: "center",
    marginLeft: 10,
  },
  description: {
    fontSize: 14,
    color: "#111",
    lineHeight: 20,
    marginBottom: 12,
  },
  dayCount: {
    position: "absolute",
    bottom: 12,
    right: 16,
    fontSize: 12,
    color: "#999",
  },
  npcCharacter: {
    alignItems: "center",
  },
  npcHead: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  npcEye: {
    position: "absolute",
    top: 20,
    left: 15,
    width: 20,
    height: 8,
    backgroundColor: "#111",
    borderRadius: 4,
  },
  npcMouth: {
    position: "absolute",
    bottom: 15,
    width: 30,
    height: 3,
    backgroundColor: "#111",
  },
  npcBody: {
    width: 50,
    height: 80,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#111",
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    position: "relative",
  },
  npcTie: {
    position: "absolute",
    top: 10,
    left: 15,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 30,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#ff4444",
  },
  clickHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 24,
    textAlign: "center",
  },
  timelineContainer: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 16,
    overflow: "hidden",
  },
  timelineScroll: {
    width: "100%",
  },
  timelineScrollContent: {
    paddingRight: 40,
  },
  timelineWrapper: {
    position: "relative",
    height: 160,
  },
  dayLabelsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dayLabel: {
    position: "absolute",
    width: 120,
    alignItems: "center",
  },
  dayLabelText: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    lineHeight: 14,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#BFFF00",
    borderRadius: 4,
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: "#FDFFF5",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  ctaButton: {
    backgroundColor: "#BFFF00",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaButtonPressed: {
    backgroundColor: "#9FE800",
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
  },
  ctaText: {
    fontSize: 18,
    color: "#111",
  },
  ctaTextSecondary: {
    color: "#111",
  },
});
