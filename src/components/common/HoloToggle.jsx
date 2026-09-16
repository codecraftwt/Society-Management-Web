import React from "react";
import "./HoloToggle.css";

/**
 * ModernToggle Component (formerly HoloToggle)
 * Ultra-clean, modern, and attractive iOS/Glassmorphic toggle switch.
 *
 * @param {Object} props
 * @param {string} [props.id] - Unique input identifier
 * @param {boolean} props.checked - Toggle state
 * @param {Function} props.onChange - Toggle event handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.showLabel=true] - Show ON/OFF label
 */
export default function HoloToggle({ id, checked = false, onChange, disabled = false, showLabel = true }) {
  const handleClick = (e) => {
    e.preventDefault();
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className="modern-toggle-wrapper" style={{ opacity: disabled ? 0.6 : 1 }}>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={handleClick}
        disabled={disabled}
        className={`modern-toggle-btn ${checked ? "is-active" : ""}`}
        title={checked ? "Click to disable section" : "Click to enable section"}
      >
        <div className="modern-toggle-thumb">
          <div className="modern-toggle-thumb-inner" />
        </div>
      </button>

      {showLabel && (
        <span className={`modern-toggle-label ${checked ? "on" : "off"}`}>
          {checked ? "ON" : "OFF"}
        </span>
      )}
    </div>
  );
}
