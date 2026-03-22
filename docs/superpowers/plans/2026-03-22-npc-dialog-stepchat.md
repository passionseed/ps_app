# NPC Dialog StepChat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat bubble UI in `app/onboarding/StepChat.tsx` with an NPC dialog UI (portrait + dialog box, one question at a time, animated loading states).

**Architecture:** Single file rewrite of `StepChat.tsx`. All existing props, state, and API logic are preserved unchanged. Only the JSX render and StyleSheet are replaced. Two new animation effects added via `Animated` API: portrait glow loop and typing dots loop, both triggered by the `loading` state.

**Tech Stack:** React Native `Animated` API, `Easing`, `Platform`, `KeyboardAvoidingView`, `TextInput`, `Pressable`. No new dependencies.

---

## Files

| Action | Path | What changes |
|--------|------|--------------|
| Modify | `app/onboarding/StepChat.tsx` | Replace render + styles; add animation refs + effect |

---

### Task 1: Strip old render, add NPC layout skeleton

**Files:**
- Modify: `app/onboarding/StepChat.tsx`

Remove all the old chat UI and replace with the NPC layout shell. Logic stays identical — only the JSX and styles change. No animations yet.

- [ ] **Step 1: Remove unused imports and dead code**

In `app/onboarding/StepChat.tsx`, update the import block:

```tsx
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import {
  callOnboardingChat,
  upsertOnboardingState,
} from "../../lib/onboarding";
import type { ChatMessage } from "../../types/onboarding";
```

Remove: `ScrollView`, `ActivityIndicator` from the import list (no longer used).
Add: `Animated`, `Easing`.

- [ ] **Step 2: Remove dead state and refs**

Delete the `scrollRef` line:
```tsx
// DELETE this line:
const scrollRef = useRef<ScrollView>(null);
```

Delete the scroll effect (the `useEffect` that calls `scrollRef.current?.scrollToEnd`):
```tsx
// DELETE this useEffect:
useEffect(() => {
  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
}, [bubbles]);
```

Delete the `handleEditMessage` function entirely (lines 97–113 in the original).

- [ ] **Step 3: Add animation refs**

After the `const [loading, setLoading] = useState(false);` line, add:

```tsx
const glowAnim = useRef(new Animated.Value(0)).current;
const dot1Anim = useRef(new Animated.Value(0.2)).current;
const dot2Anim = useRef(new Animated.Value(0.2)).current;
const dot3Anim = useRef(new Animated.Value(0.2)).current;
```

- [ ] **Step 4: Add derived NPC text value**

After the animation refs, add:

```tsx
const currentNpcText =
  [...bubbles].reverse().find((b) => b.role === "model")?.text ?? "";
```

- [ ] **Step 5: Replace the JSX with NPC layout shell**

Replace everything inside the `return (...)` with:

```tsx
return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={0}
  >
    <View style={styles.container}>
      {/* NPC portrait area */}
      <View style={styles.portraitArea}>
        <Animated.View style={[styles.portrait]}>
          <Text style={styles.portraitLabel}>NPC</Text>
        </Animated.View>
      </View>

      {/* Dialog box */}
      <View style={styles.dialogBox}>
        {/* NPC name */}
        <Text style={styles.npcName}>PIP — CAREER GUIDE</Text>

        {/* NPC message or typing dots */}
        {loading ? (
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
            <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
            <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
          </View>
        ) : (
          <Text style={styles.npcText}>{currentNpcText}</Text>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, loading && { opacity: 0.5 }]}
            value={input}
            onChangeText={setInput}
            placeholder="Type your answer..."
            placeholderTextColor="rgba(0,0,0,0.35)"
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!loading}
          />
          <Pressable
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={loading || !input.trim()}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </KeyboardAvoidingView>
);
```

- [ ] **Step 6: Replace StyleSheet**

Replace the entire `const styles = StyleSheet.create({...})` block with:

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  portraitArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  portrait: {
    width: 110,
    height: 140,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    borderWidth: 2,
    borderColor: "#BFFF00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#BFFF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
  },
  portraitLabel: {
    fontFamily: "Orbit_400Regular",
    fontSize: 12,
    color: "#aaa",
  },
  dialogBox: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    minHeight: 170,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  npcName: {
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    fontSize: 9,
    letterSpacing: 1.2,
    color: "#9FE800",
    textTransform: "uppercase",
  },
  npcText: {
    fontFamily: "Orbit_400Regular",
    fontSize: 13,
    color: "#111",
    lineHeight: 20,
    minHeight: 42,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 42,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#BFFF00",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: "#BFFF00",
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0514",
  },
});
```

- [ ] **Step 7: Verify the app renders without crash**

```bash
cd /Users/pine/Documents/app_ps/ps_app && pnpm start
```

Open on iOS simulator. The onboarding chat step should show the NPC portrait placeholder and dialog box. No animations yet (loading never happens without a send action). Confirm no TypeScript errors in terminal.

- [ ] **Step 8: Commit**

```bash
git add app/onboarding/StepChat.tsx
git commit -m "feat(onboarding): replace chat bubbles with NPC dialog layout"
```

---

### Task 2: Add loading animations (portrait glow + typing dots)

**Files:**
- Modify: `app/onboarding/StepChat.tsx`

Wire up the `Animated` loops that run when `loading === true`.

- [ ] **Step 1: Add animation useEffect**

After the existing `useEffect` that calls `sendToAI([])` on mount, add:

```tsx
useEffect(() => {
  if (loading) {
    // Portrait glow loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    glowLoop.start();

    // Typing dots loops (staggered)
    const makeDotLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );

    const d1 = makeDotLoop(dot1Anim, 0);
    const d2 = makeDotLoop(dot2Anim, 200);
    const d3 = makeDotLoop(dot3Anim, 400);
    d1.start();
    d2.start();
    d3.start();

    return () => {
      glowLoop.stop();
      glowAnim.setValue(0);
      d1.stop();
      d2.stop();
      d3.stop();
      dot1Anim.setValue(0.2);
      dot2Anim.setValue(0.2);
      dot3Anim.setValue(0.2);
    };
  }
}, [loading]);
```

- [ ] **Step 2: Wire glow animation to portrait Animated.View**

The `<Animated.View style={[styles.portrait]}>` in the JSX needs interpolated animated styles. Replace it with:

```tsx
<Animated.View
  style={[
    styles.portrait,
    {
      shadowOpacity: glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
      }),
      borderColor: glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["#BFFF00", "#9FE800"],
      }),
    },
  ]}
>
  <Text style={styles.portraitLabel}>NPC</Text>
</Animated.View>
```

- [ ] **Step 3: Verify animations in simulator**

```bash
pnpm start
```

In the simulator, navigate to the onboarding chat step. On first load the app calls `sendToAI([])` immediately, so `loading` becomes `true` right away. Verify:
- Portrait border pulses between `#BFFF00` and `#9FE800`
- Portrait shadow glows on iOS
- Three yellow dots appear and animate with staggered opacity
- When the AI responds, dots disappear and the NPC question text appears
- Portrait stops glowing when loading ends

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/StepChat.tsx
git commit -m "feat(onboarding): add portrait glow and typing dot animations"
```

---

### Task 3: Final verification and cleanup

**Files:**
- Modify: `app/onboarding/StepChat.tsx` (if any cleanup needed)

- [ ] **Step 1: Check for unused imports**

Ensure `ScrollView` and `ActivityIndicator` are not in the import list. Run:

```bash
cd /Users/pine/Documents/app_ps/ps_app && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If there are errors, fix them.

- [ ] **Step 2: Manual flow test**

In the simulator, walk through the full chat flow:
1. Arrive at the chat step (portrait glow + dots should immediately appear as AI sends initial greeting)
2. AI question appears → dots stop, text shows
3. Type a response → tap send → glow + dots restart
4. AI replies → dots stop, new question shows
5. Continue until `transition_to_interests` action fires → screen transitions to interests step

Confirm no visual regressions in surrounding onboarding steps (profile, interests screens are untouched).

- [ ] **Step 3: Commit if any fixes were made**

```bash
git add app/onboarding/StepChat.tsx
git commit -m "fix(onboarding): cleanup after NPC dialog implementation"
```
