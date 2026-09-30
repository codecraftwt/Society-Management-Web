/**
 * Guard shift date helpers.
 *
 * Shift assignments are date-only ranges (Sequelize DATEONLY), so every
 * comparison here is a plain string comparison against "today" - no Date
 * arithmetic and therefore no timezone drift.
 *
 * "Today" is resolved in Asia/Kolkata, mirroring the API's
 * utils/istTime.getCurrentISTDate() - the same clock the server uses in
 * getMyShift to decide which assignment a guard is on duty for. Resolving it
 * with the browser timezone (or new Date().toISOString(), which is UTC) would
 * make this table disagree with the guard's own dashboard around midnight, so
 * the app's existing timezone handling is reused instead of a local one.
 *
 * Status is derived from the assignment dates only. The shift *type*
 * (MORNING / AFTERNOON / NIGHT) says nothing about whether an assignment is
 * still in the future, so it is never used to decide that.
 */

export const APP_TIMEZONE = "Asia/Kolkata";

export const SHIFT_TODAY = "TODAY";
export const SHIFT_UPCOMING = "UPCOMING";
export const SHIFT_COMPLETED = "COMPLETED";

/** Today in the app timezone as "YYYY-MM-DD". */
export const getTodayISO = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });

/**
 * Normalise a DATEONLY field to "YYYY-MM-DD".
 * The column is date-only, but a driver may hand back a full ISO timestamp,
 * and a value stored before the column was date-only may be a Date object.
 */
export const toISODate = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
};

/** A shift covers a day when start_date <= day <= end_date (both inclusive). */
export const shiftCoversDay = (shift, isoDay) => {
  const start = toISODate(shift?.start_date);
  const end = toISODate(shift?.end_date);
  if (!start || !end || !isoDay) return false;
  return start <= isoDay && end >= isoDay;
};

/** COMPLETED once the assignment has ended, UPCOMING before it starts. */
export const shiftStatus = (shift, isoDay) => {
  const start = toISODate(shift?.start_date);
  const end = toISODate(shift?.end_date);
  if (!start || !end || !isoDay) return null;
  if (end < isoDay) return SHIFT_COMPLETED;
  if (start > isoDay) return SHIFT_UPCOMING;
  return SHIFT_TODAY;
};

/** A completed assignment is read-only - it can be seen, never edited. */
export const isShiftEditable = (shift, isoDay) =>
  shiftStatus(shift, isoDay) !== SHIFT_COMPLETED;

/** The single assignment covering today, or null. */
export const shiftForToday = (shifts, isoDay) =>
  (Array.isArray(shifts) ? shifts : []).find((s) => shiftCoversDay(s, isoDay)) || null;

/**
 * Order for the "All Shifts" list: running first, then the soonest upcoming
 * ones, then history newest-first. Overlapping assignments are prevented by
 * the API, so at most one shift can be "today".
 */
export const sortShiftsForDisplay = (shifts, isoDay) => {
  const rank = { [SHIFT_TODAY]: 0, [SHIFT_UPCOMING]: 1, [SHIFT_COMPLETED]: 2 };
  return [...(Array.isArray(shifts) ? shifts : [])].sort((a, b) => {
    const ra = rank[shiftStatus(a, isoDay)] ?? 3;
    const rb = rank[shiftStatus(b, isoDay)] ?? 3;
    if (ra !== rb) return ra - rb;
    /* Both bounds move in the same direction: ascending towards the future for
       upcoming shifts, descending back through history for completed ones. */
    const direction = ra === rank[SHIFT_COMPLETED] ? -1 : 1;
    const byStart = toISODate(a?.start_date).localeCompare(toISODate(b?.start_date));
    if (byStart !== 0) return byStart * direction;
    return toISODate(a?.end_date).localeCompare(toISODate(b?.end_date)) * direction;
  });
};

/* ── Display ─────────────────────────────────────────────────────────────── */

/* Fixed 3-letter month names. toLocaleDateString is not used here: ICU renders
   September as "Sept" on some platforms and "Sep" on others, which would make
   the table's width and the test expectations depend on the browser build. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Parse a date-only string into a local calendar day.
 * `new Date("2026-09-30")` is parsed as a UTC instant, so formatting it in a
 * negative-offset timezone prints the previous day. Building the date from its
 * parts keeps the printed day equal to the stored day everywhere.
 */
const parseISODate = (iso) => {
  const [y, m, d] = toISODate(iso).split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

export const formatShiftDate = (iso, { year = false } = {}) => {
  const day = parseISODate(iso);
  if (!day) return "—";
  const month = MONTHS[day.getMonth()];
  return year
    ? `${String(day.getDate()).padStart(2, "0")} ${month} ${day.getFullYear()}`
    : `${String(day.getDate()).padStart(2, "0")} ${month}`;
};

/** "29 Sep → 30 Sep" in the table, "29 Sep 2026 → 30 Sep 2026" in the modal. */
export const formatShiftRange = (shift, { year = false } = {}) => {
  const start = formatShiftDate(shift?.start_date, { year });
  const end = formatShiftDate(shift?.end_date, { year });
  if (start === "—" || end === "—") return "—";
  return `${start} → ${end}`;
};
