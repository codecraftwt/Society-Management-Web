import React from "react";
import { createPortal } from "react-dom";
import {
  MdVpnLock,
  MdCheckCircle,
  MdWarning,
  MdErrorOutline,
  MdHelpOutline,
  MdInfo,
  MdClose,
} from "react-icons/md";
import { ALERT_TYPES } from "../../context/CustomAlertContext";

export default function CustomAlertModal({ config, onClose }) {
  if (!config) return null;

  const {
    type = ALERT_TYPES.INFO,
    title,
    message,
    confirmText = "OK",
    cancelText = "Cancel",
    confirmStyle = "primary",
    onConfirm,
    onCancel,
  } = config;

  const handleConfirm = () => {
    onClose();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    onClose();
    if (onCancel) onCancel();
  };

  // Variant Styling Configs
  const variantMap = {
    [ALERT_TYPES.UNAUTHORIZED]: {
      icon: <MdVpnLock size={32} color="#EF4444" />,
      badgeBg: "rgba(239, 68, 68, 0.15)",
      badgeBorder: "rgba(239, 68, 68, 0.3)",
      badgeShadow: "rgba(239, 68, 68, 0.25)",
      headerTitle: title || "Permission Restricted",
      btnBg: "#EF4444",
      btnHover: "#DC2626",
    },
    [ALERT_TYPES.CONFIRM]: {
      icon: <MdHelpOutline size={32} color="#7C3AED" />,
      badgeBg: "rgba(124, 58, 237, 0.15)",
      badgeBorder: "rgba(124, 58, 237, 0.3)",
      badgeShadow: "rgba(124, 58, 237, 0.25)",
      headerTitle: title || "Confirm Action",
      btnBg: confirmStyle === "danger" ? "#EF4444" : "#7C3AED",
      btnHover: confirmStyle === "danger" ? "#DC2626" : "#6D28D9",
    },
    [ALERT_TYPES.SUCCESS]: {
      icon: <MdCheckCircle size={32} color="#10B981" />,
      badgeBg: "rgba(16, 185, 129, 0.15)",
      badgeBorder: "rgba(16, 185, 129, 0.3)",
      badgeShadow: "rgba(16, 185, 129, 0.25)",
      headerTitle: title || "Success",
      btnBg: "#10B981",
      btnHover: "#059669",
    },
    [ALERT_TYPES.ERROR]: {
      icon: <MdErrorOutline size={32} color="#EF4444" />,
      badgeBg: "rgba(239, 68, 68, 0.15)",
      badgeBorder: "rgba(239, 68, 68, 0.3)",
      badgeShadow: "rgba(239, 68, 68, 0.25)",
      headerTitle: title || "Action Error",
      btnBg: "#EF4444",
      btnHover: "#DC2626",
    },
    [ALERT_TYPES.WARNING]: {
      icon: <MdWarning size={32} color="#F59E0B" />,
      badgeBg: "rgba(245, 158, 11, 0.15)",
      badgeBorder: "rgba(245, 158, 11, 0.3)",
      badgeShadow: "rgba(245, 158, 11, 0.25)",
      headerTitle: title || "Attention",
      btnBg: "#F59E0B",
      btnHover: "#D97706",
    },
    [ALERT_TYPES.INFO]: {
      icon: <MdInfo size={32} color="#2563EB" />,
      badgeBg: "rgba(37, 99, 235, 0.15)",
      badgeBorder: "rgba(37, 99, 235, 0.3)",
      badgeShadow: "rgba(37, 99, 235, 0.25)",
      headerTitle: title || "Notice",
      btnBg: "#2563EB",
      btnHover: "#1D4ED8",
    },
  };

  const currentVariant = variantMap[type] || variantMap[ALERT_TYPES.INFO];

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        padding: "16px",
        animation: "customAlertFadeIn 0.25s ease-out forwards",
      }}
      onClick={handleCancel}
    >
      <style>{`
        @keyframes customAlertFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes customAlertSlideUp {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes customAlertPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(124, 58, 237, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "var(--modal-bg, var(--card-bg, #FFFFFF))",
          color: "var(--text-primary, #0F172A)",
          borderRadius: "20px",
          padding: "24px",
          border: "1.5px solid var(--glass-border, rgba(226, 232, 240, 0.8))",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
          animation: "customAlertSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon Top Right */}
        <button
          onClick={handleCancel}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "var(--text-tertiary, #94A3B8)",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary, #0F172A)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary, #94A3B8)")}
        >
          <MdClose size={20} />
        </button>

        {/* Aura Badge Icon Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: currentVariant.badgeBg,
              border: `1.5px solid ${currentVariant.badgeBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              boxShadow: `0 0 20px ${currentVariant.badgeShadow}`,
            }}
          >
            {currentVariant.icon}
          </div>

          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: "20px",
              fontWeight: "800",
              letterSpacing: "-0.02em",
              color: "var(--text-primary, #0F172A)",
            }}
          >
            {currentVariant.headerTitle}
          </h3>

          <p
            style={{
              margin: "0 0 24px 0",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "var(--text-secondary, #475569)",
              fontWeight: "500",
            }}
          >
            {message}
          </p>
        </div>

        {/* Action Buttons Row */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          {type === ALERT_TYPES.CONFIRM && (
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "700",
                border: "1px solid var(--border-color, #CBD5E1)",
                backgroundColor: "transparent",
                color: "var(--text-secondary, #475569)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "700",
              border: "none",
              backgroundColor: currentVariant.btnBg,
              color: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = currentVariant.btnHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = currentVariant.btnBg)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
