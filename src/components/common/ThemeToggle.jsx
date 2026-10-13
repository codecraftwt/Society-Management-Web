import React from "react";
import { useTheme } from "../../context/ThemeContext";
import "./ThemeToggle.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? "theme-toggle--dark" : "theme-toggle--light"}`}
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Track Background Icons */}
      <span className="theme-toggle__track-icon theme-toggle__track-icon--sun" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4.2" />
          <line x1="12" y1="2" x2="12" y2="4.5" />
          <line x1="12" y1="19.5" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4.5" y2="12" />
          <line x1="19.5" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" />
          <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" />
          <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" />
          <line x1="17.3" y1="6.7" x2="19.07" y2="4.93" />
        </svg>
      </span>

      <span className="theme-toggle__track-icon theme-toggle__track-icon--moon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>

      {/* Sliding Blue Thumb */}
      <span className="theme-toggle__thumb" aria-hidden="true">
        <span className={`theme-toggle__thumb-icon ${!isDark ? "theme-toggle__thumb-icon--active" : ""}`}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4.2" />
            <line x1="12" y1="2" x2="12" y2="4.5" />
            <line x1="12" y1="19.5" x2="12" y2="22" />
            <line x1="2" y1="12" x2="4.5" y2="12" />
            <line x1="19.5" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" />
            <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" />
            <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" />
            <line x1="17.3" y1="6.7" x2="19.07" y2="4.93" />
          </svg>
        </span>
        <span className={`theme-toggle__thumb-icon ${isDark ? "theme-toggle__thumb-icon--active" : ""}`}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>
      </span>
    </button>
  );
}