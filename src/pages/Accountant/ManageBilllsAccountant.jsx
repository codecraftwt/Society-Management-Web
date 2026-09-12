
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdClose, MdSearch, MdDelete,
  MdOutlineInbox, MdReceiptLong,
  MdCheckCircle, MdSchedule, MdPayments,
  MdChevronLeft, MdChevronRight, MdCalendarMonth,
} from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import GlobalBadge from "../../components/common/GlobalBadge";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";

/* ── helpers ── */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthToDate = (value) => {
  if (!value) return null;
  const [year, month] = String(value).split("-").map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, 1);
};

const dateToMonth = (date) => {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getCurrentBillingMonth = () => dateToMonth(new Date());

function formatBillingMonth(value) {
  const date = monthToDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function BillingMonthPicker({ value, onChange, required }) {
  const wrapRef = useRef(null);
  const calRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const selected = monthToDate(value) || new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());

  const placeCalendar = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 260);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    const estimatedHeight = 220;
    const top = below + estimatedHeight > window.innerHeight - 12
      ? Math.max(12, rect.top - estimatedHeight - 8)
      : below;
    setCoords({ top, left, width });
  };

  useEffect(() => {
    if (!open) return undefined;
    setViewYear((monthToDate(value) || new Date()).getFullYear());
    placeCalendar();
    const onDocClick = (e) => {
      if (wrapRef.current?.contains(e.target) || calRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onReposition = () => placeCalendar();
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, value]);

  const calendar = open && coords ? createPortal(
    <div
      ref={calRef}
      className="bill-month-calendar"
      role="dialog"
      aria-label="Choose billing month"
      style={{ top: coords.top, left: coords.left, width: coords.width }}
    >
      <div className="bill-month-calendar__header">
        <button type="button" className="bill-month-calendar__nav" onClick={() => setViewYear((y) => y - 1)} aria-label="Previous year">
          <MdChevronLeft size={18} />
        </button>
        <span className="bill-month-calendar__year">{viewYear}</span>
        <button type="button" className="bill-month-calendar__nav" onClick={() => setViewYear((y) => y + 1)} aria-label="Next year">
          <MdChevronRight size={18} />
        </button>
      </div>
      <div className="bill-month-calendar__grid">
        {MONTHS.map((label, index) => {
          const active = value === `${viewYear}-${String(index + 1).padStart(2, "0")}`;
          return (
            <button
              key={label}
              type="button"
              className={`bill-month-calendar__month${active ? " is-active" : ""}`}
              onClick={() => {
                onChange(`${viewYear}-${String(index + 1).padStart(2, "0")}`);
                setOpen(false);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="bill-month-picker" ref={wrapRef}>
      <button
        type="button"
        className="input h-11 w-full bill-month-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MdCalendarMonth size={18} />
        <span>{formatBillingMonth(value) || "Select billing month"}</span>
      </button>
      {required && (
        <input type="text" value={value || ""} required readOnly tabIndex={-1} className="bill-month-picker__required" />
      )}
      {calendar}
    </div>
  );
}

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
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button className="pagination-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        <MdChevronLeft size={14} />
      </button>
      {pages.map((p, idx) =>
        p === "…" ? (
          <span key={`e-${idx}`} className="pagination-ellipsis">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
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
    return <GlobalBadge variant="success" icon={MdCheckCircle}>{t("billPaid") || "Paid"}</GlobalBadge>;
  if (status === "PENDING_VERIFICATION")
    return <GlobalBadge variant="info" icon={MdSchedule}>Awaiting Confirmation</GlobalBadge>;
  return <GlobalBadge variant="warning" icon={MdSchedule}>{t("billPending") || "Pending"}</GlobalBadge>;
}

/* ── Delete & Confirm controls ── */
function RowActions({ bill, onDeleteClick, handleConfirmPayment, confirmingId, t }) {
  if (bill.status === "PAID") return <span className="text-xs text-secondary opacity-30">—</span>;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {bill.status === "PENDING_VERIFICATION" && (
        <GlobalButton
          variant="primary"
          size="sm"
          icon={MdCheckCircle}
          loading={confirmingId === bill.id}
          onClick={() => handleConfirmPayment(bill.id)}
          title="Confirm resident payment and send Web/Mobile notification"
        >
          {confirmingId === bill.id ? "Confirming..." : "Confirm Payment"}
        </GlobalButton>
      )}
      <GlobalButton
        variant="delete"
        size="sm"
        icon={MdDelete}
        onClick={() => onDeleteClick(bill.id)}
      >
        {t("billDelete") || "Delete"}
      </GlobalButton>
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
    { label: t("billStatTotal"), val: displayedCounts.total, Icon: MdReceiptLong, color: "purple", extra: "" },
    { label: t("billStatPaid"), val: displayedCounts.paid, Icon: MdCheckCircle, color: "green", extra: "" },
    { label: t("billStatPending"), val: displayedCounts.pending, Icon: MdSchedule, color: "amber", extra: "" },
    { label: displayedCounts.amountLabel, val: `₹${(displayedCounts.amount || 0).toLocaleString("en-IN")}`, Icon: MdPayments, color: "blue", extra: "stat-card--revenue" },
  ];

  return (
    <div className="page-root animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdReceiptLong size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{t("billsTitle")}</h2>
            <p className="text-secondary text-xs mt-0.5">{t("billsSubtitle")}</p>
          </div>
        </div>
        <GlobalButton
          variant="add"
          icon={showCreate ? MdClose : MdAdd}
          borderDraw
          className="w-full sm:w-auto justify-center shrink-0"
          onClick={() => setShowCreate(p => !p)}
        >
          {showCreate ? t("cancel") : t("billCreate")}
        </GlobalButton>
      </div>

      {/* ── STAT CARDS ── */}
      {!initialLoad && counts.total > 0 && (
        <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
          {STATS.map((s, i) => {
            const Icon = s.Icon;
            return (
              <div key={i} className={`${isMobile ? "stat-card--mobile" : "stat-card"} stat-card--${s.color} ${s.extra}`}>
                {isMobile ? (
                  <>
                    <div className="stat-card__icon mb-1"><Icon size={20} /></div>
                    <div className="stat-card__val">{s.val}</div>
                    <div className="stat-card__label">{s.label}</div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="stat-card__val">{s.val}</div>
                      <div className="stat-card__label">{s.label}</div>
                    </div>
                    <div className="stat-card__icon"><Icon size={20} /></div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      <GlobalModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title={t("billNewBill")}
        subtitle={t("billNewBillSub")}
        icon={MdReceiptLong}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateBill} className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
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
            <div>
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
          <div className={formData.bill_type === "ALL" ? "col-span-2" : ""}>
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
            <BillingMonthPicker
              value={formData.billing_month}
              onChange={(month) => setFormData({ ...formData, billing_month: month })}
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3 col-span-2 mt-2 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
            <GlobalButton variant="cancel" type="button" onClick={() => setShowCreate(false)}>
              {t("cancel")}
            </GlobalButton>
            <GlobalButton variant="create" type="submit" loading={creating} icon={MdReceiptLong}>
              {creating ? t("billGenerating") : t("billGenerate")}
            </GlobalButton>
          </div>
        </form>
      </GlobalModal>

      {/* ── BILLS TABLE ── */}
      <div className="data-table-wrap">

        {/* Toolbar */}
        <div className="mb-bills-toolbar">
          <div className="mb-bills-toolbar__top">
            <span className="mb-bills-toolbar__title">
              {t("billSocietyBills")}
              {!initialLoad && (
                <span className="mb-bills-toolbar__count">
                  — {totalItems} {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} {t("billCount")}
                  {search ? ` matching "${search}"` : ""}
                </span>
              )}
            </span>

            <div className="search-input-wrap mb-bills-toolbar__search">
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

          <div className="mb-bills-toolbar__tabs">
            <SlidingTabs
              fullWidth={!isMobile}
              value={filterStatus}
              onChange={handleFilterChange}
              items={TABS.map(({ key, label, count }) => ({
                id: key,
                label: isMobile && key === "PENDING_VERIFICATION" ? "Awaiting" : label,
                badge: count,
              }))}
            />
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
                <div style={{ height: 3, background: b.status === "PAID" ? "linear-gradient(90deg, var(--success), var(--accent-light))" : "linear-gradient(90deg, var(--warning), var(--danger))" }} />
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
                      <span className="flat-chip">{b.Flat?.flat_number || "—"}{b.Flat?.Block?.name ? ` · ${b.Flat.Block.name}` : ""}</span>
                    </div>
                    <div>
                      <p className="text-xs text-secondary mb-1">{t("billResidentCol")}</p>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{b.Flat?.User?.name || "NA"}</p>
                    </div>
                  </div>
                  <RowActions bill={b} onDeleteClick={setConfirmDeleteId} handleConfirmPayment={handleConfirmPayment} confirmingId={confirmingId} t={t} />
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
                      <div style={{ width: 3, height: 32, borderRadius: 99, flexShrink: 0, background: b.status === "PAID" ? "linear-gradient(180deg, var(--success), var(--accent))" : "linear-gradient(180deg, var(--warning), var(--danger))" }} />
                      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{b.title}</span>
                    </div>
                  </td>
                  <td><span className="flat-chip">{b.Flat?.flat_number || "—"}{b.Flat?.Block?.name ? <span style={{ opacity: 0.55 }}> · {b.Flat.Block.name}</span> : null}</span></td>
                  <td><span className="text-sm text-secondary">{b.Flat?.User?.name || "—"}</span></td>
                  <td><span className="info-chip">{b.billing_month}</span></td>
                  <td><span className="bill-table-amount">₹{Number(b.amount).toLocaleString("en-IN")}</span></td>
                  <td><BillStatus status={b.status} t={t} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowActions bill={b} onDeleteClick={setConfirmDeleteId} handleConfirmPayment={handleConfirmPayment} confirmingId={confirmingId} t={t} />
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

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => handleDeleteBill(confirmDeleteId)}
        title={t("billDeleteConfirmTitle") || "Delete Bill"}
        message={t("billDeleteConfirmMsg") || "Are you sure you want to delete this bill? This action cannot be undone."}
        confirmText={t("billYesDelete") || "Yes, Delete"}
        variant="danger"
        loading={Boolean(deletingId)}
      />
    </div>
  );
}
