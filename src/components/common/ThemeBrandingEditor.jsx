import { useMemo, useState, useRef } from "react";
import {
  PRESET_THEME_PALETTES,
  isValidHexColor,
  deriveThemeTokens,
  CARD_STYLES,
  QUICK_LINK_STYLES,
  normalizeCardStyle,
  normalizeQuickLinkStyle,
} from "../../utils/themeUtils";
import {
  MdCheckCircle,
  MdAutoAwesome,
  MdApartment,
  MdArrowForward,
  MdStyle,
  MdFlashOn,
  MdReportProblem,
  MdOutlinePayments,
  MdCheck,
  MdChevronLeft,
  MdChevronRight,
  MdVisibility,
} from "react-icons/md";
import { FaUsers, FaShieldAlt } from "react-icons/fa";
import StatCard from "./StatCard";
import QuickLink from "./QuickLink";

/**
 * ThemeBrandingEditor
 *
 * Theme & Branding Design Studio for:
 * 1. Society Brand Palettes & Custom Colors
 * 2. Statistical Card Theme Selector (Real 4-card live preview + horizontal scrolling theme selector)
 * 3. Quick Link Theme Selector (Real 4-link live preview + horizontal scrolling theme selector)
 */
export default function ThemeBrandingEditor({
  primaryColor = "#a05aff",
  accentColor = "#9e58ff",
  cardStyle = "default",
  quickLinkStyle = "default",
  onChangePrimary,
  onChangeAccent,
  onChangeCardStyle,
  onChangeQuickLinkStyle,
  onApplyPreset,
  societyName = "Skyline Residency",
}) {
  const isPrimaryValid = isValidHexColor(primaryColor);
  const isAccentValid = isValidHexColor(accentColor);

  const statCarouselRef = useRef(null);
  const quickLinkCarouselRef = useRef(null);

  const activeCardStyleId = normalizeCardStyle(cardStyle);
  const activeQuickLinkStyleId = normalizeQuickLinkStyle(quickLinkStyle);

  const previewTokens = useMemo(() => {
    if (!isPrimaryValid) return null;
    return deriveThemeTokens(primaryColor, isAccentValid ? accentColor : undefined);
  }, [primaryColor, accentColor, isPrimaryValid, isAccentValid]);

  const currentCardStyleObj =
    CARD_STYLES.find((s) => s.id === activeCardStyleId) || CARD_STYLES[0];
  const currentQuickLinkStyleObj =
    QUICK_LINK_STYLES.find((s) => s.id === activeQuickLinkStyleId) || QUICK_LINK_STYLES[0];

  const scrollCarousel = (ref, direction) => {
    if (!ref.current) return;
    const scrollAmount = direction === "left" ? -260 : 260;
    ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── 1. PRESET BRAND PALETTES & COLOR CUSTOMIZATION ── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] flex flex-col gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <MdAutoAwesome size={18} style={{ color: "var(--accent)" }} />
            <label
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Curated Brand Color Palettes
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all border ${
                    isSelected
                      ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb,160,90,255),0.12)] shadow-sm ring-1 ring-[var(--accent)]"
                      : "border-[var(--glass-border)] bg-[var(--card-bg)] hover:border-[var(--accent)]"
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
                    <div
                      className="text-xs font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--glass-border)]">
          {/* Primary Color */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-wider flex items-center justify-between"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>Primary Brand Color</span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: isPrimaryValid ? primaryColor : "var(--glass-border)",
                  color: isPrimaryValid ? primaryColor : "var(--text-secondary)",
                  background: isPrimaryValid ? `${primaryColor}18` : "var(--card-bg)",
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
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Used for primary buttons, active navigation, and key society accents.
            </p>
          </div>

          {/* Secondary / Accent Color */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-wider flex items-center justify-between"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>Secondary / Accent</span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: isAccentValid ? accentColor : "var(--glass-border)",
                  color: isAccentValid ? accentColor : "var(--text-secondary)",
                  background: isAccentValid ? `${accentColor}18` : "var(--card-bg)",
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
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Used for subtle badges, gradients, secondary indicators, and glow highlights.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. STATISTICAL CARD THEME SECTION ── */}
      <div className="p-4 sm:p-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] flex flex-col gap-6 shadow-sm">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--glass-border)]">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                style={{ background: "var(--accent)" }}
              >
                <MdStyle size={16} />
              </span>
              <h3
                className="text-base sm:text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Statistical Card Theme
              </h3>
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{
                  background: "var(--accent-light-bg, rgba(160, 90, 255, 0.12))",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-soft, rgba(160, 90, 255, 0.25))",
                }}
              >
                Active Theme: {currentCardStyleObj.name}
              </span>
            </div>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Choose how statistical cards appear throughout the dashboard.
            </p>
          </div>
        </div>

        {/* ── REAL 4-CARD PREVIEW: Exactly 4 Real Production StatCards with Semantic Colors ── */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdVisibility size={16} style={{ color: "var(--accent)" }} />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Live Preview — {currentCardStyleObj.name}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Residents (Blue) • Complaints (Red) • Payments (Green) • Visitors (Orange)
            </span>
          </div>

          {/* 4 Cards Grid (Desktop 4 cols, Tablet 2 cols, Mobile 1 col) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-5 rounded-2xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.03)] dark:bg-[rgba(255,255,255,0.02)]">
            {/* Card 1: Residents (Blue / Brand) */}
            <StatCard
              label="Residents"
              value="1,248"
              icon={FaUsers}
              tone="brand"
              variant="sheen"
              styleVariant={activeCardStyleId}
              description="+8.4% this month"
              style={{
                "--ui-card-tone-accent": "#2563eb",
                "--ui-card-tone-color": "#2563eb",
                "--ui-card-tone-border": "#2563eb",
                "--ui-card-ink-label": "#3b82f6",
                "--ui-card-ink-icon": "#2563eb",
              }}
            />

            {/* Card 2: Complaints (Red / Danger) */}
            <StatCard
              label="Complaints"
              value="12"
              icon={MdReportProblem}
              tone="danger"
              variant="sheen"
              styleVariant={activeCardStyleId}
              description="2 pending"
              style={{
                "--ui-card-tone-accent": "#ef4444",
                "--ui-card-tone-color": "#ef4444",
                "--ui-card-tone-border": "#ef4444",
                "--ui-card-ink-label": "#ef4444",
                "--ui-card-ink-icon": "#ef4444",
              }}
            />

            {/* Card 3: Payments (Green / Success) */}
            <StatCard
              label="Payments"
              value="₹48,200"
              icon={MdOutlinePayments}
              tone="success"
              variant="sheen"
              styleVariant={activeCardStyleId}
              description="+12.5% this month"
              style={{
                "--ui-card-tone-accent": "#10b981",
                "--ui-card-tone-color": "#10b981",
                "--ui-card-tone-border": "#10b981",
                "--ui-card-ink-label": "#10b981",
                "--ui-card-ink-icon": "#10b981",
              }}
            />

            {/* Card 4: Visitors (Orange / Warning) */}
            <StatCard
              label="Visitors"
              value="44"
              icon={FaShieldAlt}
              tone="warning"
              variant="sheen"
              styleVariant={activeCardStyleId}
              description="+6 today"
              style={{
                "--ui-card-tone-accent": "#f59e0b",
                "--ui-card-tone-color": "#f59e0b",
                "--ui-card-tone-border": "#f59e0b",
                "--ui-card-ink-label": "#f59e0b",
                "--ui-card-ink-icon": "#f59e0b",
              }}
            />
          </div>
        </div>

        {/* ── THEME OPTIONS: Choose Statistical Card Theme (Horizontal Scrolling Showcase) ── */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-primary)" }}
                >
                  Choose Statistical Card Theme
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(var(--accent-rgb,160,90,255),0.12)] text-[var(--accent)] border border-[rgba(var(--accent-rgb,160,90,255),0.2)]">
                  10 Visual Presets
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Click any design option below to immediately apply its visual treatment to the dashboard.
              </p>
            </div>

            {/* Carousel Arrow Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => scrollCarousel(statCarouselRef, "left")}
                aria-label="Scroll card themes left"
                className="w-8 h-8 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] hover:bg-[var(--accent-light-bg)] hover:border-[var(--accent)] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <MdChevronLeft size={20} style={{ color: "var(--text-primary)" }} />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(statCarouselRef, "right")}
                aria-label="Scroll card themes right"
                className="w-8 h-8 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] hover:bg-[var(--accent-light-bg)] hover:border-[var(--accent)] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <MdChevronRight size={20} style={{ color: "var(--text-primary)" }} />
              </button>
            </div>
          </div>

          {/* Horizontal Scrolling Theme Selector Track with Edge Fade */}
          <div className="relative">
            <div
              ref={statCarouselRef}
              className="studio-carousel-track"
            >
              {CARD_STYLES.map((style) => {
                const isSelected = activeCardStyleId === style.id;
                
                // Rich metadata & distinct semantic color profiles for each theme showcase
                const showcaseMap = {
                  default: {
                    badge: "Classic",
                    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                    label: "Residents",
                    value: "1,248",
                    icon: FaUsers,
                    tone: "brand",
                    accentHex: "#2563EB",
                  },
                  solid: {
                    badge: "Bold Solid",
                    badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
                    label: "Revenue",
                    value: "₹84.2K",
                    icon: MdOutlinePayments,
                    tone: "brand",
                    accentHex: "#6366F1",
                  },
                  glass: {
                    badge: "Frosted Glass",
                    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                    label: "Security",
                    value: "24 On-Duty",
                    icon: FaShieldAlt,
                    tone: "success",
                    accentHex: "#10B981",
                  },
                  aurora: {
                    badge: "Aurora Glow",
                    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
                    label: "Alerts",
                    value: "0 Urgent",
                    icon: MdReportProblem,
                    tone: "info",
                    accentHex: "#06B6D4",
                  },
                  floating: {
                    badge: "3D Perspective",
                    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                    label: "Visitors",
                    value: "56 Today",
                    icon: FaUsers,
                    tone: "warning",
                    accentHex: "#F59E0B",
                  },
                  neon: {
                    badge: "Electric Neon",
                    badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                    label: "Tickets",
                    value: "18 Pending",
                    icon: MdReportProblem,
                    tone: "danger",
                    accentHex: "#F43F5E",
                  },
                  gradient: {
                    badge: "Fluid Gradient",
                    badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/30",
                    label: "Collections",
                    value: "₹1.4M",
                    icon: MdOutlinePayments,
                    tone: "brand",
                    accentHex: "#EC4899",
                  },
                  neumorphic: {
                    badge: "Tactile Inset",
                    badgeBg: "bg-teal-500/10 text-teal-400 border-teal-500/30",
                    label: "Uptime",
                    value: "99.9%",
                    icon: FaShieldAlt,
                    tone: "success",
                    accentHex: "#14B8A6",
                  },
                  "accent-rail": {
                    badge: "Accent Stripe",
                    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
                    label: "Flats",
                    value: "320 Total",
                    icon: FaUsers,
                    tone: "brand",
                    accentHex: "#8B5CF6",
                  },
                  minimal: {
                    badge: "Minimalist",
                    badgeBg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
                    label: "Bulletins",
                    value: "12 Notices",
                    icon: MdFlashOn,
                    tone: "brand",
                    accentHex: "#0EA5E9",
                  },
                };
                const item = showcaseMap[style.id] || showcaseMap.default;

                return (
                  <div
                    key={style.id}
                    onClick={() => onChangeCardStyle?.(style.id)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChangeCardStyle?.(style.id);
                      }
                    }}
                    style={{
                      "--item-accent": item.accentHex,
                    }}
                    className={`studio-carousel-item group relative text-left p-3.5 rounded-2xl transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer outline-none select-none backdrop-blur-md ${
                      isSelected
                        ? "border-2 border-[var(--accent)] shadow-[0_0_24px_rgba(var(--accent-rgb,160,90,255),0.25)] bg-[rgba(var(--accent-rgb,160,90,255),0.07)] -translate-y-0.5"
                        : "border border-[var(--glass-border)] hover:border-[var(--accent)] hover:shadow-xl hover:-translate-y-1.5 bg-[var(--card-bg)]/90"
                    }`}
                  >
                    {/* Top Header: Style Badge & Active Indicator */}
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.badgeBg}`}>
                        {item.badge}
                      </span>
                      {isSelected ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shrink-0 shadow-sm animate-pulse"
                          style={{ background: "var(--accent)" }}
                        >
                          <MdCheck size={11} />
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
                          Select
                        </span>
                      )}
                    </div>

                    {/* Dedicated Mini Live Component Showcase Frame */}
                    <div className="w-full pointer-events-none p-1.5 rounded-xl bg-black/5 dark:bg-white/[0.03] border border-[var(--glass-border)]">
                      <StatCard
                        label={item.label}
                        value={item.value}
                        icon={item.icon}
                        tone={item.tone}
                        styleVariant={style.id}
                        className="w-full"
                        style={{
                          "--ui-card-tone-accent": item.accentHex,
                          "--ui-card-tone-color": item.accentHex,
                          "--ui-card-tone-border": item.accentHex,
                          "--ui-card-ink-label": item.accentHex,
                          "--ui-card-ink-icon": item.accentHex,
                        }}
                      />
                    </div>

                    {/* Bottom Metadata: Theme Name & Tagline */}
                    <div className="flex flex-col gap-0.5 w-full pt-1">
                      <div
                        className="text-xs font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate"
                      >
                        {style.name}
                      </div>
                      <p className="text-[10.5px] leading-tight text-[var(--text-secondary)] line-clamp-1">
                        {style.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. QUICK LINK THEME SECTION ── */}
      <div className="p-4 sm:p-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] flex flex-col gap-6 shadow-sm">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--glass-border)]">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                style={{ background: "var(--accent)" }}
              >
                <MdFlashOn size={16} />
              </span>
              <h3
                className="text-base sm:text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Quick Link Theme
              </h3>
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{
                  background: "var(--accent-light-bg, rgba(160, 90, 255, 0.12))",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-soft, rgba(160, 90, 255, 0.25))",
                }}
              >
                Active Theme: {currentQuickLinkStyleObj.name}
              </span>
            </div>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Choose how quick action links appear throughout the dashboard.
            </p>
          </div>
        </div>

        {/* ── REAL 4-LINK PREVIEW: Exactly 4 Real Production QuickLinks with Semantic Colors ── */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdVisibility size={16} style={{ color: "var(--accent)" }} />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Live Preview — {currentQuickLinkStyleObj.name}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Residents (Blue) • Complaints (Red) • Payments (Green) • Visitors (Orange)
            </span>
          </div>

          {/* 4 Quick Links Grid (Desktop 4 cols, Tablet 2 cols, Mobile 1 col) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-5 rounded-2xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.03)] dark:bg-[rgba(255,255,255,0.02)]">
            {/* Link 1: Residents */}
            <QuickLink
              title="Residents"
              description="Manage residents"
              icon={FaUsers}
              color="#2563EB"
              badge="Directory"
              badgeColor="bg-blue-600 text-white"
              styleVariant={activeQuickLinkStyleId}
            />

            {/* Link 2: Complaints */}
            <QuickLink
              title="Complaints"
              description="View complaints"
              icon={MdReportProblem}
              color="#F43F5E"
              badge="2 Open"
              badgeColor="bg-rose-600 text-white"
              styleVariant={activeQuickLinkStyleId}
            />

            {/* Link 3: Payments */}
            <QuickLink
              title="Payments"
              description="Manage payments"
              icon={MdOutlinePayments}
              color="#16A34A"
              badge="Finance"
              badgeColor="bg-emerald-600 text-white"
              styleVariant={activeQuickLinkStyleId}
            />

            {/* Link 4: Visitors */}
            <QuickLink
              title="Visitors"
              description="Manage visitors"
              icon={FaShieldAlt}
              color="#D97706"
              badge="Visitors"
              badgeColor="bg-amber-600 text-white"
              styleVariant={activeQuickLinkStyleId}
            />
          </div>
        </div>

        {/* ── THEME OPTIONS: Choose Quick Link Theme (Horizontal Scrolling Showcase) ── */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-primary)" }}
                >
                  Choose Quick Link Theme
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(var(--accent-rgb,160,90,255),0.12)] text-[var(--accent)] border border-[rgba(var(--accent-rgb,160,90,255),0.2)]">
                  10 Action Styles
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Click any design option below to immediately apply its quick link treatment to the dashboard.
              </p>
            </div>

            {/* Carousel Arrow Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => scrollCarousel(quickLinkCarouselRef, "left")}
                aria-label="Scroll quick link themes left"
                className="w-8 h-8 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] hover:bg-[var(--accent-light-bg)] hover:border-[var(--accent)] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <MdChevronLeft size={20} style={{ color: "var(--text-primary)" }} />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(quickLinkCarouselRef, "right")}
                aria-label="Scroll quick link themes right"
                className="w-8 h-8 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] hover:bg-[var(--accent-light-bg)] hover:border-[var(--accent)] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <MdChevronRight size={20} style={{ color: "var(--text-primary)" }} />
              </button>
            </div>
          </div>

          {/* Horizontal Scrolling Theme Selector Track with Edge Fade */}
          <div className="relative">
            <div
              ref={quickLinkCarouselRef}
              className="studio-carousel-track"
            >
              {QUICK_LINK_STYLES.map((style) => {
                const isSelected = activeQuickLinkStyleId === style.id;

                // Rich metadata & distinct semantic color profiles for each quick link theme showcase
                const showcaseMap = {
                  default: {
                    badge: "Classic",
                    badgeBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                    title: "Residents",
                    desc: "Directory & records",
                    icon: FaUsers,
                    color: "#2563EB",
                    badgeText: "Direct",
                    badgeColor: "bg-blue-600 text-white",
                  },
                  solid: {
                    badge: "Bold Solid",
                    badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                    title: "Payments",
                    desc: "Bills & invoices",
                    icon: MdOutlinePayments,
                    color: "#6366F1",
                    badgeText: "Finance",
                    badgeColor: "bg-indigo-600 text-white",
                  },
                  glass: {
                    badge: "Frosted Glass",
                    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    title: "Guards",
                    desc: "Gate checkpoints",
                    icon: FaShieldAlt,
                    color: "#10B981",
                    badgeText: "Security",
                    badgeColor: "bg-emerald-600 text-white",
                  },
                  aurora: {
                    badge: "Aurora Glow",
                    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                    title: "Complaints",
                    desc: "Issue tracker",
                    icon: MdReportProblem,
                    color: "#06B6D4",
                    badgeText: "Alerts",
                    badgeColor: "bg-cyan-600 text-white",
                  },
                  floating: {
                    badge: "3D Perspective",
                    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    title: "Visitors",
                    desc: "Pass verification",
                    icon: FaUsers,
                    color: "#F59E0B",
                    badgeText: "Passes",
                    badgeColor: "bg-amber-600 text-white",
                  },
                  neon: {
                    badge: "Electric Neon",
                    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                    title: "Notices",
                    desc: "Urgent bulletins",
                    icon: MdFlashOn,
                    color: "#8B5CF6",
                    badgeText: "Live",
                    badgeColor: "bg-purple-600 text-white",
                  },
                  gradient: {
                    badge: "Fluid Gradient",
                    badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
                    title: "Emergency",
                    desc: "SOS fast dial",
                    icon: MdReportProblem,
                    color: "#EC4899",
                    badgeText: "SOS",
                    badgeColor: "bg-pink-600 text-white",
                  },
                  neumorphic: {
                    badge: "Tactile Inset",
                    badgeBg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
                    title: "Amenities",
                    desc: "Clubhouse & gym",
                    icon: FaShieldAlt,
                    color: "#14B8A6",
                    badgeText: "Facility",
                    badgeColor: "bg-teal-600 text-white",
                  },
                  "accent-rail": {
                    badge: "Accent Stripe",
                    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    title: "Ledgers",
                    desc: "Annual accounts",
                    icon: MdOutlinePayments,
                    color: "#10B981",
                    badgeText: "Ledger",
                    badgeColor: "bg-emerald-600 text-white",
                  },
                  minimal: {
                    badge: "Minimalist",
                    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                    title: "Settings",
                    desc: "System configs",
                    icon: MdStyle,
                    color: "#3B82F6",
                    badgeText: "Config",
                    badgeColor: "bg-blue-600 text-white",
                  },
                };
                const item = showcaseMap[style.id] || showcaseMap.default;

                return (
                  <div
                    key={style.id}
                    onClick={() => onChangeQuickLinkStyle?.(style.id)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChangeQuickLinkStyle?.(style.id);
                      }
                    }}
                    style={{
                      "--item-accent": item.color,
                    }}
                    className={`studio-carousel-item group relative text-left p-3.5 rounded-2xl transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer outline-none select-none backdrop-blur-md ${
                      isSelected
                        ? "border-2 border-[var(--accent)] shadow-[0_0_24px_rgba(var(--accent-rgb,160,90,255),0.25)] bg-[rgba(var(--accent-rgb,160,90,255),0.07)] -translate-y-0.5"
                        : "border border-[var(--glass-border)] hover:border-[var(--accent)] hover:shadow-xl hover:-translate-y-1.5 bg-[var(--card-bg)]/90"
                    }`}
                  >
                    {/* Top Header: Style Badge & Active Indicator */}
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.badgeBg}`}>
                        {item.badge}
                      </span>
                      {isSelected ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shrink-0 shadow-sm animate-pulse"
                          style={{ background: "var(--accent)" }}
                        >
                          <MdCheck size={11} />
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
                          Select
                        </span>
                      )}
                    </div>

                    {/* Dedicated Mini Live Component Showcase Frame */}
                    <div className="w-full pointer-events-none p-1.5 rounded-xl bg-black/5 dark:bg-white/[0.03] border border-[var(--glass-border)]">
                      <QuickLink
                        title={item.title}
                        description={item.desc}
                        icon={item.icon}
                        color={item.color}
                        badge={item.badgeText}
                        badgeColor={item.badgeColor}
                        styleVariant={style.id}
                        className="w-full"
                      />
                    </div>

                    {/* Bottom Metadata: Theme Name & Tagline */}
                    <div className="flex flex-col gap-0.5 w-full pt-1">
                      <div
                        className="text-xs font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate"
                      >
                        {style.name}
                      </div>
                      <p className="text-[10.5px] leading-tight text-[var(--text-secondary)] line-clamp-1">
                        {style.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. LIVE CUSTOM BRAND TOKEN PREVIEW CONTAINER ── */}
      <div
        className="p-5 rounded-2xl border transition-all duration-200"
        style={{
          ...(previewTokens || {}),
          background: "var(--card-bg)",
          borderColor: "var(--glass-border)",
          boxShadow: previewTokens
            ? `0 12px 32px -8px rgba(${previewTokens["--accent-rgb"] || "160,90,255"}, 0.2)`
            : undefined,
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--glass-border)] flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              }}
            >
              <MdApartment size={18} />
            </div>
            <div>
              <div
                className="text-xs font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {societyName}
              </div>
              <div
                className="text-[10px]"
                style={{ color: "var(--text-secondary)" }}
              >
                Live Custom Brand Token Preview
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="p-3.5 rounded-xl border flex flex-col justify-between gap-2.5"
            style={{
              background: "rgba(var(--accent-rgb, 160, 90, 255), 0.05)",
              borderColor: "rgba(var(--accent-rgb, 160, 90, 255), 0.18)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Primary Button Token
            </span>
            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                boxShadow: "0 4px 14px rgba(var(--accent-rgb, 160, 90, 255), 0.35)",
              }}
            >
              <span>Save Record</span>
              <MdArrowForward size={14} />
            </button>
          </div>

          <div
            className="p-3.5 rounded-xl border flex flex-col justify-between gap-1.5"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Text Accent Token
            </span>
            <div className="text-xs">
              <span
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Welcome to{" "}
              </span>
              <span
                className="font-bold underline decoration-2 underline-offset-2"
                style={{ color: "var(--accent)" }}
              >
                {societyName}
              </span>
            </div>
            <div
              className="text-[10px]"
              style={{ color: "var(--text-secondary)" }}
            >
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
  );
}
