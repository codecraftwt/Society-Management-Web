import { useState } from "react";
import { toast } from "react-toastify";
import {
  MdEditCalendar,
  MdHistory,
  MdInfoOutline,
  MdPerson,
  MdAccessTime,
  MdLogin,
  MdLogout,
  MdPhone,
  MdDone,
} from "react-icons/md";

import { useLang } from "../../../context/LanguageContext";
import { getErrorMessage } from "../../../utils/validators";
import GlobalTable from "../../../components/common/GlobalTable";
import GlobalBadge from "../../../components/common/GlobalBadge";
import GlobalButton from "../../../components/common/GlobalButton";
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
  formatPhone,
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
  onResetFilter,
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

  const resolveStaffPhone = (row) => {
    return row.cleaningStaff?.phone || row.cleaning_staff?.phone || null;
  };

  const columns = [
    ...(showStaffColumn
      ? [
          {
            key: "staff",
            header: t("csStaff", "Staff"),
            render: (row) => {
              const name = resolveStaffName(row);
              const phone = resolveStaffPhone(row);
              return (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(59, 130, 246, 0.12)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs text-primary truncate">
                      {name}
                    </span>
                    {phone && (
                      <span className="text-[10px] text-secondary font-mono">
                        {formatPhone(phone)}
                      </span>
                    )}
                  </div>
                </div>
              );
            },
          },
        ]
      : []),
    {
      key: "attendance_date",
      header: t("csDate", "Date"),
      render: (row) => (
        <span className="font-semibold text-xs text-primary px-2 py-1 rounded-md bg-card-inner-bg border border-glass-border inline-block whitespace-nowrap">
          {formatDateOnly(row.attendance_date)}
        </span>
      ),
    },
    {
      key: "check_in",
      header: t("csCheckIn", "IN"),
      render: (row) =>
        row.check_in ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">
            <MdLogin size={12} />
            {formatTimeIST(row.check_in)}
          </span>
        ) : (
          <span className="text-secondary text-xs">—</span>
        ),
    },
    {
      key: "check_out",
      header: t("csCheckOut", "OUT"),
      render: (row) =>
        row.check_out ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-300 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">
            <MdLogout size={12} />
            {formatTimeIST(row.check_out)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md whitespace-nowrap animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {t("csOnDuty", "On Duty")}
          </span>
        ),
    },
    {
      key: "worked_minutes",
      header: t("csWorkedHours", "Worked"),
      render: (row) => (
        <span className="font-bold text-xs text-primary font-mono whitespace-nowrap">
          {formatWorkedMinutes(row.worked_minutes)}
        </span>
      ),
    },
    {
      key: "state",
      header: t("csStatus", "Status"),
      render: (row) => {
        const cfg = STATE_BADGE[deriveAttendanceState(row)];
        return (
          <GlobalBadge variant={cfg.variant} size="sm" dot>
            {t(cfg.labelKey, cfg.fallback)}
          </GlobalBadge>
        );
      },
    },
    {
      key: "manual",
      header: t("csManual", "Manual"),
      render: (row) =>
        row.is_manual ? (
          <div className="flex flex-col gap-0.5">
            <GlobalBadge variant="info" size="sm">
              {t("csCorrected", "Corrected")}
            </GlobalBadge>
            {row.notes && (
              <span
                className="text-[10px] text-secondary max-w-[150px] truncate"
                title={row.notes}
              >
                {row.notes}
              </span>
            )}
          </div>
        ) : (
          <span className="text-secondary text-xs">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <GlobalButton
          variant="secondary"
          size="xs"
          icon={MdEditCalendar}
          onClick={() => openCorrection(row)}
          title={t("csCorrect", "Correct attendance")}
        >
          {t("csEdit", "Edit")}
        </GlobalButton>
      ),
    },
  ];

  return (
    <div>
      {/* Attendance Header info banner */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MdHistory size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-primary m-0">
              {t("csAttendance", "Attendance Records")}
            </h4>
            <p className="text-xs text-secondary m-0">
              {t("csAttendanceHint", "Times are shown in IST (Asia/Kolkata).")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-card-inner-bg border border-glass-border text-secondary">
            <MdAccessTime size={13} className="text-accent" />
            IST (UTC+05:30)
          </span>
        </div>
      </div>

      <GlobalTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey="id"
        compact
        emptyIcon={MdHistory}
        emptyMessage={emptyMessage || t("csNoAttendance", "No attendance for this period")}
        emptySubtext={t(
          "csNoAttendanceSub",
          "Attendance rows appear here after a guard scans the staff pass at the gate."
        )}
        emptyAction={
          onResetFilter ? (
            <GlobalButton
              variant="secondary"
              size="sm"
              icon={MdAccessTime}
              onClick={onResetFilter}
            >
              {t("csViewToday", "View Today's Attendance")}
            </GlobalButton>
          ) : null
        }
      />

      {/* ── Manual correction modal ──────────────────────────────────────────── */}
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
        submitIcon={MdDone}
        submitVariant="primary"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs text-primary flex items-start gap-2.5">
            <MdInfoOutline size={17} className="text-accent shrink-0 mt-0.5" />
            <span className="leading-relaxed text-secondary">
              {t(
                "csCorrectionNote",
                "Saving marks this record as manually corrected and records who changed it. Worked hours are recalculated automatically."
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">
                {t("csCheckIn", "Check IN")}
              </label>
              <input
                className="input w-full"
                style={{ height: 40, borderRadius: 10, padding: "0 12px", fontSize: 13 }}
                type="datetime-local"
                value={form.check_in}
                onChange={(e) => setForm((p) => ({ ...p, check_in: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">
                {t("csCheckOut", "Check OUT")}
              </label>
              <input
                className="input w-full"
                style={{ height: 40, borderRadius: 10, padding: "0 12px", fontSize: 13 }}
                type="datetime-local"
                value={form.check_out}
                onChange={(e) => setForm((p) => ({ ...p, check_out: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary">
              {t("csCorrectionReason", "Correction note")} <span className="text-red-400">*</span>
            </label>
            <textarea
              className="input w-full"
              style={{ borderRadius: 10, padding: "10px 12px", fontSize: 13 }}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder={t("csCorrectionReasonPlaceholder", "Why is this being corrected?")}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
              <span>{error}</span>
            </div>
          )}
        </div>
      </GlobalModal>
    </div>
  );
}