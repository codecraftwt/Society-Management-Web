import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  MdChevronLeft,
  MdExpandMore,
  MdClose,
  MdPerson,
} from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import { useSidebar } from "../../context/SidebarContext";
import { AuthContext } from "../../context/AuthContext";

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
  
  const normLocation =
    locationPath.endsWith("/") && locationPath.length > 1
      ? locationPath.slice(0, -1)
      : locationPath;
  const normItem =
    itemPath.endsWith("/") && itemPath.length > 1
      ? itemPath.slice(0, -1)
      : itemPath;
  const normBase =
    base && base.endsWith("/") && base.length > 1
      ? base.slice(0, -1)
      : base;

  if (normItem === normBase) {
    return normLocation === normBase;
  }

  return normLocation === normItem || normLocation.startsWith(normItem + "/");
}

export default function Sidebar({
  menu = [],
  brandTitle = "SocietyControl",
  brandSubtitle = "Control Panel",
  base = "",
  drawerExtra = null,
}) {
  const location = useLocation();
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar();
  const { user } = useContext(AuthContext);

  const [expandedGroups, setExpandedGroups] = useState({});
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
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/30 flex items-center justify-center text-accent shadow-sm hover:scale-105 transition-all"
            aria-label="Expand sidebar"
            title="Expand Sidebar"
          >
            <FaBuilding size={19} />
          </button>
          <div className="fixed left-20 ml-1.5 z-50 hidden group-hover/tooltip:block bg-card border border-glass-border text-primary text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-fadeIn">
            Expand Sidebar
          </div>
        </div>
      );
    }

    // Expanded header: Logo + Title + Subtitle on left, '<' toggle button on right
    return (
      <div className="flex items-center justify-between gap-3 px-1 mb-6 shrink-0 border-b border-glass-border pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600/25 to-indigo-600/15 border border-blue-500/30 flex items-center justify-center text-accent shrink-0 shadow-sm">
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
            className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-secondary hover:text-primary hover:bg-card-inner-bg border border-glass-border transition-colors shrink-0"
            aria-label="Collapse sidebar"
            title="Collapse Sidebar"
          >
            <MdChevronLeft size={18} />
          </button>
        )}

        {isMobileDrawer && (
          <button
            onClick={closeMobile}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary bg-card-inner-bg border border-glass-border shrink-0"
            aria-label="Close mobile menu"
          >
            <MdClose size={18} />
          </button>
        )}
      </div>
    );
  };

  /* ── Render Navigation Link ── */
  const renderNavLink = (item, isMobileDrawer = false) => {
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
              className={`relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
                hasActiveChild
                  ? "bg-accent/15 text-accent border border-accent/30 font-semibold shadow-sm"
                  : "text-secondary hover:text-primary hover:bg-accent/5"
              }`}
            >
              {hasActiveChild && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.6)]" />
              )}
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
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          childActive
                            ? "bg-accent/15 text-accent font-bold border border-accent/25"
                            : "text-secondary hover:text-primary hover:bg-accent/5"
                        }`}
                      >
                        <ChildIcon size={16} />
                        <span className="truncate">{child.label}</span>
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
            className={`relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
              active
                ? "bg-accent/15 text-accent border border-accent/30 font-bold shadow-sm"
                : "text-secondary hover:text-primary hover:bg-accent/5"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.6)]" />
            )}
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
        className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
          active
            ? "bg-accent/12 text-accent font-bold shadow-xs border border-accent/20 translate-x-0.5"
            : "text-secondary hover:text-primary hover:bg-accent/5 hover:translate-x-0.5"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
        )}
        <Icon size={18} className={active ? "text-accent" : "text-secondary"} />
        <span className="truncate">{label}</span>
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
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-5 pr-1">
        {groupedMenu.map(({ groupName, items }) => {
          const isDefaultGroup = groupName === "OVERVIEW";
          const isGroupOpen = expandedGroups[groupName] ?? false;

          const hasActiveGroupItem = items.some((item) =>
            isPathActive(location.pathname, item.path, base)
          );

          return (
            <div key={groupName} className="space-y-1">
              {!isDefaultGroup && (
                <button
                  type="button"
                  onClick={() => toggleGroupExpand(groupName)}
                  aria-expanded={isGroupOpen}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-extrabold tracking-wider text-muted uppercase hover:text-primary transition-colors group/head cursor-pointer select-none"
                >
                  <span className="truncate">{groupName}</span>
                  <MdExpandMore
                    size={14}
                    className={`transition-transform duration-200 ${
                      isGroupOpen ? "rotate-0" : "-rotate-90"
                    } ${hasActiveGroupItem ? "text-accent" : ""}`}
                  />
                </button>
              )}

              {(isDefaultGroup || isGroupOpen) && (
                <div className={!isDefaultGroup ? "space-y-1 pl-2 border-l border-blue-500/15 ml-3 my-1" : "space-y-1"}>
                  {items.map((item) => renderNavLink(item, isMobileDrawer))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /* ── Render Profile Block at Bottom ── */
  const renderProfileFooter = (isMobileDrawer = false) => {
    if (!user) return null;

    const initial = user.name ? user.name.slice(0, 2).toUpperCase() : "SA";
    const roleTitle = user.activeRole || "SUPER_ADMIN";

    if (collapsed && !isMobileDrawer) {
      return (
        <div className="mt-auto pt-3 border-t border-glass-border shrink-0 flex justify-center">
          <div className="relative group/tooltip">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
              {initial}
            </div>
            <div className="fixed left-20 ml-1.5 z-50 hidden group-hover/tooltip:block bg-card border border-glass-border text-primary text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-fadeIn">
              {user.name || "Super Admin"} ({roleTitle})
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-auto pt-3 border-t border-glass-border shrink-0">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card-inner-bg border border-glass-border hover:border-accent/30 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-primary truncate leading-tight">{user.name || "Super Admin"}</p>
            <p className="text-[10px] text-secondary truncate mt-0.5">{user.email || "Super Admin Panel"}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-sidebar flex-col z-40 border-r border-glass-border transition-all duration-200 box-border ${
          collapsed ? "w-[76px] px-3 py-4" : "w-[264px] p-4"
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
      className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={closeMobile}
    >
      <div
        className="bg-sidebar w-72 h-full p-5 flex flex-col shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {renderBrand(true)}

        {drawerExtra && <div className="mb-4 shrink-0">{drawerExtra}</div>}

        {renderNavList(true)}

        {renderProfileFooter(true)}
      </div>
    </div>,
    document.body
  );
}
