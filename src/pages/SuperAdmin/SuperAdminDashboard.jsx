import { useState, useEffect, useCallback, useMemo } from "react";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import {
  MdCheckCircle, MdWarning,
  MdBarChart, MdRefresh, MdSettings
} from "react-icons/md";
import { FaBuilding, FaUserShield, FaUsers } from "react-icons/fa";
import DashboardAnalytics from "../../components/super-admin/DashboardAnalytics";
import GlobalButton from "../../components/common/GlobalButton";

export default function SuperAdminDashboard() {
  const { t } = useLang();

  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveTotals, setLiveTotals] = useState({ totalResidents: 0, totalOwners: 0, totalTenants: 0 });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSocieties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/societies");
      setSocieties(res.data || []);
    } catch {
      showToast(t("saErrLoadSocieties"), "error");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSocieties();
  }, [fetchSocieties]);

  const handleAnalyticsDataLoaded = useCallback((totals) => {
    setLiveTotals(totals);
  }, []);

  // KPI calculations
  const totalAssigned = useMemo(() => societies.filter(s => !!s.societyAdmins).length, [societies]);
  const totalUnassigned = societies.length - totalAssigned;

  const stats = useMemo(() => [
    {
      label: t("saStatTotal"),
      value: societies.length,
      icon: FaBuilding,
      color: "#FBBF24",
      bg: "rgba(251,191,36,0.12)",
      desc: t("saDashSocRegist", { count: societies.length }, "{count} societies registered"),
    },
    {
      label: t("saDashStatResidents", "Total Residents"),
      value: liveTotals.totalResidents || "–",
      icon: FaUsers,
      color: "#34D399",
      bg: "rgba(52,211,153,0.12)",
      desc: t(
        "saDashStatResidentsDesc",
        { owners: liveTotals.totalOwners || 0, tenants: liveTotals.totalTenants || 0 },
        "{owners} Owners · {tenants} Tenants"
      ),
    },
    {
      label: t("saStatAssigned"),
      value: totalAssigned,
      icon: FaUserShield,
      color: "#38BDF8",
      bg: "rgba(56,189,248,0.12)",
      desc: t("saDashPendingDesc", { count: totalUnassigned }, "{count} pending assignment"),
    },
    {
      label: t("saDashStatPending", "Pending Config"),
      value: totalUnassigned,
      icon: MdSettings,
      color: "#F472B6",
      bg: "rgba(244,114,182,0.12)",
      desc: t("saDashAssignedDesc", { count: totalAssigned }, "{count} societies with active admin"),
    },
  ], [societies, totalAssigned, totalUnassigned, liveTotals, t]);

  return (
    <div className="sa-page sa-dash-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`sa-toast ${toast.type === "error" ? "sa-toast-error" : "sa-toast-success"}`}>
          {toast.type === "error" ? <MdWarning size={18} /> : <MdCheckCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="sa-dash-header">
        <div className="sa-dash-header-text">
          <h1 className="sa-page-title">{t("saOverviewTitle")}</h1>
          <p className="sa-page-subtitle">{t("saDashSubtitle", "Executive Command Center & Platform Intelligence")}</p>
        </div>
        <GlobalButton variant="add" borderDraw onClick={fetchSocieties} icon={MdRefresh} title={t("saDashReload", "Reload")}>
          {t("saDashReload", "Reload")}
        </GlobalButton>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="sa-kpi-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="sa-kpi-card" style={{ "--kpi-c": stat.color, "--kpi-bg": stat.bg }}>
            <div className="sa-kpi-icon-wrap">
              <stat.icon size={20} />
            </div>
            <div className="sa-kpi-body">
              <p className="sa-kpi-label">{stat.label}</p>
              <p className="sa-kpi-value">{stat.value}</p>
              <p className="sa-kpi-desc">{stat.desc}</p>
            </div>
            <div className="sa-kpi-glow" />
          </div>
        ))}
      </div>

      {/* ── DASHBOARD ANALYTICS CHARTS ── */}
      <div className="sa-section-header">
        <MdBarChart size={20} />
        <div>
          <h2 className="sa-section-title">{t("saDashAnalyticsTitle", "Platform Analytics")}</h2>
          <p className="sa-section-sub">{t("saDashAnalyticsSub", "Live intelligence across societies, occupancy & resident demographics")}</p>
        </div>
      </div>
      <DashboardAnalytics
        societies={societies}
        loading={loading}
        onDataLoaded={handleAnalyticsDataLoaded}
      />
    </div>
  );
}