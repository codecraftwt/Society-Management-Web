import React from "react";
import { useNavigate } from "react-router-dom";
import { MdMenu, MdClose, MdLogout, MdApartment, MdSettings, MdArrowBack } from "react-icons/md";
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
  leftActions = null,
  onBack = null,
  showThemeToggle = true,
  showLanguageSelector = true,
  showNotificationBell = true,
  settingsPath = null,
  onLogout = null,
}) {
  const { openMobile, closeMobile, mobileOpen } = useSidebar();
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <header
      className={`sticky top-0 h-14 md:h-16 bg-navbar flex items-center justify-between px-3 md:px-6 shrink-0 border-b border-glass-border backdrop-blur-md transition-colors ${
        mobileOpen ? "z-60" : "z-30"
      }`}
      aria-label={t("appHeader")}
    >
      {/* ── LEFT AREA: HAMBURGER, BACK BTN & IDENTITY ── */}
      <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={mobileOpen ? closeMobile : openMobile}
          className="md:hidden relative z-61 flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors hover:bg-white/5 active:scale-95"
          style={{
            background: "var(--card-inner-bg)",
            border: "1.5px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
          aria-label={mobileOpen ? t("sbCloseMenu") : t("openMenu")}
          title={mobileOpen ? t("sbCloseMenu") : t("openMenu")}
        >
          {mobileOpen ? <MdClose size={20} /> : <MdMenu size={20} />}
        </button>

        {/* Back Button (Left-aligned) */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center h-9 px-3 rounded-xl border border-glass-border bg-card-inner-bg text-primary text-xs font-semibold gap-1.5 transition-all duration-200 ease-out hover:bg-card hover:border-accent/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0 cursor-pointer shadow-2xs"
            title={t("back", "Back")}
            aria-label={t("back", "Back")}
          >
            <MdArrowBack size={16} />
            <span className="hidden sm:inline">{t("back", "Back")}</span>
          </button>
        )}

        {leftActions && (
          <div className="flex items-center gap-2 shrink-0">{leftActions}</div>
        )}

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
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20 truncate max-w-55">
                <MdApartment size={13} className="shrink-0" />
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
          {showLanguageSelector && (
            <span className="hidden sm:inline-flex items-center">
              <LanguageSelector compact />
            </span>
          )}
          {showNotificationBell && <NotificationBell />}
        </div>

        {/* Settings Action Button */}
        {settingsPath && (
          <button
            onClick={() => navigate(settingsPath)}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:bg-accent/10 hover:border-accent/30 hover:text-accent active:scale-95"
            style={{
              background: "var(--card-inner-bg)",
              border: "1.5px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
            aria-label={t("settings") || "Settings"}
            title={t("settings") || "Settings"}
          >
            <MdSettings size={18} />
          </button>
        )}

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
