import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { GlassCard } from "../Glass/GlassCard";
import { AppText } from "../AppText";
import type { InboxPreview, InboxItemWithUnread } from "../../types/hackathon-inbox";
import { Accent, Space, Text as ThemeText, Type } from "../../lib/theme";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface InboxCardProps {
  preview: InboxPreview | null;
  loading?: boolean;
  darkTheme?: boolean;
}

const CYAN = "#91C4E3";
const CARD_BG = "rgba(7, 12, 20, 0.94)";
const CARD_BORDER = "rgba(145, 196, 227, 0.1)";
const CYAN_20 = "rgba(145, 196, 227, 0.2)";
const WHITE = "#FFFFFF";
const WHITE_90 = "rgba(255, 255, 255, 0.9)";
const WHITE_60 = "rgba(255, 255, 255, 0.6)";
const WHITE_40 = "rgba(255, 255, 255, 0.4)";

export function InboxCard({ preview, loading, darkTheme }: InboxCardProps) {
  const handlePress = () => {
    router.push("/hackathon-program/inbox");
  };

  const unreadCount = preview?.unreadCount ?? 0;
  const hasItems = (preview?.totalCount ?? 0) > 0;
  const recentItems = preview?.recentItems ?? [];

  if (loading) {
    if (darkTheme) {
      return (
        <View style={darkStyles.card}>
          <View style={styles.loadingContainer}>
            <View style={[styles.skeletonBadge, { backgroundColor: WHITE_40 }]} />
            <View style={[styles.skeletonLine, { backgroundColor: WHITE_40 }]} />
          </View>
        </View>
      );
    }
    return (
      <GlassCard size="medium" variant="neutral" style={styles.card}>
        <View style={styles.loadingContainer}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonLine} />
        </View>
      </GlassCard>
    );
  }

  if (darkTheme) {
    return (
      <Pressable onPress={handlePress}>
        <View style={darkStyles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[darkStyles.iconContainer]}>
                <Ionicons name="mail" size={20} color={CYAN} />
              </View>
              <AppText style={darkStyles.title}>
                Inbox
              </AppText>
              {unreadCount > 0 && (
                <View style={[darkStyles.badge, { backgroundColor: CYAN }]}>
                  <AppText style={darkStyles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </AppText>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={WHITE_60} />
          </View>

          {hasItems ? (
            <View style={styles.content}>
              {recentItems.slice(0, 2).map((item: InboxItemWithUnread) => (
                <View key={item.id} style={styles.itemRow}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: item.isUnread ? CYAN : WHITE_40 },
                    ]}
                  />
                  <AppText
                    style={[
                      darkStyles.itemTitle,
                      !item.isUnread && { color: WHITE_60, fontWeight: "400" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </AppText>
                </View>
              ))}
              {unreadCount > recentItems.length && (
                <AppText style={[darkStyles.moreText, { marginLeft: Space.md + 8 }]}>
                  +{unreadCount - recentItems.length} more unread
                </AppText>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <AppText style={darkStyles.emptyText}>No messages yet</AppText>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress}>
      <GlassCard size="medium" variant="education" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconContainer, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
              <Ionicons name="mail" size={20} color={Accent.purple} />
            </View>
            <AppText variant="bold" style={styles.title}>
              Inbox
            </AppText>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: Accent.purple }]}>
                <AppText variant="bold" style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </AppText>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={ThemeText.tertiary} />
        </View>

        {hasItems ? (
          <View style={styles.content}>
            {recentItems.slice(0, 2).map((item: InboxItemWithUnread) => (
              <View key={item.id} style={styles.itemRow}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: item.isUnread ? Accent.purple : ThemeText.muted },
                  ]}
                />
                <AppText
                  variant="bold"
                  style={[
                    styles.itemTitle,
                    !item.isUnread && styles.readItemTitle,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </AppText>
              </View>
            ))}
            {unreadCount > recentItems.length && (
              <AppText style={[styles.moreText, { marginLeft: Space.md + 8 }]}>
                +{unreadCount - recentItems.length} more unread
              </AppText>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <AppText style={styles.emptyText}>No messages yet</AppText>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
  },
  loadingContainer: {
    gap: Space.md,
  },
  skeletonBadge: {
    width: 60,
    height: 20,
    backgroundColor: ThemeText.muted,
    borderRadius: Space.sm,
    opacity: 0.3,
  },
  skeletonLine: {
    width: "80%",
    height: 16,
    backgroundColor: ThemeText.muted,
    borderRadius: Space.sm,
    opacity: 0.3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Type.subtitle.fontSize,
    color: ThemeText.primary,
  },
  badge: {
    backgroundColor: Accent.purple,
    borderRadius: 12,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  content: {
    gap: Space.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTitle: {
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
    flex: 1,
  },
  readItemTitle: {
    color: ThemeText.secondary,
    fontWeight: "400",
  },
  moreText: {
    fontSize: Type.caption.fontSize,
    color: ThemeText.tertiary,
  },
  emptyContainer: {
    paddingVertical: Space.sm,
  },
  emptyText: {
    fontSize: Type.body.fontSize,
    color: ThemeText.tertiary,
  },
});

const darkStyles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    gap: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CYAN_20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    color: WHITE,
    fontFamily: "BaiJamjuree_700Bold",
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    color: "#000000",
    fontFamily: "BaiJamjuree_700Bold",
  },
  itemTitle: {
    fontSize: 14,
    color: WHITE_90,
    fontFamily: "BaiJamjuree_600SemiBold",
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    color: WHITE_60,
    fontFamily: "BaiJamjuree_500Medium",
  },
  emptyText: {
    fontSize: 14,
    color: WHITE_60,
    fontFamily: "BaiJamjuree_400Regular",
  },
});
