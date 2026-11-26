

import { useEffect, useState, useCallback, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import SlidingTabs from "../../components/common/SlidingTabs";
import Pagination from "../../components/common/Pagination";
import StatCard from "../../components/common/StatCard";
import { computeLiveLateFeePreview } from "../../components/maintenance/LateFeeSection";

import {
  MdPerson, MdEmail, MdPhone, MdBusiness,
  MdOutlineInbox, MdCheckCircle, MdSchedule,
  MdSearch, MdClose, MdArrowForward, MdVisibility,
  MdChevronLeft, MdChevronRight,
  MdContentCopy, MdLocationCity,
  MdOutlineReceiptLong, MdOutlineAccountBalance,
  MdOutlineCheckCircle, MdOutlineSchedule, MdOutlineCurrencyRupee,
} from "react-icons/md";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Spinner({ size = 16, small = false }) {
  const s = small ? 14 : size;
  return (
    <svg style={{ width: s, height: s }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const { t } = useLang();
  if (status === "PAID")
    return <span className="bill-pill-paid"><MdCheckCircle size={11} /> {t("billPaid") || "Paid"}</span>;
  if (status === "PENDING_VERIFICATION")
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
        <MdSchedule size={11} /> Awaiting Confirmation
      </span>
    );
  return <span className="bill-pill-pending"><MdSchedule size={11} /> {t("billPending") || "Pending"}</span>;
}

function formatBillDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function MaintenanceBreakdown({ bill }) {
  if (String(bill?.type || '').toUpperCase() !== 'MAINTENANCE') return null;
  let calc = bill.calculation_details;
  if (typeof calc === 'string') {
    try { calc = JSON.parse(calc); } catch { calc = null; }
  }
  if (!calc) return null;
  const base = Number(calc.owner_base_amount ?? calc.configured_amount ?? bill.base_amount ?? bill.amount ?? 0);
  const tenantCharge = Number(calc.additional_tenant_charge ?? 0);
  const lateFee = Number(bill.late_fee ?? 0);
  const waivedAmount = Number(bill.waived_amount ?? 0);
  const totalPayable = Number(bill.total_payable ?? bill.amount ?? 0);
  return (
    <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
      <div className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Maintenance Charges</div>
      <div className="flex justify-between"><span className="text-secondary">Base amount</span><span>₹{base.toLocaleString('en-IN')}</span></div>
      {tenantCharge > 0 && (
        <div className="flex justify-between"><span className="text-secondary">Tenant charges</span><span>₹{tenantCharge.toLocaleString('en-IN')}</span></div>
      )}
      {lateFee > 0 && (
        <div className="flex justify-between text-rose-400">
          <span>Late fee ({bill.overdue_months || 1} mo overdue)</span>
          <span>+₹{lateFee.toLocaleString('en-IN')}</span>
        </div>
      )}
      {waivedAmount > 0 && (
        <div className="flex justify-between text-emerald-400">
          <span>Waived</span>
          <span>-₹{waivedAmount.toLocaleString('en-IN')}</span>
        </div>
      )}
      {bill.late_fee_enabled && lateFee === 0 && (
        <div className="flex justify-between text-amber-400">
          <span>Late penalty (after due date)</span>
          <span>
            {bill.late_fee_type === 'PERCENT_PER_MONTH'
              ? `${Number(bill.late_fee_value || 0)}% / mo`
              : bill.late_fee_type === 'FIXED_ONE_TIME'
              ? `₹${Number(bill.late_fee_value || 0).toLocaleString('en-IN')} fixed`
              : `₹${Number(bill.late_fee_value || 0).toLocaleString('en-IN')} / mo`}
          </span>
        </div>
      )}
      <div className="flex justify-between font-bold border-t pt-1" style={{ borderColor: 'var(--glass-border)' }}>
        <span>Total Payable</span>
        <span>₹{totalPayable.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

/* ─── Skeleton helpers ─── */
function SkeletonBlock({ width = "100%", height = 14, radius = 6, style = {} }) {
  return (
    <div className="rd-skeleton"
      style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }} />
  );
}

/* Accountant card skeleton */
function AccountantSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-3"
          style={{ background: "var(--card-inner-bg)" }}>
          <SkeletonBlock width={32} height={32} radius={8} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <SkeletonBlock width="50%" height={10} />
            <SkeletonBlock width="75%" height={13} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Stat cards skeleton */
function StatCardsSkeleton() {
  const tones = ["brand", "success", "warning", "danger"];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tones.map((tone) => (
        <StatCard
          key={tone}
          tone={tone}
          layout="inline"
          value={<SkeletonBlock width={44} height={22} radius={6} />}
          label={<SkeletonBlock width={72} height={11} radius={4} />}
          icon={<SkeletonBlock width={36} height={36} radius={10} />}
          style={{ border: "none", opacity: 0.55 }}
        />
      ))}
    </div>
  );
}

/* Mobile bill card skeleton */
function MobileBillSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
      {/* color bar */}
      <div className="rd-skeleton rd-skeleton-bar" style={{ height: 3, borderRadius: 0 }} />
      <div className="p-4" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* title + badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <SkeletonBlock width="60%" height={15} />
            <SkeletonBlock width="35%" height={11} />
          </div>
          <SkeletonBlock width={72} height={22} radius={999} />
        </div>
        {/* amount box */}
        <div className="flex justify-between items-center rounded-xl p-3"
          style={{ background: "var(--card-bg)" }}>
          <SkeletonBlock width={80} height={12} />
          <SkeletonBlock width={80} height={20} radius={6} />
        </div>
        {/* pay button */}
        <SkeletonBlock width={110} height={34} radius={10} />
      </div>
    </div>
  );
}

/* Desktop table row skeleton */
function TableRowSkeleton() {
  const widths = ["160px", "100px", "100px", "90px", "90px", "110px"];
  return (
    <tr>
      {widths.map((w, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          <SkeletonBlock width={w} height={14} />
        </td>
      ))}
    </tr>
  );
}


const SKELETON_COUNT = 5;

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentBills() {
  const [limit, setLimit] = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [detailBill, setDetailBill] = useState(null);
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const isTenant = String(user?.resident_type || "").toUpperCase() === "TENANT";
  const [accountants, setAccountants] = useState([]);
  const [loadingAcct, setLoadingAcct] = useState(true);
  const [showAccountant, setShowAccountant] = useState(false);

  const [bills, setBills] = useState([]);
  const [counts, setCounts] = useState({ total: 0, paid: 0, pending: 0, due: 0 });

  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const debouncedSearch = useDebounce(search, 500);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    API.get("/users/accountant")
      .then((r) => {
        const data = Array.isArray(r.data)
          ? r.data
          : r.data ? [r.data] : [];
        setAccountants(data);
      })
      .catch(console.error)
      .finally(() => setLoadingAcct(false));
  }, []);

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const loadBills = useCallback(async (pageNum, currentFilter, currentSearch, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: limitRef.current,
        filter: currentFilter,
        ...(currentSearch ? { search: currentSearch } : {}),
      });
      const res = await API.get(`/bills/resident?${params}`);
      setBills(res.data.data || []);
      setCounts(res.data.counts);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadBills(1, "ALL", "", true); }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadBills(1, filter, debouncedSearch);
  }, [debouncedSearch, filter]);

  const handleFilterChange = (f) => setFilter(f);
  const handlePageChange = (p) => loadBills(p, filter, debouncedSearch);
  const handleClearFilters = () => { setSearch(""); setFilter("ALL"); };

  const STATS = [
    { label: t("billStatTotal"), val: counts.total, icon: <MdOutlineReceiptLong size={20} />, tone: "brand" },
    { label: t("billStatPaid"), val: counts.paid, icon: <MdOutlineCheckCircle size={20} />, tone: "success" },
    { label: t("billStatPending"), val: counts.pending, icon: <MdOutlineSchedule size={20} />, tone: "warning" },
    { label: t("resBillDue"), val: `₹${counts.due.toLocaleString("en-IN")}`, icon: <MdOutlineCurrencyRupee size={20} />, tone: "danger" },
  ];

  const slidingFilterItems = [
    { id: "ALL", label: t("billTabAll"), count: counts.total },
    { id: "PAID", label: t("billTabPaid"), count: counts.paid },
    { id: "PENDING", label: t("billTabPending"), count: counts.pending },
  ];

  const isEmpty = !initialLoad && counts.total === 0;
  const noMatch = !initialLoad && counts.total > 0 && bills.length === 0 && !fetching;
  const hasResults = !initialLoad && bills.length > 0;

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="ad-page-icon">
          <MdOutlineReceiptLong size={22} />
        </div>
        <div>
          <h2 className="page-title">{t("resBillsTitle")}</h2>
          <p className="page-subtitle">{t("resBillsSubtitle")}</p>
        </div>
      </div>

      {/* ── Accountant & Financial Desk Banner ── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4 sm:p-5 border border-glass-border shadow-sm transition-all"
        style={{ background: "var(--card-inner-bg)" }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <MdOutlineAccountBalance size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                {t("resBillAccountant") || "Society Accounts & Billing Desk"}
              </p>
              {accountants.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-accent/15 text-accent border border-accent/25">
                  {accountants.length === 1
                    ? t("resBillAcctContactOne", { count: accountants.length })
                    : t("resBillAcctContactMany", { count: accountants.length })}
                </span>
              )}
            </div>
            <p className="text-xs text-secondary truncate mt-0.5">
              {accountants.length > 0
                ? accountants.length === 1
                  ? t("resBillAcctAvailableOne", { count: accountants.length })
                  : t("resBillAcctAvailableMany", { count: accountants.length })
                : t("resBillAccountantNone") || "Contact your society accountant for bill enquiries"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAccountant(true)}
          className="btn-primary flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto cursor-pointer"
          style={{ borderRadius: 14, padding: "10px 18px", fontSize: 12.5 }}
        >
          <span>{t("resBillViewAcctInfo") || "View All Accountants"}</span>
          <MdArrowForward size={15} />
        </button>
      </div>

      {/* ── Stat cards — skeleton on first load ── */}
      {initialLoad
        ? <StatCardsSkeleton />
        : counts.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map((s, i) => (
              <StatCard
                key={i}
                tone={s.tone}
                layout="inline"
                icon={s.icon}
                value={s.val}
                label={s.label}
                style={{ border: "none", animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        )
      }

      {/* ── Table card ── */}
      <div className="data-table-wrap">

        {/* Toolbar — with SlidingTabs and ExpandableSearch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
          style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <div className="flex items-center gap-2 shrink-0">
            <MdOutlineReceiptLong size={16} style={{ color: "var(--accent)" }} />
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {t("billSocietyBills")}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-1 flex-wrap sm:flex-nowrap">
            <div className="overflow-x-auto max-w-full pb-0.5" style={{ scrollbarWidth: "none" }}>
              <SlidingTabs
                items={slidingFilterItems}
                value={filter}
                onChange={handleFilterChange}
              />
            </div>

            <div className="shrink-0 ml-auto sm:ml-0">
              <ExpandableSearch
                placeholder={t("billSearch") || "Search bills..."}
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>
        </div>

        {/* ── SKELETON (first load) ── */}
        {initialLoad && (
          <>
            {/* Mobile skeletons */}
            <div className="flex flex-col gap-3 p-4 sm:hidden">
              {[...Array(SKELETON_COUNT)].map((_, i) => (
                <MobileBillSkeleton key={i} />
              ))}
            </div>

            {/* Desktop skeleton table */}
            <div className="hidden sm:block">
              <table className="data-table">
                <thead>
                  <tr>
                    {[t("billTitleCol"), t("billFlatCol") || "Flat", t("billMonthCol"), t("billIssueDateCol"),
                    t("billLastPayDateCol"), t("billAmountCol"),
                    t("billStatusCol"), t("billActionCol")].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(SKELETON_COUNT)].map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {isEmpty && (
          <div className="flex flex-col items-center gap-3 py-16">
            <MdOutlineInbox size={48} className="text-secondary opacity-20" />
            <p className="text-sm text-secondary">{t("resBillEmpty")}</p>
          </div>
        )}

        {/* ── No match ── */}
        {noMatch && (
          <div className="flex flex-col items-center gap-3 py-12">
            <MdSearch size={32} className="text-secondary opacity-20" />
            <p className="text-sm text-secondary">{t("billNoMatch")}</p>
            <button onClick={handleClearFilters} className="text-xs font-semibold"
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
              {t("billClearFilters")}
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {hasResults && (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 p-4 sm:hidden">
              {bills.map((b, i) => (
                <div key={b.id} className="rounded-2xl overflow-hidden animate-fadeIn"
                  style={{
                    animationDelay: `${i * 35}ms`,
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--glass-border)",
                  }}>
                  <div style={{
                    height: 3,
                    background: b.status === "PAID"
                      ? "linear-gradient(90deg,#34d399,#059669)"
                      : "linear-gradient(90deg,#4BCBEB,var(--accent))",
                  }} />
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{b.title}</p>
                        {b.Flat && (
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--accent)" }}>
                            Flat {b.Flat.flat_number} {b.Flat.Block?.name ? `(${b.Flat.Block.name})` : ""}
                          </p>
                        )}
                        <p className="text-xs text-secondary mt-1">{b.billing_month}</p>
                        {b.issue_date || b.last_pay_date ? (
                          <div className="flex gap-6 mt-2.5">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                                {t("resBillIssueDate")}
                              </p>
                              <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                                {formatBillDate(b.issue_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                                {t("resBillLastPayDate")}
                              </p>
                              <p className="text-xs font-bold mt-0.5" style={{ color: "var(--accent)" }}>
                                {formatBillDate(b.last_pay_date)}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="flex justify-between items-center rounded-xl p-3"
                      style={{ background: "var(--card-bg)" }}>
                      <span className="text-xs text-secondary">{t("billAmountLabel")}</span>
                      <span className="font-bold text-lg" style={{ color: "var(--accent)" }}>
                        ₹{Number(b.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailBill(b)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap"
                        style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)", background: "var(--card-inner-bg)" }}
                      >
                        <MdVisibility size={13} /> {t("resBillDetails", "Details")}
                      </button>
                      {b.status === "PENDING_VERIFICATION" ? (
                        <span className="text-xs font-bold text-blue-400 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 inline-block">
                          Submitted — Awaiting Admin Confirmation
                        </span>
                      ) : b.status !== "PAID" && !isTenant ? (
                        <button
                          onClick={() => navigate("/resident/payment", {
                            state: { id: b.id, amount: b.total_payable ?? b.amount, title: b.title, type: "BILL" },
                          })}
                          className="btn-primary self-start flex items-center gap-2 whitespace-nowrap"
                          style={{ borderRadius: 10, padding: "8px 16px", fontSize: 13 }}>
                          {t("resBillPayNow")} <MdArrowForward size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="data-table">
                <thead>
                  <tr>
                    {[t("billTitleCol"), t("billFlatCol") || "Flat", t("billMonthCol"), t("billIssueDateCol"),
                    t("billLastPayDateCol"), t("billAmountCol"),
                    t("billStatusCol"), t("billActionCol")].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b, i) => (
                    <tr key={b.id} className="animate-fadeIn" style={{ animationDelay: `${i * 25}ms` }}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: 3, height: 32, borderRadius: 99,
                            background: b.status === "PAID"
                              ? "linear-gradient(180deg,#34d399,#059669)"
                              : b.status === "PENDING_VERIFICATION"
                                ? "linear-gradient(180deg,var(--acct-cyan),var(--acct-sky))"
                                : "linear-gradient(180deg,var(--warning),#eab308)",
                          }} />
                          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                            {b.title}
                          </span>
                        </div>
                      </td>
                      <td>
                        {b.Flat ? (
                          <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                            {b.Flat.flat_number} {b.Flat.Block?.name ? `(${b.Flat.Block.name})` : ""}
                          </span>
                        ) : (
                          <span className="text-secondary opacity-30">—</span>
                        )}
                      </td>
                      <td><span className="info-chip">{b.billing_month}</span></td>
                      <td><span className="info-chip">{formatBillDate(b.issue_date)}</span></td>
                      <td>
                        <span className="info-chip" style={b.last_pay_date ? { color: "var(--accent)", fontWeight: 700 } : undefined}>
                          {formatBillDate(b.last_pay_date)}
                        </span>
                      </td>
                      <td>
                        <span className="bill-table-amount">
                          ₹{Number(b.total_payable ?? b.amount).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailBill(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap"
                            style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)", background: "var(--card-inner-bg)" }}
                          >
                            <MdVisibility size={13} /> {t("resBillDetails", "Details")}
                          </button>
                          {b.status === "PENDING_VERIFICATION" ? (
                            <span className="text-xs font-semibold text-blue-400 whitespace-nowrap">
                              Awaiting Confirmation
                            </span>
                          ) : b.status !== "PAID" && !isTenant ? (
                            <button
                              onClick={() => navigate("/resident/payment", {
                                state: { id: b.id, amount: b.total_payable ?? b.amount, title: b.title, type: "BILL" },
                              })}
                              className="btn-primary flex items-center gap-1 whitespace-nowrap"
                              style={{ borderRadius: 10, fontSize: 12, padding: "7px 14px" }}>
                              {t("resBillPayNow")} <MdArrowForward size={13} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="table-footer" style={{ flexDirection: "column", gap: 10, alignItems: "stretch" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">
                    {t("billShowing")}{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{bills.length}</strong>{" "}
                    {t("billOf")} {totalItems} {t("billCount")}
                  </span>
                </div>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── All Society Accountants Modal ── */}
      {showAccountant && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "var(--overlay-bg, rgba(0,0,0,0.7))", backdropFilter: "blur(8px)", zIndex: 9999 }}
          onClick={() => setShowAccountant(false)}
        >
          <div
            className="rounded-3xl w-full max-w-2xl overflow-hidden animate-scaleIn border border-glass-border shadow-2xl flex flex-col max-h-[88vh]"
            style={{ background: "var(--card-bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start p-5 sm:p-6 border-b border-glass-border">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <MdOutlineAccountBalance size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {t("resBillAccountant") || "Society Accountants & Contacts"}
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    {t("resBillAccountantSub") || "Assigned financial desk officers for maintenance verification, queries & offline payments"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountant(false)}
                className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-white/10 transition cursor-pointer"
                title="Close"
              >
                <MdClose size={22} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {loadingAcct ? (
                <AccountantSkeleton />
              ) : accountants.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-card-inner-bg flex items-center justify-center text-secondary">
                    <MdPerson size={28} />
                  </div>
                  <p className="text-sm font-bold text-primary">No Accountants Assigned</p>
                  <p className="text-xs text-secondary max-w-xs">
                    No accountant is currently mapped to your society. Please contact the society administrator.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accountants.map((acc, idx) => {
                    const isActive = acc.status === "ACTIVE" || !acc.status;
                    const initial = (acc.name || "A").charAt(0).toUpperCase();

                    return (
                      <div
                        key={acc.id || acc.assignment_id || idx}
                        className="rounded-2xl p-4 border border-glass-border shadow-sm flex flex-col justify-between transition-all hover:border-accent/40"
                        style={{ background: "var(--card-inner-bg)" }}
                      >
                        {/* Top: Avatar & Name & Badges */}
                        <div className="flex items-start gap-3">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-white text-base shadow-sm"
                            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                                {acc.name}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${isActive
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                  }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-accent/10 text-accent">
                                Accountant
                              </span>
                              {acc.societyName && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-secondary truncate max-w-32.5">
                                  <MdLocationCity size={12} className="shrink-0" />
                                  <span className="truncate">{acc.societyName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="my-3 border-t border-glass-border opacity-70" />

                        {/* Contact details with Copy & Direct Links */}
                        <div className="space-y-2 text-xs">
                          {/* Phone */}
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-glass-border">
                            <div className="flex items-center gap-2 min-w-0">
                              <MdPhone size={15} className="text-emerald-400 shrink-0" />
                              <a
                                href={acc.phone ? `tel:${acc.phone}` : undefined}
                                className="font-semibold truncate text-primary hover:text-accent transition"
                              >
                                {acc.phone || "No phone provided"}
                              </a>
                            </div>
                            {acc.phone && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(acc.phone, "Phone number")}
                                className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-white/10 transition cursor-pointer shrink-0"
                                title="Copy phone"
                              >
                                <MdContentCopy size={13} />
                              </button>
                            )}
                          </div>

                          {/* Email */}
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-glass-border">
                            <div className="flex items-center gap-2 min-w-0">
                              <MdEmail size={15} className="text-indigo-400 shrink-0" />
                              <a
                                href={acc.email && acc.email !== "—" ? `mailto:${acc.email}` : undefined}
                                className="font-semibold truncate text-primary hover:text-accent transition"
                              >
                                {acc.email || "No email provided"}
                              </a>
                            </div>
                            {acc.email && acc.email !== "—" && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(acc.email, "Email")}
                                className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-white/10 transition cursor-pointer shrink-0"
                                title="Copy email"
                              >
                                <MdContentCopy size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-glass-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowAccountant(false)}
                className="btn-primary cursor-pointer"
                style={{ borderRadius: 12, padding: "8px 20px", fontSize: 13 }}
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {detailBill && (() => {
        let calcDetails = detailBill.calculation_details;
        if (typeof calcDetails === "string") {
          try { calcDetails = JSON.parse(calcDetails); } catch { calcDetails = null; }
        }
        const hasCalcSplit = calcDetails && (calcDetails.owner_base_amount != null || calcDetails.configured_amount != null);
        const ownerBaseAmt = hasCalcSplit
          ? Number(calcDetails.owner_base_amount ?? calcDetails.configured_amount ?? 0)
          : Number(detailBill.base_amount ?? detailBill.amount ?? 0);
        const tenantExtraAmt = hasCalcSplit ? Number(calcDetails.additional_tenant_charge ?? 0) : 0;
        const billSubtotal = Number(detailBill.base_amount ?? detailBill.amount ?? 0);

        return createPortal(
          <div
            onClick={() => setDetailBill(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1100,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 880,
                background: "var(--card-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: 22,
                backdropFilter: "blur(24px)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.42)",
                overflow: "hidden",
              }}
            >
              {/* Modern Header */}
              <div
                className="flex items-center justify-between gap-3 px-6 py-4 border-b"
                style={{
                  borderColor: "var(--glass-border)",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.04))",
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                      boxShadow: "0 8px 20px rgba(99,102,241,0.3)",
                    }}
                  >
                    <MdOutlineReceiptLong size={21} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight" style={{ color: "var(--text-primary)", margin: 0 }}>
                      {detailBill.title}
                    </h3>
                    <p className="text-xs text-secondary mt-0.5 font-medium">
                      {detailBill.billing_month}{detailBill.Flat ? ` · ${detailBill.Flat.flat_number}${detailBill.Flat.Block?.name ? ` (${detailBill.Flat.Block.name})` : ""}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailBill(null)}
                  className="w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)", background: "var(--card-inner-bg)" }}
                >
                  <MdClose size={16} />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                {/* Hero Payable Banner */}
                <div
                  className="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3"
                  style={{
                    borderColor: "var(--glass-border)",
                    background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.03))",
                  }}
                >
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">Total Payable</p>
                    <p className="text-3xl font-black tracking-tight tabular-nums mt-0.5" style={{ color: "var(--text-primary)" }}>
                      ₹{Number(detailBill.total_payable ?? detailBill.amount ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold text-secondary"
                      style={{ borderColor: "var(--glass-border)", background: "var(--card-bg)" }}
                    >
                      <MdSchedule size={14} className="text-indigo-400" />
                      Due: {formatBillDate(detailBill.last_pay_date || detailBill.due_date)}
                    </span>
                    <StatusBadge status={detailBill.status} />
                  </div>
                </div>

                {/* 2-Column Content */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.35fr] gap-4">
                  {/* Left: Bill & Charge Summary */}
                  <div className="rounded-2xl border p-4 space-y-2.5 text-xs" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                    <p className="text-[11px] font-extrabold text-secondary uppercase tracking-wider">Bill &amp; Charge Summary</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-secondary">Base Maintenance</span>
                        <span className="font-bold tabular-nums">₹{ownerBaseAmt.toLocaleString("en-IN")}</span>
                      </div>
                      {tenantExtraAmt > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-secondary">Tenant Extra Charge</span>
                          <span className="font-bold text-indigo-400 tabular-nums">+₹{tenantExtraAmt.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center border-t pt-2" style={{ borderColor: "var(--glass-border)" }}>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Bill Subtotal</span>
                        <span className="font-extrabold tabular-nums">₹{billSubtotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-secondary">Overdue Months</span>
                        <span className="font-bold tabular-nums">{detailBill.overdue_months || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary">Calculated Late Fee</span>
                        <span className="font-bold tabular-nums">₹{Number(detailBill.calculated_late_fee ?? detailBill.late_fee ?? 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary">Waived Amount</span>
                        <span className="font-bold text-emerald-400 tabular-nums">₹{Number(detailBill.waived_amount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2 font-extrabold" style={{ borderColor: "var(--glass-border)" }}>
                        <span>Outstanding Late Fee</span>
                        <span
                          className="tabular-nums"
                          style={Number(detailBill.late_fee || 0) > 0 ? { color: "#EAB308" } : undefined}
                        >
                          ₹{Number(detailBill.late_fee || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Penalty If Paid Late */}
                  {detailBill.late_fee_enabled ? (() => {
                    const base = billSubtotal;
                    const typeLabel =
                      detailBill.late_fee_type === "FIXED_ONE_TIME"
                        ? "Fixed Penalty"
                        : detailBill.late_fee_type === "PERCENT_PER_MONTH"
                        ? "Monthly Fixed %"
                        : "Monthly Fixed Amount";
                    const valLabel =
                      detailBill.late_fee_type === "PERCENT_PER_MONTH"
                        ? `${Number(detailBill.late_fee_value || 0)}%`
                        : `₹${Number(detailBill.late_fee_value || 0).toLocaleString("en-IN")}`;
                    const dueRaw = detailBill.last_pay_date || detailBill.due_date;
                    const dueIso = dueRaw ? String(dueRaw).slice(0, 10) : null;
                    const parsedDue = dueIso ? new Date(`${dueIso}T00:00:00`) : new Date();
                    const validDue = Number.isNaN(parsedDue.getTime()) ? new Date() : parsedDue;
                    const grace = Math.max(0, parseInt(detailBill.late_fee_grace_days || "0", 10) || 0);
                    const cutoff = new Date(validDue.getFullYear(), validDue.getMonth(), validDue.getDate() + grace);
                    const daysInCutoffMonth = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
                    const startsInCutoffMonth = cutoff.getDate() < daysInCutoffMonth;
                    const nextDay = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1);
                    const cutoffLabel = cutoff.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

                    return (
                      <div className="rounded-2xl border p-4 space-y-2.5" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-extrabold text-secondary uppercase tracking-wider">Penalty If Paid Late</p>
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                            style={{
                              backgroundColor: "rgba(234, 179, 8, 0.14)",
                              color: "#CA8A04",
                              border: "1px solid rgba(234, 179, 8, 0.35)",
                            }}
                          >
                            {typeLabel} · {valLabel}
                          </span>
                        </div>
                        <div className="rounded-xl overflow-x-auto border" style={{ borderColor: "var(--glass-border)", background: "var(--card-bg)" }}>
                          <table className="w-full text-[11.5px] tabular-nums" style={{ color: "var(--text-primary)" }}>
                            <thead>
                              <tr className="text-left uppercase tracking-wider text-secondary text-[10px]" style={{ background: "rgba(245,158,11,0.08)", borderBottom: "1px solid var(--glass-border)" }}>
                                <th className="py-2 px-2.5">Period</th>
                                <th className="py-2 px-2.5 text-right">Penalty</th>
                                <th className="py-2 px-2.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                <td className="py-2 px-2.5 font-semibold text-emerald-400 whitespace-nowrap">Until {cutoffLabel}</td>
                                <td className="py-2 px-2.5 text-right text-secondary whitespace-nowrap">₹0</td>
                                <td className="py-2 px-2.5 text-right font-bold whitespace-nowrap">₹{base.toLocaleString("en-IN")}</td>
                              </tr>
                              {[1, 2, 3].map((slab, idx) => {
                                const monthOffset = startsInCutoffMonth ? slab - 1 : slab;
                                const target = new Date(cutoff.getFullYear(), cutoff.getMonth() + monthOffset, 1);
                                const baseMonthName = target.toLocaleString("en-US", { month: "long" });
                                const mName =
                                  slab === 1 && startsInCutoffMonth
                                    ? `${baseMonthName} (${nextDay.getDate()} ${target.toLocaleString("en-US", { month: "short" })}+)`
                                    : baseMonthName;
                                const res = computeLiveLateFeePreview({
                                  enabled: true,
                                  feeType: detailBill.late_fee_type,
                                  feeAmount: detailBill.late_fee_value,
                                  maxFeeAmount: detailBill.late_fee_max_amount,
                                  sampleBase: base,
                                  overdueMonths: slab,
                                });
                                return (
                                  <tr key={slab} style={{ borderBottom: idx < 2 ? "1px solid var(--glass-border)" : "none" }}>
                                    <td className="py-2 px-2.5 font-semibold whitespace-nowrap">{mName}</td>
                                    <td className="py-2 px-2.5 text-right font-bold whitespace-nowrap">
                                      <span style={{ color: "#CA8A04" }}>+₹{res.penalty.toLocaleString("en-IN")}</span>
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-extrabold whitespace-nowrap">₹{res.total.toLocaleString("en-IN")}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="rounded-2xl border p-4 text-xs text-secondary flex flex-col justify-center" style={{ borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider mb-1">Penalty If Paid Late</p>
                      <p>No late payment penalty applies to this bill.</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
                  <button
                    type="button"
                    onClick={() => setDetailBill(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors"
                    style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)", background: "var(--card-inner-bg)" }}
                  >
                    Close
                  </button>
                  {detailBill.status !== "PAID" && detailBill.status !== "PENDING_VERIFICATION" && !isTenant && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = detailBill;
                        setDetailBill(null);
                        navigate("/resident/payment", {
                          state: { id: target.id, amount: target.total_payable ?? target.amount, title: target.title, type: "BILL" },
                        });
                      }}
                      className="btn-primary flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      style={{ borderRadius: 12, padding: "8px 18px", fontSize: 13 }}
                    >
                      {t("resBillPayNow")} <MdArrowForward size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
