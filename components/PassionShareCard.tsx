import React, { useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, Modal, Image } from 'react-native';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import { AppText as Text } from './AppText';
import { ViewShot, useWrappedShareImage } from '../lib/hooks/useWrappedShareImage';
import type { PublicProfile } from '../types/publicProfile';
import { buildBecomingLine } from '../lib/publicProfile';

// react-native-share is a native module — absent in Expo Go / web.
// TurboModules throw non-catchable Invariant Violations on require(),
// so we gate on the native module registry before attempting to load.
let RNShare: any | null | undefined;
function getRNShare(): any | null {
  if (RNShare !== undefined) return RNShare;
  try {
    const { TurboModuleRegistry } = require('react-native');
    // Probe the native binary without throwing — getEnforcing() would crash.
    if (!TurboModuleRegistry.get('RNShare')) {
      RNShare = null;
      return RNShare;
    }
    RNShare = require('react-native-share').default;
  } catch {
    RNShare = null;
  }
  return RNShare;
}

// Facebook App ID is mandatory for Instagram Stories sharing.
const FB_APP_ID: string | undefined =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.fbAppId;

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
  /** Render the built-in visible Share button. Default true. Set false when the parent drives share via ref. */
  showButton?: boolean;
}

export const PassionShareCard = forwardRef<PassionShareCardRef, Props>(
  function PassionShareCard({
    profile,
    growthCount,
    stage,
    onShareGenerated,
    onShareCompleted,
    onShareBusy,
    showButton = true,
  }: Props, ref) {
    const { viewShotRef, capture, capturing } = useWrappedShareImage();
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);

    // Step 1: capture the offscreen card and show it in a preview modal.
    const handleShare = useCallback(async () => {
      onShareBusy?.(true);
      const uri = await capture();
      onShareBusy?.(false);
      if (!uri) {
        onShareGenerated(false);
        Alert.alert('Share Failed', "Couldn't make your card, try again.");
        return;
      }
      onShareGenerated(true);
      setPreviewUri(uri);
    }, [capture, onShareGenerated, onShareBusy]);

    // Step 2: hand the already-captured image to the OS share sheet.
    const handleConfirmShare = useCallback(async () => {
      if (!previewUri) return;
      setSharing(true);
      onShareBusy?.(true);
      try {
        await Sharing.shareAsync(previewUri, { mimeType: 'image/png' });
        onShareCompleted();
        setPreviewUri(null);
      } catch {
        Alert.alert('Share Failed', "Couldn't share your card, try again.");
      } finally {
        setSharing(false);
        onShareBusy?.(false);
      }
    }, [previewUri, onShareCompleted, onShareBusy]);

    // Step 2 (alt): post straight to Instagram Stories via react-native-share.
    const igStoriesAvailable = Boolean(getRNShare()) && Boolean(FB_APP_ID);
    const handleShareInstagramStories = useCallback(async () => {
      const Share = getRNShare();
      if (!previewUri || !Share || !FB_APP_ID) return;
      setSharing(true);
      onShareBusy?.(true);
      try {
        await Share.shareSingle({
          social: Share.Social.INSTAGRAM_STORIES,
          appId: FB_APP_ID,
          backgroundImage: previewUri,
          backgroundTopColor: '#03050a',
          backgroundBottomColor: '#03050a',
        });
        onShareCompleted();
        setPreviewUri(null);
      } catch (e: any) {
        // User cancelled is not an error worth alerting on.
        if (!String(e?.message ?? '').toLowerCase().includes('cancel')) {
          Alert.alert('Share Failed', "Couldn't open Instagram, try the share sheet.");
        }
      } finally {
        setSharing(false);
        onShareBusy?.(false);
      }
    }, [previewUri, onShareCompleted, onShareBusy]);

    const closePreview = useCallback(() => {
      if (sharing) return;
      setPreviewUri(null);
    }, [sharing]);

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
        {/* Preview: show the rendered card before opening the OS share sheet */}
        <Modal
          visible={previewUri !== null}
          transparent
          animationType="fade"
          onRequestClose={closePreview}
        >
          <View style={styles.previewBackdrop}>
            <Pressable
              style={styles.previewBackdropFill}
              onPress={closePreview}
              accessibilityLabel="Close preview"
            />
            <View style={styles.previewSheet}>
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : null}
              {igStoriesAvailable ? (
                <Pressable
                  onPress={handleShareInstagramStories}
                  disabled={sharing}
                  style={[styles.previewInstagramBtn, sharing && styles.shareButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Share to Instagram Stories"
                >
                  <Text style={styles.previewInstagramText}>
                    {sharing ? 'Opening…' : '📸  Instagram Stories'}
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.previewActions}>
                <Pressable
                  onPress={closePreview}
                  disabled={sharing}
                  style={[styles.previewCancelBtn, sharing && styles.shareButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.previewCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmShare}
                  disabled={sharing}
                  style={[styles.previewShareBtn, sharing && styles.shareButtonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Share image"
                >
                  <Text style={styles.previewShareText}>
                    {sharing ? 'Sharing…' : igStoriesAvailable ? 'More…' : 'Share'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

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

        {/* Visible share trigger button — omitted when parent drives share via ref */}
        {showButton ? (
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
        ) : null}
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
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewBackdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  previewSheet: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 360,
  },
  previewImage: {
    width: '100%',
    aspectRatio: CARD_W / CARD_H,
    borderRadius: 16,
    backgroundColor: '#03050a',
  },
  previewInstagramBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E1306C',
  },
  previewInstagramText: {
    color: '#fff',
    fontFamily: 'LibreFranklin_700Bold',
    fontSize: 16,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  previewCancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  previewCancelText: {
    color: '#fff',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 15,
  },
  previewShareBtn: {
    flex: 2,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9D81AC',
  },
  previewShareText: {
    color: '#fff',
    fontFamily: 'LibreFranklin_700Bold',
    fontSize: 15,
  },
});
