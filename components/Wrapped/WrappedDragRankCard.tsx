import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "../AppText";
import { Space } from "../../lib/theme";
import type { WrappedPrompt } from "../../lib/wrapped/prompts";

const WHITE = "#FFFFFF";
const CYAN = "#91C4E3";
const PURPLE = "#9D81AC";
const RED = "#FF8A8A";

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
  const items = prompt?.items ?? [];
  const pickCount = prompt?.pickCount ?? 3;
  const questionEn = prompt?.question?.en ?? "";
  const questionTh = prompt?.question?.th ?? "";
  const canContinue = rankedIndices.length === pickCount;

  const handleReorder = (newOrder: number[]) => {
    onReorder(newOrder);
  };

  const handleSelect = (itemIndex: number) => {
    if (rankedIndices.includes(itemIndex) || rankedIndices.length >= pickCount) {
      return;
    }
    handleReorder([...rankedIndices, itemIndex]);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemove = (itemIndex: number) => {
    handleReorder(rankedIndices.filter((index) => index !== itemIndex));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMove = (position: number, direction: -1 | 1) => {
    const nextPosition = position + direction;
    if (nextPosition < 0 || nextPosition >= rankedIndices.length) return;
    const newOrder = [...rankedIndices];
    [newOrder[position], newOrder[nextPosition]] = [
      newOrder[nextPosition],
      newOrder[position],
    ];
    handleReorder(newOrder);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNextPress = () => {
    if (!canContinue) return;
    onNext();
  };

  const selectedLabels = rankedIndices.map((itemIndex) => items[itemIndex]).filter(Boolean);

  return (
    <View style={styles.card}>
      <View>
        <AppText style={styles.stepIndicator}>Question 4 of 6</AppText>
      </View>

      <View>
        <AppText variant="bold" style={styles.question}>
          {questionEn}
        </AppText>
      </View>

      <View>
        <AppText style={styles.questionTh}>{questionTh}</AppText>
      </View>

      <AppText style={styles.helperText}>
        Tap a moment to add it. Your order is controlled in the top 3 box.
      </AppText>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBox}>
          <View style={styles.topBoxHeader}>
            <AppText variant="bold" style={styles.sectionLabel}>
              Top {pickCount}
            </AppText>
            <AppText style={styles.topBoxCount}>
              {rankedIndices.length}/{pickCount}
            </AppText>
          </View>

          <View style={styles.topSlots}>
            {Array.from({ length: pickCount }).map((_, position) => {
              const itemIndex = rankedIndices[position];
              const item = itemIndex === undefined ? undefined : items[itemIndex];

              return (
                <TopSlot
                  key={position}
                  item={item}
                  position={position}
                  canMoveUp={position > 0}
                  canMoveDown={position < selectedLabels.length - 1}
                  onMoveUp={() => handleMove(position, -1)}
                  onMoveDown={() => handleMove(position, 1)}
                  onRemove={() => itemIndex !== undefined && handleRemove(itemIndex)}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="bold" style={styles.sectionLabel}>
            Pick from the same list
          </AppText>

          {items.map((item, itemIndex) => {
            const selectedPosition = rankedIndices.indexOf(itemIndex);
            const selected = selectedPosition >= 0;
            const disabled = !selected && rankedIndices.length >= pickCount;

            return (
              <Pressable
                key={itemIndex}
                style={[
                  styles.choiceItem,
                  selected && styles.choiceItemSelected,
                  disabled && styles.choiceItemDisabled,
                ]}
                onPress={() =>
                  selected ? handleRemove(itemIndex) : handleSelect(itemIndex)
                }
                disabled={disabled}
              >
                <View style={[styles.choiceBadge, selected && styles.choiceBadgeSelected]}>
                  <AppText
                    variant="bold"
                    style={[
                      styles.choiceBadgeText,
                      selected && styles.choiceBadgeTextSelected,
                    ]}
                  >
                    {selected ? selectedPosition + 1 : "+"}
                  </AppText>
                </View>

                <View style={styles.rankTextContainer}>
                  <AppText variant="bold" style={styles.rankText}>
                    {item.en}
                  </AppText>
                  <AppText style={styles.rankTextTh}>{item.th}</AppText>
                </View>

                <AppText style={styles.choiceAction}>
                  {selected ? "Tap to remove" : disabled ? "Full" : "Add"}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppText style={styles.selectionCount}>
          {rankedIndices.length}/{pickCount} selected
        </AppText>
        <Pressable
          style={[styles.ctaButton, !canContinue && styles.ctaButtonDisabled]}
          onPress={handleNextPress}
          disabled={!canContinue}
        >
          <AppText variant="bold" style={styles.ctaText}>
            Next →
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function TopSlot({
  position,
  item,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  position: number;
  item?: { en: string; th: string };
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const rankColors = [CYAN, "rgba(145,196,227,0.6)", "rgba(145,196,227,0.3)"];
  const rankColor = rankColors[position] ?? "rgba(145,196,227,0.2)";

  if (!item) {
    return (
      <View style={styles.topSlotEmpty}>
        <View style={styles.topSlotBadgeEmpty}>
          <AppText variant="bold" style={styles.emptyRankNumber}>
            {position + 1}
          </AppText>
        </View>
        <AppText style={styles.emptyRankText}>Pick moment #{position + 1}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.topSlot}>
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

      <View style={styles.rankActions}>
        <Pressable
          style={[styles.iconButton, !canMoveUp && styles.iconButtonDisabled]}
          onPress={onMoveUp}
          disabled={!canMoveUp}
        >
          <AppText variant="bold" style={styles.iconButtonText}>↑</AppText>
        </Pressable>
        <Pressable
          style={[styles.iconButton, !canMoveDown && styles.iconButtonDisabled]}
          onPress={onMoveDown}
          disabled={!canMoveDown}
        >
          <AppText variant="bold" style={styles.iconButtonText}>↓</AppText>
        </Pressable>
        <Pressable style={[styles.iconButton, styles.removeButton]} onPress={onRemove}>
          <AppText
            variant="bold"
            style={[styles.iconButtonText, styles.removeButtonText]}
          >
            ×
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Space.md,
    alignItems: "center",
    width: "100%",
    flex: 1,
    justifyContent: "center",
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
  helperText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "BaiJamjuree_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: Space.md,
  },
  scrollArea: {
    width: "100%",
    flex: 1,
    marginTop: Space.md,
  },
  scrollContent: {
    gap: Space.md,
    paddingBottom: Space.sm,
  },
  section: {
    gap: Space.sm,
    width: "100%",
  },
  sectionLabel: {
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  topBox: {
    width: "100%",
    borderRadius: 22,
    backgroundColor: "rgba(145,196,227,0.08)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.28)",
    padding: Space.md,
    gap: Space.sm,
  },
  topBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBoxCount: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 12,
  },
  topSlots: {
    gap: Space.sm,
  },
  topSlot: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,37,48,0.8)",
    borderRadius: 16,
    padding: Space.md,
    gap: Space.md,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.2)",
    minHeight: 78,
  },
  topSlotEmpty: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(145,196,227,0.22)",
    padding: Space.md,
    gap: Space.md,
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
  topSlotBadgeEmpty: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(145,196,227,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyRankNumber: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 14,
  },
  emptyRankText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "BaiJamjuree_400Regular",
    fontSize: 13,
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
    color: "rgba(255,255,255,0.65)",
    fontFamily: "BaiJamjuree_400Regular",
  },
  rankActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  iconButtonDisabled: {
    opacity: 0.28,
  },
  iconButtonText: {
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: "rgba(255,138,138,0.12)",
  },
  removeButtonText: {
    color: RED,
  },
  choiceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,16,24,0.72)",
    borderRadius: 16,
    padding: Space.md,
    gap: Space.md,
    borderWidth: 1,
    borderColor: "rgba(90,122,148,0.2)",
    minHeight: 76,
  },
  choiceItemSelected: {
    backgroundColor: "rgba(145,196,227,0.12)",
    borderColor: "rgba(145,196,227,0.5)",
  },
  choiceItemDisabled: {
    opacity: 0.42,
  },
  choiceBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  choiceBadgeSelected: {
    backgroundColor: CYAN,
  },
  choiceBadgeText: {
    color: CYAN,
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 16,
  },
  choiceBadgeTextSelected: {
    color: "#03050a",
  },
  choiceAction: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "BaiJamjuree_700Bold",
    fontSize: 11,
    textAlign: "right",
    width: 70,
  },
  footer: {
    alignItems: "center",
    gap: Space.sm,
    width: "100%",
  },
  selectionCount: {
    color: "rgba(255,255,255,0.52)",
    fontFamily: "BaiJamjuree_400Regular",
    fontSize: 12,
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
  ctaButtonDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
});
