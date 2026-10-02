import { useMemo } from "react";
import {
  PRESET_THEME_PALETTES,
  isValidHexColor,
  deriveThemeTokens,
} from "../../utils/themeUtils";
import {
  MdPalette,
  MdCheckCircle,
  MdLayers,
  MdAutoAwesome,
  MdNotifications,
  MdApartment,
  MdArrowForward,
} from "react-icons/md";
import GlobalButton from "./GlobalButton";

export default function ThemeBrandingEditor({
  primaryColor = "#a05aff",
  accentColor = "#9e58ff",
  onChangePrimary,
  onChangeAccent,
  onApplyPreset,
  societyName = "Skyline Residency",
}) {
  const isPrimaryValid = isValidHexColor(primaryColor);
  const isAccentValid = isValidHexColor(accentColor);

  const previewTokens = useMemo(() => {
    if (!isPrimaryValid) return null;
    return deriveThemeTokens(primaryColor, isAccentValid ? accentColor : undefined);
  }, [primaryColor, accentColor, isPrimaryValid, isAccentValid]);

  return (
    <div className="flex flex-col gap-5">
      {/* Preset Palettes */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <MdAutoAwesome size={16} style={{ color: "var(--accent)" }} />
          <label className="text-xs font-bold uppercase tracking-wider text-secondary">
            Quick Brand Palettes
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_THEME_PALETTES.map((palette) => {
            const isSelected =
              primaryColor?.toLowerCase() === palette.primary.toLowerCase();
            return (
              <button
                key={palette.name}
                type="button"
                onClick={() => {
                  if (onApplyPreset) onApplyPreset(palette);
                  else {
                    onChangePrimary?.(palette.primary);
                    onChangeAccent?.(palette.accent);
                  }
                }}
                className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all border ${
                  isSelected
                    ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.12)] shadow-sm"
                    : "border-[var(--glass-border)] bg-[var(--card-bg)] hover:border-[var(--text-secondary)] opacity-90 hover:opacity-100"
                }`}
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-center -space-x-1 shrink-0">
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ background: palette.primary }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                    style={{ background: palette.accent }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate text-[var(--text-primary)]">
                    {palette.name}
                  </div>
                </div>
                {isSelected && (
                  <MdCheckCircle
                    size={14}
                    style={{ color: "var(--accent)" }}
                    className="shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Customization Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primary Color */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center justify-between">
            <span>Primary Brand Color</span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                borderColor: isPrimaryValid ? primaryColor : "var(--glass-border)",
                color: isPrimaryValid ? primaryColor : "var(--text-secondary)",
                background: isPrimaryValid
                  ? `${primaryColor}18`
                  : "var(--card-bg)",
              }}
            >
              {isPrimaryValid ? primaryColor.toUpperCase() : "INVALID"}
            </span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <input
                type="color"
                value={isPrimaryValid ? primaryColor : "#a05aff"}
                onChange={(e) => onChangePrimary?.(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-[var(--glass-border)] p-0.5 bg-[var(--card-bg)]"
                title="Choose Primary Brand Color"
              />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => onChangePrimary?.(e.target.value)}
                placeholder="#7c3aed"
                maxLength={9}
                className={`input w-full font-mono text-sm uppercase ${
                  !isPrimaryValid ? "border-red-500 text-red-500" : ""
                }`}
              />
            </div>
          </div>
          <p className="text-[11px] text-secondary">
            Used for primary buttons, active states, key cards, and highlights.
          </p>
        </div>

        {/* Secondary / Accent Color */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center justify-between">
            <span>Secondary / Accent</span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                borderColor: isAccentValid ? accentColor : "var(--glass-border)",
                color: isAccentValid ? accentColor : "var(--text-secondary)",
                background: isAccentValid
                  ? `${accentColor}18`
                  : "var(--card-bg)",
              }}
            >
              {isAccentValid ? accentColor.toUpperCase() : "AUTO"}
            </span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <input
                type="color"
                value={isAccentValid ? accentColor : primaryColor || "#8b5cf6"}
                onChange={(e) => onChangeAccent?.(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-[var(--glass-border)] p-0.5 bg-[var(--card-bg)]"
                title="Choose Accent Color"
              />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={accentColor}
                onChange={(e) => onChangeAccent?.(e.target.value)}
                placeholder="#8b5cf6"
                maxLength={9}
                className={`input w-full font-mono text-sm uppercase ${
                  accentColor && !isAccentValid ? "border-red-500 text-red-500" : ""
                }`}
              />
            </div>
          </div>
          <p className="text-[11px] text-secondary">
            Used for subtle badges, gradients, secondary indicators, and glow rings.
          </p>
        </div>
      </div>

      {/* Live Design System Preview Container */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MdLayers size={16} style={{ color: "var(--accent)" }} />
            <label className="text-xs font-bold uppercase tracking-wider text-secondary">
              Live Token Preview
            </label>
          </div>
          <span className="text-[11px] text-secondary">
            Scoped to preview surface
          </span>
        </div>

        <div
          className="p-4 rounded-2xl border transition-all duration-200"
          style={{
            ...(previewTokens || {}),
            background: "var(--card-bg)",
            borderColor: "var(--glass-border)",
            boxShadow: previewTokens
              ? `0 12px 32px -8px rgba(${previewTokens["--accent-rgb"] || "160,90,255"}, 0.2)`
              : undefined,
          }}
        >
          {/* Header row in preview */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-light))",
                }}
              >
                <MdApartment size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  {societyName}
                </div>
                <div className="text-[10px] text-secondary">
                  Live Custom Brand Preview
                </div>
              </div>
            </div>

            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5"
              style={{
                color: "var(--accent)",
                background: "var(--accent-light-bg)",
                borderColor: "var(--accent-soft)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              Active Brand
            </span>
          </div>

          {/* Interactive elements grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Primary Action */}
            <div
              className="p-3 rounded-xl border flex flex-col justify-between gap-2"
              style={{
                background: "rgba(var(--accent-rgb, 160, 90, 255), 0.05)",
                borderColor: "rgba(var(--accent-rgb, 160, 90, 255), 0.18)",
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Primary Button
              </span>
              <button
                type="button"
                className="w-full py-2 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-light))",
                  boxShadow:
                    "0 4px 14px rgba(var(--accent-rgb, 160, 90, 255), 0.35)",
                }}
              >
                <span>Save Record</span>
                <MdArrowForward size={14} />
              </button>
            </div>

            {/* Navigation & Accent Glow */}
            <div
              className="p-3 rounded-xl border flex flex-col justify-between gap-2"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--glass-border)",
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Active Nav Tab
              </span>
              <div
                className="py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-2 border"
                style={{
                  color: "var(--accent)",
                  background: "var(--accent-light-bg)",
                  borderColor: "var(--accent-soft)",
                }}
              >
                <MdNotifications size={15} />
                <span>Announcements</span>
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full text-white font-bold"
                  style={{ background: "var(--accent)" }}
                >
                  3
                </span>
              </div>
            </div>

            {/* Accent Card & Text Highlights */}
            <div
              className="p-3 rounded-xl border flex flex-col justify-between gap-1"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--glass-border)",
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Text Accent
              </span>
              <div className="text-xs">
                <span className="font-semibold text-[var(--text-primary)]">
                  Welcome to{" "}
                </span>
                <span
                  className="font-bold underline decoration-2 underline-offset-2"
                  style={{ color: "var(--accent)" }}
                >
                  {societyName}
                </span>
              </div>
              <div className="text-[10px] text-secondary">
                Accent Token:{" "}
                <code
                  className="font-mono font-bold"
                  style={{ color: "var(--accent)" }}
                >
                  {isPrimaryValid ? primaryColor : "#a05aff"}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
