import { createContext, useContext, useEffect, useState, useCallback } from "react";
import API from "../services/api";
import { getSocket } from "../services/socket";
import {
  deriveThemeTokens,
  applyDynamicTheme,
  clearDynamicTheme,
  applyCardStyle,
  applyQuickLinkStyle,
} from "../utils/themeUtils";
/* Shared purple / Corona tokens for authenticated layouts (html.role-theme). */
import "../theme/role-theme.css";
import "../theme/card-styles.css";
import "../theme/quick-link-styles.css";

/* Default value prevents "value prop required" warning */
const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => { },
  societyTheme: { primary: null, accent: null, cardStyle: "default", quickLinkStyle: "default", configured: false },
  applySocietyTheme: () => { },
  resetSocietyTheme: () => { },
  previewTheme: () => { },
  setCardStyle: () => { },
  setQuickLinkStyle: () => { },
  loadSocietyTheme: async () => { },
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
      return cached
        ? { cardStyle: "default", quickLinkStyle: "default", ...JSON.parse(cached) }
        : { primary: null, accent: null, cardStyle: "default", quickLinkStyle: "default", configured: false };
    } catch {
      return { primary: null, accent: null, cardStyle: "default", quickLinkStyle: "default", configured: false };
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

  // Apply society theme dynamic tokens, card style, and quick link style on <html> whenever societyTheme changes
  useEffect(() => {
    applyCardStyle(societyTheme?.cardStyle || "default");
    applyQuickLinkStyle(societyTheme?.quickLinkStyle || "default");

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
    if (!themeData) {
      setSocietyTheme({ primary: null, accent: null, cardStyle: "default", quickLinkStyle: "default", configured: false });
      localStorage.removeItem("active_society_theme");
      clearDynamicTheme();
      applyCardStyle("default");
      applyQuickLinkStyle("default");
      return;
    }

    const primary = themeData.primary || themeData.primary_color || null;
    const accent = themeData.accent || themeData.accent_color || null;
    const cardStyle = themeData.cardStyle || themeData.card_style || null;
    const quickLinkStyle = themeData.quickLinkStyle || themeData.quick_link_style || null;

    if (!primary && !accent && (!cardStyle || cardStyle === "default") && (!quickLinkStyle || quickLinkStyle === "default")) {
      setSocietyTheme({ primary: null, accent: null, cardStyle: "default", quickLinkStyle: "default", configured: false });
      localStorage.removeItem("active_society_theme");
      clearDynamicTheme();
      applyCardStyle("default");
      applyQuickLinkStyle("default");
      return;
    }

    setSocietyTheme((prev) => {
      const next = {
        primary: primary ?? prev.primary ?? null,
        accent: accent ?? prev.accent ?? null,
        cardStyle: cardStyle ?? prev.cardStyle ?? "default",
        quickLinkStyle: quickLinkStyle ?? prev.quickLinkStyle ?? "default",
        configured: true,
      };
      localStorage.setItem("active_society_theme", JSON.stringify(next));
      const tokens = deriveThemeTokens(next.primary, next.accent);
      if (tokens) applyDynamicTheme(tokens);
      applyCardStyle(next.cardStyle);
      applyQuickLinkStyle(next.quickLinkStyle);
      return next;
    });
  }, []);

  const setCardStyle = useCallback((styleId) => {
    setSocietyTheme((prev) => {
      const next = {
        ...prev,
        cardStyle: styleId,
      };
      localStorage.setItem("active_society_theme", JSON.stringify(next));
      applyCardStyle(styleId);
      return next;
    });
  }, []);

  const setQuickLinkStyle = useCallback((styleId) => {
    setSocietyTheme((prev) => {
      const next = {
        ...prev,
        quickLinkStyle: styleId,
      };
      localStorage.setItem("active_society_theme", JSON.stringify(next));
      applyQuickLinkStyle(styleId);
      return next;
    });
  }, []);

  const resetSocietyTheme = useCallback(() => {
    setSocietyTheme({ primary: null, accent: null, cardStyle: "default", quickLinkStyle: "default", configured: false });
    localStorage.removeItem("active_society_theme");
    clearDynamicTheme();
    applyCardStyle("default");
    applyQuickLinkStyle("default");
  }, []);


  const previewTheme = useCallback((themeData) => {
    if (!themeData || !themeData.primary) {
      clearDynamicTheme();
      return;
    }
    const tokens = deriveThemeTokens(themeData.primary, themeData.accent);
    if (tokens) applyDynamicTheme(tokens);
    const cardStyle = themeData.cardStyle || themeData.card_style;
    const quickLinkStyle = themeData.quickLinkStyle || themeData.quick_link_style;
    if (cardStyle) applyCardStyle(cardStyle);
    if (quickLinkStyle) applyQuickLinkStyle(quickLinkStyle);
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
          const theme = payload?.theme;
          if (theme?.primary || theme?.accent || theme?.cardStyle || theme?.card_style || theme?.quickLinkStyle || theme?.quick_link_style) {
            applySocietyTheme(theme);
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
        setCardStyle,
        setQuickLinkStyle,
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