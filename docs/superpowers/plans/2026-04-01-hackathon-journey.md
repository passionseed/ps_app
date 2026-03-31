# Hackathon Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hackathon home phases/timeline and module pain-point workspace with a swipeable module carousel backed by PathLab activity nodes, plus a new activity player screen.

**Architecture:** Extend `lib/hackathonProgram.ts` with three new data functions that fetch nodes via a module's `path_id` → `path_days` → `map_nodes`. The home carousel and module detail screens are rewritten in-place; a new `activity/[nodeId].tsx` screen is added inside `app/(hackathon)/`. A shared `JourneyNodeGraph` SVG component is extracted for reuse across both screens.

**Tech Stack:** React Native, Expo Router, Supabase JS, react-native-svg (already installed), TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `types/hackathon-program.ts` | Add `HackathonJourneyModuleProgress` type |
| Modify | `lib/hackathonProgram.ts` | Add `getHackathonJourneyModules`, `getModuleActivityProgress`, `completeActivityNode` |
| Create | `components/Hackathon/JourneyNodeGraph.tsx` | Reusable SVG node graph component |
| Modify | `app/(hackathon)/home.tsx` | Replace timeline with module carousel |
| Modify | `app/(hackathon)/module/[moduleId].tsx` | Replace pain-point workspace with node graph + activity list |
| Create | `app/(hackathon)/activity/[nodeId].tsx` | New activity player screen |

---

## Task 1: Add type and data functions

**Files:**
- Modify: `types/hackathon-program.ts`
- Modify: `lib/hackathonProgram.ts`

- [ ] **Step 1: Add `HackathonJourneyModuleProgress` type**

Open `types/hackathon-program.ts` and add at the bottom (after the `HackathonModuleProgress` interface):

```ts
import type { MapNode } from "./map";

export interface HackathonJourneyModuleProgress {
  moduleId: string;
  totalNodes: number;
  completedNodes: number;
  currentNodeId: string | null;
  nodes: MapNode[];
  completedNodeIds: Set<string>;
}
```

> Note: The `import type { MapNode }` line should be added at the top of the file with the existing imports from `./pathlab-content`.

- [ ] **Step 2: Add `getHackathonJourneyModules` to `lib/hackathonProgram.ts`**

Add this function after `getEmptyHackathonProgramHome`:

```ts
export async function getHackathonJourneyModules(
  phaseId: string,
): Promise<Array<HackathonPhaseModule & { ends_at: string | null }>> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();

    const { data: phase, error: phaseError } = await supabase
      .from("hackathon_program_phases")
      .select("ends_at")
      .eq("id", phaseId)
      .maybeSingle();
    if (phaseError) throw phaseError;

    const { data: playlists, error: playlistError } = await supabase
      .from("hackathon_phase_playlists")
      .select("id")
      .eq("phase_id", phaseId)
      .order("display_order", { ascending: true });
    if (playlistError) throw playlistError;

    const playlistIds = (playlists ?? []).map((p) => p.id);
    if (playlistIds.length === 0) return [];

    const { data: modules, error: modulesError } = await supabase
      .from("hackathon_phase_modules")
      .select("*")
      .in("playlist_id", playlistIds)
      .order("display_order", { ascending: true });
    if (modulesError) throw modulesError;

    const endsAt = (phase as { ends_at: string | null } | null)?.ends_at ?? null;
    return ((modules as HackathonPhaseModule[]) ?? []).map((m) => ({
      ...m,
      ends_at: endsAt,
    }));
  }, "Unable to load journey modules");
}
```

- [ ] **Step 3: Add `getModuleActivityProgress` to `lib/hackathonProgram.ts`**

Add this function after `getHackathonJourneyModules`. It needs these imports at the top of the file (add if not present):

```ts
import type { MapNode, StudentNodeProgress } from "../types/map";
```

Function body:

```ts
export async function getModuleActivityProgress(
  moduleId: string,
  userId: string,
): Promise<{
  nodes: MapNode[];
  completedNodeIds: Set<string>;
  currentNodeId: string | null;
}> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();

    // Get path_id for this module
    const { data: module, error: moduleError } = await supabase
      .from("hackathon_phase_modules")
      .select("path_id")
      .eq("id", moduleId)
      .maybeSingle();
    if (moduleError) throw moduleError;

    const pathId = (module as { path_id: string | null } | null)?.path_id;
    if (!pathId) {
      return { nodes: [], completedNodeIds: new Set<string>(), currentNodeId: null };
    }

    // Get all path_days for this path to collect node_ids
    const { data: pathDays, error: daysError } = await supabase
      .from("path_days")
      .select("node_ids")
      .eq("path_id", pathId)
      .order("day_number", { ascending: true });
    if (daysError) throw daysError;

    const nodeIds: string[] = (pathDays ?? []).flatMap(
      (day: { node_ids: string[] }) => day.node_ids ?? [],
    );
    if (nodeIds.length === 0) {
      return { nodes: [], completedNodeIds: new Set<string>(), currentNodeId: null };
    }

    // Fetch nodes and progress in parallel
    const [{ data: nodesData, error: nodesError }, { data: progressData, error: progressError }] =
      await Promise.all([
        supabase
          .from("map_nodes")
          .select("*, node_content(*), node_assessments(id, assessment_type, quiz_questions(*))")
          .in("id", nodeIds),
        supabase
          .from("student_node_progress")
          .select("*")
          .eq("user_id", userId)
          .in("node_id", nodeIds),
      ]);
    if (nodesError) throw nodesError;
    if (progressError) throw progressError;

    // Preserve ordering from path_days node_ids
    const nodeMap = new Map<string, MapNode>(
      ((nodesData as MapNode[]) ?? []).map((n) => [n.id, n]),
    );
    const orderedNodes = nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is MapNode => n !== undefined);

    const completedNodeIds = new Set<string>(
      ((progressData as StudentNodeProgress[]) ?? [])
        .filter((p) => p.status === "passed" || p.status === "submitted")
        .map((p) => p.node_id),
    );

    const currentNodeId =
      orderedNodes.find((n) => !completedNodeIds.has(n.id))?.id ?? null;

    return { nodes: orderedNodes, completedNodeIds, currentNodeId };
  }, "Unable to load module activities");
}
```

- [ ] **Step 4: Add `completeActivityNode` to `lib/hackathonProgram.ts`**

Add after `getModuleActivityProgress`:

```ts
export async function completeActivityNode(
  nodeId: string,
  userId: string,
): Promise<void> {
  return withRetry(async () => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("student_node_progress")
      .upsert(
        {
          user_id: userId,
          node_id: nodeId,
          status: "passed",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,node_id" },
      );
    if (error) throw error;
  }, "Unable to save progress");
}
```

- [ ] **Step 5: Commit**

```bash
git add types/hackathon-program.ts lib/hackathonProgram.ts
git commit -m "feat: add hackathon journey data functions and type"
```

---

## Task 2: JourneyNodeGraph component

**Files:**
- Create: `components/Hackathon/JourneyNodeGraph.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/Hackathon/JourneyNodeGraph.tsx
import Svg, { Circle, Line } from "react-native-svg";
import type { MapNode } from "../../types/map";

const GREEN = "#10B981";
const CYAN = "#00F0FF";
const DIM = "rgba(255,255,255,0.2)";
const AMBER = "#F59E0B";

interface Props {
  nodes: MapNode[];
  completedNodeIds: Set<string>;
  currentNodeId: string | null;
  width: number;
  height: number;
}

export function JourneyNodeGraph({
  nodes,
  completedNodeIds,
  currentNodeId,
  width,
  height,
}: Props) {
  if (nodes.length === 0) return null;

  const PADDING = 20;
  const usableWidth = width - PADDING * 2;
  const centerY = height / 2;
  const amplitude = height * 0.28;

  // Compute node positions along a wave
  const positions = nodes.map((_, i) => {
    const t = nodes.length === 1 ? 0.5 : i / (nodes.length - 1);
    const x = PADDING + t * usableWidth;
    const y = centerY + (i % 2 === 0 ? -amplitude : amplitude);
    return { x, y };
  });

  function nodeColor(node: MapNode): string {
    if (completedNodeIds.has(node.id)) return GREEN;
    if (node.id === currentNodeId) return CYAN;
    // Last node gets amber tint as "destination"
    if (node === nodes[nodes.length - 1]) return AMBER;
    return DIM;
  }

  function isCompleted(node: MapNode) {
    return completedNodeIds.has(node.id);
  }

  function isCurrent(node: MapNode) {
    return node.id === currentNodeId;
  }

  return (
    <Svg width={width} height={height}>
      {/* Lines between nodes */}
      {nodes.slice(0, -1).map((node, i) => {
        const from = positions[i]!;
        const to = positions[i + 1]!;
        const bothDone =
          isCompleted(node) && isCompleted(nodes[i + 1]!);
        const fromDone =
          isCompleted(node) && isCurrent(nodes[i + 1]!);
        const solid = bothDone || fromDone;
        return (
          <Line
            key={`line-${i}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={solid ? GREEN : "rgba(255,255,255,0.15)"}
            strokeWidth={1.5}
            strokeDasharray={solid ? undefined : "4,4"}
            opacity={solid ? 0.7 : 1}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const { x, y } = positions[i]!;
        const color = nodeColor(node);
        const done = isCompleted(node);
        const current = isCurrent(node);

        if (current) {
          return (
            <React.Fragment key={node.id}>
              {/* Glow ring */}
              <Circle cx={x} cy={y} r={12} fill="rgba(0,240,255,0.12)" />
              <Circle cx={x} cy={y} r={9} fill="none" stroke={CYAN} strokeWidth={2} />
              <Circle cx={x} cy={y} r={4} fill={CYAN} />
            </React.Fragment>
          );
        }

        if (done) {
          return (
            <Circle
              key={node.id}
              cx={x}
              cy={y}
              r={8}
              fill={GREEN}
              opacity={0.9}
            />
          );
        }

        // Future / locked
        return (
          <Circle
            key={node.id}
            cx={x}
            cy={y}
            r={7}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.5}
          />
        );
      })}
    </Svg>
  );
}
```

> `React` must be imported — add `import React from "react";` at the top.

Full file with imports:

```tsx
// components/Hackathon/JourneyNodeGraph.tsx
import React from "react";
import Svg, { Circle, Line } from "react-native-svg";
import type { MapNode } from "../../types/map";

const GREEN = "#10B981";
const CYAN = "#00F0FF";
const DIM = "rgba(255,255,255,0.2)";
const AMBER = "#F59E0B";

interface Props {
  nodes: MapNode[];
  completedNodeIds: Set<string>;
  currentNodeId: string | null;
  width: number;
  height: number;
}

export function JourneyNodeGraph({
  nodes,
  completedNodeIds,
  currentNodeId,
  width,
  height,
}: Props) {
  if (nodes.length === 0) return null;

  const PADDING = 20;
  const usableWidth = width - PADDING * 2;
  const centerY = height / 2;
  const amplitude = height * 0.28;

  const positions = nodes.map((_, i) => {
    const t = nodes.length === 1 ? 0.5 : i / (nodes.length - 1);
    const x = PADDING + t * usableWidth;
    const y = centerY + (i % 2 === 0 ? -amplitude : amplitude);
    return { x, y };
  });

  function nodeColor(node: MapNode): string {
    if (completedNodeIds.has(node.id)) return GREEN;
    if (node.id === currentNodeId) return CYAN;
    if (node === nodes[nodes.length - 1]) return AMBER;
    return DIM;
  }

  function isCompleted(node: MapNode) {
    return completedNodeIds.has(node.id);
  }

  function isCurrent(node: MapNode) {
    return node.id === currentNodeId;
  }

  return (
    <Svg width={width} height={height}>
      {nodes.slice(0, -1).map((node, i) => {
        const from = positions[i]!;
        const to = positions[i + 1]!;
        const bothDone = isCompleted(node) && isCompleted(nodes[i + 1]!);
        const fromDone = isCompleted(node) && isCurrent(nodes[i + 1]!);
        const solid = bothDone || fromDone;
        return (
          <Line
            key={`line-${i}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={solid ? GREEN : "rgba(255,255,255,0.15)"}
            strokeWidth={1.5}
            strokeDasharray={solid ? undefined : "4,4"}
            opacity={solid ? 0.7 : 1}
          />
        );
      })}
      {nodes.map((node, i) => {
        const { x, y } = positions[i]!;
        const color = nodeColor(node);
        const done = isCompleted(node);
        const current = isCurrent(node);
        if (current) {
          return (
            <React.Fragment key={node.id}>
              <Circle cx={x} cy={y} r={12} fill="rgba(0,240,255,0.12)" />
              <Circle cx={x} cy={y} r={9} fill="none" stroke={CYAN} strokeWidth={2} />
              <Circle cx={x} cy={y} r={4} fill={CYAN} />
            </React.Fragment>
          );
        }
        if (done) {
          return <Circle key={node.id} cx={x} cy={y} r={8} fill={GREEN} opacity={0.9} />;
        }
        return (
          <Circle
            key={node.id}
            cx={x}
            cy={y}
            r={7}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.5}
          />
        );
      })}
    </Svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Hackathon/JourneyNodeGraph.tsx
git commit -m "feat: add JourneyNodeGraph SVG component"
```

---

## Task 3: Rewrite home screen with module carousel

**Files:**
- Modify: `app/(hackathon)/home.tsx`

- [ ] **Step 1: Replace `home.tsx` entirely**

```tsx
// app/(hackathon)/home.tsx
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { JourneyNodeGraph } from "../../components/Hackathon/JourneyNodeGraph";
import {
  getCurrentHackathonProgramHome,
  getEmptyHackathonProgramHome,
  getHackathonJourneyModules,
  getModuleActivityProgress,
} from "../../lib/hackathonProgram";
import { getPreviewHackathonProgramHome } from "../../lib/hackathonProgramPreview";
import { Radius, Space } from "../../lib/theme";
import type { HackathonPhaseModule, HackathonJourneyModuleProgress } from "../../types/hackathon-program";
import type { HackathonProgramHome } from "../../types/hackathon-program";
import { supabase } from "../../lib/supabase";

const BG = "#010814";
const CYAN = "#00F0FF";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const AMBER = "#F59E0B";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_PADDING = Space.xl;
const PEEK_WIDTH = 28;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2 - PEEK_WIDTH;

type ModuleWithEnds = HackathonPhaseModule & { ends_at: string | null };

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function ModuleCard({
  module,
  isActive,
  onPress,
}: {
  module: ModuleWithEnds;
  isActive: boolean;
  onPress: () => void;
}) {
  const [progress, setProgress] = useState<HackathonJourneyModuleProgress | null>(null);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const result = await getModuleActivityProgress(module.id, user.id);
        if (!cancelled) {
          setProgress({
            moduleId: module.id,
            totalNodes: result.nodes.length,
            completedNodes: result.completedNodeIds.size,
            currentNodeId: result.currentNodeId,
            nodes: result.nodes,
            completedNodeIds: result.completedNodeIds,
          });
        }
      } catch {
        // leave progress null — card renders without progress
      }
    })();
    return () => { cancelled = true; };
  }, [isActive, module.id]);

  const pct = progress && progress.totalNodes > 0
    ? Math.round((progress.completedNodes / progress.totalNodes) * 100)
    : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText variant="bold" style={styles.cardTitle}>{module.title}</AppText>
          {pct !== null ? (
            <AppText style={styles.cardProgress}>{pct}% complete</AppText>
          ) : (
            <AppText style={[styles.cardProgress, { opacity: 0.3 }]}>Loading...</AppText>
          )}
        </View>
        <AppText style={styles.cardDate}>{formatDate(module.ends_at)}</AppText>
      </View>

      {/* Node graph */}
      <View style={styles.graphContainer}>
        {progress ? (
          <JourneyNodeGraph
            nodes={progress.nodes}
            completedNodeIds={progress.completedNodeIds}
            currentNodeId={progress.currentNodeId}
            width={CARD_WIDTH - Space.lg * 2}
            height={110}
          />
        ) : (
          <View style={{ height: 110 }} />
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: pct !== null ? `${pct}%` : "0%" },
          ]}
        />
      </View>
    </Pressable>
  );
}

export default function HackathonHomeScreen() {
  const [data, setData] = useState<HackathonProgramHome | null>(null);
  const [modules, setModules] = useState<ModuleWithEnds[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const home = await getCurrentHackathonProgramHome();
      const isEmpty =
        JSON.stringify(home) === JSON.stringify(getEmptyHackathonProgramHome());

      if (isEmpty || !home.program || home.phases.length === 0) {
        setData(getPreviewHackathonProgramHome());
        setIsPreview(true);
        setModules([]);
      } else {
        setData(home);
        setIsPreview(false);
        const currentPhase =
          home.phases.find((p) => p.id === home.enrollment?.current_phase_id) ??
          home.phases[0];
        if (currentPhase) {
          const mods = await getHackathonJourneyModules(currentPhase.id);
          setModules(mods);
        }
      }
    } catch {
      setData(getPreviewHackathonProgramHome());
      setIsPreview(true);
      setModules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function scrollTo(index: number) {
    const clamped = Math.max(0, Math.min(index, modules.length - 1));
    setActiveIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * (CARD_WIDTH + Space.md), animated: true });
  }

  if (loading || !data) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={CYAN} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={CYAN}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="bold" style={styles.eyebrow}>
          {data.program?.title ?? "Super Seed Hackathon"}
        </AppText>
        <AppText variant="bold" style={styles.title}>Your Journey</AppText>
      </View>

      {isPreview && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={[styles.statusDot, { backgroundColor: AMBER }]} />
            <AppText variant="bold" style={styles.previewTitle}>Preview Mode</AppText>
          </View>
          <AppText style={styles.previewCopy}>
            Sign in with a valid participant account to see your real progress.
          </AppText>
        </View>
      )}

      {/* Carousel */}
      {modules.length > 0 ? (
        <View style={styles.carouselSection}>
          <View style={styles.carouselRow}>
            {/* Left chevron */}
            <Pressable
              onPress={() => scrollTo(activeIndex - 1)}
              style={styles.chevron}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              disabled={activeIndex === 0}
            >
              <AppText style={[styles.chevronText, activeIndex === 0 && { opacity: 0.2 }]}>‹</AppText>
            </Pressable>

            {/* Scrollable cards */}
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              style={{ flex: 1 }}
              contentContainerStyle={styles.cardsContent}
            >
              {modules.map((mod, i) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  isActive={i === activeIndex}
                  onPress={() => router.push(`/(hackathon)/module/${mod.id}`)}
                />
              ))}
            </ScrollView>

            {/* Right chevron + peek */}
            <View style={styles.rightSide}>
              <Pressable
                onPress={() => scrollTo(activeIndex + 1)}
                style={styles.chevron}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                disabled={activeIndex === modules.length - 1}
              >
                <AppText style={[styles.chevronText, activeIndex === modules.length - 1 && { opacity: 0.2 }]}>›</AppText>
              </Pressable>
              {activeIndex < modules.length - 1 && (
                <View style={styles.peek} />
              )}
            </View>
          </View>

          {/* Dot indicators */}
          <View style={styles.dots}>
            {modules.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyModules}>
          <AppText style={{ color: WHITE40 }}>No modules available yet.</AppText>
        </View>
      )}

      {/* Team card */}
      {data.team && (
        <View style={styles.teamCard}>
          <View style={styles.teamCardHeader}>
            <AppText variant="bold" style={styles.teamLabel}>TEAM</AppText>
            <AppText style={styles.teamId}>
              ID: {data.team.id?.substring(0, 6) ?? "---"}
            </AppText>
          </View>
          <AppText variant="bold" style={styles.teamName}>
            {data.team.name ?? data.team.team_name ?? "Not assigned to a team yet"}
          </AppText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { padding: CARD_PADDING, paddingTop: Space["3xl"], paddingBottom: 120, gap: Space["2xl"] },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  header: { gap: Space.xs },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 32, lineHeight: 38, color: WHITE, letterSpacing: -0.5 },
  previewCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    backgroundColor: "rgba(245,158,11,0.06)",
    padding: Space.lg,
    gap: Space.sm,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  statusDot: { width: 8, height: 8, borderRadius: Radius.full },
  previewTitle: { fontSize: 14, color: AMBER },
  previewCopy: { fontSize: 13, lineHeight: 20, color: WHITE75 },
  // Carousel
  carouselSection: { gap: Space.md },
  carouselRow: { flexDirection: "row", alignItems: "center" },
  chevron: { paddingHorizontal: 4 },
  chevronText: { fontSize: 28, color: CYAN, lineHeight: 34 },
  rightSide: { flexDirection: "row", alignItems: "center" },
  peek: {
    width: PEEK_WIDTH,
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardsContent: { gap: Space.md },
  // Module card
  card: {
    width: CARD_WIDTH,
    backgroundColor: CYAN_BG,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    borderRadius: Radius.lg,
    padding: Space.lg,
    gap: Space.md,
    overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Space.sm },
  cardTitle: { fontSize: 16, color: WHITE },
  cardProgress: { fontSize: 11, color: CYAN, marginTop: 2 },
  cardDate: { fontSize: 11, color: WHITE40 },
  graphContainer: { marginHorizontal: -Space.xs },
  progressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: CYAN, borderRadius: 2 },
  // Dots
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  dotActive: { backgroundColor: CYAN },
  // Empty
  emptyModules: { alignItems: "center", paddingVertical: Space.xl },
  // Team card
  teamCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    padding: Space.lg,
    gap: Space.sm,
  },
  teamCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamLabel: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  teamId: { fontSize: 12, color: WHITE40 },
  teamName: { fontSize: 18, color: WHITE },
});
```

- [ ] **Step 2: Verify the app runs**

```bash
pnpm start
```

Open the hackathon home in simulator. Confirm: header shows, carousel renders (or empty state), team card shows. No red-screen errors.

- [ ] **Step 3: Commit**

```bash
git add app/(hackathon)/home.tsx
git commit -m "feat: replace hackathon home timeline with module carousel"
```

---

## Task 4: Rewrite module detail screen

**Files:**
- Modify: `app/(hackathon)/module/[moduleId].tsx`

- [ ] **Step 1: Replace `module/[moduleId].tsx` entirely**

```tsx
// app/(hackathon)/module/[moduleId].tsx
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { JourneyNodeGraph } from "../../../components/Hackathon/JourneyNodeGraph";
import { ProgressGateCard } from "../../../components/Hackathon/ProgressGateCard";
import { ResponsibilityBanner } from "../../../components/Hackathon/ResponsibilityBanner";
import {
  getHackathonModuleDetail,
  getModuleActivityProgress,
  buildModuleProgressSnapshot,
} from "../../../lib/hackathonProgram";
import { getPreviewModuleDetail } from "../../../lib/hackathonProgramPreview";
import { Radius, Space } from "../../../lib/theme";
import type { MapNode } from "../../../types/map";
import { supabase } from "../../../lib/supabase";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";
const GREEN = "#10B981";

const SCREEN_WIDTH = Dimensions.get("window").width;

function nodeTypeLabel(nodeType: string): string {
  switch (nodeType) {
    case "video": return "Video";
    case "quiz": return "Quiz";
    case "text": return "Text";
    case "file_upload": return "Upload";
    case "project": return "Project";
    case "npc_conversation": return "NPC";
    case "assessment": return "Assessment";
    default: return nodeType;
  }
}

export default function HackathonModuleScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<Awaited<ReturnType<typeof getHackathonModuleDetail>> | null>(null);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [mod, { data: { user } }] = await Promise.all([
            getHackathonModuleDetail(moduleId!),
            supabase.auth.getUser(),
          ]);
          const resolvedMod = mod ?? getPreviewModuleDetail(moduleId!);
          if (cancelled) return;
          setModule(resolvedMod);

          if (user) {
            const progress = await getModuleActivityProgress(moduleId!, user.id);
            if (!cancelled) {
              setNodes(progress.nodes);
              setCompletedNodeIds(progress.completedNodeIds);
              setCurrentNodeId(progress.currentNodeId);
            }
          }
        } catch {
          if (!cancelled) {
            setModule(getPreviewModuleDetail(moduleId!));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [moduleId]),
  );

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={CYAN} />
      </View>
    );
  }

  const graphWidth = SCREEN_WIDTH - Space["2xl"] * 2;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <AppText style={styles.backLink}>‹ Back</AppText>
      </Pressable>

      <View style={styles.header}>
        <AppText variant="bold" style={styles.eyebrow}>MODULE</AppText>
        <AppText variant="bold" style={styles.title}>{module?.title ?? "Module"}</AppText>
        <AppText style={styles.subtitle}>{module?.summary ?? ""}</AppText>
      </View>

      {/* Scope / gate badges */}
      <View style={styles.badges}>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{module?.workflow_scope ?? "individual"}</AppText>
        </View>
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{module?.gate_rule ?? "complete"}</AppText>
        </View>
      </View>

      {/* Node graph */}
      {nodes.length > 0 && (
        <View style={styles.graphCard}>
          <JourneyNodeGraph
            nodes={nodes}
            completedNodeIds={completedNodeIds}
            currentNodeId={currentNodeId}
            width={graphWidth}
            height={90}
          />
        </View>
      )}

      {/* Responsibility banner + gate card */}
      {module && (
        <>
          <ResponsibilityBanner
            label={
              module.workflow_scope === "team"
                ? "Team synthesis required"
                : module.workflow_scope === "hybrid"
                  ? "Individual work unlocks team work"
                  : "Each member completes this activity"
            }
            detail={
              module.workflow_scope === "team"
                ? "This module is owned by the team."
                : module.workflow_scope === "hybrid"
                  ? "Each member contributes evidence first, then the team consolidates."
                  : "This step is individually owned so every participant builds real skill."
            }
          />
          {(() => {
            const snapshot = buildModuleProgressSnapshot({
              memberStatuses: Array.from({ length: module.required_member_count ?? 3 }, () => "pending"),
              workflow: {
                scope: module.workflow_scope,
                gate_rule: module.gate_rule,
                review_mode: module.review_mode,
                required_member_count: module.required_member_count,
              },
              teamSubmissionStatus: "not_started",
            });
            const gateStatus = snapshot.gate_status;
            return (
              <ProgressGateCard
                title={gateStatus === "passed" ? "Gate passed" : gateStatus === "revision_required" ? "Revision required" : "Progress gate"}
                body={gateStatus === "passed" ? "This module has enough evidence to move forward." : `${snapshot.pending_members} members still need progress.`}
                status={gateStatus === "passed" ? "passed" : gateStatus === "revision_required" ? "revise" : "blocked"}
              />
            );
          })()}
        </>
      )}

      {/* Activity list */}
      <View style={styles.section}>
        <AppText style={styles.sectionLabel}>ACTIVITIES</AppText>
        {nodes.length === 0 ? (
          <AppText style={{ color: WHITE40, fontSize: 13 }}>No activities configured yet.</AppText>
        ) : (
          nodes.map((node) => {
            const done = completedNodeIds.has(node.id);
            const current = node.id === currentNodeId;
            const locked = !done && !current;

            return (
              <Pressable
                key={node.id}
                onPress={() => {
                  if (!locked) {
                    router.push(`/(hackathon)/activity/${node.id}`);
                  }
                }}
                style={({ pressed }) => [
                  styles.activityRow,
                  done && styles.activityRowDone,
                  current && styles.activityRowCurrent,
                  locked && styles.activityRowLocked,
                  pressed && !locked && { opacity: 0.8 },
                ]}
                disabled={locked}
              >
                {/* Status icon */}
                <View style={styles.activityIcon}>
                  {done && <AppText style={styles.iconDone}>✓</AppText>}
                  {current && <View style={styles.iconDot} />}
                  {locked && <AppText style={styles.iconLock}>🔒</AppText>}
                </View>

                {/* Title */}
                <AppText
                  variant="bold"
                  style={[
                    styles.activityTitle,
                    done && { color: GREEN },
                    current && { color: WHITE },
                    locked && { color: WHITE40 },
                  ]}
                >
                  {node.title}
                </AppText>

                {/* Type pill */}
                <View style={styles.typePill}>
                  <AppText style={styles.typePillText}>{nodeTypeLabel(node.node_type)}</AppText>
                </View>

                {/* Arrow */}
                {current && <AppText style={styles.arrow}>→</AppText>}
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { padding: Space["2xl"], paddingBottom: 96, gap: Space.xl },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  backLink: { fontSize: 15, color: CYAN },
  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 28, color: WHITE },
  subtitle: { fontSize: 14, lineHeight: 22, color: WHITE75 },
  badges: { flexDirection: "row", gap: Space.sm },
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, color: CYAN, textTransform: "uppercase", letterSpacing: 1 },
  graphCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: "rgba(0,240,255,0.03)",
    padding: Space.md,
  },
  section: { gap: Space.sm },
  sectionLabel: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: Space.xs },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: Space.md,
    gap: Space.sm,
  },
  activityRowDone: {
    borderColor: "rgba(16,185,129,0.2)",
    backgroundColor: "rgba(16,185,129,0.06)",
  },
  activityRowCurrent: {
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
  },
  activityRowLocked: { opacity: 0.4 },
  activityIcon: { width: 24, alignItems: "center" },
  iconDone: { fontSize: 13, color: GREEN },
  iconDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CYAN },
  iconLock: { fontSize: 11 },
  activityTitle: { flex: 1, fontSize: 14 },
  typePill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: { fontSize: 9, color: CYAN, textTransform: "uppercase", letterSpacing: 1 },
  arrow: { fontSize: 14, color: CYAN },
});
```

- [ ] **Step 2: Verify module detail renders**

Navigate from the carousel to a module. Confirm: node graph shows, activity list renders, back link works.

- [ ] **Step 3: Commit**

```bash
git add app/(hackathon)/module/[moduleId].tsx
git commit -m "feat: replace module pain-point workspace with node graph and activity list"
```

---

## Task 5: Create activity player screen

**Files:**
- Create: `app/(hackathon)/activity/[nodeId].tsx`

- [ ] **Step 1: Create the activity player**

```tsx
// app/(hackathon)/activity/[nodeId].tsx
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../components/AppText";
import { completeActivityNode } from "../../../lib/hackathonProgram";
import { Radius, Space } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase";
import type { MapNode } from "../../../types/map";

const BG = "#010814";
const CYAN = "#00F0FF";
const CYAN_BORDER = "rgba(0,240,255,0.2)";
const CYAN_BG = "rgba(0,240,255,0.06)";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE40 = "rgba(255,255,255,0.4)";

function nodeTypeLabel(nodeType: string): string {
  switch (nodeType) {
    case "video": return "VIDEO";
    case "quiz": return "QUIZ";
    case "text": return "TEXT";
    case "file_upload": return "FILE UPLOAD";
    case "project": return "PROJECT";
    case "npc_conversation": return "NPC CONVERSATION";
    case "assessment": return "ASSESSMENT";
    default: return nodeType.toUpperCase();
  }
}

function TextContent({ node }: { node: MapNode }) {
  const body = node.content?.body ?? node.instructions ?? "No content available.";
  return (
    <View style={styles.contentCard}>
      <AppText style={styles.bodyText}>{body}</AppText>
    </View>
  );
}

function VideoContent({ node }: { node: MapNode }) {
  const url = node.content?.video_url;
  return (
    <View style={styles.contentCard}>
      {url ? (
        <AppText style={styles.bodyText}>Video: {url}</AppText>
      ) : (
        <AppText style={[styles.bodyText, { color: WHITE40 }]}>No video URL configured.</AppText>
      )}
    </View>
  );
}

function QuizContent({ node, onAnswered }: { node: MapNode; onAnswered: (correct: boolean) => void }) {
  const questions = node.content?.questions ?? [];
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    setSubmitted(true);
    // Simple pass: all questions answered
    onAnswered(Object.keys(selected).length === questions.length);
  }

  return (
    <View style={styles.contentCard}>
      {questions.length === 0 ? (
        <AppText style={{ color: WHITE40 }}>No questions configured.</AppText>
      ) : (
        questions.map((q) => (
          <View key={q.id} style={{ marginBottom: Space.lg }}>
            <AppText variant="bold" style={styles.questionText}>{q.question}</AppText>
            {(q.options ?? []).map((opt) => {
              const isSelected = selected[q.id] === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => !submitted && setSelected((prev) => ({ ...prev, [q.id]: opt.id }))}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                >
                  <AppText style={[styles.optionText, isSelected && { color: CYAN }]}>{opt.text}</AppText>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
      {!submitted && questions.length > 0 && (
        <Pressable style={styles.submitBtn} onPress={submit}>
          <AppText variant="bold" style={styles.submitBtnText}>Submit answers</AppText>
        </Pressable>
      )}
      {submitted && (
        <AppText style={{ color: CYAN, marginTop: Space.sm }}>Submitted! Tap "Mark complete" below.</AppText>
      )}
    </View>
  );
}

function ProjectContent({ node, onTextChange }: { node: MapNode; onTextChange: (text: string) => void }) {
  const deliverables = node.content?.deliverables ?? [];
  return (
    <View style={styles.contentCard}>
      {deliverables.length > 0 && (
        <View style={{ marginBottom: Space.md }}>
          <AppText variant="bold" style={{ color: WHITE, marginBottom: Space.xs }}>Deliverables</AppText>
          {deliverables.map((d, i) => (
            <AppText key={i} style={styles.bodyText}>• {d}</AppText>
          ))}
        </View>
      )}
      <AppText variant="bold" style={{ color: WHITE, marginBottom: Space.xs }}>Your submission</AppText>
      <TextInput
        style={styles.textArea}
        multiline
        placeholder="Write your response here..."
        placeholderTextColor={WHITE40}
        onChangeText={onTextChange}
      />
    </View>
  );
}

function NpcContent({ node }: { node: MapNode }) {
  return (
    <View style={styles.contentCard}>
      <AppText style={[styles.bodyText, { color: WHITE40 }]}>
        NPC conversation coming soon. Mark complete to proceed.
      </AppText>
    </View>
  );
}

function GenericContent({ node }: { node: MapNode }) {
  return (
    <View style={styles.contentCard}>
      <AppText style={styles.bodyText}>
        {node.content?.description ?? node.instructions ?? "Complete this activity and mark it done."}
      </AppText>
    </View>
  );
}

export default function HackathonActivityScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const [node, setNode] = useState<MapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: nodeData }, { data: { user } }] = await Promise.all([
          supabase
            .from("map_nodes")
            .select("*, node_content(*), node_assessments(id, assessment_type, quiz_questions(*))")
            .eq("id", nodeId!)
            .maybeSingle(),
          supabase.auth.getUser(),
        ]);
        if (!cancelled) {
          setNode(nodeData as MapNode | null);
          setUserId(user?.id ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [nodeId]);

  async function handleComplete() {
    if (!nodeId || !userId || completing) return;
    setCompleting(true);
    try {
      await completeActivityNode(nodeId, userId);
      router.back();
    } catch {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={CYAN} />
      </View>
    );
  }

  if (!node) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: WHITE40 }}>Activity not found.</AppText>
      </View>
    );
  }

  function renderContent() {
    if (!node) return null;
    switch (node.node_type) {
      case "text": return <TextContent node={node} />;
      case "video": return <VideoContent node={node} />;
      case "quiz": return <QuizContent node={node} onAnswered={() => {}} />;
      case "project": return <ProjectContent node={node} onTextChange={setSubmissionText} />;
      case "npc_conversation": return <NpcContent node={node} />;
      default: return <GenericContent node={node} />;
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppText style={styles.backLink}>‹ Back</AppText>
        </Pressable>

        <View style={styles.header}>
          <AppText variant="bold" style={styles.eyebrow}>{nodeTypeLabel(node.node_type)}</AppText>
          <AppText variant="bold" style={styles.title}>{node.title}</AppText>
        </View>

        {renderContent()}
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.ctaButton, completing && { opacity: 0.5 }]}
          onPress={handleComplete}
          disabled={completing}
        >
          <AppText variant="bold" style={styles.ctaText}>
            {completing ? "Saving..." : "Mark complete →"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  scrollContent: { padding: Space["2xl"], paddingBottom: 120, gap: Space.xl },
  backLink: { fontSize: 15, color: CYAN },
  header: { gap: Space.sm },
  eyebrow: { fontSize: 11, color: CYAN, textTransform: "uppercase", letterSpacing: 2 },
  title: { fontSize: 28, color: WHITE },
  contentCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: "rgba(0,240,255,0.03)",
    padding: Space.lg,
    gap: Space.sm,
  },
  bodyText: { fontSize: 14, lineHeight: 22, color: WHITE75 },
  questionText: { fontSize: 15, color: WHITE, marginBottom: Space.sm },
  optionRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: Space.md,
    marginBottom: Space.xs,
  },
  optionRowSelected: { borderColor: CYAN_BORDER, backgroundColor: CYAN_BG },
  optionText: { fontSize: 14, color: WHITE75 },
  submitBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: CYAN_BG,
    padding: Space.md,
    alignItems: "center",
    marginTop: Space.sm,
  },
  submitBtnText: { color: CYAN, fontSize: 14 },
  textArea: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
    color: WHITE,
    padding: Space.md,
    minHeight: 120,
    fontSize: 14,
    textAlignVertical: "top",
  },
  footer: {
    padding: Space.xl,
    paddingBottom: Space["2xl"],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  ctaButton: {
    borderRadius: Radius.full,
    backgroundColor: CYAN,
    padding: Space.lg,
    alignItems: "center",
  },
  ctaText: { fontSize: 15, color: BG, letterSpacing: 0.5 },
});
```

- [ ] **Step 2: Register the route in `_layout.tsx`**

The `app/(hackathon)/` directory uses a Tabs layout in `app/(hackathon)/_layout.tsx`. The `activity/[nodeId]` screen is a sub-screen that should NOT appear as a tab — it needs to be in the root Stack. Open `app/_layout.tsx` and add inside the `<Stack>`:

```tsx
<Stack.Screen name="(hackathon)/activity/[nodeId]" options={{ headerShown: false }} />
```

Add it alongside the existing `<Stack.Screen name="(hackathon)" />` line.

- [ ] **Step 3: Verify activity screen**

Navigate: Home → tap module card → tap an activity row → activity screen opens, shows content, "Mark complete" button visible. Tapping it navigates back.

- [ ] **Step 4: Commit**

```bash
git add app/(hackathon)/activity/[nodeId].tsx app/_layout.tsx
git commit -m "feat: add hackathon activity player screen"
```

---

## Task 6: Final cleanup

**Files:**
- Modify: `app/(hackathon)/module/[moduleId].tsx` (already done in Task 4 — verify imports)

- [ ] **Step 1: Confirm `hackathonAi.ts` imports are gone from module screen**

Open `app/(hackathon)/module/[moduleId].tsx`. Verify no imports from `../../../lib/hackathonAi` remain. The file was fully replaced in Task 4 so this should already be clean.

- [ ] **Step 2: Check TypeScript compiles cleanly**

```bash
pnpm exec tsc --noEmit
```

Fix any type errors. Common ones to watch for:
- `Set<string>` passed where the type expects a plain object — ensure `HackathonJourneyModuleProgress.completedNodeIds` is typed as `Set<string>` not `string[]`
- `nodes[i + 1]` non-null assertion — already handled with `!` in the plan code

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: clean up hackathon journey implementation"
```
