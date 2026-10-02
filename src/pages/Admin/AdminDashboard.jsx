import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { isCommitteeMember } from "../../utils/permissions";
import API from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  MdReportProblem,
  MdCheckCircle, MdFlashOn, MdApartment,
  MdRefresh,
} from "react-icons/md";
import PanelHero from "../../components/common/PanelHero";
import StatCard from "../../components/common/StatCard";
import RecordCard from "../../components/common/RecordCard";
import CreditedDebitedChart from "../../components/accounting/CreditedDebitedChart";

/* ── SKELETON LOADER ── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 w-full min-w-0 animate-pulse">
      {/* Hero Skeleton */}
      <div className="bg-card/40 border border-glass-border rounded-[18px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-[54px] h-[54px] bg-white/10 rounded-[17px] shrink-0" />
          <div className="space-y-2">
            <div className="h-4 w-40 bg-white/10 rounded" />
            <div className="h-3 w-56 bg-white/5 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 bg-white/10 rounded-[10px]" />
          <div className="h-8 w-24 bg-white/10 rounded-[10px]" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card/40 border border-glass-border rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-white/10 rounded" />
              <div className="w-10 h-10 bg-white/10 rounded-xl" />
            </div>
            <div className="h-8 w-16 bg-white/15 rounded-lg" />
            <div className="h-3 w-32 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/40 border border-glass-border rounded-2xl p-6 h-80 flex flex-col justify-between">
          <div className="h-5 w-40 bg-white/10 rounded" />
          <div className="w-36 h-36 mx-auto rounded-full bg-white/5 border-4 border-white/10" />
          <div className="flex justify-center gap-4">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-3 w-16 bg-white/10 rounded" />
          </div>
        </div>
        <div className="bg-card/40 border border-glass-border rounded-2xl p-6 h-80 flex flex-col justify-between">
          <div className="h-5 w-40 bg-white/10 rounded" />
          <div className="h-48 w-full bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useLang();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getSocietyId = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      return JSON.parse(atob(token.split(".")[1])).society_id;
    } catch {
      return null;
    }
  };

  const societyId = getSocietyId();

  const loadDashboardData = async () => {
    if (!societyId) {
      setError("dashSocietyIdMissing");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      setError("dashLoadError");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const residents = stats?.residents ?? 0;
  const guards = stats?.guards ?? 0;
  const openComplaints = stats?.openComplaints ?? 0;
  const totalFlats = stats?.totalFlats ?? 0;

  const chartData = [
    { name: t("dashResidents") || "Residents", value: residents, color: "#22d3ee" },
    { name: t("dashGuards") || "Guards", value: guards, color: "#3b82f6" },
    { name: t("dashOpenComplaints") || "Complaints", value: openComplaints, color: "#fb7185" },
    { name: t("dashTotalFlats") || "Total Flats", value: totalFlats, color: "#a78bfa" },
  ];

  const { user } = useContext(AuthContext);
  const isCommittee = isCommitteeMember(user);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto my-8">
        <div className="flex items-center gap-3">
          <MdReportProblem size={24} className="shrink-0" />
          <p className="font-medium text-sm">{t(error)}</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-semibold shrink-0"
        >
          <MdRefresh size={16} />
          {t("dashRetryLoading")}
        </button>
      </div>
    );
  }

  return (
    <div className="dash-kpi-scope space-y-6 w-full min-w-0 max-w-400 mx-auto pb-8">
      {/* ── 1. DASHBOARD HERO HEADER ── */}
      <PanelHero societyName={stats?.societyName} />

      {/* ── 2. KEY METRICS KPI CARDS (4 COLUMNS) ── */}
      {/* Migrated from .ad-kpi in Phase 2 batch 2A. The scoped palette at
          role-theme.css:2440-2450 (cyan / blue / pink / lavender) was replaced
          by semantic tones so the cards now follow role, light and the
          society accent. variant="sheen" reproduces the ::before corner blob
          and ::after shine that .dash-kpi-scope applied to all four cards.
          The descriptions keep their original `hidden lg:block` wrapper so
          their below-lg visibility is unchanged. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          variant="sheen"
          tone="brand"
          value={residents}
          label={t("dashResidents") || "Residents"}
          description={
            <span className="hidden lg:block">
              {t("dashResidentsDesc") || "Active members living in society"}
            </span>
          }
        />

        <StatCard
          variant="sheen"
          tone="success"
          value={guards}
          label={t("dashGuards") || "Guards"}
          description={
            <span className="hidden lg:block">
              {t("dashGuardsDesc") || "On-duty security personnel"}
            </span>
          }
        />

        <StatCard
          variant="sheen"
          tone="warning"
          value={openComplaints}
          label={t("dashOpenComplaints") || "Open Complaints"}
          onClick={() => navigate("/admin/complaints")}
          description={
            <span className="hidden lg:block">
              {isCommittee ? t("dashCommitteeReview") : t("dashComplaintsDesc")}
            </span>
          }
        />

        <StatCard
          variant="sheen"
          tone="info"
          value={totalFlats}
          label={t("dashTotalFlats") || "Total Flats"}
          description={
            <span className="hidden lg:block">
              {t("dashTotalFlatsDesc") || "Across all blocks & floors"}
            </span>
          }
        />
      </div>

      {/* ── 3. MAIN ANALYTICS CHARTS (2 COLUMNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full min-w-0">
        {/* Donut Chart: Society Overview */}
        <div className="bg-card border border-glass-border rounded-2xl p-6 flex flex-col justify-between min-w-0 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-primary">
                {t("dashDistribution") || "Society Overview"}
              </h2>
              <p className="text-xs text-secondary">
                {t("dashDistributionSub")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {chartData.map((d) => (
                <span
                  key={d.name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card-inner-bg border border-glass-border text-secondary font-medium"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: d.color }}
                  />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full h-64 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  stroke="var(--card-bg)"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card-bg)",
                    borderColor: "var(--glass-border)",
                    borderRadius: "12px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                  itemStyle={{ color: "var(--text-primary)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Quick Comparison */}
        <div className="bg-card border border-glass-border rounded-2xl p-6 flex flex-col justify-between min-w-0 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-primary">
              {t("dashComparison") || "Quick Comparison"}
            </h2>
            <p className="text-xs text-secondary">
              {t("dashComparisonSub")}
            </p>
          </div>

          <div className="w-full h-64 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap={30}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  axisLine={{ stroke: "var(--glass-border)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  axisLine={{ stroke: "var(--glass-border)" }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{
                    background: "var(--card-bg)",
                    borderColor: "var(--glass-border)",
                    borderRadius: "12px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                  itemStyle={{ color: "var(--text-primary)" }}
                />
                <Bar
                  dataKey="value"
                  name={t("dashCount")}
                  radius={[8, 8, 0, 0]}
                  barSize={28}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 3b. FINANCIAL OVERVIEW ── */}
      <CreditedDebitedChart linkTo="/admin/accounting" />

      {/* ── 4. OPERATIONAL STATUS SECTION (3 COLUMNS) ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-secondary">
          {t("dashOperationalStatus")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Item 1: System Status */}
          <RecordCard
            icon={MdCheckCircle}
            tone="success"
            title={t("dashSystemStatus") || "System Status"}
            badge={t("dashLive") || "Live"}
            description={t("dashRunning") || "Running"}
          >
            {t("dashSystemStatusDesc") || "All services operational"}
          </RecordCard>

          {/* Status Item 2: Power Backup */}
          <RecordCard
            icon={MdFlashOn}
            tone="info"
            title={t("dashPowerBackup") || "Power Backup"}
            badge={t("dashStandby") || "Standby"}
            description={t("dashActive") || "Active"}
          >
            {t("dashPowerBackupDesc") || "Generator available"}
          </RecordCard>

          {/* Status Item 3: Society Info */}
          <RecordCard
            icon={MdApartment}
            tone="brand"
            title={t("dashSocietyId") || "Society Reference"}
            description={t("dashSocietyIdValue", { id: societyId || t("dashNA") })}
          >
            {t("dashSocietyIdDesc") || "System reference number"}
          </RecordCard>
        </div>
      </div>
    </div>
  );
}