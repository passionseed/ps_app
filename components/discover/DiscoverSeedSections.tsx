import { View, ScrollView, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { AppText as Text } from "../AppText";
import type { SeedRecommendation } from "../../lib/seedRecommendations";
import { styles } from "./discoverStyles";

export function SeedSection({
  title,
  seeds,
}: {
  title: string;
  seeds: SeedRecommendation[];
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
            index={index}
            onPress={() => {
              router.push(`/seed/${seed.id}`);
            }}
          />
        ))}
        {Array.from({ length: Math.max(0, 4 - seeds.length) }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.emptyCard} />
        ))}
      </ScrollView>
    </View>
  );
}

export function ProgressSection({
  title,
  seeds,
}: {
  title: string;
  seeds: SeedRecommendation[];
}) {
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
          <ProgressSeedCard
            key={seed.id || `progress-${index}`}
            seed={seed}
            index={index}
            progress={
              seed.enrollment
                ? (seed.enrollment.current_day - 1) / (seed.path?.total_days || 5)
                : 0
            }
            doneToday={seed.enrollment?.isDoneToday || false}
            onPress={() => {
              router.push(`/seed/${seed.id}`);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ProgressSeedCard({
  seed,
  progress,
  index,
  doneToday,
  onPress,
}: {
  seed: SeedRecommendation;
  progress: number;
  index: number;
  doneToday?: boolean;
  onPress: () => void;
}) {
  const totalDays = seed.path?.total_days || 5;
  const daysCompleted = seed.enrollment ? seed.enrollment.current_day - 1 : 0;
  return (
    <View
      style={[styles.compactCardWrapper, index === 0 && { marginLeft: 24 }]}
    >
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
          colors={["transparent", "rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.95)"]}
          locations={[0, 0.5, 1]}
          style={styles.compactOverlay}
        >
          <Text variant="bold" style={styles.compactTitle} numberOfLines={2}>
            {seed.title}
          </Text>

          {doneToday ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>✅ done today</Text>
            </View>
          ) : (
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
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function CompactSeedCard({
  seed,
  index,
  onPress,
}: {
  seed: SeedRecommendation;
  index: number;
  onPress: () => void;
}) {
  return (
    <View
      style={[styles.compactCardWrapper, index === 0 && { marginLeft: 24 }]}
    >
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
          colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.85)"]}
          locations={[0, 0.5, 1]}
          style={styles.compactOverlay}
        >
          <Text variant="bold" style={styles.compactTitle} numberOfLines={2}>
            {seed.title}
          </Text>
          {seed.slogan && (
            <Text style={styles.compactSlogan} numberOfLines={1}>
              {seed.slogan}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}
