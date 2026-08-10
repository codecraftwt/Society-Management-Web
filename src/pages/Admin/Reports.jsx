
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext"; // ← NEW
import {
  MdPeople, MdReportProblem, MdAccountBalance,
  MdArrowForward, MdBarChart,
} from "react-icons/md";

export default function Reports() {
  const navigate = useNavigate();
  const { t }    = useLang(); // ← NEW

  /* Built inside component so labels update live on language change */
  const reports = [
    {
      title:       t("adminRptVisitors"),
      description: t("adminRptVisitorsDesc"),
      icon:        MdPeople,
      path:        "/admin/reports/visitors",
      color: { bg: "bg-blue-500/15",   border: "border-blue-500/25",   icon: "text-blue-400",   glow: "rgba(59,130,246,0.15)",  stat: t("adminRptVisitorsStat") },
    },
    {
      title:       t("adminRptComplaints"),
      description: t("adminRptComplaintsDesc"),
      icon:        MdReportProblem,
      path:        "/admin/reports/complaints",
      color: { bg: "bg-yellow-500/15", border: "border-yellow-500/25", icon: "text-yellow-400", glow: "rgba(234,179,8,0.15)",   stat: t("adminRptComplaintsStat") },
    },
    {
      title:       t("adminRptFinancial"),
      description: t("adminRptFinancialDesc"),
      icon:        MdAccountBalance,
      path:        "/admin/reports/financial",
      color: { bg: "bg-green-500/15",  border: "border-green-500/25",  icon: "text-green-400",  glow: "rgba(34,197,94,0.15)",   stat: t("adminRptFinancialStat") },
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0 mt-0.5">
          <MdBarChart size={20} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("adminRptTitle")}</h2>
          <p className="text-secondary text-xs mt-0.5">{t("adminRptSubtitle")}</p>
        </div>
      </div>

      {/* ── CARDS ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r, i) => {
          const Icon = r.icon;
          return (
            <div
              key={r.title}
              onClick={() => navigate(r.path)}
              className="bg-card rounded-2xl p-5 cursor-pointer group border border-white/8
                         hover:border-white/15 transition-all duration-300 animate-fadeIn
                         hover:-translate-y-1 relative overflow-hidden"
              style={{ animationDelay: `${i * 80}ms`, boxShadow: "0 0 0 0 transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 20px 60px ${r.color.glow}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 0 0 transparent"; }}
            >
              <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-20 blur-2xl pointer-events-none ${r.color.bg}`} />

              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${r.color.bg} ${r.color.border} group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={22} className={r.color.icon} />
              </div>

              <h3 className="font-semibold text-base leading-tight">{r.title}</h3>
              <p className="text-secondary text-xs mt-2 leading-relaxed">{r.description}</p>

              <div className="h-px bg-white/5 my-4" />

              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${r.color.icon} opacity-70`}>{r.stat}</span>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${r.color.icon} opacity-60 group-hover:opacity-100 group-hover:gap-2.5 transition-all duration-200`}>
                  {t("rrViewReport")} <MdArrowForward size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}