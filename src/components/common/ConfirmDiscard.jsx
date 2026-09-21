import React from "react";
import { MdWarningAmber } from "react-icons/md";

/**
 * ConfirmDiscard
 * Standalone "Discard unsaved changes?" popup rendered above any custom overlay.
 * Used by hand-rolled modals that do not use the shared GlobalModal component.
 */
export default function ConfirmDiscard({
  open,
  onKeep,
  onDiscard,
  message = "You have unsaved changes in this form. If you close now they will be lost.",
}) {
  if (!open) return null;

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    background: "rgba(0, 0, 0, 0.55)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  };

  const cardStyle = {
    width: "min(400px, 100%)",
    borderRadius: 20,
    padding: "26px 24px",
    background: "var(--modal-bg, var(--card-bg, #0f172a))",
    border: "1.5px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
    boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
  };

  return (
    <div style={overlayStyle} onClick={onKeep}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            margin: "0 auto 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(245, 158, 11, 0.15)",
            color: "#f59e0b",
          }}
        >
          <MdWarningAmber size={26} />
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 800,
            color: "var(--text-primary, #e2e8f0)",
          }}
        >
          Discard unsaved changes?
        </h3>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--text-secondary, #94a3b8)",
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onKeep}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 12,
              border: "1.5px solid var(--glass-border, rgba(255,255,255,0.12))",
              background: "transparent",
              color: "var(--text-primary, #e2e8f0)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 12,
              border: "none",
              background: "#ef4444",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Discard & Close
          </button>
        </div>
      </div>
    </div>
  );
}