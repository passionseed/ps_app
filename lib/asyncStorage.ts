// lib/asyncStorage.ts
// Drop-in replacement for @react-native-async-storage/async-storage.
// Uses the global localStorage polyfill installed by expo-sqlite/localStorage/install
// (imported early in index.js). This avoids the "Native module is null" error
// on physical devices and keeps the test bundle free of react-native transitive deps.

// Import the polyfill installer to ensure it's loaded before any storage calls
import "expo-sqlite/localStorage/install";

type Callback = ((error?: Error | null) => void) | undefined;

function store(): Storage {
  if (typeof localStorage === "undefined" || localStorage === null) {
    console.warn("[asyncStorage] localStorage not available - using in-memory fallback");
    return memoryStorageApi;
  }
  return localStorage;
}

// In-memory fallback when localStorage is not available
const memoryStorage = new Map<string, string>();
const memoryStorageApi = {
  getItem: (key: string): string | null => memoryStorage.get(key) ?? null,
  setItem: (key: string, value: string): void => { memoryStorage.set(key, value); },
  removeItem: (key: string): void => { memoryStorage.delete(key); },
  clear: (): void => { memoryStorage.clear(); },
  key: (index: number): string | null => Array.from(memoryStorage.keys())[index] ?? null,
  get length(): number { return memoryStorage.size; },
} satisfies Storage;

export async function getItem(key: string, _callback?: Callback): Promise<string | null> {
  try {
    return store().getItem(key);
  } catch (e) {
    console.warn("[asyncStorage] Failed to getItem:", e);
    return null;
  }
}

export async function setItem(key: string, value: string, _callback?: Callback): Promise<void> {
  try {
    store().setItem(key, value);
  } catch (e) {
    console.warn("[asyncStorage] Failed to setItem — storage may be full:", e);
  }
}

export async function removeItem(key: string, _callback?: Callback): Promise<void> {
  try {
    store().removeItem(key);
  } catch (e) {
    console.warn("[asyncStorage] Failed to removeItem:", e);
  }
}

export async function getAllKeys(_callback?: (error?: Error | null, keys?: string[]) => void): Promise<string[]> {
  try {
    return Object.keys(store());
  } catch (e) {
    console.warn("[asyncStorage] Failed to getAllKeys:", e);
    return [];
  }
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
