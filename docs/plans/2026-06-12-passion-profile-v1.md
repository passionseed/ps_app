# Passion-Identity Profile v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the Class-independent Passion-Identity Profile v1: ikigai 4-pillar compass + growth + share card + public handle/viewer + seedling identity state, plus all plumbing (DB migration, RLS, RPC, measurement events, cache invalidation, tests).

**Architecture:** New `public_profiles` table (1:1 with `auth.users`) in the pseed shared DB (supabase/migrations is a symlink). Privacy default = PRIVATE. RLS is the entire security boundary. App talks directly to Supabase with anon key. Growth count = server-derived via Supabase RPC. Class identity hero renders Seedling until the 6-Class taxonomy ships.

**Tech Stack:** TypeScript, React Native (Expo Router), Supabase (PostgreSQL + RPC + RLS), Vitest, react-native-view-shot for share capture.

**Branch:** `feat/passion-profile-v1` — already has ET2 artifacts:
- `types/publicProfile.ts` — data contract (ClassSlug, PublicProfile, IdentityStage)
- `lib/publicProfile.ts` — getPublicProfile, deriveIdentityStage, fetchGrowthCount, buildBecomingLine, isSectionPublished
- `tests/public-profile.test.ts` — 13/13 green

**Key invariants (non-negotiable):**
- Seedling ≠ error. Load failure → retry UI, never silently falls into seedling.
- growth_count from `public_profile_growth_count` RPC (completed quests) NOT client user_events.
- Per-section privacy = one transactional RPC, not multi-column client updates.
- Share card is NEW (not Hackathon card); capture hook reused only; failure shows toast.
- Cache invalidation: class-pick in Browse must bust the 10-min profileScreenSnapshot cache.
- Reveal beat: persisted "already revealed" flag + reduced-motion + replay rule.

---

## Task ET1: public_profiles migration + RLS + privacy RPC (pseed repo)

**Files:**
- Create: `supabase/migrations/<timestamp>_public_profiles.sql` (pseed repo; symlinked from ps_app)

**Step 1: Check pseed migrations path**

```bash
ls /Users/bunyasit/dev/passionseed/ps_app/supabase/migrations | tail -5
# This symlink resolves to pseed — create migration there
readlink /Users/bunyasit/dev/passionseed/ps_app/supabase
```

**Step 2: Write migration**

Filename: `$(date +%Y%m%d%H%M%S)_public_profiles.sql`

```sql
-- public_profiles: 1:1 with auth.users, public-safe columns only (no PII)
CREATE TABLE public_profiles (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle          text,
  class_slug      text CHECK (class_slug IN ('builder','strategist','creator','analyst','healer','producer')),
  subclass_slug   text,
  current_path    text,
  evolution_stage integer NOT NULL DEFAULT 0 CHECK (evolution_stage >= 0),
  growth_count    integer NOT NULL DEFAULT 0 CHECK (growth_count >= 0),
  is_public       boolean NOT NULL DEFAULT false,
  published_sections text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Handle: 3-30 chars, lowercase alphanumeric + _ -
ALTER TABLE public_profiles ADD CONSTRAINT handle_format
  CHECK (handle IS NULL OR handle ~ '^[a-z0-9_-]{3,30}$');

CREATE UNIQUE INDEX public_profiles_handle_idx
  ON public_profiles(handle) WHERE handle IS NOT NULL;

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER public_profiles_updated_at
  BEFORE UPDATE ON public_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- RLS
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

-- Owner: full access to own row
CREATE POLICY "owner_all" ON public_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read: only is_public=true rows (table is PII-free by construction)
CREATE POLICY "public_read" ON public_profiles
  FOR SELECT
  USING (is_public = true);

-- Transactional privacy RPC — rewrites published_sections + is_public atomically
CREATE OR REPLACE FUNCTION set_profile_visibility(
  p_user_id          uuid,
  p_is_public        boolean,
  p_published_sections text[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT (p_published_sections <@ ARRAY['class','ikigai','growth']::text[]) THEN
    RAISE EXCEPTION 'invalid section';
  END IF;
  INSERT INTO public_profiles (user_id, is_public, published_sections)
    VALUES (p_user_id, p_is_public, p_published_sections)
    ON CONFLICT (user_id)
    DO UPDATE SET
      is_public          = EXCLUDED.is_public,
      published_sections = EXCLUDED.published_sections;
END; $$;

GRANT EXECUTE ON FUNCTION set_profile_visibility(uuid, boolean, text[]) TO authenticated;
```

**Step 3: Apply and verify**

```bash
# From pseed root (where supabase CLI is configured):
supabase migration up
# Then check:
supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name='public_profiles';"
```

**Step 4: Commit in pseed repo**

```bash
git add supabase/migrations/
git commit -m "feat(profile): public_profiles table + RLS + set_profile_visibility RPC (ET1)"
```

---

## Task ET2 SQL: growth_count RPC (pseed repo) — SQL counterpart of already-built client code

**Files:**
- Create: `supabase/migrations/<timestamp>_growth_count_rpc.sql`

**Step 1: Find the correct enrollment table**

```sql
-- Run in psql / Studio:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name ILIKE '%enroll%';
-- Also check for completion columns:
\d path_lab_enrollments
```

**Step 2: Write RPC migration**

```sql
-- growth_count = completed path enrollments (server-authoritative)
-- Adjust table/column names to match actual schema after Step 1.
CREATE OR REPLACE FUNCTION public_profile_growth_count(p_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer
     FROM path_lab_enrollments
     WHERE user_id = p_user_id
       AND status = 'completed'),
    0
  );
$$;

GRANT EXECUTE ON FUNCTION public_profile_growth_count(uuid) TO anon, authenticated;
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(profile): public_profile_growth_count RPC from completed enrollments (ET2-sql)"
```

---

## Task ET3: Profile v1 surface UI

**Files:**
- Create: `components/PassionIdentityHero.tsx`
- Create: `components/GrowthBadge.tsx`
- Modify: `app/(tabs)/profile.tsx`

**Step 1: Write PassionIdentityHero.tsx**

Full implementation — handles 4 states: loading (shimmer), error (retry), seedling, revealed.

Design tokens from plan:
- Hero bg: `#03050a`; glow: `rgba(145,196,227,0.15)`; accent: `#9D81AC`
- Text: near-white `#E8EDF2` for body (≥4.5:1 on `#03050a`)
- CTAs: `minHeight: 44` always (touch target requirement)
- Long text: `numberOfLines={1}` for name, `numberOfLines={2}` for becoming line
- `accessibilityLabel` on badge: `"Passion identity: Seedling"` or `"Passion identity: Builder"` etc.

```tsx
// components/PassionIdentityHero.tsx
import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { AppText as Text } from './AppText';
import type { PublicProfile, IdentityStage } from '../types/publicProfile';

export interface PassionIdentityHeroProps {
  stage: IdentityStage;
  profile: PublicProfile | null;
  becomingLine: string | null;
  loading: boolean;
  error: boolean;
  onExplore: () => void;
  onRetry: () => void;
  onShare: () => void;
  shareDisabled: boolean;
}

export function PassionIdentityHero(props: PassionIdentityHeroProps) {
  const { loading, error, stage } = props;
  if (loading) return <HeroLoading />;
  if (error) return <HeroError onRetry={props.onRetry} />;
  if (stage === 'seedling') return <HeroSeedling onExplore={props.onExplore} />;
  return <HeroRevealed {...props} />;
}

function HeroLoading() {
  return (
    <View style={styles.hero} accessibilityLabel="Loading your passion identity">
      <ActivityIndicator color="#91C4E3" />
      <Text style={styles.loadingText}>Reading your signals…</Text>
    </View>
  );
}

function HeroError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.errorText}>Couldn't load your profile</Text>
      <Pressable
        onPress={onRetry}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel="Retry loading profile"
      >
        <Text style={styles.ctaText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function HeroSeedling({ onExplore }: { onExplore: () => void }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.badge} accessibilityLabel="Passion identity: Seedling">🌱</Text>
      <Text style={styles.identityText}>Your identity is forming</Text>
      <Text style={styles.subText}>Explore 1 seed to begin</Text>
      <Pressable
        onPress={onExplore}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel="Explore seeds"
      >
        <Text style={styles.ctaText}>Explore →</Text>
      </Pressable>
    </View>
  );
}

function HeroRevealed({ profile, becomingLine, onShare, shareDisabled }: PassionIdentityHeroProps) {
  const classLabel = profile?.class_slug
    ? profile.class_slug.charAt(0).toUpperCase() + profile.class_slug.slice(1)
    : '';
  return (
    <View style={styles.hero}>
      <View
        style={styles.classBadge}
        accessibilityLabel={`Passion identity: ${classLabel}`}
        accessible
      >
        <Text style={styles.classBadgeText}>{classLabel}</Text>
      </View>
      {becomingLine ? (
        <Text style={styles.becomingLine} numberOfLines={2}>{becomingLine}</Text>
      ) : null}
      <Pressable
        onPress={onShare}
        disabled={shareDisabled}
        style={[styles.cta, shareDisabled && styles.ctaDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Share your passion identity"
        accessibilityState={{ disabled: shareDisabled }}
      >
        <Text style={styles.ctaText}>Share</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#03050a',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: '#91C4E3', fontFamily: 'LibreFranklin_400Regular', fontSize: 14 },
  errorText: { color: '#E8EDF2', fontFamily: 'LibreFranklin_400Regular', fontSize: 16 },
  badge: { fontSize: 48 },
  identityText: { color: '#E8EDF2', fontFamily: 'LibreFranklin_700Bold', fontSize: 20, textAlign: 'center' },
  subText: { color: '#9D81AC', fontFamily: 'LibreFranklin_400Regular', fontSize: 14, textAlign: 'center' },
  becomingLine: { color: '#91C4E3', fontFamily: 'LibreFranklin_400Regular', fontSize: 15, textAlign: 'center', maxWidth: '80%' },
  classBadge: {
    backgroundColor: 'rgba(145,196,227,0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#91C4E3',
  },
  classBadgeText: { color: '#91C4E3', fontFamily: 'LibreFranklin_700Bold', fontSize: 16 },
  cta: {
    backgroundColor: '#9D81AC',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#fff', fontFamily: 'LibreFranklin_700Bold', fontSize: 15 },
});
```

**Step 2: Write GrowthBadge.tsx**

```tsx
// components/GrowthBadge.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';

interface Props {
  count: number | null; // null = hide silently (error state)
}

export function GrowthBadge({ count }: Props) {
  if (count === null) return null;
  const label = count === 0
    ? '0 seeds deep — start exploring'
    : `${count} ${count === 1 ? 'seed' : 'seeds'} deep`;
  return (
    <View style={styles.container} accessibilityLabel={label} accessible>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(157,129,172,0.12)',
    borderRadius: 20,
    marginVertical: 8,
  },
  text: { color: '#9D81AC', fontFamily: 'LibreFranklin_400Regular', fontSize: 13 },
});
```

**Step 3: Wire into profile.tsx**

At the top of the file, import:
```tsx
import { getPublicProfile, deriveIdentityStage, fetchGrowthCount, buildBecomingLine } from '../../lib/publicProfile';
import type { PublicProfile, IdentityStage } from '../../types/publicProfile';
import { PassionIdentityHero } from '../../components/PassionIdentityHero';
import { GrowthBadge } from '../../components/GrowthBadge';
```

Add state in the component:
```tsx
const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
const [publicProfileLoading, setPublicProfileLoading] = useState(true);
const [publicProfileError, setPublicProfileError] = useState(false);
const [growthCount, setGrowthCount] = useState(0);
```

Add a `loadIdentity` function (called in the existing useFocusEffect or a new useEffect):
```tsx
const loadIdentity = useCallback(async (uid: string) => {
  setPublicProfileLoading(true);
  setPublicProfileError(false);
  try {
    const [profile, count] = await Promise.all([
      getPublicProfile(uid),
      fetchGrowthCount(uid),
    ]);
    setPublicProfile(profile);
    setGrowthCount(count);
  } catch {
    setPublicProfileError(true);
  } finally {
    setPublicProfileLoading(false);
  }
}, []);
```

In the ScrollView, BEFORE the existing ikigai compass section, add:
```tsx
<PassionIdentityHero
  stage={deriveIdentityStage(publicProfile)}
  profile={publicProfile}
  becomingLine={publicProfile ? buildBecomingLine(publicProfile) : null}
  loading={publicProfileLoading}
  error={publicProfileError}
  onExplore={() => router.push('/(tabs)/')}
  onRetry={() => user?.id && loadIdentity(user.id)}
  onShare={() => { /* ET4 wires this */ }}
  shareDisabled={false}
/>
<GrowthBadge count={publicProfileError ? null : growthCount} />
```

**Step 4: Run tests**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app && pnpm test
```
Expected: 13/13 green, no regressions.

**Step 5: Commit**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app
git add components/PassionIdentityHero.tsx components/GrowthBadge.tsx "app/(tabs)/profile.tsx"
git commit -m "feat(profile): v1 identity surface — seedling/revealed/error hero + growth badge (ET3)"
```

---

## Task ET4: 9:16 share card + one-tap story export + failure toast

**Files:**
- Create: `components/PassionShareCard.tsx`
- Modify: `app/(tabs)/profile.tsx` — wire share flow

**Step 1: Write PassionShareCard.tsx**

```tsx
// components/PassionShareCard.tsx
// 9:16 portrait card rendered offscreen by ViewShot, then shared via expo-sharing.
// Width: 360 logical pts (= 1080px at 3x). Height: 640 logical pts (= 1920px at 3x).
// These are LOGICAL points — density-safe by design.

import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { AppText as Text } from './AppText';
import { ViewShot, useWrappedShareImage } from '../lib/hooks/useWrappedShareImage';
import type { PublicProfile } from '../types/publicProfile';
import { buildBecomingLine } from '../lib/publicProfile';

interface Props {
  profile: PublicProfile | null;
  growthCount: number;
  onShareGenerated: (success: boolean) => void;
  onShareCompleted: () => void;
}

export function PassionShareCard({ profile, growthCount, onShareGenerated, onShareCompleted }: Props) {
  const { viewShotRef, capture, capturing } = useWrappedShareImage();

  const handleShare = useCallback(async () => {
    const uri = await capture();
    if (!uri) {
      onShareGenerated(false);
      Alert.alert('Share Failed', "Couldn't make your card, try again.");
      return;
    }
    onShareGenerated(true);
    try {
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      onShareCompleted();
    } catch {
      Alert.alert('Share Failed', "Couldn't share your card, try again.");
    }
  }, [capture, onShareGenerated, onShareCompleted]);

  const classLabel = profile?.class_slug
    ? profile.class_slug.charAt(0).toUpperCase() + profile.class_slug.slice(1)
    : 'Seedling';
  const becomingLine = profile ? buildBecomingLine(profile) : null;

  return (
    <View>
      {/* Offscreen render target — hidden but must be in tree for ViewShot */}
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          style={styles.card}
        >
          <View style={styles.glowOrb} />
          <View style={styles.cardContent}>
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>{classLabel}</Text>
            </View>
            {becomingLine ? (
              <Text style={styles.becomingLine}>{becomingLine}</Text>
            ) : null}
            <Text style={styles.growthLine}>
              {growthCount} {growthCount === 1 ? 'seed' : 'seeds'} deep
            </Text>
            <Text style={styles.branding}>PassionSeed</Text>
          </View>
        </ViewShot>
      </View>

      {/* Visible share trigger button */}
      <Pressable
        onPress={handleShare}
        disabled={capturing}
        style={[styles.shareButton, capturing && styles.shareButtonBusy]}
        accessibilityRole="button"
        accessibilityLabel="Share your passion identity card"
        accessibilityState={{ disabled: capturing }}
      >
        <Text style={styles.shareButtonText}>
          {capturing ? 'Creating card…' : 'Share Identity Card'}
        </Text>
      </Pressable>
    </View>
  );
}

const CARD_W = 360;
const CARD_H = 640;

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: CARD_W,
    height: CARD_H,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#03050a',
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(145,196,227,0.12)',
    top: 80,
    alignSelf: 'center',
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  classBadge: {
    borderWidth: 1,
    borderColor: '#91C4E3',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: 'rgba(145,196,227,0.1)',
  },
  classBadgeText: { color: '#91C4E3', fontFamily: 'LibreFranklin_700Bold', fontSize: 22 },
  becomingLine: {
    color: '#E8EDF2',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 18,
    textAlign: 'center',
  },
  growthLine: { color: '#9D81AC', fontFamily: 'LibreFranklin_400Regular', fontSize: 14 },
  branding: {
    position: 'absolute',
    bottom: 32,
    color: 'rgba(232,237,242,0.3)',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 12,
  },
  shareButton: {
    backgroundColor: '#9D81AC',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  shareButtonBusy: { opacity: 0.6 },
  shareButtonText: { color: '#fff', fontFamily: 'LibreFranklin_700Bold', fontSize: 15 },
});
```

**Step 2: Wire share flow in profile.tsx**

Import `PassionShareCard` and render it in the hero section (after `PassionIdentityHero`). The card component internally owns the share button.

Connect `onShareGenerated` / `onShareCompleted` to `logShareGenerated` / `logShareCompleted` (added in ET7).

**Step 3: Commit**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app
git add components/PassionShareCard.tsx "app/(tabs)/profile.tsx"
git commit -m "feat(profile): 9:16 passion share card + story export + failure toast (ET4)"
```

---

## Task ET5: Public handle/slug + public profile route + universal links

**Files:**
- Modify: `app.config.js`
- Create: `app/u/[handle].tsx`

**Step 1: Add universal link config to app.config.js**

In the `ios` section (after `bundleIdentifier`), add:
```js
associatedDomains: [
  `applinks:${process.env.EXPO_PUBLIC_CLOUDFLARE_DOMAIN || 'app.passionseed.io'}`,
  `webcredentials:${process.env.EXPO_PUBLIC_CLOUDFLARE_DOMAIN || 'app.passionseed.io'}`,
],
```

In the `android` section (after `permissions`), add:
```js
intentFilters: [
  {
    action: 'VIEW',
    autoVerify: true,
    data: [
      {
        scheme: 'https',
        host: process.env.EXPO_PUBLIC_CLOUDFLARE_DOMAIN || 'app.passionseed.io',
        pathPrefix: '/u/',
      },
    ],
    category: ['BROWSABLE', 'DEFAULT'],
  },
],
```

**Step 2: Create app/u/[handle].tsx**

```tsx
// app/u/[handle].tsx
// Public profile viewer — renders ONLY published fields.
// Security: query filters is_public=true server-side (RLS enforces too).
// Does NOT expose user_id, email, raw scores.

import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppText as Text } from '../../components/AppText';
import { supabase } from '../../lib/supabase';
import { isSectionPublished, buildBecomingLine } from '../../lib/publicProfile';
import type { PublicProfile } from '../../types/publicProfile';
import { logPublicProfileOpened } from '../../lib/eventLogger';

export default function PublicProfileViewer() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!handle) return;
    logPublicProfileOpened(handle);
    supabase
      .from('public_profiles')
      .select('*')
      .eq('handle', handle)
      .eq('is_public', true)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) { setError(true); return; }
        setProfile((data as PublicProfile | null) ?? null);
      });
  }, [handle]);

  if (profile === undefined && !error) {
    return <View style={styles.center}><Text>Loading…</Text></View>;
  }
  if (error || profile === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Profile not found</Text>
      </View>
    );
  }

  const becomingLine = isSectionPublished(profile, 'class')
    ? buildBecomingLine(profile)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isSectionPublished(profile, 'class') && profile.class_slug && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Identity</Text>
          <Text style={styles.classText}>
            {profile.class_slug.charAt(0).toUpperCase() + profile.class_slug.slice(1)}
          </Text>
          {becomingLine && <Text style={styles.becomingLine}>{becomingLine}</Text>}
        </View>
      )}
      {isSectionPublished(profile, 'growth') && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Growth</Text>
          <Text style={styles.growthText}>{profile.growth_count} seeds deep</Text>
        </View>
      )}
      {!isSectionPublished(profile, 'class') && !isSectionPublished(profile, 'growth') && (
        <Text style={styles.notFound}>Nothing published yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 24, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#666', fontSize: 16 },
  section: { gap: 4 },
  sectionLabel: { color: '#9D81AC', fontSize: 12, fontFamily: 'LibreFranklin_700Bold', textTransform: 'uppercase', letterSpacing: 0.8 },
  classText: { color: '#03050a', fontSize: 28, fontFamily: 'LibreFranklin_700Bold' },
  becomingLine: { color: '#555', fontSize: 15, fontFamily: 'LibreFranklin_400Regular' },
  growthText: { color: '#03050a', fontSize: 20, fontFamily: 'LibreFranklin_400Regular' },
});
```

**Step 3: Commit**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app
git add app.config.js "app/u/[handle].tsx"
git commit -m "feat(profile): public handle/u/[handle] route + universal links iOS+Android (ET5)"
```

---

## Task ET6: Persisted reveal flag + reduced-motion support

**Files:**
- Create: `lib/revealState.ts`
- Modify: `components/PassionIdentityHero.tsx` — add reveal animation gating
- Modify: `app/(tabs)/profile.tsx` — wire reveal on first view

**Step 1: Write lib/revealState.ts**

```ts
// lib/revealState.ts
// Persists whether a user has seen the identity reveal animation.
// Per-user key so switching accounts doesn't share state.

import { getItem, setItem } from './asyncStorage';

function revealKey(userId: string): string {
  return `passion_identity_revealed/${userId}`;
}

export async function hasSeenReveal(userId: string): Promise<boolean> {
  const val = await getItem(revealKey(userId));
  return val === 'true';
}

export async function markRevealSeen(userId: string): Promise<void> {
  await setItem(revealKey(userId), 'true');
}
```

**Step 2: Add reduced-motion check to PassionIdentityHero.tsx**

Add a `skipAnimation` prop:
```tsx
interface PassionIdentityHeroProps {
  // ... existing props ...
  skipAnimation: boolean; // true if already revealed OR reduce motion enabled
}
```

In HeroRevealed: if `skipAnimation` is false, wrap the reveal content in an animated fade-in (simple Animated.View from RN). If true, render directly.

**Step 3: Wire in profile.tsx**

```tsx
const [skipRevealAnimation, setSkipRevealAnimation] = useState(true);

// In loadIdentity (or a separate useEffect after profile loads):
useEffect(() => {
  if (!user?.id || publicProfileLoading) return;
  const stage = deriveIdentityStage(publicProfile);
  if (stage !== 'revealed') return;
  
  Promise.all([
    hasSeenReveal(user.id),
    AccessibilityInfo.isReduceMotionEnabled(),
  ]).then(([seen, reducedMotion]) => {
    setSkipRevealAnimation(seen || reducedMotion);
    if (!seen) {
      markRevealSeen(user.id!);
    }
  });
}, [publicProfile, publicProfileLoading, user?.id]);
```

Pass `skipAnimation={skipRevealAnimation}` to `<PassionIdentityHero>`.

Import `AccessibilityInfo` from `'react-native'` and `hasSeenReveal`, `markRevealSeen` from `'../../lib/revealState'`.

**Step 4: Commit**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app
git add lib/revealState.ts components/PassionIdentityHero.tsx "app/(tabs)/profile.tsx"
git commit -m "feat(profile): persisted reveal flag + reduced-motion support (ET6)"
```

---

## Task ET7: Measurement events

**Files:**
- Modify: `types/events.ts`
- Modify: `lib/eventLogger.ts`
- Modify: `app/(tabs)/profile.tsx` — call logProfileExposed, logShareGenerated, logShareCompleted
- Modify: `app/u/[handle].tsx` — call logPublicProfileOpened (already in ET5 stub)

**Step 1: Extend types/events.ts**

In `EVENT_TYPES`, add:
```ts
PROFILE_EXPOSED: 'profile_exposed',
PRIVACY_CHANGED: 'privacy_changed',
SHARE_GENERATED: 'share_generated',
SHARE_COMPLETED: 'share_completed',
PUBLIC_PROFILE_OPENED: 'public_profile_opened',
```

In `EventDataMap`, add:
```ts
profile_exposed: { identity_stage: 'seedling' | 'revealed' };
privacy_changed: { is_public: boolean; sections: string[] };
share_generated: { identity_stage: 'seedling' | 'revealed'; success: boolean };
share_completed: { identity_stage: 'seedling' | 'revealed' };
public_profile_opened: { handle: string };
```

**Step 2: Extend lib/eventLogger.ts**

```ts
export async function logProfileExposed(stage: 'seedling' | 'revealed'): Promise<void> {
  await logEvent('profile_exposed', { identity_stage: stage });
}
export async function logPrivacyChanged(isPublic: boolean, sections: string[]): Promise<void> {
  await logEvent('privacy_changed', { is_public: isPublic, sections });
}
export async function logShareGenerated(stage: 'seedling' | 'revealed', success: boolean): Promise<void> {
  await logEvent('share_generated', { identity_stage: stage, success });
}
export async function logShareCompleted(stage: 'seedling' | 'revealed'): Promise<void> {
  await logEvent('share_completed', { identity_stage: stage });
}
export async function logPublicProfileOpened(handle: string): Promise<void> {
  await logEvent('public_profile_opened', { handle });
}
```

**Step 3: Wire events in profile.tsx**

After identity loads (in loadIdentity, after setPublicProfile):
```ts
const stage = deriveIdentityStage(profile);
logProfileExposed(stage); // fire-and-forget, fail-silent
```

In PassionShareCard's `onShareGenerated` callback (profile.tsx wiring):
```ts
(success) => logShareGenerated(deriveIdentityStage(publicProfile), success)
```

In PassionShareCard's `onShareCompleted`:
```ts
() => logShareCompleted(deriveIdentityStage(publicProfile))
```

**Step 4: Commit**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app
git add types/events.ts lib/eventLogger.ts "app/(tabs)/profile.tsx" "app/u/[handle].tsx"
git commit -m "feat(profile): measurement events — exposure, share, public viewer (ET7)"
```

---

## Task ET8: Fold public_profiles into profileScreenSnapshot + cache invalidation

**Files:**
- Modify: `lib/profileScreenCache.ts` — extend ProfileScreenSnapshot type + bump schema version
- Modify: `lib/profileScreenSnapshot.ts` — add public_profile + growth_count to parallel fetch
- Modify: `app/(tabs)/profile.tsx` — read from snapshot instead of direct calls
- Search for Browse class-pick → add cache clear call

**Step 1: Update lib/profileScreenCache.ts**

```ts
import type { PublicProfile } from '../types/publicProfile';

// Bump schema version — old v1 cache will be rejected and refetched cleanly
export const PROFILE_SCREEN_CACHE_SCHEMA_VERSION = 2;

// Add to ProfileScreenSnapshot:
export type ProfileScreenSnapshot = {
  // ... all existing fields unchanged ...
  publicProfile: PublicProfile | null;  // NEW
  growthCount: number;                  // NEW
};
```

Update `isProfileScreenSnapshot` to check:
```ts
&& typeof snapshot.growthCount === 'number'
// publicProfile can be null (object or null), so just check key exists:
&& 'publicProfile' in snapshot
```

**Step 2: Update lib/profileScreenSnapshot.ts**

```ts
import { getPublicProfile, fetchGrowthCount } from './publicProfile';

// Add to Promise.all:
getPublicProfile(userId).catch(() => null),  // publicProfileData — catch so one failure doesn't kill snapshot
fetchGrowthCount(userId),                    // growthCountData

// In return object:
publicProfile: publicProfileData,
growthCount: growthCountData,
```

**Step 3: Find Browse class-pick location**

```bash
grep -r "class_slug\|classSlug\|class_pick" app/ lib/ --include="*.ts" --include="*.tsx" -l
```

In whichever file writes class_slug to public_profiles, after the successful write:
```ts
import { clearCachedProfileScreenSnapshot } from '../lib/profileScreenCache';
// ...after write succeeds:
await clearCachedProfileScreenSnapshot(userId);
```

**Step 4: Update profile.tsx**

Remove the separate `getPublicProfile` + `fetchGrowthCount` calls added in ET3.
Read from `snapshot.publicProfile` and `snapshot.growthCount` instead.

**Step 5: Run tests**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app && pnpm test
```

**Step 6: Commit**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app
git add lib/profileScreenCache.ts lib/profileScreenSnapshot.ts "app/(tabs)/profile.tsx"
git commit -m "feat(profile): fold public_profiles into snapshot cache + invalidation on class-pick (ET8)"
```

---

## Task ET9: RLS policy tests (pseed repo)

**Files:**
- Create: `supabase/tests/public_profiles_rls.test.sql`

**Step 1: Check pseed test framework**

```bash
ls /path/to/pseed/supabase/tests/
# Check if pgTAP is used or another framework
```

**Step 2: Write SQL tests**

```sql
-- supabase/tests/public_profiles_rls.test.sql
BEGIN;
SELECT plan(7);

-- Test 1: Private row invisible to anon
INSERT INTO public_profiles (user_id, is_public)
  VALUES ('00000000-0000-0000-0000-000000000001', false);
SET ROLE anon;
SELECT is(
  (SELECT COUNT(*) FROM public_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'anon cannot see private row'
);
RESET ROLE;

-- Test 2: Public row visible to anon
UPDATE public_profiles SET is_public = true WHERE user_id = '00000000-0000-0000-0000-000000000001';
SET ROLE anon;
SELECT is(
  (SELECT COUNT(*) FROM public_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'),
  1::bigint,
  'anon can see public row'
);
RESET ROLE;

-- Test 3: Handle uniqueness enforced
INSERT INTO public_profiles (user_id, handle, is_public)
  VALUES ('00000000-0000-0000-0000-000000000002', 'testhandle', false);
SELECT throws_ok(
  $$INSERT INTO public_profiles (user_id, handle) VALUES ('00000000-0000-0000-0000-000000000003', 'testhandle')$$,
  'unique_violation',
  NULL,
  'duplicate handle raises unique violation'
);

-- Test 4: Handle format constraint
SELECT throws_ok(
  $$INSERT INTO public_profiles (user_id, handle) VALUES ('00000000-0000-0000-0000-000000000004', 'AB')$$,
  'check_violation',
  NULL,
  'invalid handle format rejected'
);

-- Test 5: class_slug CHECK constraint
SELECT throws_ok(
  $$INSERT INTO public_profiles (user_id, class_slug) VALUES ('00000000-0000-0000-0000-000000000005', 'wizard')$$,
  'check_violation',
  NULL,
  'invalid class_slug rejected'
);

-- Test 6: published_sections validation in RPC
-- (set_profile_visibility rejects unknown sections)
SELECT throws_ok(
  $$SELECT set_profile_visibility('00000000-0000-0000-0000-000000000001', true, ARRAY['unknown_section'])$$,
  NULL,
  'invalid section',
  'set_profile_visibility rejects unknown section'
);

-- Test 7: growth RPC returns 0 for user with no completions
SELECT is(
  public_profile_growth_count('00000000-0000-0000-0000-000000000099'),
  0,
  'growth_count returns 0 for unknown user'
);

SELECT * FROM finish();
ROLLBACK;
```

**Step 3: Run**

```bash
supabase test db
```

**Step 4: Commit (pseed repo)**

```bash
git add supabase/tests/public_profiles_rls.test.sql
git commit -m "test(profile): RLS policy tests — private-default, handle uniqueness, class check, privacy RPC (ET9)"
```

---

## Task ET10: Unit tests (ps_app repo)

**Files:**
- Create: `tests/passion-profile-ui.test.ts`

**Step 1: Write tests**

```ts
// tests/passion-profile-ui.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- revealState tests ---

const asyncStorageState = {
  store: new Map<string, string>(),
  reset() { asyncStorageState.store.clear(); },
};

vi.mock('../lib/asyncStorage', () => ({
  getItem: async (key: string) => asyncStorageState.store.get(key) ?? null,
  setItem: async (key: string, val: string) => { asyncStorageState.store.set(key, val); },
}));

vi.mock('expo-sqlite/localStorage/install', () => ({}));

describe('revealState', () => {
  beforeEach(() => asyncStorageState.reset());

  it('hasSeenReveal returns false initially', async () => {
    const { hasSeenReveal } = await import('../lib/revealState');
    expect(await hasSeenReveal('user1')).toBe(false);
  });

  it('markRevealSeen makes hasSeenReveal return true', async () => {
    const { hasSeenReveal, markRevealSeen } = await import('../lib/revealState');
    await markRevealSeen('user1');
    expect(await hasSeenReveal('user1')).toBe(true);
  });

  it('different userIds are independent', async () => {
    const { hasSeenReveal, markRevealSeen } = await import('../lib/revealState');
    await markRevealSeen('user1');
    expect(await hasSeenReveal('user2')).toBe(false);
  });
});

// --- ProfileScreenSnapshot schema v2 validator ---

describe('ProfileScreenSnapshot validator (v2)', () => {
  it('accepts a v2 snapshot with publicProfile=null and growthCount=0', async () => {
    const { isProfileScreenSnapshot } = await import('../lib/profileScreenCache');
    // Build a minimal valid v2 snapshot
    const snap = {
      version: 2,
      userId: 'u1',
      cachedAt: new Date().toISOString(),
      profile: null,
      interests: [],
      careers: [],
      ikigaiScores: null,
      scoreTimeline: [],
      hasScores: false,
      activityEvents: [],
      portfolioCount: 0,
      savedProgramsCount: 0,
      isAdmin: false,
      publicProfile: null,
      growthCount: 0,
    };
    // isProfileScreenSnapshot is not exported — test via readCachedProfileScreenSnapshot
    // by writing a v1-shaped object and verifying it returns null
    const { readCachedProfileScreenSnapshot, writeCachedProfileScreenSnapshot } = await import('../lib/profileScreenCache');
    await writeCachedProfileScreenSnapshot(snap as any);
    const result = await readCachedProfileScreenSnapshot('u1');
    expect(result).not.toBeNull();
    expect(result?.growthCount).toBe(0);
    expect(result?.publicProfile).toBeNull();
  });

  it('rejects an old v1 snapshot (missing growthCount)', async () => {
    const { readCachedProfileScreenSnapshot } = await import('../lib/profileScreenCache');
    const { setItem } = await import('../lib/asyncStorage');
    // Inject a raw v1 snapshot (no growthCount/publicProfile)
    await setItem('profile-screen-cache/u2', JSON.stringify({
      version: 1,
      userId: 'u2',
      cachedAt: new Date().toISOString(),
      profile: null,
      interests: [],
      careers: [],
      ikigaiScores: null,
      scoreTimeline: [],
      hasScores: false,
      activityEvents: [],
      portfolioCount: 0,
      savedProgramsCount: 0,
      isAdmin: false,
      // missing publicProfile + growthCount
    }));
    const result = await readCachedProfileScreenSnapshot('u2');
    expect(result).toBeNull(); // v1 rejected by schema validator
  });
});
```

**Step 2: Run all tests**

```bash
cd /Users/bunyasit/dev/passionseed/ps_app && pnpm test
```

Expected: ≥16 tests green (13 existing + new tests above).

**Step 3: Commit**

```bash
git add tests/passion-profile-ui.test.ts
git commit -m "test(profile): revealState + snapshot v2 validator (ET10)"
```

---

## Final Verification

```bash
cd /Users/bunyasit/dev/passionseed/ps_app

# All tests green
pnpm test

# View branch commits
git log --oneline feat/passion-profile-v1 ^main
```

**QA checklist from test plan:**
- [ ] New student (no class_slug) → seedling state shown, no crash, no blank
- [ ] Fetch error → error UI with "Try again" button, NOT seedling
- [ ] Tap Share → card renders; if capture fails → Alert with toast
- [ ] Toggle section private → calls `set_profile_visibility` RPC (transactional)
- [ ] Anon read of public_profiles → only is_public=true rows visible (RLS test in pseed)
- [ ] Class pick in Browse → `clearCachedProfileScreenSnapshot` called → profile reflects pick on next visit without waiting 10 min
- [ ] Reveal animation: first view plays it; return visit skips it
- [ ] Reduced-motion enabled → reveal animation skipped entirely
- [ ] 5 measurement events fire (profile_exposed, share_generated, share_completed, public_profile_opened, privacy_changed)
