// app/saved/index.tsx
// Saved Programs Screen

import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
} from "react-native";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { useState, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { getSavedPrograms, unsaveProgram } from "../../lib/savedPrograms";
import type { SavedProgram } from "../../lib/savedPrograms";
import {
  PageBg,
  Text as ThemeText,
  Border,
  Shadow,
  Radius,
  Accent,
  Space,
  Type,
} from "../../lib/theme";

export default function SavedProgramsScreen() {
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const { appLanguage } = useAuth();
  const insets = useSafeAreaInsets();
  const isThai = appLanguage === "th";

  const loadSavedPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSavedPrograms();
      setSavedPrograms(data);
    } catch (error) {
      console.error("Failed to load saved programs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedPrograms();
    }, [loadSavedPrograms])
  );

  const handleRemove = async (programId: string) => {
    try {
      await unsaveProgram(programId);
      setSavedPrograms((prev) => prev.filter((p) => p.program_id !== programId));
    } catch (error) {
      console.error("Failed to remove program:", error);
    }
  };

  const copy = isThai
    ? {
        title: "สาขาที่บันทึกไว้",
        empty: "ยังไม่มีสาขาที่บันทึกไว้",
        emptySubtext: "เริ่มค้นหาและบันทึกสาขาที่สนใจ",
        browse: "ค้นหาสาขา",
        remove: "ลบ",
      }
    : {
        title: "Saved Programs",
        empty: "No saved programs yet",
        emptySubtext: "Start browsing and save programs you're interested in",
        browse: "Browse Programs",
        remove: "Remove",
      };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <Text style={styles.headerCount}>
          {savedPrograms.length} {isThai ? "สาขา" : "programs"}
        </Text>
      </View>

      {savedPrograms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>{copy.empty}</Text>
          <Text style={styles.emptySubtext}>{copy.emptySubtext}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.browseButton,
              pressed && styles.browseButtonPressed,
            ]}
            onPress={() => router.push("/programs")}
          >
            <Text style={styles.browseButtonText}>{copy.browse}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={savedPrograms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SavedProgramCard
              savedProgram={item}
              isThai={isThai}
              onPress={() => router.push(`/programs/${item.program_id}`)}
              onRemove={() => handleRemove(item.program_id)}
              removeText={copy.remove}
            />
          )}
        />
      )}
    </View>
  );
}

function SavedProgramCard({
  savedProgram,
  isThai,
  onPress,
  onRemove,
  removeText,
}: {
  savedProgram: SavedProgram;
  isThai: boolean;
  onPress: () => void;
  onRemove: () => void;
  removeText: string;
}) {
  const program = savedProgram.program;
  if (!program) return null;

  // program_name is Thai, program_name_en is English
  const displayName = isThai
    ? program.program_name
    : (program.program_name_en ?? program.program_name);

  const facultyName = isThai
    ? (program.faculty_name ?? '')
    : (program.faculty_name_en ?? program.faculty_name ?? '');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {displayName}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {facultyName}
        </Text>
      </View>
      <Pressable style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>{removeText}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PageBg.default,
  },
  header: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.lg,
    gap: Space.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  headerCount: {
    fontSize: 14,
    color: ThemeText.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Space["2xl"],
    gap: Space.md,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  emptySubtext: {
    fontSize: 14,
    color: ThemeText.tertiary,
    textAlign: "center",
  },
  browseButton: {
    backgroundColor: Accent.yellow,
    paddingHorizontal: Space["2xl"],
    paddingVertical: Space.lg,
    borderRadius: Radius.full,
    marginTop: Space.md,
  },
  browseButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  list: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: 120,
    gap: Space.md,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Border.default,
    padding: Space.lg,
    flexDirection: "row",
    alignItems: "center",
    ...Shadow.neutral,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardContent: {
    flex: 1,
    gap: Space.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: ThemeText.primary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: ThemeText.secondary,
  },
  removeButton: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    backgroundColor: "#FEE2E2",
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#DC2626",
  },
});
