import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { resolveAppLanguage } from "./app-language";
import {
  type GuestLanguage,
  normalizeGuestLanguage,
  readGuestLanguage,
  saveGuestLanguage,
} from "./guest-language";

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
  appLanguage: GuestLanguage;
  guestLanguage: GuestLanguage;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
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
  appLanguage: "th",
  guestLanguage: "th",
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  setGuestLanguage: async () => {},
  setUserLanguage: () => {},
  enterAsGuest: () => {},
  exitGuestMode: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
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
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn("[Auth] getSession timed out after 3s — proceeding without stored session");
        resolve(null);
      }, 3000)
    );

    let cancelled = false;

    void Promise.all([
      Promise.race([
        supabase.auth.getSession(),
        timeoutPromise.then(() => ({ data: { session: null } })),
      ]),
      readGuestLanguage(),
    ])
      .then(async ([{ data: { session } }, language]) => {
        if (cancelled) return;

        setSession(session);
        setGuestLanguageState(language);

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
        if (!hasBootstrappedRef.current && event === "INITIAL_SESSION") {
          return;
        }

        const syncId = ++authSyncIdRef.current;
        setLoading(true);
        setSession(nextSession);

        if (!nextSession) {
          setProfileLanguageState(null);
          setLoading(false);
          return;
        }

        void readProfileLanguage(nextSession.user.id)
          .then((language) => {
            if (authSyncIdRef.current !== syncId) return;
            setProfileLanguageState(language);
          })
          .catch((error) => {
            if (authSyncIdRef.current !== syncId) return;
            console.error("[Auth] Failed to sync profile language:", error);
            setProfileLanguageState(null);
          })
          .finally(() => {
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

  const setGuestLanguage = async (language: GuestLanguage) => {
    setGuestLanguageState(language);
    await saveGuestLanguage(language);
  };

  const setUserLanguage = (language: GuestLanguage) => {
    setProfileLanguageState(language);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
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

    if (result && result.type === "success") {
      const { access_token, refresh_token } = extractParamsFromUrl(result.url);
      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
      }
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
        appLanguage,
        guestLanguage,
        signInWithGoogle,
        signInWithApple,
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
