import React from "react";
import { useNavigate } from "react-router-dom";
import { MdChevronRight } from "react-icons/md";
import { useTheme } from "../../context/ThemeContext";
import { normalizeQuickLinkStyle } from "../../utils/themeUtils";
import "../../theme/quick-link-styles.css";

/**
 * QuickLink
 *
 * Global standardized quick-operation link/card.
 * Features:
 * - 10 dynamic visual themes (default, solid, glass, aurora, floating, neon, gradient, neumorphic, accent-rail, minimal)
 * - Dynamic theme inheritance from ThemeContext
 * - Badge support, custom icon tinting, smooth micro-interactions
 * - Link / Button / Action navigation
 */
export default function QuickLink({
  title,
  description,
  desc,
  icon: Icon = null,
  badge = null,
  badgeColor = "bg-blue-600 text-white",
  color = null,
  bg = null,
  tone = "brand",
  styleVariant = null,
  to = null,
  path = null,
  onClick = null,
  as = null,
  className = "",
  style = {},
  ...rest
}) {
  const navigate = useNavigate();
  const { societyTheme } = useTheme();

  const activeStyle = normalizeQuickLinkStyle(styleVariant || societyTheme?.quickLinkStyle || "default");

  const targetPath = to || path;
  const descriptionText = description || desc;

  const handleClick = (e) => {
    if (typeof onClick === "function") {
      onClick(e);
    } else if (targetPath) {
      navigate(targetPath);
    }
  };

  const isInteractive = typeof onClick === "function" || Boolean(targetPath);
  const Tag = as || (isInteractive ? "div" : "div");

  const resolvedColor = color || (tone ? `var(--ui-card-tone-${tone}-color, var(--accent))` : "var(--accent)");
  const resolvedBg = bg || (color ? `color-mix(in srgb, ${color} 18%, transparent)` : undefined);

  const styleClass = `quick-link-style-${activeStyle}`;
  const toneClass = tone ? `quick-link--tone-${tone}` : "";

  return (
    <Tag
      onClick={handleClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick(e);
        }
      }}
      className={`quick-link ${styleClass} ${toneClass} ${className}`.trim()}
      style={{
        "--ql-color": resolvedColor,
        "--gd-c": resolvedColor,
        ...style,
      }}
      {...rest}
    >
      <span className="quick-link__blob" aria-hidden="true" />

      {badge && (
        <span className={`quick-link__badge ${badgeColor}`}>
          {badge}
        </span>
      )}

      {Icon && (
        <div
          className="quick-link__icon"
          style={{
            backgroundColor: resolvedBg,
            color: resolvedColor,
          }}
        >
          {typeof Icon === "function" ? <Icon size={20} /> : Icon}
        </div>
      )}

      <div className="quick-link__body">
        <div className="quick-link__title-wrap">
          <h3 className="quick-link__title">{title}</h3>
          <MdChevronRight className="quick-link__arrow" size={16} />
        </div>
        {descriptionText && (
          <p className="quick-link__desc">{descriptionText}</p>
        )}
      </div>
    </Tag>
  );
}
