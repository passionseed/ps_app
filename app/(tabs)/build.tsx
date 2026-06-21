import { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { syncBuildTodos } from "../../lib/build-todos";

interface BuildTodo {
  id: string;
  title: string;
  is_done: boolean;
  due_date: string;
}

function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getSectionLabel(due_date: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(due_date + "T00:00:00");
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `In ${diff} Days`;
  // Overdue: show actual date
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildSections(todos: BuildTodo[]) {
  const today = localDateString();
  // Show only incomplete tasks (any date) + tasks completed today
  const visible = todos.filter((t) => {
    if (!t.is_done) return true;           // always show incomplete
    return t.due_date === today;           // only show completed if due today
  });
  const sorted = [...visible].sort((a, b) => a.due_date.localeCompare(b.due_date));

  const map = new Map<string, BuildTodo[]>();
  for (const t of sorted) {
    if (!map.has(t.due_date)) map.set(t.due_date, []);
    map.get(t.due_date)!.push(t);
  }

  return Array.from(map.entries()).map(([date, data]) => ({
    title: getSectionLabel(date),
    data,
  }));
}

function formatDatePill(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return dateStr;
}

export default function BuildScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === "ios" ? insets.bottom + 44 + 48 : 92;
  const [todos, setTodos] = useState<BuildTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState(localDateString());
  const [inputVisible, setInputVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const listRef = useRef<SectionList>(null);

  const fetchTodos = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("https://www.passionseed.org/api/build-todos", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log("[buildTodos] today:", localDateString());
      console.log("[buildTodos] tasks:", data.map((t: BuildTodo) => `${t.title} done=${t.is_done} due=${t.due_date}`));
      setTodos(data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    fetchTodos();
  }, [fetchTodos]));

  async function addTodo() {
    const title = newTitle.trim();
    if (!title) return;
    const due_date = newDueDate;
    setNewTitle("");
    setNewDueDate(localDateString());
    setInputVisible(false);
    // Optimistic add — show immediately with a temp id
    const tempId = `temp-${Date.now()}`;
    const optimistic: BuildTodo = { id: tempId, title, is_done: false, due_date };
    setTodos((prev) => [...prev, optimistic]);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("https://www.passionseed.org/api/build-todos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, due_date }),
    });
    if (res.ok) {
      await fetchTodos();
      await syncBuildTodos();
    } else {
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
    }
  }

  async function toggleTodo(todo: BuildTodo) {
    // Optimistic update — show strikethrough immediately
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, is_done: !t.is_done } : t))
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`https://www.passionseed.org/api/build-todos/${todo.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_done: !todo.is_done }),
    });
    // Delay re-fetch so strikethrough is visible before item moves/disappears
    await new Promise((r) => setTimeout(r, 800));
    await fetchTodos();
    await syncBuildTodos();
  }

  const sections = buildSections(todos);

  // Scroll to Today section on load
  const scrollToToday = useCallback(() => {
    const todayIndex = sections.findIndex((s) => s.title === "Today");
    if (todayIndex > 0 && listRef.current) {
      listRef.current.scrollToLocation({ sectionIndex: todayIndex, itemIndex: 0, animated: false, viewOffset: 0 });
    }
  }, [sections]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* List */}
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(t) => t.id}
        onLayout={scrollToToday}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => toggleTodo(item)}
            activeOpacity={0.6}
          >
            <Text style={[styles.title, item.is_done && styles.titleDone]} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No tasks yet. Tap + to add one.</Text>
        }
      />

      {/* Input sheet — sits above keyboard, above tab bar */}
      {inputVisible && (
        <View style={[styles.inputSheet, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            autoFocus
            style={styles.inputField}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Task title"
            placeholderTextColor="#C7C7CC"
            onSubmitEditing={addTodo}
            onBlur={() => {
              if (newTitle.trim()) addTodo();
              else { setInputVisible(false); setNewDueDate(localDateString()); }
            }}
            returnKeyType="done"
            multiline={false}
          />
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={styles.datePill}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.datePillText}>📅 {formatDatePill(newDueDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={addTodo}>
              <Text style={styles.submitArrow}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Calendar modal */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}
        >
          <View style={[styles.calendarSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.calendarTitle}>Pick a date</Text>
            {/* Simple week-based date picker */}
            {(() => {
              const { year, month } = calendarMonth;
              const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells: (number | null)[] = Array(firstDay).fill(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              while (cells.length % 7 !== 0) cells.push(null);
              const weeks: (number | null)[][] = [];
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
              const todayStr = localDateString();
              return (
                <View onStartShouldSetResponder={() => true}>
                  <View style={styles.calendarNav}>
                    <TouchableOpacity onPress={() => setCalendarMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}>
                      <Text style={styles.calendarNavBtn}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthLabel}>{monthName}</Text>
                    <TouchableOpacity onPress={() => setCalendarMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}>
                      <Text style={styles.calendarNavBtn}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calendarDayHeaders}>
                    {["S","M","T","W","T","F","S"].map((d, i) => (
                      <Text key={i} style={styles.calendarDayHeader}>{d}</Text>
                    ))}
                  </View>
                  {weeks.map((week, wi) => (
                    <View key={wi} style={styles.calendarWeek}>
                      {week.map((day, di) => {
                        if (!day) return <View key={di} style={styles.calendarCell} />;
                        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isSelected = dateStr === newDueDate;
                        const isToday = dateStr === todayStr;
                        return (
                          <TouchableOpacity
                            key={di}
                            style={[styles.calendarCell, isSelected && styles.calendarCellSelected]}
                            onPress={() => { setNewDueDate(dateStr); setCalendarVisible(false); }}
                          >
                            <Text style={[styles.calendarDayText, isToday && styles.calendarDayToday, isSelected && styles.calendarDaySelected]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FAB */}
      {!inputVisible && (
        <TouchableOpacity
          style={[styles.fab, { bottom: tabBarHeight + 8 }]}
          onPress={() => setInputVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F2F2F7" },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  sectionHeader: {
    fontSize: 28,
    fontFamily: "LibreFranklin_700Bold",
    color: "#000",
    marginTop: 8,
    marginBottom: 6,
  },
  row: {
    paddingVertical: 10,
  },
  rowDateLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontFamily: "LibreFranklin_400Regular",
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: "LibreFranklin_400Regular",
    color: "#000",
    flex: 1,
  },
  titleDone: {
    textDecorationLine: "line-through",
    color: "#C7C7CC",
  },
  empty: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 60,
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
  },
  inputSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  inputField: {
    fontSize: 17,
    fontFamily: "LibreFranklin_400Regular",
    color: "#000",
    paddingVertical: 8,
    minHeight: 44,
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  datePill: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  datePillText: {
    fontSize: 14,
    color: "#3C3C43",
    fontFamily: "LibreFranklin_400Regular",
  },
  submitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  submitArrow: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  calendarSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  calendarTitle: {
    fontSize: 17,
    fontFamily: "LibreFranklin_700Bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 16,
  },
  calendarNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarNavBtn: {
    fontSize: 24,
    color: "#000",
    paddingHorizontal: 12,
  },
  calendarMonthLabel: {
    fontSize: 16,
    fontFamily: "LibreFranklin_700Bold",
    color: "#000",
  },
  calendarDayHeaders: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#8E8E93",
    fontFamily: "LibreFranklin_400Regular",
  },
  calendarWeek: {
    flexDirection: "row",
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarCellSelected: {
    backgroundColor: "#000",
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 15,
    color: "#000",
    fontFamily: "LibreFranklin_400Regular",
  },
  calendarDayToday: {
    color: "#007AFF",
    fontFamily: "LibreFranklin_700Bold",
  },
  calendarDaySelected: {
    color: "#fff",
    fontFamily: "LibreFranklin_700Bold",
  },
});
