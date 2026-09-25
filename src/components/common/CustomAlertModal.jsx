import React, { useEffect, useState } from "react";
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

const SUCCESS_CONFETTI = [
  { c: "#34d399", cx: -46, cy: -58, r: "300deg", d: 0, w: 5, h: 10 },
  { c: "#10b981", cx: 42, cy: -64, r: "-285deg", d: 0.04, w: 6, h: 12 },
  { c: "#a7f3d0", cx: -62, cy: -18, r: "260deg", d: 0.08, w: 4, h: 8 },
  { c: "#059669", cx: 58, cy: -22, r: "-240deg", d: 0.03, w: 5, h: 11 },
  { c: "#6ee7b7", cx: -30, cy: -78, r: "320deg", d: 0.1, w: 6, h: 9 },
  { c: "#34d399", cx: 30, cy: -80, r: "-315deg", d: 0.06, w: 5, h: 10 },
  { c: "#10b981", cx: -74, cy: 6, r: "230deg", d: 0.12, w: 4, h: 8 },
  { c: "#a7f3d0", cx: 70, cy: 2, r: "-215deg", d: 0.09, w: 5, h: 9 },
  { c: "#059669", cx: -50, cy: 34, r: "210deg", d: 0.13, w: 6, h: 12 },
  { c: "#34d399", cx: 48, cy: 38, r: "-205deg", d: 0.11, w: 4, h: 10 },
  { c: "#6ee7b7", cx: -16, cy: 52, r: "190deg", d: 0.15, w: 5, h: 8 },
  { c: "#10b981", cx: 14, cy: 54, r: "-185deg", d: 0.14, w: 6, h: 9 },
];

export default function CustomAlertModal({ config, onClose }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!config) return;
    if (config.type !== ALERT_TYPES.SUCCESS || config.onConfirm) return;
    const t1 = setTimeout(() => setClosing(true), 2200);
    const t2 = setTimeout(onClose, 2550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [config, onClose]);

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
      icon: <MdCheckCircle size={36} className="text-emerald-400" />,
      tag: "SUCCESS",
      tagColor: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
      glowColor: "rgba(16, 185, 129, 0.35)",
      badgeBg: "linear-gradient(135deg, rgba(16,185,129,0.28) 0%, rgba(5,150,105,0.1) 100%)",
      badgeBorder: "rgba(16, 185, 129, 0.45)",
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
  const isSuccess = type === ALERT_TYPES.SUCCESS;

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
        opacity: closing ? 0 : 1,
        transition: "opacity 0.26s ease",
        pointerEvents: closing ? "none" : "auto",
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
        @keyframes customAlertSpringPop {
          0% { opacity: 0; transform: scale(0.6) translateY(24px); }
          55% { opacity: 1; transform: scale(1.05) translateY(-5px); }
          80% { opacity: 1; transform: scale(0.98) translateY(1px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes customBadgePop {
          0% { transform: scale(0); }
          60% { transform: scale(1.18) rotate(-6deg); }
          80% { transform: scale(0.94) rotate(3deg); }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes customPulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes customConfettiBurst {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--cx, 0px), var(--cy, 0px)) rotate(var(--cr, 320deg)) scale(0.6); }
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
          boxShadow: `0 24px 60px -12px rgba(0, 0, 0, 0.65), 0 0 34px ${currentVariant.glowColor}`,
          animation: isSuccess
            ? "customAlertSpringPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both"
            : "customAlertSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transform: closing ? "scale(0.94) translateY(8px)" : undefined,
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
            background: `linear-gradient(90deg, transparent, ${currentVariant.glowColor.replace("0.25", "0.9").replace("0.35", "0.9")}, transparent)`,
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
          <div style={{ position: "relative", marginBottom: "16px" }}>
            {isSuccess && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: -14,
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                >
                  {SUCCESS_CONFETTI.map((p, i) => (
                    <span
                      key={i}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: p.w,
                        height: p.h,
                        borderRadius: 2,
                        background: p.c,
                        opacity: 0,
                        animation: "customConfettiBurst 0.95s cubic-bezier(0.16, 1, 0.3, 1) both",
                        animationDelay: `${p.d}s`,
                        "--cx": `${p.cx}px`,
                        "--cy": `${p.cy}px`,
                        "--cr": p.r,
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: 68,
                    height: 68,
                    margin: "auto",
                    borderRadius: 22,
                    border: "2px solid rgba(16, 185, 129, 0.5)",
                    animation: "customPulseRing 1.4s ease-out 0.28s both",
                  }}
                />
              </>
            )}
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
                position: "relative",
                zIndex: 1,
                boxShadow: `0 0 ${isSuccess ? 30 : 24}px ${currentVariant.glowColor}`,
                animation: isSuccess ? "customBadgePop 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both" : undefined,
              }}
            >
              {currentVariant.icon}
            </div>
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