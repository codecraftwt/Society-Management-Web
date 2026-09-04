import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdClose, MdDelete, MdRefresh,
  MdReceiptLong, MdTune, MdOutlineErrorOutline, MdCheckCircle, MdSchedule,
  MdVisibility, MdBuild, MdDashboard, MdBusiness,
  MdSearch, MdCalendarToday, MdPerson, MdFilterList,
} from "react-icons/md";
import { toast } from "react-toastify";
import maintenanceService from "../../services/maintenanceService";
import Select from "../../components/common/Select";
import "../Admin/Admin.css";

/* ── helpers ── */
const MAINTENANCE_TYPES = [
  { value: "LUMPSUM", label: "Lumpsum", desc: "Fixed amount for all flats" },
  { value: "FLAT", label: "By Flat Type (BHK)", desc: "Different amount per flat type" },
  { value: "SQ_FEET", label: "Per Sq. Ft.", desc: "Amount × flat area" },
];

const FLAT_TYPES = ["1BHK", "2BHK", "3BHK", "ROW_HOUSE", "COMMERCIAL"];
const RESIDENT_TYPES = ["OWNER", "TENANT"];
const FREQUENCIES = ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"];
const FLAT_LABELS = { "1BHK": "1 BHK", "2BHK": "2 BHK", "3BHK": "3 BHK", ROW_HOUSE: "Row House", COMMERCIAL: "Commercial" };

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
  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">{children}</label>
);

const inputCls =
  "w-full px-3 py-2 rounded-lg border bg-transparent outline-none transition-colors focus:ring-2 text-sm";

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
  if (status === "PAID")
    return <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1"><MdCheckCircle size={12} /> Paid</span>;
  if (status === "PENDING_VERIFICATION")
    return <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-1"><MdSchedule size={12} /> Awaiting</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-1"><MdSchedule size={12} /> Pending</span>;
}

function TypeChip({ type }) {
  const meta = TYPE_META[type] || { icon: MdTune, color: "text-gray-400" };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
      <Icon size={11} /> {type}
    </span>
  );
}

/* ─────────────────────────────────────────
   CONFIG CARD / ROW
───────────────────────────────────────── */
function ConfigCard({ rate, deleting, onEdit, onDelete, last }) {
  const Icon = TYPE_META[rate.maintenance_type]?.icon || MdTune;
  const color = TYPE_META[rate.maintenance_type]?.color || "text-gray-400";
  const label =
    rate.maintenance_type === "FLAT"
      ? `${FLAT_LABELS[rate.flat_type] || rate.flat_type || "—"} · ${rate.resident_type || "OWNER"}`
      : rate.maintenance_type === "SQ_FEET"
        ? `₹${rate.rate_per_sqft}/sq.ft`
        : "All flats";

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
          {label} · {rate.frequency || "MONTHLY"} · {rate.maintenance_type === "SQ_FEET" ? `₹${Number(rate.rate_per_sqft).toFixed(2)}/sq.ft` : formatMoney(rate.amount)}
        </p>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-secondary shrink-0 mr-1">
        <input
          type="checkbox"
          checked={!!rate.is_active}
          onChange={() => onEdit({ ...rate, is_active: !rate.is_active })}
          className="accent-emerald-500"
        />
        Active
      </label>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onEdit(rate)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors"
          style={{ borderColor: "var(--glass-border)" }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(rate)}
          disabled={deleting === rate.id}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-400/30 hover:bg-red-500/10 transition-colors inline-flex items-center gap-1"
        >
          {deleting === rate.id ? <Spinner size={12} /> : <MdDelete size={13} />} Delete
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   CONFIG FORM (modal body)
───────────────────────────────────────── */
function ConfigForm({ initial, onClose, onSaved }) {
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
  }, [initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
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
      toast.success(res.action === "created" ? "Configuration created" : "Configuration updated");
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type selector */}
      <div>
        <Label>Billing method</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MAINTENANCE_TYPES.map((mt) => (
            <button
              type="button"
              key={mt.value}
              onClick={() => setType(mt.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${type === mt.value ? "border-indigo-500 bg-indigo-500/10" : ""}`}
              style={{ borderColor: type === mt.value ? undefined : "var(--glass-border)" }}
            >
              <p className="text-sm font-bold">{mt.label}</p>
              <p className="text-[11px] text-secondary mt-0.5">{mt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Name (optional)</Label>
        <input className={inputCls} style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Maintenance" />
      </div>

      {type === "LUMPSUM" && (
        <div>
          <Label>Amount (₹) for every flat *</Label>
          <input type="number" min="0" className={inputCls} style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 3000" required />
        </div>
      )}

      {type === "FLAT" && (
        <>
          {flatTypesLoading ? (
            <p className="text-xs text-secondary">Loading flat types…</p>
          ) : flatOptions.length === 0 ? (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <MdOutlineErrorOutline size={12} /> No flats exist in this society yet, so no flat type can be selected.
            </p>
          ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Flat type *</Label>
              <Select
                options={flatOptions.map((f) => ({ value: f, label: FLAT_LABELS[f] || f }))}
                value={flatType || flatOptions[0]}
                onChange={(e) => setFlatType(e.target.value)}
              />
            </div>
            <div>
              <Label>Who pays? *</Label>
              <Select
                options={RESIDENT_TYPES.map((r) => ({ value: r, label: r === "OWNER" ? "Owner" : "Tenant" }))}
                value={residentType}
                onChange={(e) => setResidentType(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Amount (₹) for {FLAT_LABELS[flatType || flatOptions[0]] || flatType || flatOptions[0]} *</Label>
            <input type="number" min="0" className={inputCls} style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 3500" required />
          </div>
          </>
          )}
        </>
      )}

      {type === "SQ_FEET" && (
        <div>
          <Label>Rate per sq.ft (₹) *</Label>
          <input type="number" min="0" step="0.01" className={inputCls} style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }} value={ratePerSqft} onChange={(e) => setRatePerSqft(e.target.value)} placeholder="e.g. 2.5" required />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Frequency</Label>
          <Select
            options={FREQUENCIES.map((f) => ({ value: f, label: f }))}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-emerald-500" />
            Active
          </label>
        </div>
      </div>

      <div>
        <Label>Description (optional)</Label>
        <textarea rows={2} className={inputCls} style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--glass-border)" }}>
        <button type="button" onClick={onClose} className={btnGhost} style={{ borderColor: "var(--glass-border)" }}>Cancel</button>
        <button
          type="submit"
          disabled={saving}
          className="sa-add-btn sa-add-pill"
          style={{ opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
        >
          <span className="sa-pill-blob sa-pill-blob1" />
          <span className="sa-pill-inner">
            {saving ? <Spinner size={16} /> : <MdAdd size={16} />}
            <span>{initial?.id ? "Update" : "Save Configuration"}</span>
          </span>
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────
   GENERATE MODAL WITH ELIGIBLE RESIDENTS PREVIEW
───────────────────────────────────────── */
function GenerateModal({ configs, onClose, onGenerated }) {
  const getDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  };

  const [billingMonth, setBillingMonth] = useState(currentMonthLabel());
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [selected, setSelected] = useState(() =>
    configs.filter((c) => c.is_active).map((c) => c.id)
  );
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [searchResident, setSearchResident] = useState("");

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Live preview fetch whenever billing month, selected rates, or due date change
  useEffect(() => {
    let active = true;
    const fetchPreview = async () => {
      if (!billingMonth.trim()) {
        setPreview(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const res = await maintenanceService.previewMaintenanceBills({
          billing_month: billingMonth.trim(),
          rate_ids: selected,
          due_date: dueDate,
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
  }, [billingMonth, selected, dueDate]);

  const handleGenerate = async () => {
    if (!billingMonth.trim()) return;
    setGenerating(true);
    try {
      const res = await maintenanceService.generateMaintenanceBills({
        billing_month: billingMonth.trim(),
        rate_ids: selected,
        due_date: dueDate,
      });
      const genCount = res?.summary?.generated || 0;
      toast.success(`Successfully generated ${genCount} maintenance bill(s)!`);
      onGenerated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Generation failed");
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
          maxWidth: 780,
          background: "var(--card-bg, #0f172a)",
          border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
          borderRadius: 22,
          maxHeight: "90vh",
          overflowY: "auto",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 20px rgba(37,99,235,0.15)",
          animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 26px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(37,99,235,0.35)", flexShrink: 0 }}>
              <MdReceiptLong size={24} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                Generate Maintenance Bills
              </h3>
              <p style={{ fontSize: 12, color: "#38bdf8", margin: "2px 0 0", fontWeight: 600 }}>
                Review eligible residents, specify due date, and dispatch bills
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

        <div style={{ padding: "20px 26px 26px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
          {/* Top Inputs: Billing Month & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Billing Month</Label>
              <input
                className={inputCls}
                style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                placeholder="e.g. September 2026"
              />
              <span className="text-[11px] text-secondary mt-1 block">Month name and year for the statement</span>
            </div>
            <div>
              <Label>Due Date (Last Date to Pay) *</Label>
              <div style={{ position: "relative" }}>
                <input
                  type="date"
                  className={inputCls}
                  style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)", colorScheme: "dark" }}
                  value={dueDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 block">Residents can pay without late penalty until this date</span>
            </div>
          </div>

          {/* Rate Configurations to Apply */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Label>Configurations to Apply</Label>
              <span className="text-xs text-secondary">{selected.length} of {billable.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {billable.map((c) => {
                const isSel = selected.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2.5 rounded-xl border px-3 py-2 cursor-pointer transition-all"
                    style={{
                      borderColor: isSel ? "rgba(59,130,246,0.5)" : "var(--glass-border)",
                      background: isSel ? "rgba(59,130,246,0.12)" : "var(--card-inner-bg)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(c.id)}
                      className="accent-indigo-500 rounded"
                    />
                    <TypeChip type={c.maintenance_type} />
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      {c.name || c.maintenance_type}
                      {c.maintenance_type === "FLAT" && <span className="text-secondary font-medium"> ({c.flat_type})</span>}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-400">
                      {c.maintenance_type === "SQ_FEET" ? `₹${c.rate_per_sqft}` : formatMoney(c.amount)}
                    </span>
                  </label>
                );
              })}
              {billable.length === 0 && (
                <p className="text-xs text-amber-400">No active billable configurations. Create one to enable generation.</p>
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
                    Eligible Residents Preview
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
                    {preview.billable_count} to bill
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
                    {preview.already_billed_count} already generated
                  </span>
                )}
              </div>

              {preview && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Total Amount:</span>
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
                className={inputCls}
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
                placeholder="Search by resident name, flat number, or block..."
              />
            </div>

            {/* Residents Preview List / Table */}
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Spinner size={22} />
                <span className="text-xs text-secondary">Loading eligible residents...</span>
              </div>
            ) : filteredResidents.length === 0 ? (
              <div className="text-center py-8 text-secondary">
                <MdOutlineErrorOutline size={26} className="mx-auto mb-1 opacity-40" />
                <p className="text-xs font-semibold">
                  {preview?.eligible_count === 0
                    ? "No eligible owner flats match the selected configurations."
                    : "No residents matched your search query."}
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
                      <th style={{ padding: "8px 12px" }}>Flat / Unit</th>
                      <th style={{ padding: "8px 12px" }}>Resident (Owner)</th>
                      <th style={{ padding: "8px 12px" }}>Applied Rate</th>
                      <th style={{ padding: "8px 12px" }}>Amount</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Status</th>
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
                            Block {r.block_name} {r.flat_type && `· ${r.flat_type}`}
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
                              Already Billed
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
                              Ready to Bill
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
              onClick={onClose}
              className="sa-btn sa-btn-ghost"
              style={{ borderRadius: 12, padding: "9px 18px", fontSize: 13 }}
            >
              Cancel
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || !preview || preview.billable_count === 0}
              className="sa-add-btn sa-add-pill"
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
                    ? "Generating Bills..."
                    : `Generate ${preview?.billable_count || 0} Bills (${formatMoney(preview?.total_amount || 0)})`}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────
   BILLS TAB
───────────────────────────────────────── */
function BillsTab({ billingMonth, setBillingMonth, onView }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (billingMonth) params.billing_month = billingMonth;
      if (status) params.status = status;
      const data = await maintenanceService.getMaintenanceBills(params);
      setBills(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [billingMonth, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          className={`${inputCls} sm:w-56`}
          style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
          value={billingMonth}
          onChange={(e) => setBillingMonth(e.target.value)}
          placeholder="Filter by month"
        />
        <Select
          options={[{ value: "", label: "All statuses" }, { value: "PENDING", label: "Pending" }, { value: "PAID", label: "Paid" }, { value: "PENDING_VERIFICATION", label: "Awaiting" }]}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="sm:w-48"
        />
        <button onClick={load} className={btnGhost} style={{ borderColor: "var(--glass-border)" }}><MdRefresh size={15} /> Refresh</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : bills.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-secondary">
          <MdReceiptLong size={40} className="opacity-30" />
          <p className="text-sm">No maintenance bills found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]" style={{ color: "var(--text-primary)" }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-secondary">
                <th className="py-2 pr-3">Bill / Flat</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Month</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Due</th>
                <th className="py-2 text-right">View</th>
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
                  <td className="py-3 pr-3">{b.billing_month}</td>
                  <td className="py-3 pr-3 font-bold">{formatMoney(b.amount)}</td>
                  <td className="py-3 pr-3"><StatusPill status={b.status} /></td>
                  <td className="py-3 pr-3 text-xs text-secondary">{b.due_date ? new Date(b.due_date).toLocaleDateString() : "—"}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => onView(b.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors" style={{ borderColor: "var(--glass-border)" }}>
                      <MdVisibility size={13} /> Details
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
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("config");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [billingMonth, setBillingMonth] = useState(currentMonthLabel());
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await maintenanceService.getMaintenanceConfigs();
      setConfigs(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (rate) => { setEditing(rate); setShowForm(true); };

  const handleDelete = async (rate) => {
    if (!window.confirm(`Delete "${rate.name || rate.maintenance_type}"? If used by bills it will be deactivated.`)) return;
    setDeleting(rate.id);
    try {
      const res = await maintenanceService.deleteMaintenanceConfig(rate.id);
      toast.success(res.message || "Deleted");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const activeCount = configs.filter((c) => c.is_active).length;
  const sqftCount = configs.filter((c) => c.maintenance_type === "SQ_FEET").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>Maintenance Management</h1>
          <p className="text-sm text-secondary">Configure rates, generate bills and track them.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openAdd}
            className="sa-add-btn sa-add-pill w-full sm:w-auto justify-center shrink-0"
            style={{ fontWeight: 700 }}
          >
            <span className="sa-pill-blob sa-pill-blob1" />
            <span className="sa-pill-inner">
              <MdAdd size={18} />
              <span>New Configuration</span>
            </span>
          </button>
        </div>
      </div>

      {/* Compact stat strip */}
      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold" style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)", color: "var(--text-primary)" }}>
          <MdTune size={13} className="text-indigo-500" /> {configs.length} configurations
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold" style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)", color: "var(--text-primary)" }}>
          <MdCheckCircle size={13} className="text-emerald-500" /> {activeCount} active
        </span>
        {sqftCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold" style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)", color: "var(--text-primary)" }}>
            <MdDashboard size={13} className="text-amber-500" /> {sqftCount} per-sq.ft
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
        <button
          onClick={() => setTab("config")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === "config" ? "border-indigo-500 text-indigo-500" : "border-transparent text-secondary"}`}
        >
          <span className="inline-flex items-center gap-1.5"><MdTune size={15} /> Configure</span>
        </button>
        <button
          onClick={() => setTab("bills")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === "bills" ? "border-indigo-500 text-indigo-500" : "border-transparent text-secondary"}`}
        >
          <span className="inline-flex items-center gap-1.5"><MdReceiptLong size={15} /> Generated Bills</span>
        </button>
      </div>

      {tab === "config" ? (
        <div className="flex flex-col gap-4">
          <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-2">
            <p className="text-sm text-secondary">{configs.length} configuration(s) — {activeCount} active. Uses standard MaintenanceRates + bills.</p>
            <button
              onClick={() => setShowGenerate(true)}
              className="sa-add-btn sa-add-pill shrink-0"
              style={{ fontWeight: 700 }}
            >
              <span className="sa-pill-blob sa-pill-blob1" />
              <span className="sa-pill-inner">
                <MdBuild size={16} />
                <span>Generate Bills</span>
              </span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size={28} /></div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-secondary">
              <MdTune size={40} className="opacity-30" />
              <p className="text-sm">No maintenance configurations yet</p>
              <button onClick={openAdd} className={btnGhost} style={{ borderColor: "var(--glass-border)" }}>Add your first configuration</button>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)" }}>
              {configs.map((r) => (
                <ConfigCard key={r.id} rate={r} deleting={deleting} onEdit={openEdit} onDelete={handleDelete} last={configs[configs.length - 1].id === r.id} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <BillsTab billingMonth={billingMonth} setBillingMonth={setBillingMonth} onView={setDetailId} />
      )}

      {/* Config form modal */}
      {showForm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null); } }}
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
              maxWidth: 620,
              background: "var(--card-bg, #0f172a)",
              border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
              borderRadius: 20,
              maxHeight: "90vh",
              overflowY: "auto",
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 20px rgba(37,99,235,0.15)",
              animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(124,58,237,0.35)", flexShrink: 0 }}>
                  <MdTune size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 17, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                    {editing?.id ? "Edit Configuration" : "New Maintenance Configuration"}
                  </h3>
                  <p style={{ fontSize: 12, color: "#a78bfa", margin: "2px 0 0", fontWeight: 600 }}>
                    Configure maintenance rules, flat rates & billing frequency
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--glass-border, rgba(255,255,255,0.12))", background: "var(--card-inner-bg, rgba(255,255,255,0.06))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
              >
                <MdClose size={17} />
              </button>
            </div>

            <div style={{ height: 1, background: "var(--glass-border, rgba(255,255,255,0.08))", margin: "16px 0 0" }} />

            <div style={{ padding: "20px 24px 28px" }}>
              <ConfigForm
                key={editing?.id || "new"}
                initial={editing}
                onClose={() => { setShowForm(false); setEditing(null); }}
                onSaved={load}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Generate modal */}
      {showGenerate && (
        <GenerateModal configs={configs} onClose={() => setShowGenerate(false)} onGenerated={load} />
      )}

      {/* Detail modal */}
      {detailId && (
        <BillDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   DETAIL MODAL
───────────────────────────────────────── */
function BillDetailModal({ id, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await maintenanceService.getMaintenanceBillDetail(id);
        setDetail(data);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load bill");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 20px rgba(37,99,235,0.15)",
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
                Bill Details
              </h3>
              <p style={{ fontSize: 12, color: "#34d399", margin: "2px 0 0", fontWeight: 600 }}>
                {bill ? `Invoice #${bill.id} · ${bill.billing_month || "Current"}` : "Maintenance Invoice"}
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
            <p className="text-sm text-secondary text-center py-6">Bill not found</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border p-4 flex items-center justify-between" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                <div>
                  <p className="text-xs text-secondary">Amount</p>
                  <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{formatMoney(bill.amount)}</p>
                </div>
                <StatusPill status={bill.status} />
              </div>

              <Row label="Title" value={bill.title} />
              <Row label="Flat" value={bill.Flat ? `${bill.Flat.flat_number}` : "—"} />
              <Row label="Billing month" value={bill.billing_month} />
              <Row label="Due date" value={bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "—"} />

              {rate && (
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Configuration</p>
                  <Row label="Method" value={rate.maintenance_type} />
                  {rate.maintenance_type === "FLAT" && <Row label="Flat type" value={rate.flat_type} />}
                  {rate.name && <Row label="Name" value={rate.name} />}
                </div>
              )}

              {calc && (
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Calculation snapshot</p>
                  <Row label="Method" value={calc.maintenance_type || "—"} />
                  {calc.flat_type && <Row label="Flat type" value={calc.flat_type} />}
                  {calc.maintenance_type === "SQ_FEET" && (
                    <>
                      <Row label="Area" value={calc.area_sqft ? `${calc.area_sqft} sq.ft` : "—"} />
                      <Row label="Rate" value={calc.rate_per_sqft ? `₹${calc.rate_per_sqft}/sq.ft` : "—"} />
                      <Row label="Calculation" value={calc.calculation || "—"} />
                    </>
                  )}
                  {calc.maintenance_type !== "SQ_FEET" && (
                    <Row label="Configured amount" value={calc.configured_amount != null ? formatMoney(calc.configured_amount) : "—"} />
                  )}
                </div>
              )}

              {owner && (
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Responsible owner</p>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{owner.User?.name || `User #${owner.user_id}`}</p>
                  {owner.User?.mobile && <p className="text-xs text-secondary">{owner.User.mobile}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t mt-4" style={{ borderColor: "var(--glass-border)" }}>
            <button onClick={onClose} className={btnPrimary} style={{ borderRadius: 12 }}>Close</button>
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
