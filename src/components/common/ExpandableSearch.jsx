import React, { useState, useRef, useEffect } from "react";
import { MdSearch, MdClose } from "react-icons/md";

export default function ExpandableSearch({
  value = "",
  onChange,
  placeholder = "Search...",
  onClear,
  fetching = false,
  className = "",
  style = {},
  maxWidth = 260,
  isOpen: controlledIsOpen,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(() => Boolean(value));
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const inputRef = useRef(null);

  // If external value changes to non-empty, keep open
  useEffect(() => {
    if (value && !isOpen) {
      if (onOpenChange) onOpenChange(true);
      else setInternalOpen(true);
    }
  }, [value, isOpen, onOpenChange]);

  const handleOpen = () => {
    if (onOpenChange) onOpenChange(true);
    else setInternalOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleInputChange = (e) => {
    if (!onChange) return;
    try {
      onChange(e.target.value);
    } catch {
      try {
        onChange(e);
      } catch (err) {
        console.error("ExpandableSearch onChange error:", err);
      }
    }
  };

  const handleClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onChange) {
      try {
        onChange("");
      } catch {
        try {
          onChange({ target: { value: "" }, currentTarget: { value: "" } });
        } catch (err) {
          console.error("ExpandableSearch onChange error:", err);
        }
      }
    }
    if (onClear) {
      try {
        onClear();
      } catch {}
    }
    if (onOpenChange) onOpenChange(false);
    setInternalOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleClose(e);
    }
  };

  return (
    <div
      className={`sa-search-slider-box ${isOpen ? "sa-search-slider-box--open" : "sa-search-slider-box--closed"} ${className}`}
      style={{ ...(isOpen ? { maxWidth } : {}), ...style }}
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          className="sa-search-trigger-btn"
          title="Search"
          aria-label="Open search bar"
        >
          <MdSearch size={19} />
        </button>
      ) : (
        <div className="sa-search-slide-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="sa-search-slide-input"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={handleClose}
            className="sa-search-slide-close"
            title="Clear and close search"
            aria-label="Clear search"
          >
            <MdClose size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
