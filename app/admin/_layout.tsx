// app/admin/_layout.tsx
import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="seeds"
        options={{
          title: "Seed Editor",
          headerStyle: { backgroundColor: "#0a0a0f" },
          headerTintColor: "#e2e8f0",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="hackathon"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
