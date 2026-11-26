import API from "./api";

export const ROLE_FILTER_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "SOCIETY_ADMIN", label: "Society Admin" },
  { value: "COMMITTEE_MEMBER", label: "Committee Member" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "RESIDENT", label: "Resident (Owner)" },
  { value: "TENANT", label: "Tenant" },
  { value: "FAMILY_MEMBER", label: "Family Member" },
];

export const meetingMinutesService = {
  // Categories
  listCategories: (params = {}) =>
    API.get("/meeting-minutes/categories", { params }).then((r) => r.data),
  createCategory: (payload) =>
    API.post("/meeting-minutes/categories", payload).then((r) => r.data),
  updateCategory: (id, payload) =>
    API.put(`/meeting-minutes/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id) =>
    API.delete(`/meeting-minutes/categories/${id}`).then((r) => r.data),

  // Eligible Members (server-side paginated & role-filtered)
  getEligibleMembers: (params = {}) =>
    API.get("/meeting-minutes/eligible-members", { params }).then((r) => r.data),

  // Meeting Minutes CRUD
  listMeetings: (params = {}) =>
    API.get("/meeting-minutes", { params }).then((r) => r.data),
  getMeetingById: (id) =>
    API.get(`/meeting-minutes/${id}`).then((r) => r.data),
  createMeeting: (payload) =>
    API.post("/meeting-minutes", payload).then((r) => r.data),
  updateMeeting: (id, payload) =>
    API.put(`/meeting-minutes/${id}`, payload).then((r) => r.data),
  deleteMeeting: (id) =>
    API.delete(`/meeting-minutes/${id}`).then((r) => r.data),
};

/**
 * Builds initial attendance map from saved meeting attendees when editing.
 * Returns Map<userId, { user_id, attendance_status, member_name_snapshot, member_role_snapshot, flat_info_snapshot, profile_picture }>
 */
export function buildInitialAttendanceMap(savedAttendees = []) {
  const map = new Map();
  if (!Array.isArray(savedAttendees)) return map;
  for (const att of savedAttendees) {
    if (!att?.user_id) continue;
    map.set(Number(att.user_id), {
      user_id: Number(att.user_id),
      attendance_status: att.attendance_status === "PRESENT" ? "PRESENT" : "ABSENT",
      member_name_snapshot: att.member_name_snapshot || att.user?.name || "Member",
      member_role_snapshot: att.member_role_snapshot || "",
      flat_info_snapshot: att.flat_info_snapshot || "",
      profile_picture: att.user?.profile_picture || null,
    });
  }
  return map;
}

/**
 * Sets a single member's attendance to PRESENT, ABSENT, or clears (unmarks) if status is null.
 */
export function setMemberAttendanceStatus(prevMap, member, status) {
  const next = new Map(prevMap);
  const uid = Number(member.id || member.user_id);
  if (!uid) return next;
  if (!status) {
    next.delete(uid);
    return next;
  }
  const normalized = status === "PRESENT" ? "PRESENT" : "ABSENT";
  const existing = next.get(uid);
  next.set(uid, {
    user_id: uid,
    attendance_status: normalized,
    member_name_snapshot: existing?.member_name_snapshot || member.name || "Member",
    member_role_snapshot: existing?.member_role_snapshot || member.primary_role_label || "",
    flat_info_snapshot: existing?.flat_info_snapshot || member.flat_info || "",
    profile_picture: existing?.profile_picture || member.profile_picture || null,
  });
  return next;
}

/**
 * Toggles a single member's attendance between PRESENT and ABSENT (or adds them if not in map).
 */
export function toggleMemberAttendance(prevMap, member, checked) {
  return setMemberAttendanceStatus(prevMap, member, checked ? "PRESENT" : "ABSENT");
}

/**
 * Marks all currently visible members on the page as PRESENT, ABSENT, or clears them (null).
 */
export function setVisibleMembersAttendance(prevMap, visibleMembers, status) {
  let next = new Map(prevMap);
  for (const member of visibleMembers || []) {
    next = setMemberAttendanceStatus(next, member, status);
  }
  return next;
}

/**
 * Computes attendance summary counts from the attendance Map.
 */
export function getAttendanceSummary(attendanceMap) {
  let present = 0;
  let absent = 0;
  for (const entry of attendanceMap.values()) {
    if (entry.attendance_status === "PRESENT") present += 1;
    else absent += 1;
  }
  return { total: present + absent, present, absent };
}
