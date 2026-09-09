import React from "react";

/**
 * GlobalBadge
 * Standardized status badge for all panels and tables.
 * Variants:
 * - success: Active, Resolved, In, Paid, Approved, Completed, High
 * - warning: Pending, Open, Medium, Partial
 * - danger: Overdue, Rejected, Out, Inactive, Suspended, Critical, Low
 * - info: In Progress, Reviewing, Assigned, Processing
 * - neutral: Draft, Closed, Archived, NA
 */
export default function GlobalBadge({
  children,
  variant = "neutral",
  status = null,
  icon: Icon = null,
  dot = false,
  size = "md",
  className = "",
  style = {},
}) {
  // Infer variant if status string is provided
  let currentVariant = variant;
  if (status) {
    const s = String(status).toLowerCase().trim();
    if (["active", "resolved", "in", "paid", "approved", "completed", "occupied", "success"].includes(s)) {
      currentVariant = "success";
    } else if (["pending", "open", "medium", "partial", "warning", "upcoming"].includes(s)) {
      currentVariant = "warning";
    } else if (["overdue", "rejected", "out", "inactive", "suspended", "critical", "danger", "unpaid", "expired"].includes(s)) {
      currentVariant = "danger";
    } else if (["in_progress", "in progress", "reviewing", "assigned", "processing", "info"].includes(s)) {
      currentVariant = "info";
    } else {
      currentVariant = "neutral";
    }
  }

  const variantStyles = {
    success: {
      background: "rgba(16, 185, 129, 0.12)",
      color: "#10b981",
      border: "1px solid rgba(16, 185, 129, 0.28)",
    },
    warning: {
      background: "rgba(245, 158, 11, 0.12)",
      color: "#f59e0b",
      border: "1px solid rgba(245, 158, 11, 0.28)",
    },
    danger: {
      background: "rgba(239, 68, 68, 0.12)",
      color: "#ef4444",
      border: "1px solid rgba(239, 68, 68, 0.28)",
    },
    info: {
      background: "rgba(59, 130, 246, 0.12)",
      color: "#60a5fa",
      border: "1px solid rgba(59, 130, 246, 0.28)",
    },
    neutral: {
      background: "rgba(148, 163, 184, 0.12)",
      color: "var(--text-secondary, #94a3b8)",
      border: "1px solid rgba(148, 163, 184, 0.25)",
    },
  };

  const dotColors = {
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#60a5fa",
    neutral: "#94a3b8",
  };

  const sizeStyles = {
    sm: {
      padding: "2px 8px",
      fontSize: "0.72rem",
      gap: 4,
      borderRadius: 999,
    },
    md: {
      padding: "3px 10px",
      fontSize: "0.78rem",
      gap: 6,
      borderRadius: 999,
    },
    lg: {
      padding: "5px 14px",
      fontSize: "0.85rem",
      gap: 7,
      borderRadius: 999,
    },
  };

  const currentStyle = variantStyles[currentVariant] || variantStyles.neutral;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      className={`global-badge global-badge-${currentVariant} inline-flex items-center font-semibold tracking-wide whitespace-nowrap select-none ${className}`}
      style={{
        ...currentStyle,
        ...currentSize,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: dotColors[currentVariant] || "#94a3b8",
            flexShrink: 0,
          }}
        />
      )}
      {Icon && (
        <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
          {typeof Icon === "function" ? <Icon size={12} /> : Icon}
        </span>
      )}
      <span>{children || status}</span>
    </span>
  );
}
