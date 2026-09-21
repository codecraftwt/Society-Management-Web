import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdClose, MdWarningAmber } from "react-icons/md";
import GlobalButton from "./GlobalButton";

/**
 * GlobalModal
 * Reusable standardized modal dialog matching /superadmin/societies create society modal.
 * Supports:
 * - Icon header badge, title, subtitle, close button
 * - Form layouts / scrollable content / multi-section forms
 * - Configurable size: sm, md, lg, xl, xxl
 * - Footer with customizable Cancel and Submit/Action buttons
 * - Escape key dismiss, backdrop click dismiss
 * - Light and Dark theme support
 * - Unsaved-changes guard: if the user typed/edited anything then tries to close
 *   via backdrop / Escape / X / Cancel, a "Discard changes?" confirmation appears.
 */
export default function GlobalModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon = null,
  children,
  size = "md",
  footer = null,
  showFooter = false,
  onSubmit = null,
  onCancel = null,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitLoading = false,
  submitDisabled = false,
  submitIcon = null,
  submitVariant = "primary",
  className = "",
  style = {},
  bodyStyle = {},
  warnUnsavedChanges = true,
  disableUnsavedWarning = false,
}) {
  if (!isOpen) return null;

  const shouldWarn = warnUnsavedChanges && !disableUnsavedWarning;

  /* ModalShell remounts on every open, so its state (including the
     unsaved-changes flag) always starts clean. */
  return (
    <ModalShell
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={Icon}
      size={size}
      footer={footer}
      showFooter={showFooter}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      submitLoading={submitLoading}
      submitDisabled={submitDisabled}
      submitIcon={submitIcon}
      submitVariant={submitVariant}
      className={className}
      style={style}
      bodyStyle={bodyStyle}
      warnUnsavedChanges={shouldWarn}
    >
      {children}
    </ModalShell>
  );
}

function ModalShell({
  onClose,
  title,
  subtitle,
  icon: Icon = null,
  children,
  size,
  footer,
  showFooter,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  submitLoading,
  submitDisabled,
  submitIcon,
  submitVariant,
  className,
  style,
  bodyStyle,
  warnUnsavedChanges = true,
}) {
  const dialogRef = useRef(null);
  const dirtyRef = useRef(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  /* ── Track if the form inside has unsaved edits ── */
  useEffect(() => {
    if (!warnUnsavedChanges) return;
    const root = dialogRef.current;
    if (!root) return;

    const markDirty = (e) => {
      const t = e?.target;
      if (!t) return;
      const tag = (t.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        dirtyRef.current = true;
      }
    };

    root.addEventListener("input", markDirty, true);
    root.addEventListener("change", markDirty, true);

    return () => {
      root.removeEventListener("input", markDirty, true);
      root.removeEventListener("change", markDirty, true);
    };
  }, [warnUnsavedChanges]);

  const handleDiscard = useCallback(() => {
    dirtyRef.current = false;
    setShowDiscardConfirm(false);
    onClose?.();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (warnUnsavedChanges && dirtyRef.current) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose?.();
  }, [onClose, warnUnsavedChanges]);

  const requestCancel = useCallback(() => {
    if (warnUnsavedChanges && dirtyRef.current) {
      setShowDiscardConfirm(true);
      return;
    }
    (onCancel || onClose)?.();
  }, [onCancel, onClose, warnUnsavedChanges]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (showDiscardConfirm) {
        setShowDiscardConfirm(false);
        return;
      }
      requestClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose, showDiscardConfirm]);

  const maxWidths = {
    sm: "420px",
    md: "520px",
    lg: "680px",
    xl: "860px",
    xxl: "1080px",
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      requestClose();
    }
  };

  const modalContent = (
    <div
      onClick={handleBackdropClick}
      className="global-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0, 0, 0, 0.68)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={`sa-modal global-modal-container ${className}`}
        style={{
          width: "100%",
          maxWidth: maxWidths[size] || maxWidths.md,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 20,
          background: "var(--modal-bg, var(--card-bg, #0f172a))",
          border: "1.5px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5), 0 0 20px rgba(37, 99, 235, 0.15)",
          overflow: "hidden",
          animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          ...style,
        }}
      >
        {/* Header */}
        <div className="sa-modal-header sa-modal-er" style={{ flexShrink: 0 }}>
          {Icon && (
            <div className="sa-modal-icon">
              {typeof Icon === "function" ? <Icon size={20} /> : Icon}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <h3 className="sa-modal-title">{title}</h3>}
            {subtitle && <p className="sa-modal-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="sa-modal-close"
            title="Close"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          className="sa-modal-body"
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "20px 24px",
            ...bodyStyle,
          }}
        >
          {children}
        </div>

        {/* Optional Custom or Standard Footer */}
        {footer ? (
          <div className="sa-modal-footer" style={{ flexShrink: 0 }}>
            {footer}
          </div>
        ) : showFooter ? (
          <div className="sa-modal-footer" style={{ flexShrink: 0 }}>
            <GlobalButton
              variant="cancel"
              onClick={requestCancel}
              disabled={submitLoading}
            >
              {cancelLabel}
            </GlobalButton>
            <GlobalButton
              variant={submitVariant}
              onClick={onSubmit}
              loading={submitLoading}
              disabled={submitDisabled}
              icon={submitIcon}
            >
              {submitLabel}
            </GlobalButton>
          </div>
        ) : null}
      </div>

      {/* ── Unsaved-changes confirmation overlay ── */}
      {showDiscardConfirm && (
        <div
          onClick={() => setShowDiscardConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(400px, 100%)",
              borderRadius: 20,
              padding: "26px 24px",
              background: "var(--modal-bg, var(--card-bg, #0f172a))",
              border: "1.5px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
              textAlign: "center",
            }}
          >
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
              You have unsaved changes in this form. If you close now they will be lost.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
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
                onClick={handleDiscard}
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
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}