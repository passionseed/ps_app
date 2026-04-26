// components/Hackathon/ChatComicViewer.tsx
// Interactive group-chat comic viewer for hackathon phase activities
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
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
  type: "text" | "image" | "video";
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

// ── Tokens ────────────────────────────────────────────────────────
const BG = "#03050a";
const WHITE = "#FFFFFF";
const WHITE75 = "rgba(255,255,255,0.75)";
const WHITE55 = "rgba(255,255,255,0.55)";
const WHITE28 = "rgba(255,255,255,0.28)";
const CYAN = "#91C4E3";
const GREEN_BUBBLE = "#1F3A2F";
const GREEN_BUBBLE_BORDER = "rgba(74,222,128,0.25)";
const GRAY_BUBBLE = "rgba(30,35,42,0.95)";
const GRAY_BUBBLE_BORDER = "rgba(255,255,255,0.08)";
const TYPING_DOT = "rgba(145,196,227,0.6)";

const MENTOR_SENDERS = ["Mentor Kai", "mentor kai", "Mentor"];

// ── Helpers ───────────────────────────────────────────────────────
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
          style={{ color: CYAN, textDecorationLine: "underline" }}
        >
          {part}
        </AppText>
      );
    }
    return <AppText key={i}>{part}</AppText>;
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
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
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
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, s1]} />
        <Animated.View style={[styles.typingDot, s2]} />
        <Animated.View style={[styles.typingDot, s3]} />
      </View>
    </View>
  );
}

function ChatBubble({
  message,
  isRevealed,
}: {
  message: ChatComicMessage;
  isRevealed: boolean;
}) {
  const fromMentor = isMentor(message.sender);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (isRevealed) {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    }
  }, [isRevealed, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  if (!isRevealed) return null;

  return (
    <Animated.View
      style={[
        styles.messageRow,
        fromMentor ? styles.rowLeft : styles.rowRight,
      ]}
    >
      <Animated.View
        style={[
          styles.bubbleWrap,
          animStyle,
          fromMentor ? styles.bubbleWrapLeft : styles.bubbleWrapRight,
        ]}
      >
        {/* Avatar */}
        <View style={[styles.avatar, fromMentor ? styles.avatarLeft : styles.avatarRight]}>
          <AppText style={styles.avatarText}>{message.avatar}</AppText>
        </View>

        {/* Bubble */}
        <View
          style={[
            styles.bubble,
            fromMentor ? styles.bubbleLeft : styles.bubbleRight,
          ]}
        >
          <AppText
            style={[
              styles.senderLabel,
              fromMentor ? { color: CYAN } : { color: "#4ADE80" },
            ]}
          >
            {message.sender}
          </AppText>

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
    </Animated.View>
  );
}

function ChatImage({ content, caption }: { content: string; caption?: string }) {
  const [expanded, setExpanded] = useState(false);
  const { width } = useWindowDimensions();
  const imgWidth = Math.min(width - 100, 200);

  return (
    <>
      <Pressable onPress={() => setExpanded(true)}>
        <Image
          source={{ uri: content }}
          style={[styles.chatImage, { width: imgWidth, height: imgWidth * 0.65 }]}
          resizeMode="cover"
        />
      </Pressable>
      {caption ? <AppText style={styles.captionText}>{caption}</AppText> : null}

      <Modal visible={expanded} transparent animationType="fade">
        <Pressable style={styles.imageModal} onPress={() => setExpanded(false)}>
          <Image
            source={{ uri: content }}
            style={styles.imageModalImg}
            resizeMode="contain"
          />
          <AppText style={styles.imageModalHint}>แตะเพื่อปิด</AppText>
        </Pressable>
      </Modal>
    </>
  );
}

function ChatVideo({ content, caption }: { content: string; caption?: string }) {
  const { width } = useWindowDimensions();
  const imgWidth = Math.min(width - 100, 200);

  return (
    <View>
      <View style={[styles.videoThumb, { width: imgWidth, height: imgWidth * 0.56 }]}>
        <AppText style={styles.videoPlayIcon}>▶</AppText>
        <AppText style={styles.videoUrl} numberOfLines={1}>
          {content}
        </AppText>
      </View>
      {caption ? <AppText style={styles.captionText}>{caption}</AppText> : null}
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
  const { height: viewportHeight } = useWindowDimensions();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const revealNext = useCallback(() => {
    if (isComplete || isTyping) return;

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
  }, [isComplete, isTyping, messages, revealedCount, scrollToBottom]);

  // Auto-scroll when new messages appear
  useEffect(() => {
    scrollToBottom();
  }, [revealedCount, scrollToBottom]);

  const hasMore = revealedCount < messages.length;

  return (
    <View style={styles.root}>
      {/* Faint gradient background */}
      <LinearGradient
        colors={["rgba(5,10,20,1)", "rgba(3,5,10,1)", "rgba(5,10,20,1)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Sticky header */}
      {title ? (
        <View style={styles.header}>
          <AppText variant="bold" style={styles.headerTitle}>{title}</AppText>
        </View>
      ) : null}

      {/* Scrollable chat content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        onTouchStart={(e) => {
          // Capture touch so parent doesn't scroll
          e.stopPropagation?.();
        }}
      >

        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            message={msg}
            isRevealed={i < revealedCount}
          />
        ))}

        {isTyping && <TypingIndicator />}

        {isComplete && (
          <View style={styles.completeRow}>
            <AppText style={styles.completeText}>— จบการสนทนา —</AppText>
          </View>
        )}

        {/* Shimmer hint at bottom */}
        <ShimmerHint visible={!isComplete && hasMore} />
      </ScrollView>

      {/* Tap anywhere to reveal next */}
      {clickToReveal && !isComplete && (
        <Pressable style={styles.tapArea} onPress={revealNext} />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.sm,
    paddingVertical: Space.sm,
    gap: Space.xs,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: "flex-end",
  },

  // Header (sticky at top)
  header: {
    paddingHorizontal: Space.md,
    paddingTop: Space.xs,
    paddingBottom: Space.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,107,130,0.2)",
    backgroundColor: "rgba(3,5,10,0.95)",
  },
  headerTitle: {
    fontSize: 12,
    color: WHITE,
    textAlign: "center",
  },

  // Tap area (invisible overlay for interaction)
  tapArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  // Message row
  messageRow: {
    flexDirection: "row",
    width: "100%",
  },
  rowLeft: {
    justifyContent: "flex-start",
  },
  rowRight: {
    justifyContent: "flex-end",
  },

  bubbleWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "80%",
    gap: 4,
  },
  bubbleWrapLeft: {
    flexDirection: "row",
  },
  bubbleWrapRight: {
    flexDirection: "row-reverse",
  },

  // Avatar
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(145,196,227,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
  },
  avatarLeft: {
    marginRight: 4,
  },
  avatarRight: {
    marginLeft: 4,
  },
  avatarText: {
    fontSize: 13,
  },

  // Bubble
  bubble: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  bubbleLeft: {
    backgroundColor: GRAY_BUBBLE,
    borderWidth: 1,
    borderColor: GRAY_BUBBLE_BORDER,
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: GREEN_BUBBLE,
    borderWidth: 1,
    borderColor: GREEN_BUBBLE_BORDER,
    borderBottomRightRadius: 4,
  },
  senderLabel: {
    fontSize: 10,
    fontFamily: "BaiJamjuree_600SemiBold",
    marginBottom: 1,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
    color: WHITE75,
    fontFamily: "BaiJamjuree_400Regular",
  },

  // Media
  chatImage: {
    borderRadius: 8,
    marginTop: 2,
    maxWidth: 180,
  },
  captionText: {
    fontSize: 10,
    color: WHITE55,
    marginTop: 2,
    fontFamily: "BaiJamjuree_400Regular",
  },
  videoThumb: {
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    gap: 4,
  },
  videoPlayIcon: {
    fontSize: 20,
    color: WHITE75,
  },
  videoUrl: {
    fontSize: 9,
    color: WHITE28,
    paddingHorizontal: 6,
  },

  // Image modal
  imageModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalImg: {
    width: "90%",
    height: "70%",
  },
  imageModalHint: {
    marginTop: 16,
    fontSize: 13,
    color: WHITE55,
    fontFamily: "BaiJamjuree_400Regular",
  },

  // Typing
  typingRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 2,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: GRAY_BUBBLE,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: GRAY_BUBBLE_BORDER,
    marginLeft: 32,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TYPING_DOT,
  },

  // Complete
  completeRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  completeText: {
    fontSize: 10,
    color: WHITE28,
    fontFamily: "BaiJamjuree_400Regular",
  },

  // Shimmer hint
  shimmerHint: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 4,
  },
  shimmerLine: {
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: CYAN,
  },
  shimmerText: {
    fontSize: 10,
    color: "rgba(145,196,227,0.5)",
    fontFamily: "BaiJamjuree_400Regular",
  },
});
