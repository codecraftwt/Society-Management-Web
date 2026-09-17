import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MdOutlineReceiptLong, MdRefresh, MdArrowForward } from "react-icons/md";
import API from "../../services/api";
import { getChartData } from "../../services/accountingService";

const CURRENCY = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v) || 0);

export default function CreditedDebitedChart({ linkTo, fullWidth }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError("");
        const res = await getChartData({ year });
        if (!cancelled) setData(res);
      } catch (e) {
        console.error("Failed to load financial chart", e);
        if (!cancelled) setError("Could not load financial chart.");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const months = data?.months || [];
  const chartData = months.map((m) => ({ name: m.label, credited: m.credited, debited: m.debited }));

  return (
    <div
      className={`bg-card p-5 sm:p-6 rounded-xl shadow border ${fullWidth ? "" : "h-full"} min-w-0`}
      style={{ borderColor: "var(--glass-border)" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <MdOutlineReceiptLong size={18} style={{ color: "var(--accent)" }} />
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Credited vs Debited
            </h3>
            <p className="text-xs text-secondary">Monthly income vs expenses — {year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Chart year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg text-xs font-semibold border"
            style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {linkTo && (
            <button
              onClick={() => navigate(linkTo)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              Details <MdArrowForward size={13} />
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 py-10 px-4 rounded-xl" style={{ background: "var(--card-inner-bg)" }}>
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
          <button
            onClick={() => API.get(`/account/chart?year=${year}`).then((r) => setData(r.data?.data || r.data)).catch(() => {})}
            className="inline-flex items-center gap-1.5 text-xs font-semibold btn-primary px-3 py-1.5 rounded-lg"
          >
            <MdRefresh size={13} /> Retry
          </button>
        </div>
      ) : !data ? (
        <div className="h-64 flex items-center justify-center text-secondary text-sm animate-pulse">
          Loading financial data…
        </div>
      ) : (
        <div className="w-full h-64 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={{ stroke: "var(--glass-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                axisLine={{ stroke: "var(--glass-border)" }}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip
                formatter={(v, name) => [CURRENCY(v), name === "credited" ? "Credited" : "Debited"]}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={{
                  background: "var(--card-bg)",
                  borderColor: "var(--glass-border)",
                  borderRadius: "12px",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="credited" name="Credited" fill="#10b981" radius={[5, 5, 0, 0]} />
              <Bar dataKey="debited" name="Debited" fill="#f43f5e" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}