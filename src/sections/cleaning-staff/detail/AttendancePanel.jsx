import { useState } from "react";
import { toast } from "react-toastify";
import { MdEditCalendar, MdHistory, MdInfoOutline, MdPerson } from "react-icons/md";

import { useLang } from "../../../context/LanguageContext";
import { getErrorMessage } from "../../../utils/validators";
import GlobalTable from "../../../components/common/GlobalTable";
import GlobalBadge from "../../../components/common/GlobalBadge";
import GlobalModal from "../../../components/common/GlobalModal";
import { updateAttendance } from "../cleaningStaffService";
import {
  ATTENDANCE_STATE,
  deriveAttendanceState,
  formatDateOnly,
  formatTimeIST,
  formatWorkedMinutes,
  istToDateTimeLocal,
  dateTimeLocalToIst,
} from "../format";

const STATE_BADGE = {
  [ATTENDANCE_STATE.PRESENT]: { variant: "success", labelKey: "csPresent", fallback: "Present" },
  [ATTENDANCE_STATE.INCOMPLETE]: { variant: "warning", labelKey: "csIncomplete", fallback: "Incomplete" },
  [ATTENDANCE_STATE.MANUAL]: { variant: "info", labelKey: "csManual", fallback: "Manual" },
  [ATTENDANCE_STATE.ABSENT]: { variant: "neutral", labelKey: "csAbsent", fallback: "Absent" },
};

/**
 * AttendancePanel
 *
 * Read-only by default, with an explicit "correct" action per row.
 *
 * A correction calls PATCH /cleaning-staff/attendance/:id with {check_in?,
 * check_out?, notes}. Notes are mandatory server-side (400 NOTES_REQUIRED) and
 * are what flags the row as manual, so the field is required here too.
 * Records are never deleted; the backend recomputes worked_minutes itself.
 *
 * Works for both scopes:
 *  • one staff member  -> GET /:id/attendance  (staff prop set)
 *  • every staff member-> GET /attendance       (no staff prop, showStaffColumn)
 */
export default function AttendancePanel({
  rows,
  loading,
  showStaffColumn = false,
  staffNameResolver,
  emptyMessage,
  onUpdated,
}) {
  const { t } = useLang();

  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ check_in: "", check_out: "", notes: "" });
  const [error, setError] = useState(null);

  const openCorrection = (row) => {
    setTarget(row);
    setForm({
      check_in: istToDateTimeLocal(row.check_in),
      check_out: istToDateTimeLocal(row.check_out),
      notes: "",
    });
    setError(null);
  };

  const submitCorrection = async () => {
    if (!String(form.notes || "").trim()) {
      setError(t("csNoteRequired", "A note is required when correcting attendance."));
      return;
    }

    const checkIn = form.check_in ? dateTimeLocalToIst(form.check_in) : "";
    const checkOut = form.check_out ? dateTimeLocalToIst(form.check_out) : "";

    if (form.check_in && !checkIn) {
      setError(t("csBadInTime", "Enter a valid check-in time."));
      return;
    }
    if (form.check_out && !checkOut) {
      setError(t("csBadOutTime", "Enter a valid check-out time."));
      return;
    }
    if (checkIn && checkOut && new Date(checkOut) < new Date(checkIn)) {
      setError(t("csOutBeforeIn", "Check out must be after check in."));
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await updateAttendance(target.id, {
        check_in: form.check_in ? checkIn : null,
        check_out: form.check_out ? checkOut : null,
        notes: String(form.notes).trim(),
      });
      toast.success(t("csAttendanceFixed", "Attendance corrected."));
      setTarget(null);
      onUpdated?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          getErrorMessage(err, t("csAttendanceFixFail", "Could not correct attendance."))
      );
    } finally {
      setSaving(false);
    }
  };

  const resolveStaffName = (row) => {
    if (staffNameResolver) return staffNameResolver(row);
    return row.cleaningStaff?.name || row.cleaning_staff?.name || "—";
  };

  const columns = [
    ...(showStaffColumn
      ? [
          {
            key: "staff",
            header: t("csStaff", "Staff"),
            render: (row) => (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                <MdPerson size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                {resolveStaffName(row)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "attendance_date",
      header: t("csDate", "Date"),
      render: (row) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {formatDateOnly(row.attendance_date)}
        </span>
      ),
    },
    {
      key: "check_in",
      header: t("csCheckIn", "IN"),
      render: (row) => (
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {row.check_in ? formatTimeIST(row.check_in) : "—"}
        </span>
      ),
    },
    {
      key: "check_out",
      header: t("csCheckOut", "OUT"),
      render: (row) => (
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {row.check_out ? formatTimeIST(row.check_out) : "—"}
        </span>
      ),
    },
    {
      key: "worked_minutes",
      header: t("csWorkedHours", "Worked"),
      render: (row) => (
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          {formatWorkedMinutes(row.worked_minutes)}
        </span>
      ),
    },
    {
      key: "state",
      header: t("csStatus", "Status"),
      render: (row) => {
        const cfg = STATE_BADGE[deriveAttendanceState(row)];
        return <GlobalBadge variant={cfg.variant} size="sm" dot>{t(cfg.labelKey, cfg.fallback)}</GlobalBadge>;
      },
    },
    {
      key: "manual",
      header: t("csManual", "Manual"),
      render: (row) =>
        row.is_manual ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <GlobalBadge variant="info" size="sm">
              {t("csCorrected", "Corrected")}
            </GlobalBadge>
            {row.notes && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary, var(--text-secondary))",
                  maxWidth: 170,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={row.notes}
              >
                {row.notes}
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: "var(--text-tertiary, var(--text-secondary))", fontSize: 12 }}>—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          className="cs-passcode__copy"
          onClick={() => openCorrection(row)}
          aria-label={t("csCorrect", "Correct attendance")}
          title={t("csCorrect", "Correct attendance")}
          style={{ padding: 6 }}
        >
          <MdEditCalendar size={15} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <h4 className="cs-section-title" style={{ margin: 0 }}>
          <MdHistory size={14} />
          {t("csAttendance", "Attendance")}
        </h4>
        <p className="cs-hint" style={{ marginTop: 4 }}>
          {t("csAttendanceHint", "Times are shown in IST (Asia/Kolkata).")}
        </p>
      </div>

      <GlobalTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey="id"
        compact
        emptyIcon={MdHistory}
        emptyMessage={emptyMessage || t("csNoAttendance", "No attendance recorded yet")}
        emptySubtext={t(
          "csNoAttendanceSub",
          "Attendance rows appear here after a guard scans the staff pass at the gate."
        )}
      />

      {/* ── Manual correction ──────────────────────────────────────────── */}
      <GlobalModal
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        title={t("csCorrectTitle", "Correct attendance")}
        subtitle={
          target
            ? `${resolveStaffName(target)} · ${formatDateOnly(target.attendance_date)}`
            : ""
        }
        icon={MdEditCalendar}
        size="sm"
        showFooter
        submitLabel={t("csSaveCorrection", "Save correction")}
        cancelLabel={t("cancel", "Cancel")}
        onSubmit={submitCorrection}
        submitLoading={saving}
        submitDisabled={saving}
        submitIcon={MdEditCalendar}
        submitVariant="primary"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="cs-notice">
            <MdInfoOutline size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {t(
                "csCorrectionNote",
                "Saving marks this record as manually corrected and records who changed it. Worked hours are recalculated automatically."
              )}
            </span>
          </div>

          <div className="cs-grid-2">
            <div className="cs-field">
              <label className="sa-label" style={{ fontSize: 10.5 }}>
                {t("csCheckIn", "IN")}
              </label>
              <input
                className="input"
                type="datetime-local"
                value={form.check_in}
                onChange={(e) => setForm((p) => ({ ...p, check_in: e.target.value }))}
              />
            </div>
            <div className="cs-field">
              <label className="sa-label" style={{ fontSize: 10.5 }}>
                {t("csCheckOut", "OUT")}
              </label>
              <input
                className="input"
                type="datetime-local"
                value={form.check_out}
                onChange={(e) => setForm((p) => ({ ...p, check_out: e.target.value }))}
              />
            </div>
          </div>

          <div className="cs-field">
            <label className="sa-label" style={{ fontSize: 10.5 }}>
              {t("csCorrectionReason", "Correction note")} *
            </label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder={t("csCorrectionReasonPlaceholder", "Why is this being corrected?")}
            />
          </div>

          {error && <p className="cs-error">{error}</p>}
        </div>
      </GlobalModal>
    </div>
  );
}