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

  const mockActivity = [
    {
      id: 1,
      type: "milestone",
      title: "Unlocked Space Architect Path",
      date: "Today",
    },
    {
      id: 2,
      type: "learning",
      title: "Explored Cyber Security basics",
      date: "Yesterday",
    },
    { id: 3, type: "milestone", title: "Joined the Beta", date: "3 days ago" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {/* Header / Identity with Settings */}
          <LinearGradient
            colors={["#FFFFFF", "#F9F5FF", "#EEF2FF"]}
            style={styles.headerGradient}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={require("../../assets/passionseed-logo.svg")}
                style={styles.avatar}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.name}>{displayName}</Text>

            <View style={styles.visionBoard}>
              {careers.length === 0 && interests.length === 0 ? (
                <>
                  <VisionChip text="Game Developer" type="career" />
                  <VisionChip text="Space Architecture" type="career" />
                  <VisionChip text="AI Ethics" type="interest" />
                </>
              ) : (
                <>
                  {careers.map((career, idx) => (
                    <VisionChip
                      key={`career-${idx}`}
                      text={formatCareerName(career.career_name)}
                      type="career"
                    />
                  ))}
                  {interests
                    .flatMap((i) => i.selected || [])
                    .slice(0, 3)
                    .map((stmt, idx) => (
                      <VisionChip
                        key={`interest-${idx}`}
                        text={stmt}
                        type="interest"
                      />
                    ))}
                </>
              )}
            </View>

            {interests.flatMap((i) => i.selected || []).length > 3 && (
              <Pressable
                style={({ pressed }) => [
                  styles.viewInterestsBtn,
                  pressed && styles.viewInterestsBtnPressed,
                ]}
                onPress={() => router.push("/settings")} // Replace with interests page route when ready
              >
                <Text style={styles.viewInterestsText}>View Top Interests</Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.settingsBtn,
                pressed && styles.settingsBtnPressed,
              ]}
              onPress={() => router.push("/settings")}
            >
              <Text style={styles.settingsBtnText}>⚙️</Text>
            </Pressable>
          </LinearGradient>

          {/* Onboarded Info Sections */}
          {loading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator color="#BFFF00" />
            </View>
          ) : (
            <>
              {/* Career Goals removed / moved to Vision Board */}

              {/* Recent Activity */}
              <View style={styles.activitySection}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {mockActivity.map((activity) => (
                  <View
                    key={activity.id}
                    style={[
                      styles.activityCard,
                      activity.type === "milestone"
                        ? styles.activityCardMilestone
                        : styles.activityCardLearning,
                    ]}
                  >
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDate}>{activity.date}</Text>
                  </View>
                ))}
              </View>

              {/* Stats placeholder */}
              <View style={styles.statsRow}>
                <StatBox value="0" label="Paths Explored" />
                <View style={styles.statDivider} />
                <StatBox value="0" label="Tasks Done" />
                <View style={styles.statDivider} />
                <StatBox value="0d" label="Streak" />
              </View>

              {/* Education Info */}
              {profile && (
                <View style={styles.infoSection}>
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

              {/* Interests removed / moved to Vision Board */}
            </>
          )}

          {/* Coming soon */}
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonIcon}>🚀</Text>
            <Text style={styles.comingSoonTitle}>Direction Finder</Text>
            <Text style={styles.comingSoonText}>
              After exploring paths, unlock AI-powered career direction
              recommendations tailored to your interests.
            </Text>
          </View>

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
  headerGradient: {
    marginHorizontal: 16,
    marginTop: 48,
    marginBottom: 24,
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
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 40,
    height: 40,
  },
  visionBoard: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  },
  visionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  visionChipCareer: {
    borderColor: "rgba(16, 185, 129, 0.15)",
    shadowColor: "rgba(16, 185, 129, 0.25)",
  },
  visionChipInterest: {
    borderColor: "rgba(139, 92, 246, 0.15)",
    shadowColor: "rgba(139, 92, 246, 0.25)",
  },
  visionChipText: {
    fontSize: 13,
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
    marginTop: 16,
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
  activitySection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  activityCardMilestone: {
    shadowColor: "rgba(16, 185, 129, 0.25)",
  },
  activityCardLearning: {
    shadowColor: "rgba(59, 130, 246, 0.25)",
  },
  activityTitle: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  settingsBtn: {
    position: "absolute",
    right: 24,
    top: 24,
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
  name: {
    fontSize: 28,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#eee",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  comingSoon: {
    marginHorizontal: 24,
    backgroundColor: "#f0f8e8",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  comingSoonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  signOutBtn: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
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
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#999",
    letterSpacing: 0.2,
  },
  loadingSection: {
    marginHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
  },
  infoSection: {
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
  },
  interestCategory: {
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  statementsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statementChip: {
    backgroundColor: "#f0f8e8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statementChipText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#111",
  },
  careersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  careerChipWrapper: {
    borderRadius: 8,
    overflow: "hidden",
  },
  careerChip: {
    height: 32,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 1.5,
    borderColor: "rgba(99, 141, 255, 0.5)",
    borderBottomColor: "rgba(99, 141, 255, 0.8)",
  },
  careerChipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  careerChipCustom: {
    borderWidth: 1,
    borderColor: "#BFFF00",
  },
  careerChipText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#fff",
  },
  careerChipTextCustom: {
    color: "#fff",
  },
});
