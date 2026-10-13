import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { TextButton } from "./primitives";

export function DiscordFooter({ url, label }: { url: string | null | undefined; label: string }) {
  if (!url) return null;
  return (
    <View style={styles.wrap}>
      <TextButton label={label} icon="people" onPress={() => void Linking.openURL(url)} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { alignItems: "center", paddingVertical: 4 } });
