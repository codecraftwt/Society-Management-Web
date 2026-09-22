import { useEffect, useState, useCallback, useMemo, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdClose, MdDelete, MdRefresh,
  MdReceiptLong, MdTune, MdOutlineErrorOutline, MdCheckCircle, MdSchedule,
  MdVisibility, MdBuild, MdDashboard, MdBusiness,
  MdSearch, MdCalendarToday, MdPerson, MdFilterList,
} from "react-icons/md";
import { toast } from "react-toastify";
import maintenanceService from "../../services/maintenanceService";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import SlidingTabs from "../../components/common/SlidingTabs";
import HoloToggle from "../../components/common/HoloToggle";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import { getTitleError, getPositiveAmountError } from "../../utils/validators";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";
import "../Admin/Admin.css";

/* ── helpers ── */
const MAINTENANCE_TYPES = [
  { value: "LUMPSUM" },
  { value: "FLAT" },
  { value: "SQ_FEET" },
];

const FLAT_TYPES = ["1BHK", "2BHK", "3BHK", "ROW_HOUSE", "COMMERCIAL"];
const RESIDENT_TYPES = ["OWNER", "TENANT"];
const FREQUENCIES = ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_KEYS = ["monthJan", "monthFeb", "monthMar", "monthApr", "monthMay", "monthJun", "monthJul", "monthAug", "monthSep", "monthOct", "monthNov", "monthDec"];

const TYPE_LABEL_KEYS = {
  LUMPSUM: "mntTypeLumpsum",
  FLAT: "mntTypeFlat",
  SQ_FEET: "mntTypeSqFt",
};

const TYPE_DESC_KEYS = {
  LUMPSUM: "mntTypeLumpsumDesc",
  FLAT: "mntTypeFlatDesc",
  SQ_FEET: "mntTypeSqFtDesc",
};

const FLAT_LABEL_KEYS = {
  "1BHK": "mntFlat1BHK",
  "2BHK": "mntFlat2BHK",
  "3BHK": "mntFlat3BHK",
  ROW_HOUSE: "mntFlatRowHouse",
  COMMERCIAL: "mntFlatCommercial",
};

const FREQUENCY_KEYS = {
  MONTHLY: "mntFreqMonthly",
  QUARTERLY: "mntFreqQuarterly",
  YEARLY: "mntFreqYearly",
  ONE_TIME: "mntFreqOneTime",
};

const tFlatLabel = (t, f) => (FLAT_LABEL_KEYS[f] ? t(FLAT_LABEL_KEYS[f]) : f);
const tFrequency = (t, f) => (FREQUENCY_KEYS[f] ? t(FREQUENCY_KEYS[f]) : f);

const currentMonthLabel = () => {
  const d = new Date();
  return `${d.toLocaleString("en-US", { month: "long" })} ${d.getFullYear()}`;
};

const formatMoney = (n) =>
  Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const parseCalculation = (details) => {
  if (!details) return null;
  try { return JSON.parse(details); } catch { return null; }
};

const Spinner = ({ size = 18 }) => (
  <svg style={{ width: size, height: size }} className="animate-spin text-current" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const Label = ({ children }) => (
  <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>{children}</label>
);

const inputCls =
  "mc-field w-full px-3.5 rounded-[10px] border bg-transparent outline-none transition-all text-sm";

const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm";

const btnGhost =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors disabled:opacity-50";

const TYPE_META = {
  LUMPSUM: { icon: MdTune, color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/30" },
  FLAT: { icon: MdBusiness, color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/30" },
  SQ_FEET: { icon: MdDashboard, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
};

/* ─────────────────────────────────────────
   STATUS PILL
───────────────────────────────────────── */
function StatusPill({ status }) {
  const { t } = useLang();
  if (status === "PAID")
    return <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1"><MdCheckCircle size={12} /> {t("mntStatusPaid")}</span>;
  if (status === "PENDING_VERIFICATION")
    return <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-1"><MdSchedule size={12} /> {t("mntStatusAwaiting")}</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-1"><MdSchedule size={12} /> {t("mntStatusPending")}</span>;
}

function TypeChip({ type }) {
  const { t } = useLang();
  const meta = TYPE_META[type] || { icon: MdTune, color: "text-gray-400" };
  const Icon = meta.icon;
  const label = TYPE_LABEL_KEYS[type] ? t(TYPE_LABEL_KEYS[type]) : type;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

/* ─────────────────────────────────────────
   CONFIG CARD / ROW
───────────────────────────────────────── */
function ConfigCard({ rate, deleting, onEdit, onDelete, last, canEdit = true }) {
  const { t } = useLang();
  const Icon = TYPE_META[rate.maintenance_type]?.icon || MdTune;
  const color = TYPE_META[rate.maintenance_type]?.color || "text-gray-400";
  const label =
    rate.maintenance_type === "FLAT"
      ? `${tFlatLabel(t, rate.flat_type)} · ${rate.resident_type === "TENANT" ? t("mntTenant") : t("mntOwner")}`
      : rate.maintenance_type === "SQ_FEET"
        ? `₹${rate.rate_per_sqft}/sq.ft`
        : t("mntAllFlats");

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${last ? "" : "border-b"}`}
      style={{ borderColor: "var(--glass-border)", background: "var(--card-bg)" }}
    >
      <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${color}`} style={{ background: "var(--hover-bg)" }}>
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{rate.name || rate.maintenance_type}</p>
          <TypeChip type={rate.maintenance_type} />
        </div>
        <p className="text-xs text-secondary truncate">
          {label} · {tFrequency(t, rate.frequency || "MONTHLY")} · {rate.maintenance_type === "SQ_FEET" ? `₹${Number(rate.rate_per_sqft).toFixed(2)}/sq.ft` : formatMoney(rate.amount)}
        </p>
      </div>

      {canEdit && (
        <label className="flex items-center gap-1.5 text-xs text-secondary shrink-0 mr-1">
          <input
            type="checkbox"
            checked={!!rate.is_active}
            onChange={() => onEdit({ ...rate, is_active: !rate.is_active })}
            className="accent-emerald-500"
          />
          {t("mntActive")}
        </label>
      )}

      {canEdit && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(rate)}
            className="sa-btn-edit inline-flex items-center gap-1 px-3 py-1.5 text-xs"
          >
            {t("mntEdit")}
          </button>
          <button
            onClick={() => onDelete(rate)}
            disabled={deleting === rate.id}
            title={t("mntDeleteConfiguration")}
            aria-label={t("mntDeleteConfiguration")}
            className="sa-btn-delete inline-flex items-center justify-center w-8 h-8 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
          >
            {deleting === rate.id ? <Spinner size={14} /> : <MdDelete size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   CONFIG FORM (modal body)
───────────────────────────────────────── */
function ConfigForm({ initial, onClose, onSuccessClose, onSaved, isSuperAdmin = false, societies = [], societyId = "", onSocietyChange }) {
  const { t } = useLang();
  const [type, setType] = useState(initial?.maintenance_type || "LUMPSUM");
  const [name, setName] = useState(initial?.name || "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [ratePerSqft, setRatePerSqft] = useState(initial?.rate_per_sqft ?? "");
  const [flatType, setFlatType] = useState(initial?.flat_type || "");
  const [residentType, setResidentType] = useState(initial?.resident_type || "OWNER");
  const [frequency, setFrequency] = useState(initial?.frequency || "MONTHLY");
  const [description, setDescription] = useState(initial?.description || "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [flatOptions, setFlatOptions] = useState([]);
  const [flatTypesLoading, setFlatTypesLoading] = useState(true);
  const societyWrapRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const types = await maintenanceService.getMaintenanceFlatTypes();
        if (!mounted) return;
        setFlatOptions(types.length ? types : FLAT_TYPES);
        if (types.length && initial?.flat_type && !types.includes(initial.flat_type)) {
          setFlatType(types[0]);
        } else if (!initial?.flat_type) {
          setFlatType(types[0] || FLAT_TYPES[0]);
        }
      } catch {
        if (mounted) setFlatOptions(FLAT_TYPES);
      } finally {
        if (mounted) setFlatTypesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [initial, societyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (isSuperAdmin && !societyId) {
      setError(t("mntSelectSocietyContinue"));
      return;
    }

    if (name.trim()) {
      const nameErr = getTitleError(name, t("mntFieldMaintenanceName"));
      if (nameErr) { setError(nameErr); return; }
    }

    const amountValue = type === "SQ_FEET" ? ratePerSqft : amount;
    const amountErr = getPositiveAmountError(amountValue, type === "SQ_FEET" ? t("mntFieldRatePerSqFt") : t("mntFieldAmount"));
    if (amountErr) { setError(amountErr); return; }

    const payload = {
      maintenance_type: type,
      name,
      frequency,
      description,
      is_active: isActive,
    };
    if (type === "LUMPSUM") payload.amount = amount;
    if (type === "FLAT") {
      payload.amount = amount;
      payload.flat_type = flatType;
      payload.resident_type = residentType;
    }
    if (type === "SQ_FEET") payload.rate_per_sqft = ratePerSqft;

    setSaving(true);
    try {
      const res = await maintenanceService.saveMaintenanceConfig(payload);
      toast.success(res.action === "created" ? t("mntConfigCreated") : t("mntConfigUpdated"));
      onSaved();
      (onSuccessClose || onClose)();
    } catch (err) {
      setError(err?.response?.data?.message || t("mntSaveConfigFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type selector */}
      <div>
        <Label>{t("mntBillingMethod")}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MAINTENANCE_TYPES.map((mt) => {
            const active = type === mt.value;
            return (
              <button
                type="button"
                key={mt.value}
                onClick={() => setType(mt.value)}
                aria-pressed={active}
                className="rounded-xl border p-3.5 text-left transition-all cursor-pointer"
                onMouseEnter={(e) => {
                  if (active) return;
                  e.currentTarget.style.borderColor = "var(--accent-light)";
                }}
                onMouseLeave={(e) => {
                  if (active) return;
                  e.currentTarget.style.borderColor = "var(--input-border)";
                }}
                style={{
                  borderColor: active ? "var(--accent)" : "var(--input-border)",
                  background: active ? "var(--accent-soft)" : "var(--card-inner-bg)",
                  boxShadow: active ? "0 0 0 2px var(--accent)" : "none",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <p className="text-sm font-bold" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>{t(TYPE_LABEL_KEYS[mt.value])}</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>{t(TYPE_DESC_KEYS[mt.value])}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Society + Name row */}
      {isSuperAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <Label>{t("mntSociety")}</Label>
            <div ref={societyWrapRef} style={{ display: "flex", alignItems: "center", background: "var(--input-bg)", border: `1px solid ${societyId ? "var(--accent)" : "var(--input-border)"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, flexShrink: 0, borderRight: "1px solid var(--input-border)", background: "var(--card-inner-bg)" }}>
                <MdBusiness size={17} style={{ color: "var(--accent)" }} />
              </div>
              <Select
                value={societyId}
                onChange={(e) => onSocietyChange?.(e.target.value)}
                searchable
                placeholder={t("mntSelectSocietyPlaceholder")}
                rootStyle={{ flex: 1 }}
                anchorRef={societyWrapRef}
                style={{ height: 44, fontSize: 13, fontWeight: 600, flex: 1, border: "none", borderRadius: 0, background: "transparent", paddingLeft: 12 }}
              >
                <option value="">{t("mntSelectSocietyOption")}</option>
                {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("mntNameOptional")}</Label>
            <input className={inputCls} style={{ borderColor: "var(--input-border)", color: "var(--text-primary)", height: 44 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("mntNamePlaceholder")} />
          </div>
        </div>
      ) : (
        <div>
          <Label>{t("mntNameOptional")}</Label>
          <input className={inputCls} style={{ borderColor: "var(--input-border)", color: "var(--text-primary)", height: 44 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("mntNamePlaceholder")} />
        </div>
      )}

      {/* Society status row */}
      {isSuperAdmin && (societyId ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: "var(--accent-soft)" }}>
          <MdCheckCircle size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            {t("mntWorkingOn", { name: societies.find((s) => String(s.id) === String(societyId))?.name || "" })}
          </span>
        </div>
      ) : (
        <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: -6 }}>
          {t("mntSelectSocietyToConfigure")}
        </p>
      ))}

      {isSuperAdmin && !societyId ? (
        <p className="text-xs text-secondary" style={{ padding: "14px 0", border: "1px dashed var(--glass-border)", borderRadius: 10, textAlign: "center" }}>
          {t("mntSelectSocietyUnlock")}
        </p>
      ) : (
      <>

      {type === "FLAT" && (
        <>
          {flatTypesLoading ? (
            <p className="text-xs text-secondary">{t("mntLoadingFlatTypes")}</p>
          ) : flatOptions.length === 0 ? (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <MdOutlineErrorOutline size={12} /> {t("mntNoFlats")}
            </p>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t("mntFlatTypeLabel")}</Label>
              <Select
                options={flatOptions.map((f) => ({ value: f, label: tFlatLabel(t, f) }))}
                value={flatType || flatOptions[0]}
                onChange={(e) => setFlatType(e.target.value)}
                style={{ height: 44, fontSize: 13, fontWeight: 600, borderColor: "var(--input-border)", borderRadius: 10, background: "var(--input-bg)" }}
              />
            </div>
            <div>
              <Label>{t("mntWhoPays")}</Label>
              <Select
                options={RESIDENT_TYPES.map((r) => ({ value: r, label: r === "OWNER" ? t("mntOwner") : t("mntTenant") }))}
                value={residentType}
                onChange={(e) => setResidentType(e.target.value)}
                style={{ height: 44, fontSize: 13, fontWeight: 600, borderColor: "var(--input-border)", borderRadius: 10, background: "var(--input-bg)" }}
              />
            </div>
          </div>
          )}
        </>
      )}

      {/* Amount + Frequency + Active row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        {type !== "FLAT" || (flatOptions.length > 0 && !flatTypesLoading) ? (
          <div>
            <Label>
              {type === "LUMPSUM" && t("mntAmountEveryFlat")}
              {type === "FLAT" && t("mntAmountForFlat", { flat: tFlatLabel(t, flatType || flatOptions[0]) })}
              {type === "SQ_FEET" && t("mntRatePerSqFt")}
            </Label>
            <input
              type="number"
              min="0"
              {...(type === "SQ_FEET" ? { step: "0.01" } : {})}
              className={inputCls}
              style={{ borderColor: "var(--input-border)", color: "var(--text-primary)", height: 44 }}
              value={type === "SQ_FEET" ? ratePerSqft : amount}
              onChange={(e) => (type === "SQ_FEET" ? setRatePerSqft(e.target.value) : setAmount(e.target.value))}
              placeholder={type === "SQ_FEET" ? "e.g. 2.5" : type === "FLAT" ? "e.g. 3500" : "e.g. 3000"}
              required
            />
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div className={type !== "FLAT" || (flatOptions.length > 0 && !flatTypesLoading) ? "" : "sm:col-span-2"}>
          <Label>{t("mntFrequency")}</Label>
          <Select
            options={FREQUENCIES.map((f) => ({ value: f, label: tFrequency(t, f) }))}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            style={{ height: 44, fontSize: 13, fontWeight: 600, borderColor: "var(--input-border)", borderRadius: 10, background: "var(--input-bg)" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", minHeight: 44, paddingBottom: 4 }}>
          <label
            className="flex items-center gap-2.5 cursor-pointer select-none"
            role="switch"
            aria-checked={isActive}
          >
            <HoloToggle checked={!!isActive} onChange={setIsActive} showLabel={false} />
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("mntActive")}</span>
          </label>
        </div>
      </div>

      <div>
        <Label>{t("mntDescriptionOptional")}</Label>
        <textarea rows={2} className={inputCls} style={{ borderColor: "var(--input-border)", color: "var(--text-primary)", height: 96, resize: "vertical", minHeight: 60, paddingTop: 12 }} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t mt-1" style={{ borderColor: "var(--glass-border)" }}>
        <GlobalButton type="button" variant="cancel" onClick={onClose}>
          {t("mntCancel")}
        </GlobalButton>
        <GlobalButton
          type="submit"
          variant="add"
          icon={MdCheckCircle}
          loading={saving}
          disabled={saving}
          borderDraw
        >
          {initial?.id ? t("mntUpdate") : t("mntSaveConfiguration")}
        </GlobalButton>
      </div>
      </>
      )}
    </form>
  );
}

/* ─────────────────────────────────────────
   GENERATE MODAL WITH ELIGIBLE RESIDENTS PREVIEW
───────────────────────────────────────── */
function GenerateModal({ configs, onClose, onGenerated }) {
  const { t } = useLang();
  /* Unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(true);
  const requestClose = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else onClose();
  };

  const getDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  };

  const billingMonth = currentMonthLabel();
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [selectedRateId, setSelectedRateId] = useState(() => {
    const activeFirst = configs.find((c) => c.is_active);
    return activeFirst ? activeFirst.id : "";
  });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [searchResident, setSearchResident] = useState("");

  const derivedBillingMonth = useMemo(() => {
    if (!issueDate) return currentMonthLabel();
    try {
      const [year, month] = issueDate.split("-");
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleString("en-US", { month: "long", year: "numeric" });
    } catch {
      return currentMonthLabel();
    }
  }, [issueDate]);

  // Live preview fetch whenever billing month, selected rate, or due date change
  useEffect(() => {
    let active = true;
    const fetchPreview = async () => {
      if (!selectedRateId) {
        setPreview(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const res = await maintenanceService.previewMaintenanceBills({
          billing_month: derivedBillingMonth,
          rate_ids: [selectedRateId],
          issue_date: issueDate,
          last_pay_date: dueDate,
        });
        if (active) setPreview(res);
      } catch (err) {
        console.error("Failed to load maintenance preview:", err);
      } finally {
        if (active) setPreviewLoading(false);
      }
    };

    const timer = setTimeout(fetchPreview, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [derivedBillingMonth, selectedRateId, dueDate, issueDate]);

  const handleGenerate = async () => {
    if (!selectedRateId) {
      toast.error(t("mntSelectTypeFirst"));
      return;
    }
    setGenerating(true);
    try {
      const res = await maintenanceService.generateMaintenanceBills({
        billing_month: derivedBillingMonth,
        rate_ids: [selectedRateId],
        issue_date: issueDate,
        last_pay_date: dueDate,
      });
      const genCount = res?.summary?.generated || 0;
      toast.success(t("mntGeneratedSuccess", { count: genCount }));
      onGenerated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("mntGenerationFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const billable = configs.filter((c) => c.is_active);

  const filteredResidents = useMemo(() => {
    if (!preview?.residents) return [];
    if (!searchResident.trim()) return preview.residents;
    const q = searchResident.toLowerCase();
    return preview.residents.filter(
      (r) =>
        r.resident_name?.toLowerCase().includes(q) ||
        r.flat_number?.toLowerCase().includes(q) ||
        r.block_name?.toLowerCase().includes(q) ||
        r.rate_name?.toLowerCase().includes(q)
    );
  }, [preview, searchResident]);

  return createPortal(
    <>
    <div
      onClick={requestClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 780,
          background: "var(--card-bg, #0f172a)",
          border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
          borderRadius: 22,
          maxHeight: "90vh",
          overflowY: "auto",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 20px rgba(160,90,255,0.15)",
          animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 26px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, var(--accent), #9e58ff)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(160,90,255,0.35)", flexShrink: 0 }}>
              <MdReceiptLong size={24} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                {t("mntGenTitle")}
              </h3>
              <p style={{ fontSize: 12, color: "var(--accent)", margin: "2px 0 0", fontWeight: 600 }}>
                {t("mntGenSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={requestClose}
            style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--glass-border, rgba(255,255,255,0.12))", background: "var(--card-inner-bg, rgba(255,255,255,0.06))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
          >
            <MdClose size={17} />
          </button>
        </div>

        <div style={{ height: 1, background: "var(--glass-border, rgba(255,255,255,0.08))", margin: "16px 0 0" }} />

        <div style={{ padding: "20px 26px 26px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
          {/* Top Inputs: Issue Date & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t("mntIssueDate")}</Label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-xl border border-(--glass-border) bg-(--card-inner-bg) text-(--text-primary) font-semibold text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
              <span className="text-[11px] text-secondary mt-1.5 block">{t("mntIssueDateHint")}</span>
            </div>
            <div>
              <Label>{t("mntDueDate")}</Label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-xl border border-(--glass-border) bg-(--card-inner-bg) text-(--text-primary) font-semibold text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer"
                value={dueDate}
                min={issueDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
              <span className="text-[11px] text-emerald-400 mt-1.5 block">{t("mntDueDateHint")}</span>
            </div>
          </div>

          {/* Rate Configurations to Apply (Single Selection) */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Label>{t("mntSelectBillType")}</Label>
              <span className="text-xs text-indigo-400 font-semibold">{t("mntSelectOneBillType")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {billable.map((c) => {
                const isSel = String(selectedRateId) === String(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all"
                    style={{
                      borderColor: isSel ? "rgba(99,102,241,0.6)" : "var(--glass-border)",
                      background: isSel ? "rgba(99,102,241,0.14)" : "var(--card-inner-bg)",
                      boxShadow: isSel ? "0 4px 14px -2px rgba(99,102,241,0.25)" : "none",
                    }}
                  >
                    <input
                      type="radio"
                      name="maintenance_rate_select"
                      checked={isSel}
                      onChange={() => setSelectedRateId(c.id)}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <TypeChip type={c.maintenance_type} />
                        <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                          {c.name || c.maintenance_type}
                        </span>
                      </div>
                      {c.maintenance_type === "FLAT" && c.flat_type && (
                        <span className="text-[11px] text-secondary block font-medium">{t("mntFlatTypeTw", { type: tFlatLabel(t, c.flat_type) })}</span>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-emerald-400 shrink-0">
                      {c.maintenance_type === "SQ_FEET" ? `₹${c.rate_per_sqft}/sq.ft` : formatMoney(c.amount)}
                    </span>
                  </label>
                );
              })}
              {billable.length === 0 && (
                <p className="text-xs text-amber-400">{t("mntNoActiveBillable")}</p>
              )}
            </div>
          </div>

          {/* ── Eligible Residents Preview Section ── */}
          <div
            style={{
              background: "var(--card-inner-bg, rgba(255,255,255,0.02))",
              borderRadius: 16,
              border: "1px solid var(--glass-border)",
              padding: "16px 18px",
            }}
          >
            {/* Preview Section Header with Counters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MdPerson size={18} className="text-blue-400" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: "var(--text-primary)" }}>
                    {t("mntEligiblePreview")}
                  </span>
                </div>
                {preview && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "rgba(59,130,246,0.15)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59,130,246,0.3)",
                    }}
                  >
                    {t("mntToBill", { count: preview.billable_count })}
                  </span>
                )}
                {preview?.already_billed_count > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "rgba(245,158,11,0.15)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245,158,11,0.3)",
                    }}
                  >
                    {t("mntAlreadyGenerated", { count: preview.already_billed_count })}
                  </span>
                )}
              </div>

              {preview && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mntTotalAmount")}</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#10b981" }}>
                    {formatMoney(preview.total_amount)}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Search */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <MdSearch size={17} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                className={`${inputCls} search-input`}
                style={{
                  paddingLeft: 36,
                  height: 36,
                  fontSize: 12,
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                  borderRadius: 10,
                }}
                value={searchResident}
                onChange={(e) => setSearchResident(e.target.value)}
                placeholder={t("mntSearchPlaceholder")}
              />
            </div>

            {/* Residents Preview List / Table */}
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Spinner size={22} />
                <span className="text-xs text-secondary">{t("mntLoadingResidents")}</span>
              </div>
            ) : filteredResidents.length === 0 ? (
              <div className="text-center py-8 text-secondary">
                <MdOutlineErrorOutline size={26} className="mx-auto mb-1 opacity-40" />
                <p className="text-xs font-semibold">
                  {preview?.eligible_count === 0
                    ? t("mntNoEligibleFlats")
                    : t("mntNoSearchMatches")}
                </p>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 240,
                  overflowY: "auto",
                  borderRadius: 12,
                  border: "1px solid var(--glass-border)",
                  background: "var(--card-bg)",
                }}
              >
                <table className="w-full text-left" style={{ fontSize: 12, borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "var(--card-inner-bg)", borderBottom: "1px solid var(--glass-border)", zIndex: 1 }}>
                    <tr style={{ color: "var(--text-secondary)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <th style={{ padding: "8px 12px" }}>{t("mntThFlatUnit")}</th>
                      <th style={{ padding: "8px 12px" }}>{t("mntThResident")}</th>
                      <th style={{ padding: "8px 12px" }}>{t("mntThAppliedRate")}</th>
                      <th style={{ padding: "8px 12px" }}>{t("mntThAmount")}</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("mntThStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResidents.map((r, idx) => (
                      <tr
                        key={`${r.flat_id}-${r.rate_id}-${idx}`}
                        style={{
                          borderBottom: idx < filteredResidents.length - 1 ? "1px solid var(--glass-border)" : "none",
                          opacity: r.is_already_billed ? 0.6 : 1,
                        }}
                      >
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{r.flat_number}</div>
                          <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                            {t("mntBlockPrefix", { block: r.block_name, flatType: r.flat_type ? `· ${tFlatLabel(t, r.flat_type)}` : "" })}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                background: "rgba(59,130,246,0.18)",
                                color: "#60a5fa",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {r.resident_name?.charAt(0) || "U"}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{r.resident_name}</div>
                              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{r.resident_phone || r.resident_email || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{r.rate_name}</div>
                          <div style={{ fontSize: 10, color: "#818cf8" }}>
                            {r.maintenance_type === "SQ_FEET" && r.area_sqft
                              ? `₹${r.rate_per_sqft}/sq.ft × ${r.area_sqft} sq.ft`
                              : r.maintenance_type}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 800, color: "#10b981", fontSize: 13 }}>
                          {formatMoney(r.amount)}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          {r.is_already_billed ? (
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 6,
                                background: "rgba(245,158,11,0.15)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.3)",
                              }}
                            >
                              {t("mntAlreadyBilled")}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 6,
                                background: "rgba(16,185,129,0.15)",
                                color: "#10b981",
                                border: "1px solid rgba(16,185,129,0.3)",
                              }}
                            >
                              {t("mntReadyToBill")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 14, borderTop: "1px solid var(--glass-border)" }}>
            <button
              onClick={requestClose}
              className="sa-btn sa-btn-ghost"
              style={{ padding: "9px 18px", fontSize: 13 }}
            >
              {t("mntCancel")}
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || !preview || preview.billable_count === 0}
              className="sa-add-btn sa-add-pill sa-btn-primary"
              style={{
                opacity: generating || !preview || preview.billable_count === 0 ? 0.55 : 1,
                cursor: generating || !preview || preview.billable_count === 0 ? "not-allowed" : "pointer",
              }}
            >
              <span className="sa-pill-blob sa-pill-blob1" />
              <span className="sa-pill-inner" style={{ padding: "0 22px", height: 42 }}>
                {generating ? <Spinner size={16} /> : <MdBuild size={17} />}
                <span>
                  {generating
                    ? t("mntGenerating")
                    : t("mntGenerateN", { count: preview?.billable_count || 0, total: formatMoney(preview?.total_amount || 0) })}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose(); }}
      />
    </div>
    </>,
    document.body
  );
}

/* ─────────────────────────────────────────
   BILLS TAB
───────────────────────────────────────── */
const toISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (str) => {
  if (!str) return "";
  try {
    const parts = str.split("-").map(Number);
    if (parts.length !== 3) return str;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return str;
  }
};

function BillsTab({ billingMonth, setBillingMonth, onView, configs = [] }) {
  const { t } = useLang();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  // Type filter options matching the creation types (Lumpsum, By Flat Type, Per Sq. Ft.)
  const typeOptions = [
    { value: "", label: t("mntTypeAll") },
    { value: "LUMPSUM", label: t("mntTypeLumpsum") },
    { value: "FLAT", label: t("mntTypeFlat") },
    { value: "SQ_FEET", label: t("mntTypeSqFt") },
  ];

  // Custom range type: 'date_range' (Day Dates) | 'month_range' (Month/Year)
  const [customType, setCustomType] = useState("date_range");

  // Day date state (YYYY-MM-DD)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState(toISODate(firstDayOfMonth));
  const [endDate, setEndDate] = useState(toISODate(now));
  const [dateField, setDateField] = useState("created_at"); // 'created_at' | 'due_date'

  // Month-year state
  const [fromMonth, setFromMonth] = useState(now.getMonth());
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());

  const parsed = billingMonth.match(/^([A-Za-z]+)\s+(\d{4})$/);
  const [monthIdx, setMonthIdx] = useState(parsed ? MONTH_NAMES.indexOf(parsed[1]) : now.getMonth());
  const [year, setYear] = useState(parsed ? Number(parsed[2]) : now.getFullYear());

  const years = [];
  for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 5; y++) years.push(y);

  const currentLabel = `${MONTH_NAMES[monthIdx]} ${year}`;
  const [mode, setMode] = useState(billingMonth ? "month" : "custom");

  useEffect(() => {
    if (mode === "month") setBillingMonth(currentLabel);
  }, [mode, currentLabel, setBillingMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (mode === "custom") {
        if (customType === "date_range") {
          if (startDate) params.from_date = startDate;
          if (endDate) params.to_date = endDate;
          if (dateField) params.date_field = dateField;
        } else {
          if (fromMonth !== null && fromYear) params.from_month = `${MONTH_NAMES[fromMonth]} ${fromYear}`;
          if (toMonth !== null && toYear) params.to_month = `${MONTH_NAMES[toMonth]} ${toYear}`;
        }
      } else if (billingMonth) {
        params.billing_month = billingMonth;
      }
      if (status) params.status = status;
      if (typeFilter) params.maintenance_type = typeFilter;
      const data = await maintenanceService.getMaintenanceBills(params);
      setBills(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("mntLoadBillsFailed"));
    } finally {
      setLoading(false);
    }
  }, [mode, customType, startDate, endDate, dateField, billingMonth, status, typeFilter, fromMonth, fromYear, toMonth, toYear, t]);

  useEffect(() => { load(); }, [load]);

  const onChangeMonth = (e) => {
    setMonthIdx(Number(e.target.value));
    setMode("month");
  };
  const onChangeYear = (e) => {
    setYear(Number(e.target.value));
    setMode("month");
  };

  const applyCustom = () => {
    setMode("custom");
    setCustomOpen(false);
  };

  const applyPreset = (presetKey) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (presetKey === "today") {
      // start and end are today
    } else if (presetKey === "yesterday") {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (presetKey === "last7") {
      start.setDate(today.getDate() - 6);
    } else if (presetKey === "thisMonth") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (presetKey === "last30") {
      start.setDate(today.getDate() - 29);
    } else if (presetKey === "lastMonth") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (presetKey === "thisYear") {
      start = new Date(today.getFullYear(), 0, 1);
    }

    setStartDate(toISODate(start));
    setEndDate(toISODate(end));
    setCustomType("date_range");
  };

  const monthOptions = MONTH_NAMES.map((m, i) => ({ value: i, label: t(MONTH_KEYS[i]) }));
  const yearOptions = years.map((y) => ({ value: y, label: String(y) }));

  // Label for active custom period
  const customPeriodLabel = useMemo(() => {
    if (customType === "date_range") {
      return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
    }
    return `${t(MONTH_KEYS[fromMonth])} ${fromYear} – ${t(MONTH_KEYS[toMonth])} ${toYear}`;
  }, [customType, startDate, endDate, fromMonth, fromYear, toMonth, toYear, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* Modern Compact Filter Toolbar */}
      <div
        className="p-3 sm:p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Status Sliding Tabs */}
        <div className="overflow-x-auto pb-1 md:pb-0 scrollbar-none shrink-0">
          <SlidingTabs
            items={[
              { id: "", label: t("mntStatusAll") },
              { id: "PENDING", label: t("mntStatusPending") },
              { id: "PAID", label: t("mntStatusPaid") },
              { id: "PENDING_VERIFICATION", label: t("mntStatusAwaiting") },
            ]}
            value={status}
            onChange={setStatus}
          />
        </div>

        {/* Compact Filters & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 md:justify-end flex-1">
          {/* Month & Year inline selector */}
          <div
            className="flex items-center gap-1.5 border rounded-xl px-2.5 py-1"
            style={{
              background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
              borderColor: "var(--glass-border)",
              height: 36,
            }}
          >
            <select
              value={monthIdx}
              onChange={onChangeMonth}
              disabled={mode === "custom"}
              className={`bg-transparent text-xs font-semibold outline-none cursor-pointer ${mode === "custom" ? "opacity-40" : ""}`}
              style={{ color: "var(--text-primary)" }}
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value} style={{ background: "var(--card-bg, #0f172a)", color: "var(--text-primary, #ffffff)" }}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-secondary opacity-40 text-xs">/</span>
            <select
              value={year}
              onChange={onChangeYear}
              disabled={mode === "custom"}
              className={`bg-transparent text-xs font-semibold outline-none cursor-pointer ${mode === "custom" ? "opacity-40" : ""}`}
              style={{ color: "var(--text-primary)" }}
            >
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value} style={{ background: "var(--card-bg, #0f172a)", color: "var(--text-primary, #ffffff)" }}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Period Button */}
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none"
            style={{
              height: 36,
              background: mode === "custom" ? "var(--accent-soft, rgba(99,102,241,0.18))" : "var(--card-inner-bg, rgba(255,255,255,0.04))",
              borderColor: mode === "custom" ? "var(--accent, #818cf8)" : "var(--glass-border)",
              color: mode === "custom" ? "var(--accent, #818cf8)" : "var(--text-secondary)",
            }}
          >
            <MdCalendarToday size={14} style={{ color: mode === "custom" ? "var(--accent, #818cf8)" : "var(--text-secondary)" }} />
            <span className="truncate max-w-45">
              {mode === "custom" ? customPeriodLabel : t("mntCustomPeriod")}
            </span>
          </button>

          {/* Type Dropdown */}
          <div style={{ minWidth: 140 }}>
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                height: 36,
                borderRadius: 11,
                fontSize: 12,
                fontWeight: 600,
                background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
                borderColor: "var(--glass-border)",
              }}
              className="w-full"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={load}
            title={t("mntRefreshBills")}
            className="inline-flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0"
            style={{
              width: 36,
              height: 36,
              background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
              borderColor: "var(--glass-border)",
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.08))";
              e.currentTarget.style.borderColor = "var(--accent-light, #818cf8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--card-inner-bg, rgba(255,255,255,0.04))";
              e.currentTarget.style.borderColor = "var(--glass-border)";
            }}
          >
            <MdRefresh size={16} className={loading ? "animate-spin text-accent" : "text-secondary"} />
          </button>
        </div>
      </div>

      {/* Global Theme Custom Period Modal with Day Date Support */}
      <GlobalModal
        isOpen={customOpen}
        onClose={() => setCustomOpen(false)}
        title={t("mntCustomPeriodRange")}
        subtitle={t("mntCustomPeriodSubtitle")}
        icon={MdCalendarToday}
        size="md"
        showFooter
        submitLabel={t("mntApplyFilter")}
        cancelLabel={t("mntCancel")}
        onSubmit={applyCustom}
        onCancel={() => setCustomOpen(false)}
      >
        {/* Type Selector Tabs */}
        <div
          className="flex items-center p-1 rounded-xl mb-4 gap-1"
          style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}
        >
          <button
            type="button"
            onClick={() => setCustomType("date_range")}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all"
            style={{
              background: customType === "date_range" ? "var(--accent)" : "transparent",
              color: customType === "date_range" ? "#ffffff" : "var(--text-secondary)",
              boxShadow: customType === "date_range" ? "0 2px 8px rgba(160,90,255,0.3)" : "none",
            }}
          >
            {t("mntSpecificDates")}
          </button>
          <button
            type="button"
            onClick={() => setCustomType("month_range")}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all"
            style={{
              background: customType === "month_range" ? "var(--accent)" : "transparent",
              color: customType === "month_range" ? "#ffffff" : "var(--text-secondary)",
              boxShadow: customType === "month_range" ? "0 2px 8px rgba(160,90,255,0.3)" : "none",
            }}
          >
            {t("mntMonthRange")}
          </button>
        </div>

        {customType === "date_range" ? (
          <div className="flex flex-col gap-4">
            {/* Quick Presets */}
            <div>
              <Label>{t("mntQuickPresets")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "today", label: t("mntPresetToday") },
                  { key: "yesterday", label: t("mntPresetYesterday") },
                  { key: "last7", label: t("mntPresetLast7") },
                  { key: "thisMonth", label: t("mntPresetThisMonth") },
                  { key: "last30", label: t("mntPresetLast30") },
                  { key: "lastMonth", label: t("mntPresetLastMonth") },
                  { key: "thisYear", label: t("mntPresetThisYear") },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                    style={{
                      background: "var(--card-inner-bg)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--accent-soft)";
                      e.currentTarget.style.color = "var(--accent)";
                      e.currentTarget.style.borderColor = "var(--accent-light)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--card-inner-bg)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.borderColor = "var(--glass-border)";
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("mntFromDate")}</Label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 rounded-[10px] border outline-none transition-all text-sm font-semibold"
                  style={{
                    height: 44,
                    background: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("mntToDate")}</Label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 rounded-[10px] border outline-none transition-all text-sm font-semibold"
                  style={{
                    height: 44,
                    background: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                  required
                />
              </div>
            </div>

            {/* Date Target Field */}
            <div className="flex flex-col gap-1.5">
              <Label>{t("mntFilterDateBy")}</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  <input
                    type="radio"
                    name="dateField"
                    value="created_at"
                    checked={dateField === "created_at"}
                    onChange={(e) => setDateField(e.target.value)}
                    className="accent-blue-600"
                  />
                  <span>{t("mntBillCreationDate")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  <input
                    type="radio"
                    name="dateField"
                    value="due_date"
                    checked={dateField === "due_date"}
                    onChange={(e) => setDateField(e.target.value)}
                    className="accent-blue-600"
                  />
                  <span>{t("mntDueDateFilter")}</span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("mntFromMonth")}</Label>
              <Select
                options={monthOptions}
                value={fromMonth}
                onChange={(e) => setFromMonth(Number(e.target.value))}
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("mntFromYear")}</Label>
              <Select
                options={yearOptions}
                value={fromYear}
                onChange={(e) => setFromYear(Number(e.target.value))}
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("mntToMonth")}</Label>
              <Select
                options={monthOptions}
                value={toMonth}
                onChange={(e) => setToMonth(Number(e.target.value))}
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("mntToYear")}</Label>
              <Select
                options={yearOptions}
                value={toYear}
                onChange={(e) => setToYear(Number(e.target.value))}
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </div>
          </div>
        )}

        <div
          className="mt-4 p-3.5 rounded-xl flex items-center justify-between text-xs font-semibold"
          style={{
            background: "var(--card-inner-bg)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
        >
          <span>{t("mntSelectedRange")}</span>
          <span className="font-bold text-sm" style={{ color: "var(--accent)" }}>
            {customPeriodLabel}
          </span>
        </div>
      </GlobalModal>

      <div className="flex flex-wrap items-center gap-2 pl-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>
          <MdFilterList size={13} />
          {mode === "custom"
            ? customPeriodLabel
            : billingMonth || t("mntNoMonthSelected")}
        </span>
        {typeFilter && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border" style={{ borderColor: "var(--accent-light, #818cf8)", background: "var(--accent-soft)", color: "var(--accent)" }}>
            {t("mntTypeChip", { type: typeOptions.find((o) => o.value === typeFilter)?.label || typeFilter })}
          </span>
        )}
        {status && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>
            {t("mntStatusChip", { status: status })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : bills.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-secondary">
          <MdReceiptLong size={40} className="opacity-30" />
          <p className="text-sm">{t("mntNoBills")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-180" style={{ color: "var(--text-primary)" }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-secondary">
                <th className="py-2 pr-3">{t("mntThBillFlat")}</th>
                <th className="py-2 pr-3">{t("mntThType")}</th>
                <th className="py-2 pr-3">{t("mntThIssueDate")}</th>
                <th className="py-2 pr-3">{t("mntThAmount")}</th>
                <th className="py-2 pr-3">{t("mntThStatus")}</th>
                <th className="py-2 pr-3">{t("mntThDueDate")}</th>
                <th className="py-2 text-right">{t("mntThView")}</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-t" style={{ borderColor: "var(--glass-border)" }}>
                  <td className="py-3 pr-3">
                    <p className="font-bold">{b.title}</p>
                    <p className="text-xs text-secondary">{b.Flat?.flat_number} · {b.Flat?.Block?.name || "—"}</p>
                  </td>
                  <td className="py-3 pr-3"><TypeChip type={b.rate?.maintenance_type} /></td>
                  <td className="py-3 pr-3 text-xs">
                    <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {b.issue_date
                        ? new Date(b.issue_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                        : b.created_at
                        ? new Date(b.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                        : b.billing_month || "—"}
                    </div>
                    {b.billing_month && (
                      <div className="text-[11px] text-secondary">{b.billing_month}</div>
                    )}
                  </td>
                  <td className="py-3 pr-3 font-bold">{formatMoney(b.amount)}</td>
                  <td className="py-3 pr-3"><StatusPill status={b.status} /></td>
                  <td className="py-3 pr-3 text-xs text-secondary">{b.due_date ? new Date(b.due_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => onView(b.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors" style={{ borderColor: "var(--glass-border)" }}>
                      <MdVisibility size={13} /> {t("mntDetails")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function MaintenancePage() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";
  const canEdit = hasPermission(user, "maintenance", "edit") || hasPermission(user, "maintenance", "create") || hasPermission(user, "maintenance", "view");

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("config");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [billingMonth, setBillingMonth] = useState(currentMonthLabel());
  const [detailId, setDetailId] = useState(null);

  /* Unsaved-changes guard (config form modal) */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showForm);
  const closeConfigForm = () => { setShowForm(false); setEditing(null); };
  const requestCloseConfigForm = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else closeConfigForm();
  };

  /* ── SuperAdmin society gate ── */
  const [societies, setSocieties] = useState([]);
  const [societyId, setSocietyId] = useState(
    () => localStorage.getItem("superadmin_society_filter") || ""
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    API.get("/societies")
      .then((r) => setSocieties(r.data || []))
      .catch(() => setSocieties([]));
  }, [isSuperAdmin]);

  const applySocietyFilter = (val) => {
    setSocietyId(val);
    localStorage.setItem("superadmin_society_filter", val);
  };

  const handleSocietyChange = (e) => {
    const val = e.target.value;
    applySocietyFilter(val);
    setShowForm(false);
    setShowGenerate(false);
  };

  const load = useCallback(async () => {
    try {
      const data = await maintenanceService.getMaintenanceConfigs();
      setConfigs(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("mntLoadConfigsFailed"));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, societyId, t]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (rate) => { setEditing(rate); setShowForm(true); };

  const handleDelete = async (rate) => {
    if (!window.confirm(t("mntDeleteConfirm", { name: rate.name || rate.maintenance_type }))) return;
    setDeleting(rate.id);
    try {
      const res = await maintenanceService.deleteMaintenanceConfig(rate.id);
      toast.success(res.message || t("mntDeleted"));
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("mntDeleteFailed"));
    } finally {
      setDeleting(null);
    }
  };

  const activeCount = configs.filter((c) => c.is_active).length;

  return (
    <div className="flex flex-col gap-4">
      {/* ── UNIFIED HEADER BAR ── */}
      <div
        className="ad-page-header flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border mb-2"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-accent shrink-0"
            style={{
              background: "var(--accent-soft, rgba(99,102,241,0.18))",
              border: "1px solid var(--accent-light, #818cf8)",
            }}
          >
            <MdBuild size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-primary flex items-center gap-2" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("mntManagement")}
            </h1>
            <p className="text-xs text-secondary mt-0.5 hidden sm:block">
              {t("mntSubtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1" style={{ scrollbarWidth: "none" }}>
          {canEdit && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={openAdd}
              className="shrink-0"
              style={{ fontWeight: 700 }}
            >
              {t("mntHeaderNewConfig")}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* SuperAdmin: must select a society first */}
      {isSuperAdmin && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "var(--card-inner-bg)", padding: "8px 14px", borderRadius: 14, border: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 220 }}>
            <MdBusiness size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{t("mntSelectSociety")}</span>
            <Select
              className="input"
              value={societyId}
              onChange={handleSocietyChange}
              style={{ height: 38, fontSize: 13, fontWeight: 700, flex: 1, border: "1.5px solid var(--accent-alpha,rgba(107,70,193,0.25))" }}
            >
              <option value="">{t("mntChooseSociety")}</option>
              {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          {!societyId ? (
            <span style={{ fontSize: 12, color: "var(--stat-amber-color)", fontWeight: 700 }}>
              💡 {t("mntSelectSocietyHint")}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--stat-green-color)", fontWeight: 700 }}>
              ✓ {t("mntWorkingOn", { name: societies.find((s) => String(s.id) === String(societyId))?.name || "" })}
            </span>
          )}
        </div>
      )}

      {isSuperAdmin && !societyId && (
        <div className="rounded-xl border p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)" }}>
          <MdBusiness size={36} className="opacity-30" />
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("mntSelectSocietyContinue")}</p>
          <p className="text-xs text-secondary">{t("mntSocietyContextHint")}</p>
        </div>
      )}

      {!(isSuperAdmin && !societyId) && (<>
      <SlidingTabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "config", label: t("mntTabConfigure"), icon: <MdTune size={15} /> },
          { id: "bills", label: t("mntTabGeneratedBills"), icon: <MdReceiptLong size={15} /> },
        ]}
      />

      {tab === "config" ? (
        <div className="flex flex-col gap-4">
          <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-2">
            <p className="text-sm text-secondary">{t("mntConfigsSummary", { count: configs.length, active: activeCount })}</p>
            {canEdit && (
              <GlobalButton
                variant="add"
                icon={MdBuild}
                borderDraw
                onClick={() => setShowGenerate(true)}
                className="shrink-0"
                style={{ fontWeight: 700 }}
              >
                {t("mntGenerateBills")}
              </GlobalButton>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size={28} /></div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-secondary">
              <MdTune size={40} className="opacity-30" />
              <p className="text-sm">{t("mntNoConfigs")}</p>
              {canEdit && (
                <button onClick={openAdd} className={btnGhost} style={{ borderColor: "var(--glass-border)" }}>{t("mntAddFirstConfig")}</button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)" }}>
              {configs.map((r) => (
                <ConfigCard key={r.id} rate={r} deleting={deleting} onEdit={openEdit} onDelete={handleDelete} last={configs[configs.length - 1].id === r.id} canEdit={canEdit} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <BillsTab billingMonth={billingMonth} setBillingMonth={setBillingMonth} onView={setDetailId} configs={configs} />
      )}

      {/* Config form modal */}
      {showForm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) requestCloseConfigForm(); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 740,
            background: "var(--card-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: 16,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-glass, 0 18px 50px rgba(0,0,0,0.5))",
            animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
            {/* Header */}
            <div className="px-5 sm:px-6 pt-5" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(160,90,255,0.25)", flexShrink: 0 }}>
                  <MdTune size={20} color="#fff" />
                </div>
                <div>
                  <h3 className="text-[15px] sm:text-base" style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
                    {editing?.id ? t("mntConfigFormEditTitle") : t("mntConfigFormNewTitle")}
                  </h3>
                  <p className="text-[11px] sm:text-xs" style={{ color: "var(--text-secondary)", margin: "2px 0 0", fontWeight: 500 }}>
                    {t("mntConfigFormSubtitle")}
                  </p>
                </div>
              </div>
              <button
                onClick={requestCloseConfigForm}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-inner-bg)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", transition: "all 0.15s ease", flexShrink: 0 }}
              >
                <MdClose size={16} />
              </button>
            </div>

            <div style={{ height: 1, background: "var(--glass-border)", margin: "16px 0 0", flexShrink: 0 }} />

            <div className="sm:px-6 px-5 pt-5 pb-7" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
              <ConfigForm
                key={editing?.id || "new"}
                initial={editing}
                onClose={requestCloseConfigForm}
                onSuccessClose={closeConfigForm}
                onSaved={load}
                isSuperAdmin={isSuperAdmin}
                societies={societies}
                societyId={societyId}
                onSocietyChange={applySocietyFilter}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unsaved-changes discard confirm (config form modal) */}
      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); closeConfigForm(); }}
      />

      {/* Generate modal */}
      {showGenerate && (
        <GenerateModal configs={configs} onClose={() => setShowGenerate(false)} onGenerated={load} />
      )}

      {/* Detail modal */}
      {detailId && (
        <BillDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
      </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   DETAIL MODAL
───────────────────────────────────────── */
function BillDetailModal({ id, onClose }) {
  const { t } = useLang();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await maintenanceService.getMaintenanceBillDetail(id);
        setDetail(data);
      } catch (err) {
        toast.error(err?.response?.data?.message || t("mntLoadBillFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, t]);

  const bill = detail?.bill;
  const rate = detail?.rate;
  const owner = detail?.owner;
  const calc = parseCalculation(bill?.calculation_details);

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--card-bg, #0f172a)",
          border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
          borderRadius: 20,
          maxHeight: "90vh",
          overflowY: "auto",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 20px rgba(160,90,255,0.15)",
          animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(16,185,129,0.35)", flexShrink: 0 }}>
              <MdReceiptLong size={22} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 17, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                {t("mntBillDetails")}
              </h3>
              <p style={{ fontSize: 12, color: "#34d399", margin: "2px 0 0", fontWeight: 600 }}>
                {bill ? t("mntInvoiceNo", { id: bill.id, month: bill.billing_month || t("mntCurrent") }) : t("mntMaintenanceInvoice")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--glass-border, rgba(255,255,255,0.12))", background: "var(--card-inner-bg, rgba(255,255,255,0.06))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
          >
            <MdClose size={17} />
          </button>
        </div>

        <div style={{ height: 1, background: "var(--glass-border, rgba(255,255,255,0.08))", margin: "16px 0 0" }} />

        <div style={{ padding: "20px 24px 28px" }}>
          {loading ? (
            <div className="flex justify-center py-12"><Spinner size={26} /></div>
          ) : !bill ? (
            <p className="text-sm text-secondary text-center py-6">{t("mntBillNotFound")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border p-4 flex items-center justify-between" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                <div>
                  <p className="text-xs text-secondary">{t("mntThAmount")}</p>
                  <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{formatMoney(bill.amount)}</p>
                </div>
                <StatusPill status={bill.status} />
              </div>

              <Row label={t("mntRowTitle")} value={bill.title} />
              <Row label={t("mntRowFlat")} value={bill.Flat ? `${bill.Flat.flat_number}` : "—"} />
              <Row label={t("mntRowBillingMonth")} value={bill.billing_month} />
              <Row label={t("mntRowDueDate")} value={bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "—"} />

              {rate && (
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">{t("mntSectionConfiguration")}</p>
                  <Row label={t("mntRowMethod")} value={rate.maintenance_type} />
                  {rate.maintenance_type === "FLAT" && <Row label={t("mntRowFlatType")} value={rate.flat_type} />}
                  {rate.name && <Row label={t("mntRowName")} value={rate.name} />}
                </div>
              )}

              {calc && (
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">{t("mntSectionCalculation")}</p>
                  <Row label={t("mntRowMethod")} value={calc.maintenance_type || "—"} />
                  {calc.flat_type && <Row label={t("mntRowFlatType")} value={calc.flat_type} />}
                  {calc.maintenance_type === "SQ_FEET" && (
                    <>
                      <Row label={t("mntRowArea")} value={calc.area_sqft ? `${calc.area_sqft} sq.ft` : "—"} />
                      <Row label={t("mntRowRate")} value={calc.rate_per_sqft ? `₹${calc.rate_per_sqft}/sq.ft` : "—"} />
                      <Row label={t("mntRowCalculation")} value={calc.calculation || "—"} />
                    </>
                  )}
                  {calc.maintenance_type !== "SQ_FEET" && (
                    <Row label={t("mntRowConfiguredAmount")} value={calc.configured_amount != null ? formatMoney(calc.configured_amount) : "—"} />
                  )}
                </div>
              )}

              {owner && (
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">{t("mntSectionResponsibleOwner")}</p>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{owner.User?.name || t("mntUserHash", { id: owner.user_id })}</p>
                  {owner.User?.mobile && <p className="text-xs text-secondary">{owner.User.mobile}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t mt-4" style={{ borderColor: "var(--glass-border)" }}>
            <button onClick={onClose} className={btnPrimary} style={{ borderRadius: 12 }}>{t("mntClose")}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-secondary">{label}</span>
      <span className="font-bold text-right" style={{ color: "var(--text-primary)" }}>{value || "—"}</span>
    </div>
  );
}
