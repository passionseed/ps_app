import { View, Text, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";

export default function Page() {
  return (
    <View style={styles.page}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        <Text style={styles.title}>Passion Seed</Text>
        <Text style={styles.subtitle}>Welcome to your new app</Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push("/(tabs)/home")}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 48,
    color: "#111",
    fontFamily: "Orbit_400Regular",
    fontWeight: "400",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#BFFF00",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonPressed: {
    backgroundColor: "#9FE800",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
});
