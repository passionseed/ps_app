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
  store().setItem(key, value);
}

export async function removeItem(key: string, _callback?: Callback): Promise<void> {
  store().removeItem(key);
}

export async function getAllKeys(_callback?: (error?: Error | null, keys?: string[]) => void): Promise<string[]> {
  return Object.keys(store());
}

export async function clear(_callback?: Callback): Promise<void> {
  store().clear();
}
