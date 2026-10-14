import { afterAll, describe, expect, it } from "vitest";
import {
  closeDisplay,
  countdown,
  dateTimeDisplay,
  formatCountdown,
  formatDateRange,
  formatDuration,
  ictDate,
  roundDay,
  withinHoursOfClose,
} from "../lib/round/time";

const originalTz = process.env.TZ;
afterAll(() => {
  process.env.TZ = originalTz;
});

// Round 4: starts 2026-11-10 00:00 ICT (= 11-09 17:00Z), 14 days, closes 2026-11-24 00:00 ICT.
const STARTS = "2026-11-09T17:00:00Z";
const CLOSES = "2026-11-23T17:00:00Z";

describe.each(["UTC", "America/New_York", "Asia/Bangkok"])("Bangkok clock with TZ=%s (E17)", (tz) => {
  it("shows the close as 23:59 on the last day", () => {
    process.env.TZ = tz;
    expect(closeDisplay(CLOSES, "th")).toEqual({ weekday: "จ.", date: "23 พ.ย.", time: "23:59" });
    expect(closeDisplay(CLOSES, "en")).toEqual({ weekday: "Mon", date: "23 Nov", time: "23:59" });
  });

  it("shows round dates as a range ending on the last day", () => {
    process.env.TZ = tz;
    expect(formatDateRange("2026-10-20T17:00:00Z", "2026-10-27T17:00:00Z", "th")).toBe("21–27 ต.ค.");
    expect(formatDateRange(STARTS, CLOSES, "en")).toBe("10–23 Nov");
    expect(formatDateRange("2026-10-29T17:00:00Z", "2026-11-04T17:00:00Z", "th")).toBe("30 ต.ค. – 4 พ.ย.");
  });

  it("computes ICT dates and day numbers at the midnight boundary", () => {
    process.env.TZ = tz;
    expect(ictDate("2026-11-09T16:59:59Z")).toBe("2026-11-09");
    expect(ictDate("2026-11-09T17:00:00Z")).toBe("2026-11-10");
    expect(roundDay(STARTS, "2026-11-09T16:59:59Z")).toBe(0);
    expect(roundDay(STARTS, "2026-11-09T17:00:00Z")).toBe(1);
    expect(roundDay(STARTS, "2026-11-23T16:59:59Z")).toBe(14);
    expect(roundDay(STARTS, CLOSES)).toBe(15);
  });

  it("formats review end with the exact ICT time", () => {
    process.env.TZ = tz;
    expect(dateTimeDisplay("2026-11-25T17:00:00Z", "th")).toEqual({ date: "26 พ.ย.", time: "00:00" });
    expect(dateTimeDisplay("2026-11-25T05:30:00Z", "en")).toEqual({ date: "25 Nov", time: "12:30" });
  });
});

describe("countdowns", () => {
  it("counts down to the close and detects the last hours", () => {
    const c = countdown("2026-11-23T14:30:00Z", CLOSES);
    expect(c).toMatchObject({ d: 0, h: 2, m: 30 });
    expect(formatCountdown(c, "th")).toBe("2 ชม. 30 นาที");
    expect(formatCountdown(countdown("2026-11-07T17:00:00Z", STARTS), "en")).toBe("2d 0h");
    expect(withinHoursOfClose(CLOSES, "2026-11-23T15:30:00Z", 2)).toBe(true);
    expect(withinHoursOfClose(CLOSES, "2026-11-23T14:30:00Z", 2)).toBe(false);
    expect(withinHoursOfClose(CLOSES, "2026-11-23T17:00:01Z", 2)).toBe(false);
    expect(countdown(CLOSES, STARTS).totalMs).toBe(0);
  });

  it("formats the recording timer", () => {
    expect(formatDuration(42_500)).toBe("0:42");
    expect(formatDuration(180_000)).toBe("3:00");
  });
});
