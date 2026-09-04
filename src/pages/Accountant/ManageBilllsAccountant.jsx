
import { useEffect, useState, useCallback, useMemo } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdClose, MdSearch, MdDelete,
  MdOutlineInbox, MdReceiptLong,
  MdCheckCircle, MdSchedule,
  MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import Select from "../../components/common/Select";

/* ── helpers ── */
const getCurrentBillingMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

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
    <svg style={{ width: size, height: size }} className="animate-spin text-current" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Mobile hook ── */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
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
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="flex items-center gap-1.5">
      <button className="pagination-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        <MdChevronLeft size={14} />
      </button>
      {pages.map((p, idx) =>
        p === "…" ? (
          <span key={`e-${idx}`} className="w-6 text-center text-xs text-secondary">…</span>
        ) : (
          <button
            key={p}
            className={`pagination-btn ${p === page ? "pagination-btn-active" : ""}`}
            onClick={() => onPageChange(p)}
            disabled={p === page}
          >
            {p}
          </button>
        )
      )}
      <button className="pagination-btn" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        <MdChevronRight size={14} />
      </button>
    </div>
  );
}

/* ── Status pill ── */
function BillStatus({ status, t }) {
  if (status === "PAID")
    return <span className="bill-pill-paid"><MdCheckCircle size={12} /> {t("billPaid") || "Paid"}</span>;
  if (status === "PENDING_VERIFICATION")
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
        <MdSchedule size={12} /> Awaiting Confirmation
      </span>
    );
  return <span className="bill-pill-pending"><MdSchedule size={12} /> {t("billPending") || "Pending"}</span>;
}

/* ── Delete & Confirm controls ── */
function RowActions({ bill, confirmDeleteId, setConfirmDeleteId, handleDeleteBill, deletingId, handleConfirmPayment, confirmingId, t }) {
  if (bill.status === "PAID") return <span className="text-xs text-secondary opacity-30">—</span>;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {bill.status === "PENDING_VERIFICATION" && (
        <button
          onClick={() => handleConfirmPayment(bill.id)}
          disabled={confirmingId === bill.id}
          className="btn-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 shrink-0"
          title="Confirm resident payment and send Web/Mobile notification"
        >
          <MdCheckCircle size={13} /> {confirmingId === bill.id ? "Confirming..." : "Confirm Payment"}
        </button>
      )}

      {confirmDeleteId === bill.id ? (
        <div className="flex items-center gap-2 animate-fadeIn">
          <span className="text-xs text-secondary">{t("billSure")}</span>
          <button className="btn-delete-confirm" onClick={() => handleDeleteBill(bill.id)} disabled={deletingId === bill.id}>
            {deletingId === bill.id ? <Spinner /> : t("billYesDelete")}
          </button>
          <button className="btn-cancel-sm" onClick={() => setConfirmDeleteId(null)}>{t("cancel")}</button>
        </div>
      ) : (
        <button className="btn-delete" onClick={() => setConfirmDeleteId(bill.id)}>
          <MdDelete size={13} /> {t("billDelete")}
        </button>
      )}
    </div>
  );
}

const Label = ({ children }) => (
  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">{children}</label>
);

const LIMIT = 10;

/* ══════════════════════════════════════
   MAIN — Accountant Manage Bills
   Mirrors the Society Admin Manage Bill UI.
   Accountant is always society-scoped via JWT,
   so the Super Admin society-filter is omitted.
══════════════════════════════════════ */
export default function ManageBillsAccountant() {
  const isMobile = useIsMobile();
  const { t } = useLang();

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

  /* ── Create form ── */
  const [flats, setFlats] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    bill_type: "INDIVIDUAL", flat_id: "", title: "", amount: "", billing_month: getCurrentBillingMonth(),
  });

  /* ── Delete & Confirm ── */
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

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
    } catch (e) { console.error(e); }
    finally { setInitialLoad(false); setFetching(false); }
  }, []);

  const loadFlats = async () => {
    try {
      const res = await API.get("/flats/assigned");
      const d = res.data;
      setFlats(Array.isArray(d) ? d : d?.data || []);
    } catch (e) { console.error(e); }
  };

  /* ── Initial load ── */
  useEffect(() => { loadBills(1, "", "ALL", true); }, [loadBills]);
  useEffect(() => { loadFlats(); }, []);

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

  /* ── Create ── */
  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      await API.post("/bills", formData);
      setFormData({ bill_type: "INDIVIDUAL", flat_id: "", title: "", amount: "", billing_month: getCurrentBillingMonth() });
      setShowCreate(false);
      loadBills(1, debSearch, filterStatus);
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  /* ── Delete & Confirm ── */
  const handleDeleteBill = async (id) => {
    try {
      setDeletingId(id);
      await API.delete(`/bills/${id}`);
      const newPage = bills.length === 1 && page > 1 ? page - 1 : page;
      loadBills(newPage, debSearch, filterStatus);
    } catch (e) { alert(e.response?.data?.message || t("billDeleteFailed")); }
    finally { setDeletingId(null); setConfirmDeleteId(null); }
  };

  const handleConfirmPayment = async (id) => {
    setConfirmingId(id);
    try {
      await API.put(`/bills/confirm/${id}`);
      loadBills(page, debSearch, filterStatus);
    } catch (e) { alert(e.response?.data?.message || "Failed to confirm payment"); }
    finally { setConfirmingId(null); }
  };

  /* ── Tabs ── */
  const TABS = [
    { key: "ALL", label: t("billTabAll"), ac: "indigo", count: counts.total },
    { key: "PENDING_VERIFICATION", label: "Awaiting Confirmation", ac: "blue", count: counts.pendingVerification || 0 },
    { key: "PAID", label: t("billTabPaid"), ac: "green", count: counts.paid },
    { key: "PENDING", label: t("billTabPending"), ac: "amber", count: counts.pending },
  ];

  /* ── Cards reflect the active tab ── */
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
        amountLabel: t("billStatPaidAmount") || "Paid Amount",
      };
    }
    if (filterStatus === "PENDING" || filterStatus === "PENDING_VERIFICATION") {
      const amountVal = search ? pagePendingAmount : (counts.pendingAmount ?? pagePendingAmount);
      return {
        total: totalItems,
        paid: 0,
        pending: totalItems,
        amount: amountVal,
        amountLabel: t("billStatPendingAmount") || "Pending Amount",
      };
    }
    const amountVal = search ? pageTotalAmount : (counts.totalAmount ?? pageTotalAmount);
    return {
      total: totalItems || counts.total,
      paid: counts.paid,
      pending: counts.pending,
      amount: amountVal,
      amountLabel: t("billStatTotalAmount") || "Total Amount",
    };
  }, [counts, totalItems, filterStatus, bills, search, t]);

  const STATS = [
    { label: t("billStatTotal"), val: displayedCounts.total, icon: "🧾", color: "purple", extra: "" },
    { label: t("billStatPaid"), val: displayedCounts.paid, icon: "✅", color: "green", extra: "" },
    { label: t("billStatPending"), val: displayedCounts.pending, icon: "⏳", color: "amber", extra: "" },
    { label: displayedCounts.amountLabel, val: `₹${(displayedCounts.amount || 0).toLocaleString("en-IN")}`, icon: "💰", color: "blue", extra: "stat-card--revenue" },
  ];

  return (
    <div className="page-root animate-fadeIn">

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="er-icon er-icon--amenity"><MdReceiptLong size={22} /></div>
          <div>
            <h2 className="page-title" style={{ fontSize: isMobile ? 17 : 20 }}>{t("billsTitle")}</h2>
            <p className="page-subtitle">{t("billsSubtitle")}</p>
          </div>
        </div>
        <button
          className="btn-primary"
          style={{ borderRadius: 12, padding: "9px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}
          onClick={() => setShowCreate(p => !p)}
        >
          {showCreate ? <><MdClose size={16} />{t("cancel")}</> : <><MdAdd size={16} />{t("billCreate")}</>}
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      {!initialLoad && counts.total > 0 && (
        <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
          {STATS.map((s, i) => (
            <div key={i} className={`${isMobile ? "stat-card--mobile" : "stat-card"} stat-card--${s.color} ${s.extra}`}>
              {isMobile ? (
                <><div className="text-xl mb-1">{s.icon}</div><div className="stat-card__val">{s.val}</div><div className="stat-card__label">{s.label}</div></>
              ) : (
                <><div><div className="stat-card__val">{s.val}</div><div className="stat-card__label">{s.label}</div></div><div className="stat-card__icon">{s.icon}</div></>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE FORM ── */}
      {showCreate && (
        <div className="bill-form-card animate-scaleIn">
          <div className="flex items-center gap-3 mb-6">
            <div className="er-icon er-icon--amenity" style={{ width: 38, height: 38, borderRadius: 10 }}>
              <MdReceiptLong size={18} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("billNewBill")}</div>
              <div className="text-xs text-secondary mt-0.5">{t("billNewBillSub")}</div>
            </div>
          </div>
          <form onSubmit={handleCreateBill} className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-5"}`}>
            <div>
              <Label>{t("billTypeLabel")}</Label>
              <Select className="input h-11 w-full"
                value={formData.bill_type}
                onChange={e => setFormData({ ...formData, bill_type: e.target.value, flat_id: "" })}>
                <option value="INDIVIDUAL">{t("billTypeIndividual")}</option>
                <option value="ALL">{t("billTypeAll")}</option>
              </Select>
            </div>
            {formData.bill_type === "INDIVIDUAL" && (
              <div className={isMobile ? "" : "lg:col-span-2"}>
                <Label>{t("billSelectFlat")}</Label>
                <Select className="input h-11 w-full" required
                  value={formData.flat_id}
                  onChange={e => setFormData({ ...formData, flat_id: e.target.value })}>
                  <option value="">{t("billChooseFlat")}</option>
                  {flats.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.flat_number} ({f.Block?.name}) – {f.User?.name || t("billNoResident")}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>{t("billTitleLabel")}</Label>
              <input className="input h-11 w-full" placeholder={t("billTitlePlaceholder")}
                value={formData.title} required
                onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("billAmountLabel")}</Label>
              <input type="number" className="input h-11 w-full" placeholder="0"
                value={formData.amount} required
                onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            <div>
              <Label>{t("billMonthLabel")}</Label>
              <input type="month" className="input h-11 w-full"
                value={formData.billing_month} required
                onChange={e => setFormData({ ...formData, billing_month: e.target.value })} />
            </div>
            <div className="flex items-end lg:col-span-4">
              <button type="submit" disabled={creating} className="btn-primary w-full justify-center h-11" style={{ borderRadius: 12 }}>
                {creating
                  ? <span className="flex items-center gap-2"><Spinner />{t("billGenerating")}</span>
                  : <><MdReceiptLong size={16} />{t("billGenerate")}</>
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── BILLS TABLE ── */}
      <div className="data-table-wrap">

        {/* Toolbar */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)", flexShrink: 0 }}>
              {t("billSocietyBills")}
              {!initialLoad && (
                <span className="text-xs font-normal text-secondary ml-2">
                  — {totalItems} {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} {t("billCount")}
                  {search ? ` matching "${search}"` : ""}
                </span>
              )}
            </span>

            {/* Search — right aligned */}
            <div className="search-input-wrap" style={{ maxWidth: 240, width: "100%" }}>
              <MdSearch size={15} className="search-input-icon" />
              <input
                key="accountant-manage-bills-search"
                className="input h-10 w-full pl-10 pr-8"
                placeholder={t("billSearch")}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {fetching && !initialLoad ? (
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <Spinner size={13} />
                </div>
              ) : search ? (
                <button className="search-input-clear" onClick={() => setSearch("")}>
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
                <button key={key}
                  className={`filter-pill ${on ? `filter-pill--active-${ac}` : ""}`}
                  style={{ flex: 1, justifyContent: "center", display: "flex" }}
                  onClick={() => handleFilterChange(key)}>
                  {label}
                  <span className="filter-pill__count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── States ── */}
        {initialLoad && (
          <div className="flex flex-col items-center gap-3 py-16 text-secondary">
            <Spinner size={26} /><p className="text-sm">{t("billLoading")}</p>
          </div>
        )}

        {!initialLoad && counts.total === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-secondary animate-fadeIn">
            <MdOutlineInbox size={48} className="opacity-20" />
            <p className="text-sm">{t("billEmpty")}</p>
            <button className="btn-primary mt-1" style={{ borderRadius: 10 }} onClick={() => setShowCreate(true)}>
              <MdAdd size={15} />{t("billCreateFirst")}
            </button>
          </div>
        )}

        {!initialLoad && counts.total > 0 && bills.length === 0 && !fetching && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary animate-fadeIn">
            <MdSearch size={36} className="opacity-20" />
            <p className="text-sm">{t("billNoMatch")}</p>
            <button className="text-xs font-semibold text-accent hover:underline"
              onClick={() => { setSearch(""); handleFilterChange("ALL"); }}>
              {t("billClearFilters")}
            </button>
          </div>
        )}

        {/* ── Mobile cards ── */}
        {!initialLoad && bills.length > 0 && isMobile && (
          <div className="flex flex-col gap-3 p-4">
            {bills.map((b, i) => (
              <div key={b.id} className="bill-card animate-fadeIn" style={{ animationDelay: `${i * 30}ms` }}>
                <div style={{ height: 3, background: b.status === "PAID" ? "linear-gradient(90deg,#34d399,#059669)" : "linear-gradient(90deg,#60A5FA,#2563EB)" }} />
                <div className="bill-card__body">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{b.title}</p>
                      <p className="text-xs text-secondary mt-0.5">{b.billing_month}</p>
                    </div>
                    <BillStatus status={b.status} t={t} />
                  </div>
                  <div className="bill-amount-box">
                    <span className="text-xs text-secondary font-medium">{t("billAmountLabel")}</span>
                    <span className="bill-amount-val">₹{Number(b.amount).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-secondary mb-1">{t("billFlatCol")}</p>
                      <span className="flat-chip">{b.Flat.flat_number} · {b.Flat.Block.name}</span>
                    </div>
                    <div>
                      <p className="text-xs text-secondary mb-1">{t("billResidentCol")}</p>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{b.Flat.User?.name || "NA"}</p>
                    </div>
                  </div>
                  <RowActions bill={b} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDeleteBill={handleDeleteBill} deletingId={deletingId} handleConfirmPayment={handleConfirmPayment} confirmingId={confirmingId} t={t} />
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
                <th>{t("billTitleCol")}</th>
                <th>{t("billFlatCol")}</th>
                <th>{t("billResidentCol")}</th>
                <th>{t("billMonthCol")}</th>
                <th>{t("billAmountCol")}</th>
                <th>{t("billStatusCol")}</th>
                <th>{t("billActionCol")}</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b, i) => (
                <tr key={b.id} className="animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                  <td><span className="text-xs font-semibold text-secondary">{(page - 1) * LIMIT + i + 1}</span></td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 3, height: 32, borderRadius: 99, flexShrink: 0, background: b.status === "PAID" ? "linear-gradient(180deg,#34d399,#059669)" : "linear-gradient(180deg,#60A5FA,#2563EB)" }} />
                      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{b.title}</span>
                    </div>
                  </td>
                  <td><span className="flat-chip">{b.Flat.flat_number}<span style={{ opacity: 0.55 }}> · {b.Flat.Block.name}</span></span></td>
                  <td><span className="text-sm text-secondary">{b.Flat.User?.name || "—"}</span></td>
                  <td><span className="info-chip">{b.billing_month}</span></td>
                  <td><span className="bill-table-amount">₹{Number(b.amount).toLocaleString("en-IN")}</span></td>
                  <td><BillStatus status={b.status} t={t} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowActions bill={b} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDeleteBill={handleDeleteBill} deletingId={deletingId} handleConfirmPayment={handleConfirmPayment} confirmingId={confirmingId} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Footer: count + pagination ── */}
        {!initialLoad && bills.length > 0 && (
          <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
            <span className="text-xs text-secondary">
              {t("billShowing")}{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}
              </strong>{" "}
              {t("billOf")}{" "}
              <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong>{" "}
              {t("billCount")}
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
}
