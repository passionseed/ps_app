// components/Hackathon/ChatComicViewer.tsx
// Interactive group-chat comic viewer for hackathon phase activities
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
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
import { Space } from "../../lib/theme";

// ── Types ─────────────────────────────────────────────────────────
export interface ChatComicMessage {
  sender: string;
  avatar: string;
  type: "text" | "image" | "video" | "system";
  content: string;
  caption?: string;
}

export interface ChatComicData {
  messages: ChatComicMessage[];
}

export interface ChatComicMetadata {
  chat_style?: "whatsapp" | "messenger" | "line";
  click_to_reveal?: boolean;
  show_typing_indicator?: boolean;
}

interface ChatComicViewerProps {
  data: ChatComicData;
  metadata?: ChatComicMetadata;
  title?: string | null;
}

// ── Tokens (LINE Theme) ───────────────────────────────────────────
const LINE_BG = "#8ba2b9"; // Classic LINE blue-gray background
const WHITE = "#FFFFFF";
const BLACK_TEXT = "#111111";
const LINE_GREEN = "#85e249";
const SENDER_TEXT = "rgba(255,255,255,0.85)";

const MENTOR_SENDERS = ["Mentor Kai", "mentor kai", "Mentor", "P'Seed", "p'seed"];
const PSEED_LOGO = require("../../assets/apple-touch-icon.png");

// ── Helpers ───────────────────────────────────────────────────────
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

function isMentor(sender: string): boolean {
  return MENTOR_SENDERS.some((m) => sender.toLowerCase().includes(m.toLowerCase()));
}

function shouldShowTyping(
  messages: ChatComicMessage[],
  revealedCount: number
): boolean {
  if (revealedCount >= messages.length) return false;
  if (revealedCount === 0) return false;
  const prevSender = messages[revealedCount - 1].sender;
  const nextSender = messages[revealedCount].sender;
  return prevSender !== nextSender;
}

function autoLinkText(text: string): React.ReactNode {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);
  return parts.map((part, i) => {
    if (urlPattern.test(part)) {
      return (
        <AppText
          key={i}
          style={{ color: "#003399", textDecorationLine: "underline" }}
          onPress={() => WebBrowser.openBrowserAsync(part)}
        >
          {part}
        </AppText>
      );
    }
    return <AppText key={i} style={{ color: BLACK_TEXT }}>{part}</AppText>;
  });
}

// ── Sub-components ────────────────────────────────────────────────
function ShimmerHint({ visible }: { visible: boolean }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
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

function ChatImage({ content, caption }: { content: string; caption?: string }) {
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

  const animatedStyle = useAnimatedStyle(() => ({
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
      <Pressable onPress={() => setExpanded(true)} style={styles.chatImageWrap}>
        <Image
          source={{ uri: content }}
          style={[styles.chatImage, { width: imgWidth, height: imgWidth * 1.2 }]}
          resizeMode="cover"
        />
        {caption ? (
          <View style={styles.captionWrap}>
            <AppText style={styles.captionText}>{caption}</AppText>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={expanded} transparent animationType="fade" onRequestClose={resetAndClose}>
        <View style={styles.imageModal}>
          <Pressable style={styles.closeBtn} onPress={resetAndClose}>
            <AppText style={styles.closeBtnText}>×</AppText>
          </Pressable>
          
          <GestureDetector gesture={composed}>
            <Animated.Image
              source={{ uri: content }}
              style={[styles.imageModalImg, animatedStyle]}
              resizeMode="contain"
            />
          </GestureDetector>

          {scale.value === 1 && (
            <AppText style={styles.imageModalHint}>จีบนิ้วเพื่อซูม • แตะปุ่มปิด</AppText>
          )}
        </View>
      </Modal>
    </>
  );
}

function ChatVideo({ content, caption }: { content: string; caption?: string }) {
  const { width } = useWindowDimensions();
  const imgWidth = Math.min(width - 140, 240);
  const videoId = extractYouTubeId(content);
  const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : null;

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
      <View style={[styles.videoThumb, { width: imgWidth, height: imgWidth * 0.56 }]}>
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={[styles.playIconWrap, { marginBottom: 0 }]}>
          <AppText style={styles.videoPlayIcon}>▶</AppText>
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

function ChatBubble({
  message,
  isRevealed,
  showAvatarAndName,
}: {
  message: ChatComicMessage;
  isRevealed: boolean;
  showAvatarAndName: boolean;
}) {
  // Mentor (Other) on LEFT, Students/Teams (Me) on RIGHT
  const onLeft = isMentor(message.sender) || message.avatar === 'pseed';
  
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

  const isAvatarUrl = message.avatar && (message.avatar.startsWith("http") || message.avatar.startsWith("/"));

  const BubbleContent = (
    <View style={[styles.bubbleWrap, onLeft ? styles.bubbleWrapLeft : styles.bubbleWrapRight]}>
      {showAvatarAndName && (
        <AppText style={[styles.senderLabel, !onLeft && { textAlign: "right" }]}>
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
            <ChatImage content={message.content} caption={message.caption} />
          )}
          {message.type === "video" && (
            <ChatVideo content={message.content} caption={message.caption} />
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
            <Image source={PSEED_LOGO} style={styles.avatarImage} />
          ) : isAvatarUrl ? (
            <Image source={{ uri: message.avatar }} style={styles.avatarImage} />
          ) : (
            <AppText style={styles.avatarText}>{message.avatar || message.sender.substring(0, 1)}</AppText>
          )}
        </View>
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
    </View>
  );

  return (
    <View style={[styles.messageRow, onLeft ? styles.rowLeft : styles.rowRight, !showAvatarAndName && styles.messageRowCompact]}>
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
export default function ChatComicViewer({
  data,
  metadata,
  title,
}: ChatComicViewerProps) {
  const { messages } = data;
  const clickToReveal = metadata?.click_to_reveal ?? true;

  const [revealedCount, setRevealedCount] = useState(clickToReveal ? 1 : messages.length);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(!clickToReveal);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const revealNext = useCallback(() => {
    if (isComplete || isTyping || !clickToReveal) return;

    const showTyping = shouldShowTyping(messages, revealedCount);

    if (showTyping && revealedCount < messages.length) {
      setIsTyping(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTimeout(() => {
        setIsTyping(false);
        setRevealedCount((prev) => {
          const next = prev + 1;
          if (next >= messages.length) {
            setIsComplete(true);
          }
          return next;
        });
        scrollToBottom();
      }, 700);
    } else {
      setRevealedCount((prev) => {
        const next = prev + 1;
        if (next >= messages.length) {
          setIsComplete(true);
        }
        return next;
      });
      scrollToBottom();
    }
  }, [isComplete, isTyping, clickToReveal, messages, revealedCount, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [revealedCount, scrollToBottom]);

  const hasMore = revealedCount < messages.length;

  return (
    <View style={styles.root}>
      {title ? (
        <View style={styles.header}>
          <AppText variant="bold" style={styles.headerTitle}>{title}</AppText>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        onTouchStart={(e) => {
          e.stopPropagation?.();
        }}
      >
        <Pressable 
          onPress={revealNext} 
          style={styles.revealWrapper}
          disabled={!clickToReveal || isComplete}
        >
          <View style={styles.dateLabelWrap}>
            <View style={styles.dateLabel}>
              <AppText style={styles.dateLabelText}>วันนี้</AppText>
            </View>
          </View>

          {messages.map((msg, i) => {
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const showAvatarAndName = !prevMsg || prevMsg.sender !== msg.sender;

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
              <AppText style={styles.completeText}>— จบการสนทนา —</AppText>
            </View>
          )}

          <ShimmerHint visible={!isComplete && hasMore && clickToReveal} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LINE_BG,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
    overflow: "hidden",
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
    justifyContent: "flex-end",
  },
  header: {
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    paddingBottom: Space.sm,
    backgroundColor: "#2a3641",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    color: WHITE,
  },
  dateLabelWrap: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateLabel: {
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  dateLabelText: {
    fontSize: 11,
    color: WHITE,
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
    backgroundColor: "#fff",
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
    color: "#666",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  senderLabel: {
    fontSize: 11,
    color: SENDER_TEXT,
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
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleLeft: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: LINE_GREEN,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: BLACK_TEXT,
    fontFamily: "BaiJamjuree_400Regular",
  },
  chatImageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 2,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  chatImage: {
    borderRadius: 12,
  },
  captionWrap: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  captionText: {
    fontSize: 12,
    color: "#333",
    fontFamily: "BaiJamjuree_400Regular",
  },
  videoThumb: {
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  playIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  videoPlayIcon: {
    fontSize: 20,
    color: WHITE,
    marginLeft: 4,
  },
  videoUrl: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
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
    color: WHITE,
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
    color: WHITE,
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
    backgroundColor: WHITE,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#aaa",
  },
  completeRow: {
    alignItems: "center",
    paddingVertical: 16,
  },
  completeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
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
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  shimmerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
});
