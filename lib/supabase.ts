import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
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

const isLocalStorageAvailable = () => {
  try {
    return typeof localStorage !== 'undefined' && 
           localStorage !== null &&
           typeof localStorage.getItem === 'function';
  } catch {
    return false;
  }
};

const safeStorage = isLocalStorageAvailable()
  ? localStorage 
  : {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };

export const supabase = supabaseConfigError
  ? (createMissingConfigProxy(supabaseConfigError) as ReturnType<
      typeof createClient
    >)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: safeStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
