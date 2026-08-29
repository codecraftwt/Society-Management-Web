import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import {
  MdArrowForward,
  MdAccountBalance,
  MdCheckCircle,
  MdSchedule,
  MdTrendingUp,
  MdOutlinePayments,
  MdReceiptLong,
} from "react-icons/md";
import { useLang } from "../../context/LanguageContext";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["data", "payments", "bills", "records", "items", "results"]) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
};

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

function StatCard({ icon: Icon, value, label, tone, caption }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div>
        <div className="stat-card__val">{value}</div>
        <div className="stat-card__label">{label}</div>
        {caption ? <div className="mt-1 text-[11px] leading-5 opacity-70">{caption}</div> : null}
      </div>
      <div className="stat-card__icon">
        <Icon size={20} />
      </div>
    </div>
  );
}

export default function AccountDashboard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, paymentsRes] = await Promise.all([
          API.get("/accountant/dashboard-stats"),
          API.get("/accountant/payments"),
        ]);
        setStats(statsRes.data || null);
        const payments = toArray(paymentsRes.data);
        setRecent(
          payments
            .map((p) => ({
              id: p.id,
              bill_title: p.Bill?.title || p.bill?.title || "Bill payment",
              amount: Number(p.amount || p.Bill?.amount || 0),
              payment_date: p.payment_date || p.created_at || null,
              flat_number: p.Bill?.Flat?.flat_number || p.bill?.flat?.flat_number || "—",
              resident_name: p.Bill?.Flat?.User?.name || p.bill?.flat?.user?.name || "—",
            }))
            .slice(0, 6)
        );
      } catch (err) {
        console.error("Failed to load accountant dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20 text-secondary">
        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
          <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
        </svg>
        {t("loadingProfile")}
      </div>
    );
  }

  const hasStats = !!stats;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* === HEADER === */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("welcome")}, {user.name}
          </h2>
          <p className="text-sm text-secondary">{t("acctDashSubtitle")}</p>
        </div>
        <button
          onClick={() => navigate("/accountant/payments")}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--glass-border)",
            color: "var(--text-primary)",
          }}
        >
          <MdOutlinePayments size={18} />
          {t("acctMenuPaymentsShort") || "Payments"}
          <MdArrowForward size={18} />
        </button>
      </div>

      {/* === STAT CARDS === */}
      {hasStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={MdTrendingUp}
            value={formatCurrency(stats.monthlyCollected)}
            label={t("acctDashThisMonth")}
            tone="green"
            caption={`${stats.monthlyTransactions} ${(t("acctDashTransactions") || "transactions this month").toLowerCase()}`}
          />
          <StatCard
            icon={MdCheckCircle}
            value={stats.paidBills}
            label={t("acctDashPaidBills")}
            tone="blue"
            caption={`${stats.paidRate}% ${t("acctDashPaidRate") || "of bills cleared"}`}
          />
          <StatCard
            icon={MdSchedule}
            value={stats.pendingBills}
            label={t("acctDashPendingBills")}
            tone="amber"
            caption={`${t("acctDashTotalDue") || "Due amount"} ${formatCurrency(stats.totalDue)}`}
          />
          <StatCard
            icon={MdReceiptLong}
            value={formatCurrency(stats.totalCollectedAll)}
            label={t("acctDashTotalCollected")}
            tone="red"
            caption={`${t("acctDashAwaiting") || "Awaiting confirmation"}: ${stats.awaitingConfirm}`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* === RECENT PAYMENTS === */}
        <div className="premium-card xl:col-span-2">
          <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
            <div className="flex items-center gap-2">
              <MdOutlinePayments size={18} style={{ color: "var(--accent)" }} />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {t("acctDashRecentPayments")}
              </h3>
            </div>
            <button
              onClick={() => navigate("/accountant/payments")}
              className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
            >
              {t("rrViewReport")} <MdArrowForward size={14} />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {recent.length === 0 ? (
              <div className="text-center py-10">
                <MdOutlinePayments size={36} className="mx-auto text-secondary opacity-40" />
                <p className="mt-3 text-sm text-secondary">{t("acctDashNoPayments")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((p) => (
                  <div
                    key={p.id}
                    className="info-row justify-between rounded-xl border p-3"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {p.bill_title}
                      </p>
                      <p className="text-xs text-secondary mt-0.5">
                        {p.resident_name} • {t("flatShort") || "Flat"} {p.flat_number} • {formatDate(p.payment_date)}
                      </p>
                    </div>
                    <span className="font-semibold text-sm shrink-0" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === SOCIETY OVERVIEW === */}
        <div className="space-y-4">
          <div className="bg-card p-6 rounded-xl shadow space-y-3">
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
              {t("acctSocietyInfo")}
            </h3>
            <div className="text-sm space-y-1" style={{ color: "var(--text-primary)" }}>
              <p><span className="text-secondary">{t("dashSocietyId")}:</span> {user.society_id}</p>
              <p><span className="text-secondary">{t("profileTileSociety")}:</span> {user.society_name}</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl shadow space-y-3">
            <div className="flex items-center gap-2">
              <MdAccountBalance size={18} style={{ color: "var(--accent)" }} />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {t("acctStatusTitle")}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="font-medium text-green-500">{t("active")}</span>
            </div>
            <p className="text-xs text-secondary">{t("acctStatusDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}