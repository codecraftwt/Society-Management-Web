import React from "react";
import { useNavigate } from "react-router-dom";
import { MdLogout, MdApartment, MdSettings, MdArrowBack, MdMenu } from "react-icons/md";
import ThemeToggle from "./ThemeToggle";
import LanguageSelector from "./LanguageSelector";
import NotificationBell from "./NotificationBell";
import { useSidebar } from "../../context/SidebarContext";
import { useLang } from "../../context/LanguageContext";
import "./AppHeader.css";

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
  const { t } = useLang();
  const navigate = useNavigate();

  let sidebarCtx = null;
  try {
    sidebarCtx = useSidebar();
  } catch (_) {}
  const openMobile = sidebarCtx?.openMobile;

  return (
    <header
      className="app-header-root z-30"
      aria-label={t("appHeader") || "Header Navigation"}
    >
      {/* ── LEFT AREA: BACK BTN & IDENTITY ── */}
      <div className="header-left">
        {/* Mobile Hamburger Menu Toggle */}
        {openMobile && (
          <button
            type="button"
            onClick={openMobile}
            className="header-action-btn md:hidden shrink-0"
            aria-label={t("sbOpen", "Open menu")}
            title={t("sbOpen", "Open menu")}
          >
            <MdMenu size={20} />
          </button>
        )}

        {/* Back Button (Left-aligned) */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="header-action-btn w-auto px-3 gap-1.5 text-xs font-semibold"
            title={t("back", "Back")}
            aria-label={t("back", "Back")}
          >
            <MdArrowBack size={16} />
            <span className="hidden sm:inline">{t("back", "Back")}</span>
          </button>
        )}

        {leftActions && (
          <div className="header-control-group">{leftActions}</div>
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
              <span className="header-society-badge">
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
      <div className="header-right">
        {/* Role-Specific Custom Actions (Refresh, Role Switcher, SOS, Emergency Alerts) */}
        {actions && (
          <div className="header-control-group">{actions}</div>
        )}

        {/* Global Preference Controls: Theme, Language & Notifications */}
        <div className="header-control-group">
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
            className="header-action-btn"
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
            className="header-action-btn header-action-btn--logout"
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
