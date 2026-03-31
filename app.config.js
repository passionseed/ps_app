module.exports = {
  expo: {
    owner: "passionseed",
    name: `Passion Seed${process.env.APP_NAME_SUFFIX || ""}`,
    scheme: "passion-seed",
    slug: "passion-seed",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/passionseed-logo-1024.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/passionseed-logo-1024.png",
      resizeMode: "contain",
      backgroundColor: "#F3F4F6",
    },
    ios: {
      supportsTablet: true,
      usesAppleSignIn: true,
      icon: "./assets/pseed-app.icon",
      bundleIdentifier: "com.passionseed.app",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.passionseed.app",
      adaptiveIcon: {
        foregroundImage: "./assets/passionseed-logo-1024.png",
        monochromeImage: "./assets/passionseed-logo-monochrome.png",
        backgroundColor: "#ffffff",
      },
      icon: "./assets/passionseed-logo-1024.png",
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      ],
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-font",
        {
          fonts: [
            "node_modules/@expo-google-fonts/google-sans/400Regular/GoogleSans_400Regular.ttf",
            "node_modules/@expo-google-fonts/google-sans/700Bold/GoogleSans_700Bold.ttf",
            "node_modules/@expo-google-fonts/libre-franklin/400Regular/LibreFranklin_400Regular.ttf",
            "node_modules/@expo-google-fonts/libre-franklin/700Bold/LibreFranklin_700Bold.ttf",
          ],
        },
      ],
      "expo-router",
      "expo-sqlite",
      "expo-apple-authentication",
      [
        "expo-web-browser",
        {
          experimentalLauncherActivity: false,
        },
      ],
      "expo-audio",
      "expo-image",
      "expo-sharing",
      "expo-asset",
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "ps_app",
          organization: "big-zk",
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: "baca732a-c7d8-4bd2-9742-48cc2a5e939f",
      },
    },
    autolinking: {
      exclude: ["expo-glass-effect", "expo-apple-authentication"],
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/baca732a-c7d8-4bd2-9742-48cc2a5e939f",
    },
  },
};
