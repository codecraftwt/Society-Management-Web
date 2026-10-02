/* ──────────────────────────────────────────────────────────────────────────
 * Cleaning Staff — API service layer
 *
 * Every function here maps 1:1 onto a route that exists in
 * API/routes/cleaningStaffRoutes.js.
 * ────────────────────────────────────────────────────────────────────────── */

import API from "../../services/api";

/* The backend always answers { success, data } (or { success, data, message }).
   Some list routes return a bare array; normalise both shapes. */
const unwrap = (res) => {
  const body = res?.data;
  if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) {
    return body.data;
  }
  return body;
};

/** Pull the list out of a response that may be an array or a {data} envelope. */
const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

/* ── Staff ─────────────────────────────────────────────────────────────── */

/**
 * GET /cleaning-staff
 * Filter by status and search (name, phone, designation).
 */
export const getCleaningStaff = async ({ status, search } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (search && String(search).trim()) params.search = String(search).trim();
  const res = await API.get("/cleaning-staff", { params });
  return toList(unwrap(res));
};

/** GET /cleaning-staff/:id — staff + current active pass. */
export const getCleaningStaffById = async (id) => {
  const res = await API.get(`/cleaning-staff/${id}`);
  return unwrap(res) || null;
};

/**
 * POST /cleaning-staff
 * Accepts multipart/form-data for profile_picture upload.
 */
export const createCleaningStaff = async (payload = {}, file = null) => {
  const form = new FormData();
  const append = (key, value) => {
    if (value === null || value === undefined || value === "") return;
    form.append(key, String(value));
  };

  append("name", payload.name);
  append("phone", payload.phone);
  append("email", payload.email);
  append("address", payload.address);
  append("designation", payload.designation);
  append("joining_date", payload.joining_date);

  if (file) form.append("profile_picture", file);

  const res = await API.post("/cleaning-staff", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res);
};

/**
 * PUT /cleaning-staff/:id
 */
export const updateCleaningStaff = async (id, payload = {}) => {
  const body = {};
  const keys = ["name", "phone", "email", "address", "designation", "joining_date"];
  keys.forEach((k) => {
    if (payload[k] !== undefined) body[k] = payload[k];
  });

  const res = await API.put(`/cleaning-staff/${id}`, body);
  return unwrap(res);
};

/** PATCH /cleaning-staff/:id/status — deactivation also revokes active passes. */
export const updateCleaningStaffStatus = async (id, status) => {
  const res = await API.patch(`/cleaning-staff/${id}/status`, { status });
  return unwrap(res);
};

/* ── Passes ────────────────────────────────────────────────────────────── */

export const getPasses = async (staffId, { status } = {}) => {
  const params = {};
  if (status) params.status = status;
  const res = await API.get(`/cleaning-staff/${staffId}/passes`, { params });
  return toList(unwrap(res));
};

/**
 * POST /cleaning-staff/:id/passes
 * `valid_date` is required; `valid_until` optional.
 */
export const createPass = async (staffId, { valid_date, valid_until } = {}) => {
  const body = { valid_date };
  if (valid_until) body.valid_until = valid_until;
  const res = await API.post(`/cleaning-staff/${staffId}/passes`, body);
  return unwrap(res);
};

/** PATCH /cleaning-staff/passes/:passId/revoke — a revoke, never a delete. */
export const revokePass = async (passId, reason) => {
  const body = {};
  if (reason && String(reason).trim()) body.reason = String(reason).trim();
  const res = await API.patch(`/cleaning-staff/passes/${passId}/revoke`, body);
  return unwrap(res);
};

/* ── Attendance ────────────────────────────────────────────────────────── */

/**
 * GET /cleaning-staff/attendance — every staff member for a day / range.
 */
export const getAllAttendance = async ({ date, from, to } = {}) => {
  const params = {};
  if (date) params.date = date;
  else {
    if (from) params.from = from;
    if (to) params.to = to;
  }
  const res = await API.get("/cleaning-staff/attendance", { params });
  return toList(unwrap(res));
};

/** GET /cleaning-staff/:id/attendance — one staff member's history. */
export const getAttendance = async (staffId, { from, to } = {}) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await API.get(`/cleaning-staff/${staffId}/attendance`, { params });
  return toList(unwrap(res));
};

/**
 * PATCH /cleaning-staff/attendance/:attendanceId
 */
export const updateAttendance = async (attendanceId, { check_in, check_out, notes } = {}) => {
  const body = { notes };
  if (check_in !== undefined) body.check_in = check_in || null;
  if (check_out !== undefined) body.check_out = check_out || null;
  const res = await API.patch(`/cleaning-staff/attendance/${attendanceId}`, body);
  return unwrap(res);
};

const cleaningStaffService = {
  getCleaningStaff,
  getCleaningStaffById,
  createCleaningStaff,
  updateCleaningStaff,
  updateCleaningStaffStatus,
  getPasses,
  createPass,
  revokePass,
  getAllAttendance,
  getAttendance,
  updateAttendance,
};

export default cleaningStaffService;