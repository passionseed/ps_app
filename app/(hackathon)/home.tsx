import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Dimensions, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppText } from "../../components/AppText";
import { Space } from "../../lib/theme";
import { LinearGradient } from "expo-linear-gradient";

const BG = "transparent";
const WHITE = "#FFFFFF";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE40 = "rgba(255,255,255,0.4)";
const CYAN = "#91C4E3";
const CYAN_DIM = "rgba(145,196,227,0.3)";
const AMBER = "#F59E0B";

type TimelineItem = {
  num: string;
  title: string;
  desc: string;
  date: string;
};

const ITEMS: TimelineItem[] = [
  { num: "01", title: "Registration", desc: "Sign up your team and prepare for the journey ahead.", date: "23 Feb – 5 Apr" },
  { num: "02", title: "Opening Ceremony", desc: "Kickoff event to introduce the challenge and inspire participants.", date: "7 Apr" },
  { num: "03", title: "Workshops & Hacking", desc: "Learn, build, and develop your preventive healthcare solution.", date: "7 Apr – 28 May" },
  { num: "04", title: "1st Submission", desc: "Submit your prototype and presentation slides.", date: "29 May" },
  { num: "05", title: "2nd Submission", desc: "Submit your project video presentation.", date: "6 Jun" },
  { num: "06", title: "Final Pitch", desc: "Present your solution to judges and showcase your work.", date: "20 Jun" },
  { num: "07", title: "Futurist Fest 2026", desc: "Connect with researchers, experts, and investors to grow your ideas.", date: "21 Jun" },
];

export default function HackathonHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0 });

  useEffect(() => {
    // 7 April 2026 UTC/Local approximation for countdown
    const target = new Date("2026-04-07T09:00:00").getTime();
    
    const update = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ d, h, m });
    };
    
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.md }]}>
        
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image 
            source={require("../../assets/HackLogo.png")} 
            style={styles.logo} 
            contentFit="contain" 
          />
          <Text style={styles.subtitle}>
            Preventive & Predictive Healthcare
          </Text>
        </View>

        {/* Countdown */}
        <View style={styles.countdownContainer}>
          <AppText style={styles.countdownEyebrow}>NEXT PHASE</AppText>
          <AppText variant="bold" style={styles.countdownTitle}>Opening Ceremony</AppText>
          <View style={styles.countdownBoxes}>
            <View style={styles.countBox}>
              <AppText variant="bold" style={styles.countVal}>{timeLeft.d}</AppText>
              <AppText style={styles.countLabel}>DAYS</AppText>
            </View>
            <View style={styles.countBox}>
              <AppText variant="bold" style={styles.countVal}>{timeLeft.h.toString().padStart(2, "0")}</AppText>
              <AppText style={styles.countLabel}>HOURS</AppText>
            </View>
            <View style={styles.countBox}>
              <AppText variant="bold" style={styles.countVal}>{timeLeft.m.toString().padStart(2, "0")}</AppText>
              <AppText style={styles.countLabel}>MINS</AppText>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <AppText variant="bold" style={styles.sectionTitle}>Master Timeline</AppText>
          <View style={styles.timelineList}>
            {ITEMS.map((item, i) => {
              const isCurrent = i === 0; // Just for demo, first item or logic
              return (
                <View key={item.num} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, isCurrent && styles.timelineDotActive]} />
                    {i !== ITEMS.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineRight}>
                    <AppText style={styles.timelineDate}>{item.date}</AppText>
                    <AppText variant="bold" style={[styles.timelineItemTitle, isCurrent && { color: WHITE }]}>{item.title}</AppText>
                    <AppText style={styles.timelineItemDesc}>{item.desc}</AppText>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Placeholders */}
        <Pressable style={styles.placeholderCard} onPress={() => router.push("/(hackathon)/mentor-booking")}>
          <AppText variant="bold" style={styles.placeholderTitle}>Mentor Booking</AppText>
          <AppText style={styles.placeholderText}>Schedule 1:1 help with technical and business mentors.</AppText>
          <AppText variant="bold" style={styles.placeholderBadgeCyan}>Book Now →</AppText>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: {
    padding: Space.xl,
    paddingBottom: 120,
    gap: Space["2xl"],
  },
  header: {
    alignItems: "center",
    marginTop: Space.sm,
  },
  logo: {
    width: 200,
    height: 180,
  },
  subtitle: {
    fontFamily: "ReenieBeanie_400Regular", 
    fontSize: 24, 
    color: WHITE, 
    textAlign: "center", 
    marginTop: -45, 
  },

  countdownContainer: {
    alignItems: "center",
    backgroundColor: "rgba(13,18,25,0.6)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CYAN_DIM,
    padding: Space.xl,
  },
  countdownEyebrow: {
    fontSize: 10,
    color: CYAN,
    letterSpacing: 2,
    marginBottom: Space.xs,
    fontFamily: "BaiJamjuree_500Medium",
  },
  countdownTitle: {
    fontSize: 22,
    color: WHITE,
    marginBottom: Space.lg,
  },
  countdownBoxes: {
    flexDirection: "row",
    gap: Space.md,
  },
  countBox: {
    backgroundColor: "rgba(145,196,227,0.1)",
    borderRadius: 12,
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
  },
  countVal: {
    fontSize: 24,
    color: WHITE,
  },
  countLabel: {
    fontSize: 9,
    color: WHITE70,
    marginTop: 2,
    letterSpacing: 1,
  },

  sectionTitle: {
    fontSize: 20,
    color: WHITE,
    marginBottom: Space.lg,
  },
  timelineSection: {
    marginTop: Space.xs,
  },
  timelineList: {
    paddingLeft: Space.xs,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 80,
  },
  timelineLeft: {
    width: 32,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(145,196,227,0.2)",
    borderWidth: 2,
    borderColor: "rgba(145,196,227,0.4)",
    zIndex: 2,
  },
  timelineDotActive: {
    backgroundColor: CYAN,
    borderColor: "#FFFFFF",
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "rgba(145,196,227,0.15)",
    marginTop: 4,
    marginBottom: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: Space.xl,
    paddingLeft: Space.sm,
    marginTop: -4,
  },
  timelineDate: {
    fontSize: 12,
    color: CYAN,
    marginBottom: 2,
    fontFamily: "BaiJamjuree_500Medium",
  },
  timelineItemTitle: {
    fontSize: 16,
    color: WHITE70,
    marginBottom: 4,
  },
  timelineItemDesc: {
    fontSize: 13,
    color: WHITE40,
    lineHeight: 18,
  },

  placeholderCard: {
    backgroundColor: "rgba(145,196,227,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.1)",
    padding: Space.lg,
    gap: Space.xs,
  },
  placeholderTitle: { fontSize: 16, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  placeholderText: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "BaiJamjuree_400Regular" },
  placeholderBadge: { fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: 1.5, marginTop: Space.xs, fontFamily: "BaiJamjuree_700Bold" },
  placeholderBadgeCyan: { fontSize: 10, color: CYAN, textTransform: "uppercase", letterSpacing: 1.5, marginTop: Space.xs, fontFamily: "BaiJamjuree_700Bold" },
});

