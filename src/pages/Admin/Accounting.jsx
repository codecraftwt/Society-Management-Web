import { useEffect, useState, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  MdOutlineReceiptLong,
  MdAccountBalance,
  MdArrowUpward,
  MdArrowDownward,
  MdSavings,
  MdRefresh,
  MdEdit,
  MdDelete,
  MdAdd,
  MdReportProblem,
  MdViewList,
  MdSearch,
  MdFilterList,
  MdHistoryEdu,
  MdCheckCircle,
  MdClose,
  MdPayments,
  MdBusiness,
  MdCalendarToday,
  MdPerson,
  MdDescription,
  MdOutlineAccountBalanceWallet,
  MdDownload,
  MdPictureAsPdf,
  MdTableChart,
  MdReceipt,
  MdHomeRepairService,
  MdPool,
  MdVisibility,
} from "react-icons/md";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { hasPermission, isAdmin } from "../../utils/permissions";
import API from "../../services/api";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Select from "../../components/common/Select";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";
import Pagination from "../../components/common/Pagination";
import { exportToPDF } from "../../utils/exportPDF";
import { exportToExcel } from "../../utils/exportExcel";
import { getTitleError, getPositiveAmountError, getDescriptionError, getRequiredDateError } from "../../utils/validators";
import {
  getBalance,
  getLedger,
  getChartData,
  getExpenses,
  createExpense,
  updateExpense,
  voidExpense,
  setOpeningBalance,
  getAuditLogs,
} from "../../services/accountingService";

const CURRENCY = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v) || 0);

const TODAY = () => new Date().toISOString().slice(0, 10);

const MONTH_KEYS = {
  Jan: "monthJan", Feb: "monthFeb", Mar: "monthMar", Apr: "monthApr",
  May: "monthMay", Jun: "monthJun", Jul: "monthJul", Aug: "monthAug",
  Sep: "monthSep", Oct: "monthOct", Nov: "monthNov", Dec: "monthDec",
};

const inputStyle = {
  background: "var(--card-inner-bg)",
  border: "1px solid var(--glass-border)",
  color: "var(--text-primary)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
};

const SOURCES = ["", "BILL", "MAINTENANCE", "AMENITY", "EXPENSE", "ADJUSTMENT"];
const MODES = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"];

/* ── SKELETON ── */
function AccountingSkeleton() {
  return (
    <div className="space-y-6 w-full min-w-0 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card/40 border border-glass-border rounded-2xl p-5 space-y-4">
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-8 w-20 bg-white/15 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="bg-card/40 border border-glass-border rounded-2xl p-6 h-80">
        <div className="h-5 w-44 bg-white/10 rounded mb-6" />
        <div className="h-60 w-full bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}

function Field({ label, required, icon: Icon, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-accent" />}
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Modal({ title, icon: Icon = MdOutlineReceiptLong, maxWidth = "max-w-xl", onClose, children }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(true);
  const requestClose = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else onClose();
  };
  return createPortal(
    <>
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto py-8 px-4 animate-fadeIn"
      style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)", zIndex: 1200 }}
      onClick={requestClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl animate-scaleIn my-auto`}
        style={{
          background: "var(--modal-bg)",
          border: "1.5px solid var(--glass-border)",
          boxShadow: "var(--shadow-glass)",
          backdropFilter: "var(--blur)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
          <h3 className="text-base font-bold text-primary flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
              <Icon size={18} />
            </span>
            {title}
          </h3>
          <button
            onClick={requestClose}
            className="w-8 h-8 rounded-xl bg-card-inner-bg hover:bg-white/10 text-secondary hover:text-primary flex items-center justify-center transition-colors"
          >
            <MdClose size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">{children}</div>
      </div>
      </div>
      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose(); }}
      />
    </>,
    document.body
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════ */
export default function Accounting({ initialTab = "overview" }) {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.activeRole === "SUPER_ADMIN";
  const isDeleteAllowed = isAdmin(user) || hasPermission(user, "accounting", "delete");
  const isManageOpening = isAdmin(user) || hasPermission(user, "accounting", "manage_opening_balance");

  const [tab, setTab] = useState(initialTab || "overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);
  const [chart, setChart] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());

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

  const load = async (customYear, customSocId) => {
    const targetSocId = customSocId !== undefined ? customSocId : societyId;
    if (isSuperAdmin && (!targetSocId || targetSocId === "ALL")) {
      setLoading(false);
      setBalance(null);
      setChart(null);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const targetYear = customYear ?? year;
      const [bal, ch] = await Promise.all([
        getBalance(),
        getChartData({ year: targetYear, ...(targetSocId ? { society_id: targetSocId } : {}) }),
      ]);
      setBalance(bal);
      setChart(ch);
    } catch (err) {
      console.error("Failed to load accounting data", err);
      setError("Failed to load accounting data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocietyChange = (e) => {
    const val = e.target.value;
    setSocietyId(val);
    localStorage.setItem("superadmin_society_filter", val);
    load(year, val);
  };

  useEffect(() => {
    load();
  }, [year]);

  if (loading) return <AccountingSkeleton />;

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto my-8">
        <div className="flex items-center gap-3">
          <MdReportProblem size={24} className="shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-semibold shrink-0">
          <MdRefresh size={16} /> Retry
        </button>
      </div>
    );
  }

  const b = balance || {};
  const months = chart?.months || [];

  const kpis = [
    {
      label: "Opening Balance",
      value: CURRENCY(b.opening_balance),
      sub: b.opening_balance_effective_date ? `Effective ${b.opening_balance_effective_date}` : "Not yet set",
      icon: MdSavings,
      kpiClass: "ad-kpi ad-kpi--opening",
    },
    {
      label: "Total Income",
      value: CURRENCY(b.total_income ?? b.total_credit),
      sub: `Bills ${CURRENCY(b.bill_income)} · Maint ${CURRENCY(b.maintenance_income)} · Amenities ${CURRENCY(b.amenity_income)}`,
      icon: MdArrowUpward,
      kpiClass: "ad-kpi ad-kpi--income",
    },
    {
      label: "Total Expenses",
      value: CURRENCY(b.total_expenses ?? b.total_debit),
      sub: b.void_reversals ? `Includes ${CURRENCY(b.void_reversals)} void reversals` : "Money out this period",
      icon: MdArrowDownward,
      kpiClass: "ad-kpi ad-kpi--expense",
    },
    {
      label: "Current Balance",
      value: CURRENCY(b.current_balance),
      sub: `${b.society_name || "Society"} — running cash position`,
      icon: MdAccountBalance,
      kpiClass: "ad-kpi ad-kpi--balance",
    },
  ];

  const allTabs = [
    { id: "overview", label: "Overview", icon: MdAccountBalance },
    { id: "ledger", label: "Cash Book Ledger", module: "general_ledger", icon: MdOutlineReceiptLong },
    { id: "expenses", label: "Expense Tracking", module: "expenses", icon: MdPayments },
    { id: "audit", label: "Financial Audit Log", module: "financial_audit_log", icon: MdHistoryEdu },
    { id: "opening", label: "Opening Balance", icon: MdSavings },
  ];
  const tabs = allTabs.filter((t) => !t.module || isAdmin(user) || hasPermission(user, t.module, "view"));
  const activeTab = tabs.some((t) => t.id === tab) ? tab : "overview";

  const slidingTabItems = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    icon: t.icon ? <t.icon size={16} /> : null,
  }));

  return (
    <div className="space-y-6 w-full min-w-0 max-w-400 mx-auto pb-8">
      {/* ── UNIFIED HEADER BAR ── */}
      <div
        className="ad-page-header flex flex-col gap-3.5 p-4 sm:p-5 rounded-2xl border"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Row 1: Title & Icon only (Clean, without crowded subtitle) */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-accent shrink-0"
            style={{
              background: "var(--accent-soft, rgba(99,102,241,0.18))",
              border: "1px solid var(--accent-light, #818cf8)",
            }}
          >
            <MdOutlineReceiptLong size={22} />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-primary flex items-center gap-2 m-0">
            Account & Cash Management
          </h1>
        </div>

        {/* Row 2: Toggle buttons (SlidingTabs) + Year dropdown + Reload button in one row */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap w-full pt-1">
          <div className="flex items-center overflow-x-auto max-w-full pb-0.5" style={{ scrollbarWidth: "none" }}>
            <SlidingTabs
              items={slidingTabItems}
              value={activeTab}
              onChange={setTab}
            />
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            <div style={{ width: 125 }}>
              <Select
                value={year}
                onChange={(e) => {
                  const newYear = Number(e.target.value);
                  setYear(newYear);
                  load(newYear, societyId);
                }}
                className="text-xs font-semibold"
                style={{
                  height: 38,
                  background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                  borderRadius: 12,
                }}
                options={[
                  new Date().getFullYear() - 2,
                  new Date().getFullYear() - 1,
                  new Date().getFullYear(),
                  new Date().getFullYear() + 1,
                ].map((y) => ({
                  value: y,
                  label: `Year ${y}`,
                }))}
              />
            </div>

            <button
              onClick={load}
              title="Refresh data"
              className="inline-flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0"
              style={{
                width: 38,
                height: 38,
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
              <MdRefresh size={18} className={loading ? "animate-spin text-accent" : "text-secondary"} />
            </button>
          </div>
        </div>
      </div>

      {/* SuperAdmin: must select a society first */}
      {isSuperAdmin && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "var(--card-inner-bg)", padding: "8px 14px", borderRadius: 14, border: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 220 }}>
            <MdBusiness size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Select Society</span>
            <Select
              value={societyId}
              onChange={handleSocietyChange}
              style={{ height: 38, fontSize: 13, fontWeight: 700, flex: 1, border: "1.5px solid var(--accent-alpha,rgba(107,70,193,0.25))" }}
            >
              <option value="">— Choose a Society —</option>
              {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          {(!societyId || societyId === "ALL") ? (
            <span style={{ fontSize: 12, color: "var(--stat-amber-color)", fontWeight: 700 }}>
              💡 Select a society to view its accounting
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--stat-green-color)", fontWeight: 700 }}>
              ✓ Working on: {societies.find((s) => String(s.id) === String(societyId))?.name || ""}
            </span>
          )}
        </div>
      )}

      {isSuperAdmin && (!societyId || societyId === "ALL") && (
        <div className="rounded-xl border p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)" }}>
          <MdBusiness size={36} className="opacity-30" />
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Select a society to continue</p>
          <p className="text-xs text-secondary">Balance, cash book, expenses, and audit logs need a society context.</p>
        </div>
      )}

      {/* ═══════════ OVERVIEW ═══════════ */}
      {!isSuperAdmin || (societyId && societyId !== "ALL") ? (<>
      {activeTab === "overview" && (
        <OverviewTab b={b} months={months} year={year} onOpenTab={setTab} />
      )}

      {/* ═══════════ LEDGER (CASH BOOK) ═══════════ */}
      {activeTab === "ledger" && (
        <LedgerTab b={b} onNeedsBalance={load} onResetTab={() => setTab("overview")} />
      )}

      {/* ═══════════ EXPENSES ═══════════ */}
      {activeTab === "expenses" && (
        <ExpensesTab isDeleteAllowed={isDeleteAllowed} />
      )}

      {/* ═══════════ OPENING BALANCE ═══════════ */}
      {activeTab === "opening" && (
        <OpeningTab b={b} isManageOpening={isManageOpening} onChanged={load} />
      )}

      {/* ═══════════ FINANCIAL AUDIT LOG ═══════════ */}
      {activeTab === "audit" && <AuditLogTab societyName={b.society_name} />}
      </>): null}
    </div>
  );
}

/* ── OVERVIEW TAB ─────────────────────────────────────────────────────────── */
function OverviewTab({ b, months, year, onOpenTab }) {
  const { t } = useLang();
  const creditedInLabel = t("chartCreditedIn");
  const debitedOutLabel = t("chartDebitedOut");
  const chartData = months.map((m) => ({
    name: t(MONTH_KEYS[m.label] || m.label),
    credited: m.credited,
    debited: m.debited,
  }));

  const glassCardStyle = {
    background: "var(--card-bg, rgba(15, 23, 42, 0.65))",
    border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  return (
    <div className="space-y-6">
      {/* ── Dashboard KPI Cards with Uniform Glassmorphism & Distinct Text Colors ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Opening Balance */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
          style={glassCardStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Opening Balance
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "rgba(99, 102, 241, 0.14)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                color: "#818cf8",
              }}
            >
              <MdSavings size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-indigo-400 tracking-tight">
              {CURRENCY(b.opening_balance)}
            </div>
            <p className="text-[11px] text-secondary mt-1.5 line-clamp-1">
              {b.opening_balance_effective_date ? `Effective ${b.opening_balance_effective_date}` : "Initial balance reserve"}
            </p>
          </div>
        </div>

        {/* 2. Total Income */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
          style={glassCardStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Total Income
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "rgba(16, 185, 129, 0.14)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
              }}
            >
              <MdArrowUpward size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight">
              {CURRENCY(b.total_income ?? b.total_credit)}
            </div>
            <p className="text-[11px] text-secondary mt-1.5 line-clamp-1">
              Bills {CURRENCY(b.bill_income)} · Maint {CURRENCY(b.maintenance_income)} · Amenities {CURRENCY(b.amenity_income)}
            </p>
          </div>
        </div>

        {/* 3. Total Expenses */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
          style={glassCardStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Total Expenses
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "rgba(244, 63, 94, 0.14)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fb7185",
              }}
            >
              <MdArrowDownward size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-rose-400 tracking-tight">
              {CURRENCY(b.total_expenses ?? b.total_debit)}
            </div>
            <p className="text-[11px] text-secondary mt-1.5 line-clamp-1">
              {b.void_reversals ? `Includes ${CURRENCY(b.void_reversals)} void reversals` : "Money out this period"}
            </p>
          </div>
        </div>

        {/* 4. Current Balance */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
          style={glassCardStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
              Current Balance
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "rgba(168, 85, 247, 0.14)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                color: "#c084fc",
              }}
            >
              <MdAccountBalance size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-purple-400 tracking-tight">
              {CURRENCY(b.current_balance)}
            </div>
            <p className="text-[11px] text-secondary mt-1.5 line-clamp-1">
              {b.society_name || "Society"} — running cash position
            </p>
          </div>
        </div>
      </div>

      {/* Income breakdown with uniform glassmorphism & distinct text colors */}
      <div
        className="rounded-2xl p-6 shadow-sm border"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-primary">Revenue & Income Inflow</h2>
            <p className="text-xs text-secondary">Categorized breakdown of all money credited to society accounts</p>
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full border"
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              borderColor: "rgba(16, 185, 129, 0.3)",
              color: "#34d399",
            }}
          >
            Total {CURRENCY(b.total_income ?? b.total_credit)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Utility & Flat Bills */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
            style={glassCardStyle}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                Utility & Flat Bills
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: "rgba(14, 165, 233, 0.14)",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  color: "#38bdf8",
                }}
              >
                <MdReceipt size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-sky-400">{CURRENCY(b.bill_income)}</div>
              <p className="text-[11px] text-secondary mt-1">Water, electricity, diesel & common utility bills</p>
            </div>
          </div>

          {/* Maintenance Fees */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
            style={glassCardStyle}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                Maintenance Fees
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: "rgba(20, 184, 166, 0.14)",
                  border: "1px solid rgba(20, 184, 166, 0.3)",
                  color: "#2dd4bf",
                }}
              >
                <MdHomeRepairService size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-teal-400">{CURRENCY(b.maintenance_income)}</div>
              <p className="text-[11px] text-secondary mt-1">Monthly society maintenance collections</p>
            </div>
          </div>

          {/* Amenity Bookings */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
            style={glassCardStyle}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Amenity Bookings
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: "rgba(245, 158, 11, 0.14)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                }}
              >
                <MdPool size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-400">{CURRENCY(b.amenity_income)}</div>
              <p className="text-[11px] text-secondary mt-1">Clubhouse, hall & sports amenities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-glass-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-primary">{t("chartCashFlowTitle")}</h2>
            <p className="text-xs text-secondary">{t("chartCashFlowSubtitle", { year })}</p>
          </div>
          <button onClick={() => onOpenTab("ledger")} className="btn-primary flex items-center gap-1.5 text-xs font-semibold px-4 py-2">
            <MdViewList size={16} /> {t("chartOpenLedger")}
          </button>
        </div>
        <div className="w-full h-72 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={{ stroke: "var(--glass-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={{ stroke: "var(--glass-border)" }}
                tickLine={false}
              />
              <Tooltip
                formatter={(v, name) => [CURRENCY(v), name]}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={{
                  background: "var(--card-bg)",
                  borderColor: "var(--glass-border)",
                  borderRadius: "12px",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="credited" name={creditedInLabel} fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="debited" name={debitedOutLabel} fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ── DETAIL COMPONENT FOR MODALS (2 or 3 in one row) ─────────────────────── */
function DetailItem({ label, value, tone }) {
  return (
    <div className="bg-card-inner-bg border border-glass-border/70 rounded-xl p-3 flex flex-col justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{label}</span>
      <span
        className={`text-sm font-bold mt-1 wrap-break-word ${
          tone === "green"
            ? "text-emerald-500"
            : tone === "red"
            ? "text-rose-500"
            : tone === "blue"
            ? "text-blue-500"
            : "text-primary"
        }`}
      >
        {value === null || value === undefined || value === "" ? <span className="text-secondary font-normal">—</span> : value}
      </span>
    </div>
  );
}

function LedgerDetailsModal({ row, onClose }) {
  const d = row.detail || {};
  const isCredit = row.type === "CREDIT";
  const billLink = (row.source === "BILL" || row.source === "MAINTENANCE") && d.title;
  const amenity = row.source === "AMENITY" && d.amenity_name;
  const expense = row.source === "EXPENSE";

  const items = [];
  if (isCredit && billLink) {
    items.push({ label: "Paid By", value: d.payer_name });
    items.push({ label: "Flat Number", value: d.flat_number });
    items.push({ label: "Bill Title", value: d.title });
    items.push({ label: "Bill Type", value: d.bill_type });
    items.push({ label: "Billing Month", value: d.billing_month });
    items.push({ label: "Due Date", value: d.due_date });
  } else if (isCredit && amenity) {
    items.push({ label: "Booked By", value: d.booker_name });
    items.push({ label: "Amenity Name", value: d.amenity_name });
    items.push({ label: "Booked Date", value: d.booked_date });
  } else if (expense) {
    items.push({ label: "Paid To", value: d.pay_to });
    items.push({ label: "Expense Reason", value: d.reason });
    items.push({ label: "Payment Mode", value: d.payment_mode });
    items.push({ label: "Payment Date", value: d.payment_date });
  }

  items.push({
    label: isCredit ? "Credit Amount" : "Debit Amount",
    value: CURRENCY(row.amount),
    tone: isCredit ? "green" : "red",
  });
  items.push({ label: "Running Balance", value: CURRENCY(row.running_balance), tone: "blue" });
  items.push({ label: "Entry Date", value: row.entry_date ? String(row.entry_date).slice(0, 10) : null });
  items.push({ label: "Status", value: row.status === "REVERSED" ? "Reversed" : "Active" });
  items.push({ label: "Sourced By", value: row.created_by_name ? `${row.created_by_name}${row.created_by_role ? ` (${row.created_by_role})` : ""}` : (row.created_by_role || "System") });
  if (row.reversal_of_id) items.push({ label: "Reversal Of ID", value: `#${row.reversal_of_id}` });

  return (
    <Modal
      title={isCredit ? "Cash Book Entry — Credit (Money In)" : "Cash Book Entry — Debit (Money Out)"}
      icon={isCredit ? MdArrowUpward : MdArrowDownward}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-3 p-3 bg-card-inner-bg border border-glass-border rounded-xl">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
              isCredit ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
            }`}
          >
            {isCredit ? "+ CREDIT (IN)" : "− DEBIT (OUT)"}
          </span>
          <span className="text-xs font-bold text-primary bg-card px-2.5 py-1 rounded-lg border border-glass-border">
            {row.source}
          </span>
        </div>
        <span className="text-xs text-secondary font-mono">Entry #{row.id ?? "—"}</span>
      </div>

      {row.description && (
        <div className="p-3 bg-card-inner-bg border border-glass-border rounded-xl">
          <div className="text-[11px] font-semibold uppercase text-secondary">Particulars / Description</div>
          <div className="text-sm font-medium text-primary mt-0.5">{row.description}</div>
        </div>
      )}

      {/* 2 or 3 details per row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <DetailItem key={it.label} label={it.label} value={it.value} tone={it.tone} />
        ))}
      </div>

      {row.status === "REVERSED" && (
        <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          ⚠️ This entry was reversed. Its financial impact has been refunded and the running cash balance reflects the adjustment.
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="btn-soft px-5 py-2 text-xs font-semibold">
          Close Details
        </button>
      </div>
    </Modal>
  );
}

/* ── LEDGER FILTER POPUP MODAL ─────────────────────────────────────────────── */
function LedgerFilterModal({ filters, onApply, onClose }) {
  const { t } = useLang();
  const [draft, setDraft] = useState({
    type: filters.type || "",
    source: filters.source || "",
    from: filters.from || "",
    to: filters.to || "",
    search: filters.search || "",
  });

  const setPreset = (preset) => {
    const now = new Date();
    if (preset === "ALL") {
      setDraft((d) => ({ ...d, from: "", to: "" }));
    } else if (preset === "TODAY") {
      const today = now.toISOString().slice(0, 10);
      setDraft((d) => ({ ...d, from: today, to: today }));
    } else if (preset === "MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setDraft((d) => ({ ...d, from: start, to: end }));
    } else if (preset === "LAST_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      setDraft((d) => ({ ...d, from: start, to: end }));
    } else if (preset === "YEAR") {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
      setDraft((d) => ({ ...d, from: start, to: end }));
    }
  };

  const handleApply = (e) => {
    e.preventDefault();
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    const empty = { type: "", source: "", from: "", to: "", search: "" };
    setDraft(empty);
    onApply(empty);
    onClose();
  };

  return (
    <Modal title="Filter Cash Book Ledger" icon={MdFilterList} maxWidth="max-w-xl" onClose={onClose}>
      <form onSubmit={handleApply} className="space-y-4">
        {/* Quick Date Range Presets */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary block mb-2">
            Quick Date Presets
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "YEAR", label: "This Year" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card-inner-bg border border-glass-border hover:border-accent hover:text-accent transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Type & Source Category (2 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Transaction Direction" icon={MdOutlineReceiptLong}>
            <select
              style={inputStyle}
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            >
              <option value="">{t("accAllTxn")}</option>
              <option value="CREDIT">+ Credits Only (Money In)</option>
              <option value="DEBIT">− Debits Only (Money Out)</option>
            </select>
          </Field>

          <Field label="Category / Source" icon={MdOutlineAccountBalanceWallet}>
            <select
              style={inputStyle}
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            >
              <option value="">{t("accAllSources")}</option>
              {SOURCES.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Date From & Date To (2 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="From Date" icon={MdCalendarToday}>
            <input
              type="date"
              style={inputStyle}
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </Field>

          <Field label="To Date" icon={MdCalendarToday}>
            <input
              type="date"
              style={inputStyle}
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </Field>
        </div>


        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-glass-border">
          <button
            type="button"
            onClick={handleClear}
            className="btn-soft px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
          >
            Clear All
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-soft px-4 py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-6 py-2.5 text-xs font-bold shadow-md"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ── CASH BOOK LEDGER TAB ─────────────────────────────────────────────────── */
function LedgerTab({ b, onNeedsBalance }) {
  const { t } = useLang();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filters, setFilters] = useState({ page: 1, limit: 20, type: "", source: "", from: "", to: "", search: "" });
  const [selected, setSelected] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const load = async (params) => {
    try {
      setLoading(true);
      setErr("");
      const res = await getLedger(params);
      setRows(res.data || []);
      setPagination(res.pagination || {});
    } catch (e) {
      console.error("Failed to load ledger", e);
      setErr("Failed to load the cash book ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filters);
  }, [filters.page, filters.limit]);

  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(filters.search));

  const glassCardStyle = {
    background: "var(--card-bg, rgba(15, 23, 42, 0.65))",
    border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  const applyFilters = (next = {}) => {
    const merged = { ...filters, ...next };
    if (
      next.from !== undefined ||
      next.to !== undefined ||
      next.type !== undefined ||
      next.source !== undefined ||
      next.search !== undefined
    ) {
      merged.page = 1;
    }
    setFilters(merged);
    load(merged);
  };

  const activeFilterCount = [
    filters.type,
    filters.source,
    filters.from,
    filters.to,
  ].filter(Boolean).length;

  if (loading && rows.length === 0) {
    return (
      <div className="bg-card border border-glass-border rounded-2xl p-6 space-y-5 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (err && rows.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-500 flex items-center justify-between gap-4 max-w-2xl mx-auto my-8">
        <p className="font-medium text-sm">{err}</p>
        <button onClick={() => applyFilters()} className="btn-primary px-4 py-2 text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Cash Book Dashboard KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Net Live Balance */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 group"
          style={glassCardStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Net Live Balance</span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "rgba(168, 85, 247, 0.14)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                color: "#c084fc",
              }}
            >
              <MdAccountBalance size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-400 tracking-tight">{CURRENCY(b?.current_balance)}</div>
            <p className="text-[11px] text-secondary mt-1 line-clamp-1">Current available society cash position</p>
          </div>
        </div>

        {/* Total Inflows */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 group"
          style={glassCardStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Total Inflows (Credits)</span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "rgba(16, 185, 129, 0.14)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
              }}
            >
              <MdArrowUpward size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">{CURRENCY(b?.total_income ?? b?.total_credit)}</div>
            <p className="text-[11px] text-secondary mt-1 line-clamp-1">Bills, maintenance & amenity collections</p>
          </div>
        </div>

        {/* Total Outflows */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 group"
          style={glassCardStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Total Outflows (Debits)</span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "rgba(244, 63, 94, 0.14)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fb7185",
              }}
            >
              <MdArrowDownward size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400 tracking-tight">{CURRENCY(b?.total_expenses ?? b?.total_debit)}</div>
            <p className="text-[11px] text-secondary mt-1 line-clamp-1">Operational disbursements & expenses</p>
          </div>
        </div>

        {/* Opening Balance */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 group"
          style={glassCardStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Opening Balance</span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: "rgba(99, 102, 241, 0.14)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                color: "#818cf8",
              }}
            >
              <MdSavings size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-400 tracking-tight">{CURRENCY(b?.opening_balance)}</div>
            <p className="text-[11px] text-secondary mt-1 line-clamp-1">
              {b?.opening_balance_effective_date ? `Effective ${b.opening_balance_effective_date}` : "Initial starting reserve"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Ledger Card ── */}
      <div
        className="rounded-2xl p-6 shadow-sm space-y-5 border"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Header & Filter Button with Animated Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
          <div>
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              <MdOutlineReceiptLong className="text-accent" size={20} />
              Cash Book Ledger (General Ledger)
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Real-time chronological record of society cash inflows, collections, and expense disbursements.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Expandable Animated Search Slider */}
            <ExpandableSearch
              value={filters.search}
              onChange={(val) => applyFilters({ search: val })}
              placeholder="Search description, payee, particulars…"
              fetching={loading}
              isOpen={isSearchOpen}
              onOpenChange={setIsSearchOpen}
            />

            <button
              onClick={() => setShowFilterModal(true)}
              className="btn-soft flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border transition-colors cursor-pointer"
              style={{
                height: 38,
                background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
                borderColor: activeFilterCount > 0 ? "var(--accent, #818cf8)" : "var(--glass-border)",
                color: activeFilterCount > 0 ? "var(--accent, #818cf8)" : "var(--text-primary)",
              }}
            >
              <MdFilterList size={16} className={activeFilterCount > 0 ? "text-accent" : "text-secondary"} />
              <span>{t("filters")}</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={() => applyFilters({ type: "", source: "", from: "", to: "", search: "" })}
                className="text-xs font-semibold text-rose-500 hover:underline px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-card-inner-bg border border-glass-border rounded-xl">
            <span className="text-xs text-secondary font-semibold mr-1">Active:</span>
            {filters.type && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/25">
                Type: {filters.type === "CREDIT" ? "Credits (+)" : "Debits (−)"}
                <button onClick={() => applyFilters({ type: "" })} className="hover:opacity-75">
                  <MdClose size={14} />
                </button>
              </span>
            )}
            {filters.source && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/25">
                Source: {filters.source}
                <button onClick={() => applyFilters({ source: "" })} className="hover:opacity-75">
                  <MdClose size={14} />
                </button>
              </span>
            )}
            {(filters.from || filters.to) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/25">
                Date: {filters.from || "Any"} to {filters.to || "Now"}
                <button onClick={() => applyFilters({ from: "", to: "" })} className="hover:opacity-75">
                  <MdClose size={14} />
                </button>
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-accent/15 text-accent border border-accent/25">
                Keyword: "{filters.search}"
                <button onClick={() => applyFilters({ search: "" })} className="hover:opacity-75">
                  <MdClose size={14} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Table — Clean, no vertical scrollbar */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-secondary border-b border-glass-border">
                <th className="py-3.5 pr-4 font-bold">Date</th>
                <th className="py-3.5 pr-4 font-bold">Type</th>
                <th className="py-3.5 pr-4 font-bold">Category</th>
                <th className="py-3.5 pr-4 font-bold">Description / Particulars</th>
                <th className="py-3.5 pr-4 font-bold text-right">Amount</th>
                <th className="py-3.5 pr-4 font-bold text-right">Running Balance</th>
                <th className="py-3.5 font-bold text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const openingRow = r.source === "OPENING" || r.opening;
                const isCredit = r.type === "CREDIT";
                return (
                  <tr
                    key={r.id ?? "opening"}
                    className="border-b border-glass-border/60 hover:bg-card-inner-bg/60 transition-colors last:border-0"
                  >
                    <td className="py-3.5 pr-4 text-secondary whitespace-nowrap font-medium text-xs">
                      {openingRow ? "—" : (r.entry_date || "").slice(0, 10)}
                    </td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                          isCredit
                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                        }`}
                      >
                        {isCredit ? <MdArrowUpward size={13} /> : <MdArrowDownward size={13} />}
                        {isCredit ? "+ CREDIT" : "− DEBIT"}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-primary text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-card-inner-bg border border-glass-border">
                        {r.source}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-secondary max-w-72 truncate font-medium" title={r.description}>
                      {r.description || "—"}
                    </td>
                    <td
                      className={`py-3.5 pr-4 text-right font-extrabold whitespace-nowrap ${
                        isCredit ? "text-emerald-500" : "text-rose-500"
                      } ${openingRow ? "text-secondary" : ""}`}
                    >
                      {openingRow ? CURRENCY(r.amount) : `${isCredit ? "+" : "−"}${CURRENCY(r.amount)}`}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-bold text-primary whitespace-nowrap">
                      {CURRENCY(r.running_balance)}
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelected(r)}
                        className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all"
                        title="View entry details"
                      >
                        <MdViewList size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-secondary text-sm">
                    No cash book ledger entries match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-glass-border">
          <p className="text-xs text-secondary font-medium">
            Page {pagination.currentPage || 1} of {pagination.totalPages || 1} · {pagination.totalItems || 0} total ledger entries
          </p>
          <Pagination
            page={pagination.currentPage || 1}
            totalPages={pagination.totalPages || 1}
            onPageChange={(p) => applyFilters({ page: p })}
            pageSize={filters.limit}
            onPageSizeChange={(s) => applyFilters({ page: 1, limit: s })}
          />
        </div>
      </div>

      {showFilterModal && (
        <LedgerFilterModal
          filters={filters}
          onApply={applyFilters}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {selected && <LedgerDetailsModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ── EXPENSES TAB ─────────────────────────────────────────────────────────── */
function ExpensesTab({ isDeleteAllowed }) {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(search));
  const [showForm, setShowForm] = useState(null);
  const [showVoid, setShowVoid] = useState(null);
  const [showView, setShowView] = useState(null);
  const [saving, setSaving] = useState(false);

  const glassCardStyle = {
    background: "var(--card-bg, rgba(15, 23, 42, 0.65))",
    border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  const load = async (p = page, q = "", size = limit) => {
    try {
      setLoading(true);
      setErr("");
      const params = { page: p, limit: size };
      if (q) params.search = q;
      const res = await getExpenses(params);
      setRows(res.data || []);
      setTotals(res.totals || null);
      setPagination(res.pagination || {});
    } catch (e) {
      console.error("Failed to load expenses", e);
      setErr("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const goPage = (p) => {
    setPage(p);
    load(p, search);
  };

  const submitExpense = async (payload, id) => {
    try {
      setSaving(true);
      if (id) await updateExpense(id, payload);
      else await createExpense(payload);
      toast.success(id ? "Expense updated successfully." : "Expense recorded and ledger debited.");
      setShowForm(null);
      load(page, search);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoid = async () => {
    if (!showVoid) return;
    try {
      setSaving(true);
      await voidExpense(showVoid.id, showVoid.reason);
      toast.success("Expense voided and ledger reversal posted.");
      setShowVoid(null);
      load(page, search);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to void expense.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="bg-card border border-glass-border rounded-2xl p-6 space-y-5 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (err && rows.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-500 flex items-center justify-between gap-4 max-w-2xl mx-auto my-8">
        <p className="font-medium text-sm">{err}</p>
        <button onClick={() => load()} className="btn-primary px-4 py-2 text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expense Metric Highlights using glassmorphic cards */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Total Recorded Amount */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 group"
            style={glassCardStyle}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Total Recorded Amount</span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: "rgba(14, 165, 233, 0.14)",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  color: "#38bdf8",
                }}
              >
                <MdReceipt size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-sky-400 tracking-tight">{CURRENCY(totals.grand_total)}</div>
              <p className="text-[11px] text-secondary mt-1 line-clamp-1">Across all active & voided records</p>
            </div>
          </div>

          {/* Active Debited Outflow */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 group"
            style={glassCardStyle}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Active Debited Outflow</span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: "rgba(244, 63, 94, 0.14)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#fb7185",
                }}
              >
                <MdArrowDownward size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-400 tracking-tight">{CURRENCY(totals.posted_total)}</div>
              <p className="text-[11px] text-secondary mt-1 line-clamp-1">Currently deducted from cash balance</p>
            </div>
          </div>

          {/* Voided Records */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-1 group"
            style={glassCardStyle}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Voided Records</span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: "rgba(245, 158, 11, 0.14)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                }}
              >
                <MdSavings size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-400 tracking-tight">{totals.void_count || 0}</div>
              <p className="text-[11px] text-secondary mt-1 line-clamp-1">Audited ledger reversals posted</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Expenses Card */}
      <div
        className="rounded-2xl p-6 shadow-sm space-y-6 border"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Header & Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
          <div>
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              <MdPayments className="text-accent" size={20} />
              Expense Tracking & Management
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Record maintenance bills, vendor payments, and operational expenses. Each entry posts a verified DEBIT.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Expandable Animated Search Slider */}
            <ExpandableSearch
              value={search}
              onChange={(val) => { setSearch(val); load(1, val); }}
              placeholder="Search payee or reason…"
              fetching={loading}
              isOpen={isSearchOpen}
              onOpenChange={setIsSearchOpen}
            />

            <button
              onClick={() => setShowForm({})}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold shadow-md shrink-0 cursor-pointer"
              style={{ height: 38 }}
            >
              <MdAdd size={18} /> Record New Expense
            </button>
          </div>
        </div>

        {/* Expenses Table — Clean, no vertical scrollbar */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-secondary border-b border-glass-border">
                <th className="py-3.5 pr-4 font-bold">Payment Date</th>
                <th className="py-3.5 pr-4 font-bold">Paid To (Payee)</th>
                <th className="py-3.5 pr-4 font-bold">Reason / Particulars</th>
                <th className="py-3.5 pr-4 font-bold">Mode</th>
                <th className="py-3.5 pr-4 font-bold">Sourced By</th>
                <th className="py-3.5 pr-4 font-bold text-right">Amount</th>
                <th className="py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-glass-border/60 hover:bg-card-inner-bg/60 transition-colors last:border-0">
                  <td className="py-3.5 pr-4 text-secondary whitespace-nowrap text-xs font-medium">
                    {(e.payment_date || "").slice(0, 10)}
                  </td>
                  <td className="py-3.5 pr-4 font-bold text-primary text-xs whitespace-nowrap">{e.pay_to}</td>
                  <td className="py-3.5 pr-4 text-secondary max-w-64 truncate font-medium text-xs" title={e.reason}>
                    {e.reason}
                  </td>
                  <td className="py-3.5 pr-4 text-xs font-semibold text-secondary whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-card-inner-bg border border-glass-border">
                      {e.payment_mode}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-xs text-secondary whitespace-nowrap">
                    {e.created_by_name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span>{e.created_by_name}</span>
                        {e.created_by_role && (
                          <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-glass-border text-[10px] font-bold">
                            {e.created_by_role}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>{e.created_by_role || "System"}</span>
                    )}
                  </td>
                  <td className={`py-3.5 pr-4 text-right font-extrabold whitespace-nowrap ${e.status === "VOID" ? "text-secondary line-through" : "text-rose-500"}`}>
                    −{CURRENCY(e.amount)}
                  </td>
                  <td className="py-3.5 text-right whitespace-nowrap">
                    {e.status !== "VOID" && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setShowView(e)}
                          className="p-1.5 rounded-lg bg-card-inner-bg text-secondary hover:text-primary hover:border-accent border border-glass-border transition-colors"
                          title="View expense details"
                        >
                          <MdVisibility size={16} />
                        </button>
                        <button
                          onClick={() => setShowForm(e)}
                          className="p-1.5 rounded-lg bg-card-inner-bg text-secondary hover:text-primary hover:border-accent border border-glass-border transition-colors"
                          title="Edit expense"
                        >
                          <MdEdit size={16} />
                        </button>
                        {isDeleteAllowed && (
                          <button
                            onClick={() => setShowVoid({ id: e.id, amount: e.amount, reason: "" })}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-colors"
                            title="Void & Reverse expense"
                          >
                            <MdDelete size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
<td colSpan={7} className="py-12 text-center text-secondary text-sm">
                    No expense records found. Click "+ Record New Expense" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-glass-border">
          <p className="text-xs text-secondary font-medium">
            Page {pagination.currentPage || 1} of {pagination.totalPages || 1} · {pagination.totalItems || 0} total expenses
          </p>
          <Pagination
            page={pagination.currentPage || page}
            totalPages={pagination.totalPages || 1}
            onPageChange={goPage}
            pageSize={limit}
            onPageSizeChange={(s) => {
              setLimit(s);
              setPage(1);
              load(1, search, s);
            }}
          />
        </div>
      </div>

      {showForm && (
        <ExpenseForm
          expense={showForm.id ? showForm : null}
          saving={saving}
          onClose={() => setShowForm(null)}
          onSubmit={(data) => submitExpense(data, showForm.id)}
        />
      )}

      {showVoid && (
        <Modal title="Void & Reverse Expense" icon={MdDelete} maxWidth="max-w-lg" onClose={() => setShowVoid(null)}>
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
            <p className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
              <MdReportProblem size={18} /> Confirm Expense Reversal
            </p>
            <p className="text-xs text-secondary">
              Voiding will immediately cancel this expense and credit back{" "}
              <span className="font-bold text-primary">{CURRENCY(showVoid.amount)}</span> to the cash book balance with an
              audited ledger entry.
            </p>
          </div>

          <Field label="Void Reason / Notes (Optional)" icon={MdDescription}>
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: "none" }}
              placeholder="e.g. Duplicate entry or vendor cancelled invoice"
              value={showVoid.reason}
              onChange={(e) => setShowVoid({ ...showVoid, reason: e.target.value })}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowVoid(null)} className="btn-soft px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button
              onClick={confirmVoid}
              disabled={saving}
              className="btn-danger px-5 py-2 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? "Voiding…" : "Yes, Void Expense"}
            </button>
          </div>
        </Modal>
      )}

      {showView && <ExpenseDetails expense={showView} onClose={() => setShowView(null)} />}
    </div>
  );
}

/* ── EXPENSE FULL DETAILS MODAL (read-only + creator attribution) ─────────── */
function ExpenseDetails({ expense, onClose }) {
  const items = [
    { label: "Paid To (Payee)", value: expense.pay_to },
    { label: "Reason / Particulars", value: expense.reason },
    { label: "Payment Mode", value: expense.payment_mode },
    { label: "Payment Date", value: expense.payment_date ? String(expense.payment_date).slice(0, 10) : null },
    { label: "Status", value: expense.status ? (expense.status === "VOID" ? "Voided (reversed)" : "Posted / Active") : null },
  ];

  return (
    <Modal
      title="Expense Details"
      icon={MdReceipt}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-3 p-3 bg-card-inner-bg border border-glass-border rounded-xl mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
            − DEBIT (OUT)
          </span>
          <span className="text-xs font-bold text-primary bg-card px-2.5 py-1 rounded-lg border border-glass-border">EXPENSE</span>
        </div>
        <span className="text-xs text-secondary font-mono">Entry #{expense.id ?? "—"}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <DetailItem key={it.label} label={it.label} value={it.value} />
        ))}
        <DetailItem label="Amount" value={CURRENCY(expense.amount)} tone="red" />
      </div>

      <div className="mt-3 p-3 bg-card-inner-bg border border-glass-border rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailItem
          label="Recorded By"
          value={expense.created_by_name ? `${expense.created_by_name}${expense.created_by_role ? ` (${expense.created_by_role})` : ""}` : (expense.created_by_role || "System")}
        />
        <DetailItem label="Recorded At" value={expense.created_at ? new Date(expense.created_at).toLocaleString() : null} />
      </div>

      {expense.status === "VOID" && (
        <p className="mt-3 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          ⚠️ This expense was voided. A credit reversal was posted to the cash book ledger and the reversal is preserved in the audit log.
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="btn-soft px-5 py-2 text-xs font-semibold">
          Close Details
        </button>
      </div>
    </Modal>
  );
}

/* ── STYLISH EXPENSE CREATE / EDIT FORM MODAL (2-3 DETAILS PER ROW) ────────── */
function ExpenseForm({ expense, saving, onClose, onSubmit }) {
  const [form, setForm] = useState({
    pay_to: expense?.pay_to || "",
    reason: expense?.reason || "",
    amount: expense?.amount !== undefined ? String(expense.amount) : "",
    payment_date: expense?.payment_date ? String(expense.payment_date).slice(0, 10) : TODAY(),
    payment_mode: expense?.payment_mode || "CASH",
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();

    const payeeErr = getTitleError(form.pay_to, "Payee");
    if (payeeErr) { toast.error(payeeErr); return; }

    const dateErr = getRequiredDateError(form.payment_date, "Payment date");
    if (dateErr) { toast.error(dateErr); return; }

    const reasonErr = getDescriptionError(form.reason, "Reason / Particulars description");
    if (reasonErr) { toast.error(reasonErr); return; }

    const amountErr = getPositiveAmountError(form.amount, "Expense amount");
    if (amountErr) { toast.error(amountErr); return; }

    onSubmit({ ...form, amount: Number(form.amount), payment_mode: form.payment_mode });
  };

  return (
    <Modal
      title={expense ? "Edit Expense Details" : "Record Society Expense"}
      icon={MdPayments}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Info Banner */}
        <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-xl text-xs text-primary flex items-center gap-2">
          <MdCheckCircle className="text-accent shrink-0" size={18} />
          <span>Recorded expenses automatically update the Cash Book and are deducted from current balance.</span>
        </div>

        {/* 2 or 3 inputs in one row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Paid To (Payee / Vendor)" required icon={MdPerson}>
            <input
              style={inputStyle}
              placeholder="e.g. ABC Electrician / City Water Supply"
              value={form.pay_to}
              onChange={set("pay_to")}
              autoFocus
            />
          </Field>
          <Field label="Payment Date" required icon={MdCalendarToday}>
            <input
              type="date"
              style={inputStyle}
              value={form.payment_date}
              onChange={set("payment_date")}
            />
          </Field>
        </div>

        {/* Reason / Particulars */}
        <Field label="Reason / Particulars Description" required icon={MdDescription}>
          <input
            style={inputStyle}
            placeholder="e.g. Lift maintenance service charges for March"
            value={form.reason}
            onChange={set("reason")}
          />
        </Field>

        {/* Amount and Payment Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Expense Amount (₹)" required icon={MdOutlineAccountBalanceWallet}>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-accent">₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                style={inputStyle}
                className="pl-8! font-bold text-base"
                placeholder="0.00"
                value={form.amount}
                onChange={set("amount")}
              />
            </div>
          </Field>
          <Field label="Payment Mode" required icon={MdPayments}>
            <select style={inputStyle} value={form.payment_mode} onChange={set("payment_mode")}>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m === "BANK_TRANSFER" ? "Bank Transfer (NEFT/RTGS/IMPS)" : m}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-glass-border">
          <button type="button" onClick={onClose} className="btn-soft px-5 py-2.5 text-xs font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-bold shadow-md disabled:opacity-50"
          >
            {saving ? "Processing…" : expense ? "Save Changes" : "Record Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── OPENING BALANCE TAB ─────────────────────────────────────────────────── */
function OpeningTab({ b, isManageOpening, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: b.opening_balance ? String(b.opening_balance) : "",
    effective_date: TODAY(),
    reason: "",
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.error("A reason is required for opening balance adjustments.");
      return;
    }
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) < 0) {
      toast.error("Opening balance must be a non-negative number.");
      return;
    }
    try {
      setSaving(true);
      await setOpeningBalance({
        amount: Number(form.amount),
        effective_date: form.effective_date,
        reason: form.reason,
      });
      toast.success(b.opening_balance ? "Opening balance adjusted and audited." : "Opening balance recorded.");
      setShowForm(false);
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to set opening balance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Opening Balance Container */}
      <div className="bg-card border border-glass-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-glass-border">
          <div>
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              <MdSavings className="text-accent" size={20} />
              Society Opening Balance Setup
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Initial funds carried over before system tracking. Any later correction is logged in the Financial Audit Book.
            </p>
          </div>
          {isManageOpening && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold shadow-md self-start"
            >
              <MdEdit size={16} /> {b.opening_balance ? "Adjust Opening Balance" : "Set Opening Balance"}
            </button>
          )}
        </div>

        {/* ── KPI Cards for Opening Balance (Inside the card) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="ad-kpi ad-kpi--opening">
            <span className="ad-kpi-val">{CURRENCY(b.opening_balance)}</span>
            <span className="ad-kpi-label">Current Opening Balance</span>
            <span className="ad-kpi-desc">Initial carry-over baseline reserve</span>
          </div>
          <div className="ad-kpi ad-kpi--balance">
            <span className="ad-kpi-val">{b.opening_balance_effective_date || "Not set"}</span>
            <span className="ad-kpi-label">Effective Date</span>
            <span className="ad-kpi-desc">Date of opening funds carry-over</span>
          </div>
          <div className="ad-kpi ad-kpi--income">
            <span className="ad-kpi-val">{b.opening_balance ? "Configured" : "Pending Setup"}</span>
            <span className="ad-kpi-label">Setup Status</span>
            <span className="ad-kpi-desc">
              {b.opening_balance_set_at ? new Date(b.opening_balance_set_at).toLocaleDateString() : "No record yet"}
            </span>
          </div>
        </div>

        {!isManageOpening && (
          <p className="text-xs text-secondary bg-card-inner-bg border border-glass-border rounded-xl p-4">
            Only a Society Admin or authorized Accountant can set or adjust the opening balance.
          </p>
        )}
      </div>

      {showForm && (
        <Modal
          title={b.opening_balance ? "Adjust Opening Balance" : "Set Opening Balance"}
          icon={MdSavings}
          maxWidth="max-w-xl"
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={submit} className="space-y-4">
            <p className="text-xs text-secondary">
              Adjustments are permanently recorded in the Financial Audit Log with the previous value and your reason.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Opening Balance (₹)" required icon={MdOutlineAccountBalanceWallet}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  autoFocus
                />
              </Field>
              <Field label="Effective Date" required icon={MdCalendarToday}>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.effective_date}
                  onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Reason for Setting / Adjustment" required icon={MdDescription}>
              <textarea
                rows={2}
                style={{ ...inputStyle, resize: "none" }}
                placeholder="e.g. Initial funds transferred from bank ledger audit"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-3 pt-3 border-t border-glass-border">
              <button type="button" onClick={() => setShowForm(false)} className="btn-soft px-5 py-2.5 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-xs font-bold disabled:opacity-50">
                {saving ? "Saving…" : b.opening_balance ? "Adjust & Audit" : "Set Opening Balance"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ── FINANCIAL AUDIT LOG TAB (REAL AUDIT BOOK STYLING) ─────────────────────── */
const ACTION_TONES = {
  OPENING_BALANCE_SET: "blue",
  OPENING_BALANCE_ADJUST: "purple",
  EXPENSE_CREATE: "green",
  EXPENSE_UPDATE: "amber",
  EXPENSE_VOID: "red",
  PAYMENT_REVERSED: "orange",
  MANUAL_ADJUSTMENT: "gray",
};

const ACTION_LABELS = {
  OPENING_BALANCE_SET: "Opening Balance Set",
  OPENING_BALANCE_ADJUST: "Opening Balance Adjusted",
  EXPENSE_CREATE: "Created Expense",
  EXPENSE_UPDATE: "Edited Expense",
  EXPENSE_VOID: "Voided Expense",
  PAYMENT_REVERSED: "Payment Reversed",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
};

const isOpeningAction = (a) => a === "OPENING_BALANCE_SET" || a === "OPENING_BALANCE_ADJUST";

const fmtWhen = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ROLE_LABELS = {
  COMMITTEE_MEMBER: "Committee Member",
  SOCIETY_ADMIN: "Society Admin",
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  RESIDENT: "Resident",
  GUARD: "Guard",
  FAMILY_MEMBER: "Family Member",
};

const AUDIT_FIELD_LABELS = {
  amount: "Amount",
  new_balance: "New Balance",
  opening_balance: "Opening Balance",
  prev_balance: "Previous Balance",
  running_balance: "Running Balance",
  effective_date: "Effective Date",
  entry_date: "Entry Date",
  payment_date: "Payment Date",
  created_at: "Created Date",
  updated_at: "Updated Date",
  paid_at: "Paid Date",
  voided_at: "Voided Date",
  pay_to: "Paid To (Payee)",
  reason: "Audit Reason",
  record_reason: "Reason",
  status: "Status",
  payment_mode: "Payment Mode",
  method: "Payment Mode",
  paid_by: "Paid By",
  created_by: "Created By",
  recording_user_id: "Recorded By ID",
  description: "Description",
  source: "Category",
  bill_id: "Bill Ref ID",
  amenity_id: "Amenity ID",
  society_id: "Society",
  resident_id: "Resident ID",
  payer_user_id: "Payer ID",
  user_id: "User ID",
  name: "Name",
  transaction_ref: "Transaction Ref",
  id: "Record ID",
  reversal_of_id: "Reversal Of ID",
  type: "Transaction Type",
  void_reason: "Void Reason",
  voided_by: "Voided By",
};

const CURRENCY_FIELDS = ["amount", "opening_balance", "prev_balance", "new_balance", "running_balance", "balance", "total", "fee", "discount"];
const DATE_FIELDS = ["effective_date", "entry_date", "payment_date", "created_at", "updated_at", "voided_at", "paid_at", "issue_date", "due_date"];

const fmtAuditValue = (v, key, fallbackName = "") => {
  if (v === null || v === undefined || v === "") return "";
  const k = String(key || "").toLowerCase();
  if (CURRENCY_FIELDS.includes(k)) return CURRENCY(v);
  if (DATE_FIELDS.includes(k)) {
    const dt = new Date(v);
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (k === "status") return v === "POSTED" ? "Recorded" : v === "VOID" ? "Voided" : v;
  if (typeof v === "boolean") return v ? "Yes" : "No";

  // Role conversion (e.g. COMMITTEE_MEMBER -> Committee Member)
  const roleKey = String(v).toUpperCase();
  if (["paid_by", "role", "performed_by_role", "payer_role"].includes(k) || ROLE_LABELS[roleKey]) {
    if (ROLE_LABELS[roleKey]) return ROLE_LABELS[roleKey];
    return String(v).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ID to Name conversion (e.g. created_by: 9 -> fallbackName e.g. "Amit Sharma")
  if (["created_by", "created_by_user_id", "recording_user_id", "user_id"].includes(k)) {
    if (fallbackName && (typeof v === "number" || !isNaN(Number(v)))) {
      return fallbackName;
    }
  }

  return String(v);
};

/* Format meaningful audit reason / description */
const getMeaningfulAuditReason = (row) => {
  const oldV = row.old_value || {};
  const newV = row.new_value || {};
  const amt = newV.amount !== undefined ? CURRENCY(newV.amount) : oldV.amount !== undefined ? CURRENCY(oldV.amount) : "";
  const payee = newV.pay_to || oldV.pay_to || "";

  if (row.reason && row.reason !== "System verified financial operation" && !row.reason.startsWith("System verified")) {
    return row.reason;
  }

  if (row.action === "EXPENSE_CREATE") {
    return `Expense of ${amt || "funds"} recorded for ${payee || "vendor"} (debited from cash balance)`;
  }
  if (row.action === "EXPENSE_VOID") {
    return `Expense of ${amt || "funds"} for ${payee || "vendor"} voided (reversed and credited back)`;
  }
  if (row.action === "EXPENSE_UPDATE") {
    return `Expense particulars or amount updated for ${payee || "vendor"}`;
  }
  if (row.action === "OPENING_BALANCE_SET") {
    return `Initial society starting cash reserve configured as ${amt || "configured amount"}`;
  }
  if (row.action === "OPENING_BALANCE_ADJUST") {
    return `Opening cash balance reserve adjusted to ${amt || "new amount"}`;
  }
  if (row.action === "PAYMENT_REVERSED") {
    return `Payment collection of ${amt || "funds"} reversed in ledger`;
  }
  if (row.action === "MANUAL_ADJUSTMENT") {
    return `Manual journal entry adjustment posted to ledger`;
  }
  return `Financial record verified and audited`;
};

/* Format single key change highlight for table column */
const getAuditHighlight = (row) => {
  const oldV = row.old_value || {};
  const newV = row.new_value || {};

  if (isOpeningAction(row.action)) {
    const oldAmt = oldV.amount !== undefined ? CURRENCY(oldV.amount) : null;
    const newAmt = newV.amount !== undefined ? CURRENCY(newV.amount) : null;
    if (oldAmt && newAmt) return `${oldAmt} → ${newAmt}`;
    if (newAmt) return `Balance: ${newAmt}`;
  }

  if (row.action === "EXPENSE_CREATE") {
    const amt = newV.amount !== undefined ? CURRENCY(newV.amount) : null;
    const payee = newV.pay_to ? `${newV.pay_to}` : null;
    return [payee, amt].filter(Boolean).join(" · ") || "New expense recorded";
  }

  if (row.action === "EXPENSE_VOID") {
    const amt = oldV.amount !== undefined ? CURRENCY(oldV.amount) : null;
    return `Voided ${amt || ""}`;
  }

  if (row.action === "EXPENSE_UPDATE") {
    if (oldV.amount !== undefined && newV.amount !== undefined && oldV.amount !== newV.amount) {
      return `Amount: ${CURRENCY(oldV.amount)} → ${CURRENCY(newV.amount)}`;
    }
    if (oldV.pay_to !== undefined && newV.pay_to !== undefined && oldV.pay_to !== newV.pay_to) {
      return `Payee: ${oldV.pay_to} → ${newV.pay_to}`;
    }
    return "Details updated";
  }

  return getMeaningfulAuditReason(row);
};

const prettyAuditList = (v, societyName = "", performerName = "") => {
  if (v === null || v === undefined || v === "" || typeof v !== "object" || Array.isArray(v)) return [];

  // Check date similarity
  const createdAtStr = v.created_at ? String(v.created_at).slice(0, 10) : null;
  const paymentDateStr = v.payment_date ? String(v.payment_date).slice(0, 10) : null;
  const entryDateStr = v.entry_date ? String(v.entry_date).slice(0, 10) : null;
  const samePaymentDate = paymentDateStr && createdAtStr && paymentDateStr === createdAtStr;
  const sameEntryDate = entryDateStr && createdAtStr && entryDateStr === createdAtStr;

  return Object.entries(v)
    .map(([k, val]) => {
      const keyLower = String(k).toLowerCase();

      // Rule: Do not show the Status "Recorded" / "POSTED"
      if (keyLower === "status") {
        const strVal = String(val).toUpperCase();
        if (strVal === "POSTED" || strVal === "RECORDED" || strVal === "ACTIVE") return null;
      }

      // Rule: Date logic - if created_at and payment_date are the same, skip created_at and keep only payment_date
      if (keyLower === "created_at" && (samePaymentDate || sameEntryDate)) {
        return null;
      }

      // Rule: Society ID -> name of the society
      if (keyLower === "society_id") {
        if (societyName) {
          return { key: k, label: "Society", value: societyName };
        }
        return null;
      }

      // Skip internal IDs
      if (["recording_user_id", "payer_user_id", "resident_id"].includes(keyLower)) {
        return null;
      }

      const fv = fmtAuditValue(val, k, performerName);
      if (fv === "") return null;
      return {
        key: k,
        label: AUDIT_FIELD_LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: fv,
      };
    })
    .filter(Boolean);
};

/* ── AUDIT DETAILS POPUP (MODERN, CLEAN AUDIT RECORD MODAL) ─────────────── */
function AuditDetailsModal({ row, societyName, onClose }) {
  const performerName =
    row.performed_by_name ||
    row.performer_name ||
    row.created_by_name ||
    row.user_name ||
    (row.performed_by_role ? (ROLE_LABELS[row.performed_by_role] || row.performed_by_role) : "Society Admin");

  const before = prettyAuditList(row.old_value, societyName, performerName);
  const after = prettyAuditList(row.new_value, societyName, performerName);
  const tone = ACTION_TONES[row.action] || "gray";
  const showBefore = before && before.length > 0;
  const showAfter = after && after.length > 0;

  const meaningfulReason = getMeaningfulAuditReason(row);

  const toneConfig = {
    green: { bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.28)", text: "#10B981", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    red: { bg: "rgba(244, 63, 94, 0.12)", border: "rgba(244, 63, 94, 0.28)", text: "#F43F5E", badge: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
    amber: { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.28)", text: "#F59E0B", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    purple: { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.28)", text: "#A855F7", badge: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
    blue: { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.28)", text: "#3B82F6", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    orange: { bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.28)", text: "#F97316", badge: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
    gray: { bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.28)", text: "#94A3B8", badge: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
  };
  const activeTone = toneConfig[tone] || toneConfig.gray;

  return (
    <Modal title="Financial Audit Record Details" icon={MdHistoryEdu} maxWidth="max-w-3xl" onClose={onClose}>
      <div className="space-y-4">
        {/* Top Hero Card */}
        <div
          className="rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden"
          style={{
            background: activeTone.bg,
            borderColor: activeTone.border,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{ background: "var(--card-bg, rgba(0,0,0,0.2))", borderColor: activeTone.border, color: activeTone.text }}
            >
              <MdHistoryEdu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${activeTone.badge}`}>
                  {ACTION_LABELS[row.action] || row.action}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                  Entry #{row.id}
                </span>
              </div>
              <p className="text-xs text-secondary mt-1 flex items-center gap-1 font-mono">
                <MdCalendarToday size={12} /> {fmtWhen(row.performed_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Overview Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border flex flex-col justify-between" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
              <MdPerson size={13} className="text-accent" /> Performed By
            </span>
            <span className="text-sm font-bold text-primary mt-1 truncate" title={performerName}>
              {performerName}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border flex flex-col justify-between" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
              <MdBusiness size={13} className="text-accent" /> Society Context
            </span>
            <span className="text-sm font-bold text-primary mt-1 truncate" title={societyName || "Global / Current"}>
              {societyName || "Current Society"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border flex flex-col justify-between" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
              <MdCheckCircle size={13} className="text-accent" /> Verification Status
            </span>
            <span className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Ledger Verified
            </span>
          </div>
        </div>

        {/* Audit Event Summary */}
        <div className="p-4 rounded-xl border" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5 mb-1.5">
            <MdDescription size={14} className="text-accent" /> Audit Event Summary
          </div>
          <p className="text-sm font-semibold text-primary m-0 leading-relaxed">
            {meaningfulReason}
          </p>
        </div>

        {/* Before / After Comparison */}
        {showBefore && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              Previous State (Before Modification)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {before.map((f) => (
                <DetailItem key={"before_" + f.key} label={f.label} value={f.value} tone="red" />
              ))}
            </div>
          </div>
        )}

        {showAfter && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              Updated State (After Modification)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {after.map((f) => (
                <DetailItem key={"after_" + f.key} label={f.label} value={f.value} tone="green" />
              ))}
            </div>
          </div>
        )}

        {!showBefore && !showAfter && (
          <div className="text-xs text-secondary text-center p-4 rounded-xl border" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
            No parameter modifications recorded for this audit entry.
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end pt-3 border-t border-glass-border">
          <button onClick={onClose} className="btn-primary px-6 py-2 text-xs font-bold rounded-xl cursor-pointer">
            Close Record
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AuditLogTab({ societyName }) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const load = async (p = 1, size = limit) => {
    try {
      setLoading(true);
      setErr("");
      const res = await getAuditLogs({ page: p, limit: size });
      setRows(res.data || []);
      setPagination(res.pagination || {});
    } catch (e) {
      console.error("Failed to load financial audit log", e);
      setErr("Failed to load the financial audit log. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const action = (ACTION_LABELS[r.action] || r.action || "").toLowerCase();
      const performer = (r.performed_by_name || r.performer_name || r.performed_by_role || "").toLowerCase();
      const reason = getMeaningfulAuditReason(r).toLowerCase();
      const highlight = getAuditHighlight(r).toLowerCase();
      return action.includes(q) || performer.includes(q) || reason.includes(q) || highlight.includes(q);
    });
  }, [rows, search]);

  const handleDownloadPDF = () => {
    const exportData = filteredRows.length > 0 ? filteredRows : rows;
    if (!exportData || exportData.length === 0) {
      toast.info("No audit records to export.");
      return;
    }
    const columns = ["Timestamp", "Action / Event", "Performed By", "Reason / Notes", "Change Highlights"];
    const tableData = exportData.map((r) => [
      fmtWhen(r.performed_at),
      ACTION_LABELS[r.action] || r.action,
      r.performed_by_name || r.performer_name || r.performed_by_role || "Society Admin",
      getMeaningfulAuditReason(r),
      getAuditHighlight(r),
    ]);
    exportToPDF({
      title: `${societyName ? societyName + " — " : ""}Financial Audit Logbook`,
      subtitle: "Immutable, append-only audit trail recording financial operations",
      columns,
      rows: tableData,
      fileName: `Financial_Audit_Log_${new Date().toISOString().slice(0, 10)}`,
      orientation: "landscape",
    });
    toast.success("Financial Audit Log downloaded as PDF.");
    setShowExportMenu(false);
  };

  const handleDownloadCSV = () => {
    const exportData = filteredRows.length > 0 ? filteredRows : rows;
    if (!exportData || exportData.length === 0) {
      toast.info("No audit records to export.");
      return;
    }
    const data = exportData.map((r) => ({
      "Timestamp": fmtWhen(r.performed_at),
      "Action": ACTION_LABELS[r.action] || r.action,
      "Performed By": r.performed_by_name || r.performer_name || r.performed_by_role || "Society Admin",
      "Audit Reason": getMeaningfulAuditReason(r),
      "Change Highlights": getAuditHighlight(r),
    }));
    exportToExcel({
      data,
      fileName: `Financial_Audit_Log_${new Date().toISOString().slice(0, 10)}`,
      sheetName: "AuditLog",
    });
    toast.success("Financial Audit Log exported successfully.");
    setShowExportMenu(false);
  };

  if (err) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm font-medium">{err}</div>
        <button onClick={() => load(page)} className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-semibold shrink-0">
          <MdRefresh size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl shadow-sm p-6 space-y-6 border"
      style={{
        background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
        borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Official Audit Book Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            <MdHistoryEdu className="text-accent" size={20} />
            Official Financial Audit Logbook
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            Immutable, append-only audit trail recording opening balances, expense modifications, and financial adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Expandable Animated Search Slider */}
          <ExpandableSearch
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Search action, performer, notes…"
            fetching={loading}
            isOpen={isSearchOpen}
            onOpenChange={setIsSearchOpen}
          />

          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-soft flex items-center gap-2 px-3.5 py-2 text-xs font-bold border border-glass-border hover:border-accent cursor-pointer"
              style={{ height: 38 }}
            >
              <MdDownload size={16} className="text-accent" />
              <span>Download Logbook</span>
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-xl p-1.5 z-50 animate-scaleIn"
                style={{
                  background: "var(--modal-bg, #0f172a)",
                  borderColor: "var(--glass-border)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-card-inner-bg transition-colors cursor-pointer"
                >
                  <MdPictureAsPdf size={16} className="text-rose-500" />
                  <span>Download PDF (.pdf)</span>
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-card-inner-bg transition-colors cursor-pointer"
                >
                  <MdTableChart size={16} className="text-emerald-500" />
                  <span>Download CSV (.xlsx)</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => load(page)}
            title="Refresh log"
            className="inline-flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0"
            style={{
              width: 38,
              height: 38,
              background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
              borderColor: "var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <MdRefresh size={18} className={loading ? "animate-spin text-accent" : "text-secondary"} />
          </button>
        </div>
      </div>

      {/* Audit Table — Entity column removed, no vertical scrollbars */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wider text-secondary" style={{ borderColor: "var(--glass-border)" }}>
              <th className="py-3.5 pr-4 font-bold">Timestamp</th>
              <th className="py-3.5 pr-4 font-bold">Action / Event</th>
              <th className="py-3.5 pr-4 font-bold">Performed By</th>
              <th className="py-3.5 pr-4 font-bold">Reason / Notes</th>
              <th className="py-3.5 pr-4 font-bold">Change Highlights</th>
              <th className="py-3.5 font-bold text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-secondary text-sm">
                  {loading ? "Loading audit records…" : search ? `No audit records matching "${search}".` : "No financial audit records logged yet."}
                </td>
              </tr>
            )}
            {filteredRows.map((r) => {
              const tone = ACTION_TONES[r.action] || "gray";
              const performer = r.performed_by_name || r.performer_name || r.performed_by_role || "Society Admin";
              return (
                <tr
                  key={r.id}
                  className={`border-b hover:bg-card-inner-bg/60 transition-colors ${
                    isOpeningAction(r.action) ? "bg-blue-500/5" : ""
                  }`}
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  <td className="py-3.5 pr-4 text-secondary whitespace-nowrap text-xs font-medium">
                    {fmtWhen(r.performed_at)}
                  </td>
                  <td className="py-3.5 pr-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${
                        tone === "green"
                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                          : tone === "red"
                          ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                          : tone === "amber"
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                          : tone === "purple"
                          ? "bg-purple-500/15 text-purple-500 border border-purple-500/30"
                          : tone === "blue"
                          ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                          : "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                      }`}
                    >
                      {ACTION_LABELS[r.action] || r.action}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-primary font-bold text-xs whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-card-inner-bg border border-glass-border">
                      {performer}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-secondary max-w-60 truncate font-medium text-xs" title={getMeaningfulAuditReason(r)}>
                    {getMeaningfulAuditReason(r)}
                  </td>
                  <td className="py-3.5 pr-4 text-primary font-bold text-xs max-w-72 truncate">
                    {getAuditHighlight(r)}
                  </td>
                  <td className="py-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelected(r)}
                      className="p-2 rounded-xl text-accent transition-all cursor-pointer"
                      style={{
                        background: "var(--accent-soft, rgba(99,102,241,0.18))",
                        border: "1px solid var(--accent-light, #818cf8)",
                      }}
                      title="View full audit record"
                    >
                      <MdViewList size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
        <span className="text-xs text-secondary font-medium">
          Page {pagination.currentPage || page} of {pagination.totalPages || 1} · {pagination.totalItems || 0} total audit records
        </span>
        <Pagination
          page={page}
          totalPages={pagination.totalPages || 1}
          onPageChange={(p) => {
            setPage(p);
            load(p);
          }}
          pageSize={limit}
          onPageSizeChange={(s) => {
            setLimit(s);
            setPage(1);
            load(1, s);
          }}
        />
      </div>

      {selected && <AuditDetailsModal row={selected} societyName={societyName} onClose={() => setSelected(null)} />}
    </div>
  );
}