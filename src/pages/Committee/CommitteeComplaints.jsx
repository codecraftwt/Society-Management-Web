

import { useEffect, useState, useRef, useContext, useCallback } from "react";
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
} from "react-icons/md";

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ small = false }) {
  const s = small ? 14 : 16;
  return (
    <svg className="animate-spin" style={{ color: "currentColor", width: s, height: s }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
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
const flatLabel = (c) =>
  c.Flat ? `${c.Flat.flat_number} — ${c.Flat.Block?.name || ""}` : (c.User?.Flat ? `${c.User.Flat.flat_number} — ${c.User.Flat.Block?.name || ""}` : "NA");

// ── Status Pill ───────────────────────────────────────────────────────────────
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
      <c.Icon size={12} /> {t ? t(c.key) : status}
    </span>
  );
}

const getDot = (s) => ({
  RESOLVED: "#22c55e", IN_PROGRESS: "#9F87D7", PENDING: "#3B82F6", OPEN: "#3B82F6",
}[s] || "#3B82F6");

// ── Action Buttons ────────────────────────────────────────────────────────────
function ActionButtons({ c, updateStatus, updatingId, t }) {
  const isPending    = c.status === "OPEN" || c.status === "PENDING";
  const isInProgress = c.status === "IN_PROGRESS";
  const isResolved   = c.status === "RESOLVED";
  const busy = updatingId === c.id;
  if (isResolved) return (
    <span className="action-btn-resolved"><MdCheckCircle size={14} /> {t ? t("adminCompCompleted") : "Completed"}</span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {isPending && (
        <button className="action-btn-inprogress" onClick={() => updateStatus(c.id, "IN_PROGRESS")} disabled={busy}>
          {busy ? <Spinner /> : <><MdSchedule size={14} /> {t ? t("adminCompMarkInProgress") : "Mark In Progress"}</>}
        </button>
      )}
      {isInProgress && (
        <button className="action-btn-resolve" onClick={() => updateStatus(c.id, "RESOLVED")} disabled={busy}>
          {busy ? <Spinner /> : <><MdCheckCircle size={14} /> {t ? t("adminCompMarkResolved") : "Mark Resolved"}</>}
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
    <span className="action-btn-resolved"><MdCheckCircle size={13} /> {t ? t("adminCompCompleted") : "Completed"}</span>
  );
  return (
    <>
      {isPending && (
        <button className="action-btn-inprogress" style={{ width: "auto", padding: "7px 14px" }}
          onClick={() => updateStatus(c.id, "IN_PROGRESS")} disabled={busy}>
          {busy ? <Spinner /> : <><MdSchedule size={13} /> {t ? t("adminCompMarkInProgress") : "Mark In Progress"}</>}
        </button>
      )}
      {isInProgress && (
        <button className="action-btn-resolve" style={{ width: "auto", padding: "7px 14px" }}
          onClick={() => updateStatus(c.id, "RESOLVED")} disabled={busy}>
          {busy ? <Spinner /> : <><MdCheckCircle size={13} /> {t ? t("adminCompMarkResolved") : "Mark Resolved"}</>}
        </button>
      )}
    </>
  );
}

// ── ChatPanel ─────────────────────────────────────────────────────────────────
// Supports: RESIDENT, SOCIETY_ADMIN, COMMITTEE_MEMBER
// Committee member is shown with "Committee" badge like admin
function ChatPanel({ complaintId, currentUser, onIncomingMessage }) {
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

  // Committee member is treated same as admin in chat
  const isPrivileged = ["SOCIETY_ADMIN", "COMMITTEE_MEMBER"].includes(currentUser?.role);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/complaints/${complaintId}/comments`);
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
      // ✅ Include role so badge renders immediately in optimistic UI
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
        headers: { "Content-Type": "multipart/form-data" },
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
      await API.delete(`/complaints/${complaintId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  const handleClear = async () => {
    try {
      setClearing(true);
      await API.delete(`/complaints/${complaintId}/comments`);
      setComments([]);
      setConfirmClear(false);
    } catch (e) { console.error(e); }
    finally { setClearing(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isMe       = (c) => c.user_id === currentUser?.id;
  // ✅ Both SOCIETY_ADMIN and COMMITTEE_MEMBER get the privileged badge
  const isMsgPrivileged = (c) => ["SOCIETY_ADMIN", "COMMITTEE_MEMBER"].includes(c.User?.role);
  // const canDelete  = (c) => isMe(c) || isPrivileged;
  const canDelete = (c) => isMe(c);

  // ✅ Badge label differs: "Admin" vs "Committee"
  const getSenderBadge = (c) => {
    if (c.User?.role === "SOCIETY_ADMIN")    return t ? t("chatAdminBadge")     : "Admin";
    if (c.User?.role === "COMMITTEE_MEMBER") return t ? t("chatCommitteeBadge") : "Committee";
    return null;
  };

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
        <button onClick={() => setFilePreview({ url: attachment_url, name: attachment_name, previewUrl })}
          title="View"
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit",
            fontSize: 13, opacity: 0.85, display: "flex", alignItems: "center", flexShrink: 0, padding: 0 }}>
          👁
        </button>
        <a href={attachment_url} download={attachment_name || "attachment"} title="Download"
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
        <span className="chat-panel__header-title">{t ? t("chatDiscussion") : "Discussion"}</span>
        <span className="chat-panel__count">
          {comments.filter(c => !String(c.id).startsWith("opt_")).length}
        </span>
        {comments.length > 0 && (
          <div style={{ marginLeft: "auto" }}>
            {confirmClear ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }} className="animate-fadeIn">
                <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {t ? t("chatClearConfirm") : "Clear all?"}
                </span>
                <button onClick={handleClear} disabled={clearing} style={{
                  padding: "3px 9px", borderRadius: 7, fontSize: 10, fontWeight: 700,
                  background: "#dc2626", color: "#fff", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4 }}>
                  {clearing ? <Spinner small /> : (t ? t("chatClearYes") : "Yes")}
                </button>
                <button onClick={() => setConfirmClear(false)} style={{
                  padding: "3px 7px", borderRadius: 7, fontSize: 10, fontWeight: 600,
                  background: "var(--card-inner-bg)", color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)", cursor: "pointer" }}>
                  {t ? t("chatClearNo") : "No"}
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="chat-clear-btn">
                <MdDelete size={12} /> {t ? t("chatClear") : "Clear"}
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
          <div className="chat-panel__empty">{t ? t("chatEmpty") : "No messages yet"}</div>
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
                      title="Delete" className="chat-msg-delete-btn">
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
        <button onClick={() => fileInputRef.current?.click()} title="Attach file"
          style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: attachment ? "var(--accent)" : "var(--card-inner-bg)",
            border: "1px solid var(--glass-border)",
            color: attachment ? "#fff" : "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s" }}>
          <span style={{ fontSize: 15 }}>📎</span>
        </button>
        <textarea ref={inputRef} rows={1} className="chat-panel__textarea"
          placeholder={attachment ? "File attached — add a message or send" : "Type a message…"}
          value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} />
        <button onClick={handleSend}
          disabled={(!message.trim() && !attachment) || sending}
          className={`chat-panel__send-btn ${(message.trim() || attachment) ? "chat-panel__send-btn--active" : "chat-panel__send-btn--inactive"}`}
          style={{ opacity: sending ? 0.6 : 1 }}>
          {sending ? <Spinner small /> : <MdSend size={16} />}
        </button>
      </div>

      {/* Image lightbox */}
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
              Click outside to close
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* File preview modal */}
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
                  ↓ Download
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
              <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>View</span>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
            <MdPerson size={13} style={{ color: "var(--accent)" }} /> {c.User?.name || "NA"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
            <MdApartment size={13} style={{ color: "var(--accent)" }} /> {flatLabel(c)}
          </span>
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
              <MdChat size={13} /><span>{t ? t("chatDiscussion") : "Discussion"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CommitteeComplaints() {
  const isMobile           = useIsMobile();
  const { t }              = useLang();
  const { user: authUser } = useContext(AuthContext);

  const [complaints,    setComplaints]    = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [filterStatus,  setFilterStatus]  = useState("ALL");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [selected,      setSelected]      = useState(null);
  const [drawerTab,     setDrawerTab]     = useState("details");
  const [unreadMap,     setUnreadMap]     = useState({});

  const selectedRef  = useRef(selected);
  const drawerTabRef = useRef(drawerTab);
  useEffect(() => { selectedRef.current  = selected;  }, [selected]);
  useEffect(() => { drawerTabRef.current = drawerTab; }, [drawerTab]);

  const complaintIdsRef = useRef([]);

  // ── Load complaints ──
  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get("/complaints");
      const complaintsArray = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setComplaints(complaintsArray);
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
  }, []);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  // ── Join society room ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !authUser?.society_id) return;
    socket.emit("join_society", authUser.society_id);
    return () => socket.emit("leave_society", authUser.society_id);
  }, [authUser?.society_id]);

  // ── Real-time: new complaint ──
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

  // ── Real-time: complaint deleted ──
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

  // ── Badge logic: new chat messages ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !authUser) return;
    const handler = (comment) => {
      if (comment.user_id === authUser.id) return;
      const openedComplaintId = selectedRef.current?.id;
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

  // ── Join/leave complaint rooms ──
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
      await API.put(`/complaints/${id}`, { status });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch (e) { console.error(e); }
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

  const counts = {
    ALL:         complaints.length,
    PENDING:     complaints.filter(c => c.status === "PENDING" || c.status === "OPEN").length,
    IN_PROGRESS: complaints.filter(c => c.status === "IN_PROGRESS").length,
    RESOLVED:    complaints.filter(c => c.status === "RESOLVED").length,
  };

  const filtered = complaints.filter(c => {
    const q  = searchQuery.toLowerCase();
    const ms = c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      || c.User?.name?.toLowerCase().includes(q) || c.Flat?.flat_number?.toLowerCase().includes(q) || c.User?.Flat?.flat_number?.toLowerCase().includes(q);
    const mf = filterStatus === "ALL"
      || (filterStatus === "PENDING" ? c.status === "PENDING" || c.status === "OPEN" : c.status === filterStatus);
    let md = true;
    if (dateFrom || dateTo) {
      const d = c.created_at ? new Date(c.created_at) : null;
      if (!d) { md = false; } else {
        const s = iso => { const x = new Date(iso); x.setHours(0,0,0,0); return x; };
        const e = iso => { const x = new Date(iso); x.setHours(23,59,59,999); return x; };
        if (dateFrom && d < s(dateFrom)) md = false;
        if (dateTo   && d > e(dateTo))   md = false;
      }
    }
    return ms && mf && md;
  });

  const TABS = [
    { key: "ALL",         label: t ? t("compTabAll")         : "All",         shortLabel: t ? t("compTabAll")        : "All",        count: counts.ALL,         color: "#5A3BA2" },
    { key: "PENDING",     label: t ? t("compStatusPending")  : "Pending",     shortLabel: t ? t("compStatusPending") : "Pending",    count: counts.PENDING,     color: "#2563EB" },
    { key: "IN_PROGRESS", label: t ? t("compTabInProgress")  : "In Progress", shortLabel: t ? t("adminCompActive")   : "Active",     count: counts.IN_PROGRESS, color: "#5A3BA2" },
    { key: "RESOLVED",    label: t ? t("compStatusResolved") : "Resolved",    shortLabel: t ? t("adminCompDone")     : "Done",       count: counts.RESOLVED,    color: "#16a34a" },
  ];

  const STATS = [
    { label: t ? t("compStatTotal")      : "Total",       val: counts.ALL,         cls: "complaint-stat-total"      },
    { label: t ? t("compStatusPending")  : "Pending",     val: counts.PENDING,     cls: "complaint-stat-pending"    },
    { label: t ? t("compTabInProgress")  : "In Progress", val: counts.IN_PROGRESS, cls: "complaint-stat-inprogress" },
    { label: t ? t("compStatusResolved") : "Resolved",    val: counts.RESOLVED,    cls: "complaint-stat-resolved"   },
  ];

  const tabBtn = (key) => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "7px 8px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
    background: drawerTab === key ? "var(--accent,#6B46C1)" : "transparent",
    color: drawerTab === key ? "#fff" : "var(--text-secondary)",
    boxShadow: drawerTab === key ? "0 2px 8px rgba(107,70,193,0.35)" : "none",
  });

  return (
    <>
      <style>{`
        @keyframes admin-badge-pop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes admin-toast-in {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="page-root animate-fadeIn">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="er-icon er-icon--complaint"><MdReportProblem size={22} /></div>
          <div>
            <h2 className="page-title">{t ? t("adminCompTitle") : "Complaints"}</h2>
            <p className="page-subtitle">{complaints.length} {t ? t("adminCompTotal") : "total complaints"}</p>
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
                {t ? t("adminCompAllComplaints") : "All Complaints"}
              </span>
              <div style={{ position: "relative", flex: 1, maxWidth: isMobile ? "none" : 260 }}>
                <MdSearch size={14} style={{ position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                <input className="input"
                  style={{ paddingLeft: 30, paddingRight: searchQuery ? 30 : 10, height: 36, fontSize: 12, width: "100%" }}
                  placeholder={t ? t("adminCompSearch") : "Search complaints…"} value={searchQuery}
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

            {/* Filter tabs */}
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

            {/* Date filter — desktop only */}
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MdCalendarToday size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                <input type="date" className="complaint-date-input" style={{ width: 140 }}
                  value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t ? t("compDateTo") : "to"}</span>
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

            {/* Active date filter chip */}
            {hasDateFilter && (
              <div>
                <span className="status-pill status-pill--inprogress">
                  <MdCalendarToday size={11} />
                  {dateFrom ? formatDate(dateFrom) : "Start"} → {dateTo ? formatDate(dateTo) : "End"}
                  <button onClick={clearDate} style={{ background: "none", border: "none", cursor: "pointer",
                    color: "inherit", display: "flex", alignItems: "center", marginLeft: 2, padding: 0 }}>
                    <MdClose size={11} />
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "64px 20px" }}>
              <Spinner />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                {t ? t("compLoading") : "Loading complaints…"}
              </p>
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 20px" }}>
              <MdOutlineInbox size={48} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                {t ? t("adminCompEmpty") : "No complaints yet"}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "64px 20px" }}>
              <MdSearch size={40} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                {t ? t("compNoMatch") : "No complaints match your filters"}
              </p>
              <button onClick={() => { setSearchQuery(""); setFilterStatus("ALL"); clearDate(); }}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                {t ? t("compClearAll") : "Clear all filters"}
              </button>
            </div>
          ) : isMobile ? (
            // ── Mobile cards ──
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14 }}>
              {filtered.map((c, i) => (
                <div key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 40}ms`, position: "relative" }}>
                  <MobileComplaintCard c={c} updateStatus={updateStatus} updatingId={updatingId} t={t}
                    onOpen={openDrawer} unreadMap={unreadMap}
                    onPhotoClick={(url, title) => { setLightboxPhoto(url); setLightboxTitle(title); }} />
                </div>
              ))}
            </div>
          ) : (
            // ── Desktop table ──
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    {["#",
                      t ? t("adminCompColTitle")  : "Title",
                      t ? t("adminCompColPhoto")  : "Photo",
                      t ? t("reportResident")     : "Resident",
                      t ? t("reportFlat")         : "Flat",
                      t ? t("billStatusCol")      : "Status",
                      t ? t("compColDate")        : "Date",
                      t ? t("billActionCol")      : "Action",
                    ].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id} onClick={() => openDrawer(c, "details")}>
                      <td><span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{idx + 1}</span></td>
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
                      <td><span className="info-chip">{flatLabel(c)}</span></td>
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
                              <MdChat size={13} /><span>{t ? t("chatDiscussion") : "Discussion"}</span>
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
                  {t ? t("reportShowing") : "Showing"} <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong> {t ? t("reportOf") : "of"} {complaints.length} {t ? t("rcrComplaintsCount") : "complaints"}
                </span>
                {hasDateFilter && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--stat-purple-color)" }}>
                    {t ? t("compFilteredByDate") : "Filtered by date"}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      {selected && createPortal(
        <>
          <div className="modal-overlay-blur animate-fadeIn" onClick={closeDrawer} />
          <div className="detail-drawer animate-fadeIn"
            style={isMobile
              ? { position: "fixed", inset: 0, borderRadius: 0, width: "100%", maxWidth: "100%", zIndex: 50 }
              : { position: "fixed", top: 0, right: 0, bottom: 0, left: "auto", width: 420, borderRadius: "16px 0 0 16px", zIndex: 50 }}>

            {/* Drawer header */}
            <div className="detail-drawer__header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="er-icon er-icon--complaint" style={{ width: 36, height: 36, borderRadius: 10 }}>
                  <MdReportProblem size={17} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {t ? t("adminCompDetail") : "Complaint Detail"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {formatDate(selected.created_at)}
                  </div>
                </div>
              </div>
              <button className="detail-drawer__close-btn" onClick={closeDrawer}><MdClose size={17} /></button>
            </div>

            {/* Drawer tabs */}
            <div style={{ display: "flex", gap: 4, padding: "10px 14px 0",
              background: "var(--card-inner-bg)", borderBottom: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", flex: 1, background: "var(--card-bg)",
                border: "1px solid var(--glass-border)", borderRadius: 10, padding: 3, gap: 3 }}>
                <button style={tabBtn("details")} onClick={() => handleDrawerTabChange("details")}>
                  <MdReportProblem size={13} /> {t ? t("chatDetails") : "Details"}
                </button>
                <button style={tabBtn("chat")} onClick={() => handleDrawerTabChange("chat")}>
                  <MdChat size={13} /> {t ? t("chatDiscussion") : "Discussion"}
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

            {/* Drawer body */}
            <div className="detail-drawer__body scrollbar-hide"
              style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {drawerTab === "details" && (
                <>
                  <StatusPill status={selected.status} t={t} />
                  <div>
                    <div className="detail-drawer__label">{t ? t("compColTitle") : "Title"}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.35 }}>
                      {selected.title}
                    </div>
                  </div>
                  {selected.description && (
                    <div>
                      <div className="detail-drawer__label">{t ? t("compColDesc") : "Description"}</div>
                      <div className="info-row" style={{ borderRadius: 12, padding: "12px 14px" }}>
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{selected.description}</span>
                      </div>
                    </div>
                  )}
                  {selected.photo_url && (
                    <div>
                      <div className="detail-drawer__label">{t ? t("adminCompAttachedPhoto") : "Attached Photo"}</div>
                      <div style={{ borderRadius: 14, border: "1.5px solid var(--glass-border)",
                        background: "var(--chip-bg)", overflow: "hidden", cursor: "pointer", position: "relative" }}
                        onClick={() => { setLightboxPhoto(selected.photo_url); setLightboxTitle(selected.title); }}>
                        <img src={selected.photo_url} alt="complaint"
                          style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: 200 }} />
                        <div style={{ position: "absolute", bottom: 8, right: 10, display: "flex", alignItems: "center", gap: 4,
                          background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "3px 8px", backdropFilter: "blur(4px)" }}>
                          <MdOpenInNew size={11} style={{ color: "#fff" }} />
                          <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>
                            {t ? t("drawerEnlargePhoto") : "Enlarge"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="detail-drawer__label">{t ? t("adminCompResidentInfo") : "Resident Info"}</div>
                    <div className="resident-block">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                        <MdApartment size={14} style={{ color: "var(--accent)", opacity: 0.7 }} /> {flatLabel(selected)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="detail-drawer__label">{t ? t("billActionCol") : "Action"}</div>
                    <ActionButtons c={selected} updateStatus={updateStatus} updatingId={updatingId} t={t} />
                  </div>
                </>
              )}
              {/* ✅ Chat tab — committee member participates as themselves with "Committee" badge */}
              {drawerTab === "chat" && authUser && (
                <ChatPanel complaintId={selected.id} currentUser={authUser} />
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Photo Lightbox ── */}
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
              {t ? t("adminCompTapClose") : "Click outside to close"}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}