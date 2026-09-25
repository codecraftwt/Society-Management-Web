import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { getSocket } from "../../services/socket";
import { hasPermission } from "../../utils/permissions";
import { useCustomAlert } from "../../context/CustomAlertContext";
import useDebounce from "../../hooks/useDebounce";
import {
  MdArrowDropDown, MdCalendarToday, MdChat, MdClose, MdDownload,
  MdFilterAlt, MdImage, MdOutlineInbox, MdPictureAsPdf, MdRefresh,
  MdReportProblem, MdSearch, MdTableChart,
} from "react-icons/md";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import Pagination from "../../components/common/Pagination";
import { exportToPDF } from "../../utils/exportPDF";
import styles from "./Complaint.module.css";
import { formatDate, flatLabel, toDateBoundary, useIsMobile } from "./complaintHelpers.js";
import { Spinner } from "./complaintPieces.jsx";
import MobileComplaintCard from "./index/ComplaintCard.jsx";
import { SkeletonRows } from "./index/Skeletons.jsx";
import DrawerDetail from "./drawer/DrawerDetail.jsx";
import ChatPanel from "./drawer/ChatPanel.jsx";

export default function Complaint() {
  const [limit, setLimit] = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const isMobile           = useIsMobile();
  const { t }              = useLang();
  const { user: authUser } = useContext(AuthContext);
  const { showUnauthorized } = useCustomAlert();

  const [complaints,    setComplaints]    = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [loadError,     setLoadError]     = useState(false);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [isSearchOpen,  setIsSearchOpen]  = useState(false);
  const debSearch = useDebounce(searchQuery, 500);
  const [filterStatus,  setFilterStatus]  = useState("ALL");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [selected,      setSelected]      = useState(null);
  const [drawerTab,     setDrawerTab]     = useState("details");
  const [unreadMap,     setUnreadMap]     = useState({});
  const [filtersOpen,   setFiltersOpen]   = useState(false);
  const [exportOpen,    setExportOpen]    = useState(false);
  const [exporting,     setExporting]     = useState("");

  /* Lazy comment counts — real data from the existing comments endpoint,
     cached per complaint so we never refetch across page turns. */
  const [commentCounts, setCommentCounts] = useState({});
  const commentCountsRef = useRef({});

  /* Export dropdown — close on outside click / escape / scroll */
  const exportWrapRef = useRef(null);
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => {
      if (exportWrapRef.current && !exportWrapRef.current.contains(e.target)) setExportOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setExportOpen(false); };
    const onScroll = () => setExportOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [exportOpen]);

  /* ── Pagination State ── */
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [counts, setCounts] = useState({ ALL: 0, PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0 });

  // --- SUPER ADMIN / CASCADING FILTERS ---
  const isSuperAdmin = authUser?.activeRole === "SUPER_ADMIN";
  const [societiesList, setSocietiesList] = useState([]);
  const [allSocietyFlats, setAllSocietyFlats] = useState([]);

  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    const saved = localStorage.getItem("superadmin_society_filter");
    return (saved === "ALL" || !saved) ? "" : saved;
  });
  const [filterBlockId, setFilterBlockId] = useState("");
  const [filterFloorId, setFilterFloorId] = useState("");
  const [filterFlatId,  setFilterFlatId]  = useState("");

  // 1. Fetch Societies
  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies").then(res => setSocietiesList(res.data || [])).catch(console.error);
    }
  }, [isSuperAdmin]);

  // 2. Fetch all flats for the current society (to derive blocks/floors)
  useEffect(() => {
    const socId = isSuperAdmin ? filterSocietyId : authUser?.society_id;
    if (socId) {
      API.get("/flats", { headers: { "x-society-id": socId } })
        .then(res => setAllSocietyFlats(res.data || []))
        .catch(console.error);
    } else {
      setAllSocietyFlats([]);
    }
    // Reset unit filters when society changes
    setFilterBlockId(""); setFilterFloorId(""); setFilterFlatId("");
  }, [filterSocietyId, isSuperAdmin, authUser?.society_id]);

  // 3. Derive unique Blocks from the flats
  const blocksList = useMemo(() => {
    const seen = new Set();
    const out = [];
    allSocietyFlats.forEach((f) => {
      const b = f.Block || f.Floor?.Block;
      if (b && !seen.has(b.id)) {
        seen.add(b.id);
        out.push(b);
      }
    });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [allSocietyFlats]);

  // 4. Derive Floors for selected Block
  const floorsList = useMemo(() => {
    if (!filterBlockId) return [];
    const seen = new Set();
    const out = [];
    allSocietyFlats.forEach((f) => {
      const bId = f.Block?.id || f.Floor?.Block?.id;
      if (String(bId) === String(filterBlockId) && f.Floor) {
        if (!seen.has(f.Floor.id)) {
          seen.add(f.Floor.id);
          out.push(f.Floor);
        }
      }
    });
    return out.sort((a, b) => a.floor_number - b.floor_number);
  }, [filterBlockId, allSocietyFlats]);

  // 5. Derive Flats for selected Floor/Block
  const flatsList = useMemo(() => {
    if (!filterBlockId) return [];
    return allSocietyFlats.filter((f) => {
      const bId = f.Block?.id || f.Floor?.Block?.id;
      const matchesBlock = String(bId) === String(filterBlockId);
      const matchesFloor = filterFloorId ? String(f.floor_id) === String(filterFloorId) : true;
      return matchesBlock && matchesFloor;
    }).sort((a, b) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true }));
  }, [filterBlockId, filterFloorId, allSocietyFlats]);

  const selectedRef  = useRef(selected);
  const drawerTabRef = useRef(drawerTab);
  useEffect(() => { selectedRef.current  = selected;  }, [selected]);
  useEffect(() => { drawerTabRef.current = drawerTab; }, [drawerTab]);

  const complaintIdsRef = useRef([]);

  const loadComplaints = useCallback(async (pg = 1, q = debSearch, f = filterStatus) => {
    try {
      setLoading(true);
      setLoadError(false);
      const params = {
        page: pg,
        limit: limitRef.current,
        search: q,
        filter: f,
        block_id: filterBlockId,
        floor_id: filterFloorId,
        flat_id:  filterFlatId,
        date_from: toDateBoundary(dateFrom),
        date_to: toDateBoundary(dateTo, true),
      };
      const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};

      const response = await API.get("/complaints", { params, headers });
      const complaintsArray = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data?.complaints)
        ? response.data.complaints
        : Array.isArray(response.data)
        ? response.data
        : [];
      setComplaints(complaintsArray);
      setCounts(response.data?.counts || { ALL: 0, PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0 });
      setTotalPages(response.data?.pagination?.totalPages || 1);
      setTotalItems(response.data?.pagination?.totalItems || 0);
      setPage(pg);

      setUnreadMap(prev => {
        const next = { ...prev };
        complaintsArray.forEach(c => { next[c.id] = c.unread_count || 0; });
        return next;
      });
    } catch (error) {
      console.error("Error loading complaints:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [filterBlockId, filterFloorId, filterFlatId, filterSocietyId, isSuperAdmin, debSearch, filterStatus, dateFrom, dateTo, limit]);

  // Load complaints when any filter or page dependency changes
  useEffect(() => {
    loadComplaints(1, debSearch, filterStatus);
  }, [filterSocietyId, filterBlockId, filterFloorId, filterFlatId, debSearch, filterStatus, dateFrom, dateTo, loadComplaints]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !authUser?.society_id) return;
    socket.emit("join_society", authUser.society_id);
    return () => socket.emit("leave_society", authUser.society_id);
  }, [authUser?.society_id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNewComplaint = (complaint) => {
      setComplaints(prev => {
        if (prev.find(c => c.id === complaint.id)) return prev;
        return [complaint, ...prev];
      });
    };
    socket.on("new_complaint", handleNewComplaint);
    return () => socket.off("new_complaint", handleNewComplaint);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onDeleted = ({ complaint_id }) => {
      setComplaints(prev => prev.filter(c => String(c.id) !== String(complaint_id)));
      setUnreadMap(prev => { const n = { ...prev }; delete n[complaint_id]; return n; });
      setCommentCounts(prev => { const n = { ...prev }; delete n[complaint_id]; return n; });
      delete commentCountsRef.current[complaint_id];
      if (String(selectedRef.current?.id) === String(complaint_id)) setSelected(null);
    };
    socket.on("complaint_deleted", onDeleted);
    return () => socket.off("complaint_deleted", onDeleted);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !authUser) return;
    const handler = (comment) => {
      if (comment.user_id === authUser.id) return;
      const openedComplaintId   = selectedRef.current?.id;
      const isThisComplaintOpen = openedComplaintId &&
        String(openedComplaintId) === String(comment.complaint_id);
      const isOnChatTab = drawerTabRef.current === "chat";
      if (isThisComplaintOpen && isOnChatTab) return;
      setUnreadMap(m => ({
        ...m,
        [comment.complaint_id]: (m[comment.complaint_id] || 0) + 1,
      }));
      setCommentCounts(m =>
        m[comment.complaint_id] !== undefined
          ? { ...m, [comment.complaint_id]: m[comment.complaint_id] + 1 }
          : m
      );
    };
    const onCommentDeleted = ({ complaint_id }) => {
      setCommentCounts(m =>
        m[complaint_id] !== undefined && m[complaint_id] > 0
          ? { ...m, [complaint_id]: m[complaint_id] - 1 }
          : m
      );
    };
    const onCommentsCleared = ({ complaint_id }) => {
      setCommentCounts(m =>
        m[complaint_id] !== undefined ? { ...m, [complaint_id]: 0 } : m
      );
    };
    socket.on("new_complaint_comment", handler);
    socket.on("complaint_comment_deleted", onCommentDeleted);
    socket.on("complaint_comments_cleared", onCommentsCleared);
    return () => {
      socket.off("new_complaint_comment", handler);
      socket.off("complaint_comment_deleted", onCommentDeleted);
      socket.off("complaint_comments_cleared", onCommentsCleared);
    };
  }, [authUser]);

  // Fetch comment counts for the currently displayed complaints (real data, cached)
  useEffect(() => {
    const toFetch = complaints.filter(c => commentCountsRef.current[c.id] === undefined);
    if (!toFetch.length) return;
    toFetch.forEach(c => {
      commentCountsRef.current[c.id] = null;
      const headers = (isSuperAdmin && c?.society_id) ? { "x-society-id": c.society_id } : {};
      API.get(`/complaints/${c.id}/comments`, { headers })
        .then(res => {
          const n = Array.isArray(res.data) ? res.data.length : 0;
          commentCountsRef.current[c.id] = n;
          setCommentCounts(prev => (prev[c.id] === n ? prev : { ...prev, [c.id]: n }));
        })
        .catch(() => {
          commentCountsRef.current[c.id] = 0;
          setCommentCounts(prev => ({ ...prev, [c.id]: 0 }));
        });
    });
  }, [complaints, isSuperAdmin]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const newIds  = complaints.map(c => c.id);
    const added   = newIds.filter(id => !complaintIdsRef.current.includes(id));
    const removed = complaintIdsRef.current.filter(id => !newIds.includes(id));
    removed.forEach(id => socket.emit("leave_complaint", id));
    added.forEach(id   => socket.emit("join_complaint",  id));
    complaintIdsRef.current = newIds;
    return () => {
      complaintIdsRef.current.forEach(id => socket.emit("leave_complaint", id));
      complaintIdsRef.current = [];
    };
  }, [complaints]);

  const markRead = useCallback(async (complaintId) => {
    setUnreadMap(m => ({ ...m, [complaintId]: 0 }));
    try { await API.put(`/complaints/${complaintId}/read`); }
    catch (e) { console.error("[markRead]", e); }
  }, []);

  const updateStatus = async (id, status) => {
    if (!hasPermission(authUser, "complaints", "update_status")) {
      showUnauthorized("You do not have permission to update complaint status.");
      return;
    }
    try {
      setUpdatingId(id);
      // Determine society context for the complaint
      const complaint = complaints.find(c => c.id === id);
      const headers = (isSuperAdmin && complaint?.society_id) ? { "x-society-id": complaint.society_id } : {};

      await API.put(`/complaints/${id}`, { status }, { headers });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        toast.error(e.response?.data?.message || "Failed to update status");
      }
    }
    finally { setUpdatingId(null); }
  };

  const openDrawer = useCallback((c, tab = "details") => {
    setSelected(c);
    setDrawerTab(tab);
    markRead(c.id);
  }, [markRead]);

  const closeDrawer = () => setSelected(null);

  const handleDrawerTabChange = (tab) => {
    setDrawerTab(tab);
    if (tab === "chat" && selected) markRead(selected.id);
  };

  const hasDateFilter = dateFrom || dateTo;
  const clearDate     = () => { setDateFrom(""); setDateTo(""); };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("ALL");
    setFilterSocietyId("");
    setFilterBlockId("");
    setFilterFloorId("");
    setFilterFlatId("");
    clearDate();
  };

  const handlePageChange = (p) => loadComplaints(p, debSearch, filterStatus);

  const fetchComplaintsForExport = async () => {
    const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
    const baseParams = {
      limit: 1000,
      search: debSearch,
      filter: filterStatus,
      block_id: filterBlockId,
      floor_id: filterFloorId,
      flat_id: filterFlatId,
      date_from: toDateBoundary(dateFrom),
      date_to: toDateBoundary(dateTo, true),
    };
    const extractRows = (response) => Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data?.complaints)
      ? response.data.complaints
      : Array.isArray(response.data)
      ? response.data
      : [];

    const first = await API.get("/complaints", { params: { ...baseParams, page: 1 }, headers });
    const rows = extractRows(first);
    const pages = Number(first.data?.pagination?.totalPages) || 1;
    if (pages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: pages - 1 }, (_, index) =>
          API.get("/complaints", { params: { ...baseParams, page: index + 2 }, headers })
        )
      );
      remaining.forEach((response) => rows.push(...extractRows(response)));
    }
    return rows;
  };

  const exportCSV = async () => {
    if (exporting) return;
    setExporting("csv");
    try {
      const exportRows = await fetchComplaintsForExport();
    const escapeCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      t("compColTitle"), t("compColDesc"), t("reportResident"), t("reportFlat"),
      t("reportSociety"), t("billStatusCol"), t("compSubmittedAt"),
    ];
      const body = exportRows.map(c => [
      c.title,
      c.description || "",
      c.User?.name || "",
      flatLabel(c, t),
      c.Society?.name || "",
      c.status,
      formatDate(c.created_at),
    ].map(escapeCell).join(","));
    const csv = [headers.map(escapeCell).join(","), ...body].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Complaint CSV export failed:", error);
      toast.error(t("compExportFailed"));
    } finally {
      setExporting("");
    }
  };

  const exportPDF = async () => {
    if (exporting) return;
    setExporting("pdf");
    try {
      const exportRows = await fetchComplaintsForExport();
      exportToPDF({
        title: t("adminCompTitle"),
        fileName: `complaints-${new Date().toISOString().slice(0, 10)}`,
        columns: [t("compColTitle"), t("compColDesc"), t("reportResident"), t("reportFlat"), t("reportSociety"), t("billStatusCol"), t("compSubmittedAt")],
        rows: exportRows.map((c) => [
          c.title || "", c.description || "", c.User?.name || "",
          flatLabel(c, t), c.Society?.name || "", c.status, formatDate(c.created_at),
        ]),
      });
    } catch (error) {
      console.error("Complaint PDF export failed:", error);
      toast.error(t("compExportFailed"));
    } finally {
      setExporting("");
    }
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (isSuperAdmin && filterSocietyId) {
      const s = societiesList.find(x => String(x.id) === String(filterSocietyId));
      chips.push({ id: "society", label: t("reportSociety") || "Society", value: s?.name || filterSocietyId, remove: () => setFilterSocietyId("") });
    }
    if (filterBlockId) {
      const b = blocksList.find(x => String(x.id) === String(filterBlockId));
      chips.push({ id: "block", label: t("blockLabel") || "Block", value: b?.name || filterBlockId, remove: () => setFilterBlockId("") });
    }
    if (filterFloorId) {
      const f = floorsList.find(x => String(x.id) === String(filterFloorId));
      chips.push({ id: "floor", label: t("floorLabel") || "Floor", value: f ? String(f.floor_number) : filterFloorId, remove: () => setFilterFloorId("") });
    }
    if (filterFlatId) {
      const fl = flatsList.find(x => String(x.id) === String(filterFlatId));
      chips.push({ id: "flat", label: t("flatLabel") || "Flat", value: fl?.flat_number || filterFlatId, remove: () => setFilterFlatId("") });
    }
    if (hasDateFilter) {
      chips.push({ id: "date", label: t("compDate") || "Date", value: `${dateFrom ? formatDate(dateFrom) : "…"} – ${dateTo ? formatDate(dateTo) : "…"}`, remove: clearDate });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, filterSocietyId, filterBlockId, filterFloorId, filterFlatId, hasDateFilter, dateFrom, dateTo, societiesList, blocksList, floorsList, flatsList]);

  const filtered = complaints; // Backend handles filtering/pagination.

  const openAttachment = (url, title) => {
    if (!url) return;
    const isPdf = typeof url === "string" && (url.toLowerCase().endsWith(".pdf") || url.includes("/pdf"));
    if (isPdf) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setLightboxPhoto(url);
      setLightboxTitle(title || "Attachment");
    }
  };

  const tabBtn = (key) => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "7px 8px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
    background: drawerTab === key ? "var(--accent,#6B46C1)" : "transparent",
    color: drawerTab === key ? "#fff" : "var(--text-secondary)",
    boxShadow: drawerTab === key ? "0 2px 8px rgba(107,70,193,0.35)" : "none",
  });

  return (
    <div className={`page-root comp-page animate-fadeIn ${styles.page}`}>
      {/* ── 1. UNIFIED PAGE HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent), #9e58ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(158, 88, 255, 0.3)",
              color: "#ffffff",
            }}
          >
            <MdReportProblem size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("adminCompTitle") || "Complaints"}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {t("compSubtitle") || "Manage and resolve resident complaints"}
            </p>
          </div>
        </div>

        <div
          className="relative z-40 flex items-center justify-end gap-2.5 flex-wrap shrink-0"
          style={{ overflow: "visible" }}
        >
          {/* Export Dropdown */}
          <div className={styles.exportWrap} ref={exportWrapRef}>
            <button
              className={styles.exportBtn}
              style={{ height: 42, minHeight: 42, borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setExportOpen(o => !o)}
              disabled={complaints.length === 0 || Boolean(exporting)}
              title={t("compExport")}
            >
              {exporting ? <Spinner small /> : <MdDownload size={15} />}
              {exporting ? t("compExporting") : (t("compExport") || "Export")}
              {!exporting && <MdArrowDropDown size={16} />}
            </button>
            {exportOpen && (
              <div className={styles.exportMenu}>
                <button className={styles.exportMenuItem} disabled={complaints.length === 0 || Boolean(exporting)}
                  onClick={() => { exportCSV(); setExportOpen(false); }}>
                  <MdTableChart size={14} /> CSV
                </button>
                <button className={styles.exportMenuItem} disabled={complaints.length === 0 || Boolean(exporting)}
                  onClick={() => { exportPDF(); setExportOpen(false); }}>
                  <MdPictureAsPdf size={14} /> PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. FILTERS ROW ────────────────────────────────────────── */}
      <div
        className="relative z-40 flex items-center justify-start gap-2.5 flex-wrap mb-5"
        style={{ overflow: "visible" }}
      >
        {/* Status Sliding Tabs */}
        <SlidingTabs
          value={filterStatus}
          onChange={(val) => { setFilterStatus(val); setPage(1); }}
          items={(() => {
            const allTabs = [
              { id: "ALL", label: t("compTabAll") || "All", badge: counts.ALL },
              { id: "PENDING", label: t("compStatusPending") || "Pending", badge: counts.PENDING },
              { id: "IN_PROGRESS", label: t("compTabInProgress") || "In Progress", badge: counts.IN_PROGRESS },
              { id: "RESOLVED", label: t("compStatusResolved") || "Resolved", badge: counts.RESOLVED },
            ];
            return isSearchOpen ? allTabs.filter(tab => tab.id === filterStatus) : allTabs;
          })()}
        />

        {/* Expandable Search Bar */}
        <ExpandableSearch
          value={searchQuery}
          onChange={(val) => { setSearchQuery(val); setPage(1); }}
          placeholder={t("compSearchPh") || "Search complaints..."}
          isOpen={isSearchOpen}
          onOpenChange={setIsSearchOpen}
        />

        {/* Date Range Filter */}
        <DateRangeFilter
          className={styles.dateRangeControl}
          fromDate={dateFrom}
          toDate={dateTo}
          onChange={({ from, to }) => {
            setDateFrom(from);
            setDateTo(to);
            setPage(1);
          }}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
          placeholder={t("compDate") || "Date Range"}
        />

        {/* Super Admin Society Filter */}
        {isSuperAdmin && (
          <Select
            className="input"
            value={filterSocietyId}
            onChange={(e) => { setFilterSocietyId(e.target.value); setPage(1); }}
            style={{ height: 42, minHeight: 42, fontSize: 13, borderRadius: 12, minWidth: 160 }}
          >
            <option value="">{t("allSocieties") || "All Societies"}</option>
            {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}

        {/* Filters Toggle Button */}
        <button
          type="button"
          className={`${styles.filtersBtn} ${filtersOpen ? styles.filtersBtnActive : ""}`}
          style={{ height: 42, minHeight: 42, borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px" }}
          onClick={() => setFiltersOpen(o => !o)}
        >
          <MdFilterAlt size={16} />
          <span>{t("compFilters") || "Filters"}</span>
          {activeChips.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, background: "var(--accent)", color: "#fff", padding: "1px 6px", borderRadius: 999 }}>
              {activeChips.length}
            </span>
          )}
        </button>
      </div>

      {/* ── 2. FILTER POPOVER & ACTIVE CHIPS ───────────────────────── */}
      {filtersOpen && (
        <div className={styles.filtersPanel} style={{ marginBottom: 16 }}>
          {isSuperAdmin && (
            <div className={styles.fGroup}>
              <span className={styles.fLabel}>{t("reportSociety") || "Society"}</span>
              <Select value={filterSocietyId} onChange={(e) => setFilterSocietyId(e.target.value)}>
                <option value="">{t("allSocieties")}</option>
                {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          )}
          <div className={styles.fGroup}>
            <span className={styles.fLabel}>{t("blockLabel") || "Block"}</span>
            <Select value={filterBlockId} onChange={(e) => setFilterBlockId(e.target.value)}>
              <option value="">{t("allBlocks")}</option>
              {blocksList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div className={styles.fGroup}>
            <span className={styles.fLabel}>{t("floorLabel") || "Floor"}</span>
            <Select disabled={!filterBlockId} value={filterFloorId} onChange={(e) => setFilterFloorId(e.target.value)}>
              <option value="">{t("allFloors")}</option>
              {floorsList.map(f => <option key={f.id} value={f.id}>{f.floor_number}</option>)}
            </Select>
          </div>
          <div className={styles.fGroup}>
            <span className={styles.fLabel}>{t("flatLabel") || "Flat"}</span>
            <Select disabled={!filterBlockId} value={filterFlatId} onChange={(e) => setFilterFlatId(e.target.value)}>
              <option value="">{t("allFlats")}</option>
              {flatsList.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
            </Select>
          </div>
          <div className={styles.fGroup}>
            <span className={styles.fLabel}>{t("compDate") || "Date"} — {t("compDateStart")}</span>
            <input type="date" className={styles.dateInput} value={dateFrom} max={dateTo || undefined}
              onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className={styles.fGroup}>
            <span className={styles.fLabel}>{t("compDate") || "Date"} — {t("compDateEnd")}</span>
            <input type="date" className={styles.dateInput} value={dateTo} min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className={styles.chipsRow} style={{ marginBottom: 14 }}>
          <span className={styles.chipsLabel}>{t("compActiveFilters")}</span>
          {activeChips.map(chip => (
            <span key={chip.id} className={styles.chip}>
              <span className={styles.chipLabel}>{chip.label}:</span>
              <span className={styles.chipValue}>{chip.value}</span>
              <button className={styles.chipRemove} onClick={chip.remove} title={t("compClearDate")}>
                <MdClose size={12} />
              </button>
            </span>
          ))}
          <button className={styles.clearAll} onClick={clearAllFilters}>{t("compClearFilters")}</button>
        </div>
      )}

      {/* ── 3. MAIN SURFACE (CARD GRID) ────────────────────────────── */}
      <div className="space-y-4">

        {/* ── 5. COMPLAINT LIST ─────────────────────────────────────── */}
        {loadError && !loading ? (
          <div className={styles.state}>
            <div className={styles.stateIcon}><MdOutlineInbox size={24} /></div>
            <p className={styles.stateTitle}>{t("compLoadError")}</p>
            <p className={styles.stateDesc}>{t("compLoadErrorSub")}</p>
            <button className={styles.stateBtn} onClick={() => loadComplaints(1, debSearch, filterStatus)}>
              <MdRefresh size={14} /> {t("compRetry")}
            </button>
          </div>
        ) : loading && complaints.length === 0 ? (
          <SkeletonRows />
        ) : complaints.length === 0 ? (
          <div className={styles.state}>
            <div className={styles.stateIcon}><MdSearch size={24} /></div>
            <p className={styles.stateTitle}>{t("compNoComplaints")}</p>
            <p className={styles.stateDesc}>{t("compNoComplaintsSub")}</p>
            <button className={styles.stateBtn} onClick={clearAllFilters}>{t("compClearFilters")}</button>
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {filtered.map((c, i) => (
              <div key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 40}ms` }}>
                <MobileComplaintCard c={c} updateStatus={updateStatus} updatingId={updatingId} t={t}
                  onOpen={openDrawer} unreadMap={unreadMap} commentCount={commentCounts[c.id]}
                  onPhotoClick={(url, title) => {
                    if (!url) return;
                    const isPdf = typeof url === "string" && (url.toLowerCase().endsWith(".pdf") || url.includes("/pdf"));
                    if (isPdf) {
                      window.open(url, "_blank", "noopener,noreferrer");
                    } else {
                      setLightboxPhoto(url);
                      setLightboxTitle(title || "Attachment");
                    }
                  }} />
              </div>
            ))}
          </div>
        )}

        {/* ── PAGINATION FOOTER ── */}
        {!loading && complaints.length > 0 && (
          <div className={styles.footer}>
            <span className={styles.footerMeta}>
              {t("reportShowing")} <strong>{(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)}</strong>
              {t("reportOf")} {totalItems} {t("rcrComplaintsCount")}
              {hasDateFilter && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--stat-purple-color)", fontWeight: 600, marginLeft: 8 }}>
                  <MdCalendarToday size={12} /> {t("compFilteredByDate")}
                </span>
              )}
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
          </div>
        )}
      </div>

      {/* ── 6. COMPLAINT DETAILS DRAWER ────────────────────────────── */}
      {selected && createPortal(
        <>
          <div className="modal-overlay-blur animate-fadeIn" style={{ zIndex: 1050 }} onClick={closeDrawer} />
          <div className={`detail-drawer inherent-drawer animate-fadeIn ${styles.drawer}`}
            style={isMobile
              ? { position: "fixed", inset: 0, borderRadius: 0, width: "100%", maxWidth: "100%", zIndex: 1060 }
              : { position: "fixed", top: 0, right: 0, bottom: 0, left: "auto", width: "min(470px, 100vw)", borderRadius: "16px 0 0 16px", zIndex: 1060 }}>
            <div className={`detail-drawer__header ${styles.drawerHeader}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="er-icon er-icon--complaint" style={{ width: 36, height: 36, borderRadius: 10 }}>
                  <MdReportProblem size={17} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("adminCompDetail")}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{formatDate(selected.created_at)}</div>
                </div>
              </div>
              <button className="detail-drawer__close-btn" onClick={closeDrawer}><MdClose size={17} /></button>
            </div>

            <div style={{ display: "flex", gap: 4, padding: "10px 14px 0",
              background: "var(--card-inner-bg)", borderBottom: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", flex: 1, background: "var(--card-bg)",
                border: "1px solid var(--glass-border)", borderRadius: 10, padding: 3, gap: 3 }}>
                <button style={tabBtn("details")} onClick={() => handleDrawerTabChange("details")}>
                  <MdReportProblem size={13} /> {t("chatDetails")}
                </button>
                <button style={tabBtn("chat")} onClick={() => handleDrawerTabChange("chat")}>
                  <MdChat size={13} /> {t("chatDiscussion")}
                  {(unreadMap[selected.id] || 0) > 0 && drawerTab !== "chat" && (
                    <span style={{ minWidth: 16, height: 16, borderRadius: "50%", background: "#ef4444",
                      color: "#fff", fontSize: 9, fontWeight: 800, display: "inline-flex",
                      alignItems: "center", justifyContent: "center", padding: "0 4px", marginLeft: 2 }}>
                      {unreadMap[selected.id] > 99 ? "99+" : unreadMap[selected.id]}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="detail-drawer__body scrollbar-hide"
              style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {drawerTab === "details" && (
                <DrawerDetail selected={selected} t={t} updateStatus={updateStatus} updatingId={updatingId}
                  onOpenAttachment={(url) => openAttachment(url, selected.title)} />
              )}
              {drawerTab === "chat" && authUser && (
                <ChatPanel complaintId={selected.id} societyId={selected.society_id} currentUser={authUser} />
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Lightbox */}
      {lightboxPhoto && createPortal(
        <div className="lightbox-overlay animate-fadeIn" onClick={() => setLightboxPhoto(null)}>
          <div style={{ width: "100%", maxWidth: 680 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "white", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                <MdImage size={15} style={{ color: "var(--accent)" }} /> {lightboxTitle}
              </p>
              <button onClick={e => { e.stopPropagation(); setLightboxPhoto(null); }}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                  border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdClose size={17} />
              </button>
            </div>
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>
              <img src={lightboxPhoto} alt="complaint"
                style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: "65vh" }} />
            </div>
            <p style={{ textAlign: "center", fontSize: 11, marginTop: 12, color: "rgba(255,255,255,0.3)", margin: "12px 0 0" }}>
              {t("adminCompTapClose")}
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}