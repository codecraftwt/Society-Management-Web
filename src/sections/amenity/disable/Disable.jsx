import { useState } from "react";
import { createPortal } from "react-dom";
import { MdWarning } from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import { Spinner } from "../amenityHelpers.jsx";

const inputStyle = { width: "100%", borderRadius: 10, border: "1.5px solid var(--glass-border)", background: "var(--input-bg)", color: "var(--text-primary)", padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

function Label({ children, sub }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>{children}</label>
      {sub && <span style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.65 }}>{sub}</span>}
    </div>
  );
}

export default function Disable({ isOpen, amenity, onClose, onConfirm }) {
  const { t } = useLang();
  const [disableType, setDisableType] = useState("TEMPORARY");
  const [reason, setReason] = useState("");
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [untilDate, setUntilDate] = useState("");
  const [notifyResidents, setNotifyResidents] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isValid = reason.trim() && (disableType === "PERMANENT" || untilDate);

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    await onConfirm({ disableType, reason: reason.trim(), fromDate: disableType === "TEMPORARY" ? fromDate : null, untilDate: disableType === "TEMPORARY" ? untilDate : null, notifyResidents });
    setSubmitting(false);
  };

  if (!isOpen || !amenity) return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 440, background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>

        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(220,38,38,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⊘</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Disable — {amenity.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Residents won't be able to book this amenity</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "65vh", overflowY: "auto" }}>
          <div>
            <Label>Closure type</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { key: "TEMPORARY", icon: "🕐", label: "Temporary", sub: "Set a reopen date — auto-enables when reached", borderColor: "var(--accent)", bg: "rgba(160,90,255,0.08)" },
                { key: "PERMANENT", icon: "⛔", label: "Permanent", sub: "Closed until manually re-enabled by admin", borderColor: "#dc2626", bg: "rgba(220,38,38,0.07)" },
              ].map(({ key, icon, label, sub, borderColor, bg }) => (
                <div key={key} onClick={() => setDisableType(key)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: disableType === key ? `1.5px solid ${borderColor}` : "1.5px solid var(--glass-border)", background: disableType === key ? bg : "var(--card-inner-bg)", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {disableType === "TEMPORARY" && (
            <div>
              <Label>Closure period</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>From</div>
                  <input type="date" style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>Reopen on</div>
                  <input type="date" style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }} value={untilDate} min={fromDate} onChange={e => setUntilDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div>
            <Label sub="(shown to residents)">Reason</Label>
            <textarea rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} placeholder="e.g. Equipment maintenance, safety inspection…" value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Notify residents</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1 }}>Send a push notification about this closure</div>
            </div>
            {/* Toggle with smooth animation */}
            <div
              onClick={() => setNotifyResidents(p => !p)}
              style={{ width: 40, height: 22, borderRadius: 99, position: "relative", cursor: "pointer", background: notifyResidents ? "var(--accent, #6366f1)" : "var(--glass-border)", transition: "background 0.25s ease", flexShrink: 0, boxShadow: notifyResidents ? "0 0 0 3px var(--accent-soft)" : "none" }}
            >
              <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", left: notifyResidents ? 21 : 3, transition: "left 0.25s ease" }} />
            </div>
          </div>

          {disableType === "PERMANENT" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <MdWarning size={15} style={{ color: "#dc2626", marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#dc2626", lineHeight: 1.5 }}>This will permanently disable the amenity and cancel all pending payment reservations.</span>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={submitting} style={{ padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-primary)", flexShrink: 0 }}>{t("cancel")}</button>
          <button onClick={handleConfirm} disabled={!isValid || submitting} style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: isValid && !submitting ? "pointer" : "not-allowed", border: disableType === "PERMANENT" ? "1.5px solid rgba(220,38,38,0.4)" : "1.5px solid rgba(160,90,255,0.4)", background: disableType === "PERMANENT" ? "rgba(220,38,38,0.1)" : "rgba(160,90,255,0.1)", color: disableType === "PERMANENT" ? "#dc2626" : "var(--accent)", opacity: isValid && !submitting ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {submitting ? <Spinner cls="h-3 w-3" /> : disableType === "PERMANENT" ? "⊘ Disable permanently" : "⊘ Disable temporarily"}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
