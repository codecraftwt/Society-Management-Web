import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  MdExpandMore,
  MdChevronRight,
} from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import {
  TbLayoutSidebarLeftCollapseFilled,
  TbLayoutSidebarLeftExpandFilled,
} from "react-icons/tb";
import { useSidebar } from "../../context/SidebarContext";
import UserAvatar from "./UserAvatar";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { getProfilePath } from "../../constants/app";

const GROUP_I18N = {
  "OVERVIEW": "sbGroupOverview",
  "PROPERTY & BILLS": "sbGroupPropertyBills",
  "ACTIVITY & VISITORS": "sbGroupActivityVisitors",
  "SERVICES & PROFILE": "sbGroupServicesProfile",
  "ACTIVITY & NOTICES": "sbGroupActivityNotices",
  "BILLS": "sbGroupBills",
  "PROFILE": "sbGroupProfile",
  "GATE OPERATIONS": "sbGroupGateOps",
  "LOGS & RECORDS": "sbGroupLogs",
  "SUPPORT & SETTINGS": "sbGroupSupport",
  "COMMUNITY & PROPERTY": "sbGroupCommunityProperty",
  "SECURITY & LOGS": "sbGroupSecurityLogs",
  "COMMUNICATION": "sbGroupCommunication",
  "FINANCE & BILLS": "sbGroupFinanceBills",
  "SERVICES & REPORTS": "sbGroupServicesReports",
  "SECURITY & NOTICES": "sbGroupSecurityNotices",
  "COMMUNITY & UNITS": "sbGroupCommunityUnits",
  "OPERATIONS & SECURITY": "sbGroupOpsSecurity",
  "FINANCE & ASSETS": "sbGroupFinanceAssets",
  "REPORTS": "sbGroupReports",
};

/* ── Group items helper ── */
function groupMenuItems(menu) {
  const groupsMap = new Map();

  menu.forEach((item) => {
    const groupName = item.group || "OVERVIEW";
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, []);
    }
    groupsMap.get(groupName).push(item);
  });

  return Array.from(groupsMap.entries()).map(([groupName, items]) => ({
    groupName,
    items,
  }));
}

/* ── Active Route Detection ── */
function isPathActive(locationPath, itemPath, base) {
  if (!itemPath) return false;

  /* A menu item may carry a deep link such as "/guard/settings?section=profile",
     but useLocation().pathname never contains a query. Comparing the raw strings
     would mean the item could never highlight, so drop the query from both sides
     before matching. */
  const stripQuery = (p) => p.split("?")[0];

  const normLocation = stripQuery(locationPath);
  const normItem = stripQuery(itemPath);

  const normBase = base && stripQuery(base);

  const trimSlash = (p) =>
    p && p.endsWith("/") && p.length > 1 ? p.slice(0, -1) : p;

  const loc = trimSlash(normLocation);
  const item = trimSlash(normItem);
  const bse = trimSlash(normBase);

  if (item === bse) {
    return loc === bse;
  }

  return loc === item || loc.startsWith(item + "/");
}

export default function Sidebar({
  menu = [],
  brandTitle = "SocietyControl",
  brandSubtitle = "Control Panel",
  base = "",
  drawerExtra = null,
  defaultOpenGroups = [],
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar();
  const { user } = useContext(AuthContext);
  const { t } = useLang();
  const groupLabel = (name) => t(GROUP_I18N[name] || name);

  const [expandedGroups, setExpandedGroups] = useState(() => {
    const init = {};
    (defaultOpenGroups || []).forEach((g) => {
      init[g] = true;
    });
    return init;
  });
  const [activeFlyoutItem, setActiveFlyoutItem] = useState(null);
  const flyoutRef = useRef(null);

  const groupedMenu = groupMenuItems(menu);

  // Auto-expand group if any of its children is active
  useEffect(() => {
    groupedMenu.forEach(({ groupName, items }) => {
      const hasActiveChild = items.some((item) => {
        if (item.children) {
          return item.children.some((child) =>
            isPathActive(location.pathname, child.path, base)
          );
        }
        return isPathActive(location.pathname, item.path, base);
      });

      if (hasActiveChild) {
        setExpandedGroups((prev) => ({ ...prev, [groupName]: true }));
      }
    });
  }, [location.pathname, menu, base]);

  // Close flyout on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        setActiveFlyoutItem(null);
      }
    };
    if (activeFlyoutItem) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeFlyoutItem]);

  // Close flyout on Esc key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveFlyoutItem(null);
        closeMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMobile]);

  const toggleGroupExpand = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  /* ── Render Brand Header ── */
  const renderBrand = (isMobileDrawer = false) => {
    // Collapsed desktop header: ONLY centered brand logo icon (click to expand)
    if (collapsed && !isMobileDrawer) {
      return (
        <div className="flex items-center justify-center mb-6 shrink-0 relative group/tooltip">
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center text-accent hover:text-primary transition-colors"
            aria-label={t("sbExpand")}
            title={t("sbExpand")}
          >
            <TbLayoutSidebarLeftExpandFilled size={22} />
          </button>
          <div className="fixed left-20 ml-1.5 z-50 hidden group-hover/tooltip:block bg-card border border-glass-border text-primary text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-fadeIn">
            {t("sbExpand")}
          </div>
        </div>
      );
    }

    // Expanded header: Logo + Title + Subtitle on left, '<' toggle button on right
    return (
      <div className={`flex items-center justify-between gap-2 px-1 shrink-0 border-b border-glass-border ${isMobileDrawer ? "mb-2 pb-3" : "mb-6 pb-4"}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600/25 to-indigo-600/15 border border-blue-500/30 flex items-center justify-center text-accent shrink-0 shadow-sm">
            <FaBuilding size={18} />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2 className="text-sm font-extrabold leading-tight truncate text-primary tracking-tight">
              {brandTitle}
            </h2>
            {brandSubtitle && (
              <p className="text-[11px] text-secondary truncate mt-0.5 font-medium">
                {brandSubtitle}
              </p>
            )}
          </div>
        </div>

        {!isMobileDrawer && (
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex items-center justify-center text-secondary hover:text-primary transition-colors shrink-0"
            aria-label={t("sbCollapse")}
            title={t("sbCollapse")}
          >
            <TbLayoutSidebarLeftCollapseFilled size={20} />
          </button>
        )}
      </div>
    );
  };

  /* ── Render Navigation Link ── */
  const renderNavLink = (item, isMobileDrawer = false, isSub = false) => {
    const { label, path, icon: Icon, children } = item;
    const active = isPathActive(location.pathname, path, base);

    // Collapsed desktop mode
    if (collapsed && !isMobileDrawer) {
      if (children && children.length > 0) {
        const hasActiveChild = children.some((child) =>
          isPathActive(location.pathname, child.path, base)
        );
        return (
          <div key={label} className="relative group/tooltip">
            <button
              onClick={() =>
                setActiveFlyoutItem(
                  activeFlyoutItem === label ? null : label
                )
              }
              className={`sidebar-link relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
                hasActiveChild
                  ? "active bg-accent text-white font-semibold"
                  : "text-secondary hover:text-primary hover:bg-accent/5"
              }`}
            >
              <Icon size={19} />
            </button>
            <div className="fixed left-20 ml-1.5 z-50 hidden group-hover/tooltip:block bg-card border border-glass-border text-primary text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-fadeIn">
              {label}
            </div>

            {activeFlyoutItem === label &&
              createPortal(
                <div
                  ref={flyoutRef}
                  className="fixed left-20 z-50 bg-card border border-glass-border rounded-xl p-2 shadow-2xl min-w-52 space-y-1 animate-fadeIn"
                  style={{ top: "80px" }}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent border-b border-glass-border mb-1">
                    {label}
                  </div>
                  {children.map((child) => {
                    const childActive = isPathActive(
                      location.pathname,
                      child.path,
                      base
                    );
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => {
                          setActiveFlyoutItem(null);
                          closeMobile();
                        }}
                        className={`sidebar-link sidebar-sublink flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                          childActive
                            ? "active bg-accent text-white font-bold"
                            : "text-secondary hover:text-primary hover:bg-accent/5"
                        }`}
                      >
                        <ChildIcon size={16} />
                        <span className="leading-tight wrap-break-word">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>,
                document.body
              )}
          </div>
        );
      }

      return (
        <div key={path} className="relative group/tooltip">
          <Link
            to={path}
            onClick={closeMobile}
            className={`sidebar-link relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
              active
                ? "active bg-accent text-white font-bold"
                : "text-secondary hover:text-primary hover:bg-accent/5"
            }`}
          >
            <Icon size={19} />
          </Link>
          <div className="fixed left-20 ml-1.5 z-50 hidden group-hover/tooltip:block bg-card border border-glass-border text-primary text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-fadeIn">
            {label}
          </div>
        </div>
      );
    }

    // Expanded or Mobile Drawer mode
    return (
      <Link
        key={path}
        to={path}
        onClick={closeMobile}
        className={`sidebar-link relative flex items-center rounded-xl font-medium transition-all duration-150 ${
          isSub ? "sidebar-sublink" : ""
        } ${
          isMobileDrawer
            ? isSub
              ? "gap-3 px-3 py-2 text-[13px]"
              : "gap-3.5 px-3.5 py-3 text-[15px]"
            : isSub
              ? "gap-2.5 px-3 py-1.5 text-[11px]"
              : "gap-3 px-3.5 py-2.5 text-xs"
        } ${
          active
            ? "active bg-accent text-white font-semibold"
            : "text-secondary hover:text-primary hover:bg-accent/5"
        }`}
      >
        <Icon
          size={isMobileDrawer ? (isSub ? 18 : 22) : isSub ? 15 : 18}
          className={active ? "text-white" : "text-secondary"}
        />
        <span className="leading-tight wrap-break-word">{label}</span>
      </Link>
    );
  };

  /* ── Render Navigation List ── */
  const renderNavList = (isMobileDrawer = false) => {
    // In collapsed desktop mode, render all item icons directly in a sleek vertical list
    if (collapsed && !isMobileDrawer) {
      return (
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 py-1">
          {menu.map((item) => renderNavLink(item, false))}
        </div>
      );
    }

    // In expanded mode or mobile drawer, group items under section labels
    return (
        <div className={`flex-1 min-h-0 overflow-y-auto scrollbar-hide pr-1 ${isMobileDrawer ? "space-y-2" : "space-y-5"}`}>
        {groupedMenu.map(({ groupName, items }) => {
          const isDefaultGroup = groupName === "OVERVIEW";
          const isGroupOpen = expandedGroups[groupName] ?? false;

          const hasActiveGroupItem = items.some((item) =>
            isPathActive(location.pathname, item.path, base)
          );

          return (
            <div key={groupName} className={isMobileDrawer ? "space-y-1" : "space-y-1"}>
              {!isDefaultGroup && (
                <button
                  type="button"
                  onClick={() => toggleGroupExpand(groupName)}
                  aria-expanded={isGroupOpen}
                  className={`w-full flex items-center justify-between px-3 font-extrabold tracking-wider text-muted uppercase hover:text-primary transition-colors group/head cursor-pointer select-none ${isMobileDrawer ? "py-1.5 text-[12px]" : "py-1.5 text-[11px]"}`}
                >
                  <span className="leading-tight wrap-break-word normal-case tracking-wide">{groupLabel(groupName)}</span>
                  <MdExpandMore
                    size={14}
                    className={`transition-transform duration-200 ${
                      isGroupOpen ? "rotate-0" : "-rotate-90"
                    } ${hasActiveGroupItem ? "text-accent" : ""}`}
                  />
                </button>
              )}

              {(isDefaultGroup || isGroupOpen) && (
                <div className={!isDefaultGroup ? `${isMobileDrawer ? "space-y-0.5" : "space-y-0.5"} pl-2 border-l border-blue-500/15 ml-3 ${isMobileDrawer ? "my-1" : "my-1"}` : (isMobileDrawer ? "space-y-1" : "space-y-1")}>
                  {items.map((item) => renderNavLink(item, isMobileDrawer, !isDefaultGroup))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /* ── Render Profile Block at Bottom ── */
  /* The whole card is the entry point to the panel's My Profile screen. */
  const openProfile = () => {
    if (mobileOpen) closeMobile();
    navigate(getProfilePath(user));
  };

  const renderProfileFooter = (isMobileDrawer = false) => {
    if (!user) return null;

    const displayName = user.name || "Super Admin";
    const displayEmail = user.email || "Super Admin Panel";
    const roleTitle = user.activeRole || "SUPER_ADMIN";

    if (collapsed && !isMobileDrawer) {
      return (
        <div className="mt-auto pt-3 border-t border-glass-border shrink-0 flex justify-center">
          <div className="relative group/tooltip">
            <button
              type="button"
              onClick={openProfile}
              className="sbp-rail"
              aria-label={displayName}
            >
              <span className="sbp__ring" aria-hidden>
                <UserAvatar
                  name={displayName}
                  src={user.profile_picture}
                  className="sbp__photo"
                  alt={displayName}
                />
              </span>
            </button>
            <div className="fixed left-20 ml-1.5 z-50 hidden group-hover/tooltip:block bg-card border border-glass-border text-primary text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-fadeIn">
              {displayName} ({roleTitle})
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${isMobileDrawer ? "mt-auto pt-4" : "mt-auto pt-3"} border-t border-glass-border shrink-0`}>
        <button
          type="button"
          onClick={openProfile}
          className={`sbp ${isMobileDrawer ? "sbp--drawer" : ""}`}
        >
          <span className="sbp__ring">
            <UserAvatar
              name={displayName}
              src={user.profile_picture}
              className="sbp__photo"
              alt={displayName}
            />
            <span className="sbp__dot" aria-hidden />
          </span>

          <span className="sbp__text">
            <span className="sbp__name">{displayName}</span>
            <span className="sbp__email">{displayEmail}</span>
          </span>

          <span className="sbp__go" aria-hidden>
            <MdChevronRight size={16} />
          </span>
        </button>
      </div>
    );
  };

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-sidebar flex-col z-40 border-r border-glass-border transition-all duration-200 box-border ${
          collapsed ? "w-19 px-3 py-4" : "w-66 p-4"
        }`}
      >
        {renderBrand(false)}
        {renderNavList(false)}
        {renderProfileFooter(false)}
      </aside>

      {/* ── MOBILE DRAWER ── */}
      {mobileMenuOpen(mobileOpen, closeMobile, renderBrand, renderNavList, drawerExtra, renderProfileFooter)}
    </>
  );
}

/* Helper for mobile drawer portal/overlay */
function mobileMenuOpen(mobileOpen, closeMobile, renderBrand, renderNavList, drawerExtra, renderProfileFooter) {
  if (!mobileOpen) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-50 md:hidden bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={closeMobile}
    >
      <div
        className="relative bg-sidebar w-[min(18rem,86vw)] h-full max-h-dvh flex flex-col shadow-2xl animate-slide-in"
        style={{
          paddingTop: 16,
          paddingRight: 16,
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          paddingLeft: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {renderBrand(true)}

        {drawerExtra && (
          <div className="mb-2 shrink-0 empty:hidden empty:mb-0">{drawerExtra}</div>
        )}

        {renderNavList(true)}

        {renderProfileFooter(true)}
      </div>
    </div>,
    document.body
  );
}
