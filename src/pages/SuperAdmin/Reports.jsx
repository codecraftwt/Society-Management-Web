import React from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import {
  MdPeople, MdReportProblem, MdAccountBalance,
  MdArrowForward, MdBarChart,
} from "react-icons/md";

export default function SuperAdminReports() {
  const navigate = useNavigate();
  const { t }    = useLang();

  const reports = [
    {
      title:       t("adminRptVisitors") || "Visitor Report",
      description: t("adminRptVisitorsDesc") || "Detailed log of all visitor entries and exits.",
      icon:        MdPeople,
      path:        "/superadmin/reports/visitors",
      tone:        { c: "#F0845D", bg: "rgba(240, 132, 93, 0.13)", bd: "rgba(240, 132, 93, 0.28)" },
      stat:        t("adminRptVisitorsStat") || "Total Logs",
    },
    {
      title:       t("adminRptComplaints") || "Complaint Report",
      description: t("adminRptComplaintsDesc") || "Status tracking for all society complaints.",
      icon:        MdReportProblem,
      path:        "/superadmin/reports/complaints",
      tone:        { c: "#DD6B20", bg: "rgba(221, 107, 32, 0.13)", bd: "rgba(221, 107, 32, 0.28)" },
      stat:        t("adminRptComplaintsStat") || "Total Issues",
    },
    {
      title:       t("adminRptFinancial") || "Financial Report",
      description: t("adminRptFinancialDesc") || "Overview of billing and maintenance collections.",
      icon:        MdAccountBalance,
      path:        "/superadmin/reports/financial",
      tone:        { c: "#2FC27E", bg: "rgba(47, 194, 126, 0.13)", bd: "rgba(47, 194, 126, 0.28)" },
      stat:        t("adminRptFinancialStat") || "Total Revenue",
    },
  ];

  return (
    <div className="sa-page animate-fadeIn">

      {/* ── HERO ── */}
      <div className="sa-page-er">
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div className="er-icon er-icon--amenity">
            <MdBarChart size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="sa-page-title">System-Wide Reports</h1>
            <p className="sa-page-subtitle">
              Analyze data across all societies in the system.
            </p>
          </div>
        </div>
      </div>

      {/* ── REPORT CARDS ── */}
      <div className="sa-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}>
        {reports.map((r, i) => {
          const Icon = r.icon;
          return (
            <div
              key={r.title}
              onClick={() => navigate(r.path)}
              className="sa-card rp-card"
              style={{
                "--typeof-c": r.tone.c,
                "--typeof-bg": r.tone.bg,
                "--typeof-bd": r.tone.bd,
                animationDelay: `${i * 80}ms`,
              }}
            >
              <div className="sa-card-er">
                <div className="sa-card-icon">
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="sa-form-title">{r.title}</h3>
                  <p className="sa-form-subtitle">{r.description}</p>
                </div>
              </div>

              <div className="sa-hairline" />

              <div className="sa-card-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <span className="rp-stat">{r.stat}</span>
                <span className="rp-arrow">
                  {t("rrViewReport") || "View Report"} <MdArrowForward size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}