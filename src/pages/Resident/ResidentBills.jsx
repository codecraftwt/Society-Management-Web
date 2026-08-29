

import { useEffect, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdReceiptLong, MdPerson, MdEmail, MdBusiness,
  MdOutlineInbox, MdCheckCircle, MdSchedule,
  MdSearch, MdClose, MdArrowForward,
  MdChevronLeft, MdChevronRight,
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

  const [accountant,  setAccountant]  = useState(null);
  const [loadingAcct, setLoadingAcct] = useState(true);

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
      .then((r) => setAccountant(r.data))
      .catch(console.error)
      .finally(() => setLoadingAcct(false));
  }, []);

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

  const FILTERS = [
    { key: "ALL",     label: t("billTabAll"),     ac: "indigo", count: counts.total   },
    { key: "PAID",    label: t("billTabPaid"),    ac: "green",  count: counts.paid    },
    { key: "PENDING", label: t("billTabPending"), ac: "amber",  count: counts.pending },
  ];

  const ACCT_ROWS = accountant ? [
    { Icon: MdPerson,   label: t("profileTileFullName"), val: accountant.name        },
    { Icon: MdEmail,    label: t("email"),               val: accountant.email       },
    { Icon: MdBusiness, label: t("profileTileSociety"),  val: accountant.societyName },
  ] : [];

  const isEmpty    = !initialLoad && counts.total === 0;
  const noMatch    = !initialLoad && counts.total > 0 && bills.length === 0 && !fetching;
  const hasResults = !initialLoad && bills.length > 0;

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--accent-soft)", border: "1.5px solid var(--glass-border)", color: "var(--accent)" }}>
          <MdReceiptLong size={22} />
        </div>
        <div>
          <h2 className="page-title">{t("resBillsTitle")}</h2>
          <p className="page-subtitle">{t("resBillsSubtitle")}</p>
        </div>
      </div>

      {/* ── Accountant card ── */}
      <div className="premium-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <MdPerson size={15} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {t("resBillAccountant")}
          </span>
        </div>
        {loadingAcct ? (
          <AccountantSkeleton />
        ) : !accountant ? (
          <p className="text-sm text-secondary">{t("resBillAccountantNone")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ACCT_ROWS.map(({ Icon, label, val }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: "var(--card-inner-bg)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--accent-soft)" }}>
                  <Icon size={15} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <p className="text-secondary uppercase tracking-wider" style={{ fontSize: 10 }}>{label}</p>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{val}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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

        {/* Toolbar — always visible, filter counts show 0 during skeleton */}
        <div className="flex flex-col gap-3 p-4"
          style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <MdReceiptLong size={15} style={{ color: "var(--accent)" }} />
              <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                {t("billSocietyBills")}
              </span>
            </div>
            <div className="relative flex-1">
              <MdSearch size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <input
                key="bill-search-input"
                className="input w-full h-9 pl-8 pr-8 text-xs"
                placeholder={t("billSearch")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={initialLoad}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                {fetching ? <Spinner small /> : search ? (
                  <button onClick={() => setSearch("")}
                    className="text-secondary hover:text-white transition-colors">
                    <MdClose size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="filter-strip w-full">
            {FILTERS.map(({ key, label, ac, count }) => (
              <button key={key}
                className={`filter-pill flex-1 justify-center ${filter === key ? `filter-pill--active-${ac}` : ""}`}
                onClick={() => handleFilterChange(key)}
                disabled={initialLoad}>
                {label} <span className="filter-pill__count">{count}</span>
              </button>
            ))}
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
                    {[t("billTitleCol"), t("billFlatCol") || "Flat", t("billMonthCol"), t("billAmountCol"),
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
                      : "linear-gradient(90deg,#fbbf24,#d97706)",
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
                    {[t("billTitleCol"), t("billFlatCol") || "Flat", t("billMonthCol"), t("billAmountCol"),
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
                              ? "linear-gradient(180deg,#60a5fa,#3b82f6)"
                              : "linear-gradient(180deg,#fbbf24,#d97706)",
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
    </div>
  );
}