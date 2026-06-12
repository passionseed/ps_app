import { useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
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
              const { width, height } = e.source;
              if (width && height) {
                setImageHeight(windowWidth * (height / width));
              }
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
  },
  fullWidthContentImage: {
    backgroundColor: "#000000",
  },
});
