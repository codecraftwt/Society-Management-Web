
import { useEffect, useState, useCallback, useMemo } from "react";
import API from "../../services/api";
import {
  MdReceiptLong,
  MdSearch,
  MdClose,
  MdCheckCircle,
  MdSchedule,
  MdOutlineInbox,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";

/* ── Debounce ── */
function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/* ── Spinner ── */
function Spinner({ size = 16 }) {
  return (
    <svg
      style={{ width: size, height: size }}
      className="animate-spin text-current"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Mobile hook ── */
function useIsMobile() {
  const [m, setM] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

/* ── Pagination ── */
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
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="pagination-btn"
      >
        <MdChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="pagination-ellipsis">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="pagination-btn"
      >
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

/* ── Status pill ── */
function BillStatus({ status }) {
  if (status === "PAID")
    return (
      <span className="bill-pill-paid">
        <MdCheckCircle size={12} /> Paid
      </span>
    );
  if (status === "PENDING_VERIFICATION")
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
        <MdSchedule size={12} /> Awaiting Confirmation
      </span>
    );
  return (
    <span className="bill-pill-pending">
      <MdSchedule size={12} /> Pending
    </span>
  );
}

const LIMIT = 10;

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
export default function CommitteeManageBills() {
  const isMobile = useIsMobile();

  /* ── List state ── */
  const [bills, setBills] = useState([]);
  const [counts, setCounts] = useState({ total: 0, paid: 0, pending: 0, revenue: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  /* ── Pagination ── */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ── Search & filter ── */
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  /* ────────────────────────────────────
     LOAD BILLS — backend paginated
  ──────────────────────────────────── */
  const loadBills = useCallback(async (pg, q, filter, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: LIMIT,
        filter,
        ...(q ? { search: q } : {}),
      });
      const res = await API.get(`/bills/society?${params}`);
      const data = res.data;

      setBills(data.data || []);
      setCounts(data.counts || { total: 0, paid: 0, pending: 0, revenue: 0 });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  /* ── Initial load ── */
  useEffect(() => {
    loadBills(1, "", "ALL", true);
  }, []);

  /* ── Re-fetch on search change ── */
  useEffect(() => {
    if (initialLoad) return;
    loadBills(1, debSearch, filterStatus);
  }, [debSearch]);

  /* ── Re-fetch on filter change ── */
  const handleFilterChange = (f) => {
    setFilterStatus(f);
    loadBills(1, debSearch, f);
  };

  const handlePageChange = (p) => loadBills(p, debSearch, filterStatus);

  const [confirmingId, setConfirmingId] = useState(null);

  const handleConfirmPayment = async (id) => {
    setConfirmingId(id);
    try {
      await API.put(`/bills/confirm/${id}`);
      loadBills(page, debSearch, filterStatus);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to confirm payment");
    } finally {
      setConfirmingId(null);
    }
  };

  /* ── Tabs ── */
  const TABS = [
    { key: "ALL", label: "All", ac: "indigo", count: counts.total },
    { key: "PENDING_VERIFICATION", label: "Awaiting Confirmation", ac: "blue", count: counts.pendingVerification || 0 },
    { key: "PAID", label: "Paid", ac: "green", count: counts.paid },
    { key: "PENDING", label: "Pending", ac: "amber", count: counts.pending },
  ];

  /* ── Cards reflect active tab ── */
  const displayedCounts = useMemo(() => {
    const pagePaidAmount = bills.filter(b => b.status === "PAID").reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const pagePendingAmount = bills.filter(b => b.status !== "PAID").reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const pageTotalAmount = bills.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    if (filterStatus === "PAID") {
      const amountVal = search ? pagePaidAmount : (counts.revenue ?? pagePaidAmount);
      return {
        total: totalItems,
        paid: totalItems,
        pending: 0,
        amount: amountVal,
        amountLabel: "Paid Amount",
      };
    }
    if (filterStatus === "PENDING" || filterStatus === "PENDING_VERIFICATION") {
      const amountVal = search ? pagePendingAmount : (counts.pendingAmount ?? pagePendingAmount);
      return {
        total: totalItems,
        paid: 0,
        pending: totalItems,
        amount: amountVal,
        amountLabel: "Pending Amount",
      };
    }
    const amountVal = search ? pageTotalAmount : (counts.totalAmount ?? pageTotalAmount);
    return {
      total: totalItems || counts.total,
      paid: counts.paid,
      pending: counts.pending,
      amount: amountVal,
      amountLabel: "Total Amount",
    };
  }, [counts, totalItems, filterStatus, bills, search]);

  const STATS = [
    { label: "Total Bills", val: displayedCounts.total, icon: "🧾", color: "purple", extra: "" },
    { label: "Paid", val: displayedCounts.paid, icon: "✅", color: "green", extra: "" },
    { label: "Pending", val: displayedCounts.pending, icon: "⏳", color: "amber", extra: "" },
    {
      label: displayedCounts.amountLabel,
      val: `₹${(displayedCounts.amount || 0).toLocaleString("en-IN")}`,
      icon: "💰",
      color: "blue",
      extra: "stat-card--revenue",
    },
  ];

  return (
    <div className="page-root animate-fadeIn">

      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="er-icon er-icon--amenity">
            <MdReceiptLong size={22} />
          </div>
          <div>
            <h2
              className="page-title"
              style={{ fontSize: isMobile ? 17 : 20 }}
            >
              Society Bills
            </h2>
            <p className="page-subtitle">View and track all resident bills</p>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      {!initialLoad && counts.total > 0 && (
        <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
          {STATS.map((s, i) => (
            <div
              key={i}
              className={`${isMobile ? "stat-card--mobile" : "stat-card"} stat-card--${s.color} ${s.extra}`}
            >
              {isMobile ? (
                <>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="stat-card__val">{s.val}</div>
                  <div className="stat-card__label">{s.label}</div>
                </>
              ) : (
                <>
                  <div>
                    <div className="stat-card__val">{s.val}</div>
                    <div className="stat-card__label">{s.label}</div>
                  </div>
                  <div className="stat-card__icon">{s.icon}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── BILLS TABLE ── */}
      <div className="data-table-wrap">

        {/* Toolbar */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: 11,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)", flexShrink: 0 }}
            >
              Society Bills
              {!initialLoad && (
                <span className="text-xs font-normal text-secondary ml-2">
                  — {totalItems}{" "}
                  {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""}{" "}
                  bills
                  {search ? ` matching "${search}"` : ""}
                </span>
              )}
            </span>

            {/* Search */}
            <div
              className="search-input-wrap"
              style={{ maxWidth: 240, width: "100%" }}
            >
              <MdSearch size={15} className="search-input-icon" />
              <input
                className="input h-10 w-full pl-10 pr-8"
                placeholder="Search bills…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {fetching && !initialLoad ? (
                <div
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  <Spinner size={13} />
                </div>
              ) : search ? (
                <button
                  className="search-input-clear"
                  onClick={() => setSearch("")}
                >
                  <MdClose size={13} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="filter-strip" style={{ width: "100%" }}>
            {TABS.map(({ key, label, ac, count }) => {
              const on = filterStatus === key;
              return (
                <button
                  key={key}
                  className={`filter-pill ${on ? `filter-pill--active-${ac}` : ""}`}
                  style={{ flex: 1, justifyContent: "center", display: "flex" }}
                  onClick={() => handleFilterChange(key)}
                >
                  {label}
                  <span className="filter-pill__count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Loading ── */}
        {initialLoad && (
          <div className="flex flex-col items-center gap-3 py-16 text-secondary">
            <Spinner size={26} />
            <p className="text-sm">Loading bills…</p>
          </div>
        )}

        {/* ── Empty (no bills at all) ── */}
        {!initialLoad && counts.total === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-secondary animate-fadeIn">
            <MdOutlineInbox size={48} className="opacity-20" />
            <p className="text-sm">No bills have been generated yet.</p>
          </div>
        )}

        {/* ── No match for current search/filter ── */}
        {!initialLoad && counts.total > 0 && bills.length === 0 && !fetching && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary animate-fadeIn">
            <MdSearch size={36} className="opacity-20" />
            <p className="text-sm">No bills match your search.</p>
            <button
              className="text-xs font-semibold text-accent hover:underline"
              onClick={() => {
                setSearch("");
                handleFilterChange("ALL");
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Mobile cards ── */}
        {!initialLoad && bills.length > 0 && isMobile && (
          <div className="flex flex-col gap-3 p-4">
            {bills.map((b, i) => (
              <div
                key={b.id}
                className="bill-card animate-fadeIn"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div
                  style={{
                    height: 3,
                    background:
                      b.status === "PAID"
                        ? "linear-gradient(90deg,#34d399,#059669)"
                        : "linear-gradient(90deg,#60A5FA,#2563EB)",
                  }}
                />
                <div className="bill-card__body">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className="font-bold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {b.title}
                      </p>
                      <p className="text-xs text-secondary mt-0.5">
                        {b.billing_month}
                      </p>
                    </div>
                    <BillStatus status={b.status} />
                  </div>

                  <div className="bill-amount-box">
                    <span className="text-xs text-secondary font-medium">
                      Amount
                    </span>
                    <span className="bill-amount-val">
                      ₹{Number(b.amount).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-secondary mb-1">Flat</p>
                      <span className="flat-chip">
                        {b.Flat?.flat_number}
                        <span style={{ opacity: 0.55 }}>
                          {" "}· {b.Flat?.Block?.name}
                        </span>
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-secondary mb-1">Resident</p>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {b.Flat?.User?.name || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Desktop table ── */}
        {!initialLoad && bills.length > 0 && !isMobile && (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Flat</th>
                <th>Resident</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b, i) => (
                <tr
                  key={b.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <td>
                    <span className="text-xs font-semibold text-secondary">
                      {(page - 1) * LIMIT + i + 1}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: 3,
                          height: 32,
                          borderRadius: 99,
                          flexShrink: 0,
                          background:
                            b.status === "PAID"
                              ? "linear-gradient(180deg,#34d399,#059669)"
                              : "linear-gradient(180deg,#60A5FA,#2563EB)",
                        }}
                      />
                      <span
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {b.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="flat-chip">
                      {b.Flat?.flat_number}
                      <span style={{ opacity: 0.55 }}>
                        {" "}· {b.Flat?.Block?.name}
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="text-sm text-secondary">
                      {b.Flat?.User?.name || "—"}
                    </span>
                  </td>
                  <td>
                    <span className="info-chip">{b.billing_month}</span>
                  </td>
                  <td>
                    <span className="bill-table-amount">
                      ₹{Number(b.amount).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td>
                    <BillStatus status={b.status} />
                  </td>
                  <td>
                    {b.status === "PENDING_VERIFICATION" ? (
                      <button
                        onClick={() => handleConfirmPayment(b.id)}
                        disabled={confirmingId === b.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors inline-flex items-center gap-1 shadow-sm shrink-0"
                        title="Confirm payment"
                      >
                        <MdCheckCircle size={13} /> {confirmingId === b.id ? "Confirming..." : "Confirm Payment"}
                      </button>
                    ) : (
                      <span className="text-xs text-secondary opacity-30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Footer: count + pagination ── */}
        {!initialLoad && bills.length > 0 && (
          <div
            className="table-footer"
            style={{ flexWrap: "wrap", gap: 10 }}
          >
            <span className="text-xs text-secondary">
              Showing{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {(page - 1) * LIMIT + 1}–
                {Math.min(page * LIMIT, totalItems)}
              </strong>{" "}
              of{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {totalItems}
              </strong>{" "}
              bills
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}