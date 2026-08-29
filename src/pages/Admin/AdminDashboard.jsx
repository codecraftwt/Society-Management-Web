import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  MdPeople, MdSecurity, MdReportProblem, MdHomeWork,
  MdCheckCircle, MdArrowForward, MdFlashOn, MdApartment,
  MdRefresh,
} from "react-icons/md";

/* ── SKELETON LOADER ── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 w-full min-w-0 animate-pulse">
      {/* Hero Skeleton */}
      <div className="bg-card/40 border border-glass-border rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/10 rounded-lg" />
          <div className="h-4 w-64 bg-white/5 rounded-md" />
        </div>
        <div className="h-8 w-36 bg-white/10 rounded-full" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
  const [dateTime, setDateTime] = useState(new Date());

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
      setError("Society ID not found. Please log in again.");
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
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => setDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const residents = stats?.residents ?? 0;
  const guards = stats?.guards ?? 0;
  const openComplaints = stats?.openComplaints ?? 0;
  const totalFlats = stats?.totalFlats ?? 0;

  const chartData = [
    { name: t("dashResidents") || "Residents", value: residents, color: "#5B8DEF" },
    { name: t("dashGuards") || "Guards", value: guards, color: "#10B981" },
    { name: t("dashOpenComplaints") || "Complaints", value: openComplaints, color: "#F59E0B" },
    { name: t("dashTotalFlats") || "Total Flats", value: totalFlats, color: "#8B5CF6" },
  ];

  /* Greeting phrase based on hour */
  const hour = dateTime.getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon"
      : "Good evening";

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto my-8">
        <div className="flex items-center gap-3">
          <MdReportProblem size={24} className="shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0"
        >
          <MdRefresh size={16} />
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-[1600px] mx-auto pb-8">
      {/* ── 1. DASHBOARD HERO HEADER ── */}
      <div className="bg-card border border-glass-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-primary tracking-tight">
            {greeting}, Admin
          </h1>
          <p className="text-xs md:text-sm text-secondary truncate">
            Here's a quick operational overview of your society today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Formatted Date & Time */}
          <div className="text-xs font-medium text-secondary bg-card-inner-bg px-3.5 py-2 rounded-xl border border-glass-border">
            {dateTime.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {" · "}
            {dateTime.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {/* Operational Status Pill */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t("dashRunning") || "System Operational"}
          </div>
        </div>
      </div>

      {/* ── 2. KEY METRICS KPI CARDS (4 COLUMNS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Residents */}
        <div className="bg-card border border-glass-border rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/40 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("dashResidents") || "Residents"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <MdPeople size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
              {residents}
            </div>
            <p className="text-xs text-secondary mt-1">
              {t("dashResidentsDesc") || "Active members living in society"}
            </p>
          </div>
        </div>

        {/* KPI 2: Guards */}
        <div className="bg-card border border-glass-border rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("dashGuards") || "Guards"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <MdSecurity size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
              {guards}
            </div>
            <p className="text-xs text-secondary mt-1">
              {t("dashGuardsDesc") || "On-duty security personnel"}
            </p>
          </div>
        </div>

        {/* KPI 3: Open Complaints (Actionable Link) */}
        <div
          onClick={() => navigate("/admin/complaints")}
          className="bg-card border border-glass-border rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-sm group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("dashOpenComplaints") || "Open Complaints"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <MdReportProblem size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl md:text-3xl font-bold text-amber-500 tracking-tight">
                {openComplaints}
              </div>
              <span className="text-xs text-amber-500 font-medium inline-flex items-center gap-0.5 group-hover:underline">
                Resolve <MdArrowForward size={14} />
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              {t("dashComplaintsDesc") || "Requires admin attention"}
            </p>
          </div>
        </div>

        {/* KPI 4: Total Flats */}
        <div className="bg-card border border-glass-border rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("dashTotalFlats") || "Total Flats"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <MdHomeWork size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
              {totalFlats}
            </div>
            <p className="text-xs text-secondary mt-1">
              {t("dashTotalFlatsDesc") || "Across all blocks & floors"}
            </p>
          </div>
        </div>
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
                Visual breakdown of key society metrics
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
              Comparative view across core operational categories
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

      {/* ── 4. OPERATIONAL STATUS SECTION (3 COLUMNS) ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-secondary">
          Operational Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Status Item 1: System Status */}
          <div className="bg-card border border-glass-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <MdCheckCircle size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {t("dashSystemStatus") || "System Status"}
              </div>
              <div className="text-sm font-bold text-primary mt-0.5 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {t("dashRunning") || "Running"}
              </div>
              <p className="text-xs text-secondary truncate mt-0.5">
                {t("dashSystemStatusDesc") || "All services operational"}
              </p>
            </div>
          </div>

          {/* Status Item 2: Power Backup */}
          <div className="bg-card border border-glass-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
              <MdFlashOn size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {t("dashPowerBackup") || "Power Backup"}
              </div>
              <div className="text-sm font-bold text-primary mt-0.5 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {t("dashActive") || "Active"}
              </div>
              <p className="text-xs text-secondary truncate mt-0.5">
                {t("dashPowerBackupDesc") || "Generator available"}
              </p>
            </div>
          </div>

          {/* Status Item 3: Society Info */}
          <div className="bg-card border border-glass-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
              <MdApartment size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {t("dashSocietyId") || "Society Reference"}
              </div>
              <div className="text-sm font-bold text-primary mt-0.5">
                ID #{societyId || "N/A"}
              </div>
              <p className="text-xs text-secondary truncate mt-0.5">
                {t("dashSocietyIdDesc") || "System reference number"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}