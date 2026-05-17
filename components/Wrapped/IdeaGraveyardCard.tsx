import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { AppText } from "../AppText";
import { WrappedButton } from "./WrappedButton";
import { Space } from "../../lib/theme";

const WHITE = "#FFFFFF";
const PURPLE = "#9D81AC";
const RED = "#F87171";

interface IdeaGraveyardCardProps {
  ideasKilled: number;
  onNext: () => void;
}

export function IdeaGraveyardCard({ ideasKilled, onNext }: IdeaGraveyardCardProps) {
  return (
    <View style={styles.card}>
      <Animated.View entering={FadeIn.delay(100).duration(600)}>
        <AppText style={styles.emoji}>🪦</AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(600)}>
        <AppText variant="bold" style={styles.title}>
          The Idea Graveyard
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(500).duration(600)}>
        <AppText style={styles.text}>
          You didn't just fall in love with your first idea. You were ruthless.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).duration(600).springify()}>
        <View style={styles.statBox}>
          <AppText variant="bold" style={styles.statNumber}>
            {ideasKilled}
          </AppText>
          <AppText style={styles.statLabel}>
            Ideas Killed
          </AppText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1000).duration(600)}>
        <AppText style={styles.caption}>
          Killing ideas is a sign of a strong builder. It means you prioritize solving the problem over protecting your initial thoughts.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1200).duration(600)}>
        <WrappedButton onPress={onNext}>
            Respect →
          
          </WrappedButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Space.lg,
    alignItems: "center",
    width: "100%",
  },
  emoji: {
    fontSize: 64,
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    color: WHITE,
    textAlign: "center",
    fontFamily: "BaiJamjuree_700Bold",
  },
  text: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "BaiJamjuree_400Regular",
  },
  statBox: {
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
    borderRadius: 24,
    padding: Space.xl,
    alignItems: "center",
    minWidth: 200,
    marginVertical: Space.md,
  },
  statNumber: {
    fontSize: 56,
    color: RED,
    fontFamily: "BaiJamjuree_700Bold",
    lineHeight: 64,
  },
  statLabel: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "BaiJamjuree_700Bold",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: Space.xs,
  },
  caption: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "BaiJamjuree_400Regular",
    paddingHorizontal: Space.lg,
  },
});
