import { View, ScrollView, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { AppText as Text } from "../AppText";
import type { SeedRecommendation } from "../../lib/seedRecommendations";
import { styles } from "./discoverStyles";

export function SeedSection({
  title,
  seeds,
  showEmptyCards = false,
}: {
  title: string;
  seeds: SeedRecommendation[];
  showEmptyCards?: boolean;
}) {
  if (seeds.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionGrid}
        style={styles.fullWidthScroll}
      >
        {seeds.map((seed, index) => (
          <CompactSeedCard
            key={seed.id || `seed-${index}`}
            seed={seed}
            onPress={() => {
              router.push(`/seed/${seed.id}`);
            }}
          />
        ))}
        {showEmptyCards &&
          Array.from({ length: Math.max(0, 4 - seeds.length) }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptyCard} />
          ))}
      </ScrollView>
    </View>
  );
}

function CompactSeedCard({
  seed,
  onPress,
}: {
  seed: SeedRecommendation;
  onPress: () => void;
}) {
  const enrollment = seed.enrollment;
  const isEnrolled = !!enrollment && enrollment.status !== "explored";

  const totalDays = seed.path?.total_days || 5;
  const daysCompleted = enrollment ? enrollment.current_day - 1 : 0;
  const progress = isEnrolled ? daysCompleted / Math.max(1, totalDays) : 0;
  const doneToday = enrollment?.isDoneToday || false;

  return (
    <View style={styles.compactCardWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.compactCardPressed,
        ]}
        onPress={onPress}
      >
        {seed.cover_image_url ? (
          <Image
            source={
              typeof seed.cover_image_url === "string"
                ? { uri: seed.cover_image_url }
                : seed.cover_image_url
            }
            style={styles.compactImageFull}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.compactImageFull, styles.compactImagePlaceholder]}
          >
            <Text style={styles.compactImageIcon}>🌱</Text>
          </View>
        )}

        <LinearGradient
          colors={
            isEnrolled
              ? ["transparent", "rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.95)"]
              : ["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.85)"]
          }
          locations={[0, 0.5, 1]}
          style={styles.compactOverlay}
        >
          <Text variant="bold" style={styles.compactTitle} numberOfLines={2}>
            {seed.title}
          </Text>

          {isEnrolled && (
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {daysCompleted}/{totalDays}
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {!isEnrolled && seed.slogan && (
            <Text style={styles.compactSlogan} numberOfLines={1}>
              {seed.slogan}
            </Text>
          )}

          {isEnrolled && doneToday && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>✅ done today</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}
