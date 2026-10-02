import { createContext, useContext, useEffect, useState, useCallback } from "react";
import API from "../services/api";
import { getSocket } from "../services/socket";
import {
  deriveThemeTokens,
  applyDynamicTheme,
  clearDynamicTheme,
} from "../utils/themeUtils";
/* Shared purple / Corona tokens for authenticated layouts (html.role-theme). */
import "../theme/role-theme.css";

/* Default value prevents "value prop required" warning */
const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
  societyTheme: { primary: null, accent: null, configured: false },
  applySocietyTheme: () => {},
  resetSocietyTheme: () => {},
  previewTheme: () => {},
  loadSocietyTheme: async () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : "dark";
  });

  const [societyTheme, setSocietyTheme] = useState(() => {
    try {
      const cached = localStorage.getItem("active_society_theme");
      return cached ? JSON.parse(cached) : { primary: null, accent: null, configured: false };
    } catch {
      return { primary: null, accent: null, configured: false };
    }
  });

  // Apply light/dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Apply society theme dynamic tokens on <html> whenever societyTheme changes
  useEffect(() => {
    if (societyTheme?.configured && societyTheme?.primary) {
      const tokens = deriveThemeTokens(societyTheme.primary, societyTheme.accent);
      if (tokens) {
        applyDynamicTheme(tokens);
        return;
      }
    }
    clearDynamicTheme();
  }, [societyTheme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const applySocietyTheme = useCallback((themeData) => {
    if (!themeData || (!themeData.primary && !themeData.accent)) {
      setSocietyTheme({ primary: null, accent: null, configured: false });
      localStorage.removeItem("active_society_theme");
      clearDynamicTheme();
      return;
    }
    const next = {
      primary: themeData.primary || null,
      accent: themeData.accent || null,
      configured: true,
    };
    setSocietyTheme(next);
    localStorage.setItem("active_society_theme", JSON.stringify(next));
    const tokens = deriveThemeTokens(next.primary, next.accent);
    if (tokens) applyDynamicTheme(tokens);
  }, []);

  const resetSocietyTheme = useCallback(() => {
    setSocietyTheme({ primary: null, accent: null, configured: false });
    localStorage.removeItem("active_society_theme");
    clearDynamicTheme();
  }, []);

  const previewTheme = useCallback((themeData) => {
    if (!themeData || !themeData.primary) {
      clearDynamicTheme();
      return;
    }
    const tokens = deriveThemeTokens(themeData.primary, themeData.accent);
    if (tokens) applyDynamicTheme(tokens);
  }, []);

  const loadSocietyTheme = useCallback(async (societyId) => {
    if (!societyId) {
      resetSocietyTheme();
      return null;
    }
    try {
      const res = await API.get(`/societies/${societyId}/theme`);
      if (res.data?.success && res.data.configured) {
        applySocietyTheme(res.data.theme);
        return res.data.theme;
      } else {
        resetSocietyTheme();
        return null;
      }
    } catch (err) {
      console.warn("[ThemeContext] Could not load society theme:", err?.message);
      return null;
    }
  }, [applySocietyTheme, resetSocietyTheme]);

  // Listen to real-time socket events for theme updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleThemeUpdated = (payload) => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "null");
        if (storedUser?.society_id && String(storedUser.society_id) === String(payload?.society_id)) {
          if (payload?.theme?.primary || payload?.theme?.accent) {
            applySocietyTheme(payload.theme);
          } else {
            resetSocietyTheme();
          }
        }
      } catch (e) {
        console.error("[ThemeContext] Error handling socket theme update:", e);
      }
    };

    socket.on("society_theme_updated", handleThemeUpdated);
    return () => socket.off("society_theme_updated", handleThemeUpdated);
  }, [applySocietyTheme, resetSocietyTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        societyTheme,
        applySocietyTheme,
        resetSocietyTheme,
        previewTheme,
        loadSocietyTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useRoleTheme() {
  const { loadSocietyTheme, resetSocietyTheme } = useContext(ThemeContext);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("role-theme");

    // Load society theme based on authenticated user session
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const role = user?.activeRole || user?.role;
      const isSuperAdmin = role === "SUPER_ADMIN";

      if (user?.society_id && !isSuperAdmin) {
        loadSocietyTheme(user.society_id);
      } else if (isSuperAdmin) {
        // Super Admin uses global theme unless previewing a specific society
        resetSocietyTheme();
      }
    } catch {
      /* ignore */
    }

    return () => {
      root.classList.remove("role-theme");
    };
  }, [loadSocietyTheme, resetSocietyTheme]);
}

export const useTheme = () => useContext(ThemeContext);