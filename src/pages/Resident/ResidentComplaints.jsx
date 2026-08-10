import { useEffect, useRef, useState, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { getSocket } from "../../services/socket";
import {
  MdAdd, MdSearch, MdFilterList, MdOutlineInbox,
  MdClose, MdCameraAlt, MdPhotoLibrary, MdDelete,
  MdFlipCameraAndroid, MdCalendarToday,
  MdChevronLeft, MdChevronRight,
  MdChat, MdSend, MdReportProblem, MdImage, MdOpenInNew,
  MdCheckCircle, MdSchedule, MdPending,
} from "react-icons/md";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

function dataURLtoFile(dataUrl, filename = "camera-photo.jpg") {
  const [header, base64] = dataUrl.split(",");
  const mime   = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const arr    = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
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

function SkeletonBlock({ width = "100%", height = 14, radius = 6, style = {} }) {
  return (
    <div className="rd-skeleton" style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }} />
  );
}

function MobileComplaintSkeleton() {
  return (
    <div style={{
      background: "var(--card-bg)", border: "1.5px solid var(--glass-border)",
      borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow-sm)",
    }}>
      <div className="rd-skeleton rd-skeleton-bar" style={{ height: 3, borderRadius: 0 }} />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <SkeletonBlock width="60%" height={16} />
          <SkeletonBlock width={72} height={22} radius={999} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SkeletonBlock width="90%" height={12} />
          <SkeletonBlock width="70%" height={12} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 8, borderTop: "1px solid var(--glass-border)" }}>
          <SkeletonBlock width={90} height={12} />
          <SkeletonBlock width={100} height={28} radius={10} />
        </div>
      </div>
    </div>
  );
}

function TableRowSkeleton({ cols = 7 }) {
  const widths = ["32px", "160px", "180px", "56px", "90px", "90px", "140px"];
  return (
    <tr>
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          <SkeletonBlock width={widths[i] || "80px"} height={14} />
        </td>
      ))}
    </tr>
  );
}

function StatCardsSkeleton({ isMobile }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 12 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="complaint-stat-card complaint-stat-total" style={{ opacity: 0.5 }}>
          <SkeletonBlock width={40} height={26} style={{ marginBottom: 4 }} />
          <SkeletonBlock width={80} height={11} />
        </div>
      ))}
    </div>
  );
}

const formatTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const getDot = (s) => ({
  RESOLVED: "#22c55e", IN_PROGRESS: "#a78bfa", PENDING: "#f59e0b", OPEN: "#f59e0b",
}[s] || "#f59e0b");

// ─── ChatPanel ────────────────────────────────────────────────────────────────
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

  const isMe            = (c) => c.user_id === currentUser?.id;
  const isMsgPrivileged = (c) => ["SOCIETY_ADMIN", "COMMITTEE_MEMBER"].includes(c.User?.role);
  const getSenderBadge  = (c) => {
    if (c.User?.role === "SOCIETY_ADMIN")    return t("chatAdminBadge");
    if (c.User?.role === "COMMITTEE_MEMBER") return t("chatCommitteeBadge");
    return null;
  };
  const canDelete = (c) => isMe(c);

  const getDownloadUrl = (attachmentUrl, attachmentName, mode) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    return (
      `${baseUrl}/download?url=${encodeURIComponent(attachmentUrl)}` +
      `&name=${encodeURIComponent(attachmentName || "attachment")}` +
      `&mode=${mode}`
    );
  };

  const getPreviewUrl = (attachmentUrl, attachmentName) => {
    const ext = (attachmentName || "").split(".").pop().toLowerCase();
    if (["xls", "xlsx"].includes(ext)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(attachmentUrl)}`;
    }
    if (["doc", "docx", "ppt", "pptx", "csv"].includes(ext)) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(attachmentUrl)}&embedded=true`;
    }
    return attachmentUrl;
  };

  const canPreviewInBrowser = (attachmentName) => {
    const ext = (attachmentName || "").split(".").pop().toLowerCase();
    return ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv"].includes(ext);
  };

  const renderAttachment = (comment) => {
    const { attachment_url, attachment_type, attachment_name } = comment;
    if (!attachment_url) return null;

    if (attachment_type === "image") {
      return (
        <div
          style={{ marginTop: 6, borderRadius: 10, overflow: "hidden", cursor: "pointer",
            border: "1.5px solid rgba(255,255,255,0.15)", maxWidth: 220 }}
          onClick={() => setLightbox(attachment_url)}
        >
          <img src={attachment_url} alt="attachment"
            style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 160 }} />
        </div>
      );
    }

    const dlUrl = getDownloadUrl(attachment_url, attachment_name, "download");

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
          onClick={() => setFilePreview({ url: attachment_url, name: attachment_name, dlUrl })}
          title={t("docView")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit",
            fontSize: 13, opacity: 0.85, display: "flex", alignItems: "center", flexShrink: 0, padding: 0 }}>
          👁
        </button>
        <a href={dlUrl} download={attachment_name || "attachment"} title={t("docDownload")}
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
                  border: "1px solid var(--glass-border)", cursor: "pointer" }}>
                  {t("chatClearNo")}
                </button>
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
              {t("chatTapClose")}
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
                <a href={filePreview.dlUrl} download={filePreview.name}
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
            {(() => {
              if (!canPreviewInBrowser(filePreview.name)) {
                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 14, background: "rgba(255,255,255,0.04)",
                    borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span style={{ fontSize: 48 }}>📦</span>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>
                      Preview not available for this file type
                    </p>
                    <a href={filePreview.dlUrl} download={filePreview.name}
                      style={{ padding: "8px 20px", borderRadius: 999, background: "var(--accent)",
                        color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                      ↓ Download file
                    </a>
                  </div>
                );
              }
              const iframeSrc = getPreviewUrl(filePreview.url, filePreview.name);
              return (
                <iframe key={iframeSrc} src={iframeSrc} title={filePreview.name}
                  style={{ flex: 1, border: "none", borderRadius: 12, background: "white", width: "100%" }} />
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── ComplaintDrawer ──────────────────────────────────────────────────────────
function ComplaintDrawer({ complaint, onClose, currentUser, t, defaultTab = "details", onMarkRead }) {
  const isMobile = useIsMobile();
  const [drawerTab,     setDrawerTab]     = useState(defaultTab);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => { setDrawerTab(defaultTab); }, [defaultTab]);

  useEffect(() => {
    if (drawerTab === "chat") onMarkRead?.(complaint.id);
  }, [drawerTab, complaint.id, onMarkRead]);

  const handleTabChange = (tab) => setDrawerTab(tab);

  const statusCfg = {
    RESOLVED:    { pill: "status-pill--resolved",   Icon: MdCheckCircle },
    IN_PROGRESS: { pill: "status-pill--inprogress", Icon: MdSchedule    },
    PENDING:     { pill: "status-pill--pending",    Icon: MdPending      },
    OPEN:        { pill: "status-pill--pending",    Icon: MdPending      },
  };
  const sc = statusCfg[complaint.status] || statusCfg.PENDING;

  const statusLabel = (s) =>
    s === "IN_PROGRESS" ? t("compStatusInProgress")
    : s === "RESOLVED"  ? t("compStatusResolved")
    :                     t("compStatusPending");

  const tabBtn = (key) => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "7px 8px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
    background: drawerTab === key ? "var(--accent,#3b82f6)" : "transparent",
    color:      drawerTab === key ? "#fff" : "var(--text-secondary)",
    boxShadow:  drawerTab === key ? "0 2px 8px rgba(59,130,246,0.35)" : "none",
  });

  return createPortal(
    <>
      <div className="modal-overlay-blur animate-fadeIn" onClick={onClose} />
      <div className="animate-fadeIn" style={{
        position: "fixed", zIndex: 50,
        ...(isMobile
          ? { inset: 0, borderRadius: 0, width: "100%", maxWidth: "100%" }
          : { top: 0, right: 0, bottom: 0, left: "auto", width: 420, borderRadius: "16px 0 0 16px" }),
        background: "var(--card-bg)", border: "1.5px solid var(--glass-border)",
        boxShadow: "var(--shadow-glass)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div className="detail-drawer__header" style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="er-icon er-icon--complaint" style={{ width: 36, height: 36, borderRadius: 10 }}>
              <MdReportProblem size={17} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("drawerComplaintDetails")}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{formatDate(complaint.created_at)}</div>
            </div>
          </div>
          <button className="detail-drawer__close-btn" onClick={onClose}><MdClose size={17} /></button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "10px 14px 0",
          background: "var(--card-inner-bg)", borderBottom: "1px solid var(--glass-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", flex: 1, background: "var(--card-bg)",
            border: "1px solid var(--glass-border)", borderRadius: 10, padding: 3, gap: 3 }}>
            <button style={tabBtn("details")} onClick={() => handleTabChange("details")}>
              <MdReportProblem size={13} /> {t("chatDetails")}
            </button>
            <button style={tabBtn("chat")} onClick={() => handleTabChange("chat")}>
              <MdChat size={13} /> {t("chatDiscussion")}
            </button>
          </div>
        </div>

        <div className="detail-drawer__body scrollbar-hide"
          style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
          {drawerTab === "details" && (
            <>
              <span className={`status-pill ${sc.pill}`}>
                <sc.Icon size={12} /> {statusLabel(complaint.status)}
              </span>
              <div>
                <div className="detail-drawer__label">{t("compColTitle")}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.35 }}>
                  {complaint.title}
                </div>
              </div>
              {complaint.description && (
                <div>
                  <div className="detail-drawer__label">{t("compColDesc")}</div>
                  <div className="info-row" style={{ borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{complaint.description}</span>
                  </div>
                </div>
              )}
              {complaint.photo_url && (
                <div>
                  <div className="detail-drawer__label">{t("adminCompAttachedPhoto")}</div>
                  <div style={{ borderRadius: 14, border: "1.5px solid var(--glass-border)",
                    background: "var(--chip-bg)", overflow: "hidden", cursor: "pointer", position: "relative" }}
                    onClick={() => setLightboxPhoto(complaint.photo_url)}>
                    <img src={complaint.photo_url} alt="complaint"
                      style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: 200 }} />
                    <div style={{ position: "absolute", bottom: 8, right: 10, display: "flex", alignItems: "center", gap: 4,
                      background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "3px 8px", backdropFilter: "blur(4px)" }}>
                      <MdOpenInNew size={11} style={{ color: "#fff" }} />
                      <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{t("drawerEnlargePhoto")}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 5, opacity: 0.6 }}>
                    {t("drawerTapFullImage")}
                  </p>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                color: "var(--text-secondary)", paddingTop: 4, borderTop: "1px solid var(--glass-border)" }}>
                <MdCalendarToday size={12} /> {t("drawerFiledOn")} {formatDate(complaint.created_at)}
              </div>
            </>
          )}
          {drawerTab === "chat" && currentUser && (
            <ChatPanel complaintId={complaint.id} currentUser={currentUser} />
          )}
        </div>
      </div>

      {lightboxPhoto && createPortal(
        <div className="lightbox-overlay animate-fadeIn" onClick={() => setLightboxPhoto(null)}>
          <div style={{ width: "100%", maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "white", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                <MdImage size={15} style={{ color: "var(--accent)" }} /> {complaint.title}
              </p>
              <button onClick={() => setLightboxPhoto(null)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                  border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdClose size={17} />
              </button>
            </div>
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <img src={lightboxPhoto} alt="complaint"
                style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: "65vh" }} />
            </div>
            <p style={{ textAlign: "center", fontSize: 11, marginTop: 12, color: "rgba(255,255,255,0.3)" }}>
              {t("chatTapClose")}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>,
    document.body
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="pagination-wrap">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={15} /> Prev
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)} className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── CameraPortal ─────────────────────────────────────────────────────────────
function CameraPortal({ cameraError, cameraReady, cameraMode, videoRef, onFlip, onCapture, onClose, onGallery, labels }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return createPortal(
    <>
      <div className="fixed z-9998 bg-black/75 backdrop-blur-sm animate-fadeIn inset-0" onClick={onClose} aria-hidden="true" />
      <div className="fixed z-9999 inset-0 pointer-events-none flex items-end md:items-center md:justify-center">
        <div className="pointer-events-auto w-full rounded-t-2xl md:max-w-lg md:rounded-2xl bg-[#0d1b35] border border-white/10 shadow-2xl overflow-hidden animate-scaleIn"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="font-semibold text-sm flex items-center gap-2 text-white">
              <MdCameraAlt size={18} className="text-blue-400" /> {labels.title}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition">
              <MdClose size={20} />
            </button>
          </div>
          {cameraError && (
            <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {cameraError}
              <button type="button" onClick={onGallery} className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline mt-3">
                <MdPhotoLibrary size={14} /> {labels.errorGallery}
              </button>
            </div>
          )}
          {!cameraError && (
            <div className="relative bg-black overflow-hidden" style={{ minHeight: 240 }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full object-cover block"
                style={{ maxHeight: "50vh", transform: cameraMode === "user" ? "scaleX(-1)" : "none" }} />
              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                  <Spinner /><p className="text-xs text-white/50">{labels.startingCamera}</p>
                </div>
              )}
              {cameraReady && (
                <button type="button" onClick={onFlip}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition">
                  <MdFlipCameraAndroid size={20} />
                </button>
              )}
            </div>
          )}
          {!cameraError && (
            <div className="flex items-center justify-between px-8 py-5">
              <button type="button" onClick={onGallery} className="flex flex-col items-center gap-1.5 text-white/50 hover:text-white transition">
                <div className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10"><MdPhotoLibrary size={20} /></div>
                <span className="text-[11px]">{labels.gallery}</span>
              </button>
              <button type="button" onClick={onCapture} disabled={!cameraReady}
                className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all duration-150 ${cameraReady ? "bg-white hover:scale-95 active:scale-90 cursor-pointer shadow-lg shadow-white/20" : "bg-white/30 cursor-not-allowed"}`}>
                <div className="w-10 h-10 rounded-full bg-white border-2 border-black/15" />
              </button>
              <button type="button" onClick={onClose} className="flex flex-col items-center gap-1.5 text-white/50 hover:text-white transition">
                <div className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10"><MdClose size={20} /></div>
                <span className="text-[11px]">{labels.cancel}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── MobileComplaintCard ──────────────────────────────────────────────────────
function MobileComplaintCard({ c, unreadMap, confirmDeleteId, deletingId, onOpen, onPhotoOpen, onDelete, onCancelDelete, statusLabel, statusCfg, t }) {
  const sc     = statusCfg[c.status] || statusCfg.PENDING;
  const unread = unreadMap[c.id] || 0;
  return (
    <div onClick={() => onOpen(c, "details")} style={{ background: "var(--card-bg)",
      border: "1.5px solid var(--glass-border)", borderRadius: 18, overflow: "hidden", cursor: "pointer",
      boxShadow: "var(--shadow-sm)", transition: "box-shadow 0.2s, border-color 0.2s" }}>
      <div style={{ height: 3, background: getDot(c.status) }} />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0, flex: 1, lineHeight: 1.3 }}>
            {c.title}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <span className={`status-pill ${sc.pill}`}><sc.Icon size={11} /> {statusLabel(c.status)}</span>
            {(c.status === "OPEN" || c.status === "PENDING") && (
              confirmDeleteId === c.id ? (
                <div style={{ display: "flex", gap: 5, alignItems: "center" }} className="animate-fadeIn">
                  <button onClick={() => onDelete(c.id)} disabled={deletingId === c.id}
                    style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {deletingId === c.id ? <Spinner small /> : t("compConfirmYes")}
                  </button>
                  <button onClick={() => onCancelDelete()}
                    style={{ padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: "var(--card-inner-bg)", color: "var(--text-secondary)",
                      border: "1px solid var(--glass-border)", cursor: "pointer" }}>
                    {t("compConfirmNo")}
                  </button>
                </div>
              ) : (
                <button onClick={() => onDelete(c.id, true)}
                  style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--stat-red-bg)",
                    border: "1px solid var(--stat-red-border)", color: "var(--stat-red-color)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <MdDelete size={14} />
                </button>
              )
            )}
          </div>
        </div>
        {c.description && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {c.description}
          </p>
        )}
        {c.photo_url && (
          <div onClick={e => { e.stopPropagation(); onPhotoOpen(c.photo_url); }}
            style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--glass-border)",
              cursor: "pointer", position: "relative" }}>
            <img src={c.photo_url} alt="Complaint"
              style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 160 }} />
            <div style={{ position: "absolute", bottom: 6, right: 8, display: "flex", alignItems: "center", gap: 4,
              background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "2px 7px", backdropFilter: "blur(4px)" }}>
              <MdOpenInNew size={11} style={{ color: "#fff" }} />
              <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{t("noticesView")}</span>
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 6, borderTop: "1px solid var(--glass-border)" }} onClick={e => e.stopPropagation()}>
          {c.created_at && (
            <p style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center",
              gap: 4, margin: 0, opacity: 0.7 }}>
              <MdCalendarToday size={11} /> {formatDate(c.created_at)}
            </p>
          )}
          <div style={{ position: "relative" }}>
            {unread > 0 && (
              <span style={{ position: "absolute", top: -8, right: -8, minWidth: 18, height: 18,
                borderRadius: "50%", background: "linear-gradient(135deg, #25d366, #128c7e)",
                color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center",
                justifyContent: "center", padding: "0 4px", border: "2px solid var(--card-bg)",
                boxShadow: "0 2px 8px rgba(37,211,102,0.55)", zIndex: 2, letterSpacing: 0, lineHeight: 1,
                animation: "rcr-badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
            <button onClick={() => onOpen(c, "chat")} className={`rcr-discuss-btn ${unread > 0 ? "rcr-discuss-btn--shake" : ""}`}>
              <MdChat size={13} /><span>{t("chatDiscussion")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const LIMIT = 10;
const SKELETON_COUNT = 5;

export default function ResidentComplaints() {
  const { t }              = useLang();
  const { user: authUser } = useContext(AuthContext);
  const isMobile           = useIsMobile();

  const [showForm,      setShowForm]      = useState(false);
  const [hasFlat,       setHasFlat]       = useState(false);
  const [checkingFlat,  setCheckingFlat]  = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg,    setSuccessMsg]    = useState("");
  const [errorMsg,      setErrorMsg]      = useState("");
  const [formData,      setFormData]      = useState({ title: "", description: "" });

  // -- MULTI-FLAT SUPPORT --
  const [myFlats,        setMyFlats]        = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const isOwner = authUser?.resident_type === "OWNER";
  const eligibleFlats = myFlats.filter(item => {
    const flatObj = item.Flat || item;
    if (isOwner && flatObj.occupancy_status === "RENTED") return false;
    return true;
  });
  const hasEligibleFlat = eligibleFlats.length > 0;

  const MAX_DESC = 300;

  const [complaints,  setComplaints]  = useState([]);
  const [counts,      setCounts]      = useState({ ALL: 0, PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  const debouncedSearch   = useDebounce(search,   500);
  const debouncedDateFrom = useDebounce(dateFrom, 600);
  const debouncedDateTo   = useDebounce(dateTo,   600);

  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [showCamera,    setShowCamera]    = useState(false);
  const [cameraMode,    setCameraMode]    = useState("environment");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoFile,     setPhotoFile]     = useState(null);
  const [cameraError,   setCameraError]   = useState("");
  const [cameraReady,   setCameraReady]   = useState(false);
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const fileInputRef = useRef(null);

  const [deletingId,        setDeletingId]       = useState(null);
  const [confirmDeleteId,   setConfirmDeleteId]  = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [drawerDefaultTab,  setDrawerDefaultTab] = useState("details");
  const [lightboxUrl,       setLightboxUrl]       = useState(null);

  const [unreadMap, setUnreadMap] = useState({});

  const selectedRef         = useRef(selectedComplaint);
  const drawerDefaultTabRef = useRef(drawerDefaultTab);
  useEffect(() => { selectedRef.current         = selectedComplaint; }, [selectedComplaint]);
  useEffect(() => { drawerDefaultTabRef.current = drawerDefaultTab;  }, [drawerDefaultTab]);

  const complaintIdsRef = useRef([]);

  // --- STATUS CONFIGURATION ---
  const statusCfg = {
    RESOLVED:    { pill: "status-pill--resolved",   Icon: MdCheckCircle },
    IN_PROGRESS: { pill: "status-pill--inprogress", Icon: MdSchedule    },
    PENDING:     { pill: "status-pill--pending",    Icon: MdPending      },
    OPEN:        { pill: "status-pill--pending",    Icon: MdPending      },
  };

  const statusLabel = (s) =>
    s === "IN_PROGRESS" ? t("compStatusInProgress")
    : s === "RESOLVED"  ? t("compStatusResolved")
    :                     t("compStatusPending");

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !authUser?.society_id) return;
    socket.emit("join_society", authUser.society_id);
    return () => socket.emit("leave_society", authUser.society_id);
  }, [authUser?.society_id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !authUser) return;
    const handler = (comment) => {
      if (comment.user_id === authUser.id) return;
      const openedComplaint     = selectedRef.current;
      const isThisComplaintOpen = openedComplaint &&
        String(openedComplaint.id) === String(comment.complaint_id);
      const isOnChatTab = drawerDefaultTabRef.current === "chat";
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

  const seedUnreadMap = useCallback((data) => {
    setUnreadMap(prev => {
      const next = { ...prev };
      data.forEach(c => {
        if ((c.unread_count || 0) > (next[c.id] || 0)) next[c.id] = c.unread_count || 0;
        if (!(c.id in next)) next[c.id] = c.unread_count || 0;
      });
      return next;
    });
  }, []);

  const markRead = useCallback(async (complaintId) => {
    setUnreadMap(m => ({ ...m, [complaintId]: 0 }));
    try { await API.put(`/complaints/${complaintId}/read`); }
    catch (e) { console.error("[markRead]", e); }
  }, []);

  const openDrawer = useCallback((complaint, tab = "details") => {
    setDrawerDefaultTab(tab);
    setSelectedComplaint(complaint);
    if (tab === "chat") markRead(complaint.id);
    else setUnreadMap(m => ({ ...m, [complaint.id]: 0 }));
  }, [markRead]);

  // ─── FETCH FLATS ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser?.id) return;

    const fetchProperties = async () => {
      try {
        let flatsArr = [];

        // ATTEMPT 1: Try the memberships endpoint
        try {
          const res = await API.get(`/users/${authUser.id}/memberships`);
          const payload = res.data?.data || res.data;
          if (Array.isArray(payload) && payload.length > 0) {
            flatsArr = payload;
          } else if (payload && payload.all && Array.isArray(payload.all)) {
            flatsArr = payload.all;
          }
        } catch (err) {
          console.warn("[FetchProperties] Attempt 1 FAILED:", err.message);
        }

        // ATTEMPT 2: Fallback to get-flat endpoint
        if (flatsArr.length === 0) {
          try {
            const res = await API.get("/users/get-flat");
            const payload = res.data?.data || res.data;
            if (Array.isArray(payload)) {
              flatsArr = payload;
            } else if (payload && typeof payload === "object") {
              if (payload.units && Array.isArray(payload.units)) {
                flatsArr = payload.units;
              } else if (payload.flats && Array.isArray(payload.flats)) {
                flatsArr = payload.flats;
              } else if (payload.flat_number || payload.Flat) {
                flatsArr = [payload];
              }
            }
          } catch (err2) {
            console.warn("[FetchProperties] Attempt 2 FAILED:", err2.message);
          }
        }

        setMyFlats(flatsArr);
        setHasFlat(flatsArr.length > 0);

        if (flatsArr.length > 0 && !selectedFlatId) {
          const first = flatsArr[0];
          const fId = first.flat_id || first.id || first.Flat?.id;
          setSelectedFlatId(fId || "");
        }
      } catch (error) {
        console.error("Critical error fetching properties:", error);
        setHasFlat(false);
      } finally {
        setCheckingFlat(false);
      }
    };

    fetchProperties();
  }, [authUser]);

  useEffect(() => {
    if (!successMsg) return;
    const id = setTimeout(() => setSuccessMsg(""), 3500);
    return () => clearTimeout(id);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const id = setTimeout(() => setErrorMsg(""), 3500);
    return () => clearTimeout(id);
  }, [errorMsg]);

  const loadComplaints = useCallback(async (pageNum, currentFilter, currentSearch, currentDateFrom, currentDateTo, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pageNum, limit: LIMIT, filter: currentFilter,
        ...(currentSearch   ? { search:   currentSearch   } : {}),
        ...(currentDateFrom ? { dateFrom: currentDateFrom } : {}),
        ...(currentDateTo   ? { dateTo:   currentDateTo   } : {}),
      });
      const res = await API.get(`/complaints/my?${params}`);
      const data = res.data.data || [];
      setComplaints(data);
      setCounts(res.data.counts);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pageNum);
      seedUnreadMap(data);
    } catch (err) { console.error(err); }
    finally { setInitialLoad(false); setFetching(false); }
  }, [seedUnreadMap]);

  useEffect(() => { loadComplaints(1, "ALL", "", "", "", true); }, [loadComplaints]);
  useEffect(() => {
    if (initialLoad) return;
    loadComplaints(1, filterStatus, debouncedSearch, debouncedDateFrom, debouncedDateTo);
  }, [debouncedSearch, filterStatus, debouncedDateFrom, debouncedDateTo, initialLoad, loadComplaints]);

  const handleFilterChange = (f) => setFilterStatus(f);
  const handlePageChange   = (p) => loadComplaints(p, filterStatus, debouncedSearch, debouncedDateFrom, debouncedDateTo);
  const clearDateFilter    = () => { setDateFrom(""); setDateTo(""); };
  const handleClearAll     = () => { setSearch(""); setFilterStatus("ALL"); setDateFrom(""); setDateTo(""); };

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  const startCamera = async (mode = cameraMode) => {
    setCameraError(""); setCameraReady(false); stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { videoRef.current.play(); setCameraReady(true); };
      }
    } catch (err) {
      if (err.name === "NotAllowedError")    setCameraError(t("camErrPermission"));
      else if (err.name === "NotFoundError") setCameraError(t("camErrNotFound"));
      else                                   setCameraError(t("camErrGeneral"));
    }
  };
  const openCamera   = () => { setCapturedPhoto(null); setPhotoFile(null); setShowCamera(true); setTimeout(() => startCamera(cameraMode), 150); };
  const closeCamera  = () => { stopStream(); setShowCamera(false); setCameraReady(false); setCameraError(""); };
  const flipCamera   = () => { const next = cameraMode === "environment" ? "user" : "environment"; setCameraMode(next); startCamera(next); };
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (cameraMode === "user") { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    const file    = dataURLtoFile(dataUrl, "camera-photo.jpg");
    setPhotoFile(file);
    setCapturedPhoto(URL.createObjectURL(file));
    stopStream(); setShowCamera(false); setCameraReady(false);
  };
  useEffect(() => () => stopStream(), []);

  const handleFileUpload = (e) => {
    const sel = e.target.files?.[0];
    if (!sel) return;
    if (!sel.type.startsWith("image/"))  { setErrorMsg(t("compErrInvalidImage")); return; }
    if (sel.size > 5 * 1024 * 1024)      { setErrorMsg(t("compErrImageSize"));    return; }
    setPhotoFile(sel);
    setCapturedPhoto(URL.createObjectURL(sel));
    e.target.value = "";
  };
  const clearPhoto = () => {
    if (capturedPhoto?.startsWith("blob:")) URL.revokeObjectURL(capturedPhoto);
    setCapturedPhoto(null); setPhotoFile(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({ title: "", description: "" });
    clearPhoto();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasFlat) return;

    if (isOwner && !selectedFlatId) {
      setErrorMsg("Please select a unit for this complaint.");
      return;
    }

    try {
      setSubmitLoading(true);
      const form = new FormData();
      form.append("title", formData.title.trim());
      form.append("description", formData.description.trim());

      if (isOwner) {
        form.append("flat_id", selectedFlatId);
      }

      if (photoFile) form.append("photo", photoFile);
      await API.post("/complaints", form, { headers: { "Content-Type": "multipart/form-data" } });
      setFormData({ title: "", description: "" });

      if (isOwner && myFlats.length > 1) setSelectedFlatId("");

      clearPhoto();
      setShowForm(false);
      setSuccessMsg(t("compSubmitSuccess"));
      loadComplaints(1, filterStatus, debouncedSearch, debouncedDateFrom, debouncedDateTo);
    } catch (err) {
      console.error("Submit error:", err);
      setErrorMsg(t("compSubmitFail"));
    } finally { setSubmitLoading(false); }
  };

  const handleDelete = async (id, confirmOnly = false) => {
    if (confirmOnly) { setConfirmDeleteId(id); return; }
    try {
      setDeletingId(id);
      await API.delete(`/complaints/${id}`);
      setSuccessMsg(t("compDeleteSuccess"));
      loadComplaints(page, filterStatus, debouncedSearch, debouncedDateFrom, debouncedDateTo);
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMsg(t("compDeleteFail"));
    } finally { setDeletingId(null); setConfirmDeleteId(null); }
  };

  const hasDateFilter = dateFrom || dateTo;
  const filterTabs = [
    { key: "ALL",         label: t("compTabAll"),         count: counts.ALL         },
    { key: "PENDING",     label: t("compStatusPending"),  count: counts.PENDING     },
    { key: "IN_PROGRESS", label: t("compTabInProgress"),  count: counts.IN_PROGRESS },
    { key: "RESOLVED",    label: t("compStatusResolved"), count: counts.RESOLVED    },
  ];
  const pillVariant = {
    ALL: "complaint-filter-pill--all", PENDING: "complaint-filter-pill--pending",
    IN_PROGRESS: "complaint-filter-pill--inprogress", RESOLVED: "complaint-filter-pill--resolved",
  };
  const cameraLabels = {
    title: t("camTitle"), startingCamera: t("camStarting"),
    gallery: t("camGallery"), cancel: t("cancel"), errorGallery: t("camErrorGallery"),
  };

  const isEmpty    = !initialLoad && counts.ALL === 0;
  const noMatch    = !initialLoad && counts.ALL > 0 && complaints.length === 0 && !fetching;
  const hasResults = !initialLoad && complaints.length > 0;

  // ─── Helper: get floor number from flat item (handles nested structures) ────
  const getFloorNumber = (item) => {
    const flatObj = item.Flat || item;
    // Check all possible locations the floor_number could live
    return (
      flatObj.floor_number          ??
      flatObj.Floor?.floor_number   ??
      item.floor_number             ??
      null
    );
  };

  return (
    <>
      <style>{`
        @keyframes rcr-badge-pop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="page-root animate-fadeIn">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="er-icon er-icon--complaint"><MdReportProblem size={22} /></div>
            <div>
              <h2 className="page-title">{t("compTitle")}</h2>
              <p className="page-subtitle">
                {initialLoad ? <SkeletonBlock width={60} height={12} /> : `${counts.ALL} ${t("compCount")}`}
              </p>
            </div>
          </div>
          <button onClick={() => hasEligibleFlat && setShowForm(p => !p)} disabled={!hasEligibleFlat || initialLoad}
            className="btn-primary"
            style={{ opacity: (hasEligibleFlat && !initialLoad) ? 1 : 0.5, cursor: (hasEligibleFlat && !initialLoad) ? "pointer" : "not-allowed" }}>
            <MdAdd size={18} /> {t("compAddBtn")}
          </button>
        </div>

        {successMsg && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--stat-green-bg)", border: "1px solid var(--stat-green-border)",
            borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "var(--stat-green-color)" }}
            className="animate-fadeIn">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} style={{ marginLeft: 12, opacity: 0.6,
              background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", alignItems: "center" }}>
              <MdClose size={16} />
            </button>
          </div>
        )}
        {errorMsg && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)",
            borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "var(--stat-red-color)" }}
            className="animate-fadeIn">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} style={{ marginLeft: 12, opacity: 0.6,
              background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", alignItems: "center" }}>
              <MdClose size={16} />
            </button>
          </div>
        )}

        {!checkingFlat && !hasEligibleFlat && (
          <div style={{ background: "var(--stat-amber-bg)", border: "1px solid var(--stat-amber-border)",
            borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "var(--stat-amber-color)" }}>
            ⚠️ {isOwner && myFlats.length > 0 ? "You cannot raise complaints for rented units." : t("compNoFlat")}
          </div>
        )}

        {/* ── Create Complaint Modal — rendered via portal so fixed positioning works ── */}
        {showForm && hasEligibleFlat && createPortal(
          <div
            onClick={closeForm}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              className="animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "500px",
                background: "var(--card-bg)",
                border: "1.5px solid var(--glass-border)",
                borderRadius: "20px",
                boxShadow: "var(--shadow-glass)",
                display: "flex",
                flexDirection: "column",
                maxHeight: "85vh",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--glass-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}>
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  margin: 0,
                }}>
                  <MdReportProblem size={20} style={{ color: "var(--accent)" }} />
                  {t("compFormTitle")}
                </h2>
                <button
                  onClick={closeForm}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <MdClose size={18} />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                overflowY: "auto",
              }}>

                {/* Unit selector — owners only */}
                {isOwner && myFlats.length > 0 && (
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "6px",
                    }}>
                      Select Unit <span style={{ color: "var(--stat-red-color)" }}>*</span>
                    </label>
                    <select
                      className="input"
                      style={{ height: "46px", width: "100%", cursor: "pointer" }}
                      value={selectedFlatId}
                      onChange={(e) => setSelectedFlatId(e.target.value)}
                      required
                    >
                      <option value="" disabled>-- Choose the affected unit --</option>
                      {eligibleFlats.map((item, index) => {
                        const flatObj = item.Flat || item;
                        const fId     = item.flat_id || flatObj.id || `fallback-${index}`;
                        const bName   = flatObj.Block?.name || item.block_name || flatObj.block_name || "";
                        const fNum    = flatObj.flat_number || item.flat_number || "";

                        // ✅ FIX: robustly resolve floor number from all possible nesting levels
                        const floorNum = getFloorNumber(item);
                        const typeLabel = floorNum !== null && floorNum !== undefined
                          ? `(Floor ${floorNum})`
                          : "";

                        return (
                          <option key={fId} value={fId}>
                            {bName ? `${bName} - ` : ""}Unit {fNum} {typeLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div>
                  <input className="input" style={{ height: 46 }} placeholder={t("compTitlePlaceholder")}
                    value={formData.title} maxLength={100}
                    onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, textAlign: "right" }}>
                    {formData.title.length}/100
                  </p>
                </div>

                {/* Description */}
                <div>
                  <textarea className="input" style={{ resize: "none", minHeight: 90 }} rows={4}
                    placeholder={t("compDescPlaceholder")} value={formData.description}
                    onChange={e => { if (e.target.value.length <= MAX_DESC) setFormData({ ...formData, description: e.target.value }); }}
                    required />
                  <p style={{ fontSize: 11, marginTop: 4, textAlign: "right",
                    color: formData.description.length >= MAX_DESC ? "var(--stat-red-color)" : "var(--text-secondary)" }}>
                    {formData.description.length}/{MAX_DESC}
                  </p>
                </div>

                {/* Photo */}
                <div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8,
                    display: "flex", alignItems: "center", gap: 6 }}>
                    <MdCameraAlt size={14} /> {t("compPhotoLabel")} <span style={{ opacity: 0.5 }}>({t("compPhotoOptional")})</span>
                  </p>
                  {!capturedPhoto && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button type="button" onClick={openCamera}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 12,
                          background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)",
                          color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
                        <MdCameraAlt size={17} /> {t("compTakePhoto")}
                      </button>
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 12,
                          background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)",
                          color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
                        <MdPhotoLibrary size={17} /> {t("compUploadGallery")}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
                    </div>
                  )}
                  {capturedPhoto && (
                    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }} className="animate-fadeIn">
                      <img src={capturedPhoto} alt="Complaint photo"
                        style={{ borderRadius: 12, border: "1.5px solid var(--glass-border)",
                          objectFit: "cover", maxHeight: 220, width: "100%", display: "block" }} />
                      <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => { clearPhoto(); openCamera(); }}
                          style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.6)",
                            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", cursor: "pointer" }}>
                          <MdFlipCameraAndroid size={15} />
                        </button>
                        <button type="button" onClick={clearPhoto}
                          style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(220,38,38,0.75)",
                            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", cursor: "pointer" }}>
                          <MdDelete size={15} />
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                        📎 {photoFile?.name || t("compPhotoAttached")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  <button type="submit" className="btn-primary" style={{ height: 42, flex: 1, justifyContent: "center" }} disabled={submitLoading}>
                    {submitLoading
                      ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner small /> {t("compSubmitting")}</span>
                      : t("compSubmitBtn")}
                  </button>
                  <button type="button" onClick={() => { closeForm(); closeCamera(); }}
                    style={{ height: 42, padding: "0 16px", borderRadius: 999, background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
                    {t("cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {showCamera && (
          <CameraPortal cameraError={cameraError} cameraReady={cameraReady} cameraMode={cameraMode} videoRef={videoRef}
            onFlip={flipCamera} onCapture={capturePhoto} onClose={closeCamera} labels={cameraLabels}
            onGallery={() => { closeCamera(); setTimeout(() => fileInputRef.current?.click(), 300); }} />
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {initialLoad
          ? <StatCardsSkeleton isMobile={isMobile} />
          : counts.ALL > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 12 }}>
              {[
                { label: t("compStatTotal"),      count: counts.ALL,         cls: "complaint-stat-total"      },
                { label: t("compStatusPending"),  count: counts.PENDING,     cls: "complaint-stat-pending"    },
                { label: t("compTabInProgress"),  count: counts.IN_PROGRESS, cls: "complaint-stat-inprogress" },
                { label: t("compStatusResolved"), count: counts.RESOLVED,    cls: "complaint-stat-resolved"   },
              ].map((s) => (
                <div key={s.label} className={`complaint-stat-card ${s.cls}`}>
                  <span className="complaint-stat-val">{s.count}</span>
                  <span className="complaint-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )
        }

        {!initialLoad && counts.ALL > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <MdSearch size={17} style={{ position: "absolute", left: 12, top: "50%",
                transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
              <input className="input"
                style={{ paddingLeft: 38, paddingRight: fetching || search ? 38 : 12, height: 42 }}
                placeholder={t("compSearch")} value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                {fetching ? <Spinner small /> : search ? (
                  <button onClick={() => setSearch("")} style={{ background: "none", border: "none",
                    cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                    <MdClose size={15} />
                  </button>
                ) : null}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <MdCalendarToday size={15} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
              <input type="date" className="complaint-date-input" style={{ flex: 1, minWidth: 120 }}
                value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>{t("compDateTo")}</span>
              <input type="date" className="complaint-date-input" style={{ flex: 1, minWidth: 120 }}
                value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} />
              {hasDateFilter && (
                <button onClick={clearDateFilter} style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <MdClose size={14} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <MdFilterList size={18} style={{ color: "var(--text-secondary)" }} />
              {filterTabs.map(tab => (
                <button key={tab.key} onClick={() => handleFilterChange(tab.key)}
                  className={`complaint-filter-pill ${pillVariant[tab.key]} ${filterStatus === tab.key ? "active" : ""}`}>
                  {tab.label}<span className="complaint-filter-pill-count">{tab.count}</span>
                </button>
              ))}
              {hasDateFilter && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                  borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--stat-purple-bg)",
                  color: "var(--stat-purple-color)", border: "1px solid var(--stat-purple-border)" }}>
                  <MdCalendarToday size={11} />
                  {dateFrom ? formatDate(dateFrom) : t("compDateStart")} — {dateTo ? formatDate(dateTo) : t("compDateEnd")}
                  <button onClick={clearDateFilter} style={{ background: "none", border: "none", cursor: "pointer",
                    color: "inherit", display: "flex", alignItems: "center", marginLeft: 2, padding: 0 }}>
                    <MdClose size={11} />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="data-table-wrap">
          {initialLoad && (
            isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14 }}>
                {[...Array(SKELETON_COUNT)].map((_, i) => <MobileComplaintSkeleton key={i} />)}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>#</th><th>{t("compColTitle")}</th><th>{t("compColDesc")}</th>
                      <th>{t("compColPhoto")}</th><th>{t("billStatusCol")}</th>
                      <th>{t("compColDate")}</th><th>{t("billActionCol")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(SKELETON_COUNT)].map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
                  </tbody>
                </table>
              </div>
            )
          )}

          {isEmpty && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "70px 20px" }} className="animate-fadeIn">
              <MdOutlineInbox size={48} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("compEmpty")}</p>
              {hasFlat && <button onClick={() => setShowForm(true)} className="btn-primary"><MdAdd size={16} /> {t("compFirstBtn")}</button>}
            </div>
          )}

          {noMatch && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px" }} className="animate-fadeIn">
              <MdSearch size={36} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("compNoMatch")}</p>
              <button onClick={handleClearAll} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                {t("compClearAll")}
              </button>
            </div>
          )}

          {hasResults && (
            <>
              {isMobile && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14 }}>
                  {complaints.map((c, idx) => (
                    <div key={c.id} className="animate-fadeIn" style={{ animationDelay: `${idx * 40}ms` }}>
                      <MobileComplaintCard
                        c={c} unreadMap={unreadMap} confirmDeleteId={confirmDeleteId} deletingId={deletingId}
                        onOpen={openDrawer} onPhotoOpen={url => setLightboxUrl(url)}
                        onDelete={handleDelete} onCancelDelete={() => setConfirmDeleteId(null)}
                        statusLabel={statusLabel} statusCfg={statusCfg} t={t}
                      />
                    </div>
                  ))}
                  <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}
              {!isMobile && (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th>#</th><th>{t("compColTitle")}</th><th>{t("compColDesc")}</th>
                        <th>{t("compColPhoto")}</th><th>{t("billStatusCol")}</th>
                        <th>{t("compColDate")}</th><th>{t("billActionCol")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((c, idx) => {
                        const sc     = statusCfg[c.status] || statusCfg.PENDING;
                        const unread = unreadMap[c.id] || 0;
                        return (
                          <tr key={c.id} onClick={() => openDrawer(c, "details")}>
                            <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{(page - 1) * LIMIT + idx + 1}</td>
                            <td style={{ maxWidth: 180 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 3, height: 32, borderRadius: 99, background: getDot(c.status), flexShrink: 0 }} />
                                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  display: "block", maxWidth: 160 }}>{c.title}</span>
                              </div>
                            </td>
                            <td style={{ maxWidth: 200 }}>
                              <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 190 }}>
                                {c.description}
                              </span>
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              {c.photo_url ? (
                                <div style={{ width: 54, height: 38, borderRadius: 10, overflow: "hidden",
                                  border: "1.5px solid var(--glass-border)", cursor: "pointer" }}
                                  onClick={() => setLightboxUrl(c.photo_url)}>
                                  <img src={c.photo_url} alt="Complaint" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                              ) : <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.35 }}>—</span>}
                            </td>
                            <td>
                              <span className={`status-pill ${sc.pill}`}><sc.Icon size={11} /> {statusLabel(c.status)}</span>
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(c.created_at)}</td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ position: "relative" }}>
                                  {unread > 0 && (
                                    <span style={{ position: "absolute", top: -7, right: -7, minWidth: 18, height: 18,
                                      borderRadius: "50%", background: "linear-gradient(135deg, #25d366, #128c7e)",
                                      color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center",
                                      justifyContent: "center", padding: "0 4px", border: "2px solid var(--card-bg)",
                                      boxShadow: "0 2px 8px rgba(37,211,102,0.55)", zIndex: 2, letterSpacing: 0, lineHeight: 1,
                                      animation: "rcr-badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                                      {unread > 99 ? "99+" : unread}
                                    </span>
                                  )}
                                  <button onClick={() => openDrawer(c, "chat")} className={`rcr-discuss-btn ${unread > 0 ? "rcr-discuss-btn--shake" : ""}`}>
                                    <MdChat size={13} /><span>{t("chatDiscussion")}</span>
                                  </button>
                                </div>
                                {(c.status === "OPEN" || c.status === "PENDING") && (
                                  confirmDeleteId === c.id ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }} className="animate-fadeIn">
                                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("billSure")}</span>
                                      <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                                        style={{ padding: "4px 10px", borderRadius: 8, background: "#dc2626", color: "#fff",
                                          fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                                          display: "flex", alignItems: "center", gap: 4 }}>
                                        {deletingId === c.id ? <Spinner small /> : t("compConfirmYes")}
                                      </button>
                                      <button onClick={() => setConfirmDeleteId(null)}
                                        style={{ padding: "4px 8px", borderRadius: 8, fontSize: 11,
                                          background: "var(--card-inner-bg)", color: "var(--text-secondary)",
                                          border: "1px solid var(--glass-border)", cursor: "pointer" }}>
                                        {t("compConfirmNo")}
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setConfirmDeleteId(c.id)}
                                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                                        borderRadius: 10, background: "var(--stat-red-bg)", color: "var(--stat-red-color)",
                                        border: "1px solid var(--stat-red-border)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                      <MdDelete size={13} /> {t("billDelete")}
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="table-footer">
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {t("billShowing")} {complaints.length} {t("billOf")} {totalItems} {t("compCount")}
                      {hasDateFilter && <span style={{ marginLeft: 8, color: "var(--stat-purple-color)", fontWeight: 600 }}>· {t("compFilteredByDate")}</span>}
                    </span>
                    <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedComplaint && (
        <ComplaintDrawer
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          currentUser={authUser}
          t={t}
          defaultTab={drawerDefaultTab}
          onMarkRead={markRead}
          statusCfg={statusCfg}
        />
      )}

      {lightboxUrl && createPortal(
        <div className="lightbox-overlay animate-fadeIn" onClick={() => setLightboxUrl(null)}>
          <div style={{ width: "100%", maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 12 }}>
              <button onClick={() => setLightboxUrl(null)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                  border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdClose size={17} />
              </button>
            </div>
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <img src={lightboxUrl} alt="Complaint" style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: "70vh" }} />
            </div>
            <p style={{ textAlign: "center", fontSize: 11, marginTop: 12, color: "rgba(255,255,255,0.3)" }}>
              {t("chatTapClose")}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}