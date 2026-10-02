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
  const societyName = c.Society?.name || c.society_name;

  return (
    <div
      onClick={() => onOpen(c, "details")}
      className={`${styles.mcard} group cursor-pointer transition-all duration-200 hover:shadow-xl hover:border-purple-500/50`}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "100%",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
      }}
    >
      <div className={styles.mcardBody} style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Top: Avatar/Icon + Title + Status Pill */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(249, 115, 22, 0.12))",
                color: "#f87171",
                border: "1.5px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: "2px",
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.15)",
              }}
            >
              <MdReportProblem size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {c.title}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: "rgba(148, 163, 184, 0.1)",
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                  }}
                >
                  <MdCalendarToday size={11} style={{ opacity: 0.85 }} /> {formatDate(c.created_at)}
                </span>
              </div>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <StatusPill status={c.status} t={t} />
          </div>
        </div>

        {/* Distinct Colorful Badges: Society, Resident, Flat */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          {/* Highlighted Society Badge */}
          {societyName && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(139, 92, 246, 0.12))",
                border: "1px solid rgba(168, 85, 247, 0.38)",
                color: "#c084fc",
                fontWeight: 700,
                fontSize: "12px",
                boxShadow: "0 2px 6px rgba(168, 85, 247, 0.12)",
              }}
            >
              <MdApartment size={14} style={{ color: "#c084fc" }} />
              <span>{societyName}</span>
            </span>
          )}

          {/* Resident Badge (Emerald / Cyan) */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(5, 150, 105, 0.1))",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#34d399",
              fontWeight: 600,
              fontSize: "12px",
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.1)",
            }}
          >
            <MdPerson size={14} style={{ color: "#34d399" }} />
            <span>
              {c.User?.name || "Anonymous"}
              {c.User?.resident_type ? ` (${c.User.resident_type})` : ""}
            </span>
          </span>

          {/* Flat Badge (Amber / Warm Gold) */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(217, 119, 6, 0.1))",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "#fbbf24",
              fontWeight: 600,
              fontSize: "12px",
              boxShadow: "0 2px 6px rgba(245, 158, 11, 0.1)",
            }}
          >
            <MdApartment size={14} style={{ color: "#fbbf24" }} />
            <span>{flatLabel(c, t)}</span>
          </span>
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