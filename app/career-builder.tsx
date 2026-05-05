// app/career-builder.tsx
// Redirects to the new Plans Hub (app/plans/index.tsx)

import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { PathLabSkiaLoader } from "../components/PathLabSkiaLoader";

export default function CareerBuilderRedirectScreen() {
  useEffect(() => {
    router.replace("/plans");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" }}>
      <PathLabSkiaLoader size="large" />
    </View>
  );
}
