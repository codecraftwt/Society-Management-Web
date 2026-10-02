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
 * Clears custom injected variables so defaults in role-theme.css resume naturally.
 */
export const clearDynamicTheme = (target = document.documentElement) => {
  if (!target) return;
  THEME_VARIABLE_KEYS.forEach((key) => {
    target.style.removeProperty(key);
  });
};
