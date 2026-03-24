// app/programs/index.tsx
// TCAS Program Browser Screen

import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "../../components/AppText";
import { useAuth } from "../../lib/auth";
import { searchPrograms, getEligibleRounds } from "../../lib/tcas";
import { getSavedProgramIds } from "../../lib/savedPrograms";
import { getProfile } from "../../lib/onboarding";
import type { ProgramTextSearchResult } from "../../types/tcas";
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

const ROUND_FILTERS = [
  { value: 0, label: "All Rounds" },
  { value: 1, label: "Round 1" },
  { value: 2, label: "Round 2" },
  { value: 3, label: "Round 3" },
  { value: 4, label: "Round 4" },
  { value: 5, label: "Round 5" },
];

export default function ProgramsBrowserScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<ProgramTextSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userGpax, setUserGpax] = useState<number | null>(null);
  const [isThai, setIsThai] = useState(false);

  const { user, isGuest, guestLanguage } = useAuth();
  const insets = useSafeAreaInsets();

  // Load user data
  useEffect(() => {
    if (isGuest) {
      setIsThai(guestLanguage === "th");
      return;
    }
    if (user?.id) {
      getProfile(user.id).then((p) => {
        setIsThai(p?.preferred_language === "th");
        // GPAX would come from a TCAS profile table, not the main profile
      });
    }
    getSavedProgramIds().then(setSavedIds).catch(console.error);
  }, [guestLanguage, isGuest, user?.id]);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchPrograms(query, 50);
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const filteredResults = selectedRound === 0
    ? results
    : results.filter((r) => r.round_numbers?.includes(selectedRound) ?? false);

  const copy = isThai
    ? {
        title: "ค้นหาสาขา",
        searchPlaceholder: "ค้นหาชื่อสาขา คณะ หรือมหาวิทยาลัย...",
        noResults: "ไม่พบผลลัพธ์",
        saved: "บันทึกแล้ว",
        eligible: "มีสิทธิ์",
      }
    : {
        title: "Browse Programs",
        searchPlaceholder: "Search programs, faculties, universities...",
        noResults: "No programs found",
        saved: "Saved",
        eligible: "Eligible",
      };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{copy.title}</Text>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[
              styles.searchInput,
              isThai && { fontFamily: "BaiJamjuree_400Regular", paddingTop: 4 },
            ]}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* Round Filters */}
        <FlatList
          horizontal
          data={ROUND_FILTERS}
          keyExtractor={(item) => item.value.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterChip,
                selectedRound === item.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedRound(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedRound === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Accent.yellow} />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.program_id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{copy.noResults}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ProgramCard
              program={item}
              isSaved={savedIds.has(item.program_id)}
              isThai={isThai}
              onPress={() => router.push(`/programs/${item.program_id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

function ProgramCard({
  program,
  isSaved,
  isThai,
  onPress,
}: {
  program: ProgramTextSearchResult;
  isSaved: boolean;
  isThai: boolean;
  onPress: () => void;
}) {
  // program_name is Thai, program_name_en is English
  const displayName = isThai
    ? program.program_name
    : (program.program_name_en ?? program.program_name);

  const facultyName = isThai
    ? program.faculty_name
    : (program.faculty_name_en ?? program.faculty_name);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {displayName}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {facultyName}
        </Text>
        {program.university_name && (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {program.university_name}
          </Text>
        )}
      </View>
      {isSaved && (
        <View style={styles.savedBadge}>
          <Text style={styles.savedBadgeText}>★</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  header: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: Space.md,
    gap: Space.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: ThemeText.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Border.default,
    paddingHorizontal: Space.lg,
    height: 48,
    gap: Space.sm,
    ...Shadow.neutral,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Orbit_400Regular",
    fontSize: Type.body.fontSize,
    color: ThemeText.primary,
  },
  filterList: {
    gap: Space.sm,
  },
  filterChip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Border.default,
  },
  filterChipActive: {
    backgroundColor: Accent.yellow,
    borderColor: Accent.yellow,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: ThemeText.secondary,
  },
  filterChipTextActive: {
    color: "#111",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsList: {
    paddingHorizontal: Space["2xl"],
    paddingBottom: 120,
    gap: Space.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Space["3xl"],
  },
  emptyText: {
    fontSize: Type.body.fontSize,
    color: ThemeText.tertiary,
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
    transform: [{ scale: 0.98 }],
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
  cardMeta: {
    fontSize: 12,
    color: ThemeText.tertiary,
  },
  savedBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Accent.yellow,
    justifyContent: "center",
    alignItems: "center",
  },
  savedBadgeText: {
    fontSize: 14,
    color: "#111",
  },
});