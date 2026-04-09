// lib/asyncStorage.ts
// Drop-in replacement for @react-native-async-storage/async-storage
// using the global localStorage polyfill installed by expo-sqlite/localStorage/install.
// Avoids the "native module is null" error on physical devices.

type Callback = ((error?: Error | null) => void) | undefined;

function ensureAvailable() {
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage not available — ensure expo-sqlite/localStorage/install is imported first");
  }
}

export async function getItem(key: string, callback?: Callback): Promise<string | null> {
  ensureAvailable();
  try {
    const value = localStorage.getItem(key);
    callback?.(null);
    return value;
  } catch (e) {
    callback?.(e instanceof Error ? e : new Error(String(e)));
    return null;
  }
}

export async function setItem(key: string, value: string, callback?: Callback): Promise<void> {
  ensureAvailable();
  try {
    localStorage.setItem(key, value);
    callback?.(null);
  } catch (e) {
    callback?.(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function removeItem(key: string, callback?: Callback): Promise<void> {
  ensureAvailable();
  try {
    localStorage.removeItem(key);
    callback?.(null);
  } catch (e) {
    callback?.(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function getAllKeys(callback?: (error?: Error | null, keys?: string[]) => void): Promise<string[]> {
  ensureAvailable();
  try {
    const keys = Object.keys(localStorage);
    callback?.(null, keys);
    return keys;
  } catch (e) {
    callback?.(e instanceof Error ? e : new Error(String(e)), []);
    return [];
  }
}

export async function clear(callback?: Callback): Promise<void> {
  ensureAvailable();
  try {
    localStorage.clear();
    callback?.(null);
  } catch (e) {
    callback?.(e instanceof Error ? e : new Error(String(e)));
  }
}
