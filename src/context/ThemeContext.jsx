import { createContext, useContext, useEffect, useState } from "react";
/* Shared purple / Corona tokens for authenticated layouts (html.role-theme). */
import "../theme/role-theme.css";

/* Default value prevents "value prop required" warning */
const ThemeContext = createContext({
  theme:       "dark",
  toggleTheme: () => {},
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

  const toggleTheme = () =>
    setTheme(prev => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useRoleTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("role-theme");
    return () => root.classList.remove("role-theme");
  }, []);
}

export const useTheme = () => useContext(ThemeContext);