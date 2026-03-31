---
name: react-native-skia
description: Use @shopify/react-native-skia with Expo and react-native-reanimated for GPU-backed 2D drawing, shaders, and beautiful, jank-safe animations. Combines technical performance rules with high-end design principles (motion, texture, shaders) to build visually striking, non-generic mobile UI.
---

# React Native Skia (Design & Performance)

Authoritative install and platform requirements: [React Native Skia — Installation](https://shopify.github.io/react-native-skia/docs/getting-started/installation). Prefer the official docs for API details ([Canvas](https://shopify.github.io/react-native-skia/docs/canvas/canvas), [Animations](https://shopify.github.io/react-native-skia/docs/animations/animations)).

## 📚 Mandatory Documentation Workflow

**CRITICAL RULE**: Do not hallucinate Skia APIs. The API surface is highly specific and frequently updated.
**Before writing any code**, you MUST query the official documentation for the exact components you plan to use.

Use your web fetch/search tools or documentation MCPs (like Context7) to read the official docs at `https://shopify.github.io/react-native-skia/docs/...`
For example, if you need to draw a path or use a mask, first fetch:
- `https://shopify.github.io/react-native-skia/docs/shapes/path`
- `https://shopify.github.io/react-native-skia/docs/mask/mask`
- `https://shopify.github.io/react-native-skia/docs/animations/animations`

### Available Documentation Categories
Search within these paths when looking for specific capabilities:
- `/docs/canvas/` (Canvas, Group, Painting)
- `/docs/shapes/` (Path, Polygons, Ellipses, Vertices, Patch, Atlas)
- `/docs/text/` (Text, TextPath, Paragraph)
- `/docs/images/` (Image, useImage)
- `/docs/shaders/` (LinearGradient, RadialGradient, SweepGradient, TwoPointConicalGradient, FractalNoise, RuntimeShader)
- `/docs/image-filters/` (Blur, DropShadow, ColorMatrix, DisplacementMap, etc.)
- `/docs/animations/` (useValue, useSharedValueEffect, runSpring, etc.)

---

## 🎨 Design Philosophy & Aesthetics

Use Skia when the quality of the interface depends on **atmosphere, texture, fluid motion, and visual depth** rather than standard component layout. Skia helps escape generic "AI slop" by enabling high-fidelity, bespoke visuals that feel premium and deliberate.

### 1. Visual Depth over Flatness
- **Atmosphere & Texture**: Don't just draw solid shapes. Use Skia's `RuntimeShader` to generate subtle grain, noise textures, or mathematical gradients (e.g., fluid/mesh gradients).
- **Glassmorphism & Blurs**: Use `BackdropFilter` and `Blur` to create soft, frosted-glass overlays that respond dynamically to what's underneath them. 
- **Layering & Masking**: Use masks and blend modes (`BlendMode.Overlay`, `BlendMode.Multiply`) to create lighting effects, dramatic shadows, or cut-out reveals.

### 2. Motion as a Material
- **Fluid & Organic**: Combine Skia with Reanimated's spring physics (`withSpring`). Drive organic shapes (like animated blobs, morphing SVG paths, or liquid UI transitions) using shared values.
- **Interaction-Driven**: Bind Skia uniforms or path variables directly to gesture values (`useSharedValue` + Pan/Scroll gestures). The UI should feel like a physical, touchable surface that bends and reacts, not just a static image.
- **Restraint**: A single, beautifully orchestrated Canvas hero element (like a breathing background or an interactive 3D-like shader) is better than scattering 10 different distracting animations across the screen.

### 3. Typography & Shapes
- **Text on Paths**: Wrap custom, distinctive fonts around curves or complex shapes.
- **Geometric vs Organic**: Choose a bold direction. Either go brutally geometric with crisp, intersecting primitives, or entirely organic with soft, continuous curves and gradients.

---

## 🛠️ Technical Implementation & Performance

To make beautiful designs feel premium, they must run flawlessly at 60/120fps. Jank kills the illusion.

### Reanimated Integration (Critical)
Goals: animate on the **UI thread**, avoid React re-renders per frame, avoid allocating new objects every frame.

- Drive Skia props directly from **shared values** or **derived values** from Reanimated. **NEVER** use `setState` in a `requestAnimationFrame` loop.
- Pass Reanimated shared values directly into Skia hooks and uniforms (e.g., passing a shared time value `t` into a custom fragment shader).
- Keep **worklets** for gesture math; pass results into Skia-bound shared values.
- **Memory**: Do **not** create new `SkPath` objects or large arrays inside hot paths (like per-frame hooks) unless the API strictly requires it. Reuse and mutate paths using Skia's provided utilities where safe.

### When to use / not to use Skia

- **DO use for**: Hero visual anchors, fluid mesh backgrounds, custom interactive charts, drawing apps, image filters, and runtime shaders.
- **DON'T use for**: Mostly static icons (use `react-native-svg`), standard app layout (use React Native `View`s), or simple opacity/translate transitions that `Animated.View` handles perfectly.

---

## ⚙️ Setup & Workflow for This Repository

This repo (Passion Seed) uses **Expo 55, React 19, React Native 0.83, Reanimated 4, and Skia 2.x**.

### Version Compatibility
| React Native / React | Skia package |
|---------------------|--------------|
| `react-native >= 0.79`, `react >= 19` | Current `@shopify/react-native-skia` major (e.g. 2.x) |
| `react-native <= 0.78`, `react <= 18` | `@shopify/react-native-skia` **1.12.4 or below** |

### Install & Build
1. **pnpm** + `postinstall`: `npx @shopify/react-native-skia postinstall` is handled in `package.json`.
2. Add/align versions with Expo SDK: `npx expo install @shopify/react-native-skia`.
3. After native changes (Skia is a native module), run `expo prebuild` / `expo run:ios` / `expo run:android`.
4. **CMake / NDK**: If Android build fails, check the error for required CMake version, and install via Android Studio SDK Manager. Ensure `$ANDROID_NDK` is set.
5. **Proguard**: For Android release, add `-keep class com.shopify.reactnative.skia.** { *; }` if minification is enabled.

### Code Review Checklist
1. **Design Quality**: Does this effect feel premium and deliberate? Is there a clear focal point?
2. **Animation Architecture**: Does animation bypass React state? (Good: `useSharedValue` → Skia props. Bad: `setState` each frame).
3. **Canvas Boundaries**: Is the Canvas appropriately sized (not unnecessarily full-screen behind long scrollable lists)?
4. **Asset Loading**: Are images/fonts loaded with `useImage` / `useFont` and stable across renders?
5. **Performance Traps**: Are there any per-frame `new` object allocations in draw loops?
6. **Web/Tests**: Skia on Web uses CanvasKit. Jest requires `jestEnv.js` and `transformIgnorePatterns` config per the Skia docs.

---

## Example: Bringing Design & Performance Together
When asked to build a "loading indicator", don't just spin a circle.
- **Concept**: A glowing, breathing orb that distorts slightly as if underwater.
- **Execution**: A single `<Canvas>` with a `<Circle>`, using a `<RuntimeShader>` to apply noise-based distortion to the edges, driven by a `withRepeat(withTiming(...))` shared value in Reanimated.
- **Result**: Zero JS thread impact, 120fps, visually distinct, premium feel.