// lib/asyncStorage.ts
// Drop-in replacement for @react-native-async-storage/async-storage.
// Uses the global localStorage polyfill installed by expo-sqlite/localStorage/install
// (imported early in lib/supabase.ts). This avoids the "Native module is null" error
// on physical devices and keeps the test bundle free of react-native transitive deps.

type Callback = ((error?: Error | null) => void) | undefined;

function store(): Storage {
  if (typeof localStorage === "undefined") {
    throw new Error(
      "localStorage not available — ensure expo-sqlite/localStorage/install is imported before any storage call"
    );
  }
  return localStorage;
}

export async function getItem(key: string, _callback?: Callback): Promise<string | null> {
  return store().getItem(key);
}

export async function setItem(key: string, value: string, _callback?: Callback): Promise<void> {
  try {
    store().setItem(key, value);
  } catch (e) {
    console.warn("[asyncStorage] Failed to setItem — storage may be full:", e);
  }
}

export async function removeItem(key: string, _callback?: Callback): Promise<void> {
  store().removeItem(key);
}

export async function getAllKeys(_callback?: (error?: Error | null, keys?: string[]) => void): Promise<string[]> {
  return Object.keys(store());
}

export async function clear(_callback?: Callback): Promise<void> {
  try {
    store().clear();
  } catch (e) {
    console.warn("[asyncStorage] Failed to clear — storage may be full:", e);
  }
}

const ERROR_LOG_KEY = "ps_error_logs";
const MAX_ERROR_LOGS = 50;

/** Log error details to localStorage for debugging. Stores last 50 errors. */
export async function logErrorToStorage(
  error: Error,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const existing = await getItem(ERROR_LOG_KEY);
    const logs: Array<{
      timestamp: number;
      message: string;
      stack?: string;
      context?: Record<string, unknown>;
    }> = existing ? JSON.parse(existing) : [];

    logs.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context,
    });

    // Keep only last N errors
    if (logs.length > MAX_ERROR_LOGS) {
      logs.shift();
    }

    await setItem(ERROR_LOG_KEY, JSON.stringify(logs));
  } catch {
    // Silently fail - don't crash when logging errors
  }
}
