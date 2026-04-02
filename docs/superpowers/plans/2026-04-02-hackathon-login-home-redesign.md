# Hackathon Login & Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `hackathon-login.tsx` and `(hackathon)/home.tsx` to use the Bioluminescent Ocean design system — deep ocean backgrounds, cyan/purple glow orbs, glass cards, jellyfish SVG on login, and a node-graph SVG inside each phase card on home.

**Architecture:** Both files are self-contained React Native screens with inline `StyleSheet`. No new shared components — the SVG node graph is rendered inline in the phase card. Design tokens are local constants at the top of each file (not imported from `lib/theme.ts`, which is the main app's light theme).

**Tech Stack:** React Native, Expo Router, `react-native-safe-area-context` (already installed), `expo-linear-gradient` (already installed), inline SVG via `react-native-svg` (already installed).

---

## Files

| File | Action |
|------|--------|
| `app/hackathon-login.tsx` | Full rewrite — bioluminescent theme, jellyfish SVG, glow orbs, stars |
| `app/(hackathon)/home.tsx` | Replace phase card internals with SVG node graph, update all colors to bioluminescent tokens |

---

## Task 1: Redesign `hackathon-login.tsx`

**Files:**
- Modify: `app/hackathon-login.tsx`

- [ ] **Step 1: Replace the file with the new design**

Replace the entire content of `app/hackathon-login.tsx` with:

```tsx
// app/hackathon-login.tsx
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Path, Polyline } from "react-native-svg";
import { router } from "expo-router";
import { AppText } from "../components/AppText";
import { useAuth } from "../lib/auth";
import { Space } from "../lib/theme";

// ── Bioluminescent Ocean tokens ──────────────────────────────
const BG          = "#03050a";
const CYAN        = "#91C4E3";
const BLUE        = "#65ABFC";
const PURPLE      = "#9D81AC";
const CARD_INPUT  = "rgba(26,37,48,0.75)";
const BORDER_MID  = "rgba(90,122,148,0.35)";
const WHITE       = "#FFFFFF";
const WHITE40     = "rgba(255,255,255,0.4)";
const WHITE25     = "rgba(255,255,255,0.25)";
const CYAN45      = "rgba(145,196,227,0.45)";
const CYAN55      = "rgba(145,196,227,0.55)";
const CYAN50_TEXT = "rgba(145,196,227,0.5)";

function JellyfishSvg() {
  return (
    <Svg width={64} height={80} viewBox="0 0 64 80">
      {/* Bell outer */}
      <Ellipse
        cx={32} cy={28} rx={22} ry={18}
        fill="rgba(145,196,227,0.07)"
        stroke="rgba(145,196,227,0.3)"
        strokeWidth={1}
      />
      {/* Bell inner */}
      <Ellipse
        cx={32} cy={26} rx={14} ry={11}
        fill="rgba(145,196,227,0.05)"
        stroke="rgba(145,196,227,0.15)"
        strokeWidth={0.8}
      />
      {/* Core glow */}
      <Ellipse cx={32} cy={24} rx={6} ry={5} fill="rgba(145,196,227,0.12)" />
      {/* Tentacles */}
      <Path d="M20 44 Q18 56 20 68" stroke="rgba(145,196,227,0.3)" strokeWidth={1} fill="none" />
      <Path d="M25 46 Q22 58 24 70" stroke="rgba(145,196,227,0.2)" strokeWidth={1} fill="none" />
      <Path d="M32 46 Q32 60 30 72" stroke="rgba(145,196,227,0.3)" strokeWidth={1} fill="none" />
      <Path d="M38 46 Q40 58 38 70" stroke="rgba(145,196,227,0.2)" strokeWidth={1} fill="none" />
      <Path d="M44 44 Q46 56 44 68" stroke="rgba(145,196,227,0.25)" strokeWidth={1} fill="none" />
    </Svg>
  );
}

export default function HackathonLoginScreen() {
  const { signInWithEmailPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* Ambient glow orbs */}
      <View style={styles.glowCyan} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />
      <View style={styles.glowBlue} pointerEvents="none" />

      {/* Star particles */}
      <View style={[styles.star, { top: "18%", left: "15%", width: 2, height: 2, opacity: 0.4 }]} pointerEvents="none" />
      <View style={[styles.star, { top: "30%", left: "80%", width: 1.5, height: 1.5, opacity: 0.3 }]} pointerEvents="none" />
      <View style={[styles.star, { top: "55%", left: "88%", width: 2, height: 2, opacity: 0.25 }]} pointerEvents="none" />
      <View style={[styles.star, { top: "70%", left: "8%", width: 1.5, height: 1.5, opacity: 0.3 }]} pointerEvents="none" />
      <View style={[styles.star, { top: "85%", left: "55%", width: 2, height: 2, opacity: 0.2 }]} pointerEvents="none" />

      {/* Jellyfish */}
      <View style={[styles.jellyfish, { top: insets.top + 56 }]} pointerEvents="none">
        <JellyfishSvg />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.content, { paddingTop: insets.top + Space.lg }]}>
          {/* Back */}
          <Pressable
            onPress={() => router.replace("/")}
            style={styles.backRow}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <AppText style={styles.backText}>‹ Back</AppText>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <AppText style={styles.eyebrow}>Next Decade Hackathon</AppText>
            <AppText variant="bold" style={styles.title}>{"Sign in to\nyour journey"}</AppText>
            <AppText style={styles.subtitle}>
              Use your registered hackathon email and password.
            </AppText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <AppText style={styles.inputLabel}>Email</AppText>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.inputWrap}>
              <AppText style={styles.inputLabel}>Password</AppText>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.25)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          {/* CTA */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.loginButton,
              loading && styles.loginButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <AppText variant="bold" style={styles.loginButtonText}>
              {loading ? "Signing in..." : "Sign In →"}
            </AppText>
          </Pressable>

          {/* Footer */}
          <AppText style={styles.footerNote}>
            Forgot password?{" "}
            <Text style={styles.footerNoteAccent}>Contact your coordinator.</Text>
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Glow orbs
  glowCyan: {
    position: "absolute", top: -60, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: CYAN, opacity: 0.055,
    // blur not supported natively — use large radius as approximation
  },
  glowPurple: {
    position: "absolute", bottom: 40, right: -40,
    width: 170, height: 170, borderRadius: 85,
    backgroundColor: "#A594BA", opacity: 0.08,
  },
  glowBlue: {
    position: "absolute", top: "40%", left: "40%",
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: BLUE, opacity: 0.03,
  },

  // Stars
  star: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: WHITE,
  },

  // Jellyfish
  jellyfish: {
    position: "absolute",
    right: 18,
    opacity: 0.45,
  },

  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space["3xl"],
    gap: Space.xl,
  },
  backRow: { alignSelf: "flex-start" },
  backText: { fontSize: 15, color: BLUE },

  header: { gap: Space.sm },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.8,
    textTransform: "uppercase",
    color: CYAN45,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: WHITE,
    textShadowColor: "rgba(145,196,227,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  subtitle: { fontSize: 13, lineHeight: 20, color: WHITE40 },

  form: { gap: Space.md },
  inputWrap: {
    backgroundColor: CARD_INPUT,
    borderWidth: 1.5,
    borderColor: BORDER_MID,
    borderRadius: 14,
    paddingHorizontal: Space.lg,
    paddingTop: Space.sm,
    paddingBottom: Space.md,
    gap: 4,
  },
  inputLabel: {
    fontSize: 9,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: CYAN55,
  },
  input: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "LibreFranklin_400Regular",
    paddingVertical: 4,
  },

  errorText: { color: "#F87171", fontSize: 13 },

  loginButton: {
    backgroundColor: PURPLE,
    borderRadius: 40,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#9D81AC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 8,
  },
  loginButtonDisabled: { opacity: 0.5 },
  loginButtonText: { color: WHITE, fontSize: 15, letterSpacing: 0.3 },

  footerNote: {
    fontSize: 11,
    color: WHITE25,
    textAlign: "center",
    lineHeight: 18,
  },
  footerNoteAccent: { color: CYAN50_TEXT },
});
```

- [ ] **Step 2: Verify the app loads without error**

Run `pnpm ios` or check the running Expo dev server. Navigate to the hackathon login screen. Confirm:
- Deep ocean background (`#03050a`)
- Jellyfish SVG visible top-right
- Cyan glow top-left, purple glow bottom-right
- "Sign in to your journey" title with glow
- Purple pill CTA button
- No TypeScript errors in terminal

- [ ] **Step 3: Commit**

```bash
git add app/hackathon-login.tsx
git commit -m "feat: redesign hackathon login with bioluminescent ocean theme"
```

---

## Task 2: Redesign `(hackathon)/home.tsx` — tokens + header + glow orbs

**Files:**
- Modify: `app/(hackathon)/home.tsx`

- [ ] **Step 1: Update color tokens, imports, and header section**

Replace the color constants at the top of `app/(hackathon)/home.tsx` and add `useSafeAreaInsets`:

```tsx
// app/(hackathon)/home.tsx
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import {
  getCurrentHackathonProgramHome,
  getEmptyHackathonProgramHome,
} from "../../lib/hackathonProgram";
import { getPreviewHackathonProgramHome } from "../../lib/hackathonProgramPreview";
import { getProgramPhasesWithActivities } from "../../lib/hackathonPhaseActivity";
import { Space } from "../../lib/theme";
import type { HackathonProgramHome, HackathonProgramPhase } from "../../types/hackathon-program";

// ── Bioluminescent Ocean tokens ──────────────────────────────
const BG       = "#03050a";
const CYAN     = "#91C4E3";
const BLUE     = "#65ABFC";
const WHITE    = "#FFFFFF";
const WHITE28  = "rgba(255,255,255,0.28)";
const WHITE06  = "rgba(255,255,255,0.06)";
const CYAN45   = "rgba(145,196,227,0.45)";
const CYAN60   = "rgba(145,196,227,0.6)";
const BORDER   = "rgba(74,107,130,0.35)";
const CARD_BG  = "rgba(13,18,25,0.95)";
const CARD_BG2 = "rgba(18,28,41,0.85)";
const AMBER    = "#F59E0B";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_PADDING = Space.xl;
const PEEK_WIDTH   = 28;
const CARD_GAP     = Space.md;
const CARD_WIDTH   = SCREEN_WIDTH - CARD_PADDING * 2 - PEEK_WIDTH - 32;
```

- [ ] **Step 2: Commit token update**

```bash
git add app/(hackathon)/home.tsx
git commit -m "feat: update hackathon home color tokens to bioluminescent theme"
```

---

## Task 3: Build the `PhaseNodeGraph` SVG component (inline)

**Files:**
- Modify: `app/(hackathon)/home.tsx`

The node graph is rendered as a `react-native-svg` SVG inside each phase card. One node per activity, connected left-to-right by dashed lines.

- [ ] **Step 1: Add the `Svg` import and `PhaseNodeGraph` component**

Add after the token constants in `app/(hackathon)/home.tsx`:

```tsx
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

type NodeState = "completed" | "current" | "upcoming";

type ActivityNode = {
  title: string;
  state: NodeState;
};

function PhaseNodeGraph({ nodes, width }: { nodes: ActivityNode[]; width: number }) {
  if (nodes.length === 0) return null;

  const HEIGHT = 90;
  const LABEL_AREA = 28; // px reserved below node center for label
  const NODE_Y = (HEIGHT - LABEL_AREA) / 2; // vertical center of nodes
  const NODE_R = 11; // radius of main circle
  const PULSE_R = 16; // outer pulse ring radius for current node

  // Distribute nodes evenly across width with padding
  const PAD_X = 20;
  const usable = width - PAD_X * 2;
  const step = nodes.length > 1 ? usable / (nodes.length - 1) : 0;
  const cx = (i: number) => PAD_X + i * step;

  return (
    <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
      {/* Connecting lines */}
      {nodes.map((node, i) => {
        if (i === nodes.length - 1) return null;
        const x1 = cx(i) + NODE_R;
        const x2 = cx(i + 1) - NODE_R;
        const opacity = node.state === "completed" ? 0.25 : 0.12;
        return (
          <Line
            key={`line-${i}`}
            x1={x1} y1={NODE_Y}
            x2={x2} y2={NODE_Y}
            stroke={`rgba(145,196,227,${opacity})`}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const x = cx(i);
        const labelY = NODE_Y + NODE_R + 10;

        if (node.state === "completed") {
          return (
            <React.Fragment key={`node-${i}`}>
              <Circle cx={x} cy={NODE_Y} r={NODE_R} fill="rgba(145,196,227,0.15)" stroke={CYAN} strokeWidth={1.5} />
              <Circle cx={x} cy={NODE_Y} r={7} fill={CYAN} />
              <Polyline
                points={`${x - 5},${NODE_Y} ${x - 1},${NODE_Y + 4} ${x + 5},${NODE_Y - 4}`}
                fill="none"
                stroke="#03050a"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <SvgText
                x={x} y={labelY}
                textAnchor="middle"
                fontSize={7.5}
                fill="rgba(145,196,227,0.7)"
                fontFamily="system-ui"
              >
                {node.title.length > 8 ? node.title.slice(0, 8) + "…" : node.title}
              </SvgText>
            </React.Fragment>
          );
        }

        if (node.state === "current") {
          return (
            <React.Fragment key={`node-${i}`}>
              {/* Outer pulse ring */}
              <Circle cx={x} cy={NODE_Y} r={PULSE_R} fill="rgba(145,196,227,0.04)" stroke="rgba(145,196,227,0.3)" strokeWidth={1} strokeDasharray="3 2" />
              {/* Inner ring */}
              <Circle cx={x} cy={NODE_Y} r={NODE_R} fill={CARD_BG} stroke={CYAN} strokeWidth={2} />
              {/* Center dot */}
              <Circle cx={x} cy={NODE_Y} r={4} fill={CYAN} opacity={0.8} />
              <SvgText
                x={x} y={labelY + 6}
                textAnchor="middle"
                fontSize={7.5}
                fill="rgba(255,255,255,0.55)"
                fontFamily="system-ui"
              >
                {node.title.length > 8 ? node.title.slice(0, 8) + "…" : node.title}
              </SvgText>
            </React.Fragment>
          );
        }

        // upcoming
        return (
          <React.Fragment key={`node-${i}`}>
            <Circle cx={x} cy={NODE_Y} r={NODE_R} fill="rgba(13,18,25,0.6)" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
            <SvgText
              x={x} y={labelY}
              textAnchor="middle"
              fontSize={7.5}
              fill="rgba(255,255,255,0.25)"
              fontFamily="system-ui"
            >
              {node.title.length > 8 ? node.title.slice(0, 8) + "…" : node.title}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
```

Also add `import React from "react";` at the top if not already present (needed for `React.Fragment`).

- [ ] **Step 2: Verify SVG renders**

Run the app, open the hackathon home screen. The phase card should now show the node graph. Check no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/(hackathon)/home.tsx
git commit -m "feat: add PhaseNodeGraph SVG component to hackathon home"
```

---

## Task 4: Rebuild `PhaseCardView` with node graph + glass morphism

**Files:**
- Modify: `app/(hackathon)/home.tsx`

- [ ] **Step 1: Replace `PhaseCard` type and `PhaseCardView` component**

Replace the existing `PhaseCard` type and `PhaseCardView` component:

```tsx
type PhaseCard = {
  phase: HackathonProgramPhase;
  activityTitles: string[];
  activityCount: number;
  completedCount: number;
  isActive: boolean;
};

function PhaseCardView({ card, onPress }: { card: PhaseCard; onPress: () => void }) {
  const dueDate = formatDate(card.phase.due_at ?? card.phase.ends_at);
  const pct = card.activityCount > 0
    ? Math.round((card.completedCount / card.activityCount) * 100)
    : 0;

  const nodes: ActivityNode[] = card.activityTitles.map((title, i) => {
    if (i < card.completedCount) return { title, state: "completed" };
    if (i === card.completedCount) return { title, state: "current" };
    return { title, state: "upcoming" };
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      {/* Inner glow orb */}
      <View style={styles.cardGlow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.phaseLabel}>Phase {card.phase.phase_number}</AppText>
          <AppText variant="bold" style={styles.phaseName}>{card.phase.title}</AppText>
          {card.activityCount > 0 && (
            <AppText style={styles.phasePct}>{pct}% complete</AppText>
          )}
        </View>
        {dueDate ? <AppText style={styles.phaseDue}>{dueDate}</AppText> : null}
      </View>

      {/* Node graph */}
      <View style={styles.graphContainer}>
        <PhaseNodeGraph
          nodes={nodes}
          width={CARD_WIDTH - Space.lg * 2}
        />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <AppText style={styles.actCount}>
          {card.activityCount} {card.activityCount === 1 ? "activity" : "activities"}
        </AppText>
        <AppText style={styles.tapHint}>Tap to open →</AppText>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Update `load()` to include `completedCount: 0` in phase cards**

In the `load` callback, add `completedCount: 0` to each card object (preview and real paths):

```tsx
// Preview path — replace the setPhaseCards call:
setPhaseCards(
  previewHome.phases.map((phase, i) => ({
    phase,
    activityTitles: i === 0
      ? ["Know Yourself", "Find a Problem", "Brainstorm Solutions", "Pick Your Solution"]
      : [],
    activityCount: i === 0 ? 4 : 0,
    completedCount: i === 0 ? 1 : 0, // illustrative: 1 done in preview
    isActive: phase.id === previewHome.enrollment?.current_phase_id,
  }))
);

// Real path — replace the cards mapping:
const cards: PhaseCard[] = home.phases.map((phase) => {
  const phaseData = phasesWithActivities.find((p) => p.id === phase.id);
  const activities = phaseData?.activities ?? [];
  return {
    phase,
    activityTitles: activities.map((a) => a.title),
    activityCount: activities.length,
    completedCount: 0, // TODO: wire to real submission data
    isActive: phase.id === currentPhaseId,
  };
});

// Error fallback — same as preview path above
```

- [ ] **Step 3: Commit**

```bash
git add app/(hackathon)/home.tsx
git commit -m "feat: rebuild hackathon phase card with node graph and glass morphism"
```

---

## Task 5: Update home screen layout, styles, and team card

**Files:**
- Modify: `app/(hackathon)/home.tsx`

- [ ] **Step 1: Update `HackathonHomeScreen` to use safe area + glow orbs**

Replace the `HackathonHomeScreen` return JSX with:

```tsx
export default function HackathonHomeScreen() {
  // ... (keep all existing state and load logic unchanged) ...
  const insets = useSafeAreaInsets();

  // Add insets to the component; keep all existing state/load/scrollTo logic unchanged

  if (loading || !data) {
    return (
      <View style={styles.loadingRoot}>
        <AppText style={{ color: CYAN }}>Loading...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Ambient glow orbs */}
      <View style={styles.glowCyan} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.xl }]}
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
          <AppText style={styles.eyebrow}>
            {data.program?.title ?? "Epic Sprint"}
          </AppText>
          <AppText variant="bold" style={styles.title}>Your Journey</AppText>
        </View>

        {/* Preview banner */}
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

        {/* Phase carousel */}
        {phaseCards.length > 0 ? (
          <View style={styles.carouselSection}>
            <View style={styles.carouselRow}>
              <Pressable
                onPress={() => scrollTo(activeIndex - 1)}
                style={styles.chevron}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                disabled={activeIndex === 0}
              >
                <AppText style={[styles.chevronText, activeIndex === 0 && { opacity: 0.2 }]}>‹</AppText>
              </Pressable>

              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                style={{ flex: 1 }}
                contentContainerStyle={styles.cardsContent}
              >
                {phaseCards.map((card) => (
                  <PhaseCardView
                    key={card.phase.id}
                    card={card}
                    onPress={() => router.push(`/(hackathon)/phase/${card.phase.id}`)}
                  />
                ))}
              </ScrollView>

              <View style={styles.rightSide}>
                <Pressable
                  onPress={() => scrollTo(activeIndex + 1)}
                  style={styles.chevron}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  disabled={activeIndex === phaseCards.length - 1}
                >
                  <AppText style={[styles.chevronText, activeIndex === phaseCards.length - 1 && { opacity: 0.2 }]}>›</AppText>
                </Pressable>
                {activeIndex < phaseCards.length - 1 && <View style={styles.peek} />}
              </View>
            </View>

            <View style={styles.dots}>
              {phaseCards.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyPhases}>
            <AppText style={{ color: WHITE28 }}>No phases available yet.</AppText>
          </View>
        )}

        {/* Team card */}
        {data.team && (
          <View style={styles.teamCard}>
            <View style={styles.teamCardHeader}>
              <AppText style={styles.teamLabel}>Team</AppText>
              <AppText style={styles.teamId}>ID: {data.team.id?.substring(0, 6) ?? "---"}</AppText>
            </View>
            <AppText variant="bold" style={styles.teamName}>
              {data.team.name ?? data.team.team_name ?? "Not assigned to a team yet"}
            </AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Replace the full `StyleSheet.create` with updated styles**

Replace the entire `const styles = StyleSheet.create({...})` block with:

```tsx
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 120,
    gap: Space["2xl"],
  },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },

  // Glow orbs
  glowCyan: {
    position: "absolute", top: -60, left: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: CYAN, opacity: 0.05,
  },
  glowPurple: {
    position: "absolute", bottom: 80, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "#A594BA", opacity: 0.07,
  },

  // Header
  header: { gap: Space.xs },
  eyebrow: {
    fontSize: 10,
    color: CYAN45,
    textTransform: "uppercase",
    letterSpacing: 2.5,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    color: WHITE,
    textShadowColor: "rgba(145,196,227,0.25)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },

  // Preview banner
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    backgroundColor: "rgba(245,158,11,0.06)",
    padding: Space.lg,
    gap: Space.sm,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  previewTitle: { fontSize: 14, color: AMBER },
  previewCopy: { fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.75)" },

  // Carousel
  carouselSection: { gap: Space.md },
  carouselRow: { flexDirection: "row", alignItems: "center" },
  chevron: { paddingHorizontal: 4 },
  chevronText: { fontSize: 28, color: CYAN, lineHeight: 34 },
  rightSide: { flexDirection: "row", alignItems: "center" },
  peek: {
    width: PEEK_WIDTH, height: 220, borderRadius: 16,
    backgroundColor: WHITE06,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  cardsContent: { gap: CARD_GAP },

  // Phase card (glass morphism)
  card: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: Space.lg,
    gap: Space.md,
    overflow: "hidden",
    shadowColor: "rgba(74,107,130,1)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 4,
  },
  cardGlow: {
    position: "absolute", top: -30, left: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(145,196,227,0.07)",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Space.sm },
  phaseLabel: {
    fontSize: 9, textTransform: "uppercase", letterSpacing: 2,
    color: CYAN45,
  },
  phaseName: { fontSize: 15, color: WHITE },
  phasePct: { fontSize: 11, color: CYAN60, marginTop: 2 },
  phaseDue: { fontSize: 11, color: WHITE28 },
  graphContainer: { marginHorizontal: -Space.xs },

  // Progress bar
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 1,
  },
  progressFill: {
    height: 2,
    backgroundColor: CYAN,
    borderRadius: 1,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },

  // Card footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    paddingTop: Space.sm,
  },
  actCount: { fontSize: 10, color: WHITE28 },
  tapHint: { fontSize: 10, color: BLUE },

  // Dots
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: {
    backgroundColor: CYAN,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },

  // Empty
  emptyPhases: { alignItems: "center", paddingVertical: Space.xl },

  // Team card
  teamCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    padding: Space.lg,
    gap: Space.sm,
  },
  teamCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamLabel: { fontSize: 9, color: CYAN45, textTransform: "uppercase", letterSpacing: 2 },
  teamId: { fontSize: 11, color: WHITE28 },
  teamName: { fontSize: 16, color: WHITE },
});
```

- [ ] **Step 3: Verify full home screen looks correct**

Run the app. Check:
- Deep ocean background with cyan glow top-left, purple glow bottom-right
- "Your Journey" title with glow effect
- Phase card with node graph (completed node filled cyan with checkmark, current node double-ring, upcoming nodes dim)
- Progress bar below graph
- Glass card styling (dark gradient, subtle border)
- Team card styled consistently

- [ ] **Step 4: Commit**

```bash
git add app/(hackathon)/home.tsx
git commit -m "feat: redesign hackathon home with bioluminescent theme and node graph phase cards"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Login: jellyfish SVG top-right — Task 1
- ✅ Login: 3 glow orbs + 5 star particles — Task 1
- ✅ Login: left-aligned, eyebrow, title, subtitle — Task 1
- ✅ Login: glass input fields with cyan label — Task 1
- ✅ Login: purple pill CTA with glow shadow — Task 1
- ✅ Login: footer note with accent color — Task 1
- ✅ Home: bioluminescent tokens — Task 2
- ✅ Home: safe area top padding — Task 5
- ✅ Home: glow orbs — Task 5
- ✅ Home: eyebrow + glowing title — Task 5
- ✅ Home: phase card with glass morphism + inner glow — Tasks 3+4+5
- ✅ Home: SVG node graph (completed/current/upcoming states) — Task 3
- ✅ Home: progress bar with cyan glow — Tasks 4+5
- ✅ Home: card footer (count + tap hint) — Tasks 4+5
- ✅ Home: carousel with chevrons + dots — Task 5
- ✅ Home: team card glass styling — Task 5
- ✅ Preview mode: node 1 completed, node 2 current — Task 4

**Placeholder scan:** No TBDs. `completedCount: 0` for real data is noted as a future wire-up (acceptable — submission progress is a separate feature).

**Type consistency:** `PhaseCard.completedCount` added in Task 4 step 1, used in `PhaseCardView` in Task 4 step 1. `ActivityNode` type defined in Task 3 step 1, used in `PhaseNodeGraph` (Task 3) and `PhaseCardView` (Task 4). `NodeState` defined and used consistently.
