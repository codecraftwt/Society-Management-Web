/* ──────────────────────────────────────────────────────────────────────────
 * Cleaning Staff — shared constants
 *
 * These mirror the backend enums in
 * API/utils/cleaningStaffUtils.js one-for-one.
 *
 * NOTE: max_scans_per_day is deliberately NOT editable anywhere in the UI.
 * The backend pins it at 2; it is surfaced as read-only information.
 * ────────────────────────────────────────────────────────────────────────── */

/* Mirrors STAFF_STATUSES */
export const STAFF_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

export const STAFF_STATUS_LIST = [STAFF_STATUS.ACTIVE, STAFF_STATUS.INACTIVE];

/* Mirrors PASS_STATUSES */
export const PASS_STATUS = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
};

export const PASS_STATUS_LIST = [PASS_STATUS.ACTIVE, PASS_STATUS.EXPIRED, PASS_STATUS.REVOKED];

/* Read-only business rule from the backend. Never sent, never editable. */
export const MAX_SCANS_PER_DAY = 2;

/* Pass codes are generated server-side as GP-XXXXXX. The UI displays the
   exact string it receives and never builds or reformats one. */
export const PASS_CODE_PREFIX = "GP-";

export const STAFF_STATUS_LABEL = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const PASS_STATUS_LABEL = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

export default {
  STAFF_STATUS,
  STAFF_STATUS_LIST,
  PASS_STATUS,
  PASS_STATUS_LIST,
  MAX_SCANS_PER_DAY,
  PASS_CODE_PREFIX,
  STAFF_STATUS_LABEL,
  PASS_STATUS_LABEL,
};