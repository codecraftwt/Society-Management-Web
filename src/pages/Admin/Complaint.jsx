import { useEffect, useState, useRef, useContext, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { getSocket } from "../../services/socket";
import {
  MdReportProblem, MdSearch, MdClose, MdOutlineInbox,
  MdImage, MdOpenInNew, MdPerson, MdApartment, MdDoorFront, MdStairs,
  MdCheckCircle, MdSchedule, MdPending, MdCalendarToday,
  MdChat, MdSend, MdDelete,
  MdChevronLeft, MdChevronRight,
  MdPublic, MdVisibility, MdDownload, MdAttachFile,
  MdFilePresent, MdFilterAlt, MdRefresh, MdMoreHoriz,
} from "react-icons/md";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";
import styles from "./Complaint.module.css";

/* ── Pagination ── */
function Pagination({ page, totalPages, onPageChange }) {
  const { t } = useLang();
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={14} /> {t("paginationPrev") || "Prev"}
      </button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`e${i}`} className="pagination-ellipsis">…</span> : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>{p}</button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        {t("paginationNext") || "Next"} <MdChevronRight size={14} />
      </button>
    </div>
  );
}

function Spinner({ small = false }) {
  const s = small ? 14 : 16;
  return (
    <svg className="animate-spin" style={{ color: "currentColor", width: s, height: s }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
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

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const formatTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

/* ─── FLAT LABEL HELPER ──────────────────────────────────────────────────────
   The API join structure can vary. The complaint row may have:
     c.Flat               → direct association on the complaint (flat_id FK)
     c.User?.Flat         → flat joined through User (resident_id → User → Flat)
   Either way we want: "BlockName - FlatNumber (Floor X)"
   If floor is missing (row house / no Floor join) we skip it.
────────────────────────────────────────────────────────────────────────────── */
const resolveFlatObj = (c) => c.Flat || c.User?.Flat || null;

const flatLabel = (c, t) => {
  const flat = resolveFlatObj(c);
  if (!flat) return "NA";

  const block      = flat.Block?.name      || flat.block_name      || "";
  const flatNum    = flat.flat_number      || "";
  const floorNum   = flat.floor_number     ?? flat.Floor?.floor_number ?? null;

  const parts = [];
  if (block)   parts.push(block);
  if (flatNum) {
    const labelFlat = t ? t("flatLabel") : "Flat";
    parts.push(`${labelFlat} ${flatNum}`);
  }

  let label = parts.join(" - ") || "NA";
  if (floorNum !== null && floorNum !== undefined) {
    const labelFloor = t ? t("floorLabel") : "Floor";
    label += ` (${labelFloor} ${floorNum})`;
  }
  return label;
};

/* Short chip label used in the table cell */
const flatChipLabel = (c) => {
  const flat = resolveFlatObj(c);
  if (!flat) return "NA";
  const block   = flat.Block?.name || flat.block_name || "";
  const flatNum = flat.flat_number || "";
  return [block, flatNum].filter(Boolean).join(" - ") || "NA";
};

function StatusPill({ status, t }) {
  const cfg = {
    RESOLVED:    { key: "compStatusResolved",   Icon: MdCheckCircle, cls: "status-pill--resolved"   },
    IN_PROGRESS: { key: "compStatusInProgress", Icon: MdSchedule,    cls: "status-pill--inprogress" },
    PENDING:     { key: "compStatusPending",    Icon: MdPending,     cls: "status-pill--pending"     },
    OPEN:        { key: "compStatusPending",    Icon: MdPending,     cls: "status-pill--pending"     },
  };
  const c = cfg[status] || cfg.PENDING;
  return (
    <span className={`status-pill ${c.cls}`}>
      <c.Icon size={12} /> {t(c.key)}
    </span>
  );
}

const getDot = (s) => ({
  RESOLVED: "#22c55e", IN_PROGRESS: "#9F87D7", PENDING: "#3B82F6", OPEN: "#3B82F6",
}[s] || "#3B82F6");

/* Drawer actions — uses existing updateStatus handler */
function ActionButtons({ c, updateStatus, updatingId, t }) {
  const isPending    = c.status === "OPEN" || c.status === "PENDING";
  const isInProgress = c.status === "IN_PROGRESS";
  const isResolved   = c.status === "RESOLVED";
  const busy = updatingId === c.id;
  if (isResolved) return (
    <div className={styles.doneChip}><MdCheckCircle size={15} /> {t("adminCompCompleted") || "Completed"}</div>
  );
  return (
    <div className={styles.actionsBar}>
      {isPending && (
        <button className={`${styles.drawerActionBtn} ${styles.progressAction}`}
          onClick={() => updateStatus(c.id, "IN_PROGRESS")} disabled={busy}>
          {busy ? <Spinner small /> : <><MdSchedule size={15} /> {t("adminCompMarkInProgress")}</>}
        </button>
      )}
      {isInProgress && (
        <button className={`${styles.drawerActionBtn} ${styles.resolveAction}`}
          onClick={() => updateStatus(c.id, "RESOLVED")} disabled={busy}>
          {busy ? <Spinner small /> : <><MdCheckCircle size={15} /> {t("adminCompMarkResolved")}</>}
        </button>
      )}
    </div>
  );
}

/* ── ChatPanel ─────────────────────────────────────────────────────────────────
   Kept exactly as-is — all comment logic / socket events are unchanged. */
function ChatPanel({ complaintId, societyId, currentUser, onIncomingMessage }) {
  const isSuperAdmin = currentUser?.activeRole === "SUPER_ADMIN";
  const headers = (isSuperAdmin && societyId) ? { "x-society-id": societyId } : {};

  const { t } = useLang();
  const [comments,     setComments]     = useState([]);
  const [message,      setMessage]      = useState("");
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [deletingId,   setDeletingId]   = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing,     setClearing]     = useState(false);
  const [attachment,   setAttachment]   = useState(null);
  const [attachPrev,   setAttachPrev]   = useState(null);
  const [lightbox,     setLightbox]     = useState(null);
  const [filePreview,  setFilePreview]  = useState(null);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const fileInputRef = useRef(null);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/complaints/${complaintId}/comments`, { headers });
      setComments(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [complaintId]);

  useEffect(() => {
    loadComments();
    const socket = getSocket();
    if (!socket) return;

    const onNew = (comment) => {
      if (String(comment.complaint_id) !== String(complaintId)) return;
      setComments(prev => {
        if (prev.find(c => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
      if (comment.user_id !== currentUser?.id && onIncomingMessage) {
        onIncomingMessage(complaintId);
      }
    };
    const onDeleted = ({ comment_id }) =>
      setComments(prev => prev.filter(c => String(c.id) !== String(comment_id)));
    const onCleared = ({ complaint_id }) => {
      if (String(complaint_id) === String(complaintId)) setComments([]);
    };

    socket.on("new_complaint_comment",      onNew);
    socket.on("complaint_comment_deleted",  onDeleted);
    socket.on("complaint_comments_cleared", onCleared);
    return () => {
      socket.off("new_complaint_comment",      onNew);
      socket.off("complaint_comment_deleted",  onDeleted);
      socket.off("complaint_comments_cleared", onCleared);
    };
  }, [complaintId, currentUser?.id, onIncomingMessage, loadComments]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { alert("Max file size is 10 MB"); return; }
    setAttachment(f);
    setAttachPrev(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    e.target.value = "";
  };

  const clearAttachment = () => {
    if (attachPrev) URL.revokeObjectURL(attachPrev);
    setAttachment(null);
    setAttachPrev(null);
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed && !attachment) return;
    if (sending) return;
    const optimisticId = `opt_${Date.now()}`;
    const optimistic = {
      id:              optimisticId,
      complaint_id:    complaintId,
      user_id:         currentUser.id,
      message:         trimmed || null,
      attachment_url:  attachPrev,
      attachment_type: attachment ? (attachment.type.startsWith("image/") ? "image" : "file") : null,
      attachment_name: attachment?.name || null,
      created_at:      new Date().toISOString(),
      User: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
    };
    setComments(prev => [...prev, optimistic]);
    setMessage("");
    clearAttachment();
    inputRef.current?.focus();
    try {
      setSending(true);
      const form = new FormData();
      if (trimmed)    form.append("message",    trimmed);
      if (attachment) form.append("attachment", attachment);
      await API.post(`/complaints/${complaintId}/comments`, form, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      setComments(prev => prev.filter(c => c.id !== optimisticId));
    } catch (e) {
      console.error(e);
      setComments(prev => prev.filter(c => c.id !== optimisticId));
      setMessage(trimmed);
    } finally { setSending(false); }
  };

  const handleDelete = async (commentId) => {
    try {
      setDeletingId(commentId);
      await API.delete(`/complaints/${complaintId}/comments/${commentId}`, { headers });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  const handleClear = async () => {
    try {
      setClearing(true);
      await API.delete(`/complaints/${complaintId}/comments`, { headers });
      setComments([]);
      setConfirmClear(false);
    } catch (e) { console.error(e); }
    finally { setClearing(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isMe            = (c) => c.user_id === currentUser?.id;
  const isMsgPrivileged = (c) => ["SOCIETY_ADMIN", "COMMITTEE_MEMBER", "SUPER_ADMIN"].includes(c.User?.role);
  const getSenderBadge  = (c) => {
    if (c.User?.role === "SUPER_ADMIN")      return t("roleSuperAdmin") || "Super Admin";
    if (c.User?.role === "SOCIETY_ADMIN")    return t("chatAdminBadge");
    if (c.User?.role === "COMMITTEE_MEMBER") return t("chatCommitteeBadge");
    return null;
  };
  const canDelete = (c) => isMe(c);

  const isPublicHost = () => {
    const h = window.location.hostname;
    return h !== "localhost" && !h.startsWith("127.") && !h.startsWith("192.168.") && !h.startsWith("10.");
  };

  const getPreviewUrl = (attachmentUrl, attachmentName) => {
    const ext = (attachmentName || "").split(".").pop().toLowerCase();
    if (ext === "pdf") return attachmentUrl;
    if (["doc", "docx", "ppt", "pptx", "csv"].includes(ext)) {
      if (!isPublicHost()) return null;
      return `https://docs.google.com/viewer?url=${encodeURIComponent(attachmentUrl)}&embedded=true`;
    }
    if (["xls", "xlsx"].includes(ext)) {
      if (!isPublicHost()) return null;
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(attachmentUrl)}`;
    }
    return null;
  };

  const renderAttachment = (comment) => {
    const { attachment_url, attachment_type, attachment_name } = comment;
    if (!attachment_url) return null;

    if (attachment_type === "image") {
      return (
        <div style={{ marginTop: 6, borderRadius: 10, overflow: "hidden", cursor: "pointer",
          border: "1.5px solid rgba(255,255,255,0.15)", maxWidth: 220 }}
          onClick={() => setLightbox(attachment_url)}>
          <img src={attachment_url} alt="attachment"
            style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 160 }} />
        </div>
      );
    }

    const previewUrl = getPreviewUrl(attachment_url, attachment_name);

    return (
      <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
        maxWidth: 220, overflow: "hidden" }}>
        <MdFilePresent size={17} style={{ flexShrink: 0, opacity: 0.85 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          flex: 1, color: "inherit", fontSize: 11 }}>
          {attachment_name || "Attachment"}
        </span>
        <button
          onClick={() => setFilePreview({ url: attachment_url, name: attachment_name, previewUrl })}
          title={t("docView")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit",
            display: "flex", alignItems: "center", flexShrink: 0, padding: 0, opacity: 0.9 }}>
          <MdVisibility size={14} />
        </button>
        <a href={attachment_url} download={attachment_name || "attachment"} title={t("docDownload")}
          style={{ color: "inherit", opacity: 0.85, display: "flex",
            alignItems: "center", flexShrink: 0, textDecoration: "none" }}>
          <MdDownload size={14} />
        </a>
      </div>
    );
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <MdChat size={15} className="chat-panel__header-icon" />
        <span className="chat-panel__header-title">{t("chatDiscussion")}</span>
        <span className="chat-panel__count">
          {comments.filter(c => !String(c.id).startsWith("opt_")).length}
        </span>
        {comments.length > 0 && (
          <div style={{ marginLeft: "auto" }}>
            {confirmClear ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }} className="animate-fadeIn">
                <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{t("chatClearConfirm")}</span>
                <button onClick={handleClear} disabled={clearing} style={{
                  padding: "3px 9px", borderRadius: 7, fontSize: 10, fontWeight: 700,
                  background: "#dc2626", color: "#fff", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4 }}>
                  {clearing ? <Spinner small /> : t("chatClearYes")}
                </button>
                <button onClick={() => setConfirmClear(false)} style={{
                  padding: "3px 7px", borderRadius: 7, fontSize: 10, fontWeight: 600,
                  background: "var(--card-inner-bg)", color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("chatClearNo")}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="chat-clear-btn">
                <MdDelete size={12} /> {t("chatClear")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="chat-panel__messages">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
            <Spinner small />
          </div>
        ) : comments.length === 0 ? (
          <div className="chat-panel__empty">{t("chatEmpty")}</div>
        ) : (
          comments.map(comment => {
            const mine  = isMe(comment);
            const priv  = isMsgPrivileged(comment);
            const badge = getSenderBadge(comment);
            const isOpt = String(comment.id).startsWith("opt_");
            const busy  = deletingId === comment.id;
            return (
              <div key={comment.id}
                className={mine ? "chat-panel__bubble-wrap--mine" : "chat-panel__bubble-wrap--theirs"}>
                {!mine && (
                  <span className={`chat-panel__sender ${priv ? "chat-panel__sender--admin" : ""}`}>
                    {comment.User?.name || "User"}
                    {badge && <span className="chat-panel__admin-badge">{badge}</span>}
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 5,
                  flexDirection: mine ? "row-reverse" : "row" }}>
                  <div className={`chat-panel__bubble ${mine ? "chat-panel__bubble--mine" : "chat-panel__bubble--theirs"} ${isOpt ? "chat-panel__bubble--optimistic" : ""}`}
                    style={{ maxWidth: 260 }}>
                    {comment.message && <span>{comment.message}</span>}
                    {renderAttachment(comment)}
                  </div>
                  {!isOpt && canDelete(comment) && (
                    <button onClick={() => handleDelete(comment.id)} disabled={busy}
                      title={t("billDelete")} className="chat-msg-delete-btn">
                      {busy ? <Spinner small /> : <MdDelete size={11} />}
                    </button>
                  )}
                </div>
                <span className="chat-panel__timestamp">{formatTime(comment.created_at)}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {attachment && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
          borderTop: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", fontSize: 12 }}
          className="animate-fadeIn">
          {attachPrev ? (
            <img src={attachPrev} alt="preview"
              style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: "1px solid var(--glass-border)" }} />
          ) : (
            <MdFilePresent size={22} style={{ color: "var(--text-secondary)" }} />
          )}
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: "var(--text-primary)", fontSize: 11 }}>
            {attachment.name}
          </span>
          <button onClick={clearAttachment} style={{ background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
            <MdClose size={14} />
          </button>
        </div>
      )}

      <div className="chat-panel__input-row">
        <input ref={fileInputRef} type="file" style={{ display: "none" }}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          onChange={pickFile} />
        <button onClick={() => fileInputRef.current?.click()} title={t("compPhotoLabel")}
          style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: attachment ? "var(--accent)" : "var(--card-inner-bg)",
            border: "1px solid var(--glass-border)",
            color: attachment ? "#fff" : "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s" }}>
          <MdAttachFile size={17} />
        </button>
        <textarea ref={inputRef} rows={1} className="chat-panel__textarea"
          placeholder={attachment ? t("compPhotoAttached") : t("chatEmpty")}
          value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} />
        <button onClick={handleSend}
          disabled={(!message.trim() && !attachment) || sending}
          className={`chat-panel__send-btn ${(message.trim() || attachment) ? "chat-panel__send-btn--active" : "chat-panel__send-btn--inactive"}`}
          style={{ opacity: sending ? 0.6 : 1 }}>
          {sending ? <Spinner small /> : <MdSend size={16} />}
        </button>
      </div>

      {lightbox && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setLightbox(null)}>
          <div style={{ width: "100%", maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={() => setLightbox(null)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                  border: "none", cursor: "pointer", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdClose size={17} />
              </button>
            </div>
            <img src={lightbox} alt="attachment"
              style={{ width: "100%", borderRadius: 12, objectFit: "contain", maxHeight: "75vh", display: "block" }} />
            <p style={{ textAlign: "center", fontSize: 11, marginTop: 10, color: "rgba(255,255,255,0.3)" }}>
              {t("adminCompTapClose")}
            </p>
          </div>
        </div>,
        document.body
      )}

      {filePreview && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setFilePreview(null)}>
          <div style={{ width: "100%", maxWidth: 860, height: "82vh",
            display: "flex", flexDirection: "column", gap: 10 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "white", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                <MdFilePresent size={15} /> {filePreview.name}
              </span>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <a href={filePreview.url} download={filePreview.name}
                  style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    color: "white", background: "rgba(255,255,255,0.12)", textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 5 }}>
                  <MdDownload size={13} /> {t("docDownload")}
                </a>
                <button onClick={() => setFilePreview(null)}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                    border: "none", cursor: "pointer", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MdClose size={17} />
                </button>
              </div>
            </div>
            {filePreview.previewUrl ? (
              <iframe key={filePreview.previewUrl} src={filePreview.previewUrl} title={filePreview.name}
                style={{ flex: 1, border: "none", borderRadius: 12, background: "white", width: "100%" }} />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 14, background: "rgba(255,255,255,0.04)",
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                <MdFilePresent size={52} style={{ color: "rgba(255,255,255,0.35)" }} />
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>
                  Preview unavailable — download to open
                </p>
                <a href={filePreview.url} download={filePreview.name}
                  style={{ padding: "8px 20px", borderRadius: 999, background: "var(--accent)",
                    color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none",
                    display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <MdDownload size={14} /> {t("docDownload")}
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── FlatInfoBlock — reusable Block/Floor/Flat display in the drawer ────────── */
function FlatInfoBlock({ c, t }) {
  const flat = resolveFlatObj(c);
  if (!flat) {
    return <span style={{ fontSize: 13, color: "var(--text-secondary)", opacity: 0.6 }}>NA</span>;
  }

  const block    = flat.Block?.name   || flat.block_name   || null;
  const flatNum  = flat.flat_number   || null;
  const floorNum = flat.floor_number  ?? flat.Floor?.floor_number ?? null;

  const cells = [];
  if (block) {
    const label = t("blockLabel") || "Block";
    cells.push({ key: "block", label, value: `${label} ${block}` });
  }
  if (flatNum) {
    const label = t("flatLabel") || "Flat";
    cells.push({ key: "flat", label, value: `${label} ${flatNum}` });
  }
  if (floorNum !== null && floorNum !== undefined) {
    const label = t("floorLabel") || "Floor";
    cells.push({ key: "floor", label, value: `${label} ${floorNum}` });
  }

  if (cells.length === 0) {
    return <span style={{ fontSize: 13, color: "var(--text-secondary)", opacity: 0.6 }}>NA</span>;
  }

  return (
    <div className={styles.valueGrid}>
      {cells.map(({ key, label, value }) => (
        <div key={key} className={styles.metaCell}>
          <div className={styles.metaLabel}>{label}</div>
          <div className={styles.metaValue}>{value}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Row actions ───────────────────────────────────────────────────────────────
   A single ⋮ (kebab) button in the final ACTIONS column. The dropdown is
   portal-rendered to <body> at fixed coordinates so it is never clipped by
   the table's scroll container. All actions call the existing handlers. */
function ComplaintRowMenu({ c, updatingId, unread, commentCount, onView, onMessages, updateStatus, t }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState(null);
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  const isPending    = c.status === "OPEN" || c.status === "PENDING";
  const isResolved   = c.status === "RESOLVED";
  const busy = updatingId === c.id;

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setOpen(true);
  };

  const closeMenu = () => { setOpen(false); setPos(null); };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    const onKey = (e) => { if (e.key === "Escape") closeMenu(); };
    const onScroll = () => closeMenu();
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
  }, [open]);

  const run = (fn) => { closeMenu(); fn(); };

  return (
    <div className={styles.menuWrap} onClick={e => e.stopPropagation()}>
      <button ref={btnRef} className={`${styles.menuBtn} ${open ? styles.menuBtnOpen : ""}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        title={t("compActions")} aria-haspopup="menu" aria-expanded={open}>
        <MdMoreHoriz size={19} />
        {(unread || 0) > 0 && <span className={styles.menuDot} />}
      </button>

      {open && createPortal(
        <div ref={menuRef} className={styles.menuDropdown} style={{ top: pos.top, right: pos.right }} role="menu">
          <button className={styles.menuItem} role="menuitem" onClick={() => run(onView)}>
            <span className={styles.menuItemIcon}><MdVisibility size={15} /></span>
            {t("compViewDetails")}
          </button>
          <button
            className={`${styles.menuItem} ${(unread || 0) > 0 ? styles.menuItemUnread : ""}`}
            role="menuitem" onClick={() => run(onMessages)}>
            <span className={styles.menuItemIcon}><MdChat size={15} /></span>
            {t("compViewMessages")}
            {commentCount != null && (
              <span className={styles.menuItemCount}>{commentCount}</span>
            )}
          </button>
          {!isResolved && <div className={styles.menuSep} />}
          {isResolved ? (
            <div className={styles.menuItem} role="menuitem" aria-disabled="true" style={{ cursor: "default" }}>
              <span className={styles.menuItemIcon} style={{ color: "#4ade80" }}><MdCheckCircle size={15} /></span>
              {t("adminCompCompleted")}
            </div>
          ) : (
            <button
              className={`${styles.menuItem} ${isPending ? styles.menuItemProgress : styles.menuItemResolve}`}
              role="menuitem" disabled={busy} onClick={() => run(() => updateStatus(c.id, isPending ? "IN_PROGRESS" : "RESOLVED"))}>
              <span className={styles.menuItemIcon}>{isPending ? <MdSchedule size={15} /> : <MdCheckCircle size={15} />}</span>
              {busy ? <Spinner small /> : isPending
                ? t("adminCompMarkInProgress")
                : t("adminCompMarkResolved")}
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Mobile card ─────────────────────────────────────────────────────────────── */
function MobileComplaintCard({ c, updateStatus, updatingId, t, onOpen, onPhotoClick, unreadMap, commentCount }) {
  return (
    <div onClick={() => onOpen(c, "details")} className={styles.mcard}>
      <div className={styles.mcardBody}>
        <div className={styles.mcardTop}>
          <div className={styles.mcardTitleBlock}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: getDot(c.status), flexShrink: 0 }} />
            <p className={styles.mcardTitle}>{c.title}</p>
          </div>
          <StatusPill status={c.status} t={t} />
        </div>
        {c.description && <p className={styles.mcardDesc}>{c.description}</p>}

        {c.photo_url && (
          <div className={styles.mcardImgWrap} onClick={e => { e.stopPropagation(); onPhotoClick(c.photo_url, c.title); }}>
            <img src={c.photo_url} alt="complaint" className={styles.mcardThumb} />
          </div>
        )}

        <div className={styles.mcardMeta}>
          <span className={styles.mcardMetaItem}><MdPerson size={13} style={{ color: "var(--accent)" }} /> <span className={styles.mcardMetaVal}>{c.User?.name || "NA"}</span></span>
          <span className={styles.mcardMetaItem}><MdApartment size={13} style={{ color: "var(--accent)" }} /> <span className={styles.mcardMetaVal}>{flatLabel(c, t)}</span></span>
          {c.Society && (
            <span className={styles.mcardMetaItem}><MdPublic size={12} style={{ color: "var(--accent)" }} /> <span className={styles.mcardMetaVal}>{c.Society.name}</span></span>
          )}
          <span className={styles.mcardMetaItem}><MdCalendarToday size={12} /> {formatDate(c.created_at)}</span>
        </div>

        <div className={styles.mcardFooter} onClick={e => e.stopPropagation()}>
          <ComplaintRowMenu
            c={c}
            updatingId={updatingId}
            unread={unreadMap[c.id] || 0}
            commentCount={commentCount}
            onView={() => onOpen(c, "details")}
            onMessages={() => onOpen(c, "chat")}
            updateStatus={updateStatus}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Skeletons ───────────────────────────────────────────────────────────────── */
function SkeletonStats() {
  return (
    <div className={styles.stats}>
      {[0, 1, 2, 3].map(i => <div key={i} className={`${styles.skel} ${styles.skelStat}`} />)}
    </div>
  );
}
function SkeletonToolbar() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--glass-border)" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div className={`${styles.skel} ${styles.skelToolbar}`} style={{ flexBasis: "300px", flexShrink: 1, flexGrow: 1 }} />
        <div className={`${styles.skel} ${styles.skelToolbar}`} style={{ flexBasis: "110px", flexGrow: 0 }} />
      </div>
      <div className={`${styles.skel} ${styles.skelTabs}`} />
    </div>
  );
}
function SkeletonRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className={styles.skelRow}>
          <div style={{ padding: "0 14px", height: "100%", display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: 40, height: 38 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
              <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: "55%" }} />
              <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: "32%" }} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: 120, height: 32 }} />
              <div className={`${styles.skel} ${styles.skelCell}`} style={{ width: 90, height: 32 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────────── */
export default function Complaint() {
  const isMobile           = useIsMobile();
  const { t }              = useLang();
  const { user: authUser } = useContext(AuthContext);

  const [complaints,    setComplaints]    = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [loadError,     setLoadError]     = useState(false);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
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

  /* Lazy comment counts — real data from the existing comments endpoint,
     cached per complaint so we never refetch across page turns. */
  const [commentCounts, setCommentCounts] = useState({});
  const commentCountsRef = useRef({});

  /* ── Pagination State ── */
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 10;
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
        limit: LIMIT,
        search: q,
        filter: f,
        block_id: filterBlockId,
        floor_id: filterFloorId,
        flat_id:  filterFlatId,
      };
      const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};

      const response = await API.get("/complaints", { params, headers });
      const complaintsArray = Array.isArray(response.data?.data)
        ? response.data.data
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
  }, [filterBlockId, filterFloorId, filterFlatId, filterSocietyId, isSuperAdmin, debSearch, filterStatus, LIMIT]);

  // Load complaints when any filter or page dependency changes
  useEffect(() => {
    loadComplaints(1, debSearch, filterStatus);
  }, [filterSocietyId, filterBlockId, filterFloorId, filterFlatId, debSearch, filterStatus]);

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
    try {
      setUpdatingId(id);
      // Determine society context for the complaint
      const complaint = complaints.find(c => c.id === id);
      const headers = (isSuperAdmin && complaint?.society_id) ? { "x-society-id": complaint.society_id } : {};

      await API.put(`/complaints/${id}`, { status }, { headers });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to update status");
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

  const exportCSV = () => {
    const escapeCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      t("compColTitle"), t("compColDesc"), t("reportResident"), t("reportFlat"),
      t("reportSociety"), t("billStatusCol"), t("compSubmittedAt"),
    ];
    const body = complaints.map(c => [
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
  };

  const TABS = [
    { key: "ALL",         label: t("compTabAll"),        shortLabel: t("compTabAll"),        count: counts.ALL },
    { key: "PENDING",     label: t("compStatusPending"), shortLabel: t("compStatusPending"), count: counts.PENDING },
    { key: "IN_PROGRESS", label: t("compTabInProgress"), shortLabel: t("adminCompActive"),   count: counts.IN_PROGRESS },
    { key: "RESOLVED",    label: t("compStatusResolved"), shortLabel: t("adminCompDone"),    count: counts.RESOLVED },
  ];

  const STATS = [
    { key: "total",      label: t("compStatTotal"),      note: t("compStatSubTotal"),    val: counts.ALL,         color: "#2563EB" },
    { key: "pending",    label: t("compStatusPending"),  note: t("compStatSubPending"),  val: counts.PENDING,     color: "#3B82F6" },
    { key: "inprogress", label: t("compTabInProgress"),  note: t("compStatSubProgress"), val: counts.IN_PROGRESS, color: "#9F87D7" },
    { key: "resolved",   label: t("compStatusResolved"), note: t("compStatSubResolved"), val: counts.RESOLVED,    color: "#22c55e" },
  ];

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
      {/* ── 1. PAGE HEADER ─────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.headerTitle}>{t("adminCompTitle")}</h2>
          <p className={styles.headerSub}>{t("compSubtitle")}</p>
          <div className={styles.headerMeta}>
            <span className={styles.headerMetaDot} />
            <strong>{totalItems}</strong> {t("adminCompTotal")}
          </div>
        </div>
        <div className={styles.headerRight}>
          {isSuperAdmin && (
            <Select className={styles.headerSelect} value={filterSocietyId}
              onChange={(e) => setFilterSocietyId(e.target.value)}>
              <option value="">{t("allSocieties")}</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
          <button className={styles.exportBtn} onClick={exportCSV} disabled={complaints.length === 0}
            title={t("compExport")}>
            <MdDownload size={15} /> {t("compExport")}
          </button>
        </div>
      </div>


      {/* ── 3–6. MAIN SURFACE ──────────────────────────────────────── */}
      <div className={styles.surface}>
        <div className={styles.toolbar}>
          {/* Search + Filters toggle */}
          <div className={styles.toolbarMain}>
            <div className={styles.search}>
              <span className={styles.searchIcon}><MdSearch size={15} /></span>
              <input className={styles.searchField}
                placeholder={t("compSearchPh")} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button className={styles.searchClear} onClick={() => setSearchQuery("")} title={t("compClearDate")}>
                  <MdClose size={13} />
                </button>
              )}
            </div>
            <button
              className={`${styles.filtersBtn} ${filtersOpen ? styles.filtersBtnActive : ""}`}
              onClick={() => setFiltersOpen(o => !o)}>
              <MdFilterAlt size={15} /> {t("compFilters")}
            </button>
          </div>

          {/* Filter popover */}
          {filtersOpen && (
            <div className={styles.filtersPanel}>
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
            <div className={styles.chipsRow}>
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

          {/* ── 4. STATUS TABS ─────────────────────────────────────── */}
          {loading ? (
            <div className={`${styles.skel} ${styles.skelTabs}`} />
          ) : (
            <div className={styles.tabs} role="tablist">
              {TABS.map(({ key, label, shortLabel, count }) => {
                const on = filterStatus === key;
                return (
                  <button key={key} role="tab" aria-selected={on}
                    onClick={() => setFilterStatus(key)}
                    className={`${styles.tab} ${on ? styles.tabActive : ""}`}>
                    {isMobile ? shortLabel : label}
                    <span className={styles.tabCount}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
        ) : isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14 }}>
            {filtered.map((c, i) => (
              <div key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 40}ms` }}>
                <MobileComplaintCard c={c} updateStatus={updateStatus} updatingId={updatingId} t={t}
                  onOpen={openDrawer} unreadMap={unreadMap} commentCount={commentCounts[c.id]}
                  onPhotoClick={(url, title) => { setLightboxPhoto(url); setLightboxTitle(title); }} />
              </div>
            ))}
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>
        ) : (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 300 }}>{t("compColTitle")}</th>
                    <th>{t("reportResident")}</th>
                    <th>{t("reportFlat")}</th>
                    <th>{t("billStatusCol")}</th>
                    <th>{t("compSubmittedAt")}</th>
                    <th className={styles.thActions}>{t("compActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} onClick={() => openDrawer(c, "details")} style={{ cursor: "pointer" }}>
                      {/* Complaint */}
                      <td>
                        <div className={styles.compCell}>
                          {c.photo_url ? (
                            <div className={styles.compThumb}
                              onClick={e => { e.stopPropagation(); setLightboxPhoto(c.photo_url); setLightboxTitle(c.title); }}
                              title={c.title}>
                              <img className={styles.compThumbImg} src={c.photo_url} alt="complaint" />
                            </div>
                          ) : (
                            <div className={styles.compThumb}>
                              <MdImage size={16} />
                            </div>
                          )}
                          <div className={styles.compInfo}>
                            <div className={styles.compTitle} title={c.title}>
                              <span className={styles.compDot} style={{ background: getDot(c.status) }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>
                            </div>
                            {c.description && (
                              <div className={styles.compDesc} title={c.description}>{c.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Resident */}
                      <td>
                        <div className={styles.residentCell}>
                          <div className={styles.avatar}><MdPerson size={15} /></div>
                          <div style={{ minWidth: 0 }}>
                            <div className={styles.residentName} title={c.User?.name || "NA"}>{c.User?.name || "NA"}</div>
                            <div className={styles.residentMeta} title={flatChipLabel(c)}>{flatChipLabel(c)}</div>
                          </div>
                        </div>
                      </td>
                      {/* Location */}
                      <td style={{ minWidth: 130 }}>
                        <div className={styles.locationMain} title={flatLabel(c, t)}>{flatChipLabel(c)}</div>
                        {c.Society && (
                          <div className={styles.locationSub} title={c.Society.name}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <MdPublic size={10} /> {c.Society.name}
                            </span>
                          </div>
                        )}
                      </td>
                      {/* Status */}
                      <td><StatusPill status={c.status} t={t} /></td>
                      {/* Submitted */}
                      <td>
                        <div className={styles.dateMain}>{formatDate(c.created_at)}</div>
                        {(() => { const tm = formatTime(c.created_at); return tm ? (
                          <div className={styles.dateSub}>{tm}</div>
                        ) : null; })()}
                      </td>
                      {/* Actions — final column */}
                      <td className={styles.tdActions}>
                        <ComplaintRowMenu c={c} updatingId={updatingId} unread={unreadMap[c.id] || 0}
                          commentCount={commentCounts[c.id]} updateStatus={updateStatus} t={t}
                          onView={() => openDrawer(c, "details")}
                          onMessages={() => openDrawer(c, "chat")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.footer}>
              <span className={styles.footerMeta}>
                {t("reportShowing")} <strong>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong>
                {t("reportOf")} {totalItems} {t("rcrComplaintsCount")}
                {hasDateFilter && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--stat-purple-color)", fontWeight: 600, marginLeft: 8 }}>
                    <MdCalendarToday size={12} /> {t("compFilteredByDate")}
                  </span>
                )}
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
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
                <>
                  {/* Status + identity */}
                  <div className={styles.statusRow}>
                    <div className={styles.statusMeta}>
                      <span className={styles.statusMetaLabel}>{t("billStatusCol")}</span>
                      <p className={styles.dTitle} style={{ fontSize: 13.5 }}>{selected.title}</p>
                    </div>
                    <StatusPill status={selected.status} t={t} />
                  </div>

                  {selected.description && (
                    <>
                      <span className={styles.sectionTitle}>{t("compColDesc")}</span>
                      <p className={styles.dDesc}>{selected.description}</p>
                    </>
                  )}

                  {/* Resident */}
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t("adminCompResidentInfo")}</span>
                    <div className={styles.valueRow}>
                      <span className={styles.valueRowIcon}><MdPerson size={17} /></span>
                      <div className={styles.valueText}>
                        <div className={styles.valueTitle}>{selected.User?.name || "NA"}</div>
                        <div className={styles.valueSub}>{selected.User?.email || ""}</div>
                      </div>
                    </div>
                  </div>

                  {/* Society / Location */}
                  {selected.Society && (
                    <div className={styles.section}>
                      <span className={styles.sectionTitle}>{t("reportSociety") || "Society"}</span>
                      <div className={styles.valueRow}>
                        <span className={styles.valueRowIcon}><MdApartment size={17} /></span>
                        <div className={styles.valueText}>
                          <div className={styles.valueTitle}>{selected.Society.name}</div>
                          <div className={styles.valueSub}>{flatLabel(selected, t)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flat / Block / Floor */}
                  {!selected.Society && (
                    <div className={styles.section}>
                      <span className={styles.sectionTitle}>{t("reportFlat")}</span>
                      <FlatInfoBlock c={selected} t={t} />
                    </div>
                  )}

                  {/* Submitted */}
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t("compSubmittedAt")}</span>
                    <div className={styles.valueRow}>
                      <span className={styles.valueRowIcon}><MdCalendarToday size={16} /></span>
                      <div className={styles.valueText}>
                        <div className={styles.valueTitle}>{formatDate(selected.created_at)}</div>
                        {formatTime(selected.created_at) && (
                          <div className={styles.valueSub}>{formatTime(selected.created_at)}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attachment */}
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t("adminCompAttachedPhoto")}</span>
                    {selected.photo_url ? (
                      <img className={styles.attachedImg} src={selected.photo_url} alt="complaint"
                        onClick={() => { setLightboxPhoto(selected.photo_url); setLightboxTitle(selected.title); }} />
                    ) : (
                      <div className={styles.noAttachment}>
                        <MdOpenInNew size={18} style={{ opacity: 0.45 }} />
                        <span>{t("compNoAttachment")}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t("compActions")}</span>
                    <ActionButtons c={selected} updateStatus={updateStatus} updatingId={updatingId} t={t} />
                  </div>
                </>
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