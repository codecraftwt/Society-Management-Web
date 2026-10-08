import React from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import {
  MdPeople,
  MdReportProblem,
  MdAccountBalance,
  MdArrowForward,
  MdBarChart,
  MdTrendingDown,
} from "react-icons/md";

export default function SuperAdminReports() {
  const navigate = useNavigate();
  const { t } = useLang();

  const reports = [
    {
      title: t("adminRptVisitors") || "Visitor Report",
      description:
        t("adminRptVisitorsDesc") ||
        "Detailed log of all visitor entries, vehicles, and gate exits across societies.",
      icon: MdPeople,
      path: "/superadmin/reports/visitors",
      color: {
        bg: "bg-purple-500/15",
        border: "border-purple-500/25",
        icon: "text-purple-400",
        glow: "rgba(160,90,255,0.15)",
        stat: t("adminRptVisitorsStat") || "Visitor Logs",
      },
    },
    {
      title: t("adminRptComplaints") || "Complaint Report",
      description:
        t("adminRptComplaintsDesc") ||
        "Status tracking, resolution metrics, and breakdown for all society complaints.",
      icon: MdReportProblem,
      path: "/superadmin/reports/complaints",
      color: {
        bg: "bg-yellow-500/15",
        border: "border-yellow-500/25",
        icon: "text-yellow-400",
        glow: "rgba(234,179,8,0.15)",
        stat: t("adminRptComplaintsStat") || "Issues & Grievances",
      },
    },
    {
      title: t("adminRptFinancial") || "Financial Report",
      description:
        t("adminRptFinancialDesc") ||
        "Overview of billings, maintenance collections, and revenue cash book.",
      icon: MdAccountBalance,
      path: "/superadmin/reports/financial",
      color: {
        bg: "bg-green-500/15",
        border: "border-green-500/25",
        icon: "text-green-400",
        glow: "rgba(34,197,94,0.15)",
        stat: t("adminRptFinancialStat") || "Revenue & Collections",
      },
    },
    {
      title: t("adminRptExpenses") || "Expense Report",
      description:
        t("adminRptExpensesDesc") ||
        "Money-out records: payees, categories, approved payments, and cash outlays.",
      icon: MdTrendingDown,
      path: "/superadmin/reports/expenses",
      color: {
        bg: "bg-blue-500/15",
        border: "border-blue-500/25",
        icon: "text-blue-400",
        glow: "rgba(59,130,246,0.15)",
        stat: t("adminRptExpensesStat") || "Expenses & Spend",
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="flex items-start gap-3">
        <div className="ad-page-icon">
          <MdBarChart size={22} color="#fff" />
        </div>
        <div>
          <h2 className="page-title">
            {t("adminReportsTitle") || "System-Wide Reports"}
          </h2>
          <p className="page-subtitle">
            {t("adminReportsSubtitle") ||
              "Analyze data and download comprehensive exports across all societies."}
          </p>
        </div>
      </div>

      {/* ── CARDS ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {reports.map((r, i) => {
          const Icon = r.icon;
          return (
            <div
              key={r.title}
              onClick={() => navigate(r.path)}
              className="bg-card rounded-2xl p-5 cursor-pointer group border border-white/8
                         hover:border-white/15 transition-all duration-300 animate-fadeIn
                         hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
              style={{
                animationDelay: `${i * 80}ms`,
                boxShadow: "0 0 0 0 transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 20px 60px ${r.color.glow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
              }}
            >
              <div>
                {/* Glow blob */}
                <div
                  className={`absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-20 blur-2xl pointer-events-none ${r.color.bg}`}
                />

                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${r.color.bg} ${r.color.border} group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon size={22} className={r.color.icon} />
                </div>

                <h3 className="font-semibold text-base leading-tight text-primary">
                  {r.title}
                </h3>
                <p className="text-secondary text-xs mt-2 leading-relaxed">
                  {r.description}
                </p>
              </div>

              <div>
                <div className="h-px bg-white/5 my-4" />

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${r.color.icon} opacity-70`}
                  >
                    {r.color.stat}
                  </span>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-semibold ${r.color.icon} opacity-60 group-hover:opacity-100 group-hover:gap-2.5 transition-all duration-200`}
                  >
                    {t("rrViewReport") || "View Report"} <MdArrowForward size={14} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}