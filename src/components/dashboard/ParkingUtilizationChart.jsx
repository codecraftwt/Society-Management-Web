import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { FaParking } from "react-icons/fa";
import { MdCheckCircle, MdDirectionsCar } from "react-icons/md";
import { useLang } from "../../context/LanguageContext";

const ALLOCATED_COLOR = "#8B5CF6"; // Purple / Violet
const AVAILABLE_COLOR = "#06B6D4"; // Cyan

export default function ParkingUtilizationChart({ data, loading = false }) {
  const { t } = useLang();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const parking = data || {};
  const total = parking.total || 0;
  const allocated = parking.allocated || 0;
  const available = parking.available ?? (total - allocated);
  const allocationRate = parking.allocationRate ?? (total > 0 ? Math.round((allocated / total) * 100) : 0);

  const chartData = useMemo(() => [
    {
      key: "allocated",
      name: t("dashAllocated") || "Allocated",
      value: allocated,
      color: ALLOCATED_COLOR,
      rate: allocationRate,
    },
    {
      key: "available",
      name: t("dashAvailable") || "Available",
      value: available,
      color: AVAILABLE_COLOR,
      rate: total > 0 ? Math.round((available / total) * 100) : 0,
    },
  ], [allocated, available, allocationRate, total, t]);

  const activeItem = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <div className="bg-card border border-glass-border hover:border-accent/40 rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0 shadow-sm transition-all duration-200">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <FaParking size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary">
              {t("dashParkingUtilTitle") || "Parking Utilization"}
            </h2>
            <p className="text-xs text-secondary">
              {t("dashParkingUtilSub") || "Real-time parking bay allocation status"}
            </p>
          </div>
        </div>

        {/* Allocation Rate KPI Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center gap-2">
            <MdCheckCircle size={15} className="text-purple-500 shrink-0" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-secondary">
                {t("dashAllocated") || "Allocated"}:
              </span>
              <span className="text-sm font-extrabold text-purple-500">
                {allocationRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CHART BODY ── */}
      {total === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-4">
          <FaParking size={36} className="text-secondary/40 mb-2" />
          <p className="text-sm font-medium text-secondary">
            {t("dashNoParkingSlots") || "No parking slots configured yet"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-between">
          {/* Donut Container with Interactive Centered Readout */}
          <div className="relative w-full h-56 min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={total > 0 && allocated > 0 && available > 0 ? 4 : 0}
                  stroke="var(--card-bg)"
                  strokeWidth={2}
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.key}
                      fill={entry.color}
                      style={{
                        cursor: "pointer",
                        filter: hoveredIndex === index ? "brightness(1.12)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Readout Overlay (Eliminates overlap completely by housing the active slice info) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2 select-none">
              <span
                className="text-2xl font-black tracking-tight leading-none transition-all duration-200"
                style={{
                  color: activeItem ? activeItem.color : "var(--text-primary)",
                  transform: activeItem ? "scale(1.08)" : "scale(1)",
                }}
              >
                {activeItem ? activeItem.value : total}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider mt-1 transition-colors duration-200 max-w-[120px] truncate"
                style={{
                  color: activeItem ? activeItem.color : "var(--text-secondary)",
                }}
              >
                {activeItem
                  ? `${activeItem.name} (${activeItem.rate}%)`
                  : (t("dashTotalSlots") || "Total Slots")}
              </span>
            </div>
          </div>

          {/* ── LEGEND CHIPS (Interactive with hover synchronization) ── */}
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            {chartData.map((d, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <div
                  key={d.key}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`border rounded-xl p-3 flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? "bg-card-inner-bg shadow-sm"
                      : "bg-card-inner-bg/60 border-glass-border"
                  }`}
                  style={{
                    borderColor: isHovered ? d.color : "var(--glass-border)",
                    transform: isHovered ? "translateY(-1px)" : "none",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200"
                      style={{
                        background: d.color,
                        transform: isHovered ? "scale(1.25)" : "scale(1)",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-secondary truncate">{d.name}</p>
                      <p className="text-sm font-extrabold text-primary">{d.value}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-md border transition-all duration-200"
                    style={{
                      color: d.color,
                      background: isHovered ? `${d.color}28` : `${d.color}15`,
                      borderColor: isHovered ? `${d.color}60` : `${d.color}30`,
                    }}
                  >
                    {d.rate}%
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

