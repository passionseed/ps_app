// Synchronous key-value storage backed by expo-sqlite localStorage polyfill.
// Drop-in replacement for react-native-mmkv with the same API surface used in this app.

function store(): Storage {
  if (typeof localStorage === "undefined") {
    throw new Error(
      "localStorage not available — ensure expo-sqlite/localStorage/install is imported before any storage call"
    );
  }
  return localStorage;
}

export const storage = {
  getString(key: string): string | undefined {
    return store().getItem(key) ?? undefined;
  },
  set(key: string, value: string): void {
    try {
      store().setItem(key, value);
    } catch (e) {
      console.warn("[storage] setItem failed:", e);
    }
  },
  delete(key: string): void {
    store().removeItem(key);
  },
};
