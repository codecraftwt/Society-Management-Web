import React from "react";
import "./StatCard.css";

/**
 * StatCard
 * Global statistical card. Visual source of truth is the /admin `.ad-kpi`
 * KPI tile — see StatCard.css header for the exact reference lines.
 *
 * Props:
 * - label       (string)   compact uppercase caption — required
 * - value       (node)     the metric — required
 * - description (node)     optional sub-caption
 * - icon        (node|component) optional. A component is rendered with
 *                          `size={iconSize}`; an element is rendered as-is.
 * - iconSize    (number)   default 20
 * - tone        neutral | brand | success | warning | danger | info
 * - variant     base | sheen   `sheen` = the .ad-kpi dashboard treatment
 * - layout      stacked | inline
 *                `stacked` (default) is the /admin KPI tile: value above label.
 *                `inline` is the compact horizontal tile (icon at the left,
 *                value above label at the right) used by dense summary rows.
 *                It also drops the uppercase caption for a sentence-case one.
 * - interactive (bool)    hover affordance
 * - selected    (bool)    adds the selected ring, sets aria-pressed
 * - disabled    (bool)
 * - as          (string)  override the rendered element
 * - onClick     (fn)
 * - className, style      merged last so callers can always win
 *
 * Accessibility:
 * - When `onClick` is supplied and `as` is not, it renders a real
 *   <button type="button">. If a caller overrides `as` with a non-interactive
 *   element, role/tabIndex/keyboard activation are added automatically so a
 *   click-only card is not possible.
 * - The blob and the sheen sweep are decorative and never focusable.
 */
export default function StatCard({
  label,
  value,
  description,
  icon: Icon = null,
  iconSize = 20,
  tone = "neutral",
  variant = "base",
  layout = "stacked",
  interactive = false,
  selected = false,
  disabled = false,
  as,
  onClick,
  className = "",
  style = {},
  ...rest
}) {
  const clickable = typeof onClick === "function";
  const Tag = as ?? (clickable ? "button" : "div");
  const nativelyInteractive = Tag === "button" || Tag === "a";
  const needsKeyShim = clickable && !nativelyInteractive;

  const handleKeyDown = (event) => {
    if (!needsKeyShim) return;
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      onClick(event);
    }
  };

  const classes = [
    "ui-stat-card",
    `ui-stat-card--tone-${tone}`,
    `ui-stat-card--variant-${variant}`,
    `ui-stat-card--layout-${layout}`,
    Icon ? "ui-stat-card--has-icon" : "",
    interactive ? "ui-stat-card--interactive" : "",
    selected ? "ui-stat-card--selected" : "",
    disabled ? "ui-stat-card--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      className={classes}
      style={style}
      {...rest}
      {...(Tag === "button" ? { type: rest.type ?? "button" } : {})}
      {...(Tag === "button" && disabled ? { disabled: true } : {})}
      {...(needsKeyShim
        ? { role: "button", tabIndex: 0, onKeyDown: handleKeyDown }
        : {})}
      {...(disabled && Tag !== "button" ? { "aria-disabled": true } : {})}
      {...(interactive && selected ? { "aria-pressed": true } : {})}
      {...(clickable ? { onClick: disabled ? undefined : onClick } : {})}
    >
      <span className="ui-stat-card__blob" aria-hidden="true" />
      {Icon ? (
        <span className="ui-stat-card__icon" aria-hidden="true">
          {typeof Icon === "function" ? <Icon size={iconSize} /> : Icon}
        </span>
      ) : null}
      <span className="ui-stat-card__value">{value}</span>
      <span className="ui-stat-card__label">{label}</span>
      {description ? (
        <span className="ui-stat-card__desc">{description}</span>
      ) : null}
    </Tag>
  );
}