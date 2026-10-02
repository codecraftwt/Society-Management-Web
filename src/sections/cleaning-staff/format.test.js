import { describe, it, expect } from "vitest";
import {
  formatDateOnly,
  formatDateOnlyLong,
  formatTimeIST,
  formatWorkedMinutes,
  todayIST,
  isRealDateOnly,
  addDaysIST,
  deriveAttendanceState,
  ATTENDANCE_STATE,
  formatPassValidity,
  formatPassCode,
  formatPhone,
  buildKpiSummary,
  istToDateTimeLocal,
  dateTimeLocalToIst,
} from "./format";

describe("cleaning-staff/format", () => {
  it("formats date-only strings without timezone shift", () => {
    expect(formatDateOnly("2026-10-02")).toBe("02 Oct 2026");
    expect(formatDateOnlyLong("2026-10-02")).toBe("Fri, 02 Oct 2026");
    expect(formatDateOnly("invalid")).toBe("—");
    expect(formatDateOnly(null)).toBe("—");
  });

  it("validates real dates", () => {
    expect(isRealDateOnly("2026-02-28")).toBe(true);
    expect(isRealDateOnly("2026-02-29")).toBe(false); /* 2026 not leap */
    expect(isRealDateOnly("2026-02-30")).toBe(false);
    expect(isRealDateOnly("2025-02-29")).toBe(false); /* 2025 not leap */
    expect(isRealDateOnly("bad")).toBe(false);
  });

  it("adds days in IST calendar sense", () => {
    expect(addDaysIST("2026-10-02", 1)).toBe("2026-10-03");
    expect(addDaysIST("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("formats time/instants in IST", () => {
    const t = "2026-10-02T03:45:00.000Z";
    expect(formatTimeIST(t)).toBe("09:15");
    expect(formatWorkedMinutes(90)).toBe("1h 30m");
    expect(formatWorkedMinutes(45)).toBe("45m");
    expect(formatWorkedMinutes(120)).toBe("2h");
    expect(formatWorkedMinutes(null)).toBe("—");
  });

  it("derives attendance state correctly", () => {
    expect(deriveAttendanceState(null)).toBe(ATTENDANCE_STATE.ABSENT);
    expect(deriveAttendanceState({ is_manual: true, check_in: "x" })).toBe(ATTENDANCE_STATE.MANUAL);
    expect(deriveAttendanceState({ check_in: "x", check_out: null })).toBe(ATTENDANCE_STATE.INCOMPLETE);
    expect(deriveAttendanceState({ check_in: "x", check_out: "y" })).toBe(ATTENDANCE_STATE.PRESENT);
  });

  it("formats pass validity", () => {
    expect(formatPassValidity({ valid_date: "2026-10-02", valid_until: "2026-10-05" })).toBe("02 Oct 2026 → 05 Oct 2026");
    expect(formatPassValidity({ valid_date: "2026-10-02", valid_until: null })).toBe("02 Oct 2026 (single day)");
    expect(formatPassValidity({ valid_date: "2026-10-02" })).toBe("02 Oct 2026 (single day)");
  });

  it("preserves pass code verbatim", () => {
    expect(formatPassCode("GP-812696")).toBe("GP-812696");
    expect(formatPassCode("  GP-812696  ")).toBe("GP-812696");
    expect(formatPassCode("")).toBe("—");
  });

  it("masks phone numbers", () => {
    expect(formatPhone("9876543210")).toBe("98 765 43210");
    expect(formatPhone("abcd")).toBe("abcd");
    expect(formatPhone(null)).toBe("—");
  });

  it("builds KPI summary", () => {
    const staff = [
      { status: "ACTIVE", active_pass: { status: "ACTIVE", valid_date: "2026-10-01", valid_until: "2026-10-03" } },
      { status: "ACTIVE" },
      { status: "INACTIVE" },
    ];
    const s = buildKpiSummary({ staff, today: "2026-10-02" });
    expect(s.total).toBe(3);
    expect(s.active).toBe(2);
    expect(s.inactive).toBe(1);
    expect(s.onPass).toBe(1);
  });

  it("converts between IST datetime-local and ISO", () => {
    const iso = dateTimeLocalToIst("2026-10-02T09:15");
    expect(iso).toMatch(/2026-10-02T03:45:00\.000Z/);
    expect(istToDateTimeLocal(iso)).toBe("2026-10-02T09:15");
    expect(dateTimeLocalToIst("")).toBe("");
    expect(istToDateTimeLocal(null)).toBe("");
  });

  it("returns todayIST in YYYY-MM-DD", () => {
    const t = todayIST(new Date("2026-10-02T00:00:00Z"));
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
