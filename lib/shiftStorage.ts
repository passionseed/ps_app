// Use the existing Expo SQLite localStorage polyfill on native and browser storage on web.
export const shiftStorage = {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};
