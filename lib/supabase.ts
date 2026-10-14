import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseConfigErrorMessage,
  getSupabaseRuntimeConfig,
} from "./runtime-config";

const supabaseConfigError = getSupabaseConfigErrorMessage();
const { url: supabaseUrl, publishableKey, anonKey } =
  getSupabaseRuntimeConfig();

const supabaseKey = anonKey || publishableKey;

export function createMissingConfigProxy(message: string) {
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
  const noopQuery: Record<string, unknown> = {
    select: () => noopQuery,
    eq: () => noopQuery,
    like: () => noopQuery,
    in: () => noopQuery,
    order: () => noopQuery,
    limit: () => noopQuery,
    update: () => noopQuery,
    maybeSingle: () => Promise.resolve({ data: null, error: new Error(message) }),
    single: () => Promise.resolve({ data: null, error: new Error(message) }),
    then: (resolve: (v: { data: null; error: Error }) => unknown) =>
      Promise.resolve({ data: null, error: new Error(message) }).then(resolve),
  };
  // X5: a missing config must surface as `unavailable`, never as "not enrolled".
  const configError = { message, code: "CONFIG_MISSING", details: null, hint: null };
  const rpc = () => Promise.resolve({ data: null, error: configError, status: 0, statusText: "" });
  const storageFailure = () => Promise.resolve({ data: null, error: Object.assign(new Error(message), { statusCode: "CONFIG_MISSING" }) });
  const noopBucket = {
    upload: storageFailure,
    remove: storageFailure,
    download: storageFailure,
    list: storageFailure,
    createSignedUrl: storageFailure,
    createSignedUrls: storageFailure,
    getPublicUrl: () => ({ data: { publicUrl: "" } }),
  };
  return {
    auth: noopAuth,
    from: () => noopQuery,
    rpc,
    storage: { from: () => noopBucket },
  };
}

const inBrowser = typeof window !== "undefined";

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const supabase = supabaseConfigError
  ? (createMissingConfigProxy(supabaseConfigError) as unknown as ReturnType<
      typeof createClient
    >)
  : createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: inBrowser ? localStorage : noopStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Web Google sign-in returns tokens in the URL hash. Native uses the deep link.
        detectSessionInUrl: typeof document !== "undefined",
      },
    });
