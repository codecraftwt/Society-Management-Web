import { useState, useEffect } from "react";

const GRADIENTS = [
  "linear-gradient(135deg, #3B82F6, #2563EB)",
  "linear-gradient(135deg, #8B5CF6, #7C3AED)",
  "linear-gradient(135deg, #10B981, #059669)",
  "linear-gradient(135deg, #F59E0B, #D97706)",
  "linear-gradient(135deg, #EC4899, #DB2777)",
  "linear-gradient(135deg, #06B6D4, #0891B2)",
];

export function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function getInitialsGradient(name) {
  const seed = String(name || "");
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % GRADIENTS.length;
  }
  return GRADIENTS[hash];
}

export default function UserAvatar({
  name,
  src,
  size,
  radius,
  className = "",
  onClick,
  alt,
}) {
  const [failed, setFailed] = useState(false);

  const resolvedSrc = typeof src === "string" ? src.trim() : (src?.url || src?.uri || null);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  const showImage = Boolean(resolvedSrc) && !failed;
  const base = className.trim();

  // Layout is inlined so the component never depends on a global CSS class.
  // Previously it hard-coded the `.ms-avatar` hero class (72px, 18px radius,
  // 22px initials, heavy blue glow) on EVERY avatar, which silently overrode
  // the small rounded-square + subtle-shadow look the Sidebar and list rows
  // were asking for through Tailwind.
  const baseStyle = {
    width: size,
    height: size,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: typeof size === "number" ? Math.max(12, Math.round(size * 0.36)) : undefined,
    color: "#fff",
    flexShrink: 0,
    overflow: "hidden",
    background: showImage ? "transparent" : getInitialsGradient(name),
  };

  // Only set when the caller asks, so Tailwind radius classes stay in control.
  if (radius != null) baseStyle.borderRadius = radius;

  const content = showImage ? (
    <img
      src={resolvedSrc}
      alt={alt || name || "Profile picture"}
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  ) : (
    <span>{getInitials(name)}</span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={alt || name || "Profile picture"}
        className={base}
        style={{ ...baseStyle, padding: 0, border: "none", cursor: "pointer" }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={base} style={baseStyle}>
      {content}
    </div>
  );
}
