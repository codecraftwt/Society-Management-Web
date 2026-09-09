import React from "react";
import { MdWarning, MdDelete, MdInfo, MdCheckCircle } from "react-icons/md";
import GlobalModal from "./GlobalModal";
import GlobalButton from "./GlobalButton";

/**
 * GlobalConfirmDialog
 * Standardized confirmation popup for destructive/critical actions.
 */
export default function GlobalConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  icon: CustomIcon = null,
}) {
  const iconConfig = {
    danger: {
      icon: MdDelete,
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.15)",
    },
    warning: {
      icon: MdWarning,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.15)",
    },
    info: {
      icon: MdInfo,
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.15)",
    },
    success: {
      icon: MdCheckCircle,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.15)",
    },
  };

  const currentIconConfig = iconConfig[variant] || iconConfig.danger;
  const DisplayIcon = CustomIcon || currentIconConfig.icon;

  const footer = (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
      <GlobalButton variant="cancel" onClick={onClose} disabled={loading}>
        {cancelLabel}
      </GlobalButton>
      <GlobalButton
        variant={variant === "danger" ? "delete" : variant === "success" ? "edit" : "primary"}
        onClick={onConfirm}
        loading={loading}
      >
        {confirmLabel}
      </GlobalButton>
    </div>
  );

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={footer}
      icon={
        <span style={{ color: currentIconConfig.color }}>
          <DisplayIcon size={20} />
        </span>
      }
    >
      <div style={{ padding: "8px 0" }}>
        <p
          style={{
            fontSize: "0.92rem",
            lineHeight: 1.55,
            color: "var(--text-secondary, #94a3b8)",
            margin: 0,
          }}
        >
          {message}
        </p>
      </div>
    </GlobalModal>
  );
}
