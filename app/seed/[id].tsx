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
import { AppText } from "../../components/AppText";
import { GlassButton } from "../../components/Glass";
import { useAuth } from "../../lib/auth";
import {
  getSeedById,
  getPathBySeedId,
  getUserEnrollment,
  enrollInPath,
  getPathDays,
  getExpertForSeed,
  type ExpertInfo,
} from "../../lib/pathlab";
import type { Seed } from "../../types/seeds";
import type { Path, PathEnrollment, PathDay } from "../../types/pathlab";

export default function SeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isGuest, session } = useAuth();

  const [seed, setSeed] = useState<Seed | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [enrollment, setEnrollment] = useState<PathEnrollment | null>(null);
  const [pathDays, setPathDays] = useState<Pick<PathDay, "day_number" | "title">[]>([]);
  const [expert, setExpert] = useState<ExpertInfo | null>(null);
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

      // Load expert info
      const expertData = await getExpertForSeed(id);
      console.log("[SeedDetail] Expert loaded:", expertData?.name);
      setExpert(expertData);

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
      <View style={s.container}>
        <StatusBar style="dark" />
        <View style={s.center}>
          <ActivityIndicator size="large" color="#BFFF00" />
        </View>
      </View>
    );
  }

  if (!seed || !path) {
    return (
      <View style={s.container}>
        <StatusBar style="dark" />
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <AppText style={s.backBtnIcon}>←</AppText>
          </Pressable>
        </View>
        <View style={s.center}>
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
      </View>
    );
  }

  const isEnrolled = enrollment && enrollment.status !== "quit";
  const currentDay = enrollment?.current_day || 1;

  return (
    <View style={s.container}>
      <StatusBar style="dark" />

      {/* Sticky Header */}
      <View style={[s.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <AppText style={s.backBtnIcon}>←</AppText>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header with cover image */}
        <View style={s.heroSection}>
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
            {expert && (
              <View style={s.expertRow}>
                <AppText style={s.expertLabel}>โดย </AppText>
                <AppText variant="bold" style={s.expertName}>{expert.name}</AppText>
                {expert.title && (
                  <AppText style={s.expertTitle}> • {expert.title}</AppText>
                )}
              </View>
            )}
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
        <View style={s.ctaGradient} />
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
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  // Header
  header: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
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
  backBtnIcon: {
    fontSize: 20,
    color: "#111",
    fontFamily: "BaiJamjuree_400Regular",
  },

  scrollContent: {
    paddingHorizontal: 0,
  },

  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  coverImage: {
    width: "100%",
    height: 200,
    borderRadius: 32,
    marginBottom: 20,
  },
  heroContent: {
    gap: 8,
  },
  seedTitle: {
    fontSize: 28,
    color: "#111827",
    lineHeight: 36,
    fontFamily: "BaiJamjuree_700Bold",
  },
  expertRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 4,
  },
  expertLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "BaiJamjuree_400Regular",
  },
  expertName: {
    fontSize: 13,
    color: "#111827",
    fontFamily: "BaiJamjuree_700Bold",
  },
  expertTitle: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "BaiJamjuree_400Regular",
  },
  seedSlogan: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 24,
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
    fontFamily: "BaiJamjuree_700Bold",
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
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
  dayCheckmark: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "BaiJamjuree_400Regular",
  },
  dayNum: {
    fontSize: 13,
    color: "#9CA3AF",
    fontFamily: "BaiJamjuree_400Regular",
  },

  dayLabelCol: { flex: 1 },
  dayTitle: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 18,
    fontFamily: "BaiJamjuree_400Regular",
  },
  dayTitleDone: { color: "#10B981" },

  dayDoneBadge: {
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayDoneText: {
    fontSize: 10,
    color: "#10B981",
    fontFamily: "BaiJamjuree_400Regular",
  },
  dayActiveBadge: {
    backgroundColor: "rgba(59,130,246,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayActiveText: {
    fontSize: 10,
    color: "#3B82F6",
    fontFamily: "BaiJamjuree_400Regular",
  },

  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  ctaGradient: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F3F4F6",
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
  ctaBtnText: {
    fontSize: 17,
    color: "#111",
    fontFamily: "BaiJamjuree_700Bold",
  },
});
