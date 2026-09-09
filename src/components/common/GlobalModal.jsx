import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";
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
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: "420px",
    md: "520px",
    lg: "680px",
    xl: "860px",
    xxl: "1080px",
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
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
        onClick={(e) => e.stopPropagation()}
        className={`sa-modal global-modal-container ${className}`}
        style={{
          width: "100%",
          maxWidth: maxWidths[size] || maxWidths.md,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 20,
          background: "var(--card-bg, #0f172a)",
          border: "1.5px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5), 0 0 20px rgba(37, 99, 235, 0.15)",
          overflow: "hidden",
          animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          ...style,
        }}
      >
        {/* Header */}
        <div className="sa-modal-er" style={{ flexShrink: 0 }}>
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
            onClick={onClose}
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
              onClick={onCancel || onClose}
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
    </div>
  );

  return createPortal(modalContent, document.body);
}
