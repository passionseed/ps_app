import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { PathLabSkiaLoader } from "../../../components/PathLabSkiaLoader";
import { useAuth } from "../../../lib/auth";
import { isHackathonAdminEmail } from "../../../lib/hackathonAdminAccess";
import { readHackathonParticipant } from "../../../lib/hackathon-mode";
import { supabase } from "../../../lib/supabase";

const BG = "#0a0a0f";
const HEADER_TINT = "#e2e8f0";

export default function HackathonAdminLayout() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "admin" | "denied">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const participant = await readHackathonParticipant();
      if (isHackathonAdminEmail(participant?.email)) {
        if (!cancelled) setStatus("admin");
        return;
      }
      if (!user) {
        if (!cancelled) setStatus("denied");
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setStatus(data ? "admin" : "denied");
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PathLabSkiaLoader size="large" />
      </View>
    );
  }

  if (status === "denied") {
    router.replace("/");
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: BG },
        headerTintColor: HEADER_TINT,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Command Center" }} />
      <Stack.Screen name="submissions" options={{ title: "Submissions" }} />
      <Stack.Screen name="teams" options={{ title: "Teams" }} />
      <Stack.Screen name="team/[teamId]" options={{ title: "Team Detail" }} />
      <Stack.Screen name="students" options={{ title: "Students" }} />
      <Stack.Screen
        name="student/[participantId]"
        options={{ title: "Student" }}
      />
    </Stack>
  );
}
