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
