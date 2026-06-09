const { withXcodeProject, withDangerousMod, withEntitlementsPlist } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const WIDGET_TARGET_NAME = "TodoWidget";
const WIDGET_BUNDLE_ID = "com.passionseed.app.TodoWidget";
const APP_GROUP_ID = "group.com.passionseed.app";

// UUIDs are stable hardcoded values — Xcode doesn't require them to be random,
// just unique within the project file.
const UUIDS = {
  widgetFileRef:        "AA000001000000000000AA01",
  widgetBuildFile:      "AA000001000000000000AA02",
  infoPlistFileRef:     "AA000001000000000000AA03",
  infoPlistBuildFile:   "AA000001000000000000AA04",
  entitlementsFileRef:  "AA000001000000000000AA05",
  sourcesPhase:         "AA000001000000000000AA06",
  resourcesPhase:       "AA000001000000000000AA07",
  frameworksPhase:      "AA000001000000000000AA08",
  nativeTarget:         "AA000001000000000000AA09",
  targetProduct:        "AA000001000000000000AA0A",
  debugConfig:          "AA000001000000000000AA0B",
  releaseConfig:        "AA000001000000000000AA0C",
  configList:           "AA000001000000000000AA0D",
  widgetGroup:          "AA000001000000000000AA0E",
};

/**
 * Copy widget source files from ios/TodoWidget/ into the platform project root.
 */
const withTodoWidgetFiles = (config) =>
  withDangerousMod(config, [
    "ios",
    async (config) => {
      const platformRoot = config.modRequest.platformProjectRoot;
      const srcDir = path.join(__dirname, "../widget-sources");
      const destDir = path.join(platformRoot, WIDGET_TARGET_NAME);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      for (const file of ["TodoWidget.swift", "Info.plist", "TodoWidget.entitlements"]) {
        const src = path.join(srcDir, file);
        const dest = path.join(destDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      return config;
    },
  ]);

/**
 * Add the TodoWidget target to project.pbxproj.
 * Uses the `xcode` package (transitive dep of Expo) to manipulate the project.
 * Arrays in xcode's object model use { value: uuid, comment: label } — not bare strings.
 */
const withTodoWidgetTarget = (config) =>
  withXcodeProject(config, (config) => {
    const project = config.modResults;
    const pbxObjects = project.hash.project.objects;

    // Guard: don't add twice
    const existingTargets = pbxObjects["PBXNativeTarget"] || {};
    const alreadyAdded = Object.values(existingTargets).some(
      (t) => t && t.name === WIDGET_TARGET_NAME
    );
    if (alreadyAdded) return config;

    // 1. File references
    pbxObjects["PBXFileReference"] = pbxObjects["PBXFileReference"] || {};
    pbxObjects["PBXFileReference"][UUIDS.widgetFileRef] = {
      isa: "PBXFileReference",
      lastKnownFileType: "sourcecode.swift",
      path: "TodoWidget.swift",
      sourceTree: '"<group>"',
      name: "TodoWidget.swift",
    };
    pbxObjects["PBXFileReference"][UUIDS.infoPlistFileRef] = {
      isa: "PBXFileReference",
      lastKnownFileType: "text.plist.xml",
      path: "Info.plist",
      sourceTree: '"<group>"',
      name: "Info.plist",
    };
    pbxObjects["PBXFileReference"][UUIDS.entitlementsFileRef] = {
      isa: "PBXFileReference",
      lastKnownFileType: "text.plist.entitlements",
      path: "TodoWidget.entitlements",
      sourceTree: '"<group>"',
      name: "TodoWidget.entitlements",
    };
    pbxObjects["PBXFileReference"][UUIDS.targetProduct] = {
      isa: "PBXFileReference",
      explicitFileType: "\"com.apple.product-type.app-extension\"",
      includeInIndex: 0,
      path: "TodoWidget.appex",
      sourceTree: "BUILT_PRODUCTS_DIR",
    };

    // 2. Build files
    pbxObjects["PBXBuildFile"] = pbxObjects["PBXBuildFile"] || {};
    pbxObjects["PBXBuildFile"][UUIDS.widgetBuildFile] = {
      isa: "PBXBuildFile",
      fileRef: UUIDS.widgetFileRef,
    };
    pbxObjects["PBXBuildFile"][UUIDS.infoPlistBuildFile] = {
      isa: "PBXBuildFile",
      fileRef: UUIDS.infoPlistFileRef,
    };

    // 3. Group for the widget folder
    // xcode package requires children as { value, comment } objects
    pbxObjects["PBXGroup"] = pbxObjects["PBXGroup"] || {};
    pbxObjects["PBXGroup"][UUIDS.widgetGroup] = {
      isa: "PBXGroup",
      children: [
        { value: UUIDS.widgetFileRef, comment: "TodoWidget.swift" },
        { value: UUIDS.infoPlistFileRef, comment: "Info.plist" },
        { value: UUIDS.entitlementsFileRef, comment: "TodoWidget.entitlements" },
      ],
      path: WIDGET_TARGET_NAME,
      sourceTree: '"<group>"',
      name: WIDGET_TARGET_NAME,
    };

    // Add group to the main project group
    const firstProject = project.getFirstProject();
    if (firstProject) {
      const mainGroupUUID = firstProject.firstProject.mainGroup;
      if (pbxObjects["PBXGroup"][mainGroupUUID]) {
        pbxObjects["PBXGroup"][mainGroupUUID].children.push(
          { value: UUIDS.widgetGroup, comment: WIDGET_TARGET_NAME }
        );
      }
    }

    // 4. Build phases — files arrays also use { value, comment } objects
    pbxObjects["PBXSourcesBuildPhase"] = pbxObjects["PBXSourcesBuildPhase"] || {};
    pbxObjects["PBXSourcesBuildPhase"][UUIDS.sourcesPhase] = {
      isa: "PBXSourcesBuildPhase",
      buildActionMask: 2147483647,
      files: [
        { value: UUIDS.widgetBuildFile, comment: "TodoWidget.swift in Sources" },
      ],
      runOnlyForDeploymentPostprocessing: 0,
    };

    pbxObjects["PBXResourcesBuildPhase"] = pbxObjects["PBXResourcesBuildPhase"] || {};
    pbxObjects["PBXResourcesBuildPhase"][UUIDS.resourcesPhase] = {
      isa: "PBXResourcesBuildPhase",
      buildActionMask: 2147483647,
      files: [
        { value: UUIDS.infoPlistBuildFile, comment: "Info.plist in Resources" },
      ],
      runOnlyForDeploymentPostprocessing: 0,
    };

    pbxObjects["PBXFrameworksBuildPhase"] = pbxObjects["PBXFrameworksBuildPhase"] || {};
    pbxObjects["PBXFrameworksBuildPhase"][UUIDS.frameworksPhase] = {
      isa: "PBXFrameworksBuildPhase",
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };

    // 5. Build configurations
    const sharedBuildSettings = {
      ALWAYS_SEARCH_USER_PATHS: "NO",
      CLANG_ANALYZER_NONNULL: "YES",
      CODE_SIGN_ENTITLEMENTS: `${WIDGET_TARGET_NAME}/TodoWidget.entitlements`,
      CODE_SIGN_STYLE: "Automatic",
      CURRENT_PROJECT_VERSION: 1,
      GENERATE_INFOPLIST_FILE: "NO",
      INFOPLIST_FILE: `${WIDGET_TARGET_NAME}/Info.plist`,
      IPHONEOS_DEPLOYMENT_TARGET: "17.0",
      LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      PRODUCT_BUNDLE_IDENTIFIER: `"${WIDGET_BUNDLE_ID}"`,
      PRODUCT_NAME: `"$(TARGET_NAME)"`,
      SKIP_INSTALL: "YES",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: '"1,2"',
    };

    pbxObjects["XCBuildConfiguration"] = pbxObjects["XCBuildConfiguration"] || {};
    pbxObjects["XCBuildConfiguration"][UUIDS.debugConfig] = {
      isa: "XCBuildConfiguration",
      buildSettings: { ...sharedBuildSettings, DEBUG_INFORMATION_FORMAT: "dwarf" },
      name: "Debug",
    };
    pbxObjects["XCBuildConfiguration"][UUIDS.releaseConfig] = {
      isa: "XCBuildConfiguration",
      buildSettings: { ...sharedBuildSettings, DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"' },
      name: "Release",
    };

    pbxObjects["XCConfigurationList"] = pbxObjects["XCConfigurationList"] || {};
    pbxObjects["XCConfigurationList"][UUIDS.configList] = {
      isa: "XCConfigurationList",
      buildConfigurations: [
        { value: UUIDS.debugConfig, comment: "Debug" },
        { value: UUIDS.releaseConfig, comment: "Release" },
      ],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: "Release",
    };

    // 6. Native target — buildPhases also use { value, comment }
    pbxObjects["PBXNativeTarget"] = pbxObjects["PBXNativeTarget"] || {};
    pbxObjects["PBXNativeTarget"][UUIDS.nativeTarget] = {
      isa: "PBXNativeTarget",
      buildConfigurationList: UUIDS.configList,
      buildPhases: [
        { value: UUIDS.sourcesPhase, comment: "Sources" },
        { value: UUIDS.frameworksPhase, comment: "Frameworks" },
        { value: UUIDS.resourcesPhase, comment: "Resources" },
      ],
      buildRules: [],
      dependencies: [],
      name: WIDGET_TARGET_NAME,
      productName: `"${WIDGET_TARGET_NAME}"`,
      productReference: UUIDS.targetProduct,
      productType: '"com.apple.product-type.app-extension"',
    };

    // 7. Add target to the project's targets list
    const projectSection = project.getFirstProject();
    if (projectSection) {
      projectSection.firstProject.targets = projectSection.firstProject.targets || [];
      projectSection.firstProject.targets.push(
        { value: UUIDS.nativeTarget, comment: WIDGET_TARGET_NAME }
      );
    }

    // 8. Add product to Products group
    const productsGroupUUID = Object.keys(pbxObjects["PBXGroup"]).find((key) => {
      const group = pbxObjects["PBXGroup"][key];
      return group && group.name === "Products";
    });
    if (productsGroupUUID && pbxObjects["PBXGroup"][productsGroupUUID]) {
      pbxObjects["PBXGroup"][productsGroupUUID].children.push(
        { value: UUIDS.targetProduct, comment: "TodoWidget.appex" }
      );
    }

    return config;
  });

/**
 * Add App Group entitlement to the main app so it can share UserDefaults with the widget.
 */
const withMainAppEntitlements = (config) =>
  withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;
    const appGroups = entitlements["com.apple.security.application-groups"] || [];
    if (!appGroups.includes(APP_GROUP_ID)) {
      entitlements["com.apple.security.application-groups"] = [...appGroups, APP_GROUP_ID];
    }
    return config;
  });

module.exports = (config) => {
  config = withTodoWidgetFiles(config);
  config = withTodoWidgetTarget(config);
  config = withMainAppEntitlements(config);
  return config;
};
