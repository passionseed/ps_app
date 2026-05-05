import React, { useRef } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { AppText as Text } from "../AppText";
import { CanvasNode } from "./CanvasNode";
import { ConnectionLine } from "./ConnectionLine";
import type { PathStep } from "../../types/journey";
import {
  Text as ThemeText,
  Shadow,
  Radius,
  Space,
  Gradient,
} from "../../lib/theme";

interface CanvasTimelineProps {
  steps: PathStep[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddMilestone: () => void;
  onDragNearEdge?: (edge: "top" | "bottom") => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AddButton({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.addWrapper}>
      <View style={styles.addLine} />
      <AnimatedPressable style={[styles.addBtnOuter, animatedStyle]} onPress={onPress}>
        <LinearGradient
          colors={Gradient.primaryCta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Add milestone</Text>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

export function CanvasTimeline({
  steps,
  onReorder,
  onAddMilestone,
  onDragNearEdge,
}: CanvasTimelineProps) {
  const scrollRef = useRef<ScrollView>(null);

  if (steps.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎯</Text>
        <Text style={styles.emptyTitle}>Build your career path</Text>
        <Text style={styles.emptySub}>
          Add your first milestone — university, internship, or dream job
        </Text>
        <Pressable style={styles.emptyBtn} onPress={onAddMilestone}>
          <LinearGradient
            colors={Gradient.primaryCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyBtnGradient}
          >
            <Text style={styles.emptyBtnText}>Start building</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {steps.map((step, i) => {
        const nextStep = steps[i + 1];
        const stepHasChildren = false; // TODO: derive from data when branching is wired

        return (
          <View key={step.id || i}>
            <CanvasNode
              step={step}
              index={i}
              totalSteps={steps.length}
              hasChildren={stepHasChildren}
              onReorder={onReorder}
              onDragNearEdge={onDragNearEdge}
            />
            {nextStep && (
              <ConnectionLine
                fromType={step.type}
                toType={nextStep.type}
                hasChildren={stepHasChildren}
                height={32}
              />
            )}
          </View>
        );
      })}
      <AddButton onPress={onAddMilestone} />
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space["2xl"],
    paddingTop: Space.lg,
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
    fontSize: 22,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  emptySub: {
    fontSize: 14,
    color: ThemeText.tertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    borderRadius: Radius.full,
    overflow: "hidden",
    marginTop: Space.md,
    ...Shadow.neutral,
  },
  emptyBtnGradient: {
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.lg,
    alignItems: "center",
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  addWrapper: {
    alignItems: "center",
    marginTop: Space.xs,
  },
  addLine: {
    width: 2,
    height: 20,
    backgroundColor: "#E5E7EB",
    borderRadius: 1,
  },
  addBtnOuter: {
    borderRadius: Radius.full,
    overflow: "hidden",
    ...Shadow.neutral,
  },
  addBtn: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    alignItems: "center",
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
});
