import { describe, expect, it } from "vitest";
import {
  formatPathDayCompletionLabel,
  formatPathDayLabel,
} from "../lib/pathlab-day-label";

describe("formatPathDayLabel", () => {
  it("includes the title when one exists", () => {
    expect(formatPathDayLabel(3, "Build your first prototype")).toBe(
      "Day 3: Build your first prototype",
    );
  });

  it("falls back to the day number when title is missing", () => {
    expect(formatPathDayLabel(2, null)).toBe("Day 2");
  });

  it("ignores whitespace-only titles", () => {
    expect(formatPathDayLabel(4, "   ")).toBe("Day 4");
  });
});

describe("formatPathDayCompletionLabel", () => {
  it("includes the day title in completion copy", () => {
    expect(
      formatPathDayCompletionLabel(1, "Meet the people in this role"),
    ).toBe("Day 1: Meet the people in this role Complete! 🎉");
  });
});
