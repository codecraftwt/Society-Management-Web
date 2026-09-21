import { useEffect, useState, useCallback, useContext, useMemo, useRef} from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdClose, MdSearch, MdDelete,
  MdOutlineInbox, MdReceiptLong,
  MdCheckCircle, MdSchedule,
  MdChevronLeft, MdChevronRight,
  MdWarning,
} from "react-icons/md";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import { getTitleError, getPositiveAmountError, getDateRangeError } from "../../utils/validators";
import { useCustomAlert } from "../../context/CustomAlertContext";

import Pagination from "../../components/common/Pagination";

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
function RowActions({ bill, confirmDeleteId, setConfirmDeleteId, handleDeleteBill, deletingId, handleConfirmPayment, confirmingId, t, canEdit = true, canDelete = true, authUser, showUnauthorized }) {
  const onTriggerConfirmPayment = (id) => {
    if (!hasPermission(authUser, "manage_bills", "edit")) {
      showUnauthorized("You do not have permission to confirm bill payments.");
      return;
    }
    handleConfirmPayment(id);
  };

  const onTriggerDelete = (id) => {
    if (!hasPermission(authUser, "manage_bills", "delete")) {
      showUnauthorized("You do not have permission to delete bills.");
      return;
    }
    setConfirmDeleteId(id);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canEdit && bill.status === "PENDING_VERIFICATION" && (
        <button
          onClick={() => onTriggerConfirmPayment(bill.id)}
          disabled={confirmingId === bill.id}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-1 shadow-sm shrink-0"
          title="Confirm resident payment and send Web/Mobile notification"
        >
          <MdCheckCircle size={13} /> {confirmingId === bill.id ? "Confirming..." : "Confirm Payment"}
        </button>
      )}

      {canDelete && (
        confirmDeleteId === bill.id ? (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="text-xs text-secondary">{t("billSure")}</span>
            <button className="btn-delete-confirm" onClick={() => handleDeleteBill(bill.id)} disabled={deletingId === bill.id}>
              {deletingId === bill.id ? <Spinner /> : t("billYesDelete")}
            </button>
            <button className="btn-cancel-sm" onClick={() => setConfirmDeleteId(null)}>{t("cancel")}</button>
          </div>
        ) : (
          <button className="btn-delete" onClick={() => onTriggerDelete(bill.id)}>
            <MdDelete size={13} /> {t("billDelete")}
          </button>
        )
      )}
    </div>
  );
}

const Label = ({ children }) => (
  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">{children}</label>
);

export const BILL_CATEGORIES = [
  { value: "ELECTRICITY", label: "⚡ Electricity", defaultTitle: "Electricity Bill" },
  { value: "WATER", label: "💧 Water", defaultTitle: "Water Bill" },
  { value: "GAS", label: "🔥 Gas", defaultTitle: "Gas Bill" },
  { value: "PARKING", label: "🚗 Parking", defaultTitle: "Parking Charges" },
  { value: "SECURITY", label: "🛡️ Security", defaultTitle: "Security Charges" },
  { value: "AMENITIES", label: "🏊 Amenities", defaultTitle: "Amenity Charges" },
  { value: "MAINTENANCE", label: "🛠️ Maintenance", defaultTitle: "Maintenance Bill" },
  { value: "DONATION", label: "🤝 Donation", defaultTitle: "Donation" },
  { value: "OTHER", label: "📝 Other", defaultTitle: "Other" },
];

function Spinner({ size = 16 }) {
  return (
    <svg style={{ width: size, height: size, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function useDebounce(v, d = 450) {
  const [dv, setDv] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setDv(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return dv;
}

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentBillingMonth() {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
export default function ManageBills() {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const { user: authUser } = useContext(AuthContext);
  const { showUnauthorized, showError, showSuccess } = useCustomAlert();
  const isCommittee = isCommitteeMember(authUser);

  /* ── List state ── */
  const [bills, setBills] = useState([]);
  const [counts, setCounts] = useState({ total: 0, paid: 0, pending: 0, revenue: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  /* ── Pagination ── */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ── Search & filter ── */
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  /* ── Create form ── */
  const [flats, setFlats] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formSocietyId, setFormSocietyId] = useState("");
  const [formData, setFormData] = useState({
    flat_type: "INDIVIDUAL",
    bill_type: "INDIVIDUAL",
    bill_category: "ELECTRICITY",
    other_bill_type: "",
    flat_id: "",
    title: "Electricity Bill",
    amount: "",
    billing_month: getCurrentBillingMonth(),
    issue_date: getTodayISO(),
    last_pay_date: "",
  });

  /* ── Delete & Confirm ── */
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  /* ── Multi-select & Bulk operations ── */
  const [selectedBillsMap, setSelectedBillsMap] = useState({});
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState(null);
  const [createdBill, setCreatedBill] = useState(null);

  useEffect(() => {
    if (!feedbackBanner) return;
    const timer = setTimeout(() => setFeedbackBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [feedbackBanner]);

  const selectedIds = useMemo(() => Object.keys(selectedBillsMap).map(Number), [selectedBillsMap]);
  const selectedCount = selectedIds.length;
  const selectedBillsList = useMemo(() => Object.values(selectedBillsMap), [selectedBillsMap]);

  const selectedTotalAmount = useMemo(
    () => selectedBillsList.reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [selectedBillsList]
  );
  const selectedApprovable = useMemo(
    () => selectedBillsList.filter((b) => b.status !== "PAID"),
    [selectedBillsList]
  );
  const selectedDeletable = selectedBillsList;
  const selectedPaid = useMemo(
    () => selectedBillsList.filter((b) => b.status === "PAID"),
    [selectedBillsList]
  );
  const selectedApprovableAmount = useMemo(
    () => selectedApprovable.reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [selectedApprovable]
  );
  const selectedAwaitingCount = useMemo(
    () => selectedBillsList.filter((b) => b.status === "PENDING_VERIFICATION").length,
    [selectedBillsList]
  );
  const selectedPendingCount = useMemo(
    () => selectedBillsList.filter((b) => b.status === "PENDING").length,
    [selectedBillsList]
  );

  const isAllPageSelected = useMemo(
    () => bills.length > 0 && bills.every((b) => Boolean(selectedBillsMap[b.id])),
    [bills, selectedBillsMap]
  );
  const isSomePageSelected = useMemo(
    () => bills.some((b) => Boolean(selectedBillsMap[b.id])) && !isAllPageSelected,
    [bills, isAllPageSelected, selectedBillsMap]
  );

  const toggleSelect = (bill) => {
    setSelectedBillsMap((prev) => {
      const next = { ...prev };
      if (next[bill.id]) {
        delete next[bill.id];
      } else {
        next[bill.id] = {
          id: bill.id,
          title: bill.title,
          amount: bill.amount,
          status: bill.status,
          flatNumber: bill.Flat?.flat_number,
          blockName: bill.Flat?.Block?.name,
        };
      }
      return next;
    });
  };

  const toggleSelectAllCurrentPage = () => {
    if (isAllPageSelected) {
      setSelectedBillsMap((prev) => {
        const next = { ...prev };
        for (const b of bills) {
          delete next[b.id];
        }
        return next;
      });
    } else {
      setSelectedBillsMap((prev) => {
        const next = { ...prev };
        for (const b of bills) {
          next[b.id] = {
            id: b.id,
            title: b.title,
            amount: b.amount,
            status: b.status,
            flatNumber: b.Flat?.flat_number,
            blockName: b.Flat?.Block?.name,
          };
        }
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedBillsMap({});

  /* ── Super Admin Society Filter ── */
  const isSuperAdmin = authUser?.activeRole === "SUPER_ADMIN";
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    const saved = localStorage.getItem("superadmin_society_filter_bills");
    return (saved === "ALL" || !saved) ? "" : saved;
  });

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies").then(res => setSocietiesList(res.data || [])).catch(console.error);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    localStorage.setItem("superadmin_society_filter_bills", filterSocietyId || "ALL");
  }, [filterSocietyId]);


  /* ────────────────────────────────────
     LOAD BILLS — backend paginated
  ──────────────────────────────────── */
  const loadBills = useCallback(async (pg, q, filter, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: limitRef.current,
        filter,
        ...(q ? { search: q } : {}),
      });
      const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
      const res = await API.get(`/bills/society?${params}`, { headers });
      const data = res.data;
      const rawBills = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.bills)
        ? data.bills
        : [];
      setBills(rawBills);
      setCounts(data.counts || { total: 0, paid: 0, pending: 0, revenue: 0 });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (e) { console.error(e); }
    finally { setInitialLoad(false); setFetching(false); }
  }, [isSuperAdmin, filterSocietyId]);

  const loadFlats = async (targetSocId = filterSocietyId) => {
    try {
      const headers = (isSuperAdmin && targetSocId) ? { "x-society-id": targetSocId } : {};
      const res = await API.get("/flats/assigned", { headers });
      const d = res.data;
      setFlats(Array.isArray(d) ? d : (d?.data || d?.flats || []));
    } catch (e) { console.error(e); }
  };

  /* ── Initial load ── */
  useEffect(() => { loadBills(1, "", "ALL", true); }, [loadBills]);
  useEffect(() => { 
    if (filterSocietyId || !isSuperAdmin) loadFlats(filterSocietyId); 
    else setFlats([]);
  }, [filterSocietyId, isSuperAdmin]);

  const handleFormSocietyChange = (socId) => {
    setFormSocietyId(socId);
    setFormData(p => ({ ...p, flat_id: "" }));
    if (socId) loadFlats(socId);
    else setFlats([]);
  };

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

  const handleOpenCreateModal = () => {
    if (!hasPermission(authUser, "manage_bills", "create")) {
      showUnauthorized("You do not have permission to create bills.");
      return;
    }
    setFormSocietyId(filterSocietyId || "");
    setShowCreate(true);
  };

  /* ── Create ── */
  const handleCreateBill = async (e) => {
    if (e) e.preventDefault();
    if (!hasPermission(authUser, "manage_bills", "create")) {
      showUnauthorized("You do not have permission to create bills.");
      return;
    }
    const titleErr = getTitleError(formData.title, "Bill title");
    if (titleErr) { showError(titleErr); return; }
    const amountErr = getPositiveAmountError(formData.amount, "Amount");
    if (amountErr) { showError(amountErr); return; }
    const rangeErr = getDateRangeError(formData.issue_date, formData.last_pay_date, "Issue date", "Due date");
    if (rangeErr) { showError(rangeErr); return; }
    try {
      setCreating(true);
      const activeSocId = filterSocietyId || formSocietyId;
      const headers = (isSuperAdmin && activeSocId) ? { "x-society-id": activeSocId } : {};
      const payload = {
        ...formData,
        title: formData.title.trim(),
        bill_type: formData.flat_type,
        flat_type: formData.flat_type,
      };
      const res = await API.post("/bills", payload, { headers });
      setCreatedBill({
        type: formData.flat_type,
        category: formData.bill_category,
        otherType: formData.other_bill_type,
        title: formData.title,
        amount: formData.amount,
        flatId: formData.flat_id,
        societyId: activeSocId,
        total: res.data?.total,
      });
      setFormData({
        flat_type: "INDIVIDUAL",
        bill_type: "INDIVIDUAL",
        bill_category: "ELECTRICITY",
        other_bill_type: "",
        flat_id: "",
        title: "Electricity Bill",
        amount: "",
        billing_month: getCurrentBillingMonth(),
        issue_date: getTodayISO(),
        last_pay_date: "",
      });
      setFormSocietyId("");
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
    if (!hasPermission(authUser, "manage_bills", "delete")) {
      showUnauthorized("You do not have permission to delete bills.");
      return;
    }
    try {
      setDeletingId(id);
      const bill = bills.find(b => b.id === id);
      const headers = (isSuperAdmin && bill?.Flat?.Block?.society_id) ? { "x-society-id": bill.Flat.Block.society_id } : {};
      await API.delete(`/bills/${id}`, { headers });
      setSelectedBillsMap(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      const newPage = bills.length === 1 && page > 1 ? page - 1 : page;
      loadBills(newPage, debSearch, filterStatus);
      setFeedbackBanner({ type: "success", message: "Bill deleted successfully." });
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || t("billDeleteFailed"));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleConfirmPayment = async (id) => {
    if (!hasPermission(authUser, "manage_bills", "edit")) {
      showUnauthorized("You do not have permission to confirm bill payments.");
      return;
    }
    setConfirmingId(id);
    try {
      const bill = bills.find(b => b.id === id);
      const headers = (isSuperAdmin && bill?.Flat?.Block?.society_id) ? { "x-society-id": bill.Flat.Block.society_id } : {};
      await API.put(`/bills/confirm/${id}`, {}, { headers });
      setSelectedBillsMap(prev => {
        if (!prev[id]) return prev;
        return { ...prev, [id]: { ...prev[id], status: "PAID" } };
      });
      loadBills(page, debSearch, filterStatus);
      setFeedbackBanner({ type: "success", message: "Payment confirmed successfully." });
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to confirm payment");
      }
    } finally {
      setConfirmingId(null);
    }
  };

  /* ── Bulk Actions ── */
  const handleBulkApprove = async () => {
    if (!hasPermission(authUser, "manage_bills", "edit")) {
      showUnauthorized("You do not have permission to confirm bill payments.");
      setShowBulkApproveModal(false);
      return;
    }
    if (selectedApprovable.length === 0) return;
    try {
      setBulkApproving(true);
      const ids = selectedApprovable.map(b => b.id);
      const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
      const res = await API.put("/bills/bulk-confirm", { ids }, { headers });
      setFeedbackBanner({
        type: "success",
        message: res.data?.message || `Approved ${res.data?.approvedCount || ids.length} bill(s) successfully!`,
      });
      setShowBulkApproveModal(false);
      clearSelection();
      loadBills(page, debSearch, filterStatus);
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Operation restricted");
      } else {
        setFeedbackBanner({
          type: "error",
          message: err.response?.data?.message || "Failed to approve selected bills.",
        });
      }
    } finally {
      setBulkApproving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!hasPermission(authUser, "manage_bills", "delete")) {
      showUnauthorized("You do not have permission to delete bills.");
      setShowBulkDeleteModal(false);
      return;
    }
    if (selectedDeletable.length === 0) return;
    try {
      setBulkDeleting(true);
      const ids = selectedDeletable.map(b => b.id);
      const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
      const res = await API.post("/bills/bulk-delete", { ids }, { headers });
      setFeedbackBanner({
        type: "success",
        message: res.data?.message || `Deleted ${res.data?.deletedCount || ids.length} bill(s) successfully!`,
      });
      setShowBulkDeleteModal(false);
      clearSelection();
      const newPage = bills.length === ids.length && page > 1 ? page - 1 : page;
      loadBills(newPage, debSearch, filterStatus);
    } catch (err) {
      setFeedbackBanner({
        type: "error",
        message: err.response?.data?.message || "Failed to delete selected bills.",
      });
    } finally {
      setBulkDeleting(false);
    }
  };


  /* ── Tabs ── */
  const TABS = [
    { key: "ALL", label: t("billTabAll"), ac: "indigo", count: counts.total },
    { key: "PENDING_VERIFICATION", label: "Awaiting Confirmation", ac: "blue", count: counts.pendingVerification || 0 },
    { key: "PAID", label: t("billTabPaid"), ac: "green", count: counts.paid },
    { key: "PENDING", label: t("billTabPending"), ac: "amber", count: counts.pending },
  ];

  return (
    <div className="page-root animate-fadeIn">

      {/* ── FEEDBACK NOTIFICATION BANNER ── */}
      {feedbackBanner && (
        <div
          className="animate-fadeIn"
          style={{
            marginBottom: 16,
            padding: "12px 18px",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: feedbackBanner.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
            border: feedbackBanner.type === "success" ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(239,68,68,0.35)",
            color: feedbackBanner.type === "success" ? "#10b981" : "#f87171",
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {feedbackBanner.type === "success" ? <MdCheckCircle size={20} /> : <MdWarning size={20} />}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <MdClose size={16} />
          </button>
        </div>
      )}

      {/* ── Page Header: Unified Single Row with Sliding Tabs, Society Filter, Bulk Actions & Search ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdReceiptLong size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("billsTitle") || "Bills Management"}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {totalItems} {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} {t("billCount") || "bills recorded"}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1">
          {/* Status Toggle Sliding Tabs */}
          <SlidingTabs
            value={filterStatus}
            onChange={handleFilterChange}
            items={isSearchOpen ? TABS.filter(t => t.key === filterStatus).map(t => ({ id: t.key, label: t.label, badge: t.count })) : TABS.map(t => ({ id: t.key, label: t.label, badge: t.count }))}
          />

          {/* Expandable Animated Search Slider */}
          <ExpandableSearch
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder={t("billSearch") || "Search bills, flats, categories…"}
            fetching={fetching}
            isOpen={isSearchOpen}
            onOpenChange={setIsSearchOpen}
          />

          {/* Super Admin Society Filter */}
          {isSuperAdmin && (
            <Select
              className="input h-10 text-xs min-w-36 bg-white/5 border-white/10"
              value={filterSocietyId}
              onChange={(e) => { setFilterSocietyId(e.target.value); setPage(1); }}
            >
              <option value="">🌍 All Societies</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}

          {/* Create Bill Button */}
          {hasPermission(authUser, "manage_bills", "create") && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={handleOpenCreateModal}
              className="shrink-0"
              style={{ fontWeight: 700, height: 42 }}
            >
              {t("billCreate")}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* ── CREATE BILL MODAL ── */}
      <GlobalModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title={t("billNewBill")}
        subtitle={t("billNewBillSub")}
        icon={MdReceiptLong}
        size="md"
        showFooter
        submitLabel={t("billGenerate")}
        cancelLabel={t("cancel")}
        onSubmit={handleCreateBill}
        submitLoading={creating}
        submitDisabled={creating || (isSuperAdmin && !filterSocietyId && !formSocietyId) || Boolean(getTitleError(formData.title, "Bill title")) || Boolean(getPositiveAmountError(formData.amount, "Amount")) || Boolean(getDateRangeError(formData.issue_date, formData.last_pay_date, "Issue date", "Due date"))}
        submitIcon={MdCheckCircle}
      >
        <form onSubmit={handleCreateBill} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isSuperAdmin && !filterSocietyId && (
            <div className="sm:col-span-2">
              <Label>{t("billTargetSociety")}</Label>
              <Select className="input h-10 w-full" required
                value={formSocietyId}
                onChange={e => handleFormSocietyChange(e.target.value)}>
                <option value="">{t("billChooseSociety")}</option>
                {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          )}

          {/* 1. Flat Type */}
          <div>
            <Label>{t("billFlatType")}</Label>
            <Select className="input h-10 w-full"
              value={formData.flat_type}
              onChange={e => setFormData({ ...formData, flat_type: e.target.value, bill_type: e.target.value, flat_id: "" })}>
              <option value="INDIVIDUAL">{t("billTypeIndividual")}</option>
              <option value="ALL">{t("billTypeAll")}</option>
            </Select>
          </div>

          {/* 2. Flat Picker (if individual) */}
          {formData.flat_type === "INDIVIDUAL" ? (
            <div>
              <Label>{t("billSelectFlat") || "Select Flat"}</Label>
              <Select className="input h-10 w-full" required
                value={formData.flat_id}
                onChange={e => setFormData({ ...formData, flat_id: e.target.value })}>
                <option value="">{t("billChooseFlat") || "Choose Flat"}</option>
                {flats.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.flat_number} ({f.Block?.name}){" – "}{f.User?.name || t("billNoResident") || "No Resident"}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {/* 3. Billing Type (Category) */}
          <div className={formData.flat_type === "ALL" ? "sm:col-span-1" : ""}>
            <Label>{t("billBillingType")}</Label>
            <Select className="input h-10 w-full"
              value={formData.bill_category}
              onChange={e => handleCategoryChange(e.target.value)}>
              {BILL_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{t(`billCat${c.value}`)}</option>
              ))}
            </Select>
          </div>

          {/* 4. Conditional Other Specification */}
          {formData.bill_category === "OTHER" && (
            <div className="sm:col-span-2">
              <Label>{t("billSpecifyType")}</Label>
              <input
                className="input h-10 w-full"
                placeholder={t("billCustomPlaceholder")}
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

          {/* 5. Bill Title */}
          <div>
            <Label>{t("billTitleLabel") || "Bill Title"}</Label>
            <input className="input h-10 w-full" placeholder={t("billTitlePlaceholder") || "Enter bill title"}
              value={formData.title} required
              onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>

          {/* 6. Amount */}
          <div>
            <Label>{t("billAmountLabel") || "Amount (₹)"}</Label>
            <input type="number" className="input h-10 w-full" placeholder="0"
              value={formData.amount} required
              onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </div>

          {/* Issue Date */}
          <div>
            <Label>Issue Date *</Label>
            <div className="relative flex items-center mt-1">
              <input type="date" className="input h-10 w-full px-3"
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
            <span className="text-[10px] text-secondary mt-1 block">Bill issue date (defaults to today)</span>
          </div>

          {/* Due Date (Last Pay Date) */}
          <div>
            <Label>Due Date (Last Pay Date)</Label>
            <div className="relative flex items-center mt-1">
              <input type="date" className="input h-10 w-full px-3"
                value={formData.last_pay_date}
                min={formData.issue_date || undefined}
                onChange={e => setFormData({ ...formData, last_pay_date: e.target.value })} />
            </div>
            <p style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.7, marginTop: 4 }}>
              Leave blank to auto-set 30 days from issue date
            </p>
          </div>
        </form>
      </GlobalModal>

      {/* ── CREATE SUCCESS POPUP ── */}
      <GlobalModal
        isOpen={!!createdBill}
        onClose={() => setCreatedBill(null)}
        title={t("billGeneratedOk")}
        subtitle={createdBill?.type === "ALL" ? t("billGeneratedAll") : t("billGeneratedOk")}
        icon={MdCheckCircle}
        size="sm"
        showFooter
        submitLabel="Done"
        onSubmit={() => setCreatedBill(null)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {createdBill && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Bill Title</span>
                <strong style={{ color: "var(--text-primary)" }}>{createdBill.title}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Billing Category</span>
                <strong style={{ color: "var(--accent)" }}>
                  {BILL_CATEGORIES.find(c => c.value === createdBill.category)?.label || createdBill.category || "General"}
                  {createdBill.otherType ? ` (${createdBill.otherType})` : ""}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Amount</span>
                <strong style={{ color: "var(--accent)" }}>₹{Number(createdBill.amount || 0).toLocaleString("en-IN")}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Flat Type</span>
                <strong style={{ color: "var(--text-primary)" }}>{createdBill.type === "ALL" ? "All Flats" : "Individual Flat"}</strong>
              </div>
              {createdBill.type === "ALL" ? (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Bills Generated</span>
                  <strong style={{ color: "var(--text-primary)" }}>{createdBill.total ?? "—"} bill(s)</strong>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Flat</span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {flats.find(f => f.id === Number(createdBill.flatId))?.flat_number || "—"}
                  </strong>
                </div>
              )}
              {isSuperAdmin && createdBill.societyId && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Society</span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {societiesList.find(s => String(s.id) === String(createdBill.societyId))?.name || "—"}
                  </strong>
                </div>
              )}
            </>
          )}
        </div>
      </GlobalModal>

      {/* ── BILLS TABLE ── */}
      <div className="data-table-wrap">

        {/* Toolbar */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)", flexShrink: 0 }}>
            {t("billSocietyBills")}
            {!initialLoad && (
              <span className="text-xs font-normal text-secondary ml-2">
                — {totalItems} {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} {t("billCount")}
                {search ? ` matching "${search}"` : ""}
              </span>
            )}
          </span>

          {/* Right side: Bulk Actions (Approve & Delete) */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {selectedCount > 0 && (
              <div className="animate-fadeIn" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Badge showing selected count & total */}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    background: "var(--accent-soft, rgba(99,102,241,0.18))",
                    color: "var(--accent, #818cf8)",
                    padding: "6px 12px",
                    borderRadius: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <MdCheckCircle size={14} /> {selectedCount} Selected
                  <span style={{ opacity: 0.75, fontWeight: 800 }}>• ₹{selectedTotalAmount.toLocaleString("en-IN")}</span>
                </span>

                {hasPermission(authUser, "manage_bills", "edit") && (
                  /* Bulk Approve Button */
                  <button
                    type="button"
                    onClick={() => setShowBulkApproveModal(true)}
                    disabled={selectedApprovable.length === 0}
                    title={selectedApprovable.length === 0 ? "No unpaid bills in selection" : "Approve and confirm payment for selected bills"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: selectedApprovable.length > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(16,185,129,0.2)",
                      color: selectedApprovable.length > 0 ? "#ffffff" : "rgba(255,255,255,0.4)",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 14px",
                      cursor: selectedApprovable.length > 0 ? "pointer" : "not-allowed",
                      boxShadow: selectedApprovable.length > 0 ? "0 4px 12px rgba(16,185,129,0.3)" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    <MdCheckCircle size={15} />
                    <span>Approve ({selectedApprovable.length})</span>
                  </button>
                )}

                {hasPermission(authUser, "manage_bills", "delete") && (
                  /* Bulk Delete Button */
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    disabled={selectedDeletable.length === 0}
                    title={selectedDeletable.length === 0 ? "No bills selected" : "Delete selected bills"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: selectedDeletable.length > 0 ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.06)",
                      color: selectedDeletable.length > 0 ? "#f87171" : "rgba(239,68,68,0.3)",
                      border: selectedDeletable.length > 0 ? "1px solid rgba(239,68,68,0.4)" : "1px solid transparent",
                      borderRadius: 10,
                      padding: "8px 14px",
                      cursor: selectedDeletable.length > 0 ? "pointer" : "not-allowed",
                      transition: "all 0.2s",
                    }}
                  >
                    <MdDelete size={15} />
                    <span>{t("billDeleteCount", { n: selectedDeletable.length })}</span>
                  </button>
                )}

                {/* Clear Selection */}
                <button
                  type="button"
                  onClick={clearSelection}
                  title="Deselect all"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "var(--card-inner-bg, rgba(255,255,255,0.06))",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <MdClose size={16} />
                </button>
              </div>
            )}
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
            <button className="btn-primary mt-1" style={{ borderRadius: 10 }} onClick={handleOpenCreateModal}>
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
            {bills.map((b, i) => {
              const isSelected = Boolean(selectedBillsMap[b.id]);
              return (
                <div
                  key={b.id}
                  className="bill-card animate-fadeIn transition-all"
                  style={{
                    animationDelay: `${i * 30}ms`,
                    border: isSelected ? "1.5px solid var(--accent, #6366f1)" : undefined,
                    boxShadow: isSelected ? "0 0 16px rgba(99,102,241,0.25)" : undefined,
                  }}
                >
                  <div style={{ height: 3, background: b.status === "PAID" ? "linear-gradient(90deg,#34d399,#059669)" : "linear-gradient(90deg,#60A5FA,#2563EB)" }} />
                  <div className="bill-card__body">
                    {/* Select Row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 6, borderBottom: "1px solid var(--glass-border)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: isSelected ? "var(--accent)" : "var(--text-secondary)" }}>
                        <input
                          type="checkbox"
                          style={{ cursor: "pointer", width: 16, height: 16, accentColor: "var(--accent)" }}
                          checked={isSelected}
                          onChange={() => toggleSelect(b)}
                        />
                        <span>{isSelected ? "Selected" : "Select"}</span>
                      </label>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", opacity: 0.6 }}>#{b.id}</span>
                    </div>

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
                        <span className="flat-chip">{b.Flat?.flat_number || "—"}{" · "}{b.Flat?.Block?.name || "—"}</span>
                        {isSuperAdmin && (
                          <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>
                            🏢 {b.Flat?.Block?.Society?.name || "—"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-secondary mb-1">{t("billResidentCol")}</p>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{b.Flat?.User?.name || "NA"}</p>
                      </div>
                    </div>
                    <RowActions bill={b} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDeleteBill={handleDeleteBill} deletingId={deletingId} handleConfirmPayment={handleConfirmPayment} confirmingId={confirmingId} t={t} canEdit={hasPermission(authUser, "manage_bills", "edit")} canDelete={hasPermission(authUser, "manage_bills", "delete")} authUser={authUser} showUnauthorized={showUnauthorized} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Desktop table ── */}
        {!initialLoad && bills.length > 0 && !isMobile && (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    style={{ cursor: "pointer", width: 16, height: 16, accentColor: "var(--accent)" }}
                    checked={isAllPageSelected}
                    ref={el => { if (el) el.indeterminate = isSomePageSelected; }}
                    onChange={toggleSelectAllCurrentPage}
                    title="Select all on this page"
                  />
                </th>
                <th>#</th>
                {isSuperAdmin && <th>Society</th>}
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
              {bills.map((b, i) => {
                const isSelected = Boolean(selectedBillsMap[b.id]);
                return (
                  <tr
                    key={b.id}
                    className="animate-fadeIn transition-colors"
                    style={{
                      animationDelay: `${i * 20}ms`,
                      background: isSelected ? "rgba(99, 102, 241, 0.09)" : undefined,
                    }}
                  >
                    <td style={{ width: 44, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        style={{ cursor: "pointer", width: 16, height: 16, accentColor: "var(--accent)" }}
                        checked={isSelected}
                        onChange={() => toggleSelect(b)}
                        title={`Select bill #${b.id}`}
                      />
                    </td>
                    <td><span className="text-xs font-semibold text-secondary">{(page - 1) * limit + i + 1}</span></td>
                    {isSuperAdmin && (
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                          {b.Flat?.Block?.Society?.name || "—"}
                        </span>
                      </td>
                    )}
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 3, height: 32, borderRadius: 99, flexShrink: 0, background: b.status === "PAID" ? "linear-gradient(180deg,#34d399,#059669)" : "linear-gradient(180deg,#60A5FA,#2563EB)" }} />
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{b.title}</span>
                      </div>
                    </td>
                    <td><span className="flat-chip">{b.Flat?.flat_number || "—"}<span style={{ opacity: 0.55 }}>{" · "}{b.Flat?.Block?.name || "—"}</span></span></td>
                    <td><span className="text-sm text-secondary">{b.Flat?.User?.name || "—"}</span></td>
                    <td><span className="info-chip">{b.billing_month}</span></td>
                    <td><span className="bill-table-amount">₹{Number(b.amount).toLocaleString("en-IN")}</span></td>
                    <td><BillStatus status={b.status} t={t} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <RowActions bill={b} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDeleteBill={handleDeleteBill} deletingId={deletingId} handleConfirmPayment={handleConfirmPayment} confirmingId={confirmingId} t={t} canEdit={hasPermission(authUser, "manage_bills", "edit")} canDelete={hasPermission(authUser, "manage_bills", "delete")} authUser={authUser} showUnauthorized={showUnauthorized} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ── Footer: count + pagination ── */}
        {!initialLoad && bills.length > 0 && (
          <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
            <span className="text-xs text-secondary">
              {t("billShowing")}{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {(page - 1) * limit + 1}{"–"}{Math.min(page * limit, totalItems)}
              </strong>{" "}
              {t("billOf")}{" "}
              <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong>{" "}
              {t("billCount")}
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
          </div>
        )}
      </div>

      {/* ── BULK APPROVE MODAL ── */}
      {showBulkApproveModal &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => !bulkApproving && setShowBulkApproveModal(false)}
          >
            <div
              className="animate-scaleIn"
              style={{
                background: "var(--card-bg, #1e293b)",
                border: "1.5px solid var(--glass-border)",
                borderRadius: 22,
                maxWidth: 480,
                width: "100%",
                padding: "26px 28px",
                boxShadow: "0 25px 60px -12px rgba(0,0,0,0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: "rgba(16,185,129,0.16)",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdCheckCircle size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    Approve Selected Bills
                  </h3>
                  <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--text-secondary)" }}>
                    Confirm payment and mark status as PAID
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid var(--glass-border)",
                  marginBottom: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Bills to Approve:</span>
                  <strong style={{ color: "var(--text-primary)" }}>{selectedApprovable.length} bill(s)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Total Amount:</span>
                  <strong style={{ color: "var(--accent, #818cf8)", fontSize: 15 }}>₹{selectedApprovableAmount.toLocaleString("en-IN")}</strong>
                </div>
                {selectedPaid.length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", borderTop: "1px solid var(--glass-border)", paddingTop: 8 }}>
                    ℹ️ {selectedPaid.length} already PAID bill(s) in selection will remain unaffected.
                  </div>
                )}
              </div>

              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 22, lineHeight: 1.5 }}>
                Approving will update the status of each bill to <strong>PAID</strong>, mark associated payment records as <strong>SUCCESS</strong>, and send real-time web and push notifications to residents.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  disabled={bulkApproving}
                  onClick={() => setShowBulkApproveModal(false)}
                  className="btn-cancel-sm"
                  style={{ padding: "9px 18px", borderRadius: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkApproving}
                  onClick={handleBulkApprove}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "9px 20px",
                    borderRadius: 12,
                    border: "none",
                    cursor: bulkApproving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
                  }}
                >
                  {bulkApproving ? <Spinner size={16} /> : <MdCheckCircle size={17} />}
                  <span>{bulkApproving ? "Approving..." : `Yes, Approve (${selectedApprovable.length})`}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── BULK DELETE MODAL ── */}
      {showBulkDeleteModal &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => !bulkDeleting && setShowBulkDeleteModal(false)}
          >
            <div
              className="animate-scaleIn"
              style={{
                background: "var(--card-bg, #1e293b)",
                border: "1.5px solid var(--glass-border)",
                borderRadius: 22,
                maxWidth: 480,
                width: "100%",
                padding: "26px 28px",
                boxShadow: "0 25px 60px -12px rgba(0,0,0,0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: "rgba(239,68,68,0.16)",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdDelete size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    Delete Selected Bills
                  </h3>
                  <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--text-secondary)" }}>
                    Permanently remove selected bills
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid var(--glass-border)",
                  marginBottom: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Bills to Delete:</span>
                  <strong style={{ color: "#ef4444" }}>{selectedDeletable.length} bill(s)</strong>
                </div>
                {selectedPaid.length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", borderTop: "1px solid var(--glass-border)", paddingTop: 8 }}>
                    ℹ️ Includes {selectedPaid.length} approved/paid bill(s). Associated payment records will also be removed.
                  </div>
                )}
              </div>

              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 22, lineHeight: 1.5 }}>
                Are you sure you want to delete these bills? This action <strong>cannot be undone</strong>.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="btn-cancel-sm"
                  style={{ padding: "9px 18px", borderRadius: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={handleBulkDelete}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "9px 20px",
                    borderRadius: 12,
                    border: "none",
                    cursor: bulkDeleting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                  }}
                >
                  {bulkDeleting ? <Spinner size={16} /> : <MdDelete size={17} />}
                  <span>{bulkDeleting ? "Deleting..." : `Yes, Delete (${selectedDeletable.length})`}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
