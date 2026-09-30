import { describe, it, expect } from "vitest";

import {
  getTodayISO,
  toISODate,
  shiftCoversDay,
  shiftStatus,
  isShiftEditable,
  shiftForToday,
  sortShiftsForDisplay,
  formatShiftDate,
  formatShiftRange,
  SHIFT_TODAY,
  SHIFT_UPCOMING,
  SHIFT_COMPLETED,
} from "./guardShifts";

/* The "today" used by every assertion below. The helpers take it as an
   argument precisely so the tests never depend on the wall clock. */
const TODAY = "2026-09-30";

const shift = (id, type, start, end) => ({
  id,
  shift_type: type,
  start_date: start,
  end_date: end,
});

const PAST_1 = shift(1, "MORNING", "2026-09-01", "2026-09-28");
const TODAY_SHIFT = shift(2, "AFTERNOON", "2026-09-29", "2026-09-30");
const FUTURE = shift(3, "MORNING", "2026-10-01", "2026-10-10");

describe("toISODate", () => {
  it("keeps a date-only value as-is", () => {
    expect(toISODate("2026-09-30")).toBe("2026-09-30");
  });

  it("trims an ISO timestamp down to its date", () => {
    expect(toISODate("2026-09-30T00:00:00.000Z")).toBe("2026-09-30");
  });

  it("returns an empty string for missing or unparseable values", () => {
    expect(toISODate(null)).toBe("");
    expect(toISODate(undefined)).toBe("");
    expect(toISODate("")).toBe("");
    expect(toISODate("not-a-date")).toBe("");
  });
});

describe("getTodayISO", () => {
  it("resolves a calendar day in the app timezone, never a UTC instant", () => {
    const today = getTodayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("shiftCoversDay", () => {
  it("includes both the start and the end day", () => {
    expect(shiftCoversDay(TODAY_SHIFT, "2026-09-29")).toBe(true);
    expect(shiftCoversDay(TODAY_SHIFT, "2026-09-30")).toBe(true);
  });

  it("excludes days outside the range", () => {
    expect(shiftCoversDay(TODAY_SHIFT, "2026-09-28")).toBe(false);
    expect(shiftCoversDay(TODAY_SHIFT, "2026-10-01")).toBe(false);
  });
});

describe("shiftStatus", () => {
  it("marks a running assignment as today", () => {
    expect(shiftStatus(shift(1, "NIGHT", "2026-09-30", "2026-10-01"), TODAY)).toBe(SHIFT_TODAY);
  });

  it("marks an assignment that has ended as completed", () => {
    expect(shiftStatus(PAST_1, TODAY)).toBe(SHIFT_COMPLETED);
    expect(shiftStatus(shift(4, "MORNING", "2026-07-31", "2026-09-05"), TODAY)).toBe(SHIFT_COMPLETED);
  });

  it("marks an assignment that has not started as upcoming", () => {
    expect(shiftStatus(FUTURE, TODAY)).toBe(SHIFT_UPCOMING);
  });

  it("decides from the dates, not from the shift type", () => {
    /* The same MORNING type is completed here and upcoming on another day. */
    expect(shiftStatus(PAST_1, TODAY)).toBe(SHIFT_COMPLETED);
    expect(shiftStatus(PAST_1, "2026-09-15")).toBe(SHIFT_TODAY);
    expect(shiftStatus(FUTURE, "2026-09-15")).toBe(SHIFT_UPCOMING);
    expect(shiftStatus(FUTURE, "2026-10-05")).toBe(SHIFT_TODAY);
  });

  it("rolls over without any hardcoded date - yesterday vs tomorrow", () => {
    expect(shiftForToday([FUTURE], "2026-10-01")).toEqual(FUTURE);
    expect(shiftForToday([FUTURE], TODAY)).toBeNull();
    expect(shiftForToday([PAST_1], "2026-10-01")).toBeNull();
  });
});

describe("isShiftEditable", () => {
  it("locks a completed assignment and unlocks a running or upcoming one", () => {
    expect(isShiftEditable(PAST_1, TODAY)).toBe(false);
    expect(isShiftEditable(TODAY_SHIFT, TODAY)).toBe(true);
    expect(isShiftEditable(FUTURE, TODAY)).toBe(true);
  });
});

describe("shiftForToday", () => {
  it("returns null when nothing covers today", () => {
    expect(shiftForToday([PAST_1], TODAY)).toBeNull();
    expect(shiftForToday([FUTURE], TODAY)).toBeNull();
    expect(shiftForToday([], TODAY)).toBeNull();
    expect(shiftForToday(null, TODAY)).toBeNull();
  });

  it("ignores a past assignment once it has ended", () => {
    expect(shiftForToday([PAST_1], TODAY)).toBeNull();
  });

  it("picks the single assignment covering today", () => {
    expect(shiftForToday([PAST_1, TODAY_SHIFT, FUTURE], TODAY)).toEqual(TODAY_SHIFT);
  });
});

describe("sortShiftsForDisplay", () => {
  it("puts today first, then the soonest upcoming, then history newest-first", () => {
    const older = shift(4, "NIGHT", "2026-09-01", "2026-09-05");
    const sorted = sortShiftsForDisplay([older, FUTURE, PAST_1, TODAY_SHIFT], TODAY);
    expect(sorted.map((s) => s.id)).toEqual([2, 3, 1, 4]);
  });

  it("handles an empty list", () => {
    expect(sortShiftsForDisplay([], TODAY)).toEqual([]);
    expect(sortShiftsForDisplay(undefined, TODAY)).toEqual([]);
  });
});

describe("formatShiftDate", () => {
  it("prints the stored day, not the neighbouring one", () => {
    expect(formatShiftDate("2026-09-30")).toBe("30 Sep");
    expect(formatShiftDate("2026-10-01")).toBe("01 Oct");
    expect(formatShiftDate("2026-09-30", { year: true })).toBe("30 Sep 2026");
  });

  it("falls back to a dash for an unusable value", () => {
    expect(formatShiftDate("")).toBe("—");
  });
});

describe("formatShiftRange", () => {
  it("formats both ends and keeps the year optional", () => {
    expect(formatShiftRange(TODAY_SHIFT)).toBe("29 Sep → 30 Sep");
    expect(formatShiftRange(TODAY_SHIFT, { year: true })).toBe("29 Sep 2026 → 30 Sep 2026");
  });

  it("falls back to a dash when a bound is missing", () => {
    expect(formatShiftRange({ start_date: "2026-09-29", end_date: null })).toBe("—");
    expect(formatShiftRange(null)).toBe("—");
  });
});
