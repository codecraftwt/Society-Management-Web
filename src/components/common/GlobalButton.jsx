import React, { useEffect, useRef, useState } from "react";

/**
 * GlobalButton
 * Reusable standardized master button system matching the "+ Add Notice" realism pill design.
 * 
 * Semantic Variants:
 * - primary / add / create / submit: Master blue gradient pill
 * - success / edit / save / confirm / approve / activate: Green gradient pill
 * - danger / delete / remove / reject / deactivate: Red gradient pill
 * - warning: Amber / orange gradient pill
 * - secondary / cancel / back / close / ghost / muted: Slate neutral dark glass gradient pill
 * - info / view / details: Cyan / sky blue gradient pill
 */
export default function GlobalButton({
  children,
  variant = "primary",
  size = "md",
  icon: Icon = null,
  iconPosition = "left",
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  title,
  fullWidth = false,
  iconOnly = false,
  className = "",
  style = {},
  borderDraw = false,
  ...props
}) {
  // Variant mapping
  const normalizeVariant = (v) => {
    switch (v) {
      case "primary":
      case "add":
      case "create":
      case "submit":
        return "primary";
      case "success":
      case "edit":
      case "save":
      case "confirm":
      case "approve":
      case "activate":
      case "complete":
        return "success";
      case "danger":
      case "delete":
      case "remove":
      case "reject":
      case "deactivate":
        return "danger";
      case "warning":
        return "warning";
      case "secondary":
      case "cancel":
      case "back":
      case "close":
      case "ghost":
      case "muted":
        return "secondary";
      case "info":
      case "view":
      case "details":
        return "info";
      default:
        return "primary";
    }
  };

  const normalizedVariant = normalizeVariant(variant);

  // Size specifications
  const sizeStyles = {
    xs: {
      height: 28,
      padding: "0 10px",
      fontSize: "0.72rem",
      gap: 4,
    },
    sm: {
      height: 34,
      padding: "0 14px",
      fontSize: "0.78rem",
      gap: 6,
    },
    md: {
      height: 40,
      padding: "0 20px",
      fontSize: "0.85rem",
      gap: 8,
    },
    lg: {
      height: 46,
      padding: "0 26px",
      fontSize: "0.92rem",
      gap: 10,
    },
  };

  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 17,
    lg: 19,
  };

  const currentSizeStyle = sizeStyles[size] || sizeStyles.md;
  const currentIconSize = iconSizes[size] || iconSizes.md;
  const isIconOnly = iconOnly || (!children && Icon);

  const btnRef = useRef(null);
  const [box, setBox] = useState(null);

  useEffect(() => {
    if (!borderDraw) return;
    const el = btnRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [borderDraw]);

  const perimeter = box && box.h > 0
    ? 2 * (box.w - box.h) + Math.PI * box.h
    : 0;

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`sa-add-btn sa-add-pill sa-btn-${normalizedVariant} global-btn ${fullWidth ? "w-full justify-center" : ""} ${className}`}
      style={{
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        userSelect: "none",
        textDecoration: "none",
        outline: "none",
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        ...(isIconOnly ? { width: currentSizeStyle.height, padding: 0 } : {}),
        ...style,
      }}
      {...props}
    >
      <span className="sa-pill-blob sa-pill-blob1" />
      <span
        className="sa-pill-inner"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          ...currentSizeStyle,
          ...(isIconOnly ? { padding: 0 } : {}),
        }}
      >
        {loading ? (
          <span
            style={{
              width: currentIconSize,
              height: currentIconSize,
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.6s linear infinite",
              flexShrink: 0,
            }}
          />
        ) : Icon && iconPosition === "left" ? (
          <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
            {typeof Icon === "function" ? <Icon size={currentIconSize} /> : Icon}
          </span>
        ) : null}

        {children && !isIconOnly && <span>{children}</span>}

        {!loading && Icon && iconPosition === "right" ? (
          <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
            {typeof Icon === "function" ? <Icon size={currentIconSize} /> : Icon}
          </span>
        ) : null}
      </span>

      {borderDraw && box && perimeter > 0 ? (
        <svg
          className="global-btn-draw"
          width={box.w}
          height={box.h}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
            overflow: "visible",
            zIndex: 5,
          }}
        >
          <rect
            x="1"
            y="1"
            width={box.w - 2}
            height={box.h - 2}
            rx={box.h / 2 - 1}
            fill="none"
            strokeWidth="2"
            style={{ "--sa-bd-p": String(perimeter) }}
          />
        </svg>
      ) : null}
    </button>
  );
}
