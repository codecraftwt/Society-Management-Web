import { useEffect, useState, useContext } from "react";
import { MdNotifications, MdClose } from "react-icons/md";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import socket from "../../services/socket";

export default function NotificationBell() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [notifications,    setNotifications]    = useState([]);
  const [open,             setOpen]             = useState(false);
  const [actionLoading,    setActionLoading]    = useState({});
  const [rejectTarget,     setRejectTarget]     = useState(null);
  const [rejectReason,     setRejectReason]     = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  /* ═══════════════════════
     LOAD NOTIFICATIONS
  ═══════════════════════ */
  const loadNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data || []);
    } catch (err) {
      console.error("[NotificationBell] Load failed:", err);
    }
  };

  useEffect(() => {
    loadNotifications();

    if (user?.id) {
      socket.emit("join", {
        userId: user.id,
        role: user.activeRole ?? user.role,
        societyId: user.society_id,
      });
    }

    const onNew = (notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      toast.info(`${notification.title}\n${notification.message}`, {
        position: "top-right",
        autoClose: 6000,
        theme: "colored",
      });
    };

    socket.on("new_notification", onNew);
    return () => socket.off("new_notification", onNew);
  }, [user]);

  /* ═══════════════════════
     MARK READ
  ═══════════════════════ */
  const markRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("[NotificationBell] markRead failed:", err);
      loadNotifications();
    }
  };

  /* ═══════════════════════
     APPROVE RESIDENT
  ═══════════════════════ */
  const approve = async (userId, notificationId) => {
    setActionLoading((prev) => ({ ...prev, [notificationId]: "approving" }));
    try {
      await API.put(`/admin/approve-resident/${userId}`);
      await markRead(notificationId);
    } catch (err) {
      console.error("[NotificationBell] approve failed:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notificationId]: null }));
    }
  };

  /* ═══════════════════════
     REJECT RESIDENT
  ═══════════════════════ */
  const openRejectModal = (userId, notificationId) => {
    setRejectTarget({ userId, notificationId });
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejectSubmitting(true);
    try {
      await API.put(`/admin/reject-resident/${rejectTarget.userId}`, {
        reason: rejectReason.trim() || undefined,
      });
      await markRead(rejectTarget.notificationId);
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      console.error("[NotificationBell] reject failed:", err);
    } finally {
      setRejectSubmitting(false);
    }
  };

  /* ═══════════════════════
     CLEAR ALL
  ═══════════════════════ */
  const clearAll = async () => {
    try {
      await API.delete("/notifications/clear");
      setNotifications([]);
      setOpen(false);
    } catch (err) {
      console.error("[NotificationBell] clearAll failed:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const isAdmin =
    user?.activeRole === "SOCIETY_ADMIN" || user?.role === "SOCIETY_ADMIN";

  // Action types that have their own dedicated button
  const HAS_OWN_BUTTON = new Set([
    "VIEW_NOTICE",
    "VIEW_COMPLAINT",
    "VIEW_VISITOR",
    "VIEW_PARKING",
  ]);

  return (
    <>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(true)}
        className="relative"
        style={{ color: "var(--text-primary)" }}
      >
        <MdNotifications size={26} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 rounded-full min-w-4.5 text-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ═══════════════════════════════════════════
         REJECT REASON MODAL
      ═══════════════════════════════════════════ */}
      {rejectTarget &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 99999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="relative bg-card rounded-xl shadow-xl"
              style={{
                width: "94%", maxWidth: 400, padding: "1.5rem",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setRejectTarget(null)}
                style={{
                  position: "absolute", top: 14, right: 14,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <MdClose size={18} />
              </button>

              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                Reject Registration
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.6 }}>
                Provide a reason for rejection. This will be shown to the resident
                on their registration status screen and sent by email.
              </p>

              <textarea
                rows={3}
                placeholder="e.g. Flat already occupied, documents missing, invalid details…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-primary)", fontSize: 13,
                  resize: "vertical", outline: "none",
                  boxSizing: "border-box", fontFamily: "inherit",
                }}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => setRejectTarget(null)}
                  style={{
                    flex: 1, height: 40, borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent", color: "var(--text-secondary)",
                    cursor: "pointer", fontSize: 13, fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  disabled={rejectSubmitting}
                  style={{
                    flex: 1, height: 40, borderRadius: 9, border: "none",
                    background: rejectSubmitting
                      ? "#8C8795"
                      : "linear-gradient(135deg,#dc2626,#ef4444)",
                    color: "#fff",
                    cursor: rejectSubmitting ? "not-allowed" : "pointer",
                    fontSize: 13, fontWeight: 700,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 6,
                  }}
                >
                  {rejectSubmitting ? (
                    <>
                      <svg style={{ width: 14, height: 14, animation: "spin 0.7s linear infinite" }}
                        viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                        <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Rejecting…
                    </>
                  ) : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ═══════════════════════════════════════════
         NOTIFICATIONS PANEL
      ═══════════════════════════════════════════ */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 modal-overlay" onClick={() => setOpen(false)} />

            {/* Panel */}
            <div
              className="relative bg-card w-[95%] max-w-lg rounded-xl shadow-xl"
              style={{
                color: "var(--text-primary)",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
              <div
                className="flex justify-between items-center p-4 shrink-0"
                style={{ borderBottom: "1px solid var(--divider)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "1px 8px",
                      borderRadius: 999, background: "rgba(239,68,68,0.15)",
                      color: "#f87171",
                    }}>
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={clearAll} className="text-accent text-sm hover:underline">
                    Clear All
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-secondary)", display: "flex",
                    }}
                  >
                    <MdClose size={18} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="p-4 space-y-3 overflow-y-auto scrollbar-hide" style={{ flex: 1 }}>
                {notifications.length === 0 && (
                  <p className="text-secondary text-center text-sm py-8">
                    No notifications yet
                  </p>
                )}

                {notifications.map((n) => {
                  const actionState = actionLoading[n.id];
                  return (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border transition ${
                        n.is_read
                          ? "border-(--glass-border)"
                          : "bg-blue-500/10 border-blue-400"
                      }`}
                      style={n.is_read ? { background: "var(--card-inner-bg)" } : {}}
                    >
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {n.title}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {n.message}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </p>

                      {/* ── RESIDENT REQUEST — Approve / Reject ── */}
                      {isAdmin && n.type === "RESIDENT_REQUEST" && !n.is_read && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => approve(n.user_id, n.id)}
                            disabled={!!actionState}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "6px 14px", borderRadius: 8,
                              fontSize: 13, fontWeight: 700,
                              background: actionState === "approving"
                                ? "#8C8795"
                                : "linear-gradient(135deg,#16a34a,#22c55e)",
                              color: "#fff", border: "none",
                              cursor: actionState ? "not-allowed" : "pointer",
                              boxShadow: "0 2px 8px rgba(22,163,74,0.30)",
                            }}
                          >
                            {actionState === "approving" ? (
                              <>
                                <svg style={{ width: 12, height: 12, animation: "spin 0.7s linear infinite" }}
                                  viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                                  <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Approving…
                              </>
                            ) : "✅ Accept"}
                          </button>
                          <button
                            onClick={() => openRejectModal(n.user_id, n.id)}
                            disabled={!!actionState}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "6px 14px", borderRadius: 8,
                              fontSize: 13, fontWeight: 700,
                              background: "linear-gradient(135deg,#dc2626,#ef4444)",
                              color: "#fff", border: "none",
                              cursor: actionState ? "not-allowed" : "pointer",
                              boxShadow: "0 2px 8px rgba(239,68,68,0.28)",
                            }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}

                      {/* ── VIEW NOTICE ── */}
                      {n.action_type === "VIEW_NOTICE" && !n.is_read && (
                        <button
                          onClick={() => {
                            markRead(n.id);
                            navigate(n.action_route);
                            setOpen(false);
                          }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            marginTop: 10, padding: "5px 14px", borderRadius: 8,
                            fontSize: 12, fontWeight: 600,
                            background: "linear-gradient(135deg,rgba(107,70,193,0.20),rgba(91,141,239,0.20))",
                            border: "1px solid rgba(107,70,193,0.35)",
                            color: "#9F87D7", cursor: "pointer",
                          }}
                        >
                          📋 View Notice
                        </button>
                      )}

                      {/* ── VIEW COMPLAINT ── */}
                      {n.action_type === "VIEW_COMPLAINT" && !n.is_read && (
                        <button
                          onClick={() => { markRead(n.id); navigate(n.action_route); setOpen(false); }}
                          className="bg-blue-500 px-3 py-1 mt-3 rounded text-sm text-white"
                        >
                          View Complaint
                        </button>
                      )}

                      {/* ── VIEW VISITOR ── */}
                      {n.action_type === "VIEW_VISITOR" && !n.is_read && (
                        <button
                          onClick={() => { markRead(n.id); navigate(n.action_route); setOpen(false); }}
                          className="bg-purple-500 px-3 py-1 mt-3 rounded text-sm text-white"
                        >
                          View Visitor
                        </button>
                      )}

                      {/* ── VIEW PARKING ── */}
                      {n.action_type === "VIEW_PARKING" && !n.is_read && (
                        <button
                          onClick={() => { markRead(n.id); navigate(n.action_route); setOpen(false); }}
                          className="bg-yellow-600 px-3 py-1 mt-3 rounded text-sm text-white"
                        >
                          View Parking
                        </button>
                      )}

                      {/* ── VIEW DOCUMENT ── */}
                      {n.type === "DOCUMENT" && !n.is_read && (
                        <button
                          onClick={() => { markRead(n.id); navigate("/resident/society_documents"); setOpen(false); }}
                          className="bg-blue-600 px-3 py-1 mt-3 rounded text-sm text-white"
                        >
                          View Document
                        </button>
                      )}

                      {/* ── GENERIC MARK READ (fallback for types with no dedicated button) ── */}
                      {!n.is_read &&
                        n.type !== "RESIDENT_REQUEST" &&
                        !HAS_OWN_BUTTON.has(n.action_type) &&
                        n.type !== "DOCUMENT" && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-xs text-accent mt-2 hover:underline block"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                          >
                            Mark as read
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}