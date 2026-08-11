import { Children, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdKeyboardArrowDown, MdSearch } from "react-icons/md";

const SEARCH_THRESHOLD = 8;

function buildOptions(optionsProp, children) {
  const list = [];
  const seen = new Set();
  const push = (value, label, disabled) => {
    const key = String(value);
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ value, label: label === undefined || label === null ? String(value) : label, disabled: !!disabled });
  };

  if (optionsProp) {
    optionsProp.forEach((o) => {
      if (o === null || o === undefined) return;
      if (typeof o === "object") {
        push(o.value, o.label, o.disabled);
      } else {
        push(o, String(o), false);
      }
    });
  } else if (children != null) {
    Children.toArray(children).forEach((child) => {
      if (!child || typeof child !== "object" || child.type !== "option") return;
      const label = Children.toArray(child.props.children)
        .map((c) => (typeof c === "string" || typeof c === "number" ? c : ""))
        .join("");
      const value = child.props.value !== undefined ? child.props.value : label;
      push(value, label, child.props.disabled);
    });
  }
  return list;
}

export default function Select({
  value,
  onChange,
  options: optionsProp,
  children,
  placeholder = "Select...",
  className = "",
  style,
  required = false,
  disabled = false,
  name,
  id,
  searchable,
  icon,
  menuClassName = "",
}) {
  const options = useMemo(() => buildOptions(optionsProp, children), [optionsProp, children]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hl, setHl] = useState(-1);
  const [pos, setPos] = useState(null);

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const usesInputClass = String(className).includes("input");
  const showSearch = searchable === true || (searchable === undefined && options.length > SEARCH_THRESHOLD);

  const baseStyle = usesInputClass
    ? null
    : {
        width: "100%",
        padding: "0.65rem 0.8rem",
        borderRadius: 12,
        background: "var(--input-bg)",
        border: "1px solid var(--input-border)",
        color: "var(--text-primary)",
      };

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => String(o.label).toLowerCase().includes(q));
  }, [options, query]);

  const computePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const estH = Math.min(filtered.length * 36 + (showSearch ? 46 : 0) + 12, 320);
    const menuW = Math.min(Math.max(r.width, 150), window.innerWidth - 16);
    let top = r.bottom + 6;
    if (top + estH > window.innerHeight - 8) top = Math.max(8, r.top - estH - 6);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - menuW - 8));
    return { top, left, width: menuW };
  }, [filtered.length, showSearch]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => setPos(computePos());
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, computePos]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (showSearch && searchRef.current) searchRef.current.focus();
      else if (menuRef.current) menuRef.current.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && rootRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && hl >= 0 && menuRef.current) {
      const item = menuRef.current.querySelector(`[data-idx="${hl}"]`);
      if (item) item.scrollIntoView({ block: "nearest" });
    }
  }, [hl, open]);

  const emit = (o) => {
    setOpen(false);
    if (onChange) onChange({ target: { value: o.value } });
  };

  const openMenu = (toOpen) => {
    if (disabled) return;
    setQuery("");
    setHl(-1);
    setPos(computePos());
    setOpen(toOpen);
  };

  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu(!open);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(true);
    }
  };

  const onMenuKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHl((h) => (filtered.length ? (h + 1) % filtered.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHl((h) => (filtered.length ? (h <= 0 ? filtered.length - 1 : h - 1) : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hl]) emit(filtered[hl]);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHl(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHl(filtered.length - 1);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      {(required || name) && (
        <select
          name={name}
          id={id}
          required={required}
          tabIndex={-1}
          aria-hidden="true"
          value={value === undefined || value === null || value === "" ? "" : String(value)}
          onChange={() => {}}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, border: 0 }}
        >
          <option value="">&nbsp;</option>
          {options.map((o) => (
            <option key={String(o.value)} value={o.value} disabled={o.disabled} />
          ))}
        </select>
      )}

      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={() => openMenu(!open)}
        onKeyDown={onTriggerKeyDown}
        className={`flex cursor-pointer items-center justify-between gap-2 select-none ${usesInputClass ? "" : "focus:outline-none"} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
        style={{
          ...baseStyle,
          ...(String(className).includes("reg-select") ? { backgroundImage: "none" } : {}),
          ...style,
          boxSizing: "border-box",
        }}
      >
        <span
          className="truncate"
          style={{ color: selected ? "inherit" : "var(--text-secondary)" }}
        >
          {selected ? selected.label : placeholder}
        </span>
        {icon ? (
          <span className="shrink-0" style={{ color: "var(--text-secondary)" }}>
            {icon}
          </span>
        ) : (
          <MdKeyboardArrowDown
            className="shrink-0"
            style={{
              color: "var(--text-secondary)",
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "none",
            }}
          />
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onMenuKeyDown}
            style={{
              position: "fixed",
              top: pos ? pos.top : 0,
              left: pos ? pos.left : 0,
              width: pos ? pos.width : "auto",
              background: "var(--modal-bg)",
              backdropFilter: "blur(18px)",
              border: "1px solid var(--glass-border)",
              borderRadius: 14,
              boxShadow: "var(--shadow-glass)",
              overflow: "hidden",
              zIndex: 10000,
              outline: "none",
              animation: "scaleIn 0.15s ease",
            }}
            className={menuClassName}
          >
            {showSearch && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 10px",
                  borderBottom: "1px solid var(--glass-border)",
                }}
              >
                <MdSearch style={{ color: "var(--text-secondary)" }} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHl(0);
                  }}
                  placeholder="Search..."
                  style={{
                    width: "100%",
                    padding: "9px 0",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                />
              </div>
            )}
            <div style={{ maxHeight: 272, overflowY: "auto", padding: "4px 0" }}>
              {filtered.length === 0 && (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-secondary)" }}>
                  No options
                </div>
              )}
              {filtered.map((o, i) => {
                const isSel = String(o.value) === String(value);
                const isHl = i === hl;
                return (
                  <button
                    key={String(o.value)}
                    data-idx={i}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    disabled={o.disabled}
                    onClick={() => emit(o)}
                    onMouseEnter={() => setHl(i)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px 14px",
                      textAlign: "left",
                      fontSize: 13,
                      border: "none",
                      background: isSel
                        ? "var(--accent-soft)"
                        : isHl
                          ? "rgba(255,255,255,0.08)"
                          : "transparent",
                      color: isSel ? "#B9CFF8" : "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      cursor: o.disabled ? "not-allowed" : "pointer",
                      opacity: o.disabled ? 0.4 : 1,
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
