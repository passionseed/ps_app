import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../components/AppText";
import { HackathonBackground } from "../../components/Hackathon/HackathonBackground";
import { HackathonJellyfishLoader } from "../../components/Hackathon/HackathonJellyfishLoader";
import { SkiaBackButton } from "../../components/navigation/SkiaBackButton";
import {
  fetchMentorGuides,
  fetchGuideWithCompletion,
  type MentorGuide,
  type GuideWithCompletion,
  getCategoryInfo,
} from "../../lib/mentorGuides";

const BG = "#03050a";
const CARD_BG = "rgba(13,18,25,0.95)";
const CYAN = "#91C4E3";
const BLUE = "#65ABFC";
const CYAN20 = "rgba(145,196,227,0.20)";
const BORDER = "rgba(74,107,130,0.35)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const GREEN = "#4ADE80";

export default function MentorGuidesScreen() {
  const insets = useSafeAreaInsets();
  const [guides, setGuides] = useState<GuideWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    const list = await fetchMentorGuides();
    const withCompletion = await Promise.all(
      list.map((g) => fetchGuideWithCompletion(g.id))
    );
    setGuides(withCompletion.filter(Boolean) as GuideWithCompletion[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGuides();
    }, [loadGuides])
  );

  const renderGuide = ({ item }: { item: GuideWithCompletion }) => {
    const cat = getCategoryInfo(item.category);
    return (
      <Pressable
        style={styles.guideCard}
        onPress={() => router.push(`/(hackathon)/guide/${item.id}`)}
      >
        <LinearGradient
          colors={["rgba(145,196,227,0.08)", "rgba(13,18,25,0.6)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: cat.color + "30" }]}>
              <AppText style={[styles.categoryEmoji, { color: cat.color }]}>
                {cat.emoji}
              </AppText>
              <AppText style={[styles.categoryLabel, { color: cat.color }]}>
                {cat.label}
              </AppText>
            </View>
            {item.is_completed && (
              <View style={styles.completedBadge}>
                <AppText style={styles.completedText}>Completed</AppText>
              </View>
            )}
          </View>

          <AppText variant="bold" style={styles.guideTitle} numberOfLines={2}>
            {item.title}
          </AppText>

          {item.subtitle && (
            <AppText style={styles.guideSubtitle} numberOfLines={1}>
              {item.subtitle}
            </AppText>
          )}

          {item.description && (
            <AppText style={styles.guideDescription} numberOfLines={3}>
              {item.description}
            </AppText>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.metaRow}>
              {item.mentor_photo_url ? (
                <View style={[styles.mentorAvatar, { borderWidth: 0 }]}>
                  {/* Photo could be loaded here */}
                  <AppText style={styles.mentorInitial}>
                    {item.mentor_name.charAt(0)}
                  </AppText>
                </View>
              ) : (
                <View style={styles.mentorAvatar}>
                  <AppText style={styles.mentorInitial}>
                    {item.mentor_name.charAt(0)}
                  </AppText>
                </View>
              )}
              <AppText style={styles.mentorName} numberOfLines={1}>
                {item.mentor_name}
              </AppText>
            </View>

            <View style={styles.metaRight}>
              <View style={styles.pointsBadge}>
                <AppText style={styles.pointsText}>+{item.points_on_completion} pts</AppText>
              </View>
              <AppText style={styles.timeEstimate}>
                ~{item.estimated_minutes} min
              </AppText>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <HackathonBackground />
        <View style={styles.header}>
          <SkiaBackButton onPress={() => router.back()} />
          <AppText variant="bold" style={styles.headerTitle}>
            Mentor Guides
          </AppText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <HackathonJellyfishLoader />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <HackathonBackground />
      <View style={styles.header}>
        <SkiaBackButton onPress={() => router.back()} />
        <AppText variant="bold" style={styles.headerTitle}>
          Mentor Guides
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.subtitleRow}>
        <AppText style={styles.subtitleText}>
          Read guides from mentors. Earn points for each one you complete.
        </AppText>
      </View>

      {guides.length === 0 ? (
        <View style={styles.emptyState}>
          <AppText style={styles.emptyEmoji}>📚</AppText>
          <AppText style={styles.emptyTitle}>No guides yet</AppText>
          <AppText style={styles.emptyText}>
            Mentors will post guides here soon.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={guides}
          renderItem={renderGuide}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    color: WHITE,
  },
  subtitleRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  subtitleText: {
    fontSize: 14,
    color: WHITE55,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 12,
  },
  guideCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardGradient: {
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 12,
  },
  completedBadge: {
    backgroundColor: "rgba(74,222,128,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  completedText: {
    fontSize: 11,
    color: GREEN,
    fontFamily: "BaiJamjuree_500Medium",
  },
  guideTitle: {
    fontSize: 18,
    color: WHITE,
    lineHeight: 24,
  },
  guideSubtitle: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_500Medium",
  },
  guideDescription: {
    fontSize: 13,
    color: WHITE55,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  mentorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CYAN20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CYAN + "40",
  },
  mentorInitial: {
    fontSize: 13,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  mentorName: {
    fontSize: 13,
    color: WHITE75,
    flex: 1,
  },
  metaRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  pointsBadge: {
    backgroundColor: "rgba(101,171,252,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(101,171,252,0.3)",
  },
  pointsText: {
    fontSize: 12,
    color: BLUE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  timeEstimate: {
    fontSize: 11,
    color: WHITE55,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: WHITE55,
    textAlign: "center",
    lineHeight: 20,
  },
});
