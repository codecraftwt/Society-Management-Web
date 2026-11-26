import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MdGavel, MdSchedule, MdWarningAmber, MdCheckCircle } from "react-icons/md";
import { useLang } from "../../context/LanguageContext";
import maintenanceService from "../../services/maintenanceService";
import Select from "../common/Select";
import HoloToggle from "../common/HoloToggle";
import GlobalModal from "../common/GlobalModal";

const FEE_TYPES = [
  { value: "FIXED_ONE_TIME", labelKey: "mntLateFeeFixedOneTime", fallback: "Fixed Penalty" },
  { value: "FIXED_PER_MONTH", labelKey: "mntLateFeeFixedMonthly", fallback: "Monthly Fixed Amount" },
  { value: "PERCENT_PER_MONTH", labelKey: "mntLateFeePercentMonthly", fallback: "Monthly Fixed %" },
];

const formatINR = (n) =>
  Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function computeLiveLateFeePreview({ enabled, feeType, feeAmount, maxFeeAmount, sampleBase = 25000, overdueMonths = 1 }) {
  if (!enabled || Number(feeAmount) <= 0) {
    return { base: sampleBase, penalty: 0, total: sampleBase };
  }
  const val = Number(feeAmount) || 0;
  let penalty = 0;
  if (feeType === "FIXED_ONE_TIME") {
    penalty = val;
  } else if (feeType === "PERCENT_PER_MONTH") {
    const compounded = sampleBase * Math.pow(1 + val / 100, overdueMonths);
    penalty = Math.max(0, Math.round((compounded - sampleBase) * 100) / 100);
  } else {
    penalty = Math.round(val * overdueMonths * 100) / 100;
  }

  if (maxFeeAmount !== "" && maxFeeAmount !== null && maxFeeAmount !== undefined && Number(maxFeeAmount) >= 0) {
    penalty = Math.min(penalty, Number(maxFeeAmount));
  }
  return { base: sampleBase, penalty, total: Math.round((sampleBase + penalty) * 100) / 100 };
}

export function LateFeeConfigCard({ societyId, canEdit = false }) {
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [feeType, setFeeType] = useState("FIXED_PER_MONTH");
  const [feeAmount, setFeeAmount] = useState("1000");
  const [graceDays, setGraceDays] = useState("0");
  const [maxFeeAmount, setMaxFeeAmount] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const cfg = await maintenanceService.getLateFeeConfig();
        if (!active || !cfg) return;
        setEnabled(Boolean(cfg.is_enabled));
        setFeeType(cfg.fee_type || "FIXED_PER_MONTH");
        setFeeAmount(String(cfg.fee_amount ?? 0));
        setGraceDays(String(cfg.grace_days ?? 0));
        setMaxFeeAmount(cfg.max_fee_amount != null ? String(cfg.max_fee_amount) : "");
      } catch {
        // Non-blocking fallback to defaults
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [societyId]);

  const handleSave = async () => {
    const val = Number(feeAmount);
    const grace = parseInt(graceDays || "0", 10);
    if (!Number.isFinite(val) || val < 0) {
      toast.error(t("mntLateFeeInvalidAmount", "Late fee amount must be 0 or greater."));
      return;
    }
    if (feeType === "PERCENT_PER_MONTH" && val > 100) {
      toast.error(t("mntLateFeeMaxPercent", "Percentage late fee cannot exceed 100%."));
      return;
    }
    if (!Number.isInteger(grace) || grace < 0 || grace > 365) {
      toast.error(t("mntLateFeeInvalidGrace", "Grace period must be between 0 and 365 days."));
      return;
    }

    setSaving(true);
    try {
      await maintenanceService.saveLateFeeConfig({
        is_enabled: enabled,
        fee_type: feeType,
        fee_amount: val,
        grace_days: grace,
        max_fee_amount: maxFeeAmount === "" ? null : Number(maxFeeAmount),
      });
      toast.success(t("mntLateFeeSaved", "Late payment charges configuration saved."));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("mntLateFeeSaveFailed", "Failed to save late fee settings."));
    } finally {
      setSaving(false);
    }
  };

  const preview = computeLiveLateFeePreview({
    enabled,
    feeType,
    feeAmount: feeAmount || 0,
    maxFeeAmount,
  });

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <MdSchedule size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>
              {t("mntLateFeeTitle", "Late Payment Charges")}
            </h3>
            <p className="text-xs text-secondary">
              {t("mntLateFeeSubtitle", "Default penalty policy applied when generating maintenance bills.")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-secondary">
            {enabled ? t("mntEnabled", "Enabled") : t("mntDisabled", "Disabled")}
          </span>
          <HoloToggle checked={enabled} onChange={() => canEdit && setEnabled((v) => !v)} disabled={!canEdit || loading} />
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-secondary">{t("mntLoading", "Loading...")}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
                {t("mntLateFeeType", "Late Fee Type")}
              </label>
              <Select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value)}
                disabled={!canEdit || !enabled}
                className="w-full"
              >
                {FEE_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {t(ft.labelKey, ft.fallback)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
                {feeType === "PERCENT_PER_MONTH"
                  ? t("mntLateFeePercentLabel", "Penalty (%)")
                  : t("mntLateFeeAmountLabel", "Late Fee Amount (₹)")}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                disabled={!canEdit || !enabled}
                className="mc-field w-full px-3 py-2 rounded-[10px] border bg-transparent text-sm"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
                {t("mntGraceDaysLabel", "Grace Period (Days)")}
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                disabled={!canEdit || !enabled}
                className="mc-field w-full px-3 py-2 rounded-[10px] border bg-transparent text-sm"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
                {t("mntMaxLateFeeLabel", "Max Late Fee Cap (Optional)")}
              </label>
              <input
                type="number"
                min="0"
                placeholder={t("mntNoCap", "No cap")}
                value={maxFeeAmount}
                onChange={(e) => setMaxFeeAmount(e.target.value)}
                disabled={!canEdit || !enabled}
                className="mc-field w-full px-3 py-2 rounded-[10px] border bg-transparent text-sm"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div
            className="rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
            style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}
          >
            <span className="text-secondary">
              {t("mntLateFeeExamplePrefix", "Example (₹25,000 bill, 2 calendar months overdue):")}{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {formatINR(preview.base)} + {formatINR(preview.penalty)} = {formatINR(preview.total)}
              </strong>
            </span>

            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
              >
                <MdCheckCircle size={14} />
                {saving ? t("mntSaving", "Saving...") : t("mntSaveLateFeeConfig", "Save Late Fee Settings")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function LateFeeGenerateSection({
  enabled,
  setEnabled,
  feeType,
  setFeeType,
  feeAmount,
  setFeeAmount,
  graceDays,
  setGraceDays,
  maxFeeAmount,
  setMaxFeeAmount,
  dueDate,
  sampleBase = 25000,
  tenantSampleBase = null,
}) {
  const { t } = useLang();
  const baseVal = sampleBase > 0 ? sampleBase : 25000;
  const hasSeparateTenant = tenantSampleBase != null && Number(tenantSampleBase) > 0 && Number(tenantSampleBase) !== baseVal;
  const tenantVal = hasSeparateTenant ? Number(tenantSampleBase) : null;

  const parsedDue = dueDate ? new Date(`${dueDate}T00:00:00`) : new Date();
  const validDue = Number.isNaN(parsedDue.getTime()) ? new Date() : parsedDue;
  const grace = Math.max(0, parseInt(graceDays || "0", 10) || 0);
  const cutoff = new Date(validDue.getFullYear(), validDue.getMonth(), validDue.getDate() + grace);
  const daysInCutoffMonth = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
  const startsInCutoffMonth = cutoff.getDate() < daysInCutoffMonth;
  const cutoffLabel = cutoff.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  const monthSchedule = [1, 2, 3].map((slab) => {
    const monthOffset = startsInCutoffMonth ? slab - 1 : slab;
    const target = new Date(cutoff.getFullYear(), cutoff.getMonth() + monthOffset, 1);
    const baseMonthName = target.toLocaleString("en-US", { month: "long" });
    const nextDay = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1);
    const monthName =
      slab === 1 && startsInCutoffMonth
        ? `${baseMonthName} (from ${nextDay.getDate()} ${target.toLocaleString("en-US", { month: "short" })})`
        : baseMonthName;
    const ownerCalc = computeLiveLateFeePreview({
      enabled,
      feeType,
      feeAmount,
      maxFeeAmount,
      sampleBase: baseVal,
      overdueMonths: slab,
    });
    const tenantCalc = tenantVal != null
      ? computeLiveLateFeePreview({
          enabled,
          feeType,
          feeAmount,
          maxFeeAmount,
          sampleBase: tenantVal,
          overdueMonths: slab,
        })
      : null;
    return { monthName, ownerCalc, tenantCalc };
  });

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MdSchedule size={17} className="text-amber-400" />
          <p className="text-xs font-extrabold" style={{ color: "var(--text-primary)" }}>
            {t("mntLateFeeTitle", "Late Payment Charges")}
          </p>
        </div>
        <HoloToggle checked={enabled} onChange={() => setEnabled((v) => !v)} />
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">
                {t("mntLateFeeType", "Penalty Type")}
              </label>
              <Select value={feeType} onChange={(e) => setFeeType(e.target.value)} className="w-full text-xs">
                {FEE_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {t(ft.labelKey, ft.fallback)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">
                {feeType === "PERCENT_PER_MONTH"
                  ? t("mntLateFeePercentLabel", "Penalty Amount (%)")
                  : t("mntLateFeeAmountLabel", "Penalty Amount (₹)")}
              </label>
              <input
                type="number"
                min="0"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                className="mc-field w-full px-2.5 py-1.5 rounded-lg border bg-transparent text-xs"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">
                {t("mntGraceDaysLabel", "Grace Days")}
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                className="mc-field w-full px-2.5 py-1.5 rounded-lg border bg-transparent text-xs"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">
                {t("mntMaxLateFeeLabel", "Maximum Penalty")}
              </label>
              <input
                type="number"
                min="0"
                placeholder={t("mntNoCap", "No cap")}
                value={maxFeeAmount}
                onChange={(e) => setMaxFeeAmount(e.target.value)}
                className="mc-field w-full px-2.5 py-1.5 rounded-lg border bg-transparent text-xs"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--glass-border)", background: "var(--card-bg)" }}>
            <table className="w-full text-[11px]" style={{ color: "var(--text-primary)" }}>
              <thead>
                <tr className="text-left uppercase tracking-wider text-secondary" style={{ background: "rgba(245,158,11,0.08)", borderBottom: "1px solid var(--glass-border)" }}>
                  <th className="py-2 px-3">{t("mntSchedulePeriod", "Payment Period")}</th>
                  {hasSeparateTenant ? (
                    <>
                      <th className="py-2 px-3 text-right">{t("mntOwnerOccupied", "Owner")}</th>
                      <th className="py-2 px-3 text-right">{t("mntTenantOccupied", "Tenant")}</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-3 text-right">{t("mntLateFeeCol", "Late Fee")}</th>
                      <th className="py-2 px-3 text-right">{t("mntTotalPayable", "Total Payable")}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td className="py-2 px-3 font-semibold text-emerald-400">
                    {t("mntUntilCutoff", "Until")} {cutoffLabel} <span className="text-secondary font-normal">(No penalty)</span>
                  </td>
                  {hasSeparateTenant ? (
                    <>
                      <td className="py-2 px-3 text-right font-bold">{formatINR(baseVal)}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatINR(tenantVal)}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-3 text-right text-secondary">₹0</td>
                      <td className="py-2 px-3 text-right font-bold">{formatINR(baseVal)}</td>
                    </>
                  )}
                </tr>
                {monthSchedule.map((m, i) => (
                  <tr key={m.monthName} style={{ borderBottom: i < monthSchedule.length - 1 ? "1px solid var(--glass-border)" : "none" }}>
                    <td className="py-2 px-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                      {m.monthName}
                    </td>
                    {hasSeparateTenant ? (
                      <>
                        <td className="py-2 px-3 text-right">
                          <span className="font-bold" style={{ color: "#EAB308" }}>+{formatINR(m.ownerCalc.penalty)}</span>
                          <span className="ml-1.5 font-extrabold">{formatINR(m.ownerCalc.total)}</span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="font-bold" style={{ color: "#EAB308" }}>+{formatINR(m.tenantCalc.penalty)}</span>
                          <span className="ml-1.5 font-extrabold">{formatINR(m.tenantCalc.total)}</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-right font-bold" style={{ color: "#EAB308" }}>+{formatINR(m.ownerCalc.penalty)}</td>
                        <td className="py-2 px-3 text-right font-extrabold">{formatINR(m.ownerCalc.total)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function WaiveLateFeeModal({ isOpen, bill, onClose, onWaived }) {
  const { t } = useLang();
  const [waiverAmount, setWaiverAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const outstanding = Number(bill?.late_fee || 0);
  const calculated = Number(bill?.calculated_late_fee ?? outstanding);
  const base = Number(bill?.base_amount ?? bill?.amount ?? 0);

  useEffect(() => {
    if (isOpen) {
      setWaiverAmount(outstanding > 0 ? String(outstanding) : "");
      setReason("");
    }
  }, [isOpen, outstanding]);

  const parsedWaiver = Number(waiverAmount || 0);
  const previewPayable = Math.max(0, base + Math.max(0, outstanding - (Number.isFinite(parsedWaiver) ? parsedWaiver : 0)));

  const handleSubmit = async () => {
    if (!Number.isFinite(parsedWaiver) || parsedWaiver <= 0) {
      toast.error(t("mntWaiverInvalidAmount", "Waiver amount must be greater than 0."));
      return;
    }
    if (parsedWaiver > outstanding) {
      toast.error(t("mntWaiverExceeds", "Waiver amount cannot exceed the outstanding late fee."));
      return;
    }
    if (!reason.trim()) {
      toast.error(t("mntWaiverReasonRequired", "Please provide a reason for waiving the late fee."));
      return;
    }

    setSubmitting(true);
    try {
      const res = await maintenanceService.waiveLateFee(bill.id, {
        waiver_amount: parsedWaiver,
        reason: reason.trim(),
      });
      toast.success(res?.message || t("mntWaiverSuccess", "Late fee waived successfully."));
      if (onWaived) onWaived(res);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("mntWaiverFailed", "Failed to waive late fee."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("mntWaiveLateFeeTitle", "Waive Late Payment Charge")}
      subtitle={bill ? `${bill.title} · ${bill.Flat?.flat_number || ""}` : ""}
      icon={MdGavel}
      size="sm"
      showFooter
      submitLabel={submitting ? t("mntSaving", "Saving...") : t("mntConfirmWaiver", "Confirm Waiver")}
      cancelLabel={t("mntCancel", "Cancel")}
      onSubmit={handleSubmit}
      onCancel={onClose}
    >
      <div className="space-y-3 text-xs">
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
          <div className="flex justify-between">
            <span className="text-secondary">{t("mntCalculatedLateFee", "Calculated Late Fee")}</span>
            <span className="font-bold">{formatINR(calculated)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">{t("mntOutstandingLateFee", "Outstanding Late Fee")}</span>
            <span className="font-bold text-rose-400">{formatINR(outstanding)}</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-secondary uppercase mb-1">
            {t("mntWaiverAmountLabel", "Waiver Amount (₹) *")}
          </label>
          <input
            type="number"
            min="1"
            max={outstanding}
            value={waiverAmount}
            onChange={(e) => setWaiverAmount(e.target.value)}
            className="mc-field w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
            style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-secondary uppercase mb-1">
            {t("mntWaiverReasonLabel", "Approval Reason *")}
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("mntWaiverReasonPlaceholder", "e.g. Approved by society management committee")}
            className="w-full px-3 py-2 rounded-lg border bg-transparent text-xs outline-none"
            style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
          />
        </div>

        <div className="rounded-xl p-3 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-secondary font-semibold flex items-center gap-1.5">
            <MdWarningAmber size={15} className="text-emerald-400" />
            {t("mntFinalPayablePreview", "Final Payable After Waiver")}
          </span>
          <span className="text-sm font-extrabold text-emerald-400">{formatINR(previewPayable)}</span>
        </div>
      </div>
    </GlobalModal>
  );
}
