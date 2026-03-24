import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Animated,
} from "react-native";
import { callOnboardingChat, saveInterests } from "../../lib/onboarding";
import { logInterestSelected } from "../../lib/eventLogger";
import type { ChatMessage, InterestCategory } from "../../types/onboarding";

type Props = {
  userId: string;
  userName: string;
  educationLevel: string;
  chatHistory: ChatMessage[];
  onComplete: (categories: InterestCategory[]) => void;
  onGoBack?: () => void;
};

type FlatCard = {
  catIndex: number;
  catName: string;
  statement: string;
  stmtIndex: number;
};

export default function StepInterests({
  userId, userName, educationLevel, chatHistory, onComplete, onGoBack,
}: Props) {
  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const load = () => {
    setLoading(true);
    setError(false);
    callOnboardingChat({
      mode: "generate_interests",
      chat_history: chatHistory,
      user_context: { name: userName, education_level: educationLevel },
    })
      .then((res) => {
        if (res.action_data?.categories) {
          setCategories(
            res.action_data.categories.map((c) => ({
              category_name: c.name,
              statements: c.statements,
              selected: [],
            })),
          );
        }
        setCurrentIndex(0);
        setDone(false);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  };

  useEffect(() => {
    load();
  }, []);


  // Flatten all statements into a single ordered array
  const cards: FlatCard[] = categories.flatMap((cat, catIndex) =>
    cat.statements.map((statement, stmtIndex) => ({
      catIndex,
      catName: cat.category_name,
      statement,
      stmtIndex,
    })),
  ).slice(0, 10);

  const total = cards.length;

  const animateOut = useCallback(
    (direction: "left" | "right", callback: () => void) => {
      Animated.timing(slideAnim, {
        toValue: direction === "right" ? 300 : -300,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(0);
        callback();
      });
    },
    [slideAnim],
  );

  const handleSelect = (statement: string, catIndex: number) => {
    setCategories((prev) =>
      prev.map((cat, i) => {
        if (i !== catIndex) return cat;
        const alreadySelected = cat.selected.includes(statement);
        if (alreadySelected) {
          return { ...cat, selected: cat.selected.filter((s) => s !== statement) };
        }
        // Auto-deselect oldest if already 2 selected
        if (cat.selected.length >= 2) {
          return { ...cat, selected: [...cat.selected.slice(1), statement] };
        }
        return { ...cat, selected: [...cat.selected, statement] };
      }),
    );
  };

  const advance = () => {
    if (currentIndex >= total - 1) {
      setDone(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const onThisIsMe = () => {
    const card = cards[currentIndex];
    handleSelect(card.statement, card.catIndex);
    // Log interest selected
    logInterestSelected(card.catName, card.statement).catch(() => {});
    animateOut("right", advance);
  };

  const onSkip = () => {
    animateOut("left", advance);
  };

  const handleContinue = async () => {
    setSaving(true);
    await saveInterests(userId, categories);
    onComplete(categories);
    setSaving(false);
  };

  const handleGoAgain = () => {
    setCurrentIndex(0);
    setDone(false);
    // Reset selections
    setCategories((prev) => prev.map((cat) => ({ ...cat, selected: [] })));
  };

  const totalSelected = categories.reduce((sum, c) => sum + c.selected.length, 0);

  // ---------- Loading ----------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#BFFF00" size="large" />
        <Text style={styles.loadingText}>Analyzing your interests...</Text>
      </View>
    );
  }

  // ---------- Empty ----------
  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No interest cards generated. Try again.</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Couldn't connect. Check your internet and try again.
        </Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- Summary ----------
  if (done) {
    const grouped = categories.filter((c) => c.selected.length > 0);
    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Your selections</Text>

        {totalSelected === 0 ? (
          <Text style={styles.emptyText}>
            No worries! You can always come back to this later
          </Text>
        ) : (
          grouped.map((cat, i) => (
            <View key={i} style={styles.summaryGroup}>
              <Text style={styles.summaryCategory}>{cat.category_name}</Text>
              {cat.selected.map((s, si) => (
                <Text key={si} style={styles.summaryStatement}>
                  ✓ {s}
                </Text>
              ))}
            </View>
          ))
        )}

        <Pressable
          style={[styles.accentBtn, saving && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={saving}
        >
          <Text style={styles.accentBtnText}>
            {saving ? "Saving..." : "Continue →"}
          </Text>
        </Pressable>

        <Pressable style={styles.ghostBtn} onPress={handleGoAgain}>
          <Text style={styles.ghostBtnText}>Go again</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- Card View ----------
  const card = cards[currentIndex];

  if (!card) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>What resonates with you?</Text>

      {/* Category badge */}
      <Text style={styles.categoryBadge}>{card.catName}</Text>

      {/* Progress */}
      <Text style={styles.progressText}>
        {currentIndex + 1} / {total}
      </Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / total) * 100}%` },
          ]}
        />
      </View>

      {/* Card */}
      <View style={styles.cardWrapper}>
        <Animated.View
          style={[styles.card, { transform: [{ translateX: slideAnim }] }]}
        >
          <Text style={styles.cardText}>{card.statement}</Text>
        </Animated.View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </Pressable>
        <Pressable style={styles.selectBtn} onPress={onThisIsMe}>
          <Text style={styles.selectBtnText}>This is me ✓</Text>
        </Pressable>
      </View>

      {/* Talk more link */}
      {onGoBack && (
        <Pressable onPress={onGoBack} style={styles.talkMoreBtn}>
          <Text style={styles.talkMoreText}>💬 Talk more first</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
    fontSize: 15,
  },
  errorText: {
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  retryBtnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 15,
    color: "#0a0514",
  },

  // Card view
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 14,
    color: "#BFFF00",
    textAlign: "center",
    marginBottom: 12,
  },
  progressText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    marginBottom: 32,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: "#BFFF00",
    borderRadius: 2,
  },

  cardWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 18,
    color: "#111827",
    lineHeight: 28,
    textAlign: "center",
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 24,
  },
  skipBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  skipBtnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 16,
    color: "#6B7280",
  },
  selectBtn: {
    flex: 1,
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
  },
  selectBtnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 16,
    color: "#0a0514",
  },

  talkMoreBtn: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  talkMoreText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 14,
    color: "#9CA3AF",
  },

  // Summary
  summaryContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  summaryTitle: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 22,
    color: "#111827",
    marginBottom: 24,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 32,
    lineHeight: 24,
  },
  summaryGroup: {
    marginBottom: 20,
  },
  summaryCategory: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 15,
    color: "#BFFF00",
    marginBottom: 8,
  },
  summaryStatement: {
    fontFamily: "Orbit_400Regular",
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 4,
    paddingLeft: 8,
  },
  accentBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  accentBtnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 17,
    color: "#0a0514",
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  ghostBtnText: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    fontSize: 15,
    color: "#6B7280",
  },
});
