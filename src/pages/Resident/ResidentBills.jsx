

import { useEffect, useState, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import SlidingTabs from "../../components/common/SlidingTabs";
import {
  MdReceiptLong, MdPerson, MdEmail, MdPhone, MdBusiness,
  MdOutlineInbox, MdCheckCircle, MdSchedule,
  MdSearch, MdClose, MdArrowForward,
  MdChevronLeft, MdChevronRight,
  MdContentCopy, MdLocationCity, MdAccountBalance,
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

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="pagination-wrap">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={15} /> Prev
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={15} />
      </button>
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
  const colors = ["purple", "green", "amber", "red"];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {colors.map((color) => (
        <div key={color} className={`stat-card stat-card--${color}`} style={{ border: "none", opacity: 0.55 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SkeletonBlock width={44} height={22} radius={6} />
            <SkeletonBlock width={72} height={11} radius={4} />
          </div>
          <SkeletonBlock width={36} height={36} radius={10} />
        </div>
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

const LIMIT = 10;
const SKELETON_COUNT = 5;

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentBills() {
  const navigate = useNavigate();
  const { t }    = useLang();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.resident_type !== "OWNER") {
      const base = user.role === "FAMILY_MEMBER" ? "/family" : "/resident";
      navigate(base, { replace: true });
    }
  }, [user, navigate]);

  const [accountants,  setAccountants]  = useState([]);
  const [loadingAcct, setLoadingAcct] = useState(true);
  const [showAccountant, setShowAccountant] = useState(false);

  const [bills,      setBills]      = useState([]);
  const [counts,     setCounts]     = useState({ total: 0, paid: 0, pending: 0, due: 0 });

  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const debouncedSearch = useDebounce(search, 500);

  const [page,       setPage]       = useState(1);
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
        page:   pageNum,
        limit:  LIMIT,
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

  const handleFilterChange  = (f) => setFilter(f);
  const handlePageChange    = (p) => loadBills(p, filter, debouncedSearch);
  const handleClearFilters  = () => { setSearch(""); setFilter("ALL"); };

  const STATS = [
    { label: t("billStatTotal"),   val: counts.total,   icon: "🧾", color: "purple" },
    { label: t("billStatPaid"),    val: counts.paid,    icon: "✅", color: "green"  },
    { label: t("billStatPending"), val: counts.pending, icon: "⏳", color: "amber"  },
    { label: t("resBillDue"),      val: `₹${counts.due.toLocaleString("en-IN")}`, icon: "💸", color: "red" },
  ];

  const slidingFilterItems = [
    { id: "ALL",     label: t("billTabAll"),     count: counts.total   },
    { id: "PAID",    label: t("billTabPaid"),    count: counts.paid    },
    { id: "PENDING", label: t("billTabPending"), count: counts.pending },
  ];

  const isEmpty    = !initialLoad && counts.total === 0;
  const noMatch    = !initialLoad && counts.total > 0 && bills.length === 0 && !fetching;
  const hasResults = !initialLoad && bills.length > 0;

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="ad-page-icon">
          <MdReceiptLong size={22} />
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
            <MdAccountBalance size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                {t("resBillAccountant") || "Society Accounts & Billing Desk"}
              </p>
              {accountants.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-accent/15 text-accent border border-accent/25">
                  {accountants.length} {accountants.length === 1 ? "Contact" : "Contacts"}
                </span>
              )}
            </div>
            <p className="text-xs text-secondary truncate mt-0.5">
              {accountants.length > 0
                ? `${accountants.length} society accountant${accountants.length > 1 ? "s" : ""} available for dues verification & queries`
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
              <div key={i} className={`stat-card stat-card--${s.color}`}
                style={{ border: "none", animationDelay: `${i * 60}ms` }}>
                <div>
                  <div className="stat-card__val">{s.val}</div>
                  <div className="stat-card__label">{s.label}</div>
                </div>
                <div className="stat-card__icon">{s.icon}</div>
              </div>
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
            <MdReceiptLong size={16} style={{ color: "var(--accent)" }} />
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
                    {b.status === "PENDING_VERIFICATION" ? (
                      <span className="text-xs font-bold text-blue-400 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 inline-block">
                        Submitted — Awaiting Admin Confirmation
                      </span>
                    ) : b.status !== "PAID" ? (
                      <button
                        onClick={() => navigate("/resident/payment", {
                          state: { id: b.id, amount: b.amount, title: b.title, type: "BILL" },
                        })}
                        className="btn-primary self-start flex items-center gap-2"
                        style={{ borderRadius: 10, padding: "8px 16px", fontSize: 13 }}>
                        {t("resBillPayNow")} <MdArrowForward size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
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
                        <span className="bill-table-amount">₹{Number(b.amount).toLocaleString("en-IN")}</span>
                      </td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        {b.status === "PENDING_VERIFICATION" ? (
                          <span className="text-xs font-semibold text-blue-400">
                            Awaiting Confirmation
                          </span>
                        ) : b.status !== "PAID" ? (
                          <button
                            onClick={() => navigate("/resident/payment", {
                              state: { id: b.id, amount: b.amount, title: b.title, type: "BILL" },
                            })}
                            className="btn-primary flex items-center gap-1"
                            style={{ borderRadius: 10, fontSize: 12, padding: "7px 14px" }}>
                            {t("resBillPayNow")} <MdArrowForward size={13} />
                          </button>
                        ) : (
                          <span className="text-secondary opacity-30">—</span>
                        )}
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
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
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
                  <MdAccountBalance size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {t("resBillAccountant") || "Society Accountants & Contacts"}
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Assigned financial desk officers for maintenance verification, queries & offline payments
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
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                  isActive
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
                                <span className="inline-flex items-center gap-1 text-[11px] text-secondary truncate max-w-[130px]">
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
    </div>
  );
}