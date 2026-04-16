import { vi } from "vitest";

// Define globals expected by React Native / Expo
(global as any).__DEV__ = true;

// Mock @sentry/react-native for all tests
vi.mock("@sentry/react-native", () => ({
  init: vi.fn(),
  setContext: vi.fn(),
  setTags: vi.fn(),
  captureException: vi.fn(),
  wrap: vi.fn((component) => component),
}));

// Mock react-native to avoid Flow parse errors
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  NativeModules: {},
}));

// Mock expo-file-system
vi.mock("expo-file-system", () => ({
  getInfoAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
  moveAsync: vi.fn(),
  copyAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  readDirectoryAsync: vi.fn(),
  createDownloadResumable: vi.fn(),
  DocumentDirectoryPath: "/mock/documents",
}));

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
  moveAsync: vi.fn(),
  copyAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  readDirectoryAsync: vi.fn(),
  createDownloadResumable: vi.fn(),
  cacheDirectory: "/mock/cache/",
  documentDirectory: "/mock/documents/",
}));
