import React, { useEffect, useState, useMemo } from "react";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext"; // ← NEW
import ReportFilterSheet from "../../../components/common/ReportFilterSheet"; // ← NEW
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdAccountBalance, MdOutlineInbox, MdFilterList,
  MdTableChart, MdPictureAsPdf,
  MdCheckCircle, MdSchedule, MdArrowBack,
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

/* ── Status badge — receives t() ── */
function StatusBadge({ status, t }) {
  const cfg = {
    PAID:    { label: t("billPaid"),    Icon: MdCheckCircle, color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.25)"  },
    PENDING: { label: t("billPending"), Icon: MdSchedule,    color: "#60A5FA", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)"  },
  };
  const c = cfg[status] || cfg.PENDING;
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

const fmtINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentFinanceReport() {
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const { t }      = useLang(); // ← NEW

  const [bills,       setBills]       = useState([]);
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
      const res = await API.get("/resident/my-bills");
      setBills(res.data || []);
      setFiltered(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const applyFilter = () => {
    let data = [...bills];
    if (status) data = data.filter(b => b.status === status);
    if (fromDate && toDate) {
      data = data.filter(b => {
        const d = new Date(b.created_at);
        return d >= new Date(fromDate + "T00:00:00") && d <= new Date(toDate + "T23:59:59");
      });
    }
    setFiltered(data);
    setApplied(true);
    setShowFilters(false);
  };

  const clearFilter = () => {
    setStatus(""); setFromDate(""); setToDate("");
    setFiltered(bills); setApplied(false);
  };

  const stats = useMemo(() => ({
    total:     filtered.length,
    paid:      filtered.filter(b => b.status === "PAID").length,
    pending:   filtered.filter(b => b.status !== "PAID").length,
    collected: filtered.filter(b => b.status === "PAID").reduce((s, b) => s + Number(b.amount), 0),
    due:       filtered.filter(b => b.status !== "PAID").reduce((s, b) => s + Number(b.amount), 0),
  }), [filtered]);

  const handleExcel = () => exportToExcel({
    fileName: "My_Finance_Report", sheetName: "Bills",
    data: filtered.map((b, i) => ({
      "#": i + 1,
      [t("billTitleCol")]:   b.title,
      [t("billMonthCol")]:   b.billing_month,
      [t("billAmountLabel")]:fmtINR(b.amount),
      [t("billStatusCol")]:  b.status,
    })),
  });

  const handlePDF = () => exportToPDF({
    title: t("rfrTitle"), fileName: "My_Finance_Report",
    columns: ["#", t("billTitleCol"), t("billMonthCol"), t("billAmountLabel"), t("billStatusCol")],
    rows: filtered.map((b, i) => [i + 1, b.title, b.billing_month, fmtINR(b.amount), b.status]),
  });

  const statCards = [
    { label: t("billStatTotal"),   val: stats.total,               color: "purple" },
    { label: t("billStatPaid"),    val: stats.paid,                color: "green"  },
    { label: t("billStatPending"), val: stats.pending,             color: "amber"  },
    { label: t("finStatCollected"),val: fmtINR(stats.collected),   color: "green"  },
    { label: t("finStatDue"),      val: fmtINR(stats.due),         color: "amber"  },
  ];
  const statColors = ["purple", "green", "amber", "green", "amber"];

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
    { value: "PAID",    label: t("billPaid")    },
    { value: "PENDING", label: t("billPending") },
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
            <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,rgba(74,222,128,0.15),rgba(16,185,129,0.10))", border: "1.5px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
              <MdAccountBalance size={21} />
            </div>
            <div>
              <h2 className="page-title">{t("rfrTitle")}</h2>
              <p className="page-subtitle">{t("rfrSubtitle")}</p>
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
            <button onClick={() => setShowFilters(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: applied ? "rgba(107,70,193,0.15)" : "var(--card-inner-bg, rgba(255,255,255,0.06))", color: applied ? "#9F87D7" : "var(--text-secondary)", border: applied ? "1px solid rgba(107,70,193,0.35)" : "1px solid var(--glass-border)", cursor: "pointer", position: "relative", whiteSpace: "nowrap" }}>
              <MdFilterList size={14} /> {t("reportFilters")}
              {applied && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#6B46C1", boxShadow: "0 0 6px rgba(107,70,193,0.6)" }} />}
            </button>
          )}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      {!loading && bills.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 10 }}>
          {statCards.map((s, i) => (
            <div key={i} className={`stat-card stat-card--${statColors[i]}`}
              style={{ borderRadius: isMobile ? 14 : 18, padding: isMobile ? "12px 14px" : "16px 18px", ...(isMobile && i === 4 ? { gridColumn: "1 / -1" } : {}) }}>
              <div>
                <div className="stat-card__val" style={{ fontSize: typeof s.val === "string" && s.val.startsWith("₹") ? (isMobile ? 15 : 18) : undefined }}>{s.val}</div>
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
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("rfrMyBills")}</span>
          {applied && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(107,70,193,0.1)", color: "#9F87D7", border: "1px solid rgba(107,70,193,0.2)", whiteSpace: "nowrap" }}>
              {t("reportFiltered")}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}>
            <Spinner /><p style={{ fontSize: 13, margin: 0 }}>{t("billLoading")}</p>
          </div>

        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}>
            <MdOutlineInbox size={48} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 13, margin: 0 }}>{t("rfrNoBills")}</p>
            {applied && (
              <button onClick={clearFilter} style={{ fontSize: 12, color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                {t("reportClearFilters")}
              </button>
            )}
          </div>

        ) : isMobile ? (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((b, i) => {
              const isPaid = b.status === "PAID";
              const accentColor = isPaid ? "#4ade80" : "#60A5FA";
              return (
                <div key={b.id} className="animate-fadeIn" style={{ animationDelay: `${i * 30}ms`, background: "var(--chip-bg, rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden", boxSizing: "border-box" }}>
                  <div style={{ height: 3, background: accentColor }} />
                  <div style={{ padding: "11px 13px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                        {b.title || t("reportMaintenance")}
                      </p>
                      <StatusBadge status={b.status} t={t} />
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, marginBottom: 8, background: isPaid ? "rgba(74,222,128,0.08)" : "rgba(251,191,36,0.08)", border: `1px solid ${isPaid ? "rgba(74,222,128,0.2)" : "rgba(251,191,36,0.2)"}` }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: accentColor, letterSpacing: "-0.02em" }}>{fmtINR(b.amount)}</span>
                    </div>
                    {b.billing_month && (
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{b.billing_month}</span>
                    )}
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "right", padding: "4px 2px", margin: 0 }}>
              {t("reportShowing")} {filtered.length} {t("reportOf")} {bills.length} {t("billCount")}
            </p>
          </div>

        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>{["#", t("billTitleCol"), t("billMonthCol"), t("billAmountLabel"), t("billStatusCol")].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id} className="animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                    <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{i + 1}</span></td>
                    <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{b.title}</span></td>
                    <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{b.billing_month}</span></td>
                    <td><span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", color: b.status === "PAID" ? "#4ade80" : "#60A5FA" }}>{fmtINR(b.amount)}</span></td>
                    <td><StatusBadge status={b.status} t={t} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {t("reportShowing")} <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong> {t("reportOf")} {bills.length} {t("billCount")}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}