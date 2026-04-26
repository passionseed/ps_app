# Chat Comic UX Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Redesign the ChatComicViewer to feel like a real group chat — subtle animations, immersive full-screen layout, and natural tap-to-reveal pacing.

**Architecture:** Replace the current card-based container with a full-screen chat experience. Simplify animations to a single scale-pop. Add shimmer hint for first message. Typing indicator only on sender change. No sticky header, no tap overlay — just pure chat.

**Tech Stack:** React Native, Reanimated, Expo Haptics

---

## Task 1: Redesign ChatComicViewer Root Layout

**Files:**
- Modify: `components/Hackathon/ChatComicViewer.tsx`

**Step 1: Remove card styling, make full-screen**

Change `styles.root` from card (border, radius, CARD_BG) to full-screen:

```typescript
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG, // #03050a
  },
```

Remove `minHeight`, `borderRadius`, `borderWidth`, `overflow: "hidden"`.

**Step 2: Remove sticky header behavior**

The header should scroll with content. Change header style to not be sticky:

```typescript
header: {
  paddingHorizontal: Space.lg,
  paddingTop: Space.lg,
  paddingBottom: Space.sm,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(74,107,130,0.2)",
  backgroundColor: BG,
},
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "ChatComic|chat_comic" | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add components/Hackathon/ChatComicViewer.tsx
git commit -m "feat: make chat comic full-screen, remove card styling"
```

---

## Task 2: Simplify Message Animation to Scale Pop

**Files:**
- Modify: `components/Hackathon/ChatComicViewer.tsx`

**Step 1: Replace complex animation with simple scale pop**

In `ChatBubble`, replace the current `translateX + opacity + scale` animation with just a scale pop:

```typescript
function ChatBubble({
  message,
  index,
  isRevealed,
}: {
  message: ChatComicMessage;
  index: number;
  isRevealed: boolean;
}) {
  const fromMentor = isMentor(message.sender);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (isRevealed) {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    }
  }, [isRevealed, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  if (!isRevealed) return null;
  // ... rest of render
}
```

**Step 2: Remove unused imports**

Remove `useAnimatedStyle`, `useSharedValue`, `withSpring`, `withTiming` if no longer used elsewhere. Keep them if used by TypingIndicator.

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "ChatComic|chat_comic" | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add components/Hackathon/ChatComicViewer.tsx
git commit -m "feat: simplify chat bubble to scale-pop animation"
```

---

## Task 3: Add Shimmer Hint for First Message

**Files:**
- Modify: `components/Hackathon/ChatComicViewer.tsx`

**Step 1: Create ShimmerHint component**

Add a shimmer component at the bottom of the chat that suggests more content:

```typescript
function ShimmerHint({ visible }: { visible: boolean }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
  }, [visible, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.shimmerHint, shimmerStyle]}>
      <View style={styles.shimmerLine} />
      <AppText style={styles.shimmerText}>แตะเพื่อดูข้อความถัดไป</AppText>
    </Animated.View>
  );
}
```

**Step 2: Add shimmer styles**

```typescript
shimmerHint: {
  alignItems: "center",
  paddingVertical: 16,
  gap: 8,
},
shimmerLine: {
  width: 40,
  height: 4,
  borderRadius: 2,
  backgroundColor: CYAN,
},
shimmerText: {
  fontSize: 12,
  color: "rgba(145,196,227,0.5)",
  fontFamily: "BaiJamjuree_400Regular",
},
```

**Step 3: Show shimmer only when there's more to reveal**

In the main component, show shimmer when `!isComplete && revealedCount < messages.length`:

```typescript
<ShimmerHint visible={!isComplete && revealedCount < messages.length} />
```

**Step 4: Remove old tap overlay**

Delete the old `tapOverlay` / `tapHint` / `tapHintText` styles and the `<Pressable style={styles.tapOverlay}>` component.

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "ChatComic|chat_comic" | head -20`
Expected: No errors

**Step 6: Commit**

```bash
git add components/Hackathon/ChatComicViewer.tsx
git commit -m "feat: add shimmer hint, remove tap overlay"
```

---

## Task 4: Typing Indicator Only on Sender Change

**Files:**
- Modify: `components/Hackathon/ChatComicViewer.tsx`

**Step 1: Track sender changes**

Add helper to check if next message is from a different sender:

```typescript
function shouldShowTyping(
  messages: ChatComicMessage[],
  revealedCount: number
): boolean {
  if (revealedCount >= messages.length) return false;
  if (revealedCount === 0) return false; // first message shows immediately
  const prevSender = messages[revealedCount - 1].sender;
  const nextSender = messages[revealedCount].sender;
  return prevSender !== nextSender;
}
```

**Step 2: Update reveal logic**

In `revealNext`, only show typing when sender changes:

```typescript
const revealNext = useCallback(() => {
  if (isComplete || isTyping) return;

  const showTyping = shouldShowTyping(messages, revealedCount);

  if (showTyping && revealedCount < messages.length) {
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTimeout(() => {
      setIsTyping(false);
      setRevealedCount((prev) => {
        const next = prev + 1;
        if (next >= messages.length) setIsComplete(true);
        return next;
      });
      scrollToBottom();
    }, 700);
  } else {
    setRevealedCount((prev) => {
      const next = prev + 1;
      if (next >= messages.length) setIsComplete(true);
      return next;
    });
    scrollToBottom();
  }
}, [isComplete, isTyping, messages, revealedCount, scrollToBottom]);
```

**Step 3: Remove showTyping from metadata**

The `show_typing_indicator` metadata field is no longer used. Remove it from the logic (keep in type for backward compat).

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "ChatComic|chat_comic" | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add components/Hackathon/ChatComicViewer.tsx
git commit -m "feat: typing indicator only on sender change"
```

---

## Task 5: Add Faint Gradient Background

**Files:**
- Modify: `components/Hackathon/ChatComicViewer.tsx`

**Step 1: Import LinearGradient**

```typescript
import { LinearGradient } from "expo-linear-gradient";
```

**Step 2: Add gradient behind chat**

Wrap the ScrollView with a subtle gradient:

```typescript
return (
  <View style={styles.root}>
    <LinearGradient
      colors={["rgba(5,10,20,1)", "rgba(3,5,10,1)", "rgba(5,10,20,1)"]}
      locations={[0, 0.5, 1]}
      style={StyleSheet.absoluteFillObject}
    />
    {/* rest of content */}
  </View>
);
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "ChatComic|chat_comic" | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add components/Hackathon/ChatComicViewer.tsx
git commit -m "feat: add faint gradient background to chat"
```

---

## Task 6: Update Activity Screen Integration

**Files:**
- Modify: `app/(hackathon)/activity/[nodeId].tsx`

**Step 1: Ensure chat renders full-width**

The chat should span the full width with no padding from parent. The current integration:

```typescript
const chatComic = getChatComicContent(item);
if (chatComic) {
  return (
    <ChatComicViewer
      data={chatComic}
      metadata={item.metadata as ChatComicMetadata}
      title={item.content_title}
    />
  );
}
```

This is already correct — no wrapper needed.

**Step 2: Remove negative margin hack if present**

Check that no `marginHorizontal: -Space.lg` or similar hacks exist around the chat.

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "ChatComic|chat_comic" | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add app/(hackathon)/activity/[nodeId].tsx
git commit -m "feat: chat comic renders full-width in activity"
```

---

## Task 7: Final Polish — Bubble Spacing & Typography

**Files:**
- Modify: `components/Hackathon/ChatComicViewer.tsx`

**Step 1: Increase bubble max width**

```typescript
bubbleWrap: {
  flexDirection: "row",
  alignItems: "flex-end",
  maxWidth: "92%", // was 85%
  gap: 6,
},
```

**Step 2: Increase font size slightly**

```typescript
bubbleText: {
  fontSize: 15, // was 14
  lineHeight: 22, // was 20
  color: WHITE75,
  fontFamily: "BaiJamjuree_400Regular",
},
```

**Step 3: Add more vertical spacing between messages**

```typescript
scrollContent: {
  paddingHorizontal: Space.md,
  paddingVertical: Space.md,
  gap: Space.md, // was Space.sm
  paddingBottom: 80,
},
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "ChatComic|chat_comic" | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add components/Hackathon/ChatComicViewer.tsx
git commit -m "feat: polish bubble spacing and typography"
```

---

## Testing Checklist

- [ ] Open a Phase 2 activity with chat_comic content
- [ ] First message visible immediately
- [ ] Shimmer hint visible at bottom
- [ ] Tap anywhere → next message appears with scale-pop
- [ ] Typing indicator shows only when sender changes
- [ ] Images render as thumbnails, tap to expand
- [ ] Videos show play icon + URL
- [ ] All messages revealed → chat ends naturally
- [ ] Scroll past chat to see assessments
- [ ] No console errors

## Design Doc Reference

See `docs/plans/2026-04-25-chat-comic-ux-redesign.md` for full design rationale.
