
import { useEffect, useState, useRef, useContext, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { getSocket } from "../../services/socket";
import {
  MdReportProblem, MdSearch, MdClose, MdOutlineInbox,
  MdImage, MdOpenInNew, MdPerson, MdApartment,
  MdCheckCircle, MdSchedule, MdPending, MdCalendarToday,
  MdChat, MdSend, MdDelete,
  MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import Select from "../../components/common/Select";

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
  RESOLVED: "#22c55e", IN_PROGRESS: "#a78bfa", PENDING: "#f59e0b", OPEN: "#f59e0b",
}[s] || "#f59e0b");

function ActionButtons({ c, updateStatus, updatingId, t }) {
  const isPending    = c.status === "OPEN" || c.status === "PENDING";
  const isInProgress = c.status === "IN_PROGRESS";
  const isResolved   = c.status === "RESOLVED";
  const busy = updatingId === c.id;
  if (isResolved) return (
    <span className="action-btn-resolved"><MdCheckCircle size={14} /> {t("adminCompCompleted")}</span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {isPending && (
        <button className="action-btn-inprogress" onClick={() => updateStatus(c.id, "IN_PROGRESS")} disabled={busy}>
          {busy ? <Spinner /> : <><MdSchedule size={14} /> {t("adminCompMarkInProgress")}</>}
        </button>
      )}
      {isInProgress && (
        <button className="action-btn-resolve" onClick={() => updateStatus(c.id, "RESOLVED")} disabled={busy}>
          {busy ? <Spinner /> : <><MdCheckCircle size={14} /> {t("adminCompMarkResolved")}</>}
        </button>
      )}
    </div>
  );
}

function ActionButtonsInline({ c, updateStatus, updatingId, t }) {
  const isPending    = c.status === "OPEN" || c.status === "PENDING";
  const isInProgress = c.status === "IN_PROGRESS";
  const isResolved   = c.status === "RESOLVED";
  const busy = updatingId === c.id;
  if (isResolved) return (
    <span className="action-btn-resolved"><MdCheckCircle size={13} /> {t("adminCompCompleted")}</span>
  );
  return (
    <>
      {isPending && (
        <button className="action-btn-inprogress" style={{ width: "auto", padding: "7px 14px" }}
          onClick={() => updateStatus(c.id, "IN_PROGRESS")} disabled={busy}>
          {busy ? <Spinner /> : <><MdSchedule size={13} /> {t("adminCompMarkInProgress")}</>}
        </button>
      )}
      {isInProgress && (
        <button className="action-btn-resolve" style={{ width: "auto", padding: "7px 14px" }}
          onClick={() => updateStatus(c.id, "RESOLVED")} disabled={busy}>
          {busy ? <Spinner /> : <><MdCheckCircle size={13} /> {t("adminCompMarkResolved")}</>}
        </button>
      )}
    </>
  );
}

// ── ChatPanel ─────────────────────────────────────────────────────────────────
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
        <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          flex: 1, color: "inherit", fontSize: 11 }}>
          {attachment_name || "Attachment"}
        </span>
        <button
          onClick={() => setFilePreview({ url: attachment_url, name: attachment_name, previewUrl })}
          title={t("docView")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit",
            fontSize: 13, opacity: 0.85, display: "flex", alignItems: "center", flexShrink: 0, padding: 0 }}>
          👁
        </button>
        <a href={attachment_url} download={attachment_name || "attachment"} title={t("docDownload")}
          style={{ color: "inherit", fontSize: 14, opacity: 0.8, display: "flex",
            alignItems: "center", flexShrink: 0, textDecoration: "none" }}>
          ↓
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
            <span style={{ fontSize: 22 }}>📄</span>
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
          <span style={{ fontSize: 15 }}>📎</span>
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
                📄 {filePreview.name}
              </span>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <a href={filePreview.url} download={filePreview.name}
                  style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    color: "white", background: "rgba(255,255,255,0.12)", textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 5 }}>
                  ↓ {t("docDownload")}
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
                <span style={{ fontSize: 48 }}>📄</span>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>
                  Preview unavailable — download to open
                </p>
                <a href={filePreview.url} download={filePreview.name}
                  style={{ padding: "8px 20px", borderRadius: 999, background: "var(--accent)",
                    color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  ↓ Download file
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

// ── FlatInfoBlock — reusable detailed flat display in the drawer ───────────────
function FlatInfoBlock({ c, t }) {
  const flat = resolveFlatObj(c);
  if (!flat) {
    return (
      <span style={{ fontSize: 13, color: "var(--text-secondary)", opacity: 0.6 }}>NA</span>
    );
  }

  const block    = flat.Block?.name   || flat.block_name   || null;
  const flatNum  = flat.flat_number   || null;
  const floorNum = flat.floor_number  ?? flat.Floor?.floor_number ?? null;

  const rows = [
    block    && { icon: "🏢", label: t("blockLabel") || "Block",    value: `${t("blockLabel") || "Block"} ${block}` },
    flatNum  && { icon: "🚪", label: t("flatLabel") || "Flat",     value: `${t("flatLabel") || "Flat"} ${flatNum}` },
    floorNum !== null && floorNum !== undefined
               && { icon: "🏗️", label: t("floorLabel") || "Floor", value: `${t("floorLabel") || "Floor"} ${floorNum}` },
  ].filter(Boolean);

  if (rows.length === 0) return (
    <span style={{ fontSize: 13, color: "var(--text-secondary)", opacity: 0.6 }}>NA</span>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
      {rows.map(({ icon, label, value }) => (
        <span key={label} style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 8,
          background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)",
          fontSize: 12, fontWeight: 600, color: "var(--text-primary)",
        }}>
          <span style={{ fontSize: 13 }}>{icon}</span> {value}
        </span>
      ))}
    </div>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────
function MobileComplaintCard({ c, updateStatus, updatingId, t, onOpen, onPhotoClick, unreadMap }) {
  return (
    <div onClick={() => onOpen(c, "details")}
      style={{ background: "var(--card-bg)", border: "1.5px solid var(--glass-border)",
        borderRadius: 18, overflow: "hidden", cursor: "pointer",
        boxShadow: "var(--shadow-sm)", transition: "box-shadow 0.2s" }}>
      <div style={{ height: 3, background: getDot(c.status) }} />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0, flex: 1, lineHeight: 1.3 }}>
            {c.title}
          </p>
          <StatusPill status={c.status} t={t} />
        </div>
        {c.description && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {c.description}
          </p>
        )}
        {c.photo_url && (
          <div onClick={e => { e.stopPropagation(); onPhotoClick(c.photo_url, c.title); }}
            style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--glass-border)",
              position: "relative", cursor: "pointer" }}>
            <img src={c.photo_url} alt="complaint" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 160 }} />
            <div style={{ position: "absolute", bottom: 6, right: 8, display: "flex", alignItems: "center", gap: 4,
              background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "2px 7px", backdropFilter: "blur(4px)" }}>
              <MdOpenInNew size={11} style={{ color: "#fff" }} />
              <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{t("noticesView") || "View"}</span>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
            <MdPerson size={13} style={{ color: "var(--accent)" }} /> {c.User?.name || "NA"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
            <MdApartment size={13} style={{ color: "var(--accent)" }} /> {flatLabel(c, t)}
          </span>
          {c.Society && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.8 }}>
              🏢 <span style={{ fontWeight: 600 }}>{c.Society.name}</span>
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.7 }}>
            <MdCalendarToday size={11} /> {formatDate(c.created_at)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 6, borderTop: "1px solid var(--glass-border)", gap: 8 }}
          onClick={e => e.stopPropagation()}>
          <div style={{ flex: 1 }}>
            <ActionButtons c={c} updateStatus={updateStatus} updatingId={updatingId} t={t} />
          </div>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {(unreadMap[c.id] || 0) > 0 && (
              <span style={{ position: "absolute", top: -8, right: -8, minWidth: 18, height: 18,
                borderRadius: "50%", background: "linear-gradient(135deg,#ef4444,#dc2626)",
                color: "#fff", fontSize: 10, fontWeight: 800, display: "flex",
                alignItems: "center", justifyContent: "center", padding: "0 4px",
                border: "2px solid var(--card-bg)", boxShadow: "0 2px 8px rgba(239,68,68,0.55)",
                zIndex: 2, lineHeight: 1,
                animation: "admin-badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                {unreadMap[c.id] > 99 ? "99+" : unreadMap[c.id]}
              </span>
            )}
            <button onClick={() => onOpen(c, "chat")}
              className={`rcr-discuss-btn ${(unreadMap[c.id] || 0) > 0 ? "rcr-discuss-btn--shake" : ""}`}>
              <MdChat size={13} /><span>{t("chatDiscussion")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Complaint() {
  const isMobile           = useIsMobile();
  const { t }              = useLang();
  const { user: authUser } = useContext(AuthContext);

  const [complaints,    setComplaints]    = useState([]);
  const [loading,       setLoading]       = useState(false);
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
    };
    socket.on("new_complaint_comment", handler);
    return () => socket.off("new_complaint_comment", handler);
  }, [authUser]);

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

  const handlePageChange = (p) => loadComplaints(p, debSearch, filterStatus);

  const TABS = [
    { key: "ALL",         label: t("compTabAll"),         shortLabel: t("compTabAll"),        count: counts.ALL,         color: "#4f46e5" },
    { key: "PENDING",     label: t("compStatusPending"),  shortLabel: t("compStatusPending"), count: counts.PENDING,     color: "#d97706" },
    { key: "IN_PROGRESS", label: t("compTabInProgress"),  shortLabel: t("adminCompActive"),   count: counts.IN_PROGRESS, color: "#7c3aed" },
    { key: "RESOLVED",    label: t("compStatusResolved"), shortLabel: t("adminCompDone"),     count: counts.RESOLVED,    color: "#16a34a" },
  ];

  const STATS = [
    { label: t("compStatTotal"),      val: counts.ALL,         cls: "complaint-stat-total"      },
    { label: t("compStatusPending"),  val: counts.PENDING,     cls: "complaint-stat-pending"    },
    { label: t("compTabInProgress"),  val: counts.IN_PROGRESS, cls: "complaint-stat-inprogress" },
    { label: t("compStatusResolved"), val: counts.RESOLVED,    cls: "complaint-stat-resolved"   },
  ];

  const filtered = complaints; // Backend handles filtering now, though frontend 'filtered' is still used in UI loop.
  // Note: Local filtering for search query / status tabs / date could be kept if we want instant feedback, 
  // but usually with pagination we let backend handle it. 
  // For now, I'll keep the frontend filter logic if it doesn't conflict, 
  // but actually it's better to let backend handle searching too if we want correct pagination.
  // BUT the existing code already has 'filtered' logic using state. 
  // I'll leave it as is for now since it works on the current page's data.

  const tabBtn = (key) => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "7px 8px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
    background: drawerTab === key ? "var(--accent,#6366f1)" : "transparent",
    color: drawerTab === key ? "#fff" : "var(--text-secondary)",
    boxShadow: drawerTab === key ? "0 2px 8px rgba(99,102,241,0.35)" : "none",
  });

  return (
    <>
      <style>{`
        @keyframes admin-badge-pop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="page-root animate-fadeIn">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="er-icon er-icon--complaint"><MdReportProblem size={22} /></div>
          <div>
            <h2 className="page-title">{t("adminCompTitle")}</h2>
            <p className="page-subtitle">{totalItems} {t("adminCompTotal")}</p>
          </div>
        </div>

        {!loading && complaints.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 12 }}>
            {STATS.map((s, i) => (
              <div key={i} className={`complaint-stat-card ${s.cls}`}>
                <span className="complaint-stat-val">{s.val}</span>
                <span className="complaint-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="data-table-wrap">
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--glass-border)",
            display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flexShrink: 0 }}>
                {t("adminCompAllComplaints")}
              </span>
              <div style={{ position: "relative", flex: 1, maxWidth: isMobile ? "none" : 260 }}>
                <MdSearch size={14} style={{ position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                <input className="input"
                  style={{ paddingLeft: 30, paddingRight: searchQuery ? 30 : 10, height: 36, fontSize: 12, width: "100%" }}
                  placeholder={t("adminCompSearch")} value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-secondary)", display: "flex", alignItems: "center", padding: 0 }}>
                    <MdClose size={13} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {isSuperAdmin && (
                <Select className="input" style={{ width: 160, height: 36, fontSize: 12 }}
                  value={filterSocietyId} onChange={(e) => setFilterSocietyId(e.target.value)}>
                  <option value="">— {t("allSocieties") || "All Societies"} —</option>
                  {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              )}
              
              <Select className="input" style={{ width: 140, height: 36, fontSize: 12 }}
                value={filterBlockId} onChange={(e) => setFilterBlockId(e.target.value)}>
                <option value="">— {t("allBlocks") || "All Blocks"} —</option>
                {blocksList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>

              <Select className="input" style={{ width: 140, height: 36, fontSize: 12 }}
                disabled={!filterBlockId}
                value={filterFloorId} onChange={(e) => setFilterFloorId(e.target.value)}>
                <option value="">— {t("allFloors") || "All Floors"} —</option>
                {floorsList.map(f => <option key={f.id} value={f.id}>{f.floor_number}</option>)}
              </Select>

              <Select className="input" style={{ width: 140, height: 36, fontSize: 12 }}
                disabled={!filterBlockId}
                value={filterFlatId} onChange={(e) => setFilterFlatId(e.target.value)}>
                <option value="">— {t("allFlats") || "All Flats"} —</option>
                {flatsList.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
              </Select>
            </div>

            {isSuperAdmin && !filterSocietyId && (
              <div style={{ fontSize: 11, color: "var(--stat-purple-color)", fontWeight: 600, 
                padding: "4px 8px", background: "var(--card-inner-bg)", borderRadius: 6, width: "fit-content" }}>
                🌍 {t("showingComplaintsAllSocieties") || "Showing Complaints from All Societies"}
              </div>
            )}

            <div style={{ display: "flex", gap: 4, width: "100%", background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)", borderRadius: 12, padding: 4, boxSizing: "border-box" }}>
              {TABS.map(({ key, label, shortLabel, count, color }) => {
                const on = filterStatus === key;
                return (
                  <button key={key} onClick={() => setFilterStatus(key)} style={{
                    flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 3, padding: "6px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: isMobile ? 11 : 12, fontWeight: on ? 700 : 500, whiteSpace: "nowrap",
                    overflow: "hidden", transition: "all 0.18s",
                    background: on ? color : "transparent",
                    color: on ? "#fff" : "var(--text-secondary)",
                    boxShadow: on ? "0 3px 10px rgba(0,0,0,0.25)" : "none" }}>
                    {isMobile ? shortLabel : label}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 999,
                      lineHeight: 1.6, flexShrink: 0,
                      background: on ? "rgba(255,255,255,0.25)" : "var(--glass-border)",
                      color: on ? "#fff" : "var(--text-secondary)" }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MdCalendarToday size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                <input type="date" className="complaint-date-input" style={{ width: 140 }}
                  value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("compDateTo")}</span>
                <input type="date" className="complaint-date-input" style={{ width: 140 }}
                  value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} />
                {hasDateFilter && (
                  <button onClick={clearDate} style={{ width: 30, height: 30, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)",
                    cursor: "pointer", color: "var(--text-secondary)" }}>
                    <MdClose size={13} />
                  </button>
                )}
              </div>
            )}

            {hasDateFilter && (
              <div>
                <span className="status-pill status-pill--inprogress">
                  <MdCalendarToday size={11} />
                  {dateFrom ? formatDate(dateFrom) : t("compDateStart")} → {dateTo ? formatDate(dateTo) : t("compDateEnd")}
                  <button onClick={clearDate} style={{ background: "none", border: "none", cursor: "pointer",
                    color: "inherit", display: "flex", alignItems: "center", marginLeft: 2, padding: 0 }}>
                    <MdClose size={11} />
                  </button>
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "64px 20px" }}>
              <Spinner />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("compLoading")}</p>
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 20px" }}>
              <MdOutlineInbox size={48} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("adminCompEmpty")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "64px 20px" }}>
              <MdSearch size={40} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("compNoMatch")}</p>
              <button onClick={() => { setSearchQuery(""); setFilterStatus("ALL"); clearDate(); }}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                {t("compClearAll")}
              </button>
            </div>
          ) : isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14 }}>
              {filtered.map((c, i) => (
                <div key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 40}ms`, position: "relative" }}>
                  <MobileComplaintCard c={c} updateStatus={updateStatus} updatingId={updatingId} t={t}
                    onOpen={openDrawer} unreadMap={unreadMap}
                    onPhotoClick={(url, title) => { setLightboxPhoto(url); setLightboxTitle(title); }} />
                </div>
              ))}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            </div>

          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    {isSuperAdmin && <th style={{ width: 120 }}>{t("reportSociety") || "Society"}</th>}
                    <th>{t("adminCompColTitle")}</th>
                    <th>{t("adminCompColPhoto")}</th>
                    <th>{t("reportResident")}</th>
                    <th>{t("reportFlat")}</th>
                    <th>{t("billStatusCol")}</th>
                    <th>{t("compColDate")}</th>
                    <th style={{ width: 150 }}>{t("billActionCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id} onClick={() => openDrawer(c, "details")}>
                      <td><span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{(page - 1) * LIMIT + idx + 1}</span></td>
                      {isSuperAdmin && (
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                            {c.Society?.name || "—"}
                          </span>
                        </td>
                      )}
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 3, height: 36, borderRadius: 99, background: getDot(c.status), flexShrink: 0 }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", margin: 0,
                              maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.title}
                            </p>
                            {c.description && (
                              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0",
                                maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {c.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.photo_url ? (
                          <div style={{ width: 56, height: 40, borderRadius: 10, overflow: "hidden",
                            cursor: "pointer", border: "1.5px solid var(--glass-border)" }}
                            onClick={e => { e.stopPropagation(); setLightboxPhoto(c.photo_url); setLightboxTitle(c.title); }}>
                            <img src={c.photo_url} alt="complaint" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.3 }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="resident-avatar" style={{ width: 28, height: 28 }}>
                            <MdPerson size={14} style={{ color: "var(--accent)" }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                            {c.User?.name || "NA"}
                          </span>
                        </div>
                      </td>
                      {/* ✅ FIXED: flat column now uses resolveFlatObj for correct data */}
                      <td>
                        <span className="info-chip" title={flatLabel(c, t)}>
                          {flatChipLabel(c)}
                        </span>
                      </td>
                      <td><StatusPill status={c.status} t={t} /></td>
                      <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(c.created_at)}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ position: "relative" }}>
                            {(unreadMap[c.id] || 0) > 0 && (
                              <span style={{ position: "absolute", top: -7, right: -7, minWidth: 18, height: 18,
                                borderRadius: "50%", background: "linear-gradient(135deg,#ef4444,#dc2626)",
                                color: "#fff", fontSize: 10, fontWeight: 800, display: "flex",
                                alignItems: "center", justifyContent: "center", padding: "0 4px",
                                border: "2px solid var(--card-bg)", boxShadow: "0 2px 8px rgba(239,68,68,0.55)",
                                zIndex: 2, lineHeight: 1,
                                animation: "admin-badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                                {unreadMap[c.id] > 99 ? "99+" : unreadMap[c.id]}
                              </span>
                            )}
                            <button onClick={() => openDrawer(c, "chat")}
                              className={`rcr-discuss-btn ${(unreadMap[c.id] || 0) > 0 ? "rcr-discuss-btn--shake" : ""}`}>
                              <MdChat size={13} /><span>{t("chatDiscussion")}</span>
                            </button>
                          </div>
                          <ActionButtonsInline c={c} updateStatus={updateStatus} updatingId={updatingId} t={t} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-footer">
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {t("reportShowing")} <strong style={{ color: "var(--text-primary)" }}>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong> {t("reportOf")} {totalItems} {t("rcrComplaintsCount")}
                </span>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
                {hasDateFilter && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--stat-purple-color)" }}>
                    {t("compFilteredByDate")}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Drawer ── */}
      {selected && createPortal(
        <>
          <div className="modal-overlay-blur animate-fadeIn" onClick={closeDrawer} />
          <div className="detail-drawer animate-fadeIn"
            style={isMobile
              ? { position: "fixed", inset: 0, borderRadius: 0, width: "100%", maxWidth: "100%", zIndex: 50 }
              : { position: "fixed", top: 0, right: 0, bottom: 0, left: "auto", width: 420, borderRadius: "16px 0 0 16px", zIndex: 50 }}>
            <div className="detail-drawer__header">
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
                  <StatusPill status={selected.status} t={t} />
                  <div>
                    <div className="detail-drawer__label">{t("compColTitle")}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.35 }}>
                      {selected.title}
                    </div>
                  </div>
                  {selected.description && (
                    <div>
                      <div className="detail-drawer__label">{t("compColDesc")}</div>
                      <div className="info-row" style={{ borderRadius: 12, padding: "12px 14px" }}>
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{selected.description}</span>
                      </div>
                    </div>
                  )}
                  {selected.photo_url && (
                    <div>
                      <div className="detail-drawer__label">{t("adminCompAttachedPhoto")}</div>
                      <div style={{ borderRadius: 14, border: "1.5px solid var(--glass-border)",
                        background: "var(--chip-bg)", overflow: "hidden", cursor: "pointer", position: "relative" }}
                        onClick={() => { setLightboxPhoto(selected.photo_url); setLightboxTitle(selected.title); }}>
                        <img src={selected.photo_url} alt="complaint"
                          style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: 200 }} />
                        <div style={{ position: "absolute", bottom: 8, right: 10, display: "flex", alignItems: "center", gap: 4,
                          background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "3px 8px", backdropFilter: "blur(4px)" }}>
                          <MdOpenInNew size={11} style={{ color: "#fff" }} />
                          <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{t("drawerEnlargePhoto")}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✅ Resident info */}
                  <div>
                    <div className="detail-drawer__label">{t("adminCompResidentInfo")}</div>
                    <div className="resident-block">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 200px" }}>
                          <div className="resident-avatar">
                            <MdPerson size={20} style={{ color: "var(--accent)" }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                              {selected.User?.name || "NA"}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                              {selected.User?.email || ""}
                            </div>
                          </div>
                        </div>
                        {selected.Society && (
                          <div style={{ padding: "8px 12px", background: "var(--card-inner-bg)", borderRadius: 10, border: "1px solid var(--glass-border)", flex: "0 0 auto" }}>
                            <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, marginBottom: 2 }}>{t("reportSociety") || "Society"}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{selected.Society.name}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ✅ FIXED: Flat / Block / Floor detail block */}
                  <div>
                    <div className="detail-drawer__label">{t("reportFlat")}</div>
                    <FlatInfoBlock c={selected} t={t} />
                  </div>

                  <div>
                    <div className="detail-drawer__label">{t("billActionCol")}</div>
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
    </>
  );
}