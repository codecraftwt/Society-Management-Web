import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { getSocket } from "../../../services/socket";
import { isCommitteeMember } from "../../../utils/permissions";
import { toast } from "react-toastify";
import {
  MdAttachFile, MdChat, MdClose, MdDelete, MdDownload, MdFilePresent, MdSend, MdVisibility,
} from "react-icons/md";
import { formatTime } from "../complaintHelpers.js";
import { Spinner } from "../complaintPieces.jsx";

/* ── ChatPanel ─────────────────────────────────────────────────────────────────
   Kept exactly as-is — all comment logic / socket events are unchanged. */
export default function ChatPanel({ complaintId, societyId, currentUser, onIncomingMessage }) {
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
    if (f.size > 10 * 1024 * 1024) { toast.warning("Max file size is 10 MB"); return; }
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
          border: "1.5px solid var(--glass-border)", maxWidth: 220 }}
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
        background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)",
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
        {comments.length > 0 && !isCommitteeMember(currentUser) && (
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