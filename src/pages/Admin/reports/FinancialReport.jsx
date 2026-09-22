import React, { useEffect, useState, useCallback, useRef} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdAccountBalance, MdOutlineInbox, MdFilterList,
  MdTableChart, MdPictureAsPdf,
  MdCheckCircle, MdSchedule, MdClose,
  MdPerson, MdApartment, MdCalendarToday,
  MdArrowBack, MdChevronLeft, MdChevronRight,
  MdBusiness, MdAttachMoney
} from "react-icons/md";
import Select from "../../../components/common/Select";

import Pagination from "../../../components/common/Pagination";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => { const fn = () => setM(window.innerWidth < 768); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);
  return m;
}

function Spinner({ small = false }) {
  const s = small ? 14 : 20;
  return (
    <svg style={{ color: "var(--accent,#6B46C1)", margin: "0 auto", width: s, height: s }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// Re-export the SuperAdmin report component to avoid duplication and ensure a default export
export { default } from "../../SuperAdmin/reports/FinancialReport.jsx";

function PaymentBadge({ status, paidLabel, pendingLabel }) {
  const isPaid = status === "PAID";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: isPaid ? "#4ade80" : "#f87171",
      background: isPaid ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
      border: `1px solid ${isPaid ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
      whiteSpace: "nowrap"
    }}>
      {isPaid ? <MdCheckCircle size={11} /> : <MdSchedule size={11} />} {isPaid ? paidLabel : pendingLabel}
    </span>
  );
}

const formatDate = d => { if (!d) return "—"; const dt = new Date(d); return isNaN(dt) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };

function FilterSheet({
  show, onClose, isMobile, societies, societyId, setSocietyId,
  blocks, blockId, setBlockId,
  floors, floorId, setFloorId,
  flats, flatId, setFlatId,
  status, setStatus, fromDate, setFromDate, toDate, setToDate, onApply, onClear, applied, labels
}) {
  if (!show) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: isMobile ? "flex-end" : "center", alignItems: "center", padding: isMobile ? 0 : 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: isMobile ? "100%" : 460, background: "var(--modal-bg,var(--card-bg,#2E2A36))", border: "1.5px solid var(--glass-border)", borderRadius: isMobile ? "20px 20px 0 0" : "18px", boxShadow: "0 20px 50px rgba(0,0,0,0.45)", maxHeight: isMobile ? "88vh" : "90vh", overflowY: "auto" }}>
        {isMobile && <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}><div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--glass-border)" }} /></div>}
        <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--glass-border)" }}>
          <MdFilterList size={16} style={{ color: "var(--accent,#6B46C1)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{labels.filtersTitle}</span>
          {applied && <button onClick={() => { onClear(); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer" }}><MdClose size={13} /> {labels.clear}</button>}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--card-inner-bg,rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}><MdClose size={15} /></button>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Society</label>
            <Select className="input" value={societyId} onChange={e => setSocietyId(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              <option value="ALL">All Societies</option>
              {societies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{labels.statusLabel || "Status"}</label>
            <Select className="input" value={status} onChange={e => setStatus(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              <option value="">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </Select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Quick Date Presets</label>
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
                    setFromDate(start);
                    setToDate(end);
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
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[{ label: labels.fromDate, val: fromDate, set: setFromDate }, { label: labels.toDate, val: toDate, set: setToDate }].map(({ label, val, set }) => (
              <div key={label}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{label}</label>
                <input type="date" className="input" value={val} onChange={e => set(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {applied && <button onClick={() => { onClear(); onClose?.(); }} className="btn-muted" style={{ flex: 1, justifyContent: "center" }}>{labels.clear}</button>}
            <button onClick={onApply} className="btn-primary" style={{ flex: applied ? 1 : undefined, width: applied ? undefined : "100%", justifyContent: "center" }}>{labels.applyFilter}</button>
          </div>
          {isMobile && <div style={{ height: "max(env(safe-area-inset-bottom),8px)" }} />}
        </div>
      </div>
    </div>,
    document.body
  );
}