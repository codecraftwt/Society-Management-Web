import { useState, useEffect, useCallback, useMemo } from "react";
import { useLang } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import API from "../../services/api";
import {
  MdBarChart, MdRefresh
} from "react-icons/md";
import DashboardAnalytics from "../../components/super-admin/DashboardAnalytics";
import GlobalButton from "../../components/common/GlobalButton";
import UserAvatar from "../../components/common/UserAvatar";
import { useAuthContext } from "../../context/AuthContext";

export default function SuperAdminDashboard() {
  const { t } = useLang();
  const { user } = useAuthContext();

  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveTotals, setLiveTotals] = useState({ totalResidents: 0, totalOwners: 0, totalTenants: 0 });

  const fetchSocieties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/societies");
      setSocieties(res.data || []);
    } catch {
      toast.error(t("saErrLoadSocieties"));
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
      variant: "ad-kpi--residents",
      desc: t("saDashSocRegist", { count: societies.length }, "{count} societies registered"),
    },
    {
      label: t("saDashStatResidents", "Total Residents"),
      value: liveTotals.totalResidents || "–",
      variant: "ad-kpi--guards",
      desc: t(
        "saDashStatResidentsDesc",
        { owners: liveTotals.totalOwners || 0, tenants: liveTotals.totalTenants || 0 },
        "{owners} Owners · {tenants} Tenants"
      ),
    },
    {
      label: t("saStatAssigned"),
      value: totalAssigned,
      variant: "ad-kpi--complaints",
      desc: t("saDashPendingDesc", { count: totalUnassigned }, "{count} pending assignment"),
    },
    {
      label: t("saDashStatPending", "Pending Config"),
      value: totalUnassigned,
      variant: "ad-kpi--flats",
      desc: t("saDashAssignedDesc", { count: totalAssigned }, "{count} societies with active admin"),
    },
  ], [societies, totalAssigned, totalUnassigned, liveTotals, t]);

  return (
    <div className="sa-page sa-dash-page dash-kpi-scope">
      {/* ── HEADER ── */}
      <div className="sa-dash-header">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            name={user?.name}
            src={user?.profile_picture}
            size={44}
            radius={18}
            className="shrink-0"
          />
          <div className="sa-dash-header-text">
            <h1 className="sa-page-title">{t("saOverviewTitle")}</h1>
            <p className="sa-page-subtitle">
              {user?.name
                ? `${user.name}${user.email ? ` · ${user.email}` : ""}`
                : t("saDashSubtitle", "Executive Command Center & Platform Intelligence")}
            </p>
          </div>
        </div>
        <GlobalButton variant="add" borderDraw onClick={fetchSocieties} icon={MdRefresh} title={t("saDashReload", "Reload")}>
          {t("saDashReload", "Reload")}
        </GlobalButton>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className={`ad-kpi ${stat.variant}`}>
            <span className="ad-kpi-val">{stat.value}</span>
            <span className="ad-kpi-label">{stat.label}</span>
            <span className="ad-kpi-desc hidden lg:block">{stat.desc}</span>
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