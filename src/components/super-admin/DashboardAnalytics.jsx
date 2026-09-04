/**
 * DashboardAnalytics.jsx
 *
 * Platform analytics for SuperAdminDashboard (Executive Command Center).
 * ALL data is fetched LIVE from the API — no seeded / demo data.
 *
 * DATA SOURCES:
 *  - societies  (prop) : id, name, property_type, societyAdmins  → from /societies
 *  - residents  (API)  : GET /users/resident  → live resident list per society,
 *                        grouped locally by society_id & resident_type
 *                        (SUPER_ADMIN without a global filter receives ALL societies)
 *
 * Strategy for a 100% real view:
 *  1. Fetch every resident on the platform (paginated).
 *  2. Group by society_id → total / owners / tenants per society.
 *  3. Report aggregated totals back to the parent KPI cards via onDataLoaded.
 *  4. Render professional charts (vertical bars, donut pie, area trend, leaderboard).
 */
import { useMemo, useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LabelList,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import API from "../../services/api";

// ── Colour palettes ──────────────────────────────────────────────────────────
const DARK_PALETTE = {
  text: "#CBD5E1",
  textMuted: "#94A3B8",
  grid: "rgba(255,255,255,0.06)",
  tooltip: "#1E293B",
  tooltipBorder: "rgba(255,255,255,0.08)",
  blue: "#60A5FA",
  green: "#22C55E",
  amber: "#3B82F6",
  violet: "#8B5CF6",
  sky: "#38BDF8",
  rose: "#F472B6",
};
const LIGHT_PALETTE = {
  text: "#374151",
  textMuted: "#9CA3AF",
  grid: "rgba(0,0,0,0.06)",
  tooltip: "#FFFFFF",
  tooltipBorder: "#E5E7EB",
  blue: "#2563EB",
  green: "#16A34A",
  amber: "#2563EB",
  violet: "#7C3AED",
  sky: "#0284C7",
  rose: "#DB2777",
};

const DONUT_COLORS_DARK = ["#60A5FA", "#8B5CF6", "#3B82F6", "#22C55E", "#F472B6", "#38BDF8"];
const DONUT_COLORS_LIGHT = ["#2563EB", "#7C3AED", "#2563EB", "#16A34A", "#DB2777", "#0284C7"];

// ── Tooltip style ────────────────────────────────────────────────────────────
function buildTooltipStyle(p) {
  return {
    backgroundColor: p.tooltip,
    border: `1px solid ${p.tooltipBorder}`,
    borderRadius: 10,
    color: p.text,
    fontSize: 12,
    padding: "8px 12px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
  };
}

// ── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, subtitle, badge, className, children }) {
  return (
    <div className={`sa-chart-card ${className || ""}`}>
      <div className="sa-chart-card-header">
        <div>
          <h3 className="sa-chart-title">{title}</h3>
          {subtitle && <p className="sa-chart-subtitle">{subtitle}</p>}
        </div>
        {badge && <span className="sa-chart-badge">{badge}</span>}
      </div>
      <div className="sa-chart-body">{children}</div>
    </div>
  );
}

// ── No-data placeholder ──────────────────────────────────────────────────────
function NoData({ message = "No data available" }) {
  return (
    <div className="sa-chart-nodata">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r=".5" fill="currentColor" />
      </svg>
      <p>{message}</p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DashboardAnalytics({ societies, loading, onDataLoaded }) {
  const { theme } = useTheme();
  const p = theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
  const donutColors = theme === "dark" ? DONUT_COLORS_DARK : DONUT_COLORS_LIGHT;
  const ttStyle = buildTooltipStyle(p);

  // Live residents fetched from the API
  const [residents, setResidents] = useState([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(false);

  // ── Fetch every resident on the platform ──
  const fetchResidents = useCallback(async () => {
    try {
      setLiveLoading(true);
      setLiveError(false);
      const collected = [];
      let page = 1;
      const LIMIT = 50;
      let total = null;
      let guard = 0;
      while (true) {
        const res = await API.get("/users/resident", { params: { page, limit: LIMIT } });
        const body = res.data || {};
        const rows = body.data || [];
        total = body.totalAll ?? total;
        collected.push(...rows);
        if (!rows.length || collected.length >= (total || 0)) break;
        page += 1;
        guard += 1;
        if (guard > 60) break; // safety against runaway pagination
      }
      setResidents(collected);
    } catch {
      setLiveError(true);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  // ── Derive all analytics (REAL data) ──
  const analytics = useMemo(() => {
    const societyMap = {};
    (societies || []).forEach((s) => {
      societyMap[String(s.id)] = {
        id: s.id,
        name: s.name,
        propertyType: s.property_type || "Apartments",
        hasAdmin: !!s.societyAdmins,
        residents: 0,
        owners: 0,
        tenants: 0,
        other: 0,
      };
    });

    let totalResidents = 0;
    let totalOwners = 0;
    let totalTenants = 0;
    let totalOther = 0;

    residents.forEach((r) => {
      const sid = String(r.society_id);
      const entry = societyMap[sid];
      if (!entry) return; // skip residents not tied to an enrolled society
      entry.residents += 1;
      totalResidents += 1;
      const rt = (r.resident_type || "").toUpperCase();
      if (rt === "OWNER") { entry.owners += 1; totalOwners += 1; }
      else if (rt === "TENANT") { entry.tenants += 1; totalTenants += 1; }
      else { entry.other += 1; totalOther += 1; }
    });

    const residentData = Object.values(societyMap)
      .sort((a, b) => b.residents - a.residents || a.name.localeCompare(b.name));

    const compositionData = [
      { name: "Owners", value: totalOwners, color: p.blue },
      { name: "Tenants", value: totalTenants, color: p.violet },
      ...(totalOther > 0 ? [{ name: "Unclassified", value: totalOther, color: p.amber }] : []),
    ];

    const totalAssigned = (societies || []).filter((s) => !!s.societyAdmins).length;
    const totalUnassigned = (societies || []).length - totalAssigned;

    // Property type distribution
    const propertyCounts = {};
    (societies || []).forEach((s) => {
      const k = s.property_type || "Apartments";
      propertyCounts[k] = (propertyCounts[k] || 0) + 1;
    });
    const propertyTypeData = Object.entries(propertyCounts).map(([name, value]) => ({ name, value }));

    // Residents grouped by property type (distinct from society count donut)
    const typeTotals = {};
    (societies || []).forEach((s) => {
      const k = s.property_type || "Apartments";
      typeTotals[k] = (typeTotals[k] || 0) + (societyMap[String(s.id)]?.residents || 0);
    });
    const residentByTypeData = Object.entries(typeTotals)
      .map(([name, Residents]) => ({ name, Residents }))
      .sort((a, b) => b.Residents - a.Residents);

    return {
      residentData,
      compositionData,
      propertyTypeData,
      residentByTypeData,
      topFive: residentData.slice(0, 5),
      totalResidents,
      totalOwners,
      totalTenants,
      totalAssigned,
      totalUnassigned,
    };
  }, [societies, residents, p.blue, p.violet, p.amber]);

  // Report live totals to parent KPI cards
  useEffect(() => {
    if (!liveLoading && !liveError && onDataLoaded) {
      onDataLoaded({
        totalResidents: analytics.totalResidents,
        totalOwners: analytics.totalOwners,
        totalTenants: analytics.totalTenants,
        totalAssigned: analytics.totalAssigned,
        totalUnassigned: analytics.totalUnassigned,
      });
    }
  }, [liveLoading, liveError, analytics, onDataLoaded]);

  const isLoading = loading || liveLoading;
  const shortName = (name) => (name && name.length > 13 ? name.slice(0, 12) + "…" : name || "—");

  if (isLoading) {
    return (
      <div className="sa-analytics-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="sa-chart-card sa-chart-skeleton" />
        ))}
      </div>
    );
  }

  if (!societies || societies.length === 0) {
    return (
      <div className="sa-analytics-grid">
        {[1, 2, 3].map((i) => (
          <ChartCard key={i} title="–" subtitle="">
            <NoData message="No societies registered yet. Add one to see live analytics." />
          </ChartCard>
        ))}
      </div>
    );
  }

  const { residentData, compositionData, propertyTypeData, residentByTypeData, topFive } = analytics;

  return (
    <div className="sa-analytics-grid">

      {/* ── 1. Residents by Society (vertical bar) ── */}
      <ChartCard
        title="Residents by Society"
        subtitle="Live registered residents across societies"
        badge="Live"
        className="sa-chart-wide"
      >
        {residentData.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={residentData} margin={{ left: 0, right: 0, top: 16, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={p.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: p.textMuted, fontSize: 10 }} tickFormatter={shortName}
                axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={52} />
              <YAxis tick={{ fill: p.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={ttStyle} cursor={{ fill: "rgba(96,165,250,0.08)" }} />
              <Bar dataKey="residents" name="Residents" fill={p.blue} radius={[6, 6, 0, 0]} maxBarSize={46}>
                <LabelList dataKey="residents" position="top" style={{ fill: p.text, fontSize: 10, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <NoData message="No residents assigned to any society yet." />}
      </ChartCard>

      {/* ── 2. Owner vs Tenant donut (pie) ── */}
      <ChartCard
        title="Resident Composition"
        subtitle="Owner vs tenant mix across the platform"
        badge="Live"
      >
        {compositionData.reduce((s, d) => s + d.value, 0) > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={compositionData}
                cx="50%" cy="50%"
                innerRadius={68} outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                startAngle={90} endAngle={-270}
              >
                {compositionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={ttStyle} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: p.text, fontSize: 12 }} />
              <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle">
                <tspan x="50%" dy="-0.3em" fontSize={24} fontWeight={800} fill={p.text}>
                  {analytics.totalResidents.toLocaleString()}
                </tspan>
                <tspan x="50%" dy="1.6em" fontSize={10} fill={p.textMuted}>Total Residents</tspan>
              </text>
            </PieChart>
          </ResponsiveContainer>
        ) : <NoData message="No resident data yet." />}
      </ChartCard>

      {/* ── 3. Community composition per society (vertical stacked) ── */}
      <ChartCard
        title="Community Mix by Society"
        subtitle="Owners vs tenants stacked per society"
        badge="Live"
      >
        {residentData.some((d) => d.residents > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={residentData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }} barCategoryGap="26%">
              <CartesianGrid vertical={false} stroke={p.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: p.textMuted, fontSize: 10 }} tickFormatter={shortName}
                axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={52} />
              <YAxis tick={{ fill: p.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={ttStyle} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
              <Legend wrapperStyle={{ color: p.text, fontSize: 12 }} />
              <Bar dataKey="owners" name="Owners" stackId="a" fill={p.blue} maxBarSize={44} />
              <Bar dataKey="tenants" name="Tenants" stackId="a" fill={p.violet} radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        ) : <NoData message="No resident data yet." />}
      </ChartCard>

      {/* ── 4. Property type mix donut ── */}
      <ChartCard
        title="Societies by Property Type"
        subtitle="Distribution of societies across property types"
        badge="Live"
      >
        {propertyTypeData.reduce((s, d) => s + d.value, 0) > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={propertyTypeData}
                cx="50%" cy="50%"
                innerRadius={62} outerRadius={92}
                paddingAngle={4}
                dataKey="value"
                startAngle={90} endAngle={-270}
              >
                {propertyTypeData.map((entry, index) => (
                  <Cell key={`pt-${index}`} fill={donutColors[index % donutColors.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={ttStyle} formatter={(v) => `${v} societ${v === 1 ? "y" : "ies"}`} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: p.text, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : <NoData message="No societies available." />}
      </ChartCard>

      {/* ── 5. Residents by property type (horizontal bar) ── */}
      <ChartCard
        title="Residents by Property Type"
        subtitle="Where residents are spread across property categories"
        badge="Live"
      >
        {residentByTypeData.some((d) => d.Residents > 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={residentByTypeData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid stroke={p.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: p.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: p.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={86} />
              <Tooltip contentStyle={ttStyle} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
              <Bar dataKey="Residents" name="Residents" fill={p.violet} radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        ) : <NoData message="No resident data yet." />}
      </ChartCard>

      {/* ── 6. Top societies leaderboard ── */}
      <ChartCard
        title="Top Societies by Residents"
        subtitle="Highest enrolled societies on the platform"
        badge="Live"
      >
        <div className="sa-top-list" style={{ paddingTop: 4 }}>
          {topFive.map((s, i) => (
            <div key={s.id} className="sa-top-row">
              <span className={`sa-top-rank sa-top-rank-${i + 1}`}>#{i + 1}</span>
              <div className="sa-top-info">
                <span className="sa-top-name" title={s.name}>{s.name}</span>
                <div className="sa-top-bar-track">
                  <div
                    className="sa-top-bar-fill"
                    style={{
                      width: `${topFive[0].residents ? Math.round((s.residents / topFive[0].residents) * 100) : 0}%`,
                      background: [p.blue, p.violet, p.green, p.amber, p.sky][i],
                    }}
                  />
                </div>
              </div>
              <span className="sa-top-count">{s.residents}</span>
            </div>
          ))}
          {topFive.length === 0 && <NoData message="No societies enrolled yet." />}
        </div>
      </ChartCard>

    </div>
  );
}
