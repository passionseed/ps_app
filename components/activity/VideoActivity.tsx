import { useState } from "react";
import { View, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import YoutubePlayer from "react-native-youtube-iframe";
import { AppText } from "../AppText";
import { GlassCard } from "../Glass/GlassCard";
import {
  Text as ThemeText,
  Space,
  Shadow,
} from "../../lib/theme";
import type { PathContent } from "../../types/pathlab-content";

interface Props {
  content: PathContent;
  onComplete: () => void;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s?]+)/,
    /youtube\.com\/embed\/([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export default function VideoActivity({ content, onComplete: _onComplete }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);

  const videoId = extractYouTubeId(content.content_url || "");
  const isYouTube = !!videoId;

  const isShort =
    content.content_url?.includes("/shorts/") ||
    content.content_type === "short_video";

  const videoWidth = windowWidth;
  let playerHeight = videoWidth * (9 / 16);
  if (isShort) {
    playerHeight = videoWidth * (16 / 9);
  }

  return (
    <>
      {content.content_title && !isShort && (
        <AppText variant="bold" style={styles.contentTitle}>
          {content.content_title}
        </AppText>
      )}
      <View style={[styles.fullWidthVideoBleed, { width: videoWidth }]}>
        {isYouTube ? (
          <View style={isShort ? styles.videoContainerShort : styles.videoContainer}>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={ThemeText.tertiary} />
              </View>
            )}
            <YoutubePlayer
              height={playerHeight}
              width={videoWidth}
              videoId={videoId}
              play={false}
              onReady={() => setIsLoading(false)}
              webViewStyle={{ opacity: 0.99 }}
              webViewProps={{
                androidLayerType: "hardware",
              }}
            />
          </View>
        ) : content.content_url ? (
          <View style={isShort ? styles.videoContainerShort : styles.videoContainer}>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={ThemeText.tertiary} />
              </View>
            )}
            <WebView
              source={{
                html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                    <style>
                      body { margin: 0; padding: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
                      video { width: 100%; height: 100%; object-fit: ${isShort ? "contain" : "cover"}; }
                    </style>
                  </head>
                  <body>
                    <video controls playsinline preload="metadata">
                      <source src="${content.content_url}" type="video/mp4">
                      Your browser does not support the video tag.
                    </video>
                  </body>
                </html>
              `,
              }}
              style={styles.uploadedVideo}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={() => setIsLoading(false)}
            />
          </View>
        ) : null}
      </View>
      {content.content_body && !isShort && (
        <GlassCard style={styles.contentCard}>
          <AppText style={styles.contentBody}>{content.content_body}</AppText>
        </GlassCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fullWidthVideoBleed: {
    marginHorizontal: -20,
    marginBottom: 12,
  },
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
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#000000",
    marginBottom: 8,
    position: "relative" as const,
    ...Shadow.card,
  },
  videoContainerShort: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#000000",
    marginBottom: 16,
    marginTop: 8,
    position: "relative" as const,
    ...Shadow.card,
  },
  uploadedVideo: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});
