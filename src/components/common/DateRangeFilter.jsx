import React, { useState, useRef, useEffect } from "react";
import { MdCalendarToday, MdArrowDropDown, MdClose, MdCheck } from "react-icons/md";

function formatDateShort(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const dt = new Date(+y, +m - 1, +d);
  return isNaN(dt)
    ? iso
    : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function DateRangeFilter({
  fromDate = "",
  toDate = "",
  onChange,
  onClear,
  placeholder = "Date Range",
  align = "right",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  // Sync draft when props change or modal opens
  useEffect(() => {
    setDraftFrom(fromDate);
    setDraftTo(toDate);
  }, [fromDate, toDate, open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const isActive = Boolean(fromDate || toDate);

  const displayLabel = (() => {
    if (fromDate && toDate) {
      if (fromDate === toDate) return formatDateShort(fromDate);
      return `${formatDateShort(fromDate)} – ${formatDateShort(toDate)}`;
    }
    if (fromDate) return `From ${formatDateShort(fromDate)}`;
    if (toDate) return `Till ${formatDateShort(toDate)}`;
    return placeholder;
  })();

  const handleApply = (fromVal = draftFrom, toVal = draftTo) => {
    if (onChange) {
      onChange({ from: fromVal, to: toVal });
    }
    setOpen(false);
  };

  const handleClear = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setDraftFrom("");
    setDraftTo("");
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ from: "", to: "" });
    }
    setOpen(false);
  };

  const applyPreset = (type) => {
    const now = new Date();
    let start = "";
    let end = "";

    if (type === "TODAY") {
      start = now.toISOString().slice(0, 10);
      end = start;
    } else if (type === "LAST_7_DAYS") {
      const prev = new Date(now);
      prev.setDate(now.getDate() - 6);
      start = prev.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else if (type === "THIS_MONTH") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else if (type === "LAST_MONTH") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    } else if (type === "ALL") {
      start = "";
      end = "";
    }

    setDraftFrom(start);
    setDraftTo(end);
    handleApply(start, end);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={triggerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-2 h-[42px] px-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
          isActive
            ? "border-[var(--accent)] bg-[var(--accent-soft,rgba(160,90,255,0.12))] text-[var(--text-primary)] shadow-sm"
            : "border-[var(--glass-border)] bg-[var(--card-inner-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50"
        }`}
        aria-expanded={open}
        title="Filter by date range"
      >
        <MdCalendarToday
          size={15}
          className={`shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}
        />
        <span className="truncate max-w-[170px]">{displayLabel}</span>

        {isActive ? (
          <span
            onClick={handleClear}
            className="w-4 h-4 rounded-full flex items-center justify-center bg-[var(--accent)] text-white hover:opacity-80 transition cursor-pointer ml-0.5 shrink-0"
            title="Clear date filter"
            aria-label="Clear date filter"
          >
            <MdClose size={11} />
          </span>
        ) : (
          <MdArrowDropDown size={16} className="text-[var(--text-secondary)] shrink-0 -mr-1" />
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-2 p-4 rounded-2xl shadow-2xl border border-[var(--glass-border)] bg-[var(--card-bg,#1e1e2d)] animate-scaleIn"
          style={{
            minWidth: 290,
            maxWidth: 320,
            [align === "right" ? "right" : "left"]: 0,
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              <MdCalendarToday size={14} className="text-[var(--accent)]" />
              <span>Select Date Range</span>
            </div>
            {isActive && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-red-400 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="mb-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
              Quick Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL", label: "All Time" },
                { id: "TODAY", label: "Today" },
                { id: "LAST_7_DAYS", label: "Last 7 Days" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "LAST_MONTH", label: "Last Month" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--glass-border)] bg-[var(--card-inner-bg)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="space-y-2.5 mb-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                From Date
              </label>
              <input
                type="date"
                className="input w-full text-xs h-9 rounded-lg"
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(e) => setDraftFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                To Date
              </label>
              <input
                type="date"
                className="input w-full text-xs h-9 rounded-lg"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--glass-border)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-[var(--glass-border)] bg-[var(--card-inner-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)] transition cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApply()}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent,#a05aff)] text-white hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <MdCheck size={14} /> Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
