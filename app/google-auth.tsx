import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { AnimatedSplash } from "./components/AnimatedSplash";

function extractTokens(url: string) {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith("#")
      ? parsed.hash.substring(1)
      : parsed.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = parsed.searchParams;
    return {
      access_token:
        hashParams.get("access_token") ?? queryParams.get("access_token"),
      refresh_token:
        hashParams.get("refresh_token") ?? queryParams.get("refresh_token"),
    };
  } catch {
    return { access_token: null, refresh_token: null };
  }
}

// Handles the Android deep-link callback from Google OAuth.
// On iOS, WebBrowser.openAuthSessionAsync intercepts the redirect before it
// reaches the router. On Android the OS fires an intent and Expo Router
// navigates here instead.
export default function GoogleAuthCallback() {
  const router = useRouter();
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) return;

    const { access_token, refresh_token } = extractTokens(url);

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .catch((err) => console.error("[GoogleAuth] setSession error:", err))
        .finally(() => router.replace("/"));
    } else {
      router.replace("/");
    }
  }, [url]);

  return <AnimatedSplash />;
}
