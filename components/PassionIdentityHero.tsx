// components/PassionIdentityHero.tsx
//
// Top section of the profile screen. Renders the passion-identity state.
//
// IMPORTANT: Seedling ≠ error. A load failure renders HeroError with a retry
// button; only a genuine null class_slug is seedling. Callers must pass error=true
// when the fetch throws, NOT when profile.class_slug is null.

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { AppText as Text } from './AppText';
import type { PublicProfile, IdentityStage } from '../types/publicProfile';
import { hasSeenReveal, markRevealSeen } from '../lib/revealState';

export interface PassionIdentityHeroProps {
  /** Derived identity stage: 'seedling' | 'revealed' */
  stage: IdentityStage;
  /** The public_profiles row. Null when no class picked (seedling). */
  profile: PublicProfile | null;
  /** The 'Becoming' statement line. Null in seedling state. */
  becomingLine: string | null;
  /** True while the profile fetch is in-flight. */
  loading: boolean;
  /** True if the fetch THREW (network/server error). Distinct from seedling. */
  error: boolean;
  /** User ID — needed to check/write the reveal-seen flag. */
  userId: string;
  /** Navigate to Discover tab (seedling CTA). */
  onExplore: () => void;
  /** Retry the failed profile fetch. */
  onRetry: () => void;
  /** Trigger the share flow. */
  onShare: () => void;
  /** Disable share button (e.g. capture in progress). */
  shareDisabled: boolean;
}

export function PassionIdentityHero(props: PassionIdentityHeroProps) {
  if (props.loading) return <HeroLoading />;
  if (props.error) return <HeroError onRetry={props.onRetry} />;
  if (props.stage === 'seedling') return <HeroSeedling onExplore={props.onExplore} />;
  return <HeroRevealed {...props} />;
}

function HeroLoading() {
  return (
    <View style={styles.hero} accessibilityLabel="Loading your passion identity">
      <Text style={styles.loadingText}>Reading your signals…</Text>
    </View>
  );
}

function HeroError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.bodyText}>Couldn't load your profile</Text>
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
      <Text
        style={styles.seedBadge}
        accessibilityLabel="Passion identity: Seedling"
        accessible
      >
        🌱
      </Text>
      <Text style={styles.identityTitle}>Your identity is forming</Text>
      <Text style={styles.subText}>Explore 1 seed to begin</Text>
      <Pressable
        onPress={onExplore}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel="Explore seeds to reveal your identity"
      >
        <Text style={styles.ctaText}>Explore →</Text>
      </Pressable>
    </View>
  );
}

function HeroRevealed(props: PassionIdentityHeroProps) {
  const { profile, becomingLine, userId, onShare, shareDisabled } = props;
  const opacity = useRef(new Animated.Value(0)).current;
  const classLabel = profile?.class_slug
    ? profile.class_slug.charAt(0).toUpperCase() + profile.class_slug.slice(1)
    : '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [seen, reducedMotion] = await Promise.all([
        hasSeenReveal(userId),
        AccessibilityInfo.isReduceMotionEnabled(),
      ]);
      if (cancelled) return;
      if (seen || reducedMotion) {
        // Skip animation — show immediately
        opacity.setValue(1);
      } else {
        // Reveal beat: brief fade-in
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
        markRevealSeen(userId);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, opacity]);

  return (
    <Animated.View style={[styles.hero, { opacity }]}>
      <View
        style={styles.classBadge}
        accessible
        accessibilityLabel={`Passion identity: ${classLabel}`}
      >
        <Text style={styles.classBadgeText}>{classLabel}</Text>
      </View>
      {becomingLine ? (
        <Text style={styles.becomingLine} numberOfLines={2}>
          {becomingLine}
        </Text>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#03050a',
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#91C4E3',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 14,
  },
  bodyText: {
    color: '#E8EDF2',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 16,
    textAlign: 'center',
  },
  seedBadge: { fontSize: 52 },
  identityTitle: {
    color: '#E8EDF2',
    fontFamily: 'LibreFranklin_700Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  subText: {
    color: '#9D81AC',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  becomingLine: {
    color: '#E8EDF2',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: '80%',
  },
  classBadge: {
    backgroundColor: 'rgba(145,196,227,0.12)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#91C4E3',
  },
  classBadgeText: {
    color: '#91C4E3',
    fontFamily: 'LibreFranklin_700Bold',
    fontSize: 18,
  },
  cta: {
    backgroundColor: '#9D81AC',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: {
    color: '#fff',
    fontFamily: 'LibreFranklin_700Bold',
    fontSize: 15,
  },
});
