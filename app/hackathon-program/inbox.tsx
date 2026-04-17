import { useCallback, useState, useEffect } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/AppText";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { Space } from "../../lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { InboxItemWithUnread, InboxItemType } from "../../types/hackathon-inbox";
import {
  getInboxItems,
  markInboxItemRead,
  markAllInboxItemsRead,
  getUnreadInboxCount,
} from "../../lib/hackathonInbox";

const CYAN = "#91C4E3";
const BG_DEEP = "#03050a";
const CARD_BG = "rgba(7, 12, 20, 0.94)";
const CARD_BORDER = "rgba(145, 196, 227, 0.1)";
const CYAN_10 = "rgba(145, 196, 227, 0.1)";
const CYAN_15 = "rgba(145, 196, 227, 0.15)";
const CYAN_20 = "rgba(145, 196, 227, 0.2)";
const WHITE = "#FFFFFF";
const WHITE_90 = "rgba(255, 255, 255, 0.9)";
const WHITE_60 = "rgba(255, 255, 255, 0.6)";
const WHITE_45 = "rgba(255, 255, 255, 0.45)";
const WHITE_30 = "rgba(255, 255, 255, 0.3)";

function Badge({ label, color, bgColor }: { label: string; color: string; bgColor: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <AppText style={[styles.badgeText, { color }]}>
        {label}
      </AppText>
    </View>
  );
}

function InboxItemRow({
  item,
  onPress,
}: {
  item: InboxItemWithUnread;
  onPress: (item: InboxItemWithUnread) => void;
}) {
  const getIconForType = (type: InboxItemType) => {
    switch (type) {
      case "assessment_review":
        return "checkmark-circle";
      case "mentor_comment":
        return "chatbubble";
      case "admin_announcement":
        return "megaphone";
      case "system":
        return "notifications";
      default:
        return "mail";
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Pressable onPress={() => onPress(item)} style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <View
          style={[
            styles.iconContainer,
            item.isUnread && styles.unreadIconContainer,
          ]}
        >
          <Ionicons
            name={getIconForType(item.type)}
            size={20}
            color={item.isUnread ? CYAN : WHITE_60}
          />
        </View>
        <View style={styles.itemContent}>
          <AppText
            style={[
              styles.itemTitle,
              !item.isUnread && { color: WHITE_60, fontWeight: "400" },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </AppText>
          <AppText style={styles.itemBody} numberOfLines={2}>
            {item.body}
          </AppText>
          <View style={styles.itemFooter}>
            <AppText style={styles.itemTime}>
              {formatRelativeTime(item.created_at)}
            </AppText>
            {item.isUnread && (
              <Badge
                label="NEW"
                color={CYAN}
                bgColor={CYAN_15}
              />
            )}
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={WHITE_30} />
    </Pressable>
  );
}

export default function InboxScreen() {
  const [items, setItems] = useState<InboxItemWithUnread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const insets = useSafeAreaInsets();

  const loadItems = useCallback(async () => {
    try {
      const response = await getInboxItems({
        unreadOnly: activeFilter === "unread",
        limit: 50,
      });
      setItems(response.items);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error("Failed to load inbox:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getUnreadInboxCount();
      setUnreadCount(count);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleItemPress = async (item: InboxItemWithUnread) => {
    if (item.isUnread) {
      try {
        await markInboxItemRead(item.id);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, isUnread: false, read_at: new Date().toISOString() } : i
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    if (item.action_url) {
      router.push(item.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllInboxItemsRead();
      setItems((prev) =>
        prev.map((i) => ({ ...i, isUnread: false, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadItems();
            }}
            tintColor={CYAN}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={WHITE} />
          </Pressable>
          <AppText style={styles.headerTitle}>
            Inbox
          </AppText>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
              <AppText style={styles.markAllText}>Mark all read</AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => setActiveFilter("all")}
            style={[styles.filterTab, activeFilter === "all" && styles.activeFilterTab]}
          >
            <AppText
              style={[
                styles.filterText,
                activeFilter === "all" && styles.activeFilterText,
              ]}
            >
              All
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setActiveFilter("unread")}
            style={[styles.filterTab, activeFilter === "unread" && styles.activeFilterTab]}
          >
            <AppText
              style={[
                styles.filterText,
                activeFilter === "unread" && styles.activeFilterText,
              ]}
            >
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </AppText>
          </Pressable>
        </View>

        <View style={styles.listCard}>
          {items.length > 0 ? (
            <View style={styles.listContainer}>
              {items.map((item: InboxItemWithUnread, index: number) => (
                <View key={item.id}>
                  <InboxItemRow item={item} onPress={handleItemPress} />
                  {index < items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open" size={48} color={WHITE_30} />
              <AppText style={styles.emptyTitle}>
                {activeFilter === "unread" ? "No unread messages" : "No messages yet"}
              </AppText>
              <AppText style={styles.emptySubtitle}>
                {activeFilter === "unread"
                  ? "You're all caught up!"
                  : "When mentors or admins send you feedback, it will appear here."}
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_DEEP,
  },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG_DEEP,
  },
  content: {
    padding: Space.xl,
    paddingBottom: 120,
    gap: Space.xl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    color: WHITE,
    flex: 1,
    marginLeft: 12,
    fontFamily: "BaiJamjuree_700Bold",
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: CYAN,
    fontFamily: "BaiJamjuree_600SemiBold",
  },

  filterContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CYAN_10,
  },
  activeFilterTab: {
    backgroundColor: CYAN,
  },
  filterText: {
    fontSize: 14,
    color: WHITE_60,
    fontFamily: "BaiJamjuree_600SemiBold",
  },
  activeFilterText: {
    color: "#000000",
  },

  listCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },
  listContainer: {
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: CARD_BORDER,
    marginHorizontal: 16,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CYAN_10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  unreadIconContainer: {
    backgroundColor: CYAN_20,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    color: WHITE,
    fontFamily: "BaiJamjuree_600SemiBold",
  },
  itemBody: {
    fontSize: 14,
    lineHeight: 20,
    color: WHITE_60,
    fontFamily: "BaiJamjuree_400Regular",
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  itemTime: {
    fontSize: 12,
    color: WHITE_45,
    fontFamily: "BaiJamjuree_400Regular",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "BaiJamjuree_700Bold",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: WHITE_60,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "BaiJamjuree_400Regular",
  },
});
