# The Next Decade Hackathon Design System

> **Version 1.0**
>
> This document outlines the design patterns and UI conventions for the Hackathon section of the PassionSeed platform. The hackathon uses a distinct, independent theme separate from the main PassionSeed Dawn/Dusk system.

---

## Core Concept: Bioluminescent Ocean

While the main platform uses sky-based themes (Dawn/Dusk), the Hackathon is an immersive, cinematic **underwater, bioluminescent experience**. 

The sensation is: *diving into the unknown, guided by organic, glowing light.*

**Key Characteristics:**
- **Deep, dark backgrounds** representing the ocean depths (`#03050a`)
- **Bioluminescent glows** using vibrant cyans, blues, and purples
- **Organic, fluid motion** with floating elements, jellyfish, and continuous wave animations
- **Glassmorphism** to represent looking through water or high-tech aquatic visors

---

## 1. Design Tokens (Color Palette)

The hackathon uses a highly specific subset of colors. Avoid using standard gray or neutral colors unless deeply tinted with blue.

### Primary Colors (Bioluminescent Glows)
| Token Concept | Hex Code | Usage |
|---------------|----------|-------|
| `hack-cyan` | `#91C4E3` | Primary accent, primary glows, Track 1 theme |
| `hack-blue` | `#65ABFC` | Bright highlights, active states, text links |
| `hack-purple-light` | `#A594BA` | Secondary accent, Track 2 theme, contrasting glows |
| `hack-purple-muted` | `#9D81AC` | Primary CTA buttons, interactive highlights |

### Backgrounds & Surfaces (The Depths)
| Token Concept | Hex Code | Usage |
|---------------|----------|-------|
| `hack-bg-deep` | `#03050a` | Main page background (deepest ocean) |
| `hack-bg-card` | `#0d1219` | Base color for glass cards |
| `hack-bg-elevated` | `#1a2530` | Form inputs, elevated panels |

### Borders & Muted Elements
| Token Concept | Hex Code | Usage |
|---------------|----------|-------|
| `hack-border-light` | `#7aa4c4` | Active borders, focus rings |
| `hack-border-muted` | `#5a7a94` | Standard borders, muted icon colors |
| `hack-border-dark` | `#4a6b82` | Subtle borders, subtle dividers |

---

## 2. Typography

Typography in the hackathon section blends technical precision with organic legibility.

| Font Family | Font Name | Usage |
|-------------|-----------|-------|
| **Bai Jamjuree** | `BaiJamjuree-Regular` / `BaiJamjuree-Bold` | English headings, button text, eyebrows, standard UI |
| **Reenie Beanie** | `ReenieBeanie-Regular` | Handwritten-style accents and subheadings |
| **Space Mono** | `SpaceMono-Regular` | Team lobby codes, numbers, track IDs |

**Typographic Patterns:**
- **Eyebrows:** Bai Jamjuree (Bold or Medium), small size (`fontSize: 12`), generous letter spacing (`letterSpacing: 2` or more), uppercase. Example: `<Text style={{ fontFamily: 'BaiJamjuree-Bold', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(145,196,227,0.5)' }}>`
- **Glowing Headings:** Use text shadows in React Native (`textShadowColor`, `textShadowRadius`, `textShadowOffset`) or `@shopify/react-native-skia` for advanced glowing effects.
- **Lobby Codes:** Large, monospaced, with extreme letter spacing (`letterSpacing: 4+`).

---

## 3. Component Patterns

### Glass Cards
Cards are the primary container for content. In React Native, achieve this look using `BlurView` combined with an `expo-linear-gradient` overlay and subtle borders. 

**React Native Implementation:**
```tsx
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

<BlurView intensity={30} tint="dark" style={styles.cardContainer}>
  <LinearGradient 
    colors={['rgba(13, 18, 25, 0.9)', 'rgba(18, 28, 41, 0.8)']} 
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.cardGradient}
  >
    {/* Content */}
  </LinearGradient>
</BlurView>
```

**Interactive State (Glowing Border):**
Mobile doesn't have hover, so glows can be driven by `Pressable` activity (press in/out) using `react-native-reanimated` or by creating a slightly larger background layer with a high blur mask using `@shopify/react-native-skia`.

### Buttons
Buttons should feel tactile but ethereal, utilizing glow and subtle scaling. Use `Pressable` combined with `react-native-reanimated` for smooth touch feedback.

**Primary CTA:**
```tsx
const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: '#9D81AC',
    borderRadius: 99,
    paddingHorizontal: 48,
    paddingVertical: 24,
    shadowColor: '#9D81AC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20, 
    elevation: 8, // Android fallback
  }
});
// Animate scale (e.g., to 1.05) using Reanimated on press
```

**Secondary Action / Outline:**
```tsx
const styles = StyleSheet.create({
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  }
});
// Animate border color to 'rgba(145, 196, 227, 0.5)' on press.
```

### Form Inputs
Inputs use a slightly elevated, highly transparent background to stand out from the deep background, with glowing focus rings driven by the active focus state.

```tsx
const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(26, 37, 48, 0.8)',
    color: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(90, 122, 148, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputFocused: {
    borderColor: '#7aa4c4',
    // Apply additional shadow wrapper if a glow effect is needed
  }
});
```

---

## 4. Animation Patterns

Animations are crucial to the hackathon's underwater theme. Motion should never be abrupt; it should feel like moving through water. Avoid immediate snapping.

### React Native Reanimated & Skia 
Standard animations are built using `react-native-reanimated` and `@shopify/react-native-skia`.

- **Continuous Float:** Use `withRepeat(withTiming(value, { duration: 6000, easing: Easing.inOut(Easing.ease) }), -1, true)` applied to `transform: [{ translateY }]`.
- **Twinkle:** Animate opacity using `withRepeat(withSequence(...))`.
- **Title Glow:** Animate opacity and shadow properties on mount using `withTiming`.
- **Waves:** Prefer using `@shopify/react-native-skia` with shaders or animated paths for fluid, performant waves without dropping frames.

### Screen Transitions
We use Expo Router for navigation and `react-native-reanimated` for shared element transitions or custom enter/exit animations. 
- **The "Water Fill" Transition:** Can be achieved by mounting a full-screen `Animated.View` overlay that translates its translateY position upwards, timed alongside route changes.

### Reveal & Stagger
When components mount (like lists or text blocks), they should float up and fade in gradually:
```tsx
import Animated, { FadeInUp } from 'react-native-reanimated';

// Example for staggering items in a list:
<Animated.View entering={FadeInUp.duration(600).delay(index * 100)}>
  {/* Content */}
</Animated.View>
```

---

## 5. Backgrounds & Environments

### The Starfield / Particle Background
Most screens utilize a specialized `@shopify/react-native-skia` Canvas for performant particle effects, or lightweight `Animated.View` components to simulate twinkling stars.

### Ambient Glow Orbs
Large, highly blurred shapes placed absolutely in the background to create bioluminescent hot spots. In React Native, `@shopify/react-native-skia`'s `Blur` mask allows for beautiful, performant glows:
```tsx
import { Canvas, Circle, Blur } from '@shopify/react-native-skia';

<Canvas style={StyleSheet.absoluteFill}>
  <Circle cx={150} cy={200} r={200} color="rgba(145, 196, 227, 0.05)">
    <Blur blur={100} />
  </Circle>
</Canvas>
```
Alternatively, multiple layered, highly transparent radial gradients can simulate this without Skia if extreme performance is needed, though Skia is preferred.

### Assets & Illustrations
Always use the specialized Hackathon assets (Jellyfish, Clione, custom icons) from the `assets/hackathon/Creature/` directory. For SVGs, use `react-native-svg` or Skia's `ImageSVG`. They should typically be wrapped in an `Animated.View` applying a continuous, slow `float` animation to enhance the oceanic sensation.

---

## 6. Anti-Patterns

### No Accent Bars
Do **not** use thick colored left-border bars (accent bars) on cards or feedback snippets. They feel heavy and out of place in the bioluminescent aesthetic. Status is communicated through:
- Tinted icon colors inside subtle icon circles
- Small status pill badges with tinted backgrounds
- CTA button style differentiation (e.g. purple glow for revision actions)

### No Truncated Feedback
Mentor feedback text should always be shown in full on card views. Truncating feedback to 2–3 lines hides critical information the student needs to act on. If space is a concern, use a collapsible section — never silently cut text.