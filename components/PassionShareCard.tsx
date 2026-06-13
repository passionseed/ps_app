import React, { useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { AppText as Text } from './AppText';
import { ViewShot, useWrappedShareImage } from '../lib/hooks/useWrappedShareImage';
import type { PublicProfile } from '../types/publicProfile';
import { buildBecomingLine } from '../lib/publicProfile';

export interface PassionShareCardRef {
  share: () => Promise<void>;
  capturing: boolean;
}

interface Props {
  profile: PublicProfile | null;
  growthCount: number;
  stage: 'seedling' | 'revealed';
  /** Called after capture attempt (before share sheet). success=false if capture returned null. */
  onShareGenerated: (success: boolean) => void;
  /** Called after share sheet completes without error. */
  onShareCompleted: () => void;
  /** Called when the sharing starts/stops being busy. */
  onShareBusy?: (busy: boolean) => void;
}

export const PassionShareCard = forwardRef<PassionShareCardRef, Props>(
  function PassionShareCard({
    profile,
    growthCount,
    stage,
    onShareGenerated,
    onShareCompleted,
    onShareBusy,
  }: Props, ref) {
    const { viewShotRef, capture, capturing } = useWrappedShareImage();

    const handleShare = useCallback(async () => {
      onShareBusy?.(true);
      const uri = await capture();
      if (!uri) {
        onShareGenerated(false);
        Alert.alert('Share Failed', "Couldn't make your card, try again.");
        onShareBusy?.(false);
        return;
      }
      onShareGenerated(true);
      try {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        onShareCompleted();
      } catch {
        Alert.alert('Share Failed', "Couldn't share your card, try again.");
      } finally {
        onShareBusy?.(false);
      }
    }, [capture, onShareGenerated, onShareCompleted, onShareBusy]);

    useImperativeHandle(ref, () => ({
      share: handleShare,
      capturing,
    }));

    const classLabel = profile?.class_slug
      ? profile.class_slug.charAt(0).toUpperCase() + profile.class_slug.slice(1)
      : 'Seedling';
    const becomingLine = profile ? buildBecomingLine(profile) : null;
    const growthLabel = `${growthCount} ${growthCount === 1 ? 'seed' : 'seeds'} deep`;

    const isDisabled = capturing || stage === 'seedling';

    return (
      <View style={styles.container}>
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
              <Text style={styles.growthLine}>{growthLabel}</Text>
              <Text style={styles.branding}>PassionSeed</Text>
            </View>
          </ViewShot>
        </View>

        {/* Visible share trigger button */}
        <Pressable
          onPress={handleShare}
          disabled={isDisabled}
          style={[
            styles.shareButton,
            isDisabled && styles.shareButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share your passion identity card"
          accessibilityState={{ disabled: isDisabled }}
        >
          <Text style={styles.shareButtonText}>
            {capturing ? 'Creating card…' : 'Share Identity Card'}
          </Text>
        </Pressable>
      </View>
    );
  }
);

const CARD_W = 360;
const CARD_H = 640;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginTop: 12,
  },
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
  classBadgeText: {
    color: '#91C4E3',
    fontFamily: 'LibreFranklin_700Bold',
    fontSize: 22,
  },
  becomingLine: {
    color: '#E8EDF2',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 18,
    textAlign: 'center',
  },
  growthLine: {
    color: '#9D81AC',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 14,
  },
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
  },
  shareButtonDisabled: {
    opacity: 0.4,
  },
  shareButtonText: {
    color: '#fff',
    fontFamily: 'LibreFranklin_700Bold',
    fontSize: 15,
  },
});
