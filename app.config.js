const fs = require("fs");
const path = require("path");
const { withDangerousMod, withGradleProperties } = require("@expo/config-plugins");

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

const IOS_ENTRY_FILE_EXPORT = 'export ENTRY_FILE=\\"index.js\\"\\n';
const IOS_BUNDLE_PHASE_NAME = '"Bundle React Native code and images"';
const IOS_BUNDLE_PHASE_REGEX =
  /name = "Bundle React Native code and images";[\s\S]*?shellScript = "([\s\S]*?)";/;

const withStableIosBundleEntry = (config) =>
  withDangerousMod(config, [
    "ios",
    async (config) => {
      const xcodeProjectDir = fs
        .readdirSync(config.modRequest.platformProjectRoot)
        .find((entry) => entry.endsWith(".xcodeproj"));

      if (!xcodeProjectDir) {
        throw new Error("Unable to find the generated iOS Xcode project.");
      }

      const pbxprojPath = path.join(
        config.modRequest.platformProjectRoot,
        xcodeProjectDir,
        "project.pbxproj",
      );
      const source = fs.readFileSync(pbxprojPath, "utf8");
      const lines = source.split("\n");
      const phaseNameIndex = lines.findIndex((line) =>
        line.includes('name = "Bundle React Native code and images";'),
      );

      if (phaseNameIndex === -1) {
        throw new Error(
          `Unable to find ${IOS_BUNDLE_PHASE_NAME} in generated project.pbxproj.`,
        );
      }

      let shellScriptStart = -1;
      let shellScriptEnd = -1;
      for (let i = phaseNameIndex; i < lines.length; i += 1) {
        if (lines[i].includes("shellScript = ")) {
          shellScriptStart = i;
          break;
        }
        if (lines[i].trim() === "};") {
          break;
        }
      }

      if (shellScriptStart === -1) {
        throw new Error(
          `Unable to find shellScript for ${IOS_BUNDLE_PHASE_NAME} in generated project.pbxproj.`,
        );
      }

      for (let i = shellScriptStart; i < lines.length; i += 1) {
        if (lines[i].trim().endsWith('";')) {
          shellScriptEnd = i;
          break;
        }
      }

      if (shellScriptEnd === -1) {
        throw new Error(
          `Unable to find the end of shellScript for ${IOS_BUNDLE_PHASE_NAME} in generated project.pbxproj.`,
        );
      }

      const shellScriptLines = lines.slice(shellScriptStart, shellScriptEnd + 1);
      let shellScriptBlock = shellScriptLines.join("\n");
      shellScriptBlock = shellScriptBlock
        .replace(/export ENTRY_FILE=\\\\\\"index\.js\\\\\\"\\n/g, "")
        .replace(/export ENTRY_FILE=\\\\\\"index\.js\\\\\\"\n/g, "")
        .replace(/export ENTRY_FILE=\\\\"index\.js\\\\"\\n/g, "")
        .replace(/export ENTRY_FILE=\\\\"index\.js\\\\"\n/g, "")
        .replace(/\n{3,}/g, "\n\n");

      const anchor =
        '# The project root by default is one level up from the ios directory\\\\nexport PROJECT_ROOT=\\\\\\"$PROJECT_DIR\\\\\\"/..\\\\n\\\\n';

      if (shellScriptBlock.includes(anchor)) {
        shellScriptBlock = shellScriptBlock.replace(
          anchor,
          `${anchor}${IOS_ENTRY_FILE_EXPORT}`,
        );
      } else {
        shellScriptBlock = shellScriptBlock.replace(
          /shellScript = "/,
          `shellScript = "${IOS_ENTRY_FILE_EXPORT}`,
        );
      }

      lines.splice(
        shellScriptStart,
        shellScriptEnd - shellScriptStart + 1,
        ...shellScriptBlock.split("\n"),
      );

      const next = lines.join("\n");

      if (next !== source) {
        fs.writeFileSync(pbxprojPath, next);
      }
      return config;
    },
  ]);

const sentryPlugin = [
  "@sentry/react-native/expo",
  {
    url: "https://sentry.io/",
    project: "ps_app",
    organization: "big-zk",
  },
];

module.exports = {
  expo: {
    owner: "passionseed",
    name: `Passion Seed${process.env.APP_NAME_SUFFIX || ""}`,
    scheme: "passion-seed",
    slug: "passion-seed",
    version: "1.3.1",
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
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      withHighMemoryGradle,
      withStableIosBundleEntry,
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
        "expo-notifications",
        {
          color: "#6366F1",
          enableBadge: true,
          androidMode: "default",
          androidCollapsedTitle: "#{unread} new notifications"
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            // Disable Android 12+ native splash screen API to prevent
            // SurfaceControl NPE crash on Realme/OPPO devices (ColorOS bug)
            enableAndroid12SplashScreenAPI: false,
          },
        },
      ],
      ...(process.env.SENTRY_DISABLE_PLUGIN === "1" ? [] : [sentryPlugin]),
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
