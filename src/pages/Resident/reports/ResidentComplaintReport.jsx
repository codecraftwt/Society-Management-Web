
import React, { useEffect, useState, useMemo } from "react";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext"; // ← NEW
import ReportFilterSheet from "../../../components/common/ReportFilterSheet"; // ← NEW
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdReportProblem, MdOutlineInbox, MdFilterList,
  MdTableChart, MdPictureAsPdf,
  MdCheckCircle, MdSchedule, MdArrowBack, MdCalendarToday,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";

/* ── Mobile hook ── */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

/* ── Spinner ── */
function Spinner() {
  return (
    <svg style={{ color: "var(--accent,#6B46C1)", margin: "0 auto", width: 20, height: 20 }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Status badge — receives t() from parent ── */
function StatusBadge({ status, t }) {
  const cfg = {
    OPEN:        { label: t("compStatusPending"),    Icon: MdSchedule,    color: "#60A5FA", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)"  },
    IN_PROGRESS: { label: t("compStatusInProgress"), Icon: MdSchedule,    color: "#94B5F5", bg: "rgba(148,181,245,0.12)",  border: "rgba(148,181,245,0.25)"  },
    RESOLVED:    { label: t("compStatusResolved"),   Icon: MdCheckCircle, color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"  },
  };
  const c = cfg[status] || {
    label: status?.replace("_", " ") || "—",
    Icon: MdSchedule, color: "#A39EB2",
    bg: "rgba(163,158,178,0.10)", border: "rgba(163,158,178,0.20)",
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: c.color, background: c.bg, border: `1px solid ${c.border}`, whiteSpace: "nowrap",
    }}>
      <c.Icon size={11} /> {c.label}
    </span>
  );
}

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const formatDateShort = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentComplaintReport() {
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const { t }      = useLang(); // ← NEW

  const [complaints,  setComplaints]  = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [status,      setStatus]      = useState("");
  const [fromDate,    setFromDate]    = useState("");
  const [toDate,      setToDate]      = useState("");
  const [applied,     setApplied]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/resident/my-complaints");
      setComplaints(res.data || []);
      setFiltered(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const applyFilter = () => {
    let data = [...complaints];
    if (status) data = data.filter(c => c.status === status);
    if (fromDate && toDate) {
      data = data.filter(c => {
        const d = new Date(c.created_at);
        return d >= new Date(fromDate + "T00:00:00") && d <= new Date(toDate + "T23:59:59");
      });
    }
    setFiltered(data);
    setApplied(true);
    setShowFilters(false);
  };

  const clearFilter = () => {
    setStatus(""); setFromDate(""); setToDate("");
    setFiltered(complaints); setApplied(false);
  };

  const stats = useMemo(() => ({
    total:      filtered.length,
    open:       filtered.filter(c => c.status === "OPEN").length,
    inProgress: filtered.filter(c => c.status === "IN_PROGRESS").length,
    resolved:   filtered.filter(c => c.status === "RESOLVED").length,
  }), [filtered]);

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

  const statCards = [
    { label: t("compStatTotal"),       val: stats.total,      color: "purple" },
    { label: t("crStatOpen"),          val: stats.open,       color: "amber"  },
    { label: t("compTabInProgress"),   val: stats.inProgress, color: "blue"   },
    { label: t("compStatusResolved"),  val: stats.resolved,   color: "green"  },
  ];

  const bleed = isMobile ? {
    marginLeft:  "calc(-1 * var(--page-padding, 16px))",
    marginRight: "calc(-1 * var(--page-padding, 16px))",
    width:       "calc(100% + 2 * var(--page-padding, 16px))",
    borderRadius: 0, boxSizing: "border-box",
  } : { boxSizing: "border-box" };

  const filterLabels = {
    title:        t("reportFilters"),
    statusLabel:  t("billStatusCol"),
    allStatus:    t("reportAllStatus"),
    fromDateLbl:  t("reportFromDate"),
    toDateLbl:    t("reportToDate"),
    applyBtn:     t("reportApply"),
    clearBtn:     t("reportClear"),
    clearFilters: t("reportClearFilters"),
  };
  const statusOptions = [
    { value: "OPEN",        label: t("crStatOpen")            },
    { value: "IN_PROGRESS", label: t("compTabInProgress")     },
    { value: "RESOLVED",    label: t("compStatusResolved")    },
  ];

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--card-inner-bg, rgba(255,255,255,0.06))",
            border: "1px solid var(--glass-border)", cursor: "pointer", color: "var(--text-secondary)",
          }}>
            <MdArrowBack size={17} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg,rgba(251,191,36,0.15),rgba(37,99,235,0.10))",
              border: "1.5px solid rgba(251,191,36,0.25)", color: "#60A5FA",
            }}>
              <MdReportProblem size={21} />
            </div>
            <div>
              <h2 className="page-title">{t("rcrTitle")}</h2>
              <p className="page-subtitle">{t("rcrSubtitle")}</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExcel} className="btn-export" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            <MdTableChart size={14} /> {t("reportExcel")}
          </button>
          <button onClick={handlePDF} className="btn-export" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            <MdPictureAsPdf size={14} /> {t("reportPDF")}
          </button>
          {isMobile && (
            <button onClick={() => setShowFilters(true)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: applied ? "rgba(107,70,193,0.15)" : "var(--card-inner-bg, rgba(255,255,255,0.06))",
              color: applied ? "#9F87D7" : "var(--text-secondary)",
              border: applied ? "1px solid rgba(107,70,193,0.35)" : "1px solid var(--glass-border)",
              cursor: "pointer", position: "relative", whiteSpace: "nowrap",
            }}>
              <MdFilterList size={14} /> {t("reportFilters")}
              {applied && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#6B46C1", boxShadow: "0 0 6px rgba(107,70,193,0.6)" }} />}
            </button>
          )}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      {!loading && complaints.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
          {statCards.map((s, i) => (
            <div key={i} className={`stat-card stat-card--${s.color}`}
              style={{ borderRadius: isMobile ? 14 : 18, padding: isMobile ? "12px 14px" : "16px 18px" }}>
              <div>
                <div className="stat-card__val">{s.val}</div>
                <div className="stat-card__label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FILTER SHEET ── */}
      <ReportFilterSheet
        show={showFilters} onClose={() => setShowFilters(false)} isMobile={isMobile}
        statusValue={status}    onStatusChange={setStatus}
        fromDate={fromDate}     onFromDateChange={setFromDate}
        toDate={toDate}         onToDateChange={setToDate}
        onApply={applyFilter}   onClear={clearFilter}  applied={applied}
        labels={filterLabels}   statusOptions={statusOptions}
      />

      {/* ── DATA CARD ── */}
      <div className="data-table-wrap" style={bleed}>
        <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("rcrMyComplaints")}</span>
          {applied && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(107,70,193,0.1)", color: "#9F87D7", border: "1px solid rgba(107,70,193,0.2)", whiteSpace: "nowrap" }}>
              {t("reportFiltered")}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}>
            <Spinner /><p style={{ fontSize: 13, margin: 0 }}>{t("compLoading")}</p>
          </div>

        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}>
            <MdOutlineInbox size={48} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 13, margin: 0 }}>{t("rcrNoComplaints")}</p>
            {applied && (
              <button onClick={clearFilter} style={{ fontSize: 12, color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                {t("reportClearFilters")}
              </button>
            )}
          </div>

        ) : isMobile ? (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((c, i) => {
              const statusColors = { OPEN: "#60A5FA", IN_PROGRESS: "#94B5F5", RESOLVED: "#4ade80" };
              return (
                <div key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 30}ms`, background: "var(--chip-bg, rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden", boxSizing: "border-box" }}>
                  <div style={{ height: 3, background: statusColors[c.status] || "#60A5FA" }} />
                  <div style={{ padding: "11px 13px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                        {c.title || "—"}
                      </p>
                      <StatusBadge status={c.status} t={t} />
                    </div>
                    {c.description && (
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {c.description}
                      </p>
                    )}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.8 }}>
                      <MdCalendarToday size={11} style={{ flexShrink: 0 }} />
                      {formatDateShort(c.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "right", padding: "4px 2px", margin: 0 }}>
              {t("reportShowing")} {filtered.length} {t("reportOf")} {complaints.length} {t("rcrComplaintsCount")}
            </p>
          </div>

        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  {["#", t("compColTitle"), t("compColDesc"), t("rcrSubmittedOn"), t("billStatusCol")].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                    <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{i + 1}</span></td>
                    <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{c.title}</span></td>
                    <td><span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.description || "—"}</span></td>
                    <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(c.created_at)}</span></td>
                    <td><StatusBadge status={c.status} t={t} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {t("reportShowing")} <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong> {t("reportOf")} {complaints.length} {t("rcrComplaintsCount")}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}