import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MdApartment, MdAttachFile, MdCalendarToday, MdChat, MdCheckCircle,
  MdMoreHoriz, MdOpenInNew, MdPerson, MdPublic, MdReportProblem,
  MdSchedule, MdVisibility, MdHome,
} from "react-icons/md";
import { AuthContext } from "../../../context/AuthContext";
import styles from "../Complaint.module.css";
import { flatLabel, formatDate } from "../complaintHelpers.js";
import { Spinner, StatusPill } from "../complaintPieces.jsx";

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

  const calculatePosition = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return null;

    const estimatedHeight = menuRef.current?.offsetHeight || 165;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;

    // Flip upwards if space below is insufficient and there is more room above
    const openUpwards = spaceBelow < estimatedHeight + 10 && spaceAbove > spaceBelow;

    const right = Math.max(12, window.innerWidth - r.right);
    const top = openUpwards ? undefined : Math.min(window.innerHeight - estimatedHeight - 12, r.bottom + 6);
    const bottom = openUpwards ? Math.max(12, window.innerHeight - r.top + 6) : undefined;

    return { top, bottom, right, openUpwards };
  };

  const openMenu = () => {
    const p = calculatePosition();
    if (p) setPos(p);
    setOpen(true);
  };

  const closeMenu = () => { setOpen(false); setPos(null); };

  useEffect(() => {
    if (!open) return;

    // Refine position with actual rendered DOM height
    const refined = calculatePosition();
    if (refined) {
      setPos(prev => {
        if (prev?.top === refined.top && prev?.bottom === refined.bottom && prev?.right === refined.right) return prev;
        return refined;
      });
    }

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

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className={styles.menuDropdown}
          style={{
            position: "fixed",
            zIndex: 99999,
            top: pos.top !== undefined ? `${pos.top}px` : "auto",
            bottom: pos.bottom !== undefined ? `${pos.bottom}px` : "auto",
            right: `${pos.right}px`,
            maxHeight: "calc(100vh - 24px)",
            overflowY: "auto",
          }}
          role="menu"
        >
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

/* ── Mobile & Grid Card ──────────────────────────────────────────────────────── */
export default function MobileComplaintCard({
  c,
  updateStatus,
  updatingId,
  t,
  onOpen,
  onPhotoClick,
  unreadMap,
  commentCount,
  isSuperAdmin: propIsSuperAdmin,
}) {
  const { user: authUser } = useContext(AuthContext);
  const isSuper = propIsSuperAdmin ?? (authUser?.activeRole === "SUPER_ADMIN" || authUser?.role === "SUPER_ADMIN");
  const hasUnread = (unreadMap[c.id] || 0) > 0;
  const societyName = c.Society?.name || c.society_name;
  const residentName = c.User?.name || "Resident";
  const residentInitial = residentName.charAt(0).toUpperCase();
  const unit = flatLabel(c, t);

  const isPending    = c.status === "OPEN" || c.status === "PENDING";
  const isInProgress = c.status === "IN_PROGRESS";
  const isResolved   = c.status === "RESOLVED";

  return (
    <div
      onClick={() => onOpen(c, "details")}
      className={`${styles.mcard} group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "18px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "100%",
        boxShadow: "0 4px 18px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "13px", flex: 1 }}>
        {/* Top: Icon + Title & Date + Status Pill */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "13px",
                background: isResolved
                  ? "rgba(34, 197, 94, 0.12)"
                  : isInProgress
                  ? "rgba(59, 130, 246, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
                color: isResolved
                  ? "#22c55e"
                  : isInProgress
                  ? "#3b82f6"
                  : "#ef4444",
                border: `1.5px solid ${
                  isResolved
                    ? "rgba(34, 197, 94, 0.28)"
                    : isInProgress
                    ? "rgba(59, 130, 246, 0.28)"
                    : "rgba(239, 68, 68, 0.28)"
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: "1px",
                boxShadow: isResolved
                  ? "0 2px 8px rgba(34, 197, 94, 0.15)"
                  : isInProgress
                  ? "0 2px 8px rgba(59, 130, 246, 0.15)"
                  : "0 2px 8px rgba(239, 68, 68, 0.15)",
              }}
            >
              <MdReportProblem size={20} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {c.title}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <MdCalendarToday size={11} style={{ opacity: 0.7 }} /> {formatDate(c.created_at)}
                </span>
                {c.priority && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      ...(c.priority === "HIGH"
                        ? { background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.25)" }
                        : c.priority === "MEDIUM"
                        ? { background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.25)" }
                        : { background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.25)" }),
                    }}
                  >
                    {c.priority}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <StatusPill status={c.status} t={t} />
          </div>
        </div>

        {/* Optional Description snippet */}
        {c.description && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              margin: "2px 0 0",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              lineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              opacity: 0.85,
            }}
          >
            {c.description}
          </p>
        )}

        {/* Resident & Unit Information Block */}
        <div
          style={{
            marginTop: "auto",
            padding: "10px 12px",
            borderRadius: "12px",
            background: "var(--card-inner-bg, rgba(255, 255, 255, 0.02))",
            border: "1px solid var(--divider, rgba(255, 255, 255, 0.07))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          {/* Resident Details */}
          <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--accent, #6366f1)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              {residentInitial}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {residentName}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: "1px",
                }}
              >
                {unit}
              </div>
            </div>
          </div>

          {/* Super Admin ONLY: Society Badge */}
          {isSuper && societyName && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 8px",
                borderRadius: "6px",
                background: "rgba(168, 85, 247, 0.1)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                color: "#c084fc",
                fontWeight: 600,
                fontSize: "11px",
                flexShrink: 0,
                maxWidth: "130px",
              }}
              title={societyName}
            >
              <MdApartment size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {societyName}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Card Footer: Chat Button + Quick Action & Kebab */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderTop: "1px solid var(--glass-border)",
          background: "rgba(255,255,255,0.01)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpen(c, "chat")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "8px",
            fontSize: "11.5px",
            fontWeight: 600,
            background: hasUnread ? "rgba(160, 90, 255, 0.18)" : "var(--card-inner-bg)",
            border: hasUnread ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
            color: hasUnread ? "var(--accent)" : "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <MdChat size={13} />
          <span>{t("compMessages", "Messages")}</span>
          {commentCount != null && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: "999px",
                background: hasUnread ? "var(--accent)" : "rgba(255,255,255,0.1)",
                color: hasUnread ? "#fff" : "var(--text-secondary)",
              }}
            >
              {commentCount}
            </span>
          )}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            onClick={() => onOpen(c, "details")}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "11.5px",
              fontWeight: 600,
              color: "var(--accent, #6366f1)",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            {t("compViewDetails", "View Details")}
          </button>

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