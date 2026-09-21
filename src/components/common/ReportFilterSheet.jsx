

import { createPortal } from "react-dom";
import { MdFilterList, MdClose } from "react-icons/md";
import Select from "./Select";

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
        <Select
          className="input"
          value={statusValue}
          onChange={e => onStatusChange(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <option value="">{allStatus}</option>
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      {/* Quick Date Presets */}
      <div>
        <label style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--text-secondary)",
          display: "block", marginBottom: 6,
        }}>
          Quick Date Presets
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
              onClick={() => {
                const now = new Date();
                let start = "";
                let end = "";
                if (p.id === "TODAY") {
                  start = now.toISOString().slice(0, 10);
                  end = start;
                } else if (p.id === "LAST_7_DAYS") {
                  const prev = new Date(now);
                  prev.setDate(now.getDate() - 6);
                  start = prev.toISOString().slice(0, 10);
                  end = now.toISOString().slice(0, 10);
                } else if (p.id === "THIS_MONTH") {
                  start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                  end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                } else if (p.id === "LAST_MONTH") {
                  start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
                  end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
                }
                onFromDateChange(start);
                onToDateChange(end);
              }}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
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

  /* ── Modal Portal (Centered on desktop, bottom sheet on mobile) ── */
  if (!show) return null;

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column",
      justifyContent: isMobile ? "flex-end" : "center",
      alignItems: isMobile ? "stretch" : "center",
      padding: isMobile ? 0 : 16,
    }}>
      <style>{`
        @keyframes rfsSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes rfsScaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes rfsFadeIn  { from{opacity:0} to{opacity:1} }
        .rfs-backdrop { animation: rfsFadeIn 0.2s ease forwards; }
        .rfs-sheet-mobile { animation: rfsSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) forwards; }
        .rfs-sheet-desktop { animation: rfsScaleIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div className="rfs-backdrop" onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)",
      }} />

      <div className={isMobile ? "rfs-sheet-mobile" : "rfs-sheet-desktop"} style={{
        position: "relative", zIndex: 1,
        width: "100%",
        maxWidth: isMobile ? "100%" : 460,
        background: "var(--modal-bg, var(--card-bg, #2E2A36))",
        border: "1.5px solid var(--glass-border)",
        borderRadius: isMobile ? "20px 20px 0 0" : 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        maxHeight: isMobile ? "88vh" : "85vh",
        overflowY: "auto", WebkitOverflowScrolling: "touch",
      }}>
        {/* Drag handle on mobile */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--glass-border)" }} />
          </div>
        )}

        {/* Sheet header */}
        <div style={{
          padding: isMobile ? "8px 18px 14px" : "14px 20px",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--glass-border)",
        }}>
          <MdFilterList size={18} style={{ color: "var(--accent,#6B46C1)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
            {title}
          </span>
          {applied && (
            <button onClick={() => { onClear(); onClose(); }} style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 700,
              color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer",
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