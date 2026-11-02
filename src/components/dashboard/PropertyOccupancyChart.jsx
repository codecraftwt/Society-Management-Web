import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MdApartment, MdHome, MdHomeWork, MdCheckCircle } from "react-icons/md";
import { useLang } from "../../context/LanguageContext";

const OCCUPIED_COLOR = "#10B981"; // Emerald
const VACANT_COLOR = "#94A3B8";   // Slate

export default function PropertyOccupancyChart({ data, loading = false }) {
  const { t } = useLang();

  const occupancy = data || {};
  const apartments = occupancy.apartments || { total: 0, occupied: 0, vacant: 0, rate: 0 };
  const rowHouses = occupancy.rowHouses || { total: 0, occupied: 0, vacant: 0, rate: 0 };

  const totalProperties = occupancy.totalProperties || 0;
  const totalOccupied = occupancy.totalOccupied || 0;
  const totalVacant = occupancy.totalVacant || 0;
  const overallRate =
    occupancy.overallRate ??
    (totalProperties > 0 ? Math.round((totalOccupied / totalProperties) * 100) : 0);

  const chartData = useMemo(() => [
    {
      type: t("dashApartments") || "Apartments",
      icon: MdApartment,
      occupied: apartments.occupied || 0,
      vacant: apartments.vacant || 0,
      total: apartments.total || 0,
      rate: apartments.rate || 0,
    },
    {
      type: t("dashRowHouses") || "Row Houses",
      icon: MdHome,
      occupied: rowHouses.occupied || 0,
      vacant: rowHouses.vacant || 0,
      total: rowHouses.total || 0,
      rate: rowHouses.rate || 0,
    },
  ], [apartments, rowHouses, t]);

  const maxTotal = useMemo(() => {
    const m = Math.max(apartments.total || 0, rowHouses.total || 0);
    return Math.max(Math.ceil(m * 1.15), 5);
  }, [apartments.total, rowHouses.total]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div
          className="p-3.5 rounded-2xl shadow-2xl border text-xs space-y-2 backdrop-blur-md"
          style={{
            background: "var(--card-bg, #0F172A)",
            borderColor: "var(--glass-border, rgba(255,255,255,0.15))",
            color: "var(--text-primary, #FFFFFF)",
            minWidth: 160,
          }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="font-extrabold text-sm text-primary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent, #7C3AED)" }} />
              {item.type}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
              {item.rate}%
            </span>
          </div>

          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: OCCUPIED_COLOR }} />
                {t("dashOccupied") || "Occupied"}:
              </span>
              <span className="font-bold text-emerald-400">
                {item.occupied}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: VACANT_COLOR }} />
                {t("dashVacant") || "Vacant"}:
              </span>
              <span className="font-semibold text-slate-300">
                {item.vacant}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--glass-border)" }}>
              <span className="text-secondary font-medium">Total Units:</span>
              <span className="font-extrabold text-primary">{item.total}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-glass-border hover:border-accent/40 rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0 shadow-sm transition-all duration-200">
      {/* ── 1. HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
            <MdHomeWork size={19} />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary">
              {t("dashOccupancyTitle") || "Property Occupancy"}
            </h2>
            <p className="text-xs text-secondary">
              {t("dashOccupancySub") || "Occupancy breakdown across property types"}
            </p>
          </div>
        </div>

        {/* Overall Occupancy KPI Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 shadow-sm">
            <MdCheckCircle size={15} className="text-emerald-500 shrink-0" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-secondary">
                {t("dashOverallOccupancy") || "Overall Occupancy"}:
              </span>
              <span className="text-sm font-extrabold text-emerald-500">
                {overallRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SUMMARY COUNTER TILES ── */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-card-inner-bg/60 border border-glass-border rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs shadow-emerald-500/50" style={{ background: OCCUPIED_COLOR }} />
            <span className="text-xs font-semibold text-secondary">{t("dashOccupied") || "Occupied"}</span>
          </div>
          <span className="text-sm font-extrabold text-primary">{totalOccupied}</span>
        </div>
        <div className="bg-card-inner-bg/60 border border-glass-border rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: VACANT_COLOR }} />
            <span className="text-xs font-semibold text-secondary">{t("dashVacant") || "Vacant"}</span>
          </div>
          <span className="text-sm font-extrabold text-primary">{totalVacant}</span>
        </div>
      </div>

      {/* ── 3. VERTICAL STACKED BAR CHART ── */}
      {totalProperties === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-center p-4">
          <MdApartment size={36} className="text-secondary/40 mb-2" />
          <p className="text-sm font-medium text-secondary">
            {t("dashNoProperties") || "No properties configured yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-full h-52 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 18, right: 16, left: -20, bottom: 2 }}
                barSize={46}
              >
                <defs>
                  {/* Modern Emerald Gradient for Occupied */}
                  <linearGradient id="modernOccupiedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.92} />
                  </linearGradient>

                  {/* Modern Slate/Glass Gradient for Vacant */}
                  <linearGradient id="modernVacantGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#64748B" stopOpacity={0.65} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--glass-border)"
                  vertical={false}
                  opacity={0.6}
                />

                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 12, fill: "var(--text-primary)", fontWeight: 700 }}
                  axisLine={{ stroke: "var(--glass-border)" }}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, maxTotal]}
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                  axisLine={{ stroke: "var(--glass-border)" }}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />

                <Bar
                  dataKey="occupied"
                  name={t("dashOccupied") || "Occupied"}
                  stackId="occupancy"
                  fill="url(#modernOccupiedGrad)"
                  radius={[0, 0, 8, 8]}
                />

                <Bar
                  dataKey="vacant"
                  name={t("dashVacant") || "Vacant"}
                  stackId="occupancy"
                  fill="url(#modernVacantGrad)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── 4. GRANULAR PROPERTY CARDS WITH OCCUPANCY STATUS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
            {chartData.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.type}
                  className="bg-card-inner-bg/50 border border-glass-border hover:border-accent/30 rounded-xl p-2.5 sm:p-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-card-inner-bg border border-glass-border flex items-center justify-center text-primary shrink-0 shadow-xs">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary truncate">{item.type}</p>
                      <p className="text-[11px] text-secondary truncate font-medium mt-0.5">
                        {item.occupied} / {item.total} {t("dashOccupied") || "Occupied"}
                      </p>
                    </div>
                  </div>

                  <span
                    className="text-xs font-extrabold px-2.5 py-1 rounded-lg border shrink-0"
                    style={{
                      color: item.total > 0 && item.rate > 0 ? OCCUPIED_COLOR : "var(--text-secondary)",
                      background: item.total > 0 && item.rate > 0 ? `${OCCUPIED_COLOR}18` : "var(--card-inner-bg)",
                      borderColor: item.total > 0 && item.rate > 0 ? `${OCCUPIED_COLOR}35` : "var(--glass-border)",
                    }}
                  >
                    {item.rate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
