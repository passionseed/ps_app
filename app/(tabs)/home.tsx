import { View, Text, StyleSheet, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.header}>Home</Text>
        <Text style={styles.text}>
          Welcome to Passion Seed. Start building your app here!
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 64,
  },
  header: {
    fontSize: 32,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "300",
    color: "#666",
    lineHeight: 24,
  },
});
