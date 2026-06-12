/**
 * PathlabChatComic — Light-theme LINE-style chat messenger viewer.
 *
 * Ported from ChatComicViewer (Hackathon) and adapted for PathLab's
 * light design system.  Features:
 *  - Left/right aligned chat bubbles with avatars
 *  - Tap-to-reveal messages with staggered animation
 *  - Typing indicator with dot animation
 *  - Inline image and video media with expand-to-fullscreen
 *  - Auto-linked URLs in text messages
 *  - Shimmer hint for unread messages
 *
 * Content type: chat_comic
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  clamp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "../AppText";
import { Space, Text as ThemeText, Accent } from "../../lib/theme";
import { IMG } from "../../lib/imageResize";

// ── Types ─────────────────────────────────────────────────────────

export interface ChatComicMessage {
  sender: string;
  avatar: string;
  type: "text" | "image" | "video" | "system";
  content: string;
  caption?: string;
}

export interface PathlabChatComicProps {
  messages: ChatComicMessage[];
  chatStyle?: "whatsapp" | "messenger" | "line";
  clickToReveal?: boolean;
  showTypingIndicator?: boolean;
  title?: string | null;
}

// ── Light-theme design tokens ─────────────────────────────────────

const CHAT_BG = "#F3F4F6"; // Off-white page background
const CHAT_HEADER_BG = "#FFFFFF";
const CHAT_HEADER_BORDER = "rgba(0,0,0,0.06)";
const BUBBLE_RECEIVED = "#FFFFFF"; // White received bubbles
const BUBBLE_SENT = "#D1FAE5"; // Green-tinted sent bubbles
const BUBBLE_TEXT = ThemeText.primary; // #111827
const SENDER_LABEL = "#6B7280"; // Muted sender name
const DATE_LABEL_BG = "rgba(0,0,0,0.05)";
const DATE_LABEL_TEXT = ThemeText.tertiary; // #9CA3AF
const SHIMMER_TEXT = ThemeText.tertiary;
const SHIMMER_LINE_COLOR = "rgba(0,0,0,0.25)";
const COMPLETE_TEXT = ThemeText.tertiary;
const TYPING_DOT_COLOR = "#9CA3AF";
const VIDEO_BG = "#E2E8F0";
const CAPTION_BG = "rgba(0,0,0,0.03)";
const CAPTION_TEXT = "#4B5563";

// ── Mentor / system sender detection ──────────────────────────────

const MENTOR_SENDERS = [
  "Mentor Kai",
  "mentor kai",
  "Mentor",
  "P'Seed",
  "p'seed",
];

const PSEED_LOGO = require("../../assets/apple-touch-icon.png");

function isMentor(sender: string): boolean {
  return MENTOR_SENDERS.some((m) =>
    sender.toLowerCase().includes(m.toLowerCase()),
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s?]+)/,
    /youtube\.com\/embed\/([^&\s?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function shouldShowTyping(
  messages: ChatComicMessage[],
  revealedCount: number,
): boolean {
  if (revealedCount >= messages.length) return false;
  if (revealedCount === 0) return false;
  const prevSender = messages[revealedCount - 1].sender;
  const nextSender = messages[revealedCount].sender;
  return prevSender !== nextSender;
}

/** Auto-link URLs in text messages by splitting and rendering links separately. */
function autoLinkText(text: string): React.ReactNode {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);
  return parts.map((part, i) => {
    if (urlPattern.test(part)) {
      return (
        <AppText
          key={i}
          style={{ color: Accent.blue, textDecorationLine: "underline" }}
          onPress={() => WebBrowser.openBrowserAsync(part)}
        >
          {part}
        </AppText>
      );
    }
    return (
      <AppText key={i} style={{ color: BUBBLE_TEXT }}>
        {part}
      </AppText>
    );
  });
}

// ── Shimmer Hint ──────────────────────────────────────────────────

function ShimmerHint({ visible }: { visible: boolean }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    shimmer.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
  }, [visible, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 1]),
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.shimmerHint, shimmerStyle]}>
      <View style={styles.shimmerLine} />
      <AppText style={styles.shimmerText}>แตะเพื่อดูข้อความถัดไป</AppText>
    </Animated.View>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useSharedValue(0.4);
  const dot2 = useSharedValue(0.4);
  const dot3 = useSharedValue(0.4);

  useEffect(() => {
    const animate = () => {
      dot1.value = withTiming(1, { duration: 400 }, () => {
        dot1.value = withTiming(0.4, { duration: 400 });
      });
      setTimeout(() => {
        dot2.value = withTiming(1, { duration: 400 }, () => {
          dot2.value = withTiming(0.4, { duration: 400 });
        });
      }, 150);
      setTimeout(() => {
        dot3.value = withTiming(1, { duration: 400 }, () => {
          dot3.value = withTiming(0.4, { duration: 400 });
        });
      }, 300);
    };
    animate();
    const interval = setInterval(animate, 1200);
    return () => clearInterval(interval);
  }, [dot1, dot2, dot3]);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.typingRow}>
      <View style={styles.avatarPlaceholder} />
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, s1]} />
        <Animated.View style={[styles.typingDot, s2]} />
        <Animated.View style={[styles.typingDot, s3]} />
      </View>
    </View>
  );
}

// ── Chat Image (inline + fullscreen modal) ────────────────────────

function ChatImage({
  content,
  caption,
}: {
  content: string;
  caption?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { width } = useWindowDimensions();
  const imgWidth = Math.min(width - 140, 240);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, 1, 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ] as any,
  }));

  const resetAndClose = useCallback(() => {
    setExpanded(false);
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  return (
    <>
      <Pressable
        onPress={() => setExpanded(true)}
        style={styles.chatImageWrap}
      >
        <ExpoImage
          source={IMG.thumb(content)}
          style={[
            styles.chatImage,
            { width: imgWidth, height: imgWidth * 1.2 },
          ]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={content}
        />
        {caption ? (
          <View style={styles.captionWrap}>
            <AppText style={styles.captionText}>{caption}</AppText>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={resetAndClose}
      >
        <View style={styles.imageModal}>
          <Pressable style={styles.closeBtn} onPress={resetAndClose}>
            <AppText variant="bold" style={styles.closeBtnText}>
              ×
            </AppText>
          </Pressable>

          <GestureDetector gesture={composed}>
            <Animated.Image
              source={{ uri: content }}
              style={[styles.imageModalImg, zoomStyle]}
              resizeMode="contain"
            />
          </GestureDetector>

          {scale.value === 1 && (
            <AppText style={styles.imageModalHint}>
              จีบนิ้วเพื่อซูม • แตะปุ่มปิด
            </AppText>
          )}
        </View>
      </Modal>
    </>
  );
}

// ── Chat Video ────────────────────────────────────────────────────

function ChatVideo({
  content,
  caption,
}: {
  content: string;
  caption?: string;
}) {
  const { width } = useWindowDimensions();
  const imgWidth = Math.min(width - 140, 240);
  const videoId = extractYouTubeId(content);
  const thumbUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/0.jpg`
    : null;

  const handleOpen = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await WebBrowser.openBrowserAsync(content);
    } catch {
      Linking.openURL(content).catch(() => {});
    }
  };

  return (
    <Pressable onPress={handleOpen} style={styles.chatImageWrap}>
      <View
        style={[
          styles.videoThumb,
          { width: imgWidth, height: imgWidth * 0.56 },
        ]}
      >
        {thumbUrl ? (
          <ExpoImage
            source={thumbUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}
        <View style={[styles.playIconWrap, { marginBottom: 0 }]}>
          <AppText variant="bold" style={styles.videoPlayIcon}>
            ▶
          </AppText>
        </View>
        {!thumbUrl && (
          <AppText style={styles.videoUrl} numberOfLines={1}>
            {content}
          </AppText>
        )}
      </View>
      {caption ? (
        <View style={styles.captionWrap}>
          <AppText style={styles.captionText}>{caption}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────

function ChatBubble({
  message,
  isRevealed,
  showAvatarAndName,
}: {
  message: ChatComicMessage;
  isRevealed: boolean;
  showAvatarAndName: boolean;
}) {
  // Mentor / pseed on LEFT, others on RIGHT
  const onLeft = isMentor(message.sender) || message.avatar === "pseed";

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isRevealed) {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 150 });
    }
  }, [isRevealed, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!isRevealed) return null;

  const isAvatarUrl =
    message.avatar &&
    (message.avatar.startsWith("http") || message.avatar.startsWith("/"));

  const BubbleContent = (
    <View
      style={[
        styles.bubbleWrap,
        onLeft ? styles.bubbleWrapLeft : styles.bubbleWrapRight,
      ]}
    >
      {showAvatarAndName && (
        <AppText
          style={[
            styles.senderLabel,
            !onLeft && { textAlign: "right" },
          ]}
        >
          {message.sender}
        </AppText>
      )}
      <Animated.View style={[animStyle]}>
        <View
          style={[
            styles.bubble,
            onLeft ? styles.bubbleLeft : styles.bubbleRight,
            !showAvatarAndName && onLeft && { borderTopLeftRadius: 16 },
            !showAvatarAndName && !onLeft && { borderTopRightRadius: 16 },
          ]}
        >
          {message.type === "text" && (
            <AppText style={styles.bubbleText}>
              {autoLinkText(message.content)}
            </AppText>
          )}
          {message.type === "image" && (
            <ChatImage
              content={message.content}
              caption={message.caption}
            />
          )}
          {message.type === "video" && (
            <ChatVideo
              content={message.content}
              caption={message.caption}
            />
          )}
          {message.type === "system" && (
            <AppText style={styles.systemText}>{message.content}</AppText>
          )}
        </View>
      </Animated.View>
    </View>
  );

  const AvatarEl = (
    <View style={onLeft ? styles.avatarColLeft : styles.avatarColRight}>
      {showAvatarAndName ? (
        <View style={styles.avatar}>
          {message.avatar === "pseed" ? (
            <ExpoImage
              source={PSEED_LOGO}
              style={styles.avatarImage}
              cachePolicy="memory-disk"
            />
          ) : isAvatarUrl ? (
            <ExpoImage
              source={IMG.avatar(message.avatar)}
              style={styles.avatarImage}
              cachePolicy="memory-disk"
            />
          ) : (
            <AppText style={styles.avatarText}>
              {message.avatar || message.sender.substring(0, 1)}
            </AppText>
          )}
        </View>
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.messageRow,
        onLeft ? styles.rowLeft : styles.rowRight,
        !showAvatarAndName && styles.messageRowCompact,
      ]}
    >
      {onLeft ? (
        <>
          {AvatarEl}
          {BubbleContent}
        </>
      ) : (
        <>
          {BubbleContent}
          {AvatarEl}
        </>
      )}
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function PathlabChatComic({
  messages,
  clickToReveal = true,
  showTypingIndicator: showTypingProp = true,
  title = null,
}: PathlabChatComicProps) {
  const [revealedCount, setRevealedCount] = useState(
    clickToReveal ? 1 : messages.length,
  );
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(!clickToReveal);
  const scrollRef = useRef<ScrollView>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const revealNext = useCallback(() => {
    if (isComplete || isTyping || !clickToReveal) return;

    const showTyping =
      showTypingProp && shouldShowTyping(messages, revealedCount);

    if (showTyping && revealedCount < messages.length) {
      setIsTyping(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTimeout(() => {
        setIsTyping(false);
        setRevealedCount((prev) => {
          const next = prev + 1;
          if (next >= messages.length) setIsComplete(true);
          return next;
        });
        scrollToBottom();
      }, 700);
    } else {
      setRevealedCount((prev) => {
        const next = prev + 1;
        if (next >= messages.length) setIsComplete(true);
        return next;
      });
      scrollToBottom();
    }
  }, [
    isComplete,
    isTyping,
    clickToReveal,
    showTypingProp,
    messages,
    revealedCount,
    scrollToBottom,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [revealedCount, scrollToBottom]);

  const hasMore = revealedCount < messages.length;

  return (
    <View style={styles.root}>
      {title ? (
        <View style={styles.header}>
          <AppText variant="bold" style={styles.headerTitle}>
            {title}
          </AppText>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View
          style={styles.revealWrapper}
          onStartShouldSetResponder={() => false}
          onMoveShouldSetResponder={() => false}
          onTouchStart={(e) => {
            touchStartY.current = e.nativeEvent.pageY;
            touchStartX.current = e.nativeEvent.pageX;
          }}
          onTouchEnd={(e) => {
            const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
            const dx = Math.abs(e.nativeEvent.pageX - touchStartX.current);
            if (clickToReveal && !isComplete && dy < 10 && dx < 10) {
              revealNext();
            }
          }}
        >
          <View style={styles.dateLabelWrap}>
            <View style={styles.dateLabel}>
              <AppText style={styles.dateLabelText}>วันนี้</AppText>
            </View>
          </View>

          {messages.map((msg, i) => {
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const showAvatarAndName =
              !prevMsg || prevMsg.sender !== msg.sender;

            return (
              <ChatBubble
                key={i}
                message={msg}
                isRevealed={i < revealedCount}
                showAvatarAndName={showAvatarAndName}
              />
            );
          })}

          {isTyping && <TypingIndicator />}

          {isComplete && (
            <View style={styles.completeRow}>
              <AppText style={styles.completeText}>
                — จบการสนทนา —
              </AppText>
            </View>
          )}

          <ShimmerHint
            visible={!isComplete && hasMore && clickToReveal}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  revealWrapper: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    paddingBottom: Space.sm,
    backgroundColor: CHAT_HEADER_BG,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_HEADER_BORDER,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    color: ThemeText.primary,
  },
  dateLabelWrap: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateLabel: {
    backgroundColor: DATE_LABEL_BG,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  dateLabelText: {
    fontSize: 11,
    color: DATE_LABEL_TEXT,
  },
  messageRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 4,
  },
  messageRowCompact: {
    marginTop: -4,
  },
  rowLeft: {
    justifyContent: "flex-start",
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  bubbleWrap: {
    maxWidth: "75%",
  },
  bubbleWrapLeft: {
    alignItems: "flex-start",
  },
  bubbleWrapRight: {
    alignItems: "flex-end",
  },
  avatarColLeft: {
    width: 36,
    marginRight: 8,
    alignItems: "center",
  },
  avatarColRight: {
    width: 36,
    marginLeft: 8,
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6B7280",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  senderLabel: {
    fontSize: 11,
    color: SENDER_LABEL,
    marginBottom: 2,
    marginLeft: 2,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleLeft: {
    backgroundColor: BUBBLE_RECEIVED,
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: BUBBLE_SENT,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: BUBBLE_TEXT,
  },
  systemText: {
    fontSize: 13,
    lineHeight: 20,
    color: ThemeText.secondary,
    fontStyle: "italic",
  },
  chatImageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 2,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  chatImage: {
    borderRadius: 12,
  },
  captionWrap: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: CAPTION_BG,
  },
  captionText: {
    fontSize: 12,
    color: CAPTION_TEXT,
  },
  videoThumb: {
    backgroundColor: VIDEO_BG,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  playIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  videoPlayIcon: {
    fontSize: 20,
    color: "#FFFFFF",
    marginLeft: 4,
  },
  videoUrl: {
    fontSize: 10,
    color: "#6B7280",
    paddingHorizontal: 12,
  },
  imageModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalImg: {
    width: "100%",
    height: "100%",
  },
  imageModalHint: {
    position: "absolute",
    bottom: 40,
    fontSize: 14,
    color: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 30,
    color: "#FFFFFF",
    lineHeight: 34,
  },
  typingRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 4,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BUBBLE_RECEIVED,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TYPING_DOT_COLOR,
  },
  completeRow: {
    alignItems: "center",
    paddingVertical: 16,
  },
  completeText: {
    fontSize: 12,
    color: COMPLETE_TEXT,
  },
  shimmerHint: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
    marginTop: 8,
  },
  shimmerLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: SHIMMER_LINE_COLOR,
  },
  shimmerText: {
    fontSize: 12,
    color: SHIMMER_TEXT,
  },
});
