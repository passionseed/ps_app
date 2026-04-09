const { withGradleProperties } = require("@expo/config-plugins");

const withHighMemoryGradle = (config) => {
  return withGradleProperties(config, (props) => {
    const existing = props.modResults.findIndex(
      (item) => item.type === "property" && item.key === "org.gradle.jvmargs",
    );
    const entry = {
      type: "property",
      key: "org.gradle.jvmargs",
      value:
        "-Xmx8192m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError",
    };
    if (existing >= 0) {
      props.modResults[existing] = entry;
    } else {
      props.modResults.push(entry);
    }
    return props;
  });
};

module.exports = {
  expo: {
    owner: "passionseed",
    name: `Passion Seed${process.env.APP_NAME_SUFFIX || ""}`,
    scheme: "passion-seed",
    slug: "passion-seed",
    version: "1.3.0",
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
        NSPhotoLibraryUsageDescription:
          "Passion Seed uses your photo library so you can choose and upload images for your profile, team avatar, and submissions.",
        NSPhotoLibraryAddUsageDescription:
          "Passion Seed may save images you create or edit so you can keep them in your photo library.",
        NSCameraUsageDescription:
          "Passion Seed uses your camera so you can capture photos for submissions and profile content.",
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
      withHighMemoryGradle,
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
