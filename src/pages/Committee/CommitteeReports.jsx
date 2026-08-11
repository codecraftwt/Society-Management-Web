
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  MdPeople,
  MdReportProblem,
  MdAccountBalance,
  MdArrowForward,
  MdBarChart,
} from "react-icons/md";

export default function CommitteeReports() {
  const navigate = useNavigate();

  const reports = [
    {
      title:       "Visitor Report",
      description: "Track all visitor entries and exits, filter by date range and status to monitor society access.",
      icon:        MdPeople,
      path:        "/committee/reports/visitors",
      color: {
        bg:     "bg-blue-500/15",
        border: "border-blue-500/25",
        icon:   "text-blue-400",
        glow:   "rgba(91,141,239,0.15)",
        stat:   "Entry & exit logs",
      },
    },
    {
      title:       "Complaint Report",
      description: "Monitor all resident complaints, track resolution status and filter by date or category.",
      icon:        MdReportProblem,
      path:        "/committee/reports/complaints",
      color: {
        bg:     "bg-yellow-500/15",
        border: "border-yellow-500/25",
        icon:   "text-yellow-400",
        glow:   "rgba(234,179,8,0.15)",
        stat:   "Open & resolved issues",
      },
    },
    {
      title:       "Financial Report",
      description: "View all bills, payment collections and dues. Filter by status or billing period.",
      icon:        MdAccountBalance,
      path:        "/committee/reports/financial",
      color: {
        bg:     "bg-green-500/15",
        border: "border-green-500/25",
        icon:   "text-green-400",
        glow:   "rgba(34,197,94,0.15)",
        stat:   "Bills & collections",
      },
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
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-secondary text-xs mt-0.5">Operational &amp; financial analytics</p>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 20px 60px ${r.color.glow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
              }}
            >
              {/* ambient glow blob */}
              <div
                className={`absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-20 blur-2xl pointer-events-none ${r.color.bg}`}
              />

              {/* icon */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${r.color.bg} ${r.color.border} group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon size={22} className={r.color.icon} />
              </div>

              <h3 className="font-semibold text-base leading-tight">{r.title}</h3>
              <p className="text-secondary text-xs mt-2 leading-relaxed">{r.description}</p>

              <div className="h-px bg-white/5 my-4" />

              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${r.color.icon} opacity-70`}>
                  {r.color.stat}
                </span>
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold ${r.color.icon} opacity-60 group-hover:opacity-100 group-hover:gap-2.5 transition-all duration-200`}
                >
                  View Report <MdArrowForward size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}