import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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
          <View style={styles.header}>
            <Text style={styles.name}>{displayName}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.settingsBtn,
                pressed && styles.settingsBtnPressed,
              ]}
              onPress={() => router.push("/settings")}
            >
              <Text style={styles.settingsBtnText}>⚙️</Text>
            </Pressable>
          </View>

          {/* Onboarded Info Sections */}
          {loading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator color="#BFFF00" />
            </View>
          ) : (
            <>
              {/* Career Goals - Moved to top */}
              {careers.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Career Goals</Text>
                  <View style={styles.careersWrap}>
                    {careers.map((career, idx) => (
                      <Pressable
                        key={idx}
                        style={({ pressed }) => [
                          styles.careerChipWrapper,
                          pressed && {
                            opacity: 0.9,
                            transform: [{ scale: 0.98 }],
                          },
                        ]}
                        onPress={() =>
                          router.push(
                            `/career/${encodeURIComponent(career.career_name)}`,
                          )
                        }
                      >
                        <LinearGradient
                          colors={["rgb(0, 22, 81)", "rgb(0, 64, 240)"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={[
                            styles.careerChip,
                            career.source === "user_typed" &&
                              styles.careerChipCustom,
                          ]}
                        >
                          <View style={styles.careerChipInner}>
                            <Text
                              style={[
                                styles.careerChipText,
                                career.source === "user_typed" &&
                                  styles.careerChipTextCustom,
                              ]}
                            >
                              {formatCareerName(career.career_name)}
                            </Text>
                          </View>
                        </LinearGradient>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

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
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Level</Text>
                    <Text style={styles.infoValue}>
                      {profile.education_level === "high_school"
                        ? "High School"
                        : profile.education_level === "university"
                          ? "University"
                          : "Unaffiliated"}
                    </Text>
                  </View>
                  {profile.school_name && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>School</Text>
                      <Text style={styles.infoValue}>
                        {profile.school_name}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Language</Text>
                    <Text style={styles.infoValue}>
                      {profile.preferred_language === "en" ? "English" : "ไทย"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Interests */}
              {interests.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Interests</Text>
                  {interests.map((interest, idx) => (
                    <View key={idx} style={styles.interestCategory}>
                      <Text style={styles.categoryName}>
                        {interest.category_name}
                      </Text>
                      {interest.selected && interest.selected.length > 0 && (
                        <View style={styles.statementsWrap}>
                          {interest.selected.map((stmt, sidx) => (
                            <View key={sidx} style={styles.statementChip}>
                              <Text style={styles.statementChipText}>
                                {stmt}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
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
    backgroundColor: "#FDFFF5",
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
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    position: "relative",
  },
  settingsBtn: {
    position: "absolute",
    right: 24,
    top: 64,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
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
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutBtnPressed: {
    backgroundColor: "#111",
  },
  signOutText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#666",
  },
  signOutTextPressed: {
    color: "#fff",
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
