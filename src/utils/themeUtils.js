/**
 * Theme & Color Utilities for Dynamic Society Branding
 *
 * Provides deterministic color calculation, HEX validation, RGB channel extraction,
 * and DOM token application/cleanup.
 */

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const isValidHexColor = (hex) => {
  if (!hex || typeof hex !== "string") return false;
  return HEX_COLOR_REGEX.test(hex.trim());
};

/**
 * Parses a 3, 6, or 8-digit HEX color to an { r, g, b } object.
 */
export const hexToRgb = (hex) => {
  if (!isValidHexColor(hex)) return null;
  let clean = hex.trim().replace(/^#/, "");

  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  } else if (clean.length === 8) {
    clean = clean.slice(0, 6);
  }

  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

/**
 * Converts { r, g, b } to a component string e.g. "124, 58, 237".
 */
export const rgbToString = (rgb) => {
  if (!rgb) return null;
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
};

/**
 * Adjusts color brightness deterministically by a percentage (-100 to 100).
 */
export const adjustBrightness = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  const adjustChannel = (c) => {
    if (factor >= 0) {
      return Math.min(255, Math.round(c + (255 - c) * factor));
    }
    return Math.max(0, Math.round(c * (1 + factor)));
  };

  const r = adjustChannel(rgb.r);
  const g = adjustChannel(rgb.g);
  const b = adjustChannel(rgb.b);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/**
 * Preset palettes for quick selection in the Super Admin and Society Admin UI.
 */
export const PRESET_THEME_PALETTES = [
  { name: "Corona Purple (Default)", primary: "#a05aff", accent: "#9e58ff" },
  { name: "Emerald Mint", primary: "#10b981", accent: "#059669" },
  { name: "Ocean Sky", primary: "#0ea5e9", accent: "#0284c7" },
  { name: "Royal Indigo", primary: "#6366f1", accent: "#4f46e5" },
  { name: "Amber Sunset", primary: "#f59e0b", accent: "#d97706" },
  { name: "Rose Crimson", primary: "#f43f5e", accent: "#e11d48" },
  { name: "Teal Cyan", primary: "#14b8a6", accent: "#0d9488" },
  { name: "Violet Orchid", primary: "#8b5cf6", accent: "#7c3aed" },
];

const THEME_VARIABLE_KEYS = [
  "--accent",
  "--accent-hover",
  "--accent-dark",
  "--accent-light",
  "--accent-soft",
  "--accent-light-bg",
  "--accent-rgb",
  "--acct-purple",
  "--acct-purple-rgb",
  "--acct-violet",
  "--acct-violet-rgb",
  "--secondary",
];

/**
 * Derives a full token dictionary from primary and optional accent colors.
 */
export const deriveThemeTokens = (primaryHex, accentHex) => {
  if (!isValidHexColor(primaryHex)) return null;

  const rgb = hexToRgb(primaryHex);
  if (!rgb) return null;

  const hover = adjustBrightness(primaryHex, -10);
  const dark = adjustBrightness(primaryHex, -22);
  const light = isValidHexColor(accentHex) ? accentHex : adjustBrightness(primaryHex, 20);
  const soft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`;
  const lightBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;
  const rgbStr = rgbToString(rgb);

  const tokens = {
    "--accent": primaryHex,
    "--accent-hover": hover,
    "--accent-dark": dark,
    "--accent-light": light,
    "--accent-soft": soft,
    "--accent-light-bg": lightBg,
    "--accent-rgb": rgbStr,
    "--acct-purple": primaryHex,
    "--acct-purple-rgb": rgbStr,
  };

  if (isValidHexColor(accentHex)) {
    const secRgb = hexToRgb(accentHex);
    if (secRgb) {
      tokens["--acct-violet"] = accentHex;
      tokens["--acct-violet-rgb"] = rgbToString(secRgb);
      tokens["--secondary"] = accentHex;
    }
  }

  return tokens;
};

/**
 * Injects dynamic CSS variables on a specified DOM element (defaults to document.documentElement).
 */
export const applyDynamicTheme = (tokens, target = document.documentElement) => {
  if (!target || !tokens) return;
  Object.entries(tokens).forEach(([key, val]) => {
    if (val) target.style.setProperty(key, val);
  });
};

/**
 * Statistical Card Style Families (10 distinct design treatments, starting with Current / Default)
 */
export const CARD_STYLES = [
  { id: "default", name: "Current / Default", description: "Original clean dashboard card appearance" },
  { id: "solid", name: "Colorful Solid", description: "Bold vibrant solid surface matching semantic tone" },
  { id: "glass", name: "Glass Morphism", description: "Translucent frosted glass with backdrop blur" },
  { id: "aurora", name: "Aurora Glass", description: "Radiant glowing color aura blooming behind card" },
  { id: "floating", name: "Floating 3D", description: "Deep 3D physical elevation & perspective depth" },
  { id: "neon", name: "Neon Glass", description: "Illuminated glowing border & external neon halo" },
  { id: "gradient", name: "Gradient Glass", description: "Vibrant multi-stop tone gradient & light sheen" },
  { id: "neumorphic", name: "Neumorphic", description: "Pillowed tactile surface with inset highlights" },
  { id: "accent-rail", name: "Accent Rail", description: "Bold vertical semantic-color indicator stripe" },
  { id: "minimal", name: "Minimal Premium", description: "Restrained ultra-clean typographic finish" },
];

/**
 * Quick Link Style Families (10 distinct design treatments, starting with Current / Default)
 */
export const QUICK_LINK_STYLES = [
  { id: "default", name: "Current / Default", description: "Original clean quick link design" },
  { id: "solid", name: "Colorful Solid", description: "Bold vibrant solid tile matching semantic tone" },
  { id: "glass", name: "Glass Morphism", description: "Translucent frosted glass with backdrop blur" },
  { id: "aurora", name: "Aurora Glass", description: "Radiant soft aura bloom behind quick link" },
  { id: "floating", name: "Floating 3D", description: "Elevated surface with 3D perspective hover lift" },
  { id: "neon", name: "Neon Glass", description: "Illuminated glowing border on dark glass" },
  { id: "gradient", name: "Gradient Glass", description: "Modern smooth color gradient flow" },
  { id: "neumorphic", name: "Neumorphic", description: "Soft tactile pillowed surface & press depth" },
  { id: "accent-rail", name: "Accent Rail", description: "Strong semantic-color indicator side rail" },
  { id: "minimal", name: "Minimal Premium", description: "Clean ultra-flat typography-focused tile" },
];

const CARD_STYLE_ALIASES = {
  default: "default",
  current: "default",
  base: "default",
  solid: "solid",
  glass: "glass",
  "aurora-glass": "aurora",
  aurora: "aurora",
  "floating-3d": "floating",
  floating: "floating",
  elevated: "floating",
  "neon-glow": "neon",
  neon: "neon",
  outline: "neon",
  "gradient-mesh": "gradient",
  gradient: "gradient",
  "neumorphic-glass": "neumorphic",
  neumorphic: "neumorphic",
  "accent-rail": "accent-rail",
  "accent-bar": "accent-rail",
  "minimal-premium": "minimal",
  minimal: "minimal",
  "liquid-glass": "aurora",
  "layered-glass": "glass",
  "spotlight-glass": "glass",
  "executive-glass": "default",
  soft: "glass",
};

const QUICK_LINK_STYLE_ALIASES = {
  default: "default",
  current: "default",
  solid: "solid",
  glass: "glass",
  "glass-tile": "glass",
  "aurora-tile": "aurora",
  aurora: "aurora",
  "floating-tile": "floating",
  floating: "floating",
  elevated: "floating",
  "neon-edge": "neon",
  neon: "neon",
  outline: "neon",
  "gradient-mesh": "gradient",
  gradient: "gradient",
  "soft-neumorphic": "neumorphic",
  neumorphic: "neumorphic",
  "accent-rail": "accent-rail",
  "accent-bar": "accent-rail",
  "minimal-tile": "minimal",
  minimal: "minimal",
  "orbital-glass": "glass",
  "layered-tile": "glass",
  "interactive-3d": "floating",
  "spotlight-glass": "glass",
  soft: "aurora",
};

/**
 * Normalizes legacy/variant card style names to the canonical style ID.
 */
export const normalizeCardStyle = (style) => {
  if (!style || typeof style !== "string") return "default";
  const clean = style.trim().toLowerCase();
  return CARD_STYLE_ALIASES[clean] || (CARD_STYLES.some((s) => s.id === clean) ? clean : "default");
};

/**
 * Normalizes legacy/variant quick link style names to the canonical style ID.
 */
export const normalizeQuickLinkStyle = (style) => {
  if (!style || typeof style !== "string") return "default";
  const clean = style.trim().toLowerCase();
  return QUICK_LINK_STYLE_ALIASES[clean] || (QUICK_LINK_STYLES.some((s) => s.id === clean) ? clean : "default");
};

/**
 * Applies a card style class to target element (default: document.documentElement)
 */
export const applyCardStyle = (styleId, target = typeof document !== "undefined" ? document.documentElement : null) => {
  if (!target || !target.classList) return;
  const canonical = normalizeCardStyle(styleId);
  CARD_STYLES.forEach((s) => {
    target.classList.remove(`card-style-${s.id}`);
  });
  // Also clean up previous verbose class names
  [
    "aurora-glass",
    "liquid-glass",
    "floating-3d",
    "neumorphic-glass",
    "gradient-mesh",
    "neon-glow",
    "layered-glass",
    "spotlight-glass",
    "minimal-premium",
    "executive-glass",
    "glass",
    "solid",
    "soft",
    "outline",
    "gradient",
    "elevated",
    "minimal",
    "accent-bar",
    "accent",
  ].forEach((cls) => {
    target.classList.remove(`card-style-${cls}`);
  });
  target.classList.add(`card-style-${canonical}`);
};

/**
 * Applies a quick link style class to target element (default: document.documentElement)
 */
export const applyQuickLinkStyle = (styleId, target = typeof document !== "undefined" ? document.documentElement : null) => {
  if (!target || !target.classList) return;
  const canonical = normalizeQuickLinkStyle(styleId);
  QUICK_LINK_STYLES.forEach((s) => {
    target.classList.remove(`quick-link-style-${s.id}`);
  });
  [
    "glass-tile",
    "floating-tile",
    "aurora-tile",
    "orbital-glass",
    "neon-edge",
    "layered-tile",
    "gradient-mesh",
    "soft-neumorphic",
    "minimal-tile",
    "interactive-3d",
    "spotlight-glass",
    "solid",
    "soft",
    "glass",
    "outline",
    "gradient",
    "elevated",
    "minimal",
    "accent-bar",
    "accent",
  ].forEach((cls) => {
    target.classList.remove(`quick-link-style-${cls}`);
  });
  target.classList.add(`quick-link-style-${canonical}`);
};


/**
 * Clears custom injected variables so defaults in role-theme.css resume naturally.
 */
export const clearDynamicTheme = (target = typeof document !== "undefined" ? document.documentElement : null) => {
  if (!target) return;
  THEME_VARIABLE_KEYS.forEach((key) => {
    target.style?.removeProperty(key);
  });
};


