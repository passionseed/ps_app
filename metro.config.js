const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

const originalResolver = config.resolver || {};

config.resolver = {
  ...originalResolver,
  assetExts: [...(originalResolver.assetExts || []), "wasm"],
};

// Add react-native-reanimated support
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

module.exports = wrapWithReanimatedMetroConfig(config);
