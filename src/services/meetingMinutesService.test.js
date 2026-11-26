import { describe, it, expect } from "vitest";
import {
  buildInitialAttendanceMap,
  setMemberAttendanceStatus,
  toggleMemberAttendance,
  setVisibleMembersAttendance,
  getAttendanceSummary,
} from "./meetingMinutesService";

describe("meetingMinutesService attendance helpers", () => {
  const sampleMembers = [
    { id: 1, name: "Amit Sharma", primary_role_label: "Owner", flat_info: "A-101" },
    { id: 2, name: "Priya Nair", primary_role_label: "Committee Member", flat_info: "B-202" },
    { id: 3, name: "Sunita Rao", primary_role_label: "Accountant", flat_info: null },
  ];

  it("restores saved historical attendance when editing a meeting", () => {
    const saved = [
      {
        user_id: 1,
        attendance_status: "PRESENT",
        member_name_snapshot: "Amit Sharma",
        member_role_snapshot: "Owner",
        flat_info_snapshot: "A-101",
      },
      {
        user_id: 99,
        attendance_status: "ABSENT",
        member_name_snapshot: "Former Member",
        member_role_snapshot: "Tenant",
        flat_info_snapshot: "C-303",
      },
    ];

    const map = buildInitialAttendanceMap(saved);
    expect(map.size).toBe(2);
    expect(map.get(1).attendance_status).toBe("PRESENT");
    expect(map.get(99).member_name_snapshot).toBe("Former Member");
    expect(getAttendanceSummary(map)).toEqual({ total: 2, present: 1, absent: 1 });
  });

  it("toggles individual member attendance without duplicates", () => {
    let map = new Map();
    map = toggleMemberAttendance(map, sampleMembers[0], true);
    expect(map.get(1).attendance_status).toBe("PRESENT");

    map = toggleMemberAttendance(map, sampleMembers[0], false);
    expect(map.size).toBe(1);
    expect(map.get(1).attendance_status).toBe("ABSENT");
  });

  it("marks all visible members on current page as PRESENT or ABSENT", () => {
    let map = new Map();
    map = setVisibleMembersAttendance(map, sampleMembers, "PRESENT");
    expect(getAttendanceSummary(map)).toEqual({ total: 3, present: 3, absent: 0 });

    const deselected = setVisibleMembersAttendance(map, sampleMembers.slice(0, 2), "ABSENT");
    expect(getAttendanceSummary(deselected)).toEqual({ total: 3, present: 1, absent: 2 });

    const cleared = setMemberAttendanceStatus(deselected, sampleMembers[0], null);
    expect(getAttendanceSummary(cleared)).toEqual({ total: 2, present: 1, absent: 1 });
  });
});
