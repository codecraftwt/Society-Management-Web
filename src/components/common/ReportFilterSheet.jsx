

import { createPortal } from "react-dom";
import { MdFilterList, MdClose } from "react-icons/md";

export default function ReportFilterSheet({
  /* visibility */
  show, onClose, isMobile,
  /* filter state */
  statusValue, onStatusChange,
  fromDate, onFromDateChange,
  toDate, onToDateChange,
  /* actions */
  onApply, onClear, applied,
  /* translated labels */
  labels = {},
  /* status options: [{ value, label }] */
  statusOptions = [],
}) {
  const {
    title        = "Filters",
    statusLabel  = "Status",
    allStatus    = "All Status",
    fromDateLbl  = "From Date",
    toDateLbl    = "To Date",
    applyBtn     = "Apply Filter",
    clearBtn     = "Clear",
    clearFilters = "Clear filters",
  } = labels;

  const formBody = (
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Status select */}
      <div>
        <label style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--text-secondary)",
          display: "block", marginBottom: 6,
        }}>
          {statusLabel}
        </label>
        <select
          className="input"
          value={statusValue}
          onChange={e => onStatusChange(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <option value="">{allStatus}</option>
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: fromDateLbl, val: fromDate, onChange: onFromDateChange },
          { label: toDateLbl,   val: toDate,   onChange: onToDateChange   },
        ].map(({ label, val, onChange }) => (
          <div key={label}>
            <label style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--text-secondary)",
              display: "block", marginBottom: 6,
            }}>
              {label}
            </label>
            <input
              type="date" className="input" value={val}
              onChange={e => onChange(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        {applied && (
          <button
            onClick={() => { onClear(); onClose && onClose(); }}
            className="btn-muted"
            style={{ flex: 1, justifyContent: "center" }}
          >
            {clearBtn}
          </button>
        )}
        <button
          onClick={onApply}
          className="btn-primary"
          style={{
            flex: applied ? 1 : undefined,
            width: applied ? undefined : "100%",
            justifyContent: "center",
          }}
        >
          {applyBtn}
        </button>
      </div>

      {/* iOS safe-area spacer */}
      {isMobile && <div style={{ height: "max(env(safe-area-inset-bottom), 8px)" }} />}
    </div>
  );

  /* ── Desktop: inline card ── */
  if (!isMobile) {
    return (
      <div className="data-table-wrap animate-fadeIn">
        <div style={{
          padding: "13px 18px", borderBottom: "1px solid var(--glass-border)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <MdFilterList size={15} style={{ color: "var(--accent,#6366f1)" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
            {title}
          </span>
          {applied && (
            <button onClick={onClear} style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 700,
              color: "var(--accent,#6366f1)", background: "none", border: "none", cursor: "pointer",
            }}>
              <MdClose size={13} /> {clearFilters}
            </button>
          )}
        </div>
        {formBody}
      </div>
    );
  }

  /* ── Mobile: portal bottom sheet ── */
  if (!show) return null;

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      <style>{`
        @keyframes rfsSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes rfsFadeIn  { from{opacity:0} to{opacity:1} }
        .rfs-backdrop { animation: rfsFadeIn  0.2s ease forwards; }
        .rfs-sheet    { animation: rfsSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) forwards; }
      `}</style>

      <div className="rfs-backdrop" onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      }} />

      <div className="rfs-sheet" style={{
        position: "relative", zIndex: 1,
        background: "var(--modal-bg, var(--card-bg, #0f172a))",
        borderTop: "1.5px solid var(--glass-border)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.45)",
        maxHeight: "88vh", overflowY: "auto", WebkitOverflowScrolling: "touch",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--glass-border)" }} />
        </div>

        {/* Sheet header */}
        <div style={{
          padding: "8px 18px 14px",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--glass-border)",
        }}>
          <MdFilterList size={16} style={{ color: "var(--accent,#6366f1)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
            {title}
          </span>
          {applied && (
            <button onClick={() => { onClear(); onClose(); }} style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 700,
              color: "var(--accent,#6366f1)", background: "none", border: "none", cursor: "pointer",
            }}>
              <MdClose size={13} /> {clearBtn}
            </button>
          )}
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: "var(--card-inner-bg, rgba(255,255,255,0.06))",
            border: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-secondary)", marginLeft: 2,
          }}>
            <MdClose size={15} />
          </button>
        </div>

        {formBody}
      </div>
    </div>,
    document.body
  );
}