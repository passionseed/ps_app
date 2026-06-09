# iOS Todo Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native iOS WidgetKit extension to the Passion Seed app that shows a hardcoded todo list with interactive tap-to-toggle strikethrough, in small/medium/large sizes.

**Architecture:** A Swift/SwiftUI widget extension (`TodoWidget`) is added as a native Xcode target via an Expo config plugin (`withTodoWidget.js`). Task state is stored in App Group shared UserDefaults (`group.com.passionseed.app`) so the widget and app can share data in the future. The `AppIntent` (`ToggleTaskIntent`) handles tap interactions (iOS 17+ only).

**Tech Stack:** Swift 5.9, SwiftUI, WidgetKit, AppIntents framework, Expo config plugins (`@expo/config-plugins` with `XcodeProject` from `xcode` package), iOS 17+ deployment target for widget target.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `ios/TodoWidget/TodoWidget.swift` | Create | All widget code: data model, AppIntent, timeline provider, SwiftUI views |
| `ios/TodoWidget/Info.plist` | Create | Widget extension Info.plist (NSExtension keys) |
| `ios/TodoWidget/TodoWidget.entitlements` | Create | App Group entitlement for the widget extension |
| `ios/PassionSeed/PassionSeed.entitlements` | Modify | Add App Group entitlement to main app |
| `app/config-plugins/withTodoWidget.js` | Create | Expo config plugin: adds widget target to Xcode project, wires entitlements |
| `app.config.js` | Modify | Register `withTodoWidget` plugin |

---

### Task 1: Create the Swift widget source file

**Files:**
- Create: `ios/TodoWidget/TodoWidget.swift`

- [ ] **Step 1: Create the `ios/TodoWidget/` directory and write `TodoWidget.swift`**

```bash
mkdir -p /path/to/project/ios/TodoWidget
```

Then create `ios/TodoWidget/TodoWidget.swift` with this complete content:

```swift
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Data Model

struct TodoTask: Codable, Identifiable {
    let id: Int
    let title: String
    var isDone: Bool
}

let defaultTasks: [TodoTask] = [
    TodoTask(id: 0, title: "Write YouTube video script", isDone: false),
    TodoTask(id: 1, title: "Write blog post", isDone: false),
    TodoTask(id: 2, title: "Record interactive demo", isDone: false),
    TodoTask(id: 3, title: "Create a Notion template", isDone: false),
    TodoTask(id: 4, title: "Plan content calendar", isDone: true),
    TodoTask(id: 5, title: "Publish weekly newsletter", isDone: true),
]

let appGroupID = "group.com.passionseed.app"
let tasksKey = "todoWidgetTasks"

func loadTasks() -> [TodoTask] {
    guard let defaults = UserDefaults(suiteName: appGroupID),
          let data = defaults.data(forKey: tasksKey),
          let tasks = try? JSONDecoder().decode([TodoTask].self, from: data) else {
        return defaultTasks
    }
    return tasks
}

func saveTasks(_ tasks: [TodoTask]) {
    guard let defaults = UserDefaults(suiteName: appGroupID),
          let data = try? JSONEncoder().encode(tasks) else { return }
    defaults.set(data, forKey: tasksKey)
}

// MARK: - AppIntent

struct ToggleTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Task"

    @Parameter(title: "Task ID")
    var taskId: Int

    func perform() async throws -> some IntentResult {
        var tasks = loadTasks()
        if let index = tasks.firstIndex(where: { $0.id == taskId }) {
            tasks[index].isDone.toggle()
            saveTasks(tasks)
        }
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Timeline

struct TodoEntry: TimelineEntry {
    let date: Date
    let tasks: [TodoTask]
}

struct TodoProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodoEntry {
        TodoEntry(date: Date(), tasks: defaultTasks)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodoEntry) -> Void) {
        completion(TodoEntry(date: Date(), tasks: loadTasks()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodoEntry>) -> Void) {
        let entry = TodoEntry(date: Date(), tasks: loadTasks())
        completion(Timeline(entries: [entry], policy: .atEnd))
    }
}

// MARK: - Views

struct TaskRowView: View {
    let task: TodoTask

    var body: some View {
        Button(intent: ToggleTaskIntent(taskId: task.id)) {
            Text(task.title)
                .font(.system(size: 14, weight: .regular))
                .strikethrough(task.isDone, color: .secondary)
                .foregroundColor(task.isDone ? .secondary : .primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .lineLimit(1)
        }
        .buttonStyle(.plain)
    }
}

struct HeaderView: View {
    var body: some View {
        Text("Passion Seed")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SmallView: View {
    let tasks: [TodoTask]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HeaderView()
            ForEach(tasks.prefix(2)) { task in
                TaskRowView(task: task)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
    }
}

struct MediumView: View {
    let tasks: [TodoTask]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HeaderView()
            ForEach(tasks.prefix(4)) { task in
                TaskRowView(task: task)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
    }
}

struct LargeView: View {
    let tasks: [TodoTask]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HeaderView()
            ForEach(tasks) { task in
                TaskRowView(task: task)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
    }
}

struct TodoWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: TodoEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallView(tasks: entry.tasks)
        case .systemMedium:
            MediumView(tasks: entry.tasks)
        case .systemLarge:
            LargeView(tasks: entry.tasks)
        default:
            MediumView(tasks: entry.tasks)
        }
    }
}

// MARK: - Widget

struct TodoWidget: Widget {
    let kind: String = "TodoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodoProvider()) { entry in
            TodoWidgetEntryView(entry: entry)
                .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Tasks")
        .description("Your Passion Seed tasks.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Bundle Entry Point

@main
struct TodoWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodoWidget()
    }
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls ios/TodoWidget/TodoWidget.swift
```

Expected: file listed with no error.

---

### Task 2: Create widget Info.plist and entitlements

**Files:**
- Create: `ios/TodoWidget/Info.plist`
- Create: `ios/TodoWidget/TodoWidget.entitlements`

- [ ] **Step 1: Create `ios/TodoWidget/Info.plist`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>
```

- [ ] **Step 2: Create `ios/TodoWidget/TodoWidget.entitlements`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.passionseed.app</string>
    </array>
</dict>
</plist>
```

- [ ] **Step 3: Verify both files exist**

```bash
ls ios/TodoWidget/
```

Expected output includes: `Info.plist  TodoWidget.entitlements  TodoWidget.swift`

---

### Task 3: Add App Group entitlement to the main app

**Files:**
- Modify: `ios/PassionSeed/PassionSeed.entitlements`

The current entitlements file contains `aps-environment` and `com.apple.developer.applesignin`. Add the App Group key.

- [ ] **Step 1: Update `ios/PassionSeed/PassionSeed.entitlements`** to be:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>development</string>
    <key>com.apple.developer.applesignin</key>
    <array>
      <string>Default</string>
    </array>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>group.com.passionseed.app</string>
    </array>
  </dict>
</plist>
```

---

### Task 4: Create the Expo config plugin

**Files:**
- Create: `app/config-plugins/withTodoWidget.js`

This plugin runs during `expo prebuild` and wires the `TodoWidget` native target into the Xcode project. It uses `@expo/config-plugins` and the `xcode` package (already a transitive dependency of Expo).

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p app/config-plugins
```

Then create `app/config-plugins/withTodoWidget.js`:

```js
const { withXcodeProject, withDangerousMod } = require("@expo/config-plugins");
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
      const srcDir = path.join(__dirname, "../../ios/TodoWidget");
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
    pbxObjects["PBXGroup"] = pbxObjects["PBXGroup"] || {};
    pbxObjects["PBXGroup"][UUIDS.widgetGroup] = {
      isa: "PBXGroup",
      children: [
        UUIDS.widgetFileRef,
        UUIDS.infoPlistFileRef,
        UUIDS.entitlementsFileRef,
      ],
      path: WIDGET_TARGET_NAME,
      sourceTree: '"<group>"',
      name: WIDGET_TARGET_NAME,
    };

    // Add group to the main project group
    const mainGroupUUID = project.getFirstProject().firstProject.mainGroup;
    if (pbxObjects["PBXGroup"][mainGroupUUID]) {
      pbxObjects["PBXGroup"][mainGroupUUID].children.push(UUIDS.widgetGroup);
    }

    // 4. Build phases
    pbxObjects["PBXSourcesBuildPhase"] = pbxObjects["PBXSourcesBuildPhase"] || {};
    pbxObjects["PBXSourcesBuildPhase"][UUIDS.sourcesPhase] = {
      isa: "PBXSourcesBuildPhase",
      buildActionMask: 2147483647,
      files: [UUIDS.widgetBuildFile],
      runOnlyForDeploymentPostprocessing: 0,
    };

    pbxObjects["PBXResourcesBuildPhase"] = pbxObjects["PBXResourcesBuildPhase"] || {};
    pbxObjects["PBXResourcesBuildPhase"][UUIDS.resourcesPhase] = {
      isa: "PBXResourcesBuildPhase",
      buildActionMask: 2147483647,
      files: [UUIDS.infoPlistBuildFile],
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
      buildConfigurations: [UUIDS.debugConfig, UUIDS.releaseConfig],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: "Release",
    };

    // 6. Native target
    pbxObjects["PBXNativeTarget"] = pbxObjects["PBXNativeTarget"] || {};
    pbxObjects["PBXNativeTarget"][UUIDS.nativeTarget] = {
      isa: "PBXNativeTarget",
      buildConfigurationList: UUIDS.configList,
      buildPhases: [
        UUIDS.sourcesPhase,
        UUIDS.frameworksPhase,
        UUIDS.resourcesPhase,
      ],
      buildRules: [],
      dependencies: [],
      name: WIDGET_TARGET_NAME,
      productName: `"${WIDGET_TARGET_NAME}"`,
      productReference: UUIDS.targetProduct,
      productType: '"com.apple.product-type.app-extension"',
    };

    // 7. Add target to the project's targets list
    const projectSection = project.getFirstProject().firstProject;
    projectSection.targets = projectSection.targets || [];
    projectSection.targets.push(UUIDS.nativeTarget);

    // 8. Add product to Products group
    const productsGroupUUID = Object.keys(pbxObjects["PBXGroup"]).find((key) => {
      const group = pbxObjects["PBXGroup"][key];
      return group && group.name === "Products";
    });
    if (productsGroupUUID && pbxObjects["PBXGroup"][productsGroupUUID]) {
      pbxObjects["PBXGroup"][productsGroupUUID].children.push(UUIDS.targetProduct);
    }

    return config;
  });

module.exports = (config) => {
  config = withTodoWidgetFiles(config);
  config = withTodoWidgetTarget(config);
  return config;
};
```

- [ ] **Step 2: Verify the file was created**

```bash
ls app/config-plugins/withTodoWidget.js
```

Expected: file listed.

---

### Task 5: Register plugin in app.config.js

**Files:**
- Modify: `app.config.js`

- [ ] **Step 1: Add the plugin to the plugins array in `app.config.js`**

Find the `plugins: [` array and add `"./app/config-plugins/withTodoWidget"` as the first entry:

```js
plugins: [
  "./app/config-plugins/withTodoWidget",   // <-- add this line
  withHighMemoryGradle,
  withStableIosBundleEntry,
  // ... rest of existing plugins unchanged
```

---

### Task 6: Run prebuild and verify

**Files:** (none — verification only)

- [ ] **Step 1: Run expo prebuild for iOS**

```bash
pnpm expo prebuild --platform ios --clean
```

Expected: completes without errors. Watch for any "Cannot find module" or "undefined is not iterable" errors from the config plugin.

- [ ] **Step 2: Verify the widget target appears in the Xcode project**

```bash
grep -n "TodoWidget" ios/PassionSeed.xcodeproj/project.pbxproj | head -20
```

Expected: multiple lines referencing `TodoWidget` including the native target, build phases, and file references.

- [ ] **Step 3: Verify the widget source files were copied**

```bash
ls ios/TodoWidget/
```

Expected: `Info.plist  TodoWidget.entitlements  TodoWidget.swift`

- [ ] **Step 4: Verify the App Group was added to main app entitlements**

```bash
grep -A2 "application-groups" ios/PassionSeed/PassionSeed.entitlements
```

Expected output:
```
<key>com.apple.security.application-groups</key>
<array>
    <string>group.com.passionseed.app</string>
```

- [ ] **Step 5: Open in Xcode and build**

```bash
open ios/PassionSeed.xcworkspace
```

In Xcode:
1. Select the `TodoWidget` scheme (or the `PassionSeed` scheme which includes the extension)
2. Build with `Cmd+B`
3. Expected: Build Succeeds with no errors

- [ ] **Step 6: Run on simulator and add widget**

1. Run the app on an iOS 17+ simulator
2. Long-press the home screen → tap `+` → search "Passion Seed"
3. The "Tasks" widget should appear in small, medium, and large sizes
4. Add medium size — verify 4 tasks are shown, last 2 are gray strikethrough
5. Tap a pending task — verify it becomes strikethrough immediately
6. Tap a done task — verify strikethrough is removed

---

### Task 7: Commit

- [ ] **Step 1: Stage and commit all new/modified files**

```bash
git add ios/TodoWidget/ app/config-plugins/withTodoWidget.js app.config.js ios/PassionSeed/PassionSeed.entitlements docs/superpowers/
git commit -m "$(cat <<'EOF'
feat: add iOS todo widget with interactive task toggling

Adds a native WidgetKit extension (TodoWidget) supporting small, medium,
and large sizes. Tasks toggle strikethrough on tap via AppIntent (iOS 17+).
State persists via App Group shared UserDefaults, ready for real data later.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- All UUIDs in `withTodoWidget.js` are stable hardcoded values — safe because the guard check (`alreadyAdded`) prevents double-insertion on repeated prebuilds.
- `TodoWidget.swift` uses `@main` + `WidgetBundle` — correct entry point for a widget-only extension.
- `containerBackground(.background, for: .widget)` is required on iOS 17+ to avoid a black background.
- The `withDangerousMod` file copy runs before `withXcodeProject` modifies the pbxproj — ordering is correct because both are applied sequentially in `module.exports`.
- Task 3 (entitlements) is a manual file edit that must be done before prebuild so the plugin picks it up correctly. The plugin does NOT modify the main app entitlements file — it's already modified in Task 3.
- Spec requirement "App Group entitlement on main app" — covered in Task 3.
- Spec requirement "three sizes" — covered in `TodoWidget.swift` with `SmallView`, `MediumView`, `LargeView`.
- Spec requirement "hardcoded initial state with 2 done tasks" — covered in `defaultTasks` array.
