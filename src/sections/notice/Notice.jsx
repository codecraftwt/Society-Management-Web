// NEW NOTICE SECTION (replaces src/pages/Admin/Notice.jsx)
import { useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import {
  MdSearch,
  MdCampaign,
  MdOutlineOpenInNew,
  MdCheckCircle,
  MdPeople,
  MdVisibility,
  MdDoneAll,
  MdHourglassEmpty,
  MdAttachFile,
} from "react-icons/md";

import { BASE_URL } from "../../config/apiConfig";
import PdfViewer from "../../components/common/PdfViewer";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalTable from "../../components/common/GlobalTable";
import Index from "./index/Index";
import Create from "./create/Create";
import Edit from "./edit/Edit";
import Delete from "./delete/Delete";
import "./Notice.css";

function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/* ── File helpers ── */
const isPdfFile = (fileName = "") =>
  fileName.toLowerCase().endsWith(".pdf") || fileName.toLowerCase().includes(".pdf?");

const isImageFile = (fileName = "") =>
  /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(fileName);

const getPreviewUrl = (fullUrl, fileName = "") => {
  if (isPdfFile(fileName)) {
    return fullUrl;
  }
  return fullUrl;
};

export default function Notice() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";

  const [notices, setNotices] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [search, setSearch] = useState("");
  const debSearch = useDebounce(search, 400);

  // SuperAdmin Society Filter
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    return localStorage.getItem("superadmin_society_filter") || "ALL";
  });

  // Create / Edit modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createSession, setCreateSession] = useState(0);
  const [editNotice, setEditNotice] = useState(null);

  // Delete Confirm Dialog state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Viewers
  const [lightbox, setLightbox] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [readMoreNotice, setReadMoreNotice] = useState(null);

  // Acknowledgement History Modal State
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    notice: null,
    loading: false,
    data: null,
    search: "",
    statusFilter: "ALL",
  });

  const fetchSocieties = async () => {
    try {
      const res = await API.get("/societies");
      setSocietiesList(res.data || []);
    } catch {
      setSocietiesList([]);
    }
  };

  const loadNotices = useCallback(async (pg, q, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const activeSocId = isSuperAdmin ? (filterSocietyId === "ALL" ? "" : filterSocietyId) : user?.society_id;
      const params = new URLSearchParams({
        page: pg,
        limit: limitRef.current,
        ...(q ? { search: q } : {}),
        ...(activeSocId ? { society_id: activeSocId } : {}),
      });

      const res = await API.get(`/notices?${params.toString()}`);
      const raw = Array.isArray(res.data?.notices)
        ? res.data.notices
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      const total = res.data?.total ?? res.data?.pagination?.totalItems ?? raw.length;

      setNotices(raw);
      setTotalItems(total);
      setTotalPages(Math.ceil(total / limitRef.current) || 1);
      if (isInit) setTotalAll(total);
    } catch {
      setNotices([]);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, [user, isSuperAdmin, filterSocietyId]);

  useEffect(() => {
    if (isSuperAdmin) fetchSocieties();
  }, [isSuperAdmin]);

  useEffect(() => {
    loadNotices(page, debSearch, initialLoad);
  }, [page, debSearch, loadNotices]);

  useEffect(() => {
    socket.on("noticeCreated", (newNotice) => {
      setNotices((prev) => [newNotice, ...prev]);
      setTotalItems((prev) => prev + 1);
      setTotalAll((prev) => prev + 1);
    });
    return () => {
      socket.off("noticeCreated");
    };
  }, []);

  const displayedNotices = useMemo(() => {
    if (!search.trim()) return notices;
    const q = search.toLowerCase().trim();
    return notices.filter((n) => {
      const matchTitle = n.title ? n.title.toLowerCase().includes(q) : false;
      const matchDesc = n.description ? n.description.toLowerCase().includes(q) : false;
      const matchAuthor = n.created_by_name ? n.created_by_name.toLowerCase().includes(q) : false;
      return matchTitle || matchDesc || matchAuthor;
    });
  }, [notices, search]);

  const handlePageSizeChange = (s) => {
    limitRef.current = s;
    setLimit(s);
    setPage(1);
    loadNotices(1, debSearch);
  };

  const handleCreated = () => {
    loadNotices(1, debSearch);
  };

  const handleUpdated = () => {
    loadNotices(1, debSearch);
  };

  const handleDeleted = (n) => {
    setNotices((prev) => prev.filter((item) => item.id !== n.id));
    setTotalItems((prev) => Math.max(0, prev - 1));
    setTotalAll((prev) => Math.max(0, prev - 1));
    setDeleteTarget(null);
  };

  // Open Acknowledgement History Modal
  const fetchHistory = async (noticeId, searchVal = "", statusVal = "ALL") => {
    try {
      setHistoryModal(prev => ({ ...prev, loading: true }));
      const params = new URLSearchParams();
      if (searchVal) params.append("search", searchVal);
      if (statusVal && statusVal !== "ALL") params.append("status", statusVal);

      const res = await API.get(`/notices/${noticeId}/acknowledgements?${params.toString()}`);
      setHistoryModal(prev => ({
        ...prev,
        loading: false,
        data: res.data,
      }));
    } catch (err) {
      console.error("Fetch History Error:", err);
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const openHistoryModal = (notice) => {
    setHistoryModal({
      isOpen: true,
      notice,
      loading: true,
      data: null,
      search: "",
      statusFilter: "ALL",
    });
    fetchHistory(notice.id, "", "ALL");
  };

  const handleFileView = (fileUrl) => {
    if (!fileUrl) return;
    let fileName = "";
    try {
      const u = new URL(fileUrl);
      fileName = u.pathname.split("/").pop() || "attachment";
    } catch {
      fileName = fileUrl.split("?")[0].split("/").pop() || "attachment";
    }

    const rawPath = fileUrl.split("?")[0];
    const fullUrl =
      rawPath.startsWith("http://") || rawPath.startsWith("https://")
        ? rawPath
        : `${BASE_URL}${rawPath}`;

    if (isImageFile(fileName)) {
      setLightbox(fullUrl);
      return;
    }

    setFilePreview({
      fullUrl,
      name: fileName,
      isPdf: isPdfFile(fileName),
      previewUrl: getPreviewUrl(fullUrl, fileName),
    });
  };

  // History Table Columns
  const historyColumns = [
    {
      key: "name",
      header: t("noticeHistResident", "Resident"),
      render: (u) => (
        <div>
          <p style={{ fontWeight: 650, margin: 0, color: "var(--text-primary)" }}>{u.name}</p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>{u.email || u.phone || "—"}</p>
        </div>
      ),
    },
    {
      key: "flat_number",
      header: t("noticeHistFlatUnit", "Flat Unit"),
      width: 120,
      render: (u) => (
        <span style={{ fontWeight: 650, color: "var(--text-primary)" }}>{u.flat_number || "—"}</span>
      ),
    },
    {
      key: "acknowledged_at",
      header: t("noticeHistAckAt", "Acknowledged At"),
      width: 160,
      render: (u) =>
        u.acknowledged_at ? (
          <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600 }}>{fmtDate(u.acknowledged_at)}</span>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", opacity: 0.6 }}>—</span>
        ),
    },
    {
      key: "status",
      header: t("noticeHistStatus", "Status"),
      align: "right",
      width: 180,
      render: (u) => {
        if (u.status === "ACKNOWLEDGED") {
          return (
            <span style={{ whiteSpace: "nowrap", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
              ✓ {t("noticeHistBadgeAck", "ACKNOWLEDGED")}
            </span>
          );
        } else if (u.status === "VIEWED_NOT_ACKNOWLEDGED") {
          return (
            <span style={{ whiteSpace: "nowrap", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              {t("noticeHistBadgeViewed", "VIEWED")}
            </span>
          );
        }
        return (
<span style={{ whiteSpace: "nowrap", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              {t("noticeHistBadgeNotViewed", "NOT VIEWED")}
            </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <Index
        isSuperAdmin={isSuperAdmin}
        filterSocietyId={filterSocietyId}
        societiesList={societiesList}
        notices={notices}
        displayedNotices={displayedNotices}
        initialLoad={initialLoad}
        fetching={fetching}
        totalAll={totalAll}
        totalItems={totalItems}
        totalPages={totalPages}
        page={page}
        limit={limit}
        search={search}
        fmtDate={fmtDate}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onFilterSociety={(val) => {
          setFilterSocietyId(val);
          localStorage.setItem("superadmin_society_filter", val);
        }}
        onCreate={() => {
          setCreateSession((s) => s + 1);
          setShowCreate(true);
        }}
        onEdit={(n) => setEditNotice(n)}
        onDelete={(n) => setDeleteTarget(n)}
        onViewHistory={openHistoryModal}
        onViewFile={handleFileView}
        onReadMore={(n) => setReadMoreNotice(n)}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      <Create
        key={createSession}
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        isSuperAdmin={isSuperAdmin}
        societiesList={societiesList}
        defaultSocietyId={filterSocietyId === "ALL" ? "" : filterSocietyId}
      />

      <Edit
        key={editNotice?.id}
        isOpen={!!editNotice}
        notice={editNotice}
        onClose={() => setEditNotice(null)}
        onUpdated={handleUpdated}
        isSuperAdmin={isSuperAdmin}
        societiesList={societiesList}
        filterSocietyId={filterSocietyId}
      />

      <Delete
        key={deleteTarget?.id}
        isOpen={deleteTarget !== null}
        notice={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />

      {/* ── ACKNOWLEDGEMENT HISTORY MODAL ── */}
      {historyModal.isOpen && (
        <GlobalModal
          isOpen={historyModal.isOpen}
          onClose={() => setHistoryModal({ isOpen: false, notice: null, loading: false, data: null, search: "", statusFilter: "ALL" })}
          title={t("noticeAckHistoryTitle") || "Notice Acknowledgement History"}
          subtitle={historyModal.notice?.title || t("noticeAckHistorySub", "Recipient view & read status")}
          icon={MdCheckCircle}
          size="xl"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Summary Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(160,90,255,0.08)", border: "1px solid rgba(160,90,255,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <MdPeople size={22} style={{ color: "var(--accent)" }} />
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>{t("noticeHistTotal", "Total")}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>{historyModal.data?.summary?.total ?? 0}</p>
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <MdVisibility size={22} style={{ color: "#f59e0b" }} />
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>{t("noticeViewed", "Viewed")}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#f59e0b" }}>{historyModal.data?.summary?.viewed ?? 0}</p>
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <MdDoneAll size={22} style={{ color: "#10b981" }} />
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>{t("noticeAcknowledged", "Acknowledged")}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#10b981" }}>{historyModal.data?.summary?.acknowledged ?? 0}</p>
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <MdHourglassEmpty size={22} style={{ color: "#ef4444" }} />
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>{t("noticePending", "Pending")}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#ef4444" }}>{historyModal.data?.summary?.pending ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <MdSearch size={18} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder={t("noticeSearchResident")}
                  value={historyModal.search}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHistoryModal(p => ({ ...p, search: val }));
                    fetchHistory(historyModal.notice.id, val, historyModal.statusFilter);
                  }}
                  className="input search-input"
                  style={{ width: "100%", paddingLeft: "36px", height: "38px", fontSize: "13px", borderRadius: "10px" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {[
                  { key: "ALL", label: t("noticeHistFilterAll", "All") },
                  { key: "ACKNOWLEDGED", label: t("noticeAcknowledged", "Acknowledged") },
                  { key: "VIEWED", label: t("noticeViewed", "Viewed") },
                  { key: "NOT_VIEWED", label: t("noticeNotViewed", "Not Viewed") },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setHistoryModal(p => ({ ...p, statusFilter: key }));
                      fetchHistory(historyModal.notice.id, historyModal.search, key);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: historyModal.statusFilter === key ? "var(--accent)" : "var(--glass-border)",
                      background: historyModal.statusFilter === key ? "rgba(160,90,255,0.15)" : "var(--card-inner-bg)",
                      color: historyModal.statusFilter === key ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Table */}
            <GlobalTable
              columns={historyColumns}
              data={historyModal.data?.users || []}
              loading={historyModal.loading}
              emptyMessage={t("noticeHistEmpty", "No recipient history found.")}
              compact
            />
          </div>
        </GlobalModal>
      )}

      {/* ── FILE VIEWER MODAL ── */}
      {filePreview && (
        <GlobalModal
          isOpen={true}
          onClose={() => setFilePreview(null)}
          title={filePreview.name}
          size="lg"
        >
          {filePreview.isPdf ? (
            <PdfViewer url={filePreview.fullUrl} fileName={filePreview.name} />
          ) : (
            <img src={filePreview.fullUrl} alt={filePreview.name} style={{ width: "100%", borderRadius: 12 }} />
          )}
        </GlobalModal>
      )}

      {/* ── NOTICE READ MORE DETAIL MODAL ── */}
      {readMoreNotice && (
        <GlobalModal
          isOpen={true}
          onClose={() => setReadMoreNotice(null)}
          title={readMoreNotice.title}
          subtitle={`${t("noticePublishedDate", "Published {date}", { date: fmtDate(readMoreNotice.created_at) })}${readMoreNotice.created_by_name ? t("noticeBySuffix", " • By {name}", { name: readMoreNotice.created_by_name }) : ""}`}
          icon={MdCampaign}
          size="md"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Meta Tags */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {readMoreNotice.created_by_name && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: 6,
                    background: "rgba(59, 130, 246, 0.12)",
                    color: "#60a5fa",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                  }}
                >
                  {t("noticeBy", "By: {name} ({role})", { name: readMoreNotice.created_by_name, role: readMoreNotice.created_by_role === "COMMITTEE_MEMBER" ? t("noticeRoleCommittee", "Committee") : t("noticeRoleAdmin", "Admin") })}
                </span>
              )}
              {readMoreNotice.acknowledgement_required && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 6,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                  }}
                >
                  {t("noticeAckBadge", "ACK REQUIRED")}
                </span>
              )}
            </div>

            {/* Description Body */}
            <div
              style={{
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: 12,
                padding: "16px",
                fontSize: "0.92rem",
                lineHeight: 1.65,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "50vh",
                overflowY: "auto",
              }}
            >
              {readMoreNotice.description}
            </div>

            {/* Attachment Button if available */}
            {readMoreNotice.file_url && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    handleFileView(readMoreNotice.file_url);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--accent, #a855f7)",
                    background: "rgba(168, 85, 247, 0.12)",
                    border: "1px solid rgba(168, 85, 247, 0.28)",
                    padding: "6px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <MdAttachFile size={16} />
                  <span>{t("noticeViewAttached", "View Attached Document")}</span>
                  <MdOutlineOpenInNew size={14} />
                </button>
              </div>
            )}
          </div>
        </GlobalModal>
      )}

      {/* ── IMAGE LIGHTBOX ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <img src={lightbox} alt="Preview" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}