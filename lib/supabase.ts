import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import "expo-sqlite/localStorage/install";
import {
  getSupabaseConfigErrorMessage,
  getSupabaseRuntimeConfig,
} from "./runtime-config";

const supabaseConfigError = getSupabaseConfigErrorMessage();
const { url: supabaseUrl, publishableKey: supabaseAnonKey } =
  getSupabaseRuntimeConfig();

function createMissingConfigProxy(message: string) {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(message);
      },
    },
  );
}

export const supabase = supabaseConfigError
  ? (createMissingConfigProxy(supabaseConfigError) as ReturnType<
      typeof createClient
    >)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
