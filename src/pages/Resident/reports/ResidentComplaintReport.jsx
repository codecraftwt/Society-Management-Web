import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdReportProblem, MdOutlineInbox, MdFilterList,
  MdTableChart, MdPictureAsPdf,
  MdCheckCircle, MdSchedule, MdPending, MdClose,
  MdArrowBack, MdChevronLeft, MdChevronRight, MdCalendarToday,
} from "react-icons/md";
import Select from "../../../components/common/Select";
import ConfirmDiscard from "../../../components/common/ConfirmDiscard";

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

function StatusBadge({ status, t }) {
  const cfg = {
    OPEN:        { label: t("crStatOpen"),           Icon: MdPending,    color: "#f87171", bg: "rgba(248,113,113,0.12)",  border: "rgba(248,113,113,0.25)"  },
    IN_PROGRESS: { label: t("compTabInProgress"),    Icon: MdSchedule,   color: "var(--warning)", bg: "rgba(251,191,36,0.12)",   border: "rgba(251,191,36,0.25)"   },
    RESOLVED:    { label: t("compStatusResolved"),   Icon: MdCheckCircle, color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"   },
  };
  const c = cfg[status] || cfg.OPEN;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>
      <c.Icon size={11} /> {c.label}
    </span>
  );
}

const formatDate = d => { if (!d) return "—"; const dt = new Date(d); return isNaN(dt) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };

function FilterSheet({ show, onClose, isMobile, status, setStatus, fromDate, setFromDate, toDate, setToDate, onApply, onClear, applied, labels }) {
  /* Unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = false; }, [show]);
  const markDirty = () => { dirtyRef.current = true; };
  const requestClose = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else onClose();
  };

  if (!show) return null;

  const formBody = (
    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{labels.statusLabel}</label>
        <Select className="input" value={status} onChange={e => { markDirty(); setStatus(e.target.value); }} style={{ width: "100%", boxSizing: "border-box" }}>
          <option value="">{labels.allStatus}</option>
          <option value="OPEN">{labels.open}</option>
          <option value="IN_PROGRESS">{labels.inProgress}</option>
          <option value="RESOLVED">{labels.resolved}</option>
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
            <input type="date" className="input" value={val} onChange={e => { markDirty(); set(e.target.value); }} style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
        {applied && <button onClick={() => { onClear(); onClose?.(); }} className="btn-muted" style={{ flex: 1, justifyContent: "center" }}>{labels.clear}</button>}
        <button onClick={onApply} className="btn-primary" style={{ flex: applied ? 1 : undefined, width: applied ? undefined : "100%", justifyContent: "center" }}>{labels.applyFilter}</button>
      </div>
      {isMobile && <div style={{ height: "max(env(safe-area-inset-bottom),8px)" }} />}
    </div>
  );

  return createPortal(
    <>
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div
        className="animate-scaleIn"
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : 440,
          background: "var(--card-bg, #1e293b)",
          border: "1.5px solid var(--glass-border)",
          borderRadius: isMobile ? "20px 20px 0 0" : 20,
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MdFilterList size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{labels.filtersTitle}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {applied && <button onClick={() => { onClear(); onClose(); }} style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>{labels.clear}</button>}
            <button onClick={requestClose} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}>✕</button>
          </div>
        </div>
        {formBody}
      </div>
      </div>
      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose(); }}
      />
    </>,
    document.body
  );
}



export default function ResidentComplaintReport() {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/resident/my-complaints");
      setComplaints(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyFilter = () => {
    setStatus(pendingStatus); setFromDate(pendingFrom); setToDate(pendingTo);
    setApplied(!!(pendingStatus || (pendingFrom && pendingTo)));
    setShowFilters(false);
    setPage(1);
  };

  const clearFilter = () => {
    setStatus(""); setFromDate(""); setToDate("");
    setPendingStatus(""); setPendingFrom(""); setPendingTo("");
    setApplied(false);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let data = [...complaints];
    if (status) data = data.filter(c => c.status === status);
    if (fromDate && toDate) {
      data = data.filter(c => {
        const d = new Date(c.created_at);
        return d >= new Date(fromDate + "T00:00:00") && d <= new Date(toDate + "T23:59:59");
      });
    }
    return data;
  }, [complaints, status, fromDate, toDate]);

  const stats = useMemo(() => ({
    total:      filtered.length,
    open:       filtered.filter(c => c.status === "OPEN").length,
    inProgress: filtered.filter(c => c.status === "IN_PROGRESS").length,
    resolved:   filtered.filter(c => c.status === "RESOLVED").length,
  }), [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageData = filtered.slice((page - 1) * limit, page * limit);
  const handlePageChange = p => { setPage(p); setTotalPages(pages); };

  const handleExcel = () => exportToExcel({
    fileName: "My_Complaint_Report", sheetName: "Complaints",
    data: filtered.map((c, i) => ({
      "#": i + 1,
      [t("compColTitle")]:   c.title,
      [t("compColDesc")]:    c.description || "-",
      [t("billStatusCol")]:  c.status,
      [t("rcrSubmittedOn")]: formatDate(c.created_at),
    })),
  });

  const handlePDF = () => exportToPDF({
    title: t("rcrTitle"), fileName: "My_Complaint_Report",
    columns: ["#", t("compColTitle"), t("billStatusCol"), t("rcrSubmittedOn")],
    rows: filtered.map((c, i) => [i + 1, c.title, c.status, formatDate(c.created_at)]),
  });

  const filterLabels = {
    filtersTitle: t("reportFilters"),
    statusLabel:  t("billStatusCol"),
    allStatus:    t("reportAllStatus"),
    open:         t("crStatOpen"),
    inProgress:   t("compTabInProgress"),
    resolved:     t("compStatusResolved"),
    fromDate:     t("reportFromDate"),
    toDate:       t("reportToDate"),
    clear:        t("reportClear"),
    clearFilters: t("reportClearFilters"),
    applyFilter:  t("reportApply"),
  };

  const statCards = [
    { label: t("compStatTotal"),     val: stats.total,      color: "purple" },
    { label: t("crStatOpen"),        val: stats.open,       color: "amber" },
    { label: t("compTabInProgress"), val: stats.inProgress, color: "blue" },
    { label: t("compStatusResolved"), val: stats.resolved,  color: "green" },
  ];
  const cfgColors = { OPEN: "#f87171", IN_PROGRESS: "var(--warning)", RESOLVED: "#4ade80" };

  const bleed = isMobile ? { marginLeft: "calc(-1 * var(--page-padding,16px))", marginRight: "calc(-1 * var(--page-padding,16px))", width: "calc(100% + 2 * var(--page-padding,16px))", borderRadius: 0, boxSizing: "border-box" } : { boxSizing: "border-box" };

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card-inner-bg,rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>
            <MdArrowBack size={18} />
          </button>
          <div className="ad-page-icon"><MdReportProblem size={22} /></div>
          <div><h2 className="page-title">{t("rcrTitle")}</h2><p className="page-subtitle">{loading ? "—" : `${stats.total} ${t("rcrSubtitle")}`}</p></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExcel} className="btn-export" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><MdTableChart size={14} /> {t("reportExcel")}</button>
          <button onClick={handlePDF} className="btn-export" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><MdPictureAsPdf size={14} /> {t("reportPDF")}</button>
          <button onClick={() => setShowFilters(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: applied ? "rgba(107,70,193,0.15)" : "var(--card-inner-bg,rgba(255,255,255,0.06))", color: applied ? "var(--accent, #9F87D7)" : "var(--text-secondary)", border: applied ? "1.5px solid var(--accent, rgba(107,70,193,0.35))" : "1px solid var(--glass-border)", cursor: "pointer", position: "relative", whiteSpace: "nowrap" }}><MdFilterList size={15} /> {t("reportFilters")}{applied && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "var(--accent, #6B46C1)", boxShadow: "0 0 6px var(--accent)" }} />}</button>
        </div>
      </div>

      {/* ── STATS ── */}
      {!loading && stats.total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
          {statCards.map((s, i) => (
            <div key={i} className={`stat-card stat-card--${s.color}`} style={{ borderRadius: isMobile ? 14 : 18, padding: isMobile ? "12px 14px" : "16px 18px" }}>
              <div><div className="stat-card__val">{s.val}</div><div className="stat-card__label">{s.label}</div></div>
            </div>
          ))}
        </div>
      )}

      <FilterSheet show={showFilters} onClose={() => setShowFilters(false)} isMobile={isMobile}
        status={pendingStatus} setStatus={setPendingStatus}
        fromDate={pendingFrom} setFromDate={setPendingFrom}
        toDate={pendingTo} setToDate={setPendingTo}
        onApply={applyFilter} onClear={clearFilter} applied={applied} labels={filterLabels} />

      {/* ── TABLE CARD ── */}
      <div className="data-table-wrap" style={bleed}>
        <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            {t("rcrMyComplaints")}
            {!loading && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-secondary)", marginLeft: 8 }}>— {filtered.length} {t("rcrComplaintsCount")}{applied ? " (filtered)" : ""}</span>}
          </span>
          {applied && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(107,70,193,0.1)", color: "#9F87D7", border: "1px solid rgba(107,70,193,0.2)", whiteSpace: "nowrap" }}>{t("reportFiltered")}</span>}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><Spinner /><p style={{ fontSize: 13, margin: 0 }}>{t("compLoading")}</p></div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><MdOutlineInbox size={48} style={{ opacity: 0.2 }} /><p style={{ fontSize: 13, margin: 0 }}>{t("rcrNoComplaints")}</p>{applied && <button onClick={clearFilter} style={{ fontSize: 12, color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{t("reportClearFilters")}</button>}</div>
        ) : isMobile ? (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {pageData.map((c, i) => (
              <div key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 25}ms`, background: "var(--chip-bg,rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ height: 3, background: cfgColors[c.status] || "#f87171" }} />
                <div style={{ padding: "11px 13px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{c.title || "—"}</p>
                    <StatusBadge status={c.status} t={t} />
                  </div>
                  {c.description && (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</p>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.8 }}><MdCalendarToday size={11} style={{ flexShrink: 0 }} />{formatDate(c.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>{["#", t("compColTitle"), t("compColDesc"), t("rcrSubmittedOn"), t("billStatusCol")].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {pageData.map((c, i) => (
                <tr key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 15}ms` }}>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(page - 1) * limit + i + 1}</span></td>
                  <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{c.title || "—"}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.description || "—"}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(c.created_at)}</span></td>
                  <td><StatusBadge status={c.status} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filtered.length > 0 && (
          <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t("reportShowing")} <strong style={{ color: "var(--text-primary)" }}>{(page - 1) * limit + 1}–{Math.min(page * limit, filtered.length)}</strong> {t("reportOf")} <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong> {t("rcrComplaintsCount")}
            </span>
            <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / limit))} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { setLimit(s); setPage(1); }} />
          </div>
        )}
      </div>
    </div>
  );
}