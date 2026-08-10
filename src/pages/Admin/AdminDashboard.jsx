import { useEffect, useState } from "react";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

function Spinner() {
  return (
    <svg style={{ width: 28, height: 28 }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function StatCard({ title, value, description, color = "var(--text-primary)" }) {
  return (
    <div className="bg-card p-5 rounded-xl">
      <p className="text-secondary text-sm">{title}</p>
      <h2 className="text-2xl font-semibold mt-1" style={{ color }}>{value ?? "—"}</h2>
      <p className="text-xs text-secondary mt-1">{description}</p>
    </div>
  );
}

function SmallCard({ title, value, description }) {
  return (
    <div className="bg-card p-5 rounded-xl space-y-1">
      <p className="text-secondary text-sm">{title}</p>
      <span className="font-semibold text-lg">{value ?? "—"}</span>
      <p className="text-xs text-secondary">{description}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useLang();

  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [dateTime, setDateTime] = useState(new Date());

  const getSocietyId = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      return JSON.parse(atob(token.split(".")[1])).society_id;
    } catch { return null; }
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

  const residents      = stats?.residents      ?? 0;
  const guards         = stats?.guards         ?? 0;
  const openComplaints = stats?.openComplaints ?? 0;
  const totalFlats     = stats?.totalFlats     ?? 0;

  const barData = [
    { name: t("dashResidents"),                    value: residents      },
    { name: t("dashGuards"),                       value: guards         },
    { name: t("dashOpenComplaints"),               value: openComplaints },
    { name: t("dashTotalFlats") || "Total Flats",  value: totalFlats     },
  ];

  const pieData = [
    { name: t("dashResidents"),                    value: residents      },
    { name: t("dashGuards"),                       value: guards         },
    { name: t("dashOpenComplaints"),               value: openComplaints },
    { name: t("dashTotalFlats") || "Total Flats",  value: totalFlats     },
  ];

  const COLORS = ["#60a5fa", "#22c55e", "#facc15", "#a78bfa"];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)",
        borderRadius: 12, padding: "16px 20px",
        color: "var(--stat-red-color)", fontSize: 14,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {error}
        <button onClick={loadDashboardData} style={{
          fontSize: 12, fontWeight: 600, background: "none",
          border: "none", cursor: "pointer",
          color: "var(--stat-red-color)", textDecoration: "underline",
        }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

      {/* LEFT */}
      <div className="xl:col-span-3 space-y-6">

        {/* Greeting */}
        <div className="bg-card p-6 rounded-xl">
          <h1 className="text-2xl font-semibold">{t("dashHello")} 👋</h1>
          <p className="text-secondary mt-1">
            {dateTime.toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric",
              month: "long", year: "numeric",
            })}
            {" • "}
            {dateTime.toLocaleTimeString("en-IN", {
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>

        {/* 4 stat cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title={t("dashResidents")}
            value={residents}
            description={t("dashResidentsDesc")}
            color="#60a5fa"
          />
          <StatCard
            title={t("dashGuards")}
            value={guards}
            description={t("dashGuardsDesc")}
            color="#22c55e"
          />
          <StatCard
            title={t("dashOpenComplaints")}
            value={openComplaints}
            description={t("dashComplaintsDesc")}
            color="#facc15"
          />
          <StatCard
            title={t("dashTotalFlats") || "Total Flats"}
            value={totalFlats}
            description={t("dashTotalFlatsDesc") || "Across all blocks & floors"}
            color="#a78bfa"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="bg-card p-5 rounded-xl h-72">
            <h2 className="text-lg font-semibold mb-2">{t("dashDistribution")}</h2>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value"
                  cx="50%" cy="50%"
                  outerRadius={90} innerRadius={55}
                  paddingAngle={3}>
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card p-5 rounded-xl h-72">
            <h2 className="text-lg font-semibold mb-2">{t("dashComparison")}</h2>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap={25}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#60a5fa" barSize={22} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>

      {/* RIGHT */}
      <div className="space-y-6">
        <SmallCard
          title={t("dashSocietyId")}
          value={societyId}
          description={t("dashSocietyIdDesc")}
        />
        <SmallCard
          title={t("dashSystemStatus")}
          value={t("dashRunning")}
          description={t("dashSystemStatusDesc")}
        />
        <SmallCard
          title={t("dashPowerBackup")}
          value={t("dashActive")}
          description={t("dashPowerBackupDesc")}
        />
      </div>
    </div>
  );
}