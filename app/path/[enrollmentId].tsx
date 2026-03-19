import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  getPathDay,
  getNodesByIds,
  getNodeProgress,
  updateNodeProgress,
} from "../../lib/pathlab";
import type { PathDay, PathEnrollment } from "../../types/pathlab";
import type { MapNode, StudentNodeProgress } from "../../types/map";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  StepThemes,
} from "../../lib/theme";

type EnrollmentWithPath = PathEnrollment & {
  path: {
    id: string;
    total_days: number;
    seed: {
      id: string;
      title: string;
    };
  };
};

export default function DailyPathScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const [enrollment, setEnrollment] = useState<EnrollmentWithPath | null>(null);
  const [pathDay, setPathDay] = useState<PathDay | null>(null);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [progress, setProgress] = useState<Record<string, StudentNodeProgress>>({});
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!enrollmentId) {
      setError("No enrollment ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get enrollment with path info
      const { data: enrollmentData, error: enrollError } = await supabase
        .from("path_enrollments")
        .select(`
          *,
          path:paths(
            id,
            total_days,
            seed:seeds(id, title)
          )
        `)
        .eq("id", enrollmentId)
        .single();

      if (enrollError) {
        console.error("❌ Error loading enrollment:", enrollError);
        setError(`Failed to load enrollment: ${enrollError.message}`);
        return;
      }

      if (!enrollmentData) {
        console.error("❌ No enrollment found for ID:", enrollmentId);
        setError("Enrollment not found");
        return;
      }

      console.log("✅ Enrollment loaded:", {
        id: enrollmentData.id,
        path_id: enrollmentData.path_id,
        current_day: enrollmentData.current_day,
        status: enrollmentData.status,
      });

      setEnrollment(enrollmentData as EnrollmentWithPath);

      // Validate required fields for path day lookup
      if (!enrollmentData.path_id) {
        console.error("❌ Enrollment missing path_id:", enrollmentData);
        setError("Enrollment is missing path information");
        return;
      }

      if (!enrollmentData.current_day || enrollmentData.current_day < 1) {
        console.error("❌ Enrollment has invalid current_day:", enrollmentData.current_day);
        setError("Invalid day number in enrollment");
        return;
      }

      // Get today's path day
      console.log("📅 Fetching path day for:", {
        path_id: enrollmentData.path_id,
        current_day: enrollmentData.current_day,
      });

      const dayData = await getPathDay(
        enrollmentData.path_id,
        enrollmentData.current_day
      );

      console.log("📦 Path day data received:", JSON.stringify(dayData, null, 2));

      if (!dayData) {
        console.error("❌ NO PATH DAY FOUND for path_id:", enrollmentData.path_id, "day:", enrollmentData.current_day);
        setError(`No path day found for day ${enrollmentData.current_day}`);
        setPathDay(null);
        return;
      }

      if (!dayData.node_ids || dayData.node_ids.length === 0) {
        console.error("⚠️ PATH DAY EXISTS but node_ids is empty or null:", dayData);
      }

      setPathDay(dayData);

      if (dayData.node_ids && dayData.node_ids.length > 0) {
        console.log("📚 Fetching nodes for IDs:", dayData.node_ids);

        // Get nodes for today
        const nodesData = await getNodesByIds(dayData.node_ids);
        console.log("✅ Nodes received:", nodesData.length, "nodes");
        setNodes(nodesData);

        // Get progress for nodes
        const progressData = await getNodeProgress(dayData.node_ids);
        console.log("✅ Progress data received:", progressData.length, "progress records");
        const progressMap: Record<string, StudentNodeProgress> = {};
        progressData.forEach((p) => {
          progressMap[p.node_id] = p;
        });
        setProgress(progressMap);
      } else {
        console.log("ℹ️ No nodes found for this day. DayData:", dayData);
        setNodes([]);
      }
    } catch (error) {
      console.error("❌ Failed to load path data:", error);
      setError(error instanceof Error ? error.message : "Failed to load path data");
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleNodeComplete = async (nodeId: string) => {
    try {
      const updated = await updateNodeProgress({
        nodeId,
        status: "passed",
      });
      setProgress((prev) => ({
        ...prev,
        [nodeId]: updated,
      }));
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  };

  const allNodesCompleted =
    nodes.length > 0 &&
    nodes.every((node) => progress[node.id]?.status === "passed");

  const handleFinishDay = () => {
    router.push(`/reflection/${enrollmentId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  if (!enrollment || !pathDay) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🎉</Text>
        <Text style={styles.errorTitle}>
          {error ? "Unable to Load Path" : "Path Completed!"}
        </Text>
        <Text style={styles.errorText}>
          {error || "You've finished exploring this path"}
        </Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const completedCount = nodes.filter(
    (n) => progress[n.id]?.status === "passed"
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.dayLabel}>Day {enrollment.current_day}</Text>
          <Text style={styles.seedTitle} numberOfLines={1}>
            {enrollment.path.seed.title}
          </Text>
        </View>
        <Text style={styles.progressText}>
          {completedCount}/{nodes.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(completedCount / Math.max(nodes.length, 1)) * 100}%` },
          ]}
        />
      </View>

      {/* Context */}
      {pathDay.context_text && (
        <View style={styles.contextCard}>
          <Text style={styles.contextText}>{pathDay.context_text}</Text>
        </View>
      )}

      {/* Tasks */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Today's Tasks</Text>

        {nodes.map((node, index) => (
          <TaskCard
            key={node.id}
            node={node}
            index={index + 1}
            completed={progress[node.id]?.status === "passed"}
            onComplete={() => handleNodeComplete(node.id)}
            enrollmentId={enrollmentId!}
          />
        ))}

        {nodes.length === 0 && (
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyText}>No tasks for today</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Finish Day Button */}
      {allNodesCompleted && (
        <View style={styles.ctaContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleFinishDay}
          >
            <Text style={styles.ctaText}>Complete Day & Reflect</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function TaskCard({
  node,
  index,
  completed,
  onComplete,
  enrollmentId,
}: {
  node: MapNode;
  index: number;
  completed: boolean;
  onComplete: () => void;
  enrollmentId: string;
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return "🎬";
      case "quiz":
        return "❓";
      case "text":
        return "📖";
      case "file_upload":
        return "📎";
      case "project":
        return "🛠️";
      default:
        return "📝";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video":
        return "Watch Video";
      case "quiz":
        return "Take Quiz";
      case "text":
        return "Read Content";
      case "file_upload":
        return "Upload File";
      case "project":
        return "Complete Project";
      default:
        return "Complete Task";
    }
  };

  const handlePress = () => {
    if (completed) return;
    router.push(`/node/${node.id}?enrollmentId=${enrollmentId}`);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskCard,
        completed && styles.taskCardCompleted,
        pressed && styles.taskCardPressed,
      ]}
      onPress={handlePress}
      disabled={completed}
    >
      <View style={styles.taskIndex}>
        {completed ? (
          <Text style={styles.taskCheckmark}>✓</Text>
        ) : (
          <Text style={styles.taskNumber}>{index}</Text>
        )}
      </View>

      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskIcon}>{getTypeIcon(node.node_type)}</Text>
          <Text style={styles.taskType}>{getTypeLabel(node.node_type)}</Text>
        </View>
        <Text style={[styles.taskTitle, completed && styles.taskTitleCompleted]}>
          {node.title}
        </Text>
        {node.content?.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {node.content.description}
          </Text>
        )}
      </View>
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
    backgroundColor: PageBg.default,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: PageBg.default,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.tertiary,
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Accent.yellow,
    borderRadius: Radius.md,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.tertiary,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: Accent.yellow,
    backgroundColor: ThemeText.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: "hidden",
  },
  seedTitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: ThemeText.tertiary,
    marginTop: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#eee",
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Accent.yellow,
    borderRadius: 2,
  },
  contextCard: {
    margin: 20,
    padding: 16,
    backgroundColor: StepThemes.job.accentLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: StepThemes.job.border,
    ...Shadow.neutral,
  },
  contextText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    color: "#333",
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Border.default,
    ...Shadow.neutral,
  },
  taskCardCompleted: {
    backgroundColor: "#f8f8f8",
    borderColor: "#ddd",
  },
  taskCardPressed: {
    opacity: 0.9,
  },
  taskIndex: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Accent.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  taskNumber: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
  taskCheckmark: {
    fontSize: 16,
    color: ThemeText.primary,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  taskIcon: {
    fontSize: 14,
  },
  taskType: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: ThemeText.muted,
    textTransform: "uppercase",
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: ThemeText.primary,
    marginBottom: 4,
  },
  taskTitleCompleted: {
    color: ThemeText.muted,
    textDecorationLine: "line-through",
  },
  taskDescription: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: ThemeText.secondary,
    lineHeight: 18,
  },
  emptyTasks: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: ThemeText.muted,
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: PageBg.default,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  ctaButton: {
    backgroundColor: Accent.yellow,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: "center",
    ...Shadow.card,
  },
  ctaButtonPressed: {
    backgroundColor: Accent.yellowDark,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: ThemeText.primary,
  },
});
