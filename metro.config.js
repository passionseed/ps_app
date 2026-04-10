const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Add react-native-reanimated support
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

module.exports = wrapWithReanimatedMetroConfig(config);
