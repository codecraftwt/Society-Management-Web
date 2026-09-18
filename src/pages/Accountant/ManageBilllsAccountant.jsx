
import { useEffect, useState, useCallback, useMemo, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { hasPermission } from "../../utils/permissions";
import { useCustomAlert } from "../../context/CustomAlertContext";
import {
  MdAdd, MdClose, MdSearch, MdDelete,
  MdOutlineInbox, MdReceiptLong,
  MdCheckCircle, MdSchedule, MdPayments,
  MdChevronLeft, MdChevronRight, MdCalendarMonth,
  MdVisibility, MdHome, MdInfo,
} from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import GlobalBadge from "../../components/common/GlobalBadge";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import { BILL_CATEGORIES } from "../Admin/ManageBill";

export const BILL_TYPE_FILTERS = [
  { value: "ALL", label: "All Bill Types" },
  { value: "MAINTENANCE", label: "🛠️ Maintenance" },
  { value: "ELECTRICITY", label: "⚡ Electricity" },
  { value: "WATER", label: "💧 Water" },
  { value: "GAS", label: "🔥 Gas" },
  { value: "PARKING", label: "🚗 Parking" },
  { value: "SECURITY", label: "🛡️ Security" },
  { value: "AMENITIES", label: "🏊 Amenities" },
  { value: "DONATION", label: "🤝 Donation" },
  { value: "OTHER", label: "📝 Other" },
];

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

/* ── Delete, Details & Confirm controls ── */
function RowActions({ bill, onDetailsClick, onDeleteClick, handleConfirmPayment, confirmingId, t }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <GlobalButton
        variant="view"
        size="sm"
        icon={MdVisibility}
        onClick={() => onDetailsClick(bill)}
        title="View Bill & Payment Details"
      >
        Details
      </GlobalButton>

      {bill.status === "PENDING_VERIFICATION" && (
        <GlobalButton
          variant="primary"
          size="sm"
          icon={MdCheckCircle}
          loading={confirmingId === bill.id}
          onClick={() => handleConfirmPayment(bill.id)}
          title="Confirm resident payment and send Web/Mobile notification"
        >
          {confirmingId === bill.id ? "Confirming..." : "Confirm"}
        </GlobalButton>
      )}

      {bill.status !== "PAID" && (
        <GlobalButton
          variant="delete"
          size="sm"
          icon={MdDelete}
          onClick={() => onDeleteClick(bill.id)}
        >
          {t("billDelete") || "Delete"}
        </GlobalButton>
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
  const { user } = useContext(AuthContext);
  const { showUnauthorized, showError } = useCustomAlert();

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
  const [filterType, setFilterType] = useState("ALL");
  const [viewBill, setViewBill] = useState(null);
  const debSearch = useDebounce(search, 500);

  /* ── Create form ── */
  const [flats, setFlats] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    flat_type: "INDIVIDUAL",
    bill_type: "INDIVIDUAL",
    bill_category: "ELECTRICITY",
    other_bill_type: "",
    flat_id: "",
    title: "Electricity Bill",
    amount: "",
    billing_month: getCurrentBillingMonth(),
    issue_date: "",
    last_pay_date: "",
  });

  const handleCategoryChange = (cat) => {
    const found = BILL_CATEGORIES.find(c => c.value === cat);
    setFormData(prev => {
      const isCustomTitle = prev.title && !BILL_CATEGORIES.some(c => c.defaultTitle === prev.title);
      return {
        ...prev,
        bill_category: cat,
        other_bill_type: cat === "OTHER" ? prev.other_bill_type : "",
        title: isCustomTitle ? prev.title : (found?.defaultTitle || ""),
      };
    });
  };

  /* ── Delete & Confirm ── */
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  /* ────────────────────────────────────
     LOAD BILLS — backend paginated
  ──────────────────────────────────── */
  const loadBills = useCallback(async (pg, q, filter, type, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: LIMIT,
        filter,
        ...(type && type !== "ALL" ? { type } : {}),
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
  useEffect(() => { loadBills(1, "", "ALL", "ALL", true); }, [loadBills]);
  useEffect(() => { loadFlats(); }, []);

  /* ── Re-fetch on search change ── */
  useEffect(() => {
    if (initialLoad) return;
    loadBills(1, debSearch, filterStatus, filterType);
  }, [debSearch]);

  /* ── Re-fetch on status filter change ── */
  const handleFilterChange = (f) => {
    setFilterStatus(f);
    loadBills(1, debSearch, f, filterType);
  };

  /* ── Re-fetch on type filter change ── */
  const handleTypeChange = (tVal) => {
    setFilterType(tVal);
    loadBills(1, debSearch, filterStatus, tVal);
  };

  const handlePageChange = (p) => loadBills(p, debSearch, filterStatus, filterType);

  /* ── Create ── */
  const handleOpenCreate = () => {
    if (!showCreate && !hasPermission(user, "manage_bills", "create")) {
      showUnauthorized("You do not have permission to create bills.");
      return;
    }
    setShowCreate(p => !p);
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!hasPermission(user, "manage_bills", "create")) {
      showUnauthorized("You do not have permission to create bills.");
      return;
    }
    try {
      setCreating(true);
      const payload = {
        ...formData,
        bill_type: formData.flat_type,
        flat_type: formData.flat_type,
      };
      await API.post("/bills", payload);
      setFormData({
        flat_type: "INDIVIDUAL",
        bill_type: "INDIVIDUAL",
        bill_category: "ELECTRICITY",
        other_bill_type: "",
        flat_id: "",
        title: "Electricity Bill",
        amount: "",
        billing_month: getCurrentBillingMonth(),
        issue_date: "",
        last_pay_date: "",
      });
      setShowCreate(false);
      loadBills(1, debSearch, filterStatus);
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to create bill");
      }
    }
    finally { setCreating(false); }
  };

  /* ── Delete & Confirm ── */
  const handleDeleteBill = async (id) => {
    if (!hasPermission(user, "manage_bills", "delete")) {
      showUnauthorized("You do not have permission to delete bills.");
      setConfirmDeleteId(null);
      return;
    }
    try {
      setDeletingId(id);
      await API.delete(`/bills/${id}`);
      const newPage = bills.length === 1 && page > 1 ? page - 1 : page;
      loadBills(newPage, debSearch, filterStatus);
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || t("billDeleteFailed"));
      }
    }
    finally { setDeletingId(null); setConfirmDeleteId(null); }
  };

  const handleConfirmPayment = async (id) => {
    if (!hasPermission(user, "manage_bills", "edit")) {
      showUnauthorized("You do not have permission to confirm bill payments.");
      return;
    }
    setConfirmingId(id);
    try {
      await API.put(`/bills/confirm/${id}`);
      loadBills(page, debSearch, filterStatus);
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to confirm payment");
      }
    }
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
          onClick={handleOpenCreate}
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
          {/* 1. Flat Type */}
          <div>
            <Label>Flat Type</Label>
            <Select className="input h-11 w-full"
              value={formData.flat_type}
              onChange={e => setFormData({ ...formData, flat_type: e.target.value, bill_type: e.target.value, flat_id: "" })}>
              <option value="INDIVIDUAL">Individual Flat</option>
              <option value="ALL">All Flats</option>
            </Select>
          </div>

          {/* 2. Flat Picker */}
          {formData.flat_type === "INDIVIDUAL" && (
            <div>
              <Label>{t("billSelectFlat") || "Select Flat"}</Label>
              <Select className="input h-11 w-full" required
                value={formData.flat_id}
                onChange={e => setFormData({ ...formData, flat_id: e.target.value })}>
                <option value="">{t("billChooseFlat") || "Choose Flat"}</option>
                {flats.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.flat_number} ({f.Block?.name}) – {f.User?.name || t("billNoResident") || "No Resident"}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* 3. Billing Type */}
          <div className={formData.flat_type === "ALL" ? "col-span-1" : ""}>
            <Label>Billing Type</Label>
            <Select className="input h-11 w-full"
              value={formData.bill_category}
              onChange={e => handleCategoryChange(e.target.value)}>
              {BILL_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>

          {/* 4. Conditional Other Specification */}
          {formData.bill_category === "OTHER" && (
            <div className="col-span-2">
              <Label>Specify Bill Type / What is this for? *</Label>
              <input
                className="input h-11 w-full"
                placeholder="e.g. Clubhouse Event, Festival Contribution, Garbage Levy"
                value={formData.other_bill_type}
                required
                onChange={e => setFormData({
                  ...formData,
                  other_bill_type: e.target.value,
                  title: formData.title === "Other" || !formData.title ? e.target.value : formData.title,
                })}
              />
            </div>
          )}

          {/* 5. Title */}
          <div>
            <Label>{t("billTitleLabel") || "Bill Title"}</Label>
            <input className="input h-11 w-full" placeholder={t("billTitlePlaceholder") || "Enter bill title"}
              value={formData.title} required
              onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>

          {/* 6. Amount */}
          <div>
            <Label>{t("billAmountLabel") || "Amount (₹)"}</Label>
            <input type="number" className="input h-11 w-full" placeholder="0"
              value={formData.amount} required
              onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </div>

          {/* Issue Date */}
          <div>
            <Label>Issue Date *</Label>
            <div className="relative flex items-center mt-1">
              <input type="date" className="input h-11 w-full px-3"
                value={formData.issue_date}
                required
                onChange={e => {
                  const dateVal = e.target.value;
                  let computedMonth = formData.billing_month;
                  if (dateVal) {
                    try {
                      const [yr, mo] = dateVal.split("-");
                      const d = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
                      computedMonth = d.toLocaleString("en-US", { month: "long", year: "numeric" });
                    } catch {
                      computedMonth = formData.billing_month;
                    }
                  }
                  setFormData({ ...formData, issue_date: dateVal, billing_month: computedMonth });
                }} />
            </div>
          </div>

          {/* Due Date (Last Pay Date) */}
          <div>
            <Label>Due Date (Last Pay Date)</Label>
            <div className="relative flex items-center mt-1">
              <input type="date" className="input h-11 w-full px-3"
                value={formData.last_pay_date}
                min={formData.issue_date || undefined}
                onChange={e => setFormData({ ...formData, last_pay_date: e.target.value })} />
            </div>
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
          <div className="mb-bills-toolbar__top flex flex-col md:flex-row md:items-center justify-between gap-3">
            <span className="mb-bills-toolbar__title">
              {t("billSocietyBills")}
              {!initialLoad && (
                <span className="mb-bills-toolbar__count">
                  — {totalItems} {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} {t("billCount")}
                  {filterType !== "ALL" ? ` · ${filterType}` : ""}
                  {search ? ` matching "${search}"` : ""}
                </span>
              )}
            </span>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <Select
                className="input h-10 text-xs font-semibold"
                style={{ minWidth: 155 }}
                value={filterType}
                onChange={e => handleTypeChange(e.target.value)}
              >
                {BILL_TYPE_FILTERS.map(tf => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </Select>

              <ExpandableSearch
                placeholder={t("billSearch")}
                value={search}
                onChange={setSearch}
              />
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
              onClick={() => { setSearch(""); handleFilterChange("ALL"); handleTypeChange("ALL"); }}>
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
                  <RowActions
                    bill={b}
                    onDetailsClick={setViewBill}
                    onDeleteClick={setConfirmDeleteId}
                    handleConfirmPayment={handleConfirmPayment}
                    confirmingId={confirmingId}
                    t={t}
                  />
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
                      <div>
                        <span className="font-semibold text-sm block" style={{ color: "var(--text-primary)" }}>{b.title}</span>
                        {b.other_bill_type && <span className="text-[10px] text-secondary font-medium block mt-0.5">{b.other_bill_type}</span>}
                      </div>
                    </div>
                  </td>
                  <td><span className="flat-chip">{b.Flat?.flat_number || "—"}{b.Flat?.Block?.name ? <span style={{ opacity: 0.55 }}> · {b.Flat.Block.name}</span> : null}</span></td>
                  <td><span className="text-sm text-secondary">{b.Flat?.User?.name || "—"}</span></td>
                  <td><span className="info-chip">{b.billing_month}</span></td>
                  <td><span className="bill-table-amount">₹{Number(b.amount).toLocaleString("en-IN")}</span></td>
                  <td><BillStatus status={b.status} t={t} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowActions
                      bill={b}
                      onDetailsClick={setViewBill}
                      onDeleteClick={setConfirmDeleteId}
                      handleConfirmPayment={handleConfirmPayment}
                      confirmingId={confirmingId}
                      t={t}
                    />
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

      {/* ── BILL & PAYMENT DETAILS MODAL ── */}
      <GlobalModal
        isOpen={Boolean(viewBill)}
        onClose={() => setViewBill(null)}
        title="Bill & Payment Details"
        subtitle={viewBill?.title}
        icon={MdReceiptLong}
        maxWidth="max-w-2xl"
      >
        {viewBill && (() => {
          const payment = viewBill.Payments?.[0];
          const isPaid = viewBill.status === "PAID";
          const isAwaiting = viewBill.status === "PENDING_VERIFICATION";
          const payerName = payment?.resident?.name || viewBill.Flat?.User?.name || "Resident";
          const payerPhone = payment?.resident?.phone || viewBill.Flat?.User?.phone;
          const payerEmail = payment?.resident?.email || viewBill.Flat?.User?.email;
          const purposeLabel = viewBill.type === "MAINTENANCE"
            ? "Society Maintenance Fee"
            : (viewBill.bill_category === "OTHER" ? (viewBill.other_bill_type || "Other Expense") : (viewBill.bill_category || "Utility Bill"));

          return (
            <div className="space-y-4">
              {/* Top Banner with Amount & Status */}
              <div
                className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{
                  background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
                  borderColor: "var(--glass-border)",
                }}
              >
                <div>
                  <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Total Bill Amount</span>
                  <p className="text-2xl sm:text-3xl font-bold text-accent" style={{ letterSpacing: "-0.02em" }}>
                    ₹{Number(viewBill.amount).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-secondary mt-1">Month: <strong style={{ color: "var(--text-primary)" }}>{viewBill.billing_month}</strong></p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1.5">
                  <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Status</span>
                  <BillStatus status={viewBill.status} t={t} />
                </div>
              </div>

              {/* Grid: Bill Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Flat & Resident Details */}
                <div className="p-3.5 rounded-xl border" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <MdHome size={15} /> Unit & Resident
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary">Flat Unit:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {viewBill.Flat?.flat_number || "—"} {viewBill.Flat?.Block?.name ? `(${viewBill.Flat.Block.name})` : ""}
                      </span>
                    </div>
                    {viewBill.Flat?.Floor?.floor_number !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Floor:</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Floor {viewBill.Flat.Floor.floor_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-secondary">Resident:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{viewBill.Flat?.User?.name || "Unassigned"}</span>
                    </div>
                    {viewBill.Flat?.User?.phone && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Contact:</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{viewBill.Flat.User.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purpose & Schedule Details */}
                <div className="p-3.5 rounded-xl border" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <MdReceiptLong size={15} /> Purpose & Dates
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary">Bill Type:</span>
                      <span className="font-semibold text-accent">{purposeLabel}</span>
                    </div>
                    {viewBill.other_bill_type && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Specified For:</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{viewBill.other_bill_type}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-secondary">Issue Date:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {viewBill.issue_date ? new Date(viewBill.issue_date).toLocaleDateString("en-IN") : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Due Date:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {viewBill.due_date || viewBill.last_pay_date ? new Date(viewBill.due_date || viewBill.last_pay_date).toLocaleDateString("en-IN") : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Receipt / Verification Breakdown */}
              <div className="p-4 rounded-xl border" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
                <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MdPayments size={16} /> Payment Breakdown & Who Paid
                </p>

                {isPaid || isAwaiting || payment ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-secondary block">Paid By Resident</span>
                        <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{payerName}</span>
                        {(payerPhone || payerEmail) && (
                          <span className="text-[11px] text-secondary block mt-0.5">{[payerPhone, payerEmail].filter(Boolean).join(" · ")}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-secondary block">Purpose Paid For</span>
                        <span className="font-semibold text-accent">{purposeLabel}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-secondary">Payment Method:</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{payment?.payment_mode || "Online / UPI Demo"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Amount Paid:</span>
                        <span className="font-bold text-green-400">₹{Number(payment?.amount || viewBill.amount).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Payment Timestamp:</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                          {payment?.payment_date ? new Date(payment.payment_date).toLocaleString("en-IN") : "Confirmed"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-secondary">
                    <p className="font-semibold mb-1">⏳ Payment Pending</p>
                    <p className="opacity-80">Resident has not submitted payment for this bill yet.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: "var(--glass-border)" }}>
                {isAwaiting && (
                  <GlobalButton
                    variant="primary"
                    icon={MdCheckCircle}
                    loading={confirmingId === viewBill.id}
                    onClick={async () => {
                      await handleConfirmPayment(viewBill.id);
                      setViewBill(null);
                    }}
                  >
                    Confirm Payment
                  </GlobalButton>
                )}
                <GlobalButton
                  variant="cancel"
                  onClick={() => setViewBill(null)}
                >
                  Close
                </GlobalButton>
              </div>
            </div>
          );
        })()}
      </GlobalModal>

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
