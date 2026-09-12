import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdCalendarToday, MdChevronLeft, MdChevronRight } from "react-icons/md";
import "./CustomDatePicker.css";

const WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseISO(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplay(value) {
  const d = parseISO(value);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function monthCells(year, month) {
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  return cells;
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  min,
  className = "",
}) {
  const wrapRef = useRef(null);
  const calRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const selected = parseISO(value) || new Date();
  const [view, setView] = useState({ year: selected.getFullYear(), month: selected.getMonth() });
  const minDate = parseISO(min);

  const placeCalendar = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxW = Math.max(220, window.innerWidth - 24);
    const width = Math.min(Math.max(rect.width, 280), maxW);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    const estimatedHeight = 320;
    const top = below + estimatedHeight > window.innerHeight - 12
      ? Math.max(12, rect.top - estimatedHeight - 8)
      : below;
    setCoords({ top, left, width });
  };

  useEffect(() => {
    if (!open) return undefined;
    const current = parseISO(value) || new Date();
    setView({ year: current.getFullYear(), month: current.getMonth() });
    placeCalendar();
    const onDocClick = (e) => {
      if (wrapRef.current?.contains(e.target) || calRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => placeCalendar();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, value]);

  const shiftMonth = (delta) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const isDisabled = (date) => {
    if (!minDate) return false;
    return date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  };

  const calendar = open && coords
    ? createPortal(
      <div
        ref={calRef}
        className="custom-date-calendar"
        role="dialog"
        aria-label="Choose date"
        style={{ top: coords.top, left: coords.left, width: coords.width }}
      >
        <div className="custom-date-calendar__header">
          <button type="button" className="custom-date-calendar__nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <MdChevronLeft size={18} />
          </button>
          <span className="custom-date-calendar__label">
            {new Date(view.year, view.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button type="button" className="custom-date-calendar__nav" onClick={() => shiftMonth(1)} aria-label="Next month">
            <MdChevronRight size={18} />
          </button>
        </div>
        <div className="custom-date-calendar__week">
          {WEEK.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="custom-date-calendar__grid">
          {monthCells(view.year, view.month).map((date, idx) => {
            if (!date) return <span key={`e-${idx}`} />;
            const iso = toISO(date);
            const active = value === iso;
            const disabled = isDisabled(date);
            const today = toISO(new Date()) === iso;
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                className={`custom-date-calendar__day${active ? " is-active" : ""}${today && !active ? " is-today" : ""}`}
                onClick={() => {
                  onChange?.(iso);
                  setOpen(false);
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <div className={`custom-date-picker ${className}`.trim()} ref={wrapRef}>
      <button
        type="button"
        className="input w-full custom-date-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MdCalendarToday size={16} />
        <span className={!value ? "is-placeholder" : ""}>{formatDisplay(value) || placeholder}</span>
      </button>
      {calendar}
    </div>
  );
}
