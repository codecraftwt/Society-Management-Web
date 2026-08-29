import { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebarCollapsed");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = (val) => {
    setCollapsedState(val);
    try {
      localStorage.setItem("sidebarCollapsed", String(val));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((prev) => !prev);

  // Synchronize CSS variable on root HTML or body
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--sidebar-w",
      collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w-expanded)"
    );
  }, [collapsed]);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed,
        mobileOpen,
        openMobile,
        closeMobile,
        toggleMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
}
