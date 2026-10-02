/* ──────────────────────────────────────────────────────────────────────────
 * Cleaning Staff — display formatters
 *
 * Deliberately pure and dependency-free so the whole set is unit-testable in
 * the project's node-environment Vitest setup.
 *
 * ── IST CORRECTNESS (important) ────────────────────────────────────────────
 * The backend stores attendance check_in/check_out as absolute DateTime and
 * the attendance_date as an IST calendar day already computed server-side
 * (getCurrentISTDate). So:
 *
 *   • attendance_date is a bare "YYYY-MM-DD" string and must be rendered
 *     AS-IS. Passing it through `new Date(...)` would reinterpret it in the
 *     browser's local zone and can shift the day by one for users west of IST.
 *   • check_in/check_out are real instants and are safe to format with
 *     toLocaleString once the timeZone is pinned to Asia/Kolkata.
 *
 * We therefore never call new Date() on a date-only string.
 * ────────────────────────────────────────────────────────────────────────── */

import { MAX_SCANS_PER_DAY } from "./constants";

export const IST_TIMEZONE = "Asia/Kolkata";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isDateOnlyString = (value) =>
  typeof value === "string" && DATE_ONLY_RE.test(value.trim());

/** Parse "YYYY-MM-DD" into a local Date at midnight — for label splitting only. */
const splitDateOnly = (value) => {
  const [y, m, d] = value.trim().split("-").map(Number);
  return { year: y, month: m, day: d, weekday: new Date(y, m - 1, d).getDay() };
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format a date-only string ("2026-10-02") as "02 Oct 2026".
 * Returns "—" for empty input. Never reinterprets the day.
 */
export function formatDateOnly(value) {
  if (!isDateOnlyString(value)) return "—";
  const { year, month, day } = splitDateOnly(value);
  return `${String(day).padStart(2, "0")} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** Format a date-only string as "Sat, 02 Oct 2026". */
export function formatDateOnlyLong(value) {
  if (!isDateOnlyString(value)) return "—";
  const { year, month, day, weekday } = splitDateOnly(value);
  return `${WEEKDAYS_SHORT[weekday]}, ${String(day).padStart(2, "0")} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/**
 * Format an absolute timestamp in IST, e.g. "02 Oct 2026, 09:15".
 * Falls back to "—" for empty/unparseable values.
 */
export function formatDateTimeIST(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Time-only in IST, e.g. "09:15". */
export function formatTimeIST(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Format a duration in minutes as "7h 30m".
 * Mirrors the backend's calculateWorkedMinutes, which returns whole minutes
 * (null while a shift is still open).
 */
export function formatWorkedMinutes(minutes) {
  if (minutes === null || minutes === undefined || minutes === "") return "—";
  const total = Number(minutes);
  if (!Number.isFinite(total) || total < 0) return "—";
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Today's date as "YYYY-MM-DD" in IST.
 *
 * Used to prefill date inputs (joining date, pass valid_from). The backend
 * buckets everything by the IST day, so the browser's local calendar day must
 * NOT be used — a user in UTC-5 opening the app at 20:00 local is already on
 * the next IST day.
 */
export function todayIST(now = new Date()) {
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the ISO shape we need.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: IST_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    // environments without full ICU fall back to the local calendar day
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

/** Add whole days to a "YYYY-MM-DD" string, returning another such string. */
export function addDaysIST(dateOnly, days) {
  if (!isDateOnlyString(dateOnly)) return dateOnly;
  const [y, m, d] = dateOnly.trim().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}

/** true when `dateOnly` is a valid calendar date (rejects 2026-02-31). */
export function isRealDateOnly(dateOnly) {
  if (!isDateOnlyString(dateOnly)) return false;
  const [y, m, d] = dateOnly.trim().split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Derive the attendance state shown in the UI. Kept separate from the backend
 * so the table can render without re-deriving it in every row.
 *
 * MANUAL     — corrected by an admin; needs the most attention.
 * INCOMPLETE — checked in, never checked out (still on site / forgot to scan).
 * PRESENT    — checked in and out.
 * ABSENT     — no row at all for that staff on that day.
 */
export const ATTENDANCE_STATE = {
  MANUAL: "MANUAL",
  INCOMPLETE: "INCOMPLETE",
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
};

export function deriveAttendanceState(row) {
  if (!row) return ATTENDANCE_STATE.ABSENT;
  if (row.is_manual) return ATTENDANCE_STATE.MANUAL;
  if (row.check_in && !row.check_out) return ATTENDANCE_STATE.INCOMPLETE;
  if (row.check_in && row.check_out) return ATTENDANCE_STATE.PRESENT;
  return ATTENDANCE_STATE.INCOMPLETE;
}

/**
 * Render a pass validity window.
 * A null valid_until is a single-day pass (the backend's passRange treats it
 * as that day only), so we label it explicitly rather than rendering an open
 * range that would wrongly suggest "unlimited".
 */
export function formatPassValidity(pass) {
  if (!pass) return "—";
  const from = formatDateOnly(pass.valid_date);
  const until = pass.valid_until ? formatDateOnly(pass.valid_until) : null;
  if (!until) return `${from} (single day)`;
  if (until === from) return `${from} (single day)`;
  return `${from} → ${until}`;
}

/**
 * Describe an assignment's target area.
 * The backend stores block_id/flat_id and returns raw ids without includes, so
 * the caller resolves names via the block/flat lookup maps it already loaded.
 */
export function describeAssignmentTarget(assignment, { blocksById = {}, flatsById = {} } = {}) {
  if (!assignment) return "—";
  if (assignment.flat_id) {
    const flat = flatsById[assignment.flat_id];
    const flatLabel = flat ? `${flat.flat_number}` : `Flat #${assignment.flat_id}`;
    const block = flat?.block_id ? blocksById[flat.block_id] : null;
    return block ? `${block.name} — ${flatLabel}` : flatLabel;
  }
  if (assignment.block_id) {
    const block = blocksById[assignment.block_id];
    return block ? block.name : `Block #${assignment.block_id}`;
  }
  return "—";
}

/** Scans used / remaining for the fixed daily allowance. */
export function scanAllowance(row) {
  const used = Number(row?.scan_count || 0);
  const remaining = Math.max(0, MAX_SCANS_PER_DAY - used);
  return { used, remaining, max: MAX_SCANS_PER_DAY };
}

/**
 * A pass code is shown exactly as the server returned it.
 * This only trims surrounding whitespace and maps empty to the em dash
 * placeholder — it never re-adds, strips or reformats the GP- prefix.
 */
export function formatPassCode(code) {
  if (typeof code !== "string") return "—";
  const trimmed = code.trim();
  return trimmed ? trimmed : "—";
}

/** Mask a phone number for display, keeping it recognisable. */
export function formatPhone(phone) {
  if (!phone) return "—";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length !== 10) return String(phone);
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
}

/**
 * Counts for the KPI cards.
 *
 * "On pass / present today" counts distinct staff that either hold an ACTIVE
 * pass covering today, or have an open (checked-in, not checked-out) attendance
 * row for today. Both are derived from data already loaded for the current
 * view so the cards stay consistent with the table below them.
 */
export function buildKpiSummary({ staff = [], today = todayIST() }) {
  const total = staff.length;
  const active = staff.filter((s) => s.status === "ACTIVE").length;
  const inactive = total - active;

  const onPass = staff.filter((s) => {
    const p = s.active_pass;
    if (!p || p.status !== "ACTIVE") return false;
    if (p.valid_date > today) return false;
    if (p.valid_until && p.valid_until < today) return false;
    return true;
  }).length;

  return { total, active, inactive, onPass };
}

/** Split an array into pages (the backend returns the full staff list). */
export function paginate(rows, page = 1, pageSize = 10) {
  const list = Array.isArray(rows) ? rows : [];
  const size = Math.max(1, Number(pageSize) || 10);
  const current = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const safePage = Math.min(current, totalPages);
  const start = (safePage - 1) * size;
  return {
    rows: list.slice(start, start + size),
    page: safePage,
    totalPages,
    totalItems: list.length,
  };
}

/* ── Manual attendance correction ─────────────────────────────────────────
 * `check_in` / `check_out` are absolute instants, but an admin correcting them
 * types wall-clock time. The backend buckets attendance by the IST calendar
 * day, so the field must be interpreted as IST wall-clock — otherwise a
 * correction made at 09:00 IST could land on the previous UTC day and silently
 * shift the record.
 *
 * These two helpers convert between an <input type="datetime-local"> value
 * (which is always naive local wall-clock, with no zone) and an absolute
 * instant, pinning the wall-clock to +05:30.
 * ────────────────────────────────────────────────────────────────────────── */

export const IST_OFFSET_MINUTES = 330; // +05:30, no DST in India
const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** Absolute instant -> "YYYY-MM-DDTHH:mm" expressed in IST wall-clock. */
export function istToDateTimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  /* Intl renders midnight as "24" in some engines; normalise to "00". */
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * "YYYY-MM-DDTHH:mm" (IST wall-clock) -> absolute instant string.
 * Returns "" for empty/invalid input so callers can send null to clear a value.
 */
export function dateTimeLocalToIst(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!DATETIME_LOCAL_RE.test(raw)) return "";
  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  const ms = Date.parse(`${withSeconds}+05:30`);
  if (Number.isNaN(ms)) return "";
  return new Date(ms).toISOString();
}

export default {
  IST_TIMEZONE,
  isDateOnlyString,
  formatDateOnly,
  formatDateOnlyLong,
  formatDateTimeIST,
  formatTimeIST,
  formatWorkedMinutes,
  todayIST,
  addDaysIST,
  isRealDateOnly,
  istToDateTimeLocal,
  dateTimeLocalToIst,
  ATTENDANCE_STATE,
  deriveAttendanceState,
  formatPassValidity,
  describeAssignmentTarget,
  scanAllowance,
  formatPassCode,
  formatPhone,
  buildKpiSummary,
  paginate,
};