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
      color: "#A05AFF",
      bg: "rgba(160,90,255,0.12)",
      desc: `${societies.length} societies registered`,
    },
    {
      label: "Total Residents",
      value: liveTotals.totalResidents || "–",
      icon: FaUsers,
      color: "#1BCFB4",
      bg: "rgba(27,207,180,0.12)",
      desc: `${liveTotals.totalOwners || 0} Owners · ${liveTotals.totalTenants || 0} Tenants`,
    },
    {
      label: t("saStatAssigned"),
      value: totalAssigned,
      icon: FaUserShield,
      color: "#9E58FF",
      bg: "rgba(158,88,255,0.12)",
      desc: `${totalUnassigned} pending assignment`,
    },
    {
      label: "Pending Config",
      value: totalUnassigned,
      icon: MdSettings,
      color: "#4BCBEB",
      bg: "rgba(75,203,235,0.12)",
      desc: `${totalAssigned} societies with active admin`,
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
          <p className="sa-page-subtitle">Executive Command Center &amp; Platform Intelligence</p>
        </div>
<GlobalButton variant="add" borderDraw onClick={fetchSocieties} icon={MdRefresh} title="Reload">
          Reload
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
          <h2 className="sa-section-title">Platform Analytics</h2>
          <p className="sa-section-sub">Live intelligence across societies, occupancy &amp; resident demographics</p>
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