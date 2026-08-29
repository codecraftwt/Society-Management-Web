import React from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import { MdAccountBalance, MdArrowForward, MdBarChart, MdReceiptLong } from "react-icons/md";

export default function AccountantReports() {
  const navigate = useNavigate();
  const { t } = useLang();

  const financial = {
    title:       t("adminRptFinancial"),
    description: t("adminRptFinancialDesc"),
    icon:        MdAccountBalance,
    path:        "/accountant/reports/financial",
    color: { bg: "bg-green-500/15",  border: "border-green-500/25",  icon: "text-green-400",  glow: "rgba(34,197,94,0.15)",  stat: t("adminRptFinancialStat") },
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0 mt-0.5">
          <MdBarChart size={20} className="text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("adminRptTitle")}</h2>
          <p className="text-secondary text-xs mt-0.5">{t("adminRptSubtitle")}</p>
        </div>
      </div>

      {/* ── FINANCIAL REPORT CARD ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          onClick={() => navigate(financial.path)}
          className="bg-card rounded-2xl p-5 cursor-pointer group border border-white/8
                     hover:border-white/15 transition-all duration-300 animate-fadeIn
                     hover:-translate-y-1 relative overflow-hidden"
          style={{ boxShadow: "0 0 0 0 transparent" }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 20px 60px ${financial.color.glow}`; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 0 0 transparent"; }}
        >
          <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-20 blur-2xl pointer-events-none ${financial.color.bg}`} />
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${financial.color.bg} ${financial.color.border} group-hover:scale-110 transition-transform duration-300`}>
            <MdReceiptLong size={22} className={financial.color.icon} />
          </div>

          <h3 className="font-semibold text-base leading-tight">{financial.title}</h3>
          <p className="text-secondary text-xs mt-2 leading-relaxed">{financial.description}</p>

          <div className="h-px bg-white/5 my-4" />

          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${financial.color.icon} opacity-70`}>{financial.stat}</span>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${financial.color.icon} opacity-60 group-hover:opacity-100 group-hover:gap-2.5 transition-all duration-200`}>
              {t("rrViewReport")} <MdArrowForward size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}