# NPC Dialog UI — Onboarding "Tell Me About Yourself" Screen

**Date:** 2026-03-22
**Scope:** Replace the chat bubble UI in `app/onboarding/StepChat.tsx` with an NPC dialog style UI. No changes to the underlying AI logic, data flow, or `callOnboardingChat` / `upsertOnboardingState` calls.

---

## What We're Building

The `StepChat` screen currently renders a scrolling chat bubble interface (user bubbles + AI bubbles). We are replacing the visual presentation only — keeping all existing props, state, and API calls intact — with an NPC dialog UI that feels like a visual novel / game interaction.

---

## Design

### Layout

Root: `KeyboardAvoidingView` (flex:1, behavior="padding" on iOS) → inner `View` (flex:1, flexDirection:"column"). Two children stacked vertically:

1. **NPC portrait area** (`flex: 1`, `alignItems: 'center'`, `justifyContent: 'center'`) — takes all remaining space above the dialog box.
2. **Dialog box** (no flex, fixed by content + `minHeight: 170`) — `marginHorizontal: 16`, `marginBottom: Platform.OS === 'ios' ? 32 : 24`.

Progress dots from the parent `index.tsx` remain at the very top (unchanged — rendered in parent, no changes needed to `index.tsx`).

`KeyboardAvoidingView` is kept as the root container, same as current code (`behavior="padding"` on iOS), so the dialog box slides up when the keyboard opens.

### NPC Portrait

- Placeholder: a `View` with `width: 110, height: 140, borderRadius: 20, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: '#BFFF00'`. Center a `Text` label `"NPC"` in `#aaa` for now.
- When the user provides the image, it will be swapped to `<Image source={require('../../assets/npc-pip.png')} style={...} />`. Do not use `require()` yet — the file does not exist.
- Portrait is centered horizontally and vertically within the flex area.

### Dialog Box Contents (top to bottom)

1. **NPC name label** — hardcoded string `"PIP — CAREER GUIDE"`. Uppercase, `fontSize: 9`, `letterSpacing: 1.2`, `color: '#9FE800'`, `fontFamily: 'Orbit_400Regular'`, `fontWeight: '700'`.
2. **NPC message text** — the most recent `model` role message from `bubbles` state (last element where `role === 'model'`). `fontSize: 13`, `color: '#111'`, `lineHeight: 20` (≈1.54), `fontFamily: 'Orbit_400Regular'`. `minHeight: 42`.
3. **Typing dots** — shown instead of NPC message text during loading. Three `Animated.View` dots in a `flexDirection: 'row'` container with `gap: 4`, each `width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#BFFF00'`. All three start animating simultaneously when `loading` becomes true, each looping independently: `Animated.loop(Animated.sequence([Animated.timing(dotAnim, {toValue:1, duration:600, delay: N, useNativeDriver:true}), Animated.timing(dotAnim, {toValue:0.2, duration:600, useNativeDriver:true})]))` where N is `0`, `200`, `400` for dots 1, 2, 3 respectively. Animate `opacity` from initial value `0.2` to `1` and back. Stop and reset opacity to `0.2` when `loading` becomes false.
4. **Divider** — `height: 1, backgroundColor: 'rgba(0,0,0,0.06)'`.
5. **Input row** — `TextInput` (`flex: 1`, `backgroundColor: '#FDFFF5'`, `borderWidth: 1`, `borderColor: '#e0e0e0'`, `borderRadius: 10`, `paddingHorizontal: 10`, `paddingVertical: 8`, `fontSize: 12`, `fontFamily: 'Orbit_400Regular'`, `color: '#111'`, `multiline`, `maxHeight: 80`) + send button (`backgroundColor: '#BFFF00'`, `width: 30`, `height: 30`, `borderRadius: 8`, arrow `"→"`, `fontSize: 16`, `fontWeight: '700'`, `color: '#0a0514'`).

Dialog box outer style: `backgroundColor: 'white'`, `borderWidth: 1.5`, `borderColor: '#e5e7eb'`, `borderRadius: 20`, `padding: 16`, `gap: 10`, React Native shadow: `shadowColor: '#000'`, `shadowOffset: {width:0,height:2}`, `shadowOpacity: 0.07`, `shadowRadius: 12`, `elevation: 3`.

### Loading State

When `loading === true`:
- **Portrait glow:** `glowAnim` is an `Animated.Value` starting at `0`. Wrap the sequence in `Animated.loop`: `Animated.loop(Animated.sequence([Animated.timing(glowAnim, {toValue:1, duration:600, easing:Easing.inOut(Easing.ease), useNativeDriver:false}), Animated.timing(glowAnim, {toValue:0, duration:600, easing:Easing.inOut(Easing.ease), useNativeDriver:false})]))`. Start the loop when `loading` becomes true; stop and reset to 0 when `loading` becomes false. Interpolate `glowAnim` to `shadowOpacity` on the portrait: `0 → 0.6`. Also interpolate `borderColor`: `'#BFFF00' → '#9FE800'` (use `useNativeDriver:false`). On Android where shadow doesn't work, the border color pulse still provides visual feedback.
- **Typing dots:** Shown instead of NPC text.
- **Input:** `editable={false}`, `opacity: 0.5`.
- **Send button:** `opacity: 0.3`, not pressable (`disabled={true}`).

### Question/Answer Flow

- Only the current NPC question is shown — defined as the last message in `bubbles` where `role === 'model'`. If no model message exists yet (initial state before first AI response), show an empty string or nothing — the typing dots loading state covers this.
- User types → taps send → `handleSend()` called → `loading = true` → typing dots + portrait glow → AI responds → new model message replaces old → `loading = false`.
- No chat history is shown on screen. No "edit last message" feature (removed).
- On `action === "transition_to_interests"`: the existing `setTimeout(() => onComplete(), 1200)` is kept. During those 1200ms the last NPC message remains visible (no special exit animation needed).

### Error Handling

On API error, push a model message to `bubbles` as currently done (the error string becomes the displayed NPC text). The error text appears in the dialog box in place of the normal question, using the same text style as normal NPC messages (no distinct error color or styling needed).

---

## Component Changes

### `StepChat.tsx`

**Remove:**
- `ScrollView` import and usage
- All bubble styles (`bubble`, `bubbleAI`, `bubbleUser`, `bubbleText`, `bubbleTextAI`, `bubbleTextUser`)
- `editHint` style and tap-to-edit logic (`handleEditMessage`)
- `header` / `headerText` styles and the "Tell me about yourself" header `View`
- `scrollRef`

**Keep:**
- All props (unchanged interface)
- `bubbles` state and derivation from `chatHistory`
- `sendToAI`, `handleSend` logic (unchanged)
- `loading`, `input`, `setInput` state
- `KeyboardAvoidingView` as root

**Add:**
- `glowAnim = useRef(new Animated.Value(0)).current`
- Three dot opacity `Animated.Value`s: `dot1Anim`, `dot2Anim`, `dot3Anim`
- `useEffect` to start/stop animations when `loading` changes
- NPC portrait placeholder `View` (with `Animated.View` wrapper for glow)
- Dialog box layout
- Derived value: `currentNpcText = bubbles.filter(b => b.role === 'model').at(-1)?.text ?? ''`

---

## Out of Scope

- Changes to `callOnboardingChat`, `upsertOnboardingState`, or any other onboarding steps.
- Actual NPC image asset (placeholder used; user will supply later).
- Any changes to `index.tsx`, `StepProfile`, `StepInterests`, `StepCareers`, `StepTcasProfile`, `StepSettings`.
- Tablet / landscape layout adaptation.
- Accessibility labels (can be added as a follow-up).
