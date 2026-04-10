import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { getSupabaseRuntimeConfig } from "./runtime-config";
import { resolveAppLanguage } from "./app-language";
import { preloadDiscoverData } from "./pathlab";
import {
  clearHackathonScreenDataCache,
  preloadHackathonHomeBundle,
  preloadHackathonJourneyBundle,
} from "./hackathonScreenData";
import {
  type GuestLanguage,
  normalizeGuestLanguage,
  readGuestLanguage,
  saveGuestLanguage,
} from "./guest-language";
import { readHackathonMode, saveHackathonMode, saveHackathonSession, clearHackathonSession } from "./hackathon-mode";

// These functions are now synchronous (MMKV), but callers may still use await.
// await on a non-Promise value is harmless, so we keep the calling code as-is
// where practical and only simplify where it improves readability.

WebBrowser.maybeCompleteAuthSession();

function extractParamsFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const hash = parsedUrl.hash.startsWith("#")
    ? parsedUrl.hash.substring(1)
    : parsedUrl.hash;
  const hashParams = new URLSearchParams(hash);
  const queryParams = parsedUrl.searchParams;
  return {
    access_token:
      hashParams.get("access_token") ?? queryParams.get("access_token"),
    refresh_token:
      hashParams.get("refresh_token") ?? queryParams.get("refresh_token"),
  };
}

function getErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return "";
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

export function isAuthCancellationError(error: unknown): boolean {
  const code = getErrorCode(error).toUpperCase();
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === "ERR_REQUEST_CANCELED" ||
    code === "ERR_REQUEST_CANCELLED" ||
    message.includes("user canceled") ||
    message.includes("user cancelled")
  );
}

export function isAppleAccountSetupError(error: unknown): boolean {
  const code = getErrorCode(error).toUpperCase();
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("not signed in") &&
    (message.includes("apple") || message.includes("icloud"))
  ) {
    return true;
  }

  return (
    code === "ERR_REQUEST_UNKNOWN" &&
    message.includes("authorization attempt failed for an unknown reason")
  );
}

type AuthContext = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isHackathon: boolean;
  appLanguage: GuestLanguage;
  guestLanguage: GuestLanguage;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOutHackathon: () => Promise<void>;
  setGuestLanguage: (language: GuestLanguage) => Promise<void>;
  setUserLanguage: (language: GuestLanguage) => void;
  enterAsGuest: () => void;
  exitGuestMode: () => void;
};

const AuthContext = createContext<AuthContext>({
  session: null,
  user: null,
  loading: true,
  isGuest: false,
  isHackathon: false,
  appLanguage: "th",
  guestLanguage: "th",
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmailPassword: async () => {},
  signOutHackathon: async () => {},
  setGuestLanguage: async () => {},
  setUserLanguage: () => {},
  enterAsGuest: () => {},
  exitGuestMode: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isHackathon, setIsHackathon] = useState(false);
  const [guestLanguage, setGuestLanguageState] =
    useState<GuestLanguage>("th");
  const [profileLanguage, setProfileLanguageState] =
    useState<GuestLanguage | null>(null);
  const hasBootstrappedRef = useRef(false);
  const authSyncIdRef = useRef(0);

  const appLanguage = resolveAppLanguage({
    guestLanguage,
    profileLanguage,
    hasSession: !!session,
    isGuest,
  });

  async function readProfileLanguage(userId: string): Promise<GuestLanguage> {
    if (!userId || typeof userId !== "string") {
      throw new Error(`[readProfileLanguage] Invalid userId: ${JSON.stringify(userId)}`);
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("preferred_language")
      .eq("id", userId)
      .single();

    if (error) {
      throw error;
    }

    return normalizeGuestLanguage(data?.preferred_language);
  }

  useEffect(() => {
    const SESSION_TIMEOUT_MS = 3000; // 3s timeout — if SQLite takes longer, onAuthStateChange will recover

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`[Auth] getSession timed out after ${SESSION_TIMEOUT_MS}ms — proceeding with current state`);
        resolve(null);
      }, SESSION_TIMEOUT_MS)
    );

    let cancelled = false;

    void Promise.all([
      Promise.race([
        supabase.auth.getSession().then(result => {
          if (!cancelled) {
            console.log("[Auth] getSession completed successfully");
          }
          return result;
        }).catch(error => {
          console.error("[Auth] getSession failed:", error);
          return { data: { session: null } };
        }),
        timeoutPromise.then(() => {
          console.warn("[Auth] Session check timed out — will retry on next auth state change");
          return null; // Return null to indicate timeout (not a failed session check)
        }),
      ]).then(result => {
        // If timeout occurred (result is null), don't overwrite session state
        if (result === null) {
          return { data: { session: undefined } };
        }
        return result;
      }),
      readGuestLanguage(),
      readHackathonMode(),
    ])
      .then(async ([result, language, hackathonMode]) => {
        if (cancelled) return;

        // Handle timeout case: result.data.session is undefined
        // In that case, don't change the session state (keep it as null initially)
        const session = result.data?.session ?? null;

        // Only update session if we got a valid result (not a timeout)
        if (result.data?.session !== undefined) {
          setSession(session);
        }
        setGuestLanguageState(language);
        console.log("[Auth] bootstrap hackathonMode:", hackathonMode);
        if (hackathonMode) {
          setIsHackathon(true);
          void preloadHackathonHomeBundle();
          void preloadHackathonJourneyBundle();
        }
        void preloadDiscoverData({
          userId: session?.user.id ?? null,
          includeRecommendations: Boolean(session?.user?.id),
        });

        if (!session) {
          setProfileLanguageState(null);
          return;
        }

        try {
          const nextLanguage = await readProfileLanguage(session.user.id);
          if (!cancelled) {
            setProfileLanguageState(nextLanguage);
          }
        } catch (error) {
          console.error("[Auth] Failed to load profile language:", error);
          if (!cancelled) {
            setProfileLanguageState(null);
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          hasBootstrappedRef.current = true;
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        console.log("[Auth] onAuthStateChange:", event, { hasSession: !!nextSession, bootstrapped: hasBootstrappedRef.current });
        if (!hasBootstrappedRef.current && event === "INITIAL_SESSION") {
          console.log("[Auth] Skipping INITIAL_SESSION (not yet bootstrapped)");
          return;
        }

        const syncId = ++authSyncIdRef.current;
        console.log("[Auth] Setting loading=true, syncId:", syncId);
        setLoading(true);
        setSession(nextSession);
        void preloadDiscoverData({
          userId: nextSession?.user.id ?? null,
          includeRecommendations: Boolean(nextSession?.user?.id),
        });

        if (!nextSession) {
          console.log("[Auth] No session, setting loading=false");
          setProfileLanguageState(null);
          // Only clear hackathon session on explicit sign-out events, not on
          // INITIAL_SESSION/TOKEN_REFRESHED with null — hackathon users have no
          // Supabase session so these fire on every app start.
          if (event === "SIGNED_OUT") {
            setIsHackathon(false);
            saveHackathonMode(false);
            clearHackathonSession();
            clearHackathonScreenDataCache();
          }
          setLoading(false);
          return;
        }

        console.log("[Auth] Reading profile language for user:", nextSession.user.id);
        const languageTimeout = new Promise<null>((resolve) =>
          setTimeout(() => {
            console.warn("[Auth] readProfileLanguage timed out after 5s — unblocking navigation");
            resolve(null);
          }, 5000)
        );

        // Defer the query by one tick so the Supabase auth lock is fully released
        // before we try to make another Supabase call (avoids deadlock on Android)
        const deferredReadProfileLanguage = new Promise<GuestLanguage>((resolve, reject) =>
          setTimeout(() => readProfileLanguage(nextSession.user.id).then(resolve).catch(reject), 0)
        );

        void Promise.race([
          deferredReadProfileLanguage.then((language) => {
            console.log("[Auth] readProfileLanguage resolved:", language);
            return { language };
          }),
          languageTimeout.then(() => ({ language: null as null })),
        ])
          .then(({ language }) => {
            if (authSyncIdRef.current !== syncId) return;
            setProfileLanguageState(language);
          })
          .catch((error) => {
            if (authSyncIdRef.current !== syncId) return;
            console.error("[Auth] Failed to sync profile language:", error);
            setProfileLanguageState(null);
          })
          .finally(() => {
            console.log("[Auth] finally: setting loading=false, syncId check:", authSyncIdRef.current === syncId);
            if (authSyncIdRef.current === syncId) {
              setLoading(false);
            }
          });
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const enterAsGuest = () => {
    setIsGuest(true);
  };

  const setGuestLanguage = (language: GuestLanguage) => {
    setGuestLanguageState(language);
    saveGuestLanguage(language);
  };

  const setUserLanguage = (language: GuestLanguage) => {
    setProfileLanguageState(language);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    console.log("[Auth] signInWithEmailPassword start", { email });

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const loginUrl = `${supabaseUrl}/functions/v1/hackathon-login`;
    console.log("[Auth] Calling login endpoint:", loginUrl);

    let res: Response;
    try {
      const { publishableKey } = getSupabaseRuntimeConfig();
      res = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });
    } catch (networkErr) {
      throw new Error(`Network error hitting ${loginUrl}: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`);
    }

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = { error: "Login endpoint returned an invalid response" };
    }
    console.log("[Auth] hackathon-login result", { status: res.status, body });

    if (!res.ok || !body.participant || !body.token) {
      throw new Error(`[${res.status}] ${body.error ?? "Invalid email or password"}${body.debug ? ` (${body.debug})` : ""}`);
    }

    saveHackathonSession(body.token, body.participant);
    saveHackathonMode(true);
    clearHackathonScreenDataCache();
    setIsHackathon(true);
    void preloadHackathonHomeBundle();
    void preloadHackathonJourneyBundle();
  };

  const signOutHackathon = async () => {
    console.log("[Auth] signOutHackathon start");
    clearHackathonSession();
    saveHackathonMode(false);
    clearHackathonScreenDataCache();
    setIsHackathon(false);
    console.log("[Auth] signOutHackathon done");
  };

  const signInWithOAuth = async (
    provider: "google" | "apple",
    redirectTo: string
  ) => {
    console.log("[Auth] signInWithOAuth start", { provider, redirectTo });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });

    console.log("[Auth] signInWithOAuth result", { url: data?.url, error: error?.message });
    if (error) throw error;

    console.log("[Auth] Opening browser:", data.url);
    const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo, {
      showInRecents: true,
    });

    console.log("[Auth] Browser result:", result?.type, "url:", (result as any)?.url?.substring(0, 80));
    if (result && result.type === "success") {
      const { access_token, refresh_token } = extractParamsFromUrl(result.url);
      console.log("[Auth] Tokens extracted — access:", !!access_token, "refresh:", !!refresh_token);
      if (access_token && refresh_token) {
        console.log("[Auth] Calling setSession...");
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        console.log("[Auth] setSession done");
      } else {
        console.warn("[Auth] Missing tokens from redirect URL");
      }
    } else {
      console.warn("[Auth] Browser result was not success:", result?.type);
    }
  };

  const signInWithGoogle = async () => {
    await signInWithOAuth("google", "passion-seed://google-auth");
  };

  const signInWithApple = async () => {
    if (Platform.OS !== "ios") {
      await signInWithOAuth("apple", "passion-seed://apple-auth");
      return;
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("Apple Authentication is not available on this device.");
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identityToken returned from Apple.");
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      if (error) throw error;

      if (credential.fullName) {
        const givenName = credential.fullName.givenName ?? "";
        const middleName = credential.fullName.middleName ?? "";
        const familyName = credential.fullName.familyName ?? "";
        const fullName = [givenName, middleName, familyName]
          .filter(Boolean)
          .join(" ");

        if (fullName || givenName || familyName) {
          await supabase.auth.updateUser({
            data: {
              full_name: fullName,
              given_name: givenName || null,
              family_name: familyName || null,
            },
          });
        }
      }
    } catch (error: unknown) {
      if (isAuthCancellationError(error)) {
        return;
      }

      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isGuest,
        isHackathon,
        appLanguage,
        guestLanguage,
        signInWithGoogle,
        signInWithApple,
        signInWithEmailPassword,
        signOutHackathon,
        setGuestLanguage,
        setUserLanguage,
        enterAsGuest,
        exitGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
