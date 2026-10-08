import React from "react";
import "./RecordCard.css";

/**
 * RecordCard
 * Global record / content card shell. Combines the slot structure of
 * .doc-decent-card with the single-accent-property model of .adh-op — see
 * RecordCard.css header for the reference lines.
 *
 * Slots are all optional. The component renders only what it is given.
 *
 *   RecordCard
 *    ├─ header  icon + title + description + badge
 *    ├─ body    children
 *    └─ footer  meta + actions
 *
 * Props:
 * - title       (node)
 * - description (node)
 * - icon        (node|component) a component is rendered with `size={iconSize}`
 * - iconSize    (number)   default 20
 * - badge       (node)     status chip — pass a <GlobalBadge/> for consistency
 * - meta        (array)    strings or nodes, rendered as footer meta items
 * - actions     (node)     footer action row
 * - tone        neutral | brand | success | warning | danger | info
 * - variant     base | glass
 * - interactive (bool)     hover affordance + shine sweep
 * - blob        (bool)     default true. Set false to drop the decorative
 *                          corner circle (ui-record-card__blob).
 * - selected    (bool)
 * - disabled    (bool)
 * - as          (string)   defaults to "article"; becomes "button" when
 *                          onClick is supplied and `as` is not
 * - onClick     (fn)
 * - className, style
 * - children    (node)     body content
 *
 * Accessibility:
 * - Renders a real <article> by default. With `onClick` and no `as` override
 *   it renders <button type="button">. If a caller overrides `as` with a
 *   non-interactive element, role/tabIndex/keyboard activation are added, so
 *   a click-only card cannot be produced. This is the accessibility gap the
 *   investigation found in .gd-action (GuardDashboard.jsx:688-727), which is
 *   a plain <div> with onClick and no keyboard path.
 * - The blob and the shine sweep are decorative and never focusable.
 */
export default function RecordCard({
  title,
  description,
  icon: Icon = null,
  iconSize = 20,
  badge = null,
  meta = null,
  actions = null,
  tone = "neutral",
  variant = "base",
  interactive = false,
  blob = true,
  selected = false,
  disabled = false,
  as,
  onClick,
  className = "",
  style = {},
  children = null,
  ...rest
}) {
  const clickable = typeof onClick === "function";
  const Tag = as ?? (clickable ? "button" : "article");
  const nativelyInteractive = Tag === "button" || Tag === "a";
  const needsKeyShim = clickable && !nativelyInteractive;

  // A <button> may only contain phrasing content, so every structural element
  // degrades to a <span> (styled as block/flex) when the shell is a button.
  const isButton = Tag === "button";
  const Box = isButton ? "span" : "div";
  const Heading = isButton ? "span" : "h3";
  const Text = isButton ? "span" : "p";

  const handleKeyDown = (event) => {
    if (!needsKeyShim) return;
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      onClick(event);
    }
  };

  const classes = [
    "ui-record-card",
    `ui-record-card--tone-${tone}`,
    `ui-record-card--variant-${variant}`,
    interactive || clickable ? "ui-record-card--interactive" : "",
    selected ? "ui-record-card--selected" : "",
    disabled ? "ui-record-card--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const metaItems = Array.isArray(meta) ? meta.filter(Boolean) : [];

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
      {blob && <span className="ui-record-card__blob" aria-hidden="true" />}

      {(title || Icon || description || badge) && (
        <Box className="ui-record-card__header">
          {Icon ? (
            <span className="ui-record-card__icon" aria-hidden="true">
              {typeof Icon === "function" ? <Icon size={iconSize} /> : Icon}
            </span>
          ) : null}
          {(title || description) && (
            <Box className="ui-record-card__heading">
              {title ? (
                <Heading className="ui-record-card__title">{title}</Heading>
              ) : null}
              {description ? (
                <Text className="ui-record-card__desc">{description}</Text>
              ) : null}
            </Box>
          )}
          {badge ? <Box className="ui-record-card__badge">{badge}</Box> : null}
        </Box>
      )}

      {children ? <Box className="ui-record-card__body">{children}</Box> : null}

      {(metaItems.length > 0 || actions) && (
        <Box className="ui-record-card__footer">
          {metaItems.length > 0 && (
            <Box className="ui-record-card__meta">
              {metaItems.map((item, index) => (
                <span className="ui-record-card__meta-item" key={index}>
                  {item}
                </span>
              ))}
            </Box>
          )}
          {actions ? (
            <Box className="ui-record-card__actions">{actions}</Box>
          ) : null}
        </Box>
      )}
    </Tag>
  );
}