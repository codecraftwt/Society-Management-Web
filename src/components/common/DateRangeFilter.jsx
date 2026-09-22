import React, { useState, useRef, useEffect } from "react";
import { MdCalendarToday, MdArrowDropDown, MdClose, MdCheck } from "react-icons/md";
import { useLang } from "../../context/LanguageContext";

function formatDateShort(iso, lang) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const dt = new Date(+y, +m - 1, +d);
  return isNaN(dt)
    ? iso
    : dt.toLocaleDateString(lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN", { day: "2-digit", month: "short" });
}

const toLocalDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DateRangeFilter({
  fromDate = "",
  toDate = "",
  onChange,
  onClear,
  placeholder = "Date Range",
  align = "right",
  className = "",
}) {
  const { t, lang } = useLang();
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
      if (fromDate === toDate) return formatDateShort(fromDate, lang);
      return `${formatDateShort(fromDate, lang)} – ${formatDateShort(toDate, lang)}`;
    }
    if (fromDate) return t("dateRangeFromValue", { date: formatDateShort(fromDate, lang) });
    if (toDate) return t("dateRangeTillValue", { date: formatDateShort(toDate, lang) });
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
      start = toLocalDateValue(now);
      end = start;
    } else if (type === "LAST_7_DAYS") {
      const prev = new Date(now);
      prev.setDate(now.getDate() - 6);
      start = toLocalDateValue(prev);
      end = toLocalDateValue(now);
    } else if (type === "THIS_MONTH") {
      start = toLocalDateValue(new Date(now.getFullYear(), now.getMonth(), 1));
      end = toLocalDateValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (type === "LAST_MONTH") {
      start = toLocalDateValue(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = toLocalDateValue(new Date(now.getFullYear(), now.getMonth(), 0));
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
        className={`flex items-center gap-2 h-10.5 px-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
          isActive
            ? "border-(--accent) bg-(--accent-soft,rgba(160,90,255,0.12)) text-(--text-primary) shadow-sm"
            : "border-(--glass-border) bg-(--card-inner-bg) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--accent)/50"
        }`}
        aria-expanded={open}
        title={t("dateRangeFilterTitle")}
      >
        <MdCalendarToday
          size={15}
          className={`shrink-0 ${isActive ? "text-(--accent)" : "text-(--text-secondary)"}`}
        />
        <span className="truncate max-w-42.5">{displayLabel}</span>

        {isActive ? (
          <span
            onClick={handleClear}
            className="w-4 h-4 rounded-full flex items-center justify-center bg-(--accent) text-white hover:opacity-80 transition cursor-pointer ml-0.5 shrink-0"
            title={t("dateRangeClear")}
            aria-label={t("dateRangeClear")}
          >
            <MdClose size={11} />
          </span>
        ) : (
          <MdArrowDropDown size={16} className="text-(--text-secondary) shrink-0 -mr-1" />
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-2 p-4 rounded-2xl shadow-2xl border border-(--glass-border) bg-(--card-bg,#1e1e2d) animate-scaleIn"
          style={{
            minWidth: 290,
            maxWidth: 320,
            [align === "right" ? "right" : "left"]: 0,
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-(--glass-border)">
            <div className="flex items-center gap-1.5 text-xs font-bold text-(--text-primary)">
              <MdCalendarToday size={14} className="text-(--accent)" />
              <span>{t("dateRangeSelect")}</span>
            </div>
            {isActive && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-red-400 hover:underline cursor-pointer"
              >
                {t("dateRangeReset")}
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="mb-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-secondary) block mb-1.5">
              {t("dateRangeQuickPresets")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL", label: t("dateRangeAllTime") },
                { id: "TODAY", label: t("dateRangeToday") },
                { id: "LAST_7_DAYS", label: t("dateRangeLast7Days") },
                { id: "THIS_MONTH", label: t("dateRangeThisMonth") },
                { id: "LAST_MONTH", label: t("dateRangeLastMonth") },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-(--glass-border) bg-(--card-inner-bg) text-(--text-secondary) hover:text-(--accent) hover:border-(--accent) transition-all cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="space-y-2.5 mb-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-(--text-secondary) block mb-1">
                {t("dateRangeFromDate")}
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-(--text-secondary) block mb-1">
                {t("dateRangeToDate")}
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
          <div className="flex items-center gap-2 pt-2 border-t border-(--glass-border)">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-(--glass-border) bg-(--card-inner-bg) text-(--text-secondary) hover:bg-(--glass-border) transition cursor-pointer text-center"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => handleApply()}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-(--accent,#a05aff) text-white hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <MdCheck size={14} /> {t("dateRangeApply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
