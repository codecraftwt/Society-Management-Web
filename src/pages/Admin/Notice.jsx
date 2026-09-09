import { useState, useEffect, useCallback, useContext } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd,
  MdAttachFile,
  MdSearch,
  MdClose,
  MdCampaign,
  MdOutlineOpenInNew,
  MdSchedule,
  MdEdit,
  MdDelete,
  MdChevronLeft,
  MdChevronRight,
  MdCheckCircle,
  MdOutlineArticle,
  MdPeople,
  MdVisibility,
  MdDoneAll,
  MdHourglassEmpty,
} from "react-icons/md";

import { BASE_URL } from "../../config/apiConfig";
import Select from "../../components/common/Select";
import PdfViewer from "../../components/common/PdfViewer";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";

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

const LIMIT = 9;

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

  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    society_id: "",
    acknowledgement_required: false,
  });
  const [editingId, setEditingId] = useState(null);

  // Viewers
  const [lightbox, setLightbox] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Delete Confirm Dialog state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, societyId: null, loading: false });

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
        limit: LIMIT,
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
      setTotalPages(Math.ceil(total / LIMIT) || 1);
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

  const handleEdit = (n) => {
    setEditingId(n.id);
    setForm({
      title: n.title,
      description: n.description,
      society_id: n.society_id || "",
      acknowledgement_required: Boolean(n.acknowledgement_required),
    });
    setFile(null);
    setShowNoticeModal(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("acknowledgement_required", form.acknowledgement_required ? "true" : "false");

      const targetSocId = isSuperAdmin ? (form.society_id || (filterSocietyId === "ALL" ? "" : filterSocietyId)) : user?.society_id;
      if (targetSocId) formData.append("society_id", targetSocId);
      if (file) formData.append("file", file);

      if (editingId) {
        await API.put(`/notices/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/notices", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setForm({ title: "", description: "", society_id: "", acknowledgement_required: false });
      setFile(null);
      setShowNoticeModal(false);
      setEditingId(null);
      loadNotices(1, debSearch);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to publish notice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    try {
      setDeleteConfirm(p => ({ ...p, loading: true }));
      await API.delete(`/notices/${deleteConfirm.id}`);
      setNotices((prev) => prev.filter((n) => n.id !== deleteConfirm.id));
      setTotalItems((prev) => Math.max(0, prev - 1));
      setTotalAll((prev) => Math.max(0, prev - 1));
      setDeleteConfirm({ isOpen: false, id: null, societyId: null, loading: false });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete notice");
      setDeleteConfirm(p => ({ ...p, loading: false }));
    }
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

  const canPost = activeRole === "SUPER_ADMIN" || activeRole === "SOCIETY_ADMIN" || activeRole === "COMMITTEE_MEMBER";

  // History Table Columns
  const historyColumns = [
    {
      key: "name",
      header: "Resident",
      render: (u) => (
        <div>
          <p style={{ fontWeight: 650, margin: 0, color: "var(--text-primary)" }}>{u.name}</p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>{u.email || u.phone || "—"}</p>
        </div>
      ),
    },
    {
      key: "flat_number",
      header: "Flat Unit",
      width: 120,
      render: (u) => (
        <span style={{ fontWeight: 650, color: "var(--text-primary)" }}>{u.flat_number || "—"}</span>
      ),
    },
    {
      key: "viewed_at",
      header: "First Viewed",
      width: 160,
      render: (u) =>
        u.viewed_at ? (
          <span style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>{fmtDate(u.viewed_at)}</span>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", opacity: 0.6 }}>—</span>
        ),
    },
    {
      key: "acknowledged_at",
      header: "Acknowledged At",
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
      header: "Status",
      align: "right",
      width: 180,
      render: (u) => {
        if (u.status === "ACKNOWLEDGED") {
          return (
            <span style={{ whiteSpace: "nowrap", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
              ✓ ACKNOWLEDGED
            </span>
          );
        } else if (u.status === "VIEWED_NOT_ACKNOWLEDGED") {
          return (
            <span style={{ whiteSpace: "nowrap", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              VIEWED
            </span>
          );
        }
        return (
          <span style={{ whiteSpace: "nowrap", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            NOT VIEWED
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── HEADER & TOOLBAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title Block */}
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              flexShrink: 0,
              background: "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(37,99,235,0.1))",
              border: "1.5px solid rgba(37,99,235,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(37,99,235,0.18)",
            }}
          >
            <MdCampaign size={22} style={{ color: "var(--accent, #3b82f6)" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              {t("noticeBoard") || "Notice Board"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
              {initialLoad ? "—" : `${totalAll} notices published`}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Compact Search Bar */}
          <div style={{ position: "relative", width: "200px" }}>
            <MdSearch
              size={18}
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
            <input
              type="text"
              placeholder="Search notices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{
                width: "100%",
                paddingLeft: "36px",
                paddingRight: "12px",
                height: "40px",
                fontSize: "13px",
                borderRadius: "10px",
              }}
            />
          </div>

          {/* Super Admin Society Filter */}
          {isSuperAdmin && (
            <Select
              className="input"
              value={filterSocietyId}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSocietyId(val);
                localStorage.setItem("superadmin_society_filter", val);
              }}
              style={{ height: 40, fontSize: 13, minWidth: 190, maxWidth: 220, borderRadius: "10px" }}
            >
              <option value="ALL">All Societies (Global View)</option>
              {societiesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}

          {/* Publish Notice Button */}
          {canPost && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              onClick={() => {
                setEditingId(null);
                setForm({
                  title: "",
                  description: "",
                  society_id: filterSocietyId === "ALL" ? "" : filterSocietyId,
                  acknowledgement_required: false,
                });
                setFile(null);
                setShowNoticeModal(true);
              }}
            >
              {t("noticeAddBtn") || "Publish Notice"}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* ── NOTICE CARDS GRID ── */}
      {fetching || initialLoad ? (
        /* Loading Skeleton Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                borderRadius: 16,
                border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
                background: "var(--card-bg, #111827)",
                padding: 20,
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ height: 14, width: "70%", borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
                  <div style={{ height: 10, width: "40%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
              <div style={{ height: 12, width: "90%", borderRadius: 4, background: "rgba(255,255,255,0.04)", marginTop: 8 }} />
              <div style={{ height: 12, width: "60%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        /* Empty State */
        <div
          style={{
            borderRadius: 16,
            border: "1px dashed var(--glass-border, rgba(255, 255, 255, 0.12))",
            background: "var(--card-bg, #111827)",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(37, 99, 235, 0.1)",
              color: "var(--accent, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MdCampaign size={28} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            {t("noticeEmpty") || "No notices published yet"}
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 380 }}>
            There are no active notices matching your filter. Publish a new notice to broadcast announcements to society residents.
          </p>
          {canPost && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              style={{ marginTop: 6 }}
              onClick={() => {
                setEditingId(null);
                setForm({
                  title: "",
                  description: "",
                  society_id: filterSocietyId === "ALL" ? "" : filterSocietyId,
                  acknowledgement_required: false,
                });
                setFile(null);
                setShowNoticeModal(true);
              }}
            >
              {t("noticeAddBtn") || "Publish Notice"}
            </GlobalButton>
          )}
        </div>
      ) : (
        <>
          {/* Responsive Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {notices.map((n) => {
              const socName =
                n.Society?.name ||
                societiesList.find((s) => String(s.id) === String(n.society_id))?.name;

              return (
                <div
                  key={n.id}
                  style={{
                    borderRadius: 16,
                    border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
                    background: "var(--card-bg, #111827)",
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                    boxShadow: "0 4px 18px rgba(0, 0, 0, 0.12)",
                    transition: "all 0.2s ease-in-out",
                  }}
                  className="hover:border-blue-500/30 hover:shadow-lg"
                >
                  {/* Card Header & Content */}
                  <div>
                    {/* Top Row: Campaign Icon + Title + Meta */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: "rgba(37, 99, 235, 0.12)",
                          color: "var(--accent, #3b82f6)",
                          border: "1px solid rgba(37, 99, 235, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <MdCampaign size={22} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {n.title}
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <MdSchedule size={13} style={{ opacity: 0.7 }} />
                            <span>{fmtDate(n.created_at)}</span>
                          </div>

                          {socName && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "rgba(99, 102, 241, 0.12)",
                                color: "#818cf8",
                                border: "1px solid rgba(99, 102, 241, 0.25)",
                              }}
                            >
                              {socName}
                            </span>
                          )}

                          {n.acknowledgement_required && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "rgba(16, 185, 129, 0.12)",
                                color: "#10b981",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                              }}
                            >
                              ACK REQUIRED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notice Description */}
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.55,
                        margin: 0,
                        whiteSpace: "pre-line",
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {n.description}
                    </p>
                  </div>

                  {/* Card Footer: Attachment View & Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 12,
                      borderTop: "1px solid var(--divider, rgba(255, 255, 255, 0.06))",
                      gap: 8,
                    }}
                  >
                    {n.file_url ? (
                      <button
                        type="button"
                        onClick={() => handleFileView(n.file_url)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--accent, #3b82f6)",
                          background: "rgba(37, 99, 235, 0.1)",
                          border: "1px solid rgba(37, 99, 235, 0.25)",
                          padding: "5px 11px",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <MdOutlineOpenInNew size={14} />
                        <span>Attachment</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {canPost && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {n.acknowledgement_required && (
                          <GlobalButton
                            variant="secondary"
                            size="sm"
                            icon={MdOutlineArticle}
                            onClick={() => openHistoryModal(n)}
                          >
                            {t("noticeViewHistory") || "View History"}
                          </GlobalButton>
                        )}
                        <GlobalButton
                          variant="edit"
                          size="sm"
                          icon={MdEdit}
                          onClick={() => handleEdit(n)}
                        >
                          Edit
                        </GlobalButton>
                        <GlobalButton
                          variant="delete"
                          size="sm"
                          icon={MdDelete}
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              id: n.id,
                              societyId: n.society_id,
                              loading: false,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderRadius: 14,
                background: "var(--card-bg, #111827)",
                border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total notices)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--card-inner-bg, rgba(255, 255, 255, 0.05))",
                    border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.1))",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    opacity: page <= 1 ? 0.5 : 1,
                  }}
                >
                  <MdChevronLeft size={16} /> Prev
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--card-inner-bg, rgba(255, 255, 255, 0.05))",
                    border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.1))",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    opacity: page >= totalPages ? 0.5 : 1,
                  }}
                >
                  Next <MdChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CREATE / EDIT NOTICE MODAL ── */}
      <GlobalModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        title={editingId ? "Update Notice" : t("noticeCreateTitle") || "Create Notice"}
        subtitle="Broadcast to all residents instantly"
        icon={MdCampaign}
        size="md"
        showFooter
        submitLabel={editingId ? "Update Notice" : t("noticePublish") || "Publish Notice"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleSubmit}
        submitLoading={submitting}
        submitDisabled={submitting || !form.title.trim() || !form.description.trim() || (isSuperAdmin && !form.society_id)}
        submitIcon={editingId ? MdEdit : MdCampaign}
        submitVariant={editingId ? "edit" : "primary"}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isSuperAdmin && (
            <div>
              <label className="sa-label">Society</label>
              <Select
                className="input"
                value={form.society_id}
                required
                onChange={(e) => setForm({ ...form, society_id: e.target.value })}
              >
                <option value="">Select Society</option>
                {societiesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="sa-label">Notice Title</label>
            <input
              className="input"
              placeholder={t("noticeTitlePlaceholder") || "e.g. Water Tank Cleaning Schedule"}
              value={form.title}
              required
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="sa-label">Description / Announcement</label>
            <textarea
              className="input"
              rows={4}
              placeholder={t("noticeDescPlaceholder") || "Provide detailed information for residents..."}
              value={form.description}
              required
              style={{ resize: "none" }}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Acknowledgement Required Checkbox */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, padding: "12px", borderRadius: 10, background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.acknowledgement_required}
                onChange={(e) => setForm({ ...form, acknowledgement_required: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: "#2563EB", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {t("noticeAckRequired") || "Acknowledgement Required"}
              </span>
            </label>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, paddingLeft: 28 }}>
              {t("noticeAckHelper") || "Recipients must open the notice and explicitly mark it as read."}
            </p>
          </div>

          <div>
            <label className="sa-label">Attachment (PDF or Image, optional)</label>
            {file ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 12px",
                  borderRadius: 9,
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <MdAttachFile size={16} style={{ color: "#10b981", flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                >
                  <MdClose size={16} />
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  border: "1.5px dashed var(--glass-border)",
                  background: "var(--card-inner-bg)",
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                }}
              >
                <MdAttachFile size={16} />
                <span>Click to attach document (PDF, PNG, JPG, WEBP)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const selected = e.target.files[0];
                    if (selected) setFile(selected);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
        </form>
      </GlobalModal>

      {/* ── ACKNOWLEDGEMENT HISTORY MODAL ── */}
      {historyModal.isOpen && (
        <GlobalModal
          isOpen={historyModal.isOpen}
          onClose={() => setHistoryModal({ isOpen: false, notice: null, loading: false, data: null, search: "", statusFilter: "ALL" })}
          title={t("noticeAckHistoryTitle") || "Notice Acknowledgement History"}
          subtitle={historyModal.notice?.title || "Recipient view & read status"}
          icon={MdCheckCircle}
          size="xl"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Summary Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <MdPeople size={22} style={{ color: "#2563EB" }} />
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>Total</p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>{historyModal.data?.summary?.total ?? 0}</p>
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <MdVisibility size={22} style={{ color: "#f59e0b" }} />
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>Viewed</p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#f59e0b" }}>{historyModal.data?.summary?.viewed ?? 0}</p>
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <MdDoneAll size={22} style={{ color: "#10b981" }} />
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>Acknowledged</p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#10b981" }}>{historyModal.data?.summary?.acknowledged ?? 0}</p>
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <MdHourglassEmpty size={22} style={{ color: "#ef4444" }} />
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>Pending</p>
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
                  placeholder="Search resident..."
                  value={historyModal.search}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHistoryModal(p => ({ ...p, search: val }));
                    fetchHistory(historyModal.notice.id, val, historyModal.statusFilter);
                  }}
                  className="input"
                  style={{ width: "100%", paddingLeft: "36px", height: "38px", fontSize: "13px", borderRadius: "10px" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {[
                  { key: "ALL", label: "All" },
                  { key: "ACKNOWLEDGED", label: "Acknowledged" },
                  { key: "VIEWED", label: "Viewed" },
                  { key: "NOT_VIEWED", label: "Not Viewed" },
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
                      borderColor: historyModal.statusFilter === key ? "var(--accent, #2563EB)" : "var(--glass-border)",
                      background: historyModal.statusFilter === key ? "rgba(37,99,235,0.15)" : "var(--card-inner-bg)",
                      color: historyModal.statusFilter === key ? "var(--accent, #2563EB)" : "var(--text-secondary)",
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
              emptyMessage="No recipient history found."
              compact
            />
          </div>
        </GlobalModal>
      )}

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, societyId: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Notice"
        message="Are you sure you want to delete this notice broadcast? Residents will no longer see it on their noticeboard."
        variant="danger"
        loading={deleteConfirm.loading}
      />

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