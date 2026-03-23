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
import {
  getUserIkigaiScores,
  getScoreTimeline,
  hasUserScores,
  type IkigaiScores,
  type ScoreTimelineItem,
} from "../../lib/scoreEngine";
import type {
  Profile,
  InterestCategory,
  CareerGoal,
} from "../../types/onboarding";
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

// ------- Types -------
interface IkigaiPillar {
  score: number;
  label: string;
  emoji: string;
  description: string;
  insight: string;
  route: string;
}

// ------- Helper Functions -------
function getIkigaiInsight(scores: IkigaiScores): string {
  const { passion, mission, profession, vocation } = scores;
  const avg = (passion + mission + profession + vocation) / 4;

  if (passion >= 75 && mission >= 75) {
    return "Your passion and mission are strongly aligned — you're built to make an impact! Focus on building skills to turn this into a career. 🚀";
  } else if (profession >= 75 && vocation >= 75) {
    return "You have strong professional skills! Now find work that also ignites your passion. 💼";
  } else if (avg >= 70) {
    return "Great balance across all dimensions! You're on a solid path. Keep exploring to refine your direction. ✨";
  } else if (passion < 50 && profession < 50) {
    return "Early exploration phase! Try more Seeds to discover what you love and what you can be paid for. 🌱";
  } else if (vocation < 50) {
    return "Focus on skill-building! Complete more tasks to level up what you're good at. 📈";
  } else {
    return "Keep exploring different paths! Your scores will become clearer as you complete more Seeds. 🔍";
  }
}

function getPillarInsight(dimension: string, score: number): string {
  if (score >= 80) {
    switch (dimension) {
      case "passion":
        return "You're deeply passionate about this area!";
      case "mission":
        return "Strong sense of purpose and social impact!";
      case "profession":
        return "Excellent career viability in this field!";
      case "vocation":
        return "Highly skilled and competent!";
    }
  } else if (score >= 60) {
    switch (dimension) {
      case "passion":
        return "Good enthusiasm — keep nurturing this!";
      case "mission":
        return "Solid alignment with what the world needs.";
      case "profession":
        return "Promising career potential here.";
      case "vocation":
        return "Good skills foundation — keep building!";
    }
  } else if (score >= 40) {
    switch (dimension) {
      case "passion":
        return "Growing interest — explore more!";
      case "mission":
        return "Developing sense of purpose.";
      case "profession":
        return "Career potential emerging.";
      case "vocation":
        return "Skills developing — practice more!";
    }
  } else {
    switch (dimension) {
      case "passion":
        return "Still discovering what you love.";
      case "mission":
        return "Exploring how you can contribute.";
      case "profession":
        return "Early stage — more exploration needed.";
      case "vocation":
        return "Building foundational skills.";
    }
  }
  return "";
}

function buildIkigaiData(scores: IkigaiScores): Record<string, IkigaiPillar> {
  return {
    passion: {
      score: scores.passion,
      label: "Passion",
      emoji: "🔥",
      description: "What you love",
      insight: getPillarInsight("passion", scores.passion),
      route: "/ikigai/passion",
    },
    mission: {
      score: scores.mission,
      label: "Mission",
      emoji: "🎯",
      description: "What the world needs",
      insight: getPillarInsight("mission", scores.mission),
      route: "/ikigai/mission",
    },
    profession: {
      score: scores.profession,
      label: "Profession",
      emoji: "💼",
      description: "What you can be paid for",
      insight: getPillarInsight("profession", scores.profession),
      route: "/ikigai/profession",
    },
    vocation: {
      score: scores.vocation,
      label: "Vocation",
      emoji: "🌍",
      description: "What you're good at",
      insight: getPillarInsight("vocation", scores.vocation),
      route: "/ikigai/vocation",
    },
  };
}

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
  Beginner: Accent.green,
  Intermediate: Accent.purple,
  Advanced: Accent.orange,
  Master: Accent.red,
};

const CATEGORY_COLORS: Record<string, string> = {
  Design: Accent.purple,
  Code: Accent.blue,
  "Soft Skills": Accent.green,
};

// ------- Component -------
export default function ProfileScreen() {
  const { user, isGuest, guestLanguage, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<InterestCategory[]>([]);
  const [careers, setCareers] = useState<CareerGoal[]>([]);
  const [ikigaiScores, setIkigaiScores] = useState<IkigaiScores | null>(null);
  const [scoreTimeline, setScoreTimeline] = useState<ScoreTimelineItem[]>([]);
  const [hasScores, setHasScores] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setScoresLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setScoresLoading(true);

      const [
        profileData,
        interestsData,
        careersData,
        scoresData,
        timelineData,
        hasScoresData,
      ] = await Promise.all([
        getProfile(user.id),
        supabase.from("user_interests").select("*").eq("user_id", user.id),
        supabase.from("career_goals").select("*").eq("user_id", user.id),
        getUserIkigaiScores(),
        getScoreTimeline(),
        hasUserScores(),
      ]);

      setProfile(profileData);
      setInterests(interestsData.data || []);
      setCareers(careersData.data || []);
      setIkigaiScores(scoresData);
      setScoreTimeline(timelineData);
      setHasScores(hasScoresData);
      setLoading(false);
      setScoresLoading(false);
    };

    loadData();
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleCreateProfile = () => {
    router.replace("/");
  };

  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "Explorer";
  const appVersion = Constants.expoConfig?.version ?? "dev";
  const formatCareerName = (name: string) => name.split("(")[0].trim();
  const guestCopy =
    guestLanguage === "th"
      ? {
          title: "เริ่มต้นเส้นทางของคุณ",
          benefits: [
            "บันทึกความคืบหน้าในทุกเส้นทางอาชีพ",
            "ติดตามคะแนน Ikigai และการพัฒนาทักษะของคุณ",
            "ปลดล็อกความสำเร็จและโอกาสใหม่ ๆ",
            "สร้างพอร์ตสำหรับยื่น TCAS และมหาวิทยาลัย",
          ],
          cta: "สร้างโปรไฟล์",
          secondary: "มีบัญชีอยู่แล้ว? เข้าสู่ระบบเพื่อไปต่อ",
        }
      : {
          title: "Start Your Journey",
          benefits: [
            "Save your progress across all career paths",
            "Track your Ikigai scores and skill development",
            "Unlock achievements and new opportunities",
            "Build your portfolio for TCAS university applications",
          ],
          cta: "Create Profile",
          secondary: "Already have an account? Sign in to continue",
        };

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

  // Guest state: show create profile CTA
  if (!authLoading && (isGuest || !user)) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.guestContainer}>
          <View style={styles.guestContent}>
            <View style={styles.guestIconContainer}>
              <Text style={styles.guestIcon}>🌱</Text>
            </View>

            <Text style={styles.guestTitle}>{guestCopy.title}</Text>

            <View style={styles.guestBenefits}>
              {["🎯", "📊", "🏆", "📁"].map((emoji, index) => (
                <View key={emoji} style={styles.guestBenefitItem}>
                  <Text style={styles.guestBenefitEmoji}>{emoji}</Text>
                  <Text style={styles.guestBenefitText}>
                    {guestCopy.benefits[index]}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.guestCtaBtn,
                pressed && styles.guestCtaBtnPressed,
              ]}
              onPress={handleCreateProfile}
            >
              <Text style={styles.guestCtaBtnText}>{guestCopy.cta}</Text>
            </Pressable>

            <Text style={styles.guestSecondaryText}>{guestCopy.secondary}</Text>
          </View>

          <View style={styles.guestVersionContainer}>
            <Text style={styles.versionText}>Version {appVersion}</Text>
          </View>
        </View>
      </View>
    );
  }

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

                {scoresLoading ? (
                  <View style={styles.scoresLoadingContainer}>
                    <ActivityIndicator color="#8B5CF6" />
                    <Text style={styles.scoresLoadingText}>
                      Loading your scores...
                    </Text>
                  </View>
                ) : hasScores && ikigaiScores ? (
                  <>
                    <View style={styles.ikigaiGrid}>
                      {Object.values(buildIkigaiData(ikigaiScores)).map(
                        (pillar) => (
                          <IkigaiCell key={pillar.label} pillar={pillar} />
                        )
                      )}
                    </View>

                    {/* Score Timeline */}
                    {scoreTimeline.length > 1 && (
                      <View style={styles.timelineContainer}>
                        <Text style={styles.timelineTitle}>Score Trend</Text>
                        <ScoreTimeline timeline={scoreTimeline} />
                      </View>
                    )}

                    <View style={styles.insightCard}>
                      <Text style={styles.insightText}>
                        💡 {getIkigaiInsight(ikigaiScores)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyScoresContainer}>
                    <Text style={styles.emptyScoresEmoji}>🌱</Text>
                    <Text style={styles.emptyScoresTitle}>
                      Discover Your Ikigai
                    </Text>
                    <Text style={styles.emptyScoresText}>
                      Complete Seeds and submit reflections to reveal your
                      passion, mission, profession, and vocation scores.
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.exploreSeedsBtn,
                        pressed && styles.exploreSeedsBtnPressed,
                      ]}
                      onPress={() => router.push("/discover")}
                    >
                      <Text style={styles.exploreSeedsBtnText}>
                        Explore Seeds
                      </Text>
                    </Pressable>
                  </View>
                )}
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

              {/* ── Portfolio & Fit ── */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Portfolio & TCAS</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && styles.actionRowPressed,
                  ]}
                  onPress={() => router.push("/portfolio")}
                >
                  <Text style={styles.actionRowEmoji}>📁</Text>
                  <View style={styles.actionRowContent}>
                    <Text style={styles.actionRowTitle}>
                      พอร์ตโฟลิโอของฉัน
                    </Text>
                    <Text style={styles.actionRowSubtitle}>
                      จัดการผลงาน โปรเจกต์ และกิจกรรม
                    </Text>
                  </View>
                  <Text style={styles.actionRowArrow}>›</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && styles.actionRowPressed,
                  ]}
                  onPress={() => router.push("/fit")}
                >
                  <Text style={styles.actionRowEmoji}>🎯</Text>
                  <View style={styles.actionRowContent}>
                    <Text style={styles.actionRowTitle}>
                      ความเหมาะสม TCAS1
                    </Text>
                    <Text style={styles.actionRowSubtitle}>
                      ดูคะแนนความเหมาะสมกับโปรแกรมรอบ Portfolio
                    </Text>
                  </View>
                  <Text style={styles.actionRowArrow}>›</Text>
                </Pressable>
              </View>

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

function ScoreTimeline({ timeline }: { timeline: ScoreTimelineItem[] }) {
  // Show last 7 data points max
  const recentTimeline = timeline.slice(-7);
  const maxScore = 100;

  return (
    <View style={styles.timelineWrapper}>
      <View style={styles.timelineChart}>
        {recentTimeline.map((item, index) => {
          const passionHeight = (item.passion / maxScore) * 100;
          const missionHeight = (item.mission / maxScore) * 100;
          const professionHeight = (item.profession / maxScore) * 100;
          const vocationHeight = (item.vocation / maxScore) * 100;

          return (
            <View key={item.date} style={styles.timelineColumn}>
              <View style={styles.timelineBars}>
                <View
                  style={[
                    styles.timelineBar,
                    styles.timelineBarPassion,
                    { height: `${passionHeight}%` },
                  ]}
                />
                <View
                  style={[
                    styles.timelineBar,
                    styles.timelineBarMission,
                    { height: `${missionHeight}%` },
                  ]}
                />
                <View
                  style={[
                    styles.timelineBar,
                    styles.timelineBarProfession,
                    { height: `${professionHeight}%` },
                  ]}
                />
                <View
                  style={[
                    styles.timelineBar,
                    styles.timelineBarVocation,
                    { height: `${vocationHeight}%` },
                  ]}
                />
              </View>
              <Text style={styles.timelineDate}>
                {new Date(item.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.timelineLegend}>
        <View style={styles.timelineLegendItem}>
          <View style={[styles.timelineLegendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.timelineLegendText}>Passion</Text>
        </View>
        <View style={styles.timelineLegendItem}>
          <View style={[styles.timelineLegendDot, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.timelineLegendText}>Mission</Text>
        </View>
        <View style={styles.timelineLegendItem}>
          <View style={[styles.timelineLegendDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.timelineLegendText}>Profession</Text>
        </View>
        <View style={styles.timelineLegendItem}>
          <View style={[styles.timelineLegendDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.timelineLegendText}>Vocation</Text>
        </View>
      </View>
    </View>
  );
}

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
    backgroundColor: PageBg.default,
  },

  // Guest State Styles - Career Simulator Design System
  guestContainer: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  guestContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  guestIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Border.default,
  },
  guestIcon: {
    fontSize: 48,
  },
  guestTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 32,
    textAlign: "center",
  },
  guestBenefits: {
    width: "100%",
    gap: 12,
    marginBottom: 40,
  },
  guestBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  guestBenefitEmoji: {
    fontSize: 24,
  },
  guestBenefitText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  guestCtaBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: Accent.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  guestCtaBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  guestCtaBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  guestSecondaryText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  guestVersionContainer: {
    paddingBottom: 40,
    alignItems: "center",
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

  // Action rows (Portfolio & TCAS)
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  actionRowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  actionRowEmoji: {
    fontSize: 24,
  },
  actionRowContent: {
    flex: 1,
    gap: 2,
  },
  actionRowTitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111827",
  },
  actionRowSubtitle: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "#9CA3AF",
  },
  actionRowArrow: {
    fontSize: 20,
    color: "#9CA3AF",
    marginLeft: 4,
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

  // Scores Loading
  scoresLoadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  scoresLoadingText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
  },

  // Empty Scores State
  emptyScoresContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyScoresEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyScoresTitle: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyScoresText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  exploreSeedsBtn: {
    backgroundColor: Accent.yellow,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreSeedsBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  exploreSeedsBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111827",
  },

  // Score Timeline
  timelineContainer: {
    marginTop: 20,
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  timelineWrapper: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  timelineChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
    marginBottom: 12,
  },
  timelineColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  timelineBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
    height: 80,
  },
  timelineBar: {
    width: 4,
    borderRadius: 2,
  },
  timelineBarPassion: {
    backgroundColor: "#EF4444",
  },
  timelineBarMission: {
    backgroundColor: "#3B82F6",
  },
  timelineBarProfession: {
    backgroundColor: "#10B981",
  },
  timelineBarVocation: {
    backgroundColor: "#F59E0B",
  },
  timelineDate: {
    fontSize: 9,
    fontFamily: "Orbit_400Regular",
    color: "#9CA3AF",
  },
  timelineLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  timelineLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timelineLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineLegendText: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
  },
});
