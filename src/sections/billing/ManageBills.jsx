import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  MdAdd, MdCheckCircle, MdClose, MdDelete,
  MdOutlineInbox, MdPayments, MdReceiptLong, MdSchedule,
  MdSearch, MdWarning,
} from "react-icons/md";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useCustomAlert } from "../../context/CustomAlertContext";
import { useLang } from "../../context/LanguageContext";
import useDebounce from "../../hooks/useDebounce";
import { hasPermission } from "../../utils/permissions";
import { getDateRangeError, getPositiveAmountError, getTitleError } from "../../utils/validators";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import Pagination from "../../components/common/Pagination";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import { AccountantRowActions, AdminRowActions, BillStatus, Spinner, StatCards } from "./billPieces";
import { BILL_CATEGORIES, BILL_TYPE_FILTERS, getCurrentBillingMonth, getTodayISO, useIsMobile } from "./billingHelpers";
import { BillCreateModal, BillDetailsModal, BulkModals, CreateSuccessPopup } from "./billModals";

export default function ManageBills({ variant }) {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const { showUnauthorized, showError } = useCustomAlert();

  const isAccountant = variant === "accountant" || user?.activeRole === "ACCOUNTANT";
  const isSuperAdmin = !isAccountant && user?.activeRole === "SUPER_ADMIN";

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
  const [filterType, setFilterType] = useState("ALL");
  const [viewBill, setViewBill] = useState(null);
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
    issue_date: isAccountant ? "" : getTodayISO(),
    last_pay_date: "",
  });

  /* ── Delete & Confirm ── */
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  /* ── Multi-select & Bulk operations (Super Admin / Society Admin) ── */
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
    if (isAccountant) return;
    localStorage.setItem("superadmin_society_filter_bills", filterSocietyId || "ALL");
  }, [filterSocietyId, isAccountant]);

  /* ────────────────────────────────────
     LOAD BILLS — backend paginated
  ──────────────────────────────────── */
  const loadBills = useCallback(async (pg, q, filter, type, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: limitRef.current,
        filter,
        ...(type && type !== "ALL" ? { type } : {}),
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
  useEffect(() => { loadBills(1, "", "ALL", isAccountant ? "ALL" : undefined, true); }, [loadBills]);
  useEffect(() => {
    if (isAccountant) { loadFlats(); return; }
    if (filterSocietyId || !isSuperAdmin) loadFlats(filterSocietyId);
    else setFlats([]);
  }, [filterSocietyId, isSuperAdmin, isAccountant]);

  const handleFormSocietyChange = (socId) => {
    setFormSocietyId(socId);
    setFormData(p => ({ ...p, flat_id: "" }));
    if (socId) loadFlats(socId);
    else setFlats([]);
  };

  /* ── Re-fetch on search change ── */
  useEffect(() => {
    if (initialLoad) return;
    loadBills(1, debSearch, filterStatus, isAccountant ? filterType : undefined);
  }, [debSearch]);

  /* ── Re-fetch on status filter change ── */
  const handleFilterChange = (f) => {
    setFilterStatus(f);
    loadBills(1, debSearch, f, isAccountant ? filterType : undefined);
  };

  /* ── Re-fetch on type filter change (Accountant) ── */
  const handleTypeChange = (tVal) => {
    setFilterType(tVal);
    loadBills(1, debSearch, filterStatus, tVal);
  };

  const handlePageChange = (p) => loadBills(p, debSearch, filterStatus, isAccountant ? filterType : undefined);

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

  /* ── Open create (toggle style for Accountant, always-open for Admin) ── */
  const handleOpenCreate = () => {
    if (isAccountant) {
      if (!showCreate && !hasPermission(user, "manage_bills", "create")) {
        showUnauthorized("You do not have permission to create bills.");
        return;
      }
      setShowCreate(p => !p);
      return;
    }
    if (!hasPermission(user, "manage_bills", "create")) {
      showUnauthorized("You do not have permission to create bills.");
      return;
    }
    setFormSocietyId(filterSocietyId || "");
    setShowCreate(true);
  };

  /* ── Create ── */
  const handleCreateBill = async (e) => {
    if (e) e.preventDefault();
    if (!hasPermission(user, "manage_bills", "create")) {
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
      if (isAccountant) {
        const payload = {
          ...formData,
          title: formData.title.trim(),
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
        loadBills(1, debSearch, filterStatus, filterType);
      } else {
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
      }
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to create bill");
      }
    }
    finally { setCreating(false); }
  };

  /* ── Delete ── */
  const handleDeleteBill = async (id) => {
    if (!hasPermission(user, "manage_bills", "delete")) {
      showUnauthorized("You do not have permission to delete bills.");
      if (isAccountant) setConfirmDeleteId(null);
      return;
    }
    try {
      setDeletingId(id);
      const bill = bills.find(b => b.id === id);
      const headers = (isSuperAdmin && bill?.Flat?.Block?.society_id) ? { "x-society-id": bill.Flat.Block.society_id } : {};
      await API.delete(`/bills/${id}`, { headers });
      if (!isAccountant) {
        setSelectedBillsMap(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setFeedbackBanner({ type: "success", message: "Bill deleted successfully." });
      }
      const newPage = bills.length === 1 && page > 1 ? page - 1 : page;
      loadBills(newPage, debSearch, filterStatus);
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

  /* ── Confirm payment ── */
  const handleConfirmPayment = async (id) => {
    if (!hasPermission(user, "manage_bills", "edit")) {
      showUnauthorized("You do not have permission to confirm bill payments.");
      return;
    }
    setConfirmingId(id);
    try {
      const bill = bills.find(b => b.id === id);
      const headers = (isSuperAdmin && bill?.Flat?.Block?.society_id) ? { "x-society-id": bill.Flat.Block.society_id } : {};
      await API.put(`/bills/confirm/${id}`, {}, { headers });
      if (!isAccountant) {
        setSelectedBillsMap(prev => {
          if (!prev[id]) return prev;
          return { ...prev, [id]: { ...prev[id], status: "PAID" } };
        });
        setFeedbackBanner({ type: "success", message: "Payment confirmed successfully." });
      }
      loadBills(page, debSearch, filterStatus);
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

  /* ── Bulk Actions (Super Admin / Society Admin) ── */
  const handleBulkApprove = async () => {
    if (!hasPermission(user, "manage_bills", "edit")) {
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
    if (!hasPermission(user, "manage_bills", "delete")) {
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

  /* ── Cards reflect the active tab (Accountant) ── */
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

      {/* ── FEEDBACK NOTIFICATION BANNER (Admin) ── */}
      {!isAccountant && feedbackBanner && (
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

      {/* ── HEADER ── */}
      {isAccountant ? (
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
      ) : (
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
            <SlidingTabs
              value={filterStatus}
              onChange={handleFilterChange}
              items={isSearchOpen ? TABS.filter(t => t.key === filterStatus).map(t => ({ id: t.key, label: t.label, badge: t.count })) : TABS.map(t => ({ id: t.key, label: t.label, badge: t.count }))}
            />

            <ExpandableSearch
              value={search}
              onChange={(val) => { setSearch(val); setPage(1); }}
              placeholder={t("billSearch") || "Search bills, flats, categories…"}
              fetching={fetching}
              isOpen={isSearchOpen}
              onOpenChange={setIsSearchOpen}
            />

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

            {hasPermission(user, "manage_bills", "create") && (
              <GlobalButton
                variant="add"
                icon={MdAdd}
                borderDraw
                onClick={handleOpenCreate}
                className="shrink-0"
                style={{ fontWeight: 700, height: 42 }}
              >
                {t("billCreate")}
              </GlobalButton>
            )}
          </div>
        </div>
      )}

      {/* ── STAT CARDS (Accountant) ── */}
      {isAccountant && !initialLoad && counts.total > 0 && (
        <StatCards isMobile={isMobile} stats={STATS} />
      )}

      {/* ── CREATE BILL MODAL ── */}
      <BillCreateModal
        variant={variant}
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        formData={formData}
        setFormData={setFormData}
        handleCategoryChange={handleCategoryChange}
        handleCreateBill={handleCreateBill}
        creating={creating}
        isMobile={isMobile}
        isSuperAdmin={isSuperAdmin}
        filterSocietyId={filterSocietyId}
        formSocietyId={formSocietyId}
        handleFormSocietyChange={handleFormSocietyChange}
        flats={flats}
        societiesList={societiesList}
        t={t}
      />

      {/* ── CREATE SUCCESS POPUP (Admin) ── */}
      {!isAccountant && createdBill && (
        <CreateSuccessPopup
          createdBill={createdBill}
          onClose={() => setCreatedBill(null)}
          flats={flats}
          societiesList={societiesList}
          isSuperAdmin={isSuperAdmin}
          t={t}
        />
      )}

      {/* ── BILLS TABLE ── */}
      <div className="data-table-wrap">

        {/* Toolbar */}
        {isAccountant ? (
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
        ) : (
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

                  {hasPermission(user, "manage_bills", "edit") && (
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

                  {hasPermission(user, "manage_bills", "delete") && (
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
        )}

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
            <button className="btn-primary mt-1" style={{ borderRadius: 10 }} onClick={() => isAccountant ? setShowCreate(true) : handleOpenCreate()}>
              <MdAdd size={15} />{t("billCreateFirst")}
            </button>
          </div>
        )}

        {!initialLoad && counts.total > 0 && bills.length === 0 && !fetching && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary animate-fadeIn">
            <MdSearch size={36} className="opacity-20" />
            <p className="text-sm">{t("billNoMatch")}</p>
            <button className="text-xs font-semibold text-accent hover:underline"
              onClick={() => { setSearch(""); handleFilterChange("ALL"); if (isAccountant) handleTypeChange("ALL"); }}>
              {t("billClearFilters")}
            </button>
          </div>
        )}

        {/* ── Mobile cards ── */}
        {!initialLoad && bills.length > 0 && isMobile && (
          isAccountant ? (
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
                      <BillStatus status={b.status} t={t} variant="accountant" />
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
                    <AccountantRowActions
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
          ) : (
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
                      <AdminRowActions bill={b} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDeleteBill={handleDeleteBill} deletingId={deletingId} handleConfirmPayment={handleConfirmPayment} confirmingId={confirmingId} t={t} canEdit={hasPermission(user, "manage_bills", "edit")} canDelete={hasPermission(user, "manage_bills", "delete")} authUser={user} showUnauthorized={showUnauthorized} />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Desktop table ── */}
        {!initialLoad && bills.length > 0 && !isMobile && (
          isAccountant ? (
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
                    <td><span className="text-xs font-semibold text-secondary">{(page - 1) * limit + i + 1}</span></td>
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
                    <td><BillStatus status={b.status} t={t} variant="accountant" /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <AccountantRowActions
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
          ) : (
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
                        <AdminRowActions bill={b} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDeleteBill={handleDeleteBill} deletingId={deletingId} handleConfirmPayment={handleConfirmPayment} confirmingId={confirmingId} t={t} canEdit={hasPermission(user, "manage_bills", "edit")} canDelete={hasPermission(user, "manage_bills", "delete")} authUser={user} showUnauthorized={showUnauthorized} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
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

      {/* ── BILL & PAYMENT DETAILS MODAL + DELETE CONFIRM (Accountant) ── */}
      {isAccountant ? (
        <>
          <BillDetailsModal
            viewBill={viewBill}
            onClose={() => setViewBill(null)}
            handleConfirmPayment={handleConfirmPayment}
            confirmingId={confirmingId}
            t={t}
          />
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
        </>
      ) : (
        <BulkModals
          showBulkApproveModal={showBulkApproveModal}
          setShowBulkApproveModal={setShowBulkApproveModal}
          showBulkDeleteModal={showBulkDeleteModal}
          setShowBulkDeleteModal={setShowBulkDeleteModal}
          bulkApproving={bulkApproving}
          bulkDeleting={bulkDeleting}
          selectedApprovable={selectedApprovable}
          selectedDeletable={selectedDeletable}
          selectedApprovableAmount={selectedApprovableAmount}
          selectedPaid={selectedPaid}
          handleBulkApprove={handleBulkApprove}
          handleBulkDelete={handleBulkDelete}
        />
      )}
    </div>
  );
}

export function ManageBillsAccountant(props) {
  return <ManageBills {...props} variant="accountant" />;
}