import React from "react";
import { MdMenu, MdLogout, MdApartment } from "react-icons/md";
import ThemeToggle from "./ThemeToggle";
import LanguageSelector from "./LanguageSelector";
import NotificationBell from "./NotificationBell";
import { useSidebar } from "../../context/SidebarContext";
import { useLang } from "../../context/LanguageContext";

export default function AppHeader({
  title,
  subtitle,
  societyName = null,
  actions = null,
  showThemeToggle = true,
  showLanguageSelector = true,
  showNotificationBell = true,
  onLogout = null,
}) {
  const { openMobile } = useSidebar();
  const { t } = useLang();

  return (
    <header
      className="sticky top-0 z-30 h-14 md:h-16 bg-navbar flex items-center justify-between px-3 md:px-6 shrink-0 border-b border-glass-border backdrop-blur-md transition-colors"
      aria-label="Main Application Header"
    >
      {/* ── LEFT AREA: HAMBURGER & IDENTITY ── */}
      <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={openMobile}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors hover:bg-white/5 active:scale-95"
          style={{
            background: "var(--card-inner-bg)",
            border: "1.5px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <MdMenu size={20} />
        </button>

        {/* Identity & Context */}
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <h1 className="font-semibold text-sm md:text-base leading-tight truncate text-primary tracking-tight">
                {title}
              </h1>
            )}

            {/* Optional Society Name Badge */}
            {societyName && (
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20 truncate">
                <MdApartment size={13} />
                <span className="truncate">{societyName}</span>
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-xs text-secondary truncate mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── RIGHT AREA: ACTIONS & PREFERENCES ── */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Role-Specific Custom Actions (Society Filter, Role Switcher, Emergency Alerts) */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}

        {/* Global Preference Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0 border-l border-glass-border pl-2 md:pl-3">
          {showThemeToggle && <ThemeToggle />}
          {showLanguageSelector && <LanguageSelector compact />}
          {showNotificationBell && <NotificationBell />}
        </div>

        {/* Logout Action Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 active:scale-95"
            style={{
              background: "var(--card-inner-bg)",
              border: "1.5px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
            aria-label={t("logout") || "Logout"}
            title={t("logout") || "Logout"}
          >
            <MdLogout size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
