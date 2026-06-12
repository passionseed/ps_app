import { useState } from "react";
import { View, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";
import {
  PageBg,
  Text as ThemeText,
  Space,
  Radius,
} from "../../lib/theme";
import type { PathContent } from "../../types/pathlab-content";

interface Props {
  content: PathContent;
  onComplete: () => void;
}

export default function ImageActivity({ content, onComplete: _onComplete }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [imageHeight, setImageHeight] = useState<number>(windowWidth * 0.75);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <>
      {/* Title and description in card */}
      {(content.content_title || content.content_body) && (
        <GlassCard style={styles.contentCard}>
          {content.content_title && (
            <AppText variant="bold" style={styles.contentTitle}>
              {content.content_title}
            </AppText>
          )}
          {content.content_body && (
            <AppText style={styles.contentBody}>{content.content_body}</AppText>
          )}
        </GlassCard>
      )}

      {/* Full-width image outside card */}
      {content.content_url ? (
        <View
          style={[
            styles.fullWidthContentImageContainer,
            { width: windowWidth, height: imageHeight },
          ]}
        >
          {isLoading && !hasError && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={ThemeText.tertiary} />
            </View>
          )}
          {hasError && (
            <View style={styles.errorContainer}>
              <AppText style={styles.errorText}>Failed to load image</AppText>
            </View>
          )}
          <ExpoImage
            source={{
              uri: content.content_url,
              headers: { Referer: "https://ibb.co" },
            }}
            style={[
              styles.fullWidthContentImage,
              { width: windowWidth, height: imageHeight },
            ]}
            contentFit="contain"
            cachePolicy="memory-disk"
            onLoad={(e) => {
              setIsLoading(false);
              const { width, height } = e.source;
              if (width && height) {
                setImageHeight(windowWidth * (height / width));
              }
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </View>
      ) : (
        <GlassCard style={styles.contentCard}>
          <AppText style={styles.contentBody}>No image URL provided</AppText>
        </GlassCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  contentCard: {
    marginBottom: Space.lg,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
    marginBottom: 8,
  },
  contentBody: {
    fontSize: 14,
    color: ThemeText.secondary,
    lineHeight: 22,
  },
  fullWidthContentImageContainer: {
    backgroundColor: "#000000",
    marginVertical: 12,
    marginHorizontal: -20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    position: "absolute",
    zIndex: 1,
  },
  errorContainer: {
    position: "absolute",
    zIndex: 1,
    padding: 16,
    alignItems: "center",
  },
  errorText: {
    color: ThemeText.muted,
    fontSize: 14,
  },
  fullWidthContentImage: {
    backgroundColor: "#000000",
  },
});
