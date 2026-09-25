import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MdApartment, MdAttachFile, MdCalendarToday, MdChat, MdCheckCircle,
  MdMoreHoriz, MdOpenInNew, MdPerson, MdPublic, MdReportProblem,
  MdSchedule, MdVisibility,
} from "react-icons/md";
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
export default function MobileComplaintCard({ c, updateStatus, updatingId, t, onOpen, onPhotoClick, unreadMap, commentCount }) {
  const hasUnread = (unreadMap[c.id] || 0) > 0;
  const attachmentUrl = c.photo_url || c.attachment_url || c.attachment;

  return (
    <div
      onClick={() => onOpen(c, "details")}
      className={`${styles.mcard} group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-purple-500/40`}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "100%",
      }}
    >
      <div className={styles.mcardBody} style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Top: Avatar/Icon + Title + Status Pill */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(160, 90, 255, 0.18), rgba(160, 90, 255, 0.08))",
                color: "var(--accent, #6B46C1)",
                border: "1.5px solid rgba(160, 90, 255, 0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(160, 90, 255, 0.15)",
              }}
            >
              <MdReportProblem size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.title}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px" }}>
                  <MdCalendarToday size={11} style={{ opacity: 0.7 }} /> {formatDate(c.created_at)}
                </span>
              </div>
            </div>
          </div>
          <StatusPill status={c.status} t={t} />
        </div>

        {/* Attachment Button FIRST */}
        {attachmentUrl && (
          <div style={{ display: "flex", alignItems: "center", marginTop: "2px" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPhotoClick(attachmentUrl, c.title);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                background: "rgba(160, 90, 255, 0.12)",
                border: "1px solid rgba(160, 90, 255, 0.28)",
                color: "var(--accent, #6B46C1)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <MdAttachFile size={15} />
              <span>{t("viewAttachment") || "View Attachment"}</span>
              <MdOpenInNew size={13} style={{ opacity: 0.8 }} />
            </button>
          </div>
        )}

        {/* Description */}
        {c.description && (
          <p
            style={{
              fontSize: "0.83rem",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {c.description}
          </p>
        )}

        {/* Resident & Flat Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 9px",
              borderRadius: "8px",
              background: "rgba(160, 90, 255, 0.08)",
              border: "1px solid rgba(160, 90, 255, 0.18)",
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: "11.5px",
            }}
          >
            <MdPerson size={13} style={{ color: "var(--accent)" }} />
            <span className="truncate" style={{ maxWidth: "120px" }}>{c.User?.name || "Anonymous"}</span>
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 9px",
              borderRadius: "8px",
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
              fontWeight: 500,
              fontSize: "11.5px",
            }}
          >
            <MdApartment size={13} style={{ color: "var(--accent)" }} />
            <span className="truncate" style={{ maxWidth: "140px" }}>{flatLabel(c, t)}</span>
          </span>

          {c.Society && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 9px",
                borderRadius: "8px",
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                fontWeight: 500,
                fontSize: "11.5px",
              }}
            >
              <MdPublic size={12} />
              <span className="truncate" style={{ maxWidth: "110px" }}>{c.Society.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Footer: Quick Actions + Chat Button */}
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
          <span>{t("compMessages")}</span>
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
  );
}