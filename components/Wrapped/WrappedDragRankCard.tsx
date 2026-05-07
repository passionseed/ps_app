import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { WrappedPrompt } from "../../lib/wrapped/prompts";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";

interface WrappedDragRankCardProps {
  prompt: WrappedPrompt;
  rankedIndices: number[];
  onReorder: (indices: number[]) => void;
  onNext: () => void;
}

export function WrappedDragRankCard({
  prompt,
  rankedIndices,
  onReorder,
  onNext,
}: WrappedDragRankCardProps) {
  const items = prompt.items ?? [];
  const pickCount = prompt.pickCount ?? 3;

  // Initialize with first pickCount items if empty
  const [localOrder, setLocalOrder] = useState<number[]>(
    rankedIndices.length > 0
      ? rankedIndices
      : items.slice(0, pickCount).map((_, i) => i)
  );

  React.useEffect(() => {
    if (rankedIndices.length > 0) {
      setLocalOrder(rankedIndices);
    }
  }, [rankedIndices]);

  const handleReorder = (newOrder: number[]) => {
    setLocalOrder(newOrder);
    onReorder(newOrder);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...localOrder];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    handleReorder(newOrder);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const moveDown = (index: number) => {
    if (index >= localOrder.length - 1) return;
    const newOrder = [...localOrder];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];
    handleReorder(newOrder);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.card}>
      <Animated.View entering={FadeInUp.duration(500).delay(100)}>
        <AppText style={styles.stepIndicator}>Question 4 of 5</AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(200)}>
        <AppText variant="bold" style={styles.question}>
          {prompt.question.en}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(300)}>
        <AppText style={styles.questionTh}>{prompt.question.th}</AppText>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(500).delay(400)}
        style={styles.listContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listScroll}
        >
          {localOrder.map((itemIndex, position) => (
            <RankItem
              key={itemIndex}
              position={position}
              item={items[itemIndex]}
              onMoveUp={() => moveUp(position)}
              onMoveDown={() => moveDown(position)}
              canMoveUp={position > 0}
              canMoveDown={position < localOrder.length - 1}
            />
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(600)}>
        <Pressable style={styles.ctaButton} onPress={onNext}>
          <AppText variant="bold" style={styles.ctaText}>
            Next →
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function RankItem({
  position,
  item,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  position: number;
  item: { en: string; th: string };
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const rankColors = [CYAN, "rgba(145,196,227,0.6)", "rgba(145,196,227,0.3)"];
  const rankColor = rankColors[position] ?? "rgba(145,196,227,0.2)";

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(position * 100)}>
      <View style={styles.rankItem}>
        <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
          <AppText variant="bold" style={styles.rankNumber}>
            {position + 1}
          </AppText>
        </View>

        <View style={styles.rankTextContainer}>
          <AppText variant="bold" style={styles.rankText}>
            {item.en}
          </AppText>
          <AppText style={styles.rankTextTh}>{item.th}</AppText>
        </View>

        <View style={styles.rankControls}>
          <Pressable
            onPress={onMoveUp}
            disabled={!canMoveUp}
            style={[styles.rankButton, !canMoveUp && styles.rankButtonDisabled]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText style={styles.rankButtonText}>▲</AppText>
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={!canMoveDown}
            style={[styles.rankButton, !canMoveDown && styles.rankButtonDisabled]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText style={styles.rankButtonText}>▼</AppText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Space.lg,
    alignItems: "center",
    width: "100%",
    flex: 1,
  },
  stepIndicator: {
    fontSize: 12,
    color: CYAN,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "BaiJamjuree_700Bold",
    textAlign: "center",
  },
  question: {
    fontSize: 22,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 30,
  },
  questionTh: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    fontFamily: "BaiJamjuree_400Regular",
    lineHeight: 24,
  },
  listContainer: {
    width: "100%",
    flex: 1,
    marginTop: Space.md,
  },
  listScroll: {
    gap: Space.sm,
    paddingVertical: Space.sm,
  },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,37,48,0.8)",
    borderRadius: 16,
    padding: Space.md,
    gap: Space.md,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.2)",
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 14,
    color: "#03050a",
    fontFamily: "BaiJamjuree_700Bold",
  },
  rankTextContainer: {
    flex: 1,
    gap: 2,
  },
  rankText: {
    fontSize: 14,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 20,
  },
  rankTextTh: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "BaiJamjuree_400Regular",
  },
  rankControls: {
    flexDirection: "column",
    gap: 4,
  },
  rankButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(145,196,227,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  rankButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
    opacity: 0.3,
  },
  rankButtonText: {
    fontSize: 12,
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
  },
  ctaButton: {
    backgroundColor: PURPLE,
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: Space.lg,
    shadowColor: PURPLE,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 8,
    minWidth: 160,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
