

import React, { useEffect, useState, useMemo } from "react";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext"; // ← NEW
import ReportFilterSheet from "../../../components/common/ReportFilterSheet"; // ← NEW
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdPeople, MdOutlineInbox, MdFilterList,
  MdTableChart, MdPictureAsPdf,
  MdArrowBack, MdLogin, MdLogout,
  MdPhone, MdDirectionsCar, MdAccessTime,
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
    <svg style={{ color: "var(--accent,#6366f1)", margin: "0 auto", width: 20, height: 20 }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Status badge — receives t() ── */
function StatusBadge({ exitTime, t }) {
  const cfg = exitTime
    ? { label: t("rvLeft"),   Icon: MdLogout, color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)" }
    : { label: t("rvInside"), Icon: MdLogin,  color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap",
    }}>
      <cfg.Icon size={11} /> {cfg.label}
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
  return isNaN(dt) ? "—" : dt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
};

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentVisitorReport() {
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const { t }      = useLang(); // ← NEW

  const [visitors,    setVisitors]    = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [vstatus,     setVStatus]     = useState("");
  const [fromDate,    setFromDate]    = useState("");
  const [toDate,      setToDate]      = useState("");
  const [applied,     setApplied]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/resident/my-visitors");
      setVisitors(res.data || []);
      setFiltered(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const applyFilter = () => {
    let data = [...visitors];
    if (vstatus === "INSIDE") data = data.filter(v => !v.exit_time);
    if (vstatus === "LEFT")   data = data.filter(v =>  v.exit_time);
    if (fromDate && toDate) {
      data = data.filter(v => {
        const d = new Date(v.entry_time);
        return d >= new Date(fromDate + "T00:00:00") && d <= new Date(toDate + "T23:59:59");
      });
    }
    setFiltered(data);
    setApplied(true);
    setShowFilters(false);
  };

  const clearFilter = () => {
    setVStatus(""); setFromDate(""); setToDate("");
    setFiltered(visitors); setApplied(false);
  };

  const stats = useMemo(() => ({
    total:  filtered.length,
    inside: filtered.filter(v => !v.exit_time).length,
    left:   filtered.filter(v =>  v.exit_time).length,
  }), [filtered]);

  const handleExcel = () => exportToExcel({
    fileName: "My_Visitor_Report", sheetName: "Visitors",
    data: filtered.map((v, i) => ({
      "#": i + 1,
      [t("vrVisitor")]:  v.visitor_name,
      [t("vrPurpose")]:  v.purpose,
      [t("vrMobile")]:   v.mobile,
      [t("rvVehicle")]:  v.vehicle_number || "-",
      [t("vrEntry")]:    formatDate(v.entry_time),
      [t("vrExit")]:     formatDate(v.exit_time),
      [t("billStatusCol")]: v.exit_time ? t("rvLeft") : t("rvInside"),
    })),
  });

  const handlePDF = () => exportToPDF({
    title: t("rvTitle"), fileName: "My_Visitor_Report",
    columns: ["#", t("vrVisitor"), t("vrPurpose"), t("vrMobile"), t("vrEntry"), t("vrExit"), t("billStatusCol")],
    rows: filtered.map((v, i) => [
      i + 1, v.visitor_name, v.purpose, v.mobile,
      formatDate(v.entry_time), formatDate(v.exit_time),
      v.exit_time ? t("rvLeft") : t("rvInside"),
    ]),
  });

  const statCards = [
    { label: t("vrStatTotal"),  val: stats.total,  color: "purple" },
    { label: t("rvInside"),     val: stats.inside, color: "green"  },
    { label: t("rvLeft"),       val: stats.left,   color: "amber"  },
  ];

  const bleed = isMobile ? {
    marginLeft: "calc(-1 * var(--page-padding, 16px))",
    marginRight: "calc(-1 * var(--page-padding, 16px))",
    width: "calc(100% + 2 * var(--page-padding, 16px))",
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
    { value: "INSIDE", label: t("rvInside") },
    { value: "LEFT",   label: t("rvLeft")   },
  ];

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card-inner-bg, rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", cursor: "pointer", color: "var(--text-secondary)" }}>
            <MdArrowBack size={17} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,rgba(96,165,250,0.15),rgba(59,130,246,0.10))", border: "1.5px solid rgba(96,165,250,0.25)", color: "#60a5fa" }}>
              <MdPeople size={21} />
            </div>
            <div>
              <h2 className="page-title">{t("rvTitle")}</h2>
              <p className="page-subtitle">{t("rvSubtitle")}</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExcel} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", cursor: "pointer", whiteSpace: "nowrap" }}>
            <MdTableChart size={14} /> {t("reportExcel")}
          </button>
          <button onClick={handlePDF} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", cursor: "pointer", whiteSpace: "nowrap" }}>
            <MdPictureAsPdf size={14} /> {t("reportPDF")}
          </button>
          {isMobile && (
            <button onClick={() => setShowFilters(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: applied ? "rgba(99,102,241,0.15)" : "var(--card-inner-bg, rgba(255,255,255,0.06))", color: applied ? "#818cf8" : "var(--text-secondary)", border: applied ? "1px solid rgba(99,102,241,0.35)" : "1px solid var(--glass-border)", cursor: "pointer", position: "relative", whiteSpace: "nowrap" }}>
              <MdFilterList size={14} /> {t("reportFilters")}
              {applied && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 6px rgba(99,102,241,0.6)" }} />}
            </button>
          )}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      {!loading && visitors.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
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
        statusValue={vstatus}   onStatusChange={setVStatus}
        fromDate={fromDate}     onFromDateChange={setFromDate}
        toDate={toDate}         onToDateChange={setToDate}
        onApply={applyFilter}   onClear={clearFilter}  applied={applied}
        labels={filterLabels}   statusOptions={statusOptions}
      />

      {/* ── DATA CARD ── */}
      <div className="data-table-wrap" style={bleed}>
        <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("rvMyVisitors")}</span>
          {applied && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", whiteSpace: "nowrap" }}>
              {t("reportFiltered")}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}>
            <Spinner /><p style={{ fontSize: 13, margin: 0 }}>{t("vrLoading")}</p>
          </div>

        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}>
            <MdOutlineInbox size={48} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 13, margin: 0 }}>{t("rvNoVisitors")}</p>
            {applied && (
              <button onClick={clearFilter} style={{ fontSize: 12, color: "var(--accent,#6366f1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                {t("reportClearFilters")}
              </button>
            )}
          </div>

        ) : isMobile ? (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((v, i) => {
              const isInside = !v.exit_time;
              const accentColor = isInside ? "#4ade80" : "#f87171";
              return (
                <div key={v.id} className="animate-fadeIn" style={{ animationDelay: `${i * 30}ms`, background: "var(--chip-bg, rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden", boxSizing: "border-box" }}>
                  <div style={{ height: 3, background: accentColor }} />
                  <div style={{ padding: "11px 13px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{v.visitor_name || "—"}</p>
                      <StatusBadge exitTime={v.exit_time} t={t} />
                    </div>
                    {v.purpose && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "var(--card-inner-bg, rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}>{v.purpose}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {v.mobile && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdPhone size={12} style={{ color: "var(--accent,#6366f1)", flexShrink: 0 }} />{v.mobile}</span>}
                      {v.vehicle_number && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdDirectionsCar size={12} style={{ color: "var(--accent,#6366f1)", flexShrink: 0 }} />{v.vehicle_number}</span>}
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.75 }}><MdAccessTime size={11} style={{ flexShrink: 0 }} />{formatDateShort(v.entry_time)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "right", padding: "4px 2px", margin: 0 }}>
              {t("reportShowing")} {filtered.length} {t("reportOf")} {visitors.length} {t("rvVisitorsCount")}
            </p>
          </div>

        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>{["#", t("vrVisitor"), t("vrPurpose"), t("vrMobile"), t("rvVehicle"), t("vrEntry"), t("vrExit"), t("billStatusCol")].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.id} className="animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                    <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{i + 1}</span></td>
                    <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{v.visitor_name}</span></td>
                    <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{v.purpose}</span></td>
                    <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{v.mobile}</span></td>
                    <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{v.vehicle_number || "—"}</span></td>
                    <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(v.entry_time)}</span></td>
                    <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(v.exit_time)}</span></td>
                    <td><StatusBadge exitTime={v.exit_time} t={t} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {t("reportShowing")} <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong> {t("reportOf")} {visitors.length} {t("rvVisitorsCount")}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}