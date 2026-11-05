import { useState, useEffect, useCallback, useMemo } from "react";
import { useLang } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import API from "../../services/api";
import { MdBarChart } from "react-icons/md";
import DashboardAnalytics from "../../components/super-admin/DashboardAnalytics";
import StatCard from "../../components/common/StatCard";

export default function SuperAdminDashboard() {
  const { t } = useLang();

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
      tone: "brand",
      desc: t("saDashSocRegist", { count: societies.length }, "{count} societies registered"),
    },
    {
      label: t("saDashStatResidents", "Total Residents"),
      value: liveTotals.totalResidents || "–",
      tone: "info",
      desc: t(
        "saDashStatResidentsDesc",
        { owners: liveTotals.totalOwners || 0, tenants: liveTotals.totalTenants || 0 },
        "{owners} Owners · {tenants} Tenants"
      ),
    },
    {
      label: t("saStatAssigned"),
      value: totalAssigned,
      tone: "success",
      desc: t("saDashPendingDesc", { count: totalUnassigned }, "{count} pending assignment"),
    },
    {
      label: t("saDashStatPending", "Pending Config"),
      value: totalUnassigned,
      tone: "warning",
      desc: t("saDashAssignedDesc", { count: totalAssigned }, "{count} societies with active admin"),
    },
  ], [societies, totalAssigned, totalUnassigned, liveTotals, t]);

  return (
    <div className="sa-page sa-dash-page dash-kpi-scope">
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {stats.map((stat) => (
          /* Migrated from .ad-kpi in Phase 2 batch 2A. The variant names were
             reused across pages with unrelated meanings — ad-kpi--residents is
             "Total Societies" here — so tones are mapped per page by meaning. */
          <StatCard
            key={stat.label}
            variant="sheen"
            tone={stat.tone}
            value={stat.value}
            label={stat.label}
            description={<span className="hidden lg:block">{stat.desc}</span>}
          />
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