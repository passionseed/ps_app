import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../components/AppText";
import { GlassButton } from "../../components/Glass";
import { useAuth } from "../../lib/auth";
import {
  getSeedById,
  getPathBySeedId,
  getUserEnrollment,
  enrollInPath,
  getPathDays,
} from "../../lib/pathlab";
import type { Seed } from "../../types/seeds";
import type { Path, PathEnrollment, PathDay } from "../../types/pathlab";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Gradient,
  Accent,
  Space,
  Type,
} from "../../lib/theme";

export default function SeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isGuest, session } = useAuth();

  const [seed, setSeed] = useState<Seed | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [enrollment, setEnrollment] = useState<PathEnrollment | null>(null);
  const [pathDays, setPathDays] = useState<PathDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      console.log("[SeedDetail] Loading seed:", id);

      // Load seed
      const seedData = await getSeedById(id);
      console.log("[SeedDetail] Seed loaded:", seedData?.title);
      setSeed(seedData);

      if (!seedData) {
        setLoading(false);
        return;
      }

      // Load path
      const pathData = await getPathBySeedId(id);
      console.log("[SeedDetail] Path loaded:", pathData?.id);
      setPath(pathData);

      if (pathData) {
        // Load enrollment if user is logged in
        if (session?.user) {
          const enrollmentData = await getUserEnrollment(pathData.id);
          console.log("[SeedDetail] Enrollment:", enrollmentData?.status);
          setEnrollment(enrollmentData);
        }

        // Load path days
        const daysData = await getPathDays(pathData.id);
        console.log("[SeedDetail] Path days loaded:", daysData.length);
        setPathDays(daysData);
      }
    } catch (error) {
      console.error("[SeedDetail] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (isGuest || !session) {
      Alert.alert(
        "เข้าสู่ระบบก่อน",
        "คุณต้องเข้าสู่ระบบก่อนเพื่อเริ่มเส้นทางนี้",
        [
          { text: "ยกเลิก", style: "cancel" },
          { text: "เข้าสู่ระบบ", onPress: () => router.replace("/") },
        ]
      );
      return;
    }

    if (!path) return;

    setEnrolling(true);
    try {
      const newEnrollment = await enrollInPath({ pathId: path.id });
      setEnrollment(newEnrollment);

      // Navigate to the path screen
      router.push(`/path/${newEnrollment.id}`);
    } catch (error) {
      console.error("[SeedDetail] Error enrolling:", error);
      Alert.alert("Error", "Failed to enroll in path. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinue = () => {
    if (enrollment) {
      router.push(`/path/${enrollment.id}`);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
        style={s.container}
      >
        <StatusBar style="dark" />
        <View style={s.center}>
          <ActivityIndicator size="large" color="#BFFF00" />
        </View>
      </LinearGradient>
    );
  }

  if (!seed || !path) {
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

  const isEnrolled = enrollment && enrollment.status !== "quit";
  const currentDay = enrollment?.current_day || 1;

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
        contentContainerStyle={[s.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header with cover image */}
        <View style={[s.heroSection, { paddingTop: Math.max(insets.top + 16, 60) }]}>
          {seed.cover_image_url && (
            <Image
              source={
                typeof seed.cover_image_url === "string"
                  ? { uri: seed.cover_image_url }
                  : seed.cover_image_url
              }
              style={s.coverImage}
              resizeMode="cover"
            />
          )}
          <View style={s.heroContent}>
            <AppText variant="bold" style={s.seedTitle}>
              {seed.title}
            </AppText>
            {seed.slogan && (
              <AppText style={s.seedSlogan}>{seed.slogan}</AppText>
            )}
          </View>
        </View>

        {/* Description */}
        {seed.description && (
          <View style={s.card}>
            <AppText variant="bold" style={s.cardTitle}>
              📖 เกี่ยวกับเส้นทางนี้
            </AppText>
            <AppText style={s.descriptionText}>{seed.description}</AppText>
          </View>
        )}

        {/* Path Days */}
        {pathDays.length > 0 && (
          <View style={s.card}>
            <AppText variant="bold" style={s.cardTitle}>
              📅 เส้นทาง {path.total_days} วัน
            </AppText>
            {pathDays.map((day, i) => {
              const isDone = enrollment && currentDay > day.day_number;
              const isActive = enrollment && currentDay === day.day_number;

              return (
                <View key={day.day_number} style={s.dayRow}>
                  {/* Connector Line */}
                  {i > 0 && (
                    <View
                      style={[
                        s.connectorLine,
                        isDone ? s.connectorDone : s.connectorPending,
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
                        {day.day_number}
                      </AppText>
                    )}
                  </View>

                  {/* Label */}
                  <View style={s.dayLabelCol}>
                    <AppText
                      variant={isActive ? "bold" : "regular"}
                      style={[s.dayTitle, isDone && s.dayTitleDone]}
                    >
                      Day {day.day_number}
                      {day.title ? `: ${day.title}` : ""}
                    </AppText>
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
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* CTA */}
      <View style={[s.ctaBar, { paddingBottom: insets.bottom + 20 }]}>
        <LinearGradient
          colors={["rgba(238, 242, 255, 0)", "#EEF2FF", "#EEF2FF"]}
          style={StyleSheet.absoluteFillObject}
        />
        <GlassButton
          variant="primary"
          size="large"
          fullWidth
          onPress={isEnrolled ? handleContinue : handleEnroll}
          loading={enrolling}
          disabled={enrolling}
        >
          {isEnrolled ? `เริ่มวัน ${currentDay}` : "เริ่มเส้นทางนี้"}
        </GlassButton>
      </View>
    </LinearGradient>
  );
}

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

  scrollContent: { paddingHorizontal: 0 },

  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  coverImage: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroContent: {
    gap: 8,
  },
  seedTitle: {
    fontSize: 28,
    color: "#111827",
    lineHeight: 34,
  },
  seedSlogan: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  card: {
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
  cardTitle: {
    fontSize: 16,
    color: "#111827",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },

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
