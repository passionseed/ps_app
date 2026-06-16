import { useCallback } from "react";
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { AppText as Text } from "../AppText";
import type { HackathonProgram } from "../../types/hackathon-program";
import { HACKATHON_PROGRAM_ROUTE } from "../../lib/hackathonNavigation";

export function HackathonHeroCard({
  isThai,
  href = HACKATHON_PROGRAM_ROUTE,
  program,
  isLoading,
}: {
  isThai: boolean;
  href?: string;
  program?: HackathonProgram | null;
  isLoading?: boolean;
}) {
  const onPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(href);
  }, [href]);

  const title = program?.title ?? (isThai ? "แฮกกาธอน" : "Passion Seed Hackathon");
  const subtitle =
    program?.description ??
    (isThai
      ? "ร่วมแข่งขันและสร้างโปรเจกต์กับทีมของคุณ"
      : "Compete and build projects with your team");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
    >
      <Image
        source={require("../../assets/HackLogo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {isLoading && !program ? (
          <ActivityIndicator size="small" color="#9CA3AF" />
        ) : (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  logo: {
    width: 56,
    height: 56,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
  arrow: {
    fontSize: 20,
    color: "#6B7280",
    marginLeft: 4,
  },
});
