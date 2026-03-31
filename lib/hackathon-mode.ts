// lib/hackathon-mode.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const HACKATHON_MODE_KEY = "hackathon_mode";

export async function readHackathonMode(): Promise<boolean> {
  const value = await AsyncStorage.getItem(HACKATHON_MODE_KEY);
  return value === "true";
}

export async function saveHackathonMode(value: boolean): Promise<void> {
  if (value) {
    await AsyncStorage.setItem(HACKATHON_MODE_KEY, "true");
  } else {
    await AsyncStorage.removeItem(HACKATHON_MODE_KEY);
  }
}
