import React from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import { MdArrowForward, MdBarChart, MdReceiptLong } from "react-icons/md";

export default function AccountantReports() {
  const navigate = useNavigate();
  const { t } = useLang();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: "var(--accent-soft)",
            border: "1px solid var(--glass-border)",
            color: "var(--accent)",
          }}
        >
          <MdBarChart size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("adminRptTitle")}
          </h2>
          <p className="text-secondary text-xs mt-0.5">{t("adminRptSubtitle")}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          onClick={() => navigate("/accountant/reports/financial")}
          className="premium-card p-5 cursor-pointer group relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
        >
          <div
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: "var(--accent-soft)", filter: "blur(28px)" }}
          />
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 border group-hover:scale-110 transition-transform duration-300"
            style={{
              background: "var(--accent-soft)",
              borderColor: "var(--glass-border)",
              color: "var(--accent)",
            }}
          >
            <MdReceiptLong size={22} />
          </div>

          <h3 className="font-semibold text-base leading-tight" style={{ color: "var(--text-primary)" }}>
            {t("adminRptFinancial")}
          </h3>
          <p className="text-secondary text-xs mt-2 leading-relaxed">{t("adminRptFinancialDesc")}</p>

          <div className="h-px my-4" style={{ background: "var(--divider)" }} />

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-accent opacity-80">{t("adminRptFinancialStat")}</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent opacity-70 group-hover:opacity-100 group-hover:gap-2.5 transition-all duration-200">
              {t("rrViewReport")} <MdArrowForward size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}