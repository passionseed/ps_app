// app/plans/index.tsx
// Admission Plans List Screen

import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { useState, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { getPlans, getPlanCount, MAX_PLANS_PER_USER } from "../../lib/admissionPlans";
import type { AdmissionPlan } from "../../lib/admissionPlans";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  Space,
  Type,
  Gradient,
} from "../../lib/theme";

export default function PlansListScreen() {
  const [plans, setPlans] = useState<AdmissionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const { appLanguage } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      console.error("Failed to load plans:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans])
  );

  const canCreatePlan = plans.length < MAX_PLANS_PER_USER;

  const copy = isThai
    ? {
        title: "แผนสมัคร",
        create: "สร้างแผนใหม่",
        maxPlans: `สูงสุด ${MAX_PLANS_PER_USER} แผน`,
        empty: "ยังไม่มีแผนสมัคร",
        emptySubtext: "สร้างแผนสมัครเพื่อวางแผนการสมัคร TCAS",
        programs: "สาขา",
        rounds: "รอบ",
      }
    : {
        title: "Admission Plans",
        create: "Create Plan",
        maxPlans: `Max ${MAX_PLANS_PER_USER} plans`,
        empty: "No admission plans yet",
        emptySubtext: "Create a plan to organize your TCAS applications",
        programs: "programs",
        rounds: "rounds",
      };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <Text style={styles.headerCount}>
          {plans.length}/{MAX_PLANS_PER_USER} {isThai ? "แผน" : "plans"}
        </Text>
      </View>

      {plans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{copy.empty}</Text>
          <Text style={styles.emptySubtext}>{copy.emptySubtext}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.createButtonPressed,
            ]}
            onPress={() => router.push("/plans/create")}
          >
            <LinearGradient
              colors={Gradient.primaryCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>{copy.create}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={plans}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PlanCard
                plan={item}
                isThai={isThai}
                programsLabel={copy.programs}
                roundsLabel={copy.rounds}
                onPress={() => router.push(`/plans/${item.id}`)}
              />
            )}
          />

          {/* Create button at bottom */}
          {canCreatePlan && (
            <View style={styles.bottomButton}>
              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.createButtonPressed,
                ]}
                onPress={() => router.push("/plans/create")}
              >
                <LinearGradient
                  colors={Gradient.primaryCta}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonGradient}
                >
                  <Text style={styles.createButtonText}>{copy.create}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function PlanCard({
  plan,
  isThai,
  programsLabel,
  roundsLabel,
  onPress,
}: {
  plan: AdmissionPlan;
  isThai: boolean;
  programsLabel: string;
  roundsLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{plan.name}</Text>
        <Text style={styles.cardMeta}>
          {plan.rounds?.length ?? 0} {roundsLabel}
        </Text>
      </View>
      <Text style={styles.cardArrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PageBg.default,
  },
  header: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.lg,
    gap: Space.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  headerCount: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Space["2xl"],
    gap: Space.md,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  emptySubtext: {
    fontSize: 14,
    color: ThemeText.tertiary,
    textAlign: "center",
  },
  createButton: {
    borderRadius: Radius.full,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  createButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  createButtonGradient: {
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  list: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: 120,
    gap: Space.md,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    flexDirection: "row",
    alignItems: "center",
    ...Shadow.neutral,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardContent: {
    flex: 1,
    gap: Space.xs,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  cardMeta: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  cardArrow: {
    fontSize: 20,
    color: ThemeText.tertiary,
  },
  bottomButton: {
    position: "absolute",
    bottom: 100,
    left: Space["2xl"],
    right: Space["2xl"],
  },
});
