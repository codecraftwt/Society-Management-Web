import React, { useEffect, useState, useCallback } from "react";
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
  MdPerson, MdApartment, MdCalendarToday,
  MdArrowBack, MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import Select from "../../../components/common/Select";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => { const fn = () => setM(window.innerWidth < 768); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);
  return m;
}

function Spinner({ small = false }) {
  const s = small ? 14 : 20;
  return (
    <svg style={{ color: "var(--accent,#6366f1)", margin: "0 auto", width: s, height: s }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, []);
  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn"><MdChevronLeft size={14} /> Prev</button>
      {pages.map((p, i) => p === "..." ? <span key={`e${i}`} className="pagination-ellipsis">…</span> : (
        <button key={p} onClick={() => onPageChange(p)} className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>{p}</button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">Next <MdChevronRight size={14} /></button>
    </div>
  );
}

function StatusBadge({ status, openLabel, inProgressLabel, resolvedLabel }) {
  const cfg = {
    OPEN: { label: openLabel, Icon: MdPending, color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)" },
    IN_PROGRESS: { label: inProgressLabel, Icon: MdSchedule, color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)" },
    RESOLVED: { label: resolvedLabel, Icon: MdCheckCircle, color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" },
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
  const formBody = (
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{labels.statusLabel}</label>
        <Select className="input" value={status} onChange={e => setStatus(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
          <option value="">{labels.allStatus}</option>
          <option value="OPEN">{labels.open}</option>
          <option value="IN_PROGRESS">{labels.inProgress}</option>
          <option value="RESOLVED">{labels.resolved}</option>
        </Select>
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
  );

  if (!isMobile) return (
    <div className="data-table-wrap animate-fadeIn">
      <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <MdFilterList size={15} style={{ color: "var(--accent,#6366f1)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{labels.filtersTitle}</span>
        {applied && <button onClick={onClear} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--accent,#6366f1)", background: "none", border: "none", cursor: "pointer" }}><MdClose size={13} /> {labels.clearFilters}</button>}
      </div>
      {formBody}
    </div>
  );

  if (!show) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "var(--modal-bg,var(--card-bg,#0f172a))", borderTop: "1.5px solid var(--glass-border)", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.45)", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}><div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--glass-border)" }} /></div>
        <div style={{ padding: "8px 18px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--glass-border)" }}>
          <MdFilterList size={16} style={{ color: "var(--accent,#6366f1)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{labels.filtersTitle}</span>
          {applied && <button onClick={() => { onClear(); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--accent,#6366f1)", background: "none", border: "none", cursor: "pointer" }}><MdClose size={13} /> {labels.clear}</button>}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--card-inner-bg,rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}><MdClose size={15} /></button>
        </div>
        {formBody}
      </div>
    </div>,
    document.body
  );
}

const LIMIT = 15;

export default function ComplaintReport() {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [counts, setCounts] = useState({ total: 0, open: 0, progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");

  const fetchComplaints = useCallback(async (pg, s, fd, td, isInit = false) => {
    isInit ? setLoading(true) : setFetching(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (s) params.set("status", s);
      if (fd && td) { params.set("fromDate", fd); params.set("toDate", td); }
      const res = await API.get(`/reports/complaints?${params}`);
      const data = res.data;
      setComplaints(data.data || []);
      setCounts(data.counts || { total: 0, open: 0, progress: 0, resolved: 0 });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setFetching(false); }
  }, []);

  useEffect(() => { fetchComplaints(1, "", "", "", true); }, []);

  const applyFilter = () => {
    setStatus(pendingStatus); setFromDate(pendingFrom); setToDate(pendingTo);
    setApplied(!!(pendingStatus || (pendingFrom && pendingTo)));
    setShowFilters(false);
    fetchComplaints(1, pendingStatus, pendingFrom, pendingTo);
  };

  const clearFilter = () => {
    setStatus(""); setFromDate(""); setToDate("");
    setPendingStatus(""); setPendingFrom(""); setPendingTo("");
    setApplied(false);
    fetchComplaints(1, "", "", "");
  };

  const handlePageChange = p => fetchComplaints(p, status, fromDate, toDate);

  const statusLabels = { openLabel: t("rptOpen"), inProgressLabel: t("compTabInProgress"), resolvedLabel: t("compStatusResolved") };
  const filterLabels = { filtersTitle: t("rptFilters"), statusLabel: t("billStatusCol"), allStatus: t("rptAllStatus"), open: t("rptOpen"), inProgress: t("compTabInProgress"), resolved: t("compStatusResolved"), fromDate: t("rptFromDate"), toDate: t("rptToDate"), clear: t("rptClear"), clearFilters: t("rptClearFilters"), applyFilter: t("rptApplyFilter") };
  const cfgColors = { OPEN: "#f87171", IN_PROGRESS: "#fbbf24", RESOLVED: "#4ade80" };

  const fetchAllForExport = async () => {
    const params = new URLSearchParams({ page: 1, limit: 1000 });
    if (status) params.set("status", status);
    if (fromDate && toDate) { params.set("fromDate", fromDate); params.set("toDate", toDate); }
    const res = await API.get(`/reports/complaints?${params}`);
    return res.data.data || [];
  };

  const handleExcelExport = async () => {
    const all = await fetchAllForExport();
    exportToExcel({ fileName: "Complaint_Report", sheetName: "Complaints", data: all.map((c, i) => ({ [t("rptColSrNo")]: i + 1, [t("rptColResident")]: c.User?.name || "-", [t("rptColFlat")]: c.Flat?.flat_number || "-", [t("rptColBlock")]: c.Flat?.Block?.name || "-", [t("rptColSubject")]: c.title || "-", [t("billStatusCol")]: c.status, [t("compColDate")]: formatDate(c.created_at) })) });
  };
  const handlePDFExport = async () => {
    const all = await fetchAllForExport();
    exportToPDF({ title: t("rptCompTitle"), fileName: "Complaint_Report", columns: [t("rptColSrNo"), t("rptColResident"), t("rptColFlat"), t("rptColBlock"), t("rptColSubject"), t("billStatusCol"), t("compColDate")], rows: all.map((c, i) => [i + 1, c.User?.name || "-", c.Flat?.flat_number || "-", c.Flat?.Block?.name || "-", c.title || "-", c.status, formatDate(c.created_at)]) });
  };

  const bleed = isMobile ? { marginLeft: "calc(-1 * var(--page-padding,16px))", marginRight: "calc(-1 * var(--page-padding,16px))", width: "calc(100% + 2 * var(--page-padding,16px))", borderRadius: 0, boxSizing: "border-box" } : { boxSizing: "border-box" };

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card-inner-bg,rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>
            <MdArrowBack size={18} />
          </button>
          <div className="er-icon er-icon--complaint"><MdReportProblem size={22} /></div>
          <div><h2 className="page-title">{t("rptCompTitle")}</h2><p className="page-subtitle">{loading ? "—" : `${counts.total} ${t("rptCompSubtitle")}`}</p></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExcelExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", cursor: "pointer", whiteSpace: "nowrap" }}><MdTableChart size={14} /> {t("rptExcel")}</button>
          <button onClick={handlePDFExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", cursor: "pointer", whiteSpace: "nowrap" }}><MdPictureAsPdf size={14} /> {t("rptPDF")}</button>
          {isMobile && <button onClick={() => setShowFilters(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: applied ? "rgba(99,102,241,0.15)" : "var(--card-inner-bg,rgba(255,255,255,0.06))", color: applied ? "#818cf8" : "var(--text-secondary)", border: applied ? "1px solid rgba(99,102,241,0.35)" : "1px solid var(--glass-border)", cursor: "pointer", position: "relative", whiteSpace: "nowrap" }}><MdFilterList size={14} /> {t("rptFilters")}{applied && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 6px rgba(99,102,241,0.6)" }} />}</button>}
        </div>
      </div>

      {/* ── STATS ── */}
      {!loading && counts.total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
          {[
            { label: t("compStatTotal"), val: counts.total, color: "purple" },
            { label: t("rptOpen"), val: counts.open, color: "amber" },
            { label: t("compTabInProgress"), val: counts.progress, color: "amber" },
            { label: t("compStatusResolved"), val: counts.resolved, color: "green" },
          ].map((s, i) => (
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
            {t("rptAllComplaints")}
            {!loading && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-secondary)", marginLeft: 8 }}>— {totalItems} records{applied ? " (filtered)" : ""}</span>}
          </span>
          {fetching && <Spinner small />}
          {applied && !fetching && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", whiteSpace: "nowrap" }}>{t("rptFiltered")}</span>}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><Spinner /><p style={{ fontSize: 13, margin: 0 }}>{t("compLoading")}</p></div>
        ) : complaints.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><MdOutlineInbox size={48} style={{ opacity: 0.2 }} /><p style={{ fontSize: 13, margin: 0 }}>{t("rptNoData")}</p>{applied && <button onClick={clearFilter} style={{ fontSize: 12, color: "var(--accent,#6366f1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>{t("rptClearFilters")}</button>}</div>
        ) : isMobile ? (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {complaints.map((c, i) => (
              <div key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 25}ms`, background: "var(--chip-bg,rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ height: 3, background: cfgColors[c.status] || "#f87171" }} />
                <div style={{ padding: "11px 13px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{c.title || "—"}</p>
                    <StatusBadge status={c.status} {...statusLabels} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdPerson size={12} style={{ color: "var(--accent,#6366f1)", flexShrink: 0 }} />{c.User?.name || "—"}</span>
                    {c.Flat?.flat_number && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdApartment size={12} style={{ color: "var(--accent,#6366f1)", flexShrink: 0 }} />{c.Flat.flat_number}{c.Flat?.Block?.name ? ` · ${c.Flat.Block.name}` : ""}</span>}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.7 }}><MdCalendarToday size={11} style={{ flexShrink: 0 }} />{formatDate(c.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>{[t("rptColSrNo"), t("rptColResident"), t("rptColFlat"), t("rptColBlock"), t("rptColSubject"), t("billStatusCol"), t("compColDate")].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {complaints.map((c, i) => (
                <tr key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 15}ms` }}>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(page - 1) * LIMIT + i + 1}</span></td>
                  <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{c.User?.name || "—"}</span></td>
                  <td><span className="info-chip">{c.Flat?.flat_number || "—"}</span></td>
                  <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{c.Flat?.Block?.name || "—"}</span></td>
                  <td><span style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.title || "—"}</span></td>
                  <td><StatusBadge status={c.status} {...statusLabels} /></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(c.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && complaints.length > 0 && (
          <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t("billShowing")} <strong style={{ color: "var(--text-primary)" }}>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong> {t("billOf")} <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> {t("rptRecords")}
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
}