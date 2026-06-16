import { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AppText } from "../../components/AppText";
import { SkiaBackButton } from "../../components/navigation/SkiaBackButton";
import { useAuth } from "../../lib/auth";
import {
  getCareerSurvival,
  normalizeCareerSlug,
  type CareerSurvival,
} from "../../lib/careerSurvival";
import { supabase } from "../../lib/supabase";
import { PageBg, Text as ThemeText, Radius, Shadow, Space } from "../../lib/theme";

const TIER_COLORS = {
  growing: { bg: "rgba(16,185,129,0.1)", text: "#10B981" },
  shifting: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
  exposed: { bg: "rgba(239,68,68,0.1)", text: "#EF4444" },
} as const;

type TierKey = keyof typeof TIER_COLORS;

const COPY = {
  th: {
    careerStatus: "สถานะอาชีพ",
    growing: "กำลังเติบโต",
    shifting: "กำลังเปลี่ยนแปลง",
    exposed: "เสี่ยงต่อการถูกแทนที่",
    reasoning: "เหตุผล",
    sources: "แหล่งข้อมูล",
    escapeRoute: "เส้นทางหนีทางรอด",
    notFound: "ไม่พบข้อมูล",
    tryAgain: "ลองอีกครั้ง",
    loadFailed: "เชื่อมต่อไม่ได้ชั่วคราว",
    aiImpact: "ผลกระทบจาก AI",
    automationRisk: "ความเสี่ยงถูกแทนที่",
    toolsToMaster: "เครื่องมือ AI ที่ต้องใช้เป็น",
    augmentedByAI: "สิ่งที่ AI ช่วยให้ดีขึ้น",
    automatedByAI: "สิ่งที่ AI กำลังแทนที่",
    specialtyTracks: "สายงานย่อย",
    demand: "ความต้องการ",
    salaryPremium: "พรีเมียมเงินเดือน",
    futureOpportunities: "โอกาสในอนาคต",
    transitionTimeline: "ระยะเวลาเปลี่ยนสาย",
    difficulty: "ความยาก",
  },
  en: {
    careerStatus: "Career Status",
    growing: "Growing",
    shifting: "Shifting",
    exposed: "Exposed to AI",
    reasoning: "Reasoning",
    sources: "Sources",
    escapeRoute: "Escape Route",
    notFound: "Not found",
    tryAgain: "Try again",
    loadFailed: "Temporary connection issue",
    aiImpact: "AI Impact",
    automationRisk: "Automation Risk",
    toolsToMaster: "AI Tools to Master",
    augmentedByAI: "Augmented by AI",
    automatedByAI: "Automated by AI",
    specialtyTracks: "Specialty Tracks",
    demand: "Demand",
    salaryPremium: "Salary Premium",
    futureOpportunities: "Future Opportunities",
    transitionTimeline: "Timeline",
    difficulty: "Difficulty",
  },
};

function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getTierLabel(tier: TierKey, lang: "th" | "en"): string {
  return COPY[lang][tier];
}

function isValidTier(tier: string): tier is TierKey {
  return tier === "growing" || tier === "shifting" || tier === "exposed";
}

const CATEGORY_LABELS: Record<string, { th: string; en: string }> = {
  skills: { th: "ทักษะที่ต้องมี", en: "Skills" },
  education: { th: "การศึกษา", en: "Education" },
  certifications: { th: "ใบรับรอง", en: "Certifications" },
  portfolio: { th: "ผลงาน", en: "Portfolio" },
  market: { th: "ตลาดงาน", en: "Job Market" },
  timeline: { th: "ระยะเวลา", en: "Timeline" },
  salary: { th: "เงินเดือน", en: "Salary" },
  competition: { th: "ความแข่งขัน", en: "Competition" },
};

function getCategoryLabel(category: string, lang: "th" | "en"): string {
  return CATEGORY_LABELS[category]?.[lang] ?? category;
}

interface SurvivalHeroProps {
  data: CareerSurvival;
  lang: "th" | "en";
}

function SurvivalHero({ data, lang }: SurvivalHeroProps) {
  const tier: TierKey = isValidTier(data.tier) ? data.tier : "shifting";
  const tierColors = TIER_COLORS[tier];
  const c = COPY[lang];

  return (
    <View style={s.heroCard}>
      <AppText variant="bold" style={s.heroTitle}>
        {slugToDisplayName(data.slug)}
      </AppText>

      <View style={[s.tierBadge, { backgroundColor: tierColors.bg }]}>
        <AppText variant="bold" style={[s.tierText, { color: tierColors.text }]}>
          {getTierLabel(tier, lang)}
        </AppText>
      </View>

      {data.reasoning && (
        <View style={s.reasoningSection}>
          <AppText variant="bold" style={s.sectionTitle}>
            {c.reasoning}
          </AppText>
          <AppText style={s.reasoningText}>{data.reasoning}</AppText>
        </View>
      )}

      {data.sources && data.sources.length > 0 && (
        <View style={s.sourcesSection}>
          <AppText variant="bold" style={s.sectionTitle}>
            {c.sources}
          </AppText>
          {data.sources.map((source, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                s.sourceItem,
                pressed && s.sourceItemPressed,
              ]}
              onPress={() => {
                if (source.url) {
                  Linking.openURL(source.url).catch(() => {});
                }
              }}
            >
              <AppText
                style={[
                  s.sourceText,
                  source.url && s.sourceLink,
                ]}
                numberOfLines={1}
              >
                • {source.title}
              </AppText>
              {source.url && (
                <AppText style={s.sourceUrlIcon}> ↗</AppText>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {data.insights && data.insights.length > 0 && (
        <View style={s.insightsSection}>
          <AppText variant="bold" style={s.sectionTitle}>
            {lang === "th" ? "ข้อมูลเชิงลึก" : "Insights"}
          </AppText>
          {data.insights
            .sort((a, b) => a.priority - b.priority)
            .map((insight, index) => (
              <View key={index} style={s.insightItem}>
                <View style={s.insightHeader}>
                  <View style={[s.insightBadge, { backgroundColor: tierColors.bg }]}>
                    <AppText style={[s.insightBadgeText, { color: tierColors.text }]}>
                      {getCategoryLabel(insight.category, lang)}
                    </AppText>
                  </View>
                </View>
                <AppText style={s.insightContent}>{insight.content}</AppText>
              </View>
            ))}
        </View>
      )}

      {data.ai_impact && (
        <View style={s.aiImpactSection}>
          <AppText variant="bold" style={s.sectionTitle}>
            {lang === "th" ? "ผลกระทบจาก AI" : "AI Impact"}
          </AppText>
          
          <View style={s.aiRiskRow}>
            <AppText style={s.aiRiskLabel}>{c.automationRisk}:</AppText>
            <View style={s.aiRiskBar}>
              <View style={[s.aiRiskFill, { width: `${data.ai_impact.automation_risk * 10}%`, backgroundColor: tierColors.text }]} />
            </View>
            <AppText variant="bold" style={[s.aiRiskValue, { color: tierColors.text }]}>
              {data.ai_impact.automation_risk}/10
            </AppText>
          </View>

          <View style={s.aiSubSection}>
            <AppText variant="bold" style={s.aiSubTitle}>{c.toolsToMaster}</AppText>
            <View style={s.toolsRow}>
              {data.ai_impact.tools_to_master.map((tool, i) => (
                <View key={i} style={[s.toolBadge, { backgroundColor: tierColors.bg }]}>
                  <AppText style={[s.toolBadgeText, { color: tierColors.text }]}>{tool}</AppText>
                </View>
              ))}
            </View>
          </View>

          <View style={s.aiSubSection}>
            <AppText variant="bold" style={s.aiSubTitle}>{c.augmentedByAI}</AppText>
            <AppText style={s.aiSubText}>{data.ai_impact.augmented_tasks}</AppText>
          </View>

          <View style={s.aiSubSection}>
            <AppText variant="bold" style={s.aiSubTitle}>{c.automatedByAI}</AppText>
            <AppText style={s.aiSubText}>{data.ai_impact.automated_tasks}</AppText>
          </View>
        </View>
      )}

      {data.specialty_tracks && data.specialty_tracks.length > 0 && (
        <View style={s.tracksSection}>
          <AppText variant="bold" style={s.sectionTitle}>
            {lang === "th" ? "สายงานย่อย" : "Specialty Tracks"}
          </AppText>
          {data.specialty_tracks.map((track, index) => (
            <View key={index} style={s.trackCard}>
              <View style={s.trackHeader}>
                <AppText variant="bold" style={s.trackName}>{track.name}</AppText>
                <View style={[s.demandBadge, { backgroundColor: track.demand_level === 'high' ? 'rgba(16,185,129,0.1)' : track.demand_level === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)' }]}>
                  <AppText style={[s.demandText, { color: track.demand_level === 'high' ? '#10B981' : track.demand_level === 'medium' ? '#F59E0B' : '#EF4444' }]}>
                    {track.demand_level === 'high' ? (lang === 'th' ? 'สูง' : 'High') : track.demand_level === 'medium' ? (lang === 'th' ? 'ปานกลาง' : 'Medium') : (lang === 'th' ? 'ต่ำ' : 'Low')}
                  </AppText>
                </View>
              </View>
              <AppText style={s.trackDescription}>{track.description}</AppText>
              <AppText style={s.trackPremium}>{c.salaryPremium}: {track.salary_premium || track.pay_upside}</AppText>
            </View>
          ))}
        </View>
      )}

      {data.future_opportunities && data.future_opportunities.length > 0 && (
        <View style={s.futureSection}>
          <AppText variant="bold" style={s.sectionTitle}>
            {lang === "th" ? "โอกาสในอนาคต" : "Future Opportunities"}
          </AppText>
          {data.future_opportunities.map((opp, index) => (
            <View key={index} style={s.oppCard}>
              <AppText variant="bold" style={s.oppRole}>{opp.role}</AppText>
              <AppText style={s.oppDescription}>{opp.description}</AppText>
              <View style={s.oppMeta}>
                <AppText style={s.oppMetaText}>{c.transitionTimeline}: {opp.timeline}</AppText>
                <AppText style={[s.oppMetaText, { color: opp.transition_difficulty === 'easy' ? '#10B981' : opp.transition_difficulty === 'medium' ? '#F59E0B' : opp.transition_difficulty === 'hard' ? '#EF4444' : '#7C3AED' }]}>
                  {c.difficulty}: {opp.transition_difficulty === 'easy' ? (lang === 'th' ? 'ง่าย' : 'Easy') : opp.transition_difficulty === 'medium' ? (lang === 'th' ? 'ปานกลาง' : 'Medium') : opp.transition_difficulty === 'hard' ? (lang === 'th' ? 'ยาก' : 'Hard') : (lang === 'th' ? 'ยากมาก' : 'Very Hard')}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      )}

      {data.escape_route_slug && (
        <Pressable
          style={({ pressed }) => [
            s.escapeRouteCard,
            pressed && s.escapeRouteCardPressed,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/career/${data.escape_route_slug}`);
          }}
        >
          <AppText variant="bold" style={s.escapeRouteTitle}>
            {c.escapeRoute}
          </AppText>
          <AppText style={s.escapeRouteArrow}>→</AppText>
        </Pressable>
      )}
    </View>
  );
}

export default function CareerSurvivalScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const { appLanguage } = useAuth();
  const lang: "th" | "en" = appLanguage === "th" ? "th" : "en";
  const c = COPY[lang];

  const [survival, setSurvival] = useState<CareerSurvival | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!name) return;
    setError(null);
    setLoading(true);

    try {
      const slug = normalizeCareerSlug(name);
      const data = await getCareerSurvival(supabase, slug);
      setSurvival(data);
    } catch (err) {
      console.error("[CareerSurvival] Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar style="dark" />
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <SkiaBackButton
            onPress={() => router.back()}
            style={s.backBtn}
          />
        </View>
        <View style={s.center}>
          <AppText variant="bold" style={s.loadingText}>
            {c.loadFailed}
          </AppText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.container}>
        <StatusBar style="dark" />
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <SkiaBackButton
            onPress={() => router.back()}
            style={s.backBtn}
          />
        </View>
        <View style={s.center}>
          <AppText variant="bold" style={s.errorTitle}>
            {c.loadFailed}
          </AppText>
          <AppText style={s.errorBody}>{error}</AppText>
          <Pressable
            style={s.retryBtn}
            onPress={() => {
              setLoading(true);
              void loadData();
            }}
          >
            <AppText variant="bold" style={s.retryBtnText}>
              {c.tryAgain}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!survival) {
    return (
      <View style={s.container}>
        <StatusBar style="dark" />
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <SkiaBackButton
            onPress={() => router.back()}
            style={s.backBtn}
          />
        </View>
        <View style={s.center}>
          <AppText variant="bold" style={s.notFoundTitle}>
            {c.notFound}
          </AppText>
          <Pressable style={s.retryBtn} onPress={() => router.back()}>
            <AppText variant="bold" style={s.retryBtnText}>
              {c.tryAgain}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <View style={s.headerRow}>
          <SkiaBackButton
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={s.backBtn}
          />
          <View style={s.headerTitleWrap}>
            <AppText variant="bold" style={s.headerTitleText} numberOfLines={1}>
              {slugToDisplayName(survival.slug)}
            </AppText>
          </View>
          <View style={s.headerTitleBalance} />
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: insets.bottom + Space["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.springify().damping(22).stiffness(180).delay(40)}
        >
          <SurvivalHero data={survival} lang={lang} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 17,
    color: ThemeText.primary,
    textAlign: "center",
  },
  headerTitleBalance: {
    width: 38,
    height: 38,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80 + Space.lg,
    paddingHorizontal: Space.xl,
  },
  loadingText: {
    fontSize: 16,
    color: ThemeText.secondary,
  },
  errorTitle: {
    fontSize: 24,
    color: ThemeText.primary,
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: ThemeText.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  notFoundTitle: {
    fontSize: 24,
    color: ThemeText.primary,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: "#BFFF00",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: Radius.full,
    alignItems: "center",
    ...Shadow.card,
  },
  retryBtnText: {
    fontSize: 16,
    color: ThemeText.primary,
  },

  // Hero card
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: Radius.xl,
    padding: Space["2xl"],
    ...Shadow.card,
  },
  heroTitle: {
    fontSize: 28,
    color: ThemeText.primary,
    lineHeight: 36,
    marginBottom: Space.lg,
  },
  tierBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    marginBottom: Space.xl,
  },
  tierText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    color: ThemeText.primary,
    marginBottom: Space.md,
  },
  reasoningSection: {
    marginBottom: Space.xl,
  },
  reasoningText: {
    fontSize: 15,
    color: ThemeText.secondary,
    lineHeight: 24,
  },
  sourcesSection: {
    marginBottom: Space.xl,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Space.sm,
  },
  sourceItemPressed: {
    opacity: 0.6,
  },
  sourceText: {
    fontSize: 14,
    color: ThemeText.secondary,
  },
  sourceLink: {
    color: "#3B82F6",
  },
  sourceUrlIcon: {
    fontSize: 14,
    color: "#3B82F6",
  },
  insightsSection: {
    marginBottom: Space.xl,
  },
  insightItem: {
    marginBottom: Space.md,
    paddingVertical: Space.sm,
  },
  insightHeader: {
    marginBottom: Space.xs,
  },
  insightBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: Radius.sm,
  },
  insightBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  insightContent: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 22,
  },
  aiImpactSection: {
    marginBottom: Space.xl,
  },
  aiRiskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.md,
  },
  aiRiskLabel: {
    fontSize: 14,
    color: ThemeText.secondary,
    marginRight: Space.sm,
  },
  aiRiskBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginRight: Space.sm,
  },
  aiRiskFill: {
    height: 8,
    borderRadius: 4,
  },
  aiRiskValue: {
    fontSize: 14,
  },
  aiSubSection: {
    marginBottom: Space.md,
  },
  aiSubTitle: {
    fontSize: 14,
    color: ThemeText.primary,
    marginBottom: Space.xs,
  },
  aiSubText: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 22,
  },
  toolsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.xs,
  },
  toolBadge: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: Radius.sm,
  },
  toolBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  tracksSection: {
    marginBottom: Space.xl,
  },
  trackCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: Radius.lg,
    padding: Space.lg,
    marginBottom: Space.md,
  },
  trackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.xs,
  },
  trackName: {
    fontSize: 16,
    color: ThemeText.primary,
  },
  demandBadge: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: Radius.sm,
  },
  demandText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  trackDescription: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 22,
    marginBottom: Space.xs,
  },
  trackPremium: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600" as const,
  },
  futureSection: {
    marginBottom: Space.xl,
  },
  oppCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: Radius.lg,
    padding: Space.lg,
    marginBottom: Space.md,
  },
  oppRole: {
    fontSize: 16,
    color: ThemeText.primary,
    marginBottom: Space.xs,
  },
  oppDescription: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 22,
    marginBottom: Space.xs,
  },
  oppMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  oppMetaText: {
    fontSize: 13,
    color: ThemeText.tertiary,
  },
  escapeRouteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(59,130,246,0.08)",
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  escapeRouteCardPressed: {
    opacity: 0.7,
  },
  escapeRouteTitle: {
    fontSize: 16,
    color: "#3B82F6",
  },
  escapeRouteArrow: {
    fontSize: 18,
    color: "#3B82F6",
  },
});
