import { Platform } from "react-native";
import { supabase } from "./supabase";

export type BuildTodo = {
  id: string;
  title: string;
  is_done: boolean;
  due_date: string;
};

const BUILD_ACCESS_ROLES = new Set(["passion-seed-team", "admin"]);

/**
 * Build tab is internal-only (same gate as passionseed.org/build).
 */
export async function hasBuildAccess(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (error) {
      console.warn("[build-todos] role check failed:", error.message);
      return false;
    }

    return (data ?? []).some((row) => BUILD_ACCESS_ROLES.has(row.role));
  } catch (error) {
    console.warn("[build-todos] hasBuildAccess error:", error);
    return false;
  }
}

function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let lastSyncAt = 0;
const MIN_SYNC_INTERVAL_MS = 30_000;

/**
 * Pull build todos and push them into the iOS widget App Group store when available.
 * Safe no-op on web/Android or when the native bridge is missing.
 */
export async function syncBuildTodos(force = false): Promise<void> {
  if (Platform.OS !== "ios") return;

  const now = Date.now();
  if (!force && now - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;
  lastSyncAt = now;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("https://www.passionseed.org/api/build-todos", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;

    const todos = (await res.json()) as BuildTodo[];
    const today = localDateString();
    const visible = todos.filter((t) => !t.is_done || t.due_date === today);

    // Widget model uses numeric ids; hash UUID → stable int for AppIntent toggles.
    const widgetTasks = visible.slice(0, 12).map((t, index) => ({
      id: hashToInt(t.id) || index + 1,
      title: t.title,
      isDone: t.is_done,
    }));

    // No Shared Group Preferences package yet — keep fetch side effects ready
    // and avoid crashing the JS bundle. Wire native write when available.
    console.log(
      `[build-todos] synced ${widgetTasks.length} task(s) for widget (write deferred)`,
    );
  } catch (error) {
    console.warn("[build-todos] syncBuildTodos error:", error);
  }
}

function hashToInt(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}
