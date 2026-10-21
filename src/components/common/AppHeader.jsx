import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdLogout, MdApartment, MdSettings, MdArrowBack, MdMenu, MdKeyboardArrowDown, MdCheck } from "react-icons/md";
import ThemeToggle from "./ThemeToggle";
import LanguageSelector from "./LanguageSelector";
import NotificationBell from "./NotificationBell";
import { useSidebar } from "../../context/SidebarContext";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import "./AppHeader.css";
import { DASHBOARD_ROUTES } from "../../constants/app";

export default function AppHeader({
  title,
  subtitle,
  societyName = null,
  actions = null,
  leftActions = null,
  onBack = null,
  showMenuButton = true,
  showThemeToggle = true,
  showLanguageSelector = true,
  showNotificationBell = true,
  settingsPath = null,
  onLogout = null,
}) {
  const { t } = useLang();
  const navigate = useNavigate();
  const { user, availableSocieties, switchSociety } = useAuth();
  const [showSocietyDropdown, setShowSocietyDropdown] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const societyDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (societyDropdownRef.current && !societyDropdownRef.current.contains(event.target)) {
        setShowSocietyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSociety = async (targetSocId) => {
    if (Number(targetSocId) === Number(user?.society_id)) {
      setShowSocietyDropdown(false);
      return;
    }
    try {
      setIsSwitching(true);
      const res = await switchSociety(targetSocId);
      setShowSocietyDropdown(false);
      if (res?.success && res.user) {
        // When changing society, redirect to resident panel first if user is a resident
        const hasResident =
          res.user.availablePanels?.includes("RESIDENT") ||
          res.user.roles?.includes("RESIDENT");
        const nextRole = hasResident
          ? "RESIDENT"
          : (res.user.activeRole || res.user.role);
        const targetRoute = DASHBOARD_ROUTES[nextRole] || "/resident";
        if (window.location.pathname.split("/")[1] !== targetRoute.split("/")[1]) {
          navigate(targetRoute);
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error("Failed to switch society:", err);
    } finally {
      setIsSwitching(false);
    }
  };

  const { societyTheme } = useTheme();

  const currentSocietyName =
    societyName ||
    societyTheme?.society_name ||
    user?.society_name ||
    user?.society?.name ||
    availableSocieties?.find((s) => Number(s.id) === Number(user?.society_id))?.name ||
    null;

  const currentSocietyLogo =
    societyTheme?.logo_url ||
    user?.society_logo ||
    user?.society_logo_url ||
    user?.society?.logo_url ||
    availableSocieties?.find((s) => Number(s.id) === Number(user?.society_id))?.logo_url ||
    null;

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
        {openMobile && showMenuButton && (
          <button
            type="button"
            onClick={openMobile}
            className="header-action-btn md:hidden! shrink-0"
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

            {/* Society Name Badge or Interactive Multi-Society Switcher */}
            {availableSocieties && availableSocieties.length > 1 ? (
              <div className="relative inline-block" ref={societyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowSocietyDropdown((prev) => !prev)}
                  className="header-society-switcher-btn"
                  aria-expanded={showSocietyDropdown}
                  title="Switch Society"
                  disabled={isSwitching}
                >
                  <span className="header-society-icon-container">
                    {currentSocietyLogo ? (
                      <img
                        src={currentSocietyLogo}
                        alt=""
                        className="header-society-logo-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "inline-flex";
                        }}
                      />
                    ) : null}
                    <span style={{ display: currentSocietyLogo ? "none" : "inline-flex" }}>
                      <MdApartment size={13} className="shrink-0 text-accent" />
                    </span>
                  </span>
                  <span className="truncate max-w-[12rem]">{currentSocietyName || "Select Society"}</span>
                  <MdKeyboardArrowDown
                    size={15}
                    className={`shrink-0 transition-transform duration-200 ${showSocietyDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showSocietyDropdown && (
                  <div className="header-society-menu">
                    <div className="header-society-menu-title">Switch Society</div>
                    <div className="header-society-menu-list">
                      {availableSocieties.map((soc) => {
                        const isCurrent = Number(soc.id) === Number(user?.society_id);
                        return (
                          <button
                            key={soc.id}
                            type="button"
                            onClick={() => handleSelectSociety(soc.id)}
                            className={`header-society-menu-item ${isCurrent ? "active" : ""}`}
                          >
                            <span className="header-society-icon-container header-society-icon-container--item">
                              {soc.logo_url ? (
                                <img
                                  src={soc.logo_url}
                                  alt=""
                                  className="header-society-logo-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "inline-flex";
                                  }}
                                />
                              ) : null}
                              <span style={{ display: soc.logo_url ? "none" : "inline-flex" }}>
                                <MdApartment size={13} className="text-secondary" />
                              </span>
                            </span>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                                <span>{soc.name}</span>
                                {soc.is_default && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">Default</span>
                                )}
                              </div>
                              {soc.roles && soc.roles.length > 0 && (
                                <div className="text-[10px] text-secondary truncate mt-0.5">
                                  {soc.roles.join(" • ")}
                                </div>
                              )}
                            </div>
                            {isCurrent && <MdCheck size={16} className="text-accent shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : currentSocietyName ? (
              <span className="header-society-badge">
                <span className="header-society-icon-container header-society-icon-container--badge">
                  {currentSocietyLogo ? (
                    <img
                      src={currentSocietyLogo}
                      alt=""
                      className="header-society-logo-img"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "inline-flex";
                      }}
                    />
                  ) : null}
                  <span style={{ display: currentSocietyLogo ? "none" : "inline-flex" }}>
                    <MdApartment size={12} className="shrink-0 text-accent" />
                  </span>
                </span>
                <span className="truncate">{currentSocietyName}</span>
              </span>
            ) : null}
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
