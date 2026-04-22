import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  import("expo-sqlite/localStorage/install");
}
import {
  getSupabaseConfigErrorMessage,
  getSupabaseRuntimeConfig,
} from "./runtime-config";

const supabaseConfigError = getSupabaseConfigErrorMessage();
const { url: supabaseUrl, publishableKey: supabaseAnonKey } =
  getSupabaseRuntimeConfig();

function createMissingConfigProxy(message: string) {
  const noopSubscription = { unsubscribe: () => {} };
  const noopAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: (_event: unknown, _cb: unknown) => ({ data: { subscription: noopSubscription } }),
    signOut: () => Promise.resolve({ error: null }),
    signInWithOAuth: () => Promise.resolve({ data: { url: null }, error: new Error(message) }),
    signInWithIdToken: () => Promise.resolve({ data: { session: null }, error: new Error(message) }),
    setSession: () => Promise.resolve({ data: { session: null }, error: null }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
  };
  const noopQuery = {
    select: () => noopQuery,
    eq: () => noopQuery,
    single: () => Promise.resolve({ data: null, error: new Error(message) }),
    then: (resolve: (v: { data: null; error: Error }) => unknown) =>
      Promise.resolve({ data: null, error: new Error(message) }).then(resolve),
  };
  return {
    auth: noopAuth,
    from: () => noopQuery,
  };
}

const inBrowser = typeof window !== "undefined";

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const supabase = supabaseConfigError
  ? (createMissingConfigProxy(supabaseConfigError) as ReturnType<
      typeof createClient
    >)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: inBrowser ? localStorage : noopStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
