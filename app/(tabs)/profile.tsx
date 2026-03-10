import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { getProfile } from "../../lib/onboarding";
import type {
  Profile,
  InterestCategory,
  CareerGoal,
} from "../../types/onboarding";

// ------- Mock Data -------
const MOCK_IKIGAI = {
  passion: {
    score: 85,
    label: "Passion",
    emoji: "🔥",
    description: "What you love",
    insight:
      "You're driven by creativity and design — keep following this energy!",
    route: "/ikigai/passion",
  },
  mission: {
    score: 72,
    label: "Mission",
    emoji: "🎯",
    description: "What the world needs",
    insight:
      "Strong social awareness. You want to make things better for others.",
    route: "/ikigai/mission",
  },
  profession: {
    score: 48,
    label: "Profession",
    emoji: "💼",
    description: "What you can be paid for",
    insight:
      "This is your growth zone — explore more career paths to boost this score.",
    route: "/ikigai/profession",
  },
  vocation: {
    score: 61,
    label: "Vocation",
    emoji: "🌍",
    description: "What you're good at",
    insight:
      "You have solid foundational skills. Level them up to unlock advanced paths.",
    route: "/ikigai/vocation",
  },
};

const MOCK_IKIGAI_INSIGHT =
  "Your passion and mission are strongly aligned — you're built to make an impact. Focus on leveling up your profession score next! 🚀";

const MOCK_SKILLS = [
  { id: 1, name: "UI Design", level: "Intermediate", category: "Design" },
  { id: 2, name: "Figma", level: "Intermediate", category: "Design" },
  { id: 3, name: "User Research", level: "Beginner", category: "Design" },
  { id: 4, name: "React", level: "Beginner", category: "Code" },
  { id: 5, name: "TypeScript", level: "Beginner", category: "Code" },
  {
    id: 6,
    name: "Public Speaking",
    level: "Intermediate",
    category: "Soft Skills",
  },
  {
    id: 7,
    name: "Critical Thinking",
    level: "Advanced",
    category: "Soft Skills",
  },
];

const MOCK_ACHIEVEMENTS = [
  {
    id: 1,
    type: "personal",
    text: "You unlocked the UX Fundamentals path",
    time: "2h ago",
    icon: "🏆",
  },
  {
    id: 2,
    type: "social",
    text: "Alex just finished Cybersecurity basics",
    time: "4h ago",
    icon: "⚡️",
  },
  {
    id: 3,
    type: "personal",
    text: "You hit a 3-day exploration streak",
    time: "Yesterday",
    icon: "🔥",
  },
  {
    id: 4,
    type: "social",
    text: "Mint leveled up in Data Science",
    time: "2 days ago",
    icon: "🌟",
  },
];

const SKILL_LEVEL_COLORS: Record<string, string> = {
  Beginner: "#10B981",
  Intermediate: "#8B5CF6",
  Advanced: "#F59E0B",
  Master: "#EF4444",
};

const CATEGORY_COLORS: Record<string, string> = {
  Design: "#8B5CF6",
  Code: "#3B82F6",
  "Soft Skills": "#10B981",
};

// ------- Component -------
export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<InterestCategory[]>([]);
  const [careers, setCareers] = useState<CareerGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      setLoading(true);
      const [profileData, interestsData, careersData] = await Promise.all([
        getProfile(user.id),
        supabase.from("user_interests").select("*").eq("user_id", user.id),
        supabase.from("career_goals").select("*").eq("user_id", user.id),
      ]);

      setProfile(profileData);
      setInterests(interestsData.data || []);
      setCareers(careersData.data || []);
      setLoading(false);
    };

    loadData();
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Explorer";
  const appVersion = Constants.expoConfig?.version ?? "dev";
  const formatCareerName = (name: string) => name.split("(")[0].trim();

  // Player title based on careers or fallback
  const playerTitle =
    careers.length > 0
      ? `Aspiring ${formatCareerName(careers[0].career_name)}`
      : "Level 3 Explorer";

  // Group skills by category
  const skillsByCategory = MOCK_SKILLS.reduce<
    Record<string, typeof MOCK_SKILLS>
  >((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {/* ── Section 1: Player Header ── */}
          <LinearGradient
            colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
            style={styles.headerGradient}
          >
            {/* Settings Button */}
            <Pressable
              style={({ pressed }) => [
                styles.settingsBtn,
                pressed && styles.settingsBtnPressed,
              ]}
              onPress={() => router.push("/settings")}
            >
              <Text style={styles.settingsBtnText}>⚙️</Text>
            </Pressable>

            {/* Compact horizontal: Avatar + Info */}
            <View style={styles.headerRow}>
              <View style={styles.avatarContainer}>
                <Image
                  source={require("../../assets/images/user_avatar.png")}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.name}>{displayName}</Text>
                <View style={styles.playerTitleBadge}>
                  <Text style={styles.playerTitleText}>🎮 {playerTitle}</Text>
                </View>
                <Pressable style={styles.friendsRow} onPress={() => {}}>
                  <Text style={styles.friendsText}>👥 12 friends</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>

          {/* ── Onboarded Info Sections ── */}
          {loading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator color="#8B5CF6" />
            </View>
          ) : (
            <>
              {/* Stats Row */}
              <View style={styles.statsRow}>
                <StatBox value="7" label="Paths" />
                <View style={styles.statDivider} />
                <StatBox value="23" label="Tasks Done" />
                <View style={styles.statDivider} />
                <StatBox value="5d" label="Streak" />
                <View style={styles.statDivider} />
                <StatBox value="12" label="Friends" />
              </View>

              {/* ── Section 2: Ikigai Compass ── */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Your Ikigai Compass</Text>
                <View style={styles.ikigaiGrid}>
                  {Object.values(MOCK_IKIGAI).map((pillar) => (
                    <IkigaiCell key={pillar.label} pillar={pillar} />
                  ))}
                </View>
                <View style={styles.insightCard}>
                  <Text style={styles.insightText}>
                    💡 {MOCK_IKIGAI_INSIGHT}
                  </Text>
                </View>
              </View>

              {/* ── Section 3: Skills Inventory ── */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Skills Inventory</Text>
                {Object.entries(skillsByCategory).map(([category, skills]) => (
                  <View key={category} style={styles.skillCategory}>
                    <Text
                      style={[
                        styles.skillCategoryLabel,
                        { color: CATEGORY_COLORS[category] ?? "#6B7280" },
                      ]}
                    >
                      {category}
                    </Text>
                    <View style={styles.skillsWrap}>
                      {skills.map((skill) => (
                        <SkillBadge key={skill.id} skill={skill} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Education Info */}
              {profile && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Education</Text>
                  <View style={styles.statementsWrap}>
                    <View style={styles.statementChip}>
                      <Text style={styles.statementChipText}>
                        {profile.education_level === "high_school"
                          ? "High School"
                          : profile.education_level === "university"
                            ? "University"
                            : "Unaffiliated"}
                      </Text>
                    </View>
                    {profile.school_name && (
                      <View style={styles.statementChip}>
                        <Text style={styles.statementChipText}>
                          {profile.school_name}
                        </Text>
                      </View>
                    )}
                    <View style={styles.statementChip}>
                      <Text style={styles.statementChipText}>
                        {profile.preferred_language === "en"
                          ? "English"
                          : "ไทย"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ── Section 4: Achievements & Activity Feed ── */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                  Achievements &#38; Friends
                </Text>
                {MOCK_ACHIEVEMENTS.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.achievementCard,
                      item.type === "social" && styles.achievementCardSocial,
                    ]}
                  >
                    <Text style={styles.achievementIcon}>{item.icon}</Text>
                    <View style={styles.achievementBody}>
                      <Text style={styles.achievementText}>{item.text}</Text>
                      <Text style={styles.achievementTime}>{item.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [
              styles.signOutBtn,
              pressed && styles.signOutBtnPressed,
            ]}
            onPress={handleSignOut}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.signOutText,
                  pressed && styles.signOutTextPressed,
                ]}
              >
                Sign out
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version {appVersion}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ------- Sub-Components -------

function VisionChip({
  text,
  type,
}: {
  text: string;
  type: "career" | "interest";
}) {
  const isCareer = type === "career";
  return (
    <View
      style={[
        styles.visionChip,
        isCareer ? styles.visionChipCareer : styles.visionChipInterest,
      ]}
    >
      <Text
        style={[
          styles.visionChipText,
          isCareer
            ? styles.visionChipTextCareer
            : styles.visionChipTextInterest,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function IkigaiCell({
  pillar,
}: {
  pillar: {
    score: number;
    label: string;
    emoji: string;
    description: string;
    insight: string;
    route: string;
  };
}) {
  const pct = pillar.score;
  const fillColor = pct >= 75 ? "#10B981" : pct >= 50 ? "#8B5CF6" : "#F59E0B";
  return (
    <View style={styles.ikigaiCell}>
      <View style={styles.ikigaiCellHeader}>
        <Text style={styles.ikigaiEmoji}>{pillar.emoji}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.ikigaiDeepBtn,
            pressed && styles.ikigaiDeepBtnPressed,
          ]}
          onPress={() => router.push(pillar.route as any)}
        >
          <Text style={styles.ikigaiDeepBtnText}>›</Text>
        </Pressable>
      </View>
      <Text style={styles.ikigaiLabel}>{pillar.label}</Text>
      <Text style={styles.ikigaiDescription}>{pillar.description}</Text>
      <View style={styles.ikigaiBarBg}>
        <View
          style={[
            styles.ikigaiBarFill,
            { width: `${pct}%` as any, backgroundColor: fillColor },
          ]}
        />
      </View>
      <Text style={[styles.ikigaiScore, { color: fillColor }]}>{pct}</Text>
      <Text style={styles.ikigaiInsight}>{pillar.insight}</Text>
    </View>
  );
}

function SkillBadge({
  skill,
}: {
  skill: { name: string; level: string; category: string };
}) {
  const levelColor = SKILL_LEVEL_COLORS[skill.level] ?? "#6B7280";
  return (
    <View style={styles.skillBadge}>
      <Text style={styles.skillBadgeName}>{skill.name}</Text>
      <View style={[styles.skillLevelDot, { backgroundColor: levelColor }]} />
      <Text style={[styles.skillBadgeLevel, { color: levelColor }]}>
        {skill.level}
      </Text>
    </View>
  );
}

// ------- Styles -------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FA",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  mainContent: {
    paddingBottom: 24,
  },

  // Header
  headerGradient: {
    marginHorizontal: 16,
    marginTop: 56,
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 32,
    alignItems: "center",
    position: "relative",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  headerInfo: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
  },
  friendsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  friendsText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
    fontWeight: "500",
  },
  avatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: "rgba(139,92,246,0.15)",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  name: {
    fontSize: 26,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  playerTitleBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  playerTitleText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#8B5CF6",
    letterSpacing: 0.3,
  },
  settingsBtn: {
    position: "absolute",
    right: 20,
    top: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    zIndex: 10,
  },
  settingsBtnPressed: {
    backgroundColor: "#f5f5f5",
  },
  settingsBtnText: {
    fontSize: 20,
  },
  visionBoard: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  visionChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  visionChipCareer: {
    borderColor: "rgba(16, 185, 129, 0.2)",
    shadowColor: "rgba(16, 185, 129, 0.2)",
  },
  visionChipInterest: {
    borderColor: "rgba(139, 92, 246, 0.2)",
    shadowColor: "rgba(139, 92, 246, 0.2)",
  },
  visionChipText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
  },
  visionChipTextCareer: {
    color: "#10B981",
  },
  visionChipTextInterest: {
    color: "#8B5CF6",
  },
  viewInterestsBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  viewInterestsBtnPressed: {
    backgroundColor: "#E5E7EB",
  },
  viewInterestsText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#4B5563",
    fontWeight: "500",
  },

  // Loading
  loadingSection: {
    marginHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Generic Section
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Ikigai Grid
  ikigaiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ikigaiCell: {
    width: "47.5%",
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 14,
    gap: 4,
  },
  ikigaiCellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  ikigaiDeepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  ikigaiDeepBtnPressed: {
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  ikigaiDeepBtnText: {
    fontSize: 18,
    color: "#6B7280",
    lineHeight: 22,
    marginLeft: 2,
  },
  ikigaiEmoji: {
    fontSize: 22,
  },
  ikigaiLabel: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111827",
  },
  ikigaiDescription: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "#9CA3AF",
    marginBottom: 6,
  },
  ikigaiBarBg: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  ikigaiBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  ikigaiScore: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "800",
    marginTop: 4,
  },
  ikigaiInsight: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
    lineHeight: 16,
    marginTop: 6,
  },
  insightCard: {
    marginTop: 12,
    backgroundColor: "rgba(139, 92, 246, 0.06)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.12)",
  },
  insightText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#4B5563",
    lineHeight: 20,
  },

  // Skills
  skillCategory: {
    marginBottom: 14,
  },
  skillCategoryLabel: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  skillBadgeName: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#374151",
  },
  skillLevelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  skillBadgeLevel: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
  },

  // Education
  statementsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statementChip: {
    backgroundColor: "#F0F8E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statementChipText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#374151",
  },

  // Achievements & Activity Feed
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  achievementCardSocial: {
    backgroundColor: "rgba(59, 130, 246, 0.04)",
    borderColor: "rgba(59, 130, 246, 0.1)",
  },
  achievementIcon: {
    fontSize: 22,
  },
  achievementBody: {
    flex: 1,
    gap: 2,
  },
  achievementText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#374151",
    lineHeight: 18,
  },
  achievementTime: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "#9CA3AF",
  },

  // Footer
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutBtnPressed: {
    backgroundColor: "#F9FAFB",
  },
  signOutText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#9CA3AF",
  },
  signOutTextPressed: {
    color: "#6B7280",
  },
  versionContainer: {
    marginTop: "auto",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#D1D5DB",
    letterSpacing: 0.2,
  },
});
