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
  MdShield,
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
      icon: <MdVpnLock size={32} className="text-rose-400" />,
      tag: "ACCESS RESTRICTED",
      tagColor: "text-rose-400 bg-rose-500/10 border-rose-500/25",
      glowColor: "rgba(244, 63, 94, 0.25)",
      badgeBg: "linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(225,29,72,0.08) 100%)",
      badgeBorder: "rgba(244, 63, 94, 0.35)",
      headerTitle: title || "Permission Restricted",
      btnGradient: "from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/25",
      btnBg: "#e11d48",
    },
    [ALERT_TYPES.CONFIRM]: {
      icon: <MdHelpOutline size={32} className="text-indigo-400" />,
      tag: "CONFIRMATION REQUIRED",
      tagColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/25",
      glowColor: "rgba(99, 102, 241, 0.25)",
      badgeBg: "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(79,70,229,0.08) 100%)",
      badgeBorder: "rgba(99, 102, 241, 0.35)",
      headerTitle: title || "Confirm Action",
      btnGradient: confirmStyle === "danger"
        ? "from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/25"
        : "from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/25",
      btnBg: confirmStyle === "danger" ? "#e11d48" : "#4f46e5",
    },
    [ALERT_TYPES.SUCCESS]: {
      icon: <MdCheckCircle size={32} className="text-emerald-400" />,
      tag: "SUCCESS",
      tagColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
      glowColor: "rgba(16, 185, 129, 0.25)",
      badgeBg: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.08) 100%)",
      badgeBorder: "rgba(16, 185, 129, 0.35)",
      headerTitle: title || "Operation Successful",
      btnGradient: "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25",
      btnBg: "#059669",
    },
    [ALERT_TYPES.ERROR]: {
      icon: <MdErrorOutline size={32} className="text-rose-400" />,
      tag: "ACTION FAILED",
      tagColor: "text-rose-400 bg-rose-500/10 border-rose-500/25",
      glowColor: "rgba(244, 63, 94, 0.25)",
      badgeBg: "linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(225,29,72,0.08) 100%)",
      badgeBorder: "rgba(244, 63, 94, 0.35)",
      headerTitle: title || "Action Error",
      btnGradient: "from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/25",
      btnBg: "#e11d48",
    },
    [ALERT_TYPES.WARNING]: {
      icon: <MdWarning size={32} className="text-amber-400" />,
      tag: "ATTENTION",
      tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/25",
      glowColor: "rgba(245, 158, 11, 0.25)",
      badgeBg: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.08) 100%)",
      badgeBorder: "rgba(245, 158, 11, 0.35)",
      headerTitle: title || "Attention",
      btnGradient: "from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/25",
      btnBg: "#d97706",
    },
    [ALERT_TYPES.INFO]: {
      icon: <MdInfo size={32} className="text-cyan-400" />,
      tag: "SYSTEM NOTICE",
      tagColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
      glowColor: "rgba(6, 182, 212, 0.25)",
      badgeBg: "linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(14,165,233,0.08) 100%)",
      badgeBorder: "rgba(6, 182, 212, 0.35)",
      headerTitle: title || "Notice",
      btnGradient: "from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/25",
      btnBg: "#0284c7",
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
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        padding: "16px",
        animation: "customAlertFadeIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
      onClick={handleCancel}
    >
      <style>{`
        @keyframes customAlertFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes customAlertSlideUp {
          from { opacity: 0; transform: scale(0.90) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          backgroundColor: "var(--modal-bg, var(--card-bg, #0f172a))",
          color: "var(--text-primary, #ffffff)",
          borderRadius: "24px",
          padding: "26px 24px 22px",
          border: "1.5px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
          boxShadow: `0 24px 60px -12px rgba(0, 0, 0, 0.65), 0 0 30px ${currentVariant.glowColor}`,
          animation: "customAlertSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top illuminated gradient flare */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${currentVariant.glowColor.replace("0.25", "0.9")}, transparent)`,
          }}
        />

        {/* Close button top right */}
        <button
          onClick={handleCancel}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.1))",
            color: "var(--text-secondary, #94a3b8)",
            cursor: "pointer",
            padding: "6px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary, #ffffff)";
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary, #94a3b8)";
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
          }}
        >
          <MdClose size={18} />
        </button>

        {/* Aura Badge Icon Header */}
        <div className="flex flex-col items-center text-center">
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "22px",
              background: currentVariant.badgeBg,
              border: `1.5px solid ${currentVariant.badgeBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              boxShadow: `0 0 24px ${currentVariant.glowColor}`,
            }}
          >
            {currentVariant.icon}
          </div>

          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border mb-2 ${currentVariant.tagColor}`}>
            {currentVariant.tag}
          </span>

          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: "20px",
              fontWeight: "800",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            {currentVariant.headerTitle}
          </h3>

          <div className="w-full p-3.5 my-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/60">
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "1.55",
                color: "var(--text-secondary)",
                fontWeight: "500",
              }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2.5 pt-3">
          {type === ALERT_TYPES.CONFIRM && (
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: "14px",
                fontSize: "13px",
                fontWeight: "700",
                border: "1px solid var(--glass-border)",
                backgroundColor: "var(--card-inner-bg)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--card-inner-bg)")}
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={handleConfirm}
            className={`flex-1 py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r ${currentVariant.btnGradient} shadow-lg transition-all active:scale-[0.98] cursor-pointer border-none flex items-center justify-center`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
