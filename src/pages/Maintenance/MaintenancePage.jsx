import { useEffect, useState, useCallback } from "react";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdClose, MdDelete, MdRefresh,
  MdReceiptLong, MdTune, MdOutlineErrorOutline, MdCheckCircle, MdSchedule,
  MdVisibility, MdBuild, MdDashboard, MdBusiness,
} from "react-icons/md";
import { toast } from "react-toastify";
import maintenanceService from "../../services/maintenanceService";
import Select from "../../components/common/Select";

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
        <p className="text-[11px] text-amber-500 mt-2 flex items-center gap-1">
          <MdOutlineErrorOutline size={12} /> Per Sq.Ft billing is saved but bill generation is disabled until area data is available.
        </p>
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
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? <Spinner /> : <MdAdd size={16} />} {initial?.id ? "Update" : "Save Configuration"}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────
   GENERATE MODAL
───────────────────────────────────────── */
function GenerateModal({ configs, onClose, onGenerated }) {
  const [billingMonth, setBillingMonth] = useState(currentMonthLabel());
  const [selected, setSelected] = useState(() =>
    configs.filter((c) => c.is_active && c.maintenance_type !== "SQ_FEET").map((c) => c.id)
  );
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleGenerate = async () => {
    if (!billingMonth.trim()) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await maintenanceService.generateMaintenanceBills({ billing_month: billingMonth.trim(), rate_ids: selected });
      setResult(res.summary);
      toast.success(`Generated ${res.summary.generated} bill(s)`);
      onGenerated();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const billable = configs.filter((c) => c.is_active && c.maintenance_type !== "SQ_FEET");
  const sqft = configs.filter((c) => c.is_active && c.maintenance_type === "SQ_FEET");

  return (
    <div className="fixed inset-0 flex items-center justify-center z-100 p-4" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={{ background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", boxShadow: "var(--shadow-glass)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Generate Maintenance Bills</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5"><MdClose size={20} /></button>
        </div>

        <Label>Billing month</Label>
        <input
          className={`${inputCls} mb-4`}
          style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
          value={billingMonth}
          onChange={(e) => setBillingMonth(e.target.value)}
          placeholder="e.g. September 2026"
        />

        {billable.length === 0 && (
          <p className="text-sm text-amber-500 mb-3">Create at least one active Lumpsum or By-Flat-Type configuration to generate bills.</p>
        )}

        <Label>Configurations to apply</Label>
        <div className="flex flex-col gap-2 mb-3">
          {billable.map((c) => (
            <label key={c.id} className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer" style={{ borderColor: "var(--glass-border)" }}>
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="accent-indigo-500" />
              <TypeChip type={c.maintenance_type} />
              <span className="text-sm font-bold flex-1">{c.name || c.maintenance_type}
                {c.maintenance_type === "FLAT" && <span className="text-secondary font-medium"> ({c.flat_type})</span>}
              </span>
              <span className="text-sm font-bold">{c.maintenance_type === "SQ_FEET" ? `₹${c.rate_per_sqft}` : formatMoney(c.amount)}</span>
            </label>
          ))}
          {billable.length === 0 && <p className="text-xs text-secondary">No billable configurations.</p>}
        </div>

        {sqft.length > 0 && (
          <p className="text-[11px] text-amber-500 mb-3 inline-flex items-center gap-1">
            <MdOutlineErrorOutline size={12} /> {sqft.length} Per Sq.Ft config(s) saved but cannot be generated (no area data).
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--glass-border)" }}>
          <button onClick={onClose} className={btnGhost} style={{ borderColor: "var(--glass-border)" }}>Close</button>
          <button onClick={handleGenerate} disabled={generating || selected.length === 0} className={btnPrimary}>
            {generating ? <Spinner /> : <MdBuild size={16} />} Generate Bills
          </button>
        </div>
      </div>
    </div>
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
          <button onClick={openAdd} className={btnPrimary}><MdAdd size={16} /> New Configuration</button>
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
            <MdDashboard size={13} className="text-amber-500" /> {sqftCount} per-sq.ft (not billable)
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
            <button onClick={() => setShowGenerate(true)} className={btnPrimary}><MdBuild size={16} /> Generate Bills</button>
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
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-100 p-4" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)" }}>
          <div className="rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6" style={{ background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", boxShadow: "var(--shadow-glass)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing?.id ? "Edit Configuration" : "New Configuration"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-black/5"><MdClose size={20} /></button>
            </div>
            <ConfigForm
              key={editing?.id || "new"}
              initial={editing}
              onClose={() => setShowForm(false)}
              onSaved={load}
            />
          </div>
        </div>
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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-100 p-4" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6" style={{ background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", boxShadow: "var(--shadow-glass)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Bill Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5"><MdClose size={20} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={26} /></div>
        ) : !bill ? (
          <p className="text-sm text-secondary text-center py-6">Bill not found</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border p-4 flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
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
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)" }}>
                <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Configuration</p>
                <Row label="Method" value={rate.maintenance_type} />
                {rate.maintenance_type === "FLAT" && <Row label="Flat type" value={rate.flat_type} />}
                {rate.name && <Row label="Name" value={rate.name} />}
              </div>
            )}

            {calc && (
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)" }}>
                <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Calculation snapshot</p>
                <Row label="Method" value={calc.maintenance_type || "—"} />
                {calc.flat_type && <Row label="Flat type" value={calc.flat_type} />}
                <Row label="Configured amount" value={calc.configured_amount != null ? formatMoney(calc.configured_amount) : "—"} />
              </div>
            )}

            {owner && (
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--glass-border)" }}>
                <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Responsible owner</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{owner.User?.name || `User #${owner.user_id}`}</p>
                {owner.User?.mobile && <p className="text-xs text-secondary">{owner.User.mobile}</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button onClick={onClose} className={btnPrimary}>Close</button>
        </div>
      </div>
    </div>
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
