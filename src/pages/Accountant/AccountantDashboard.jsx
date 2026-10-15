import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import {
  MdArrowForward,
  MdArrowUpward,
  MdArrowDownward,
  MdAccountBalance,
  MdBuild,
  MdCheckCircle,
  MdDashboard,
  MdSchedule,
  MdTrendingUp,
  MdOutlinePayments,
  MdReceiptLong,
} from "react-icons/md";
import { useLang } from "../../context/LanguageContext";
import StatCard from "../../components/common/StatCard";
import QuickLink from "../../components/common/QuickLink";
import CreditedDebitedChart from "../../components/accounting/CreditedDebitedChart";
import { getLedger } from "../../services/accountingService";

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

export default function AccountDashboard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, ledgerRes] = await Promise.allSettled([
          API.get("/accountant/dashboard-stats"),
          getLedger({ page: 1, limit: 5, order: "DESC" }),
        ]);

        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data || null);
        }

        if (ledgerRes.status === "fulfilled" && ledgerRes.value) {
          const list = Array.isArray(ledgerRes.value.data)
            ? ledgerRes.value.data
            : Array.isArray(ledgerRes.value)
            ? ledgerRes.value
            : [];
          setLedger(list.slice(0, 5));
        }
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

  const quickLinks = [
    {
      id: "payments",
      title: t("acctMenuPaymentsShort") || "Payments",
      desc: t("acctQuickPaymentsDesc") || "Collections & receipts",
      icon: MdOutlinePayments,
      path: "/accountant/payments",
      color: "#2563EB",
      bg: "rgba(37, 99, 235, 0.15)",
      badge: t("acctQuickPaymentsBadge") || "Cash In",
      badgeColor: "bg-blue-600 text-white",
    },
    {
      id: "accounting",
      title: t("acctQuickAccounts") || "Account & Cash",
      desc: t("acctQuickAccountsDesc") || "Ledger & cash book",
      icon: MdAccountBalance,
      path: "/accountant/accounting",
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.15)",
      badge: t("acctQuickAccountsBadge") || "Ledger",
      badgeColor: "bg-emerald-600 text-white",
    },
    {
      id: "bills",
      title: t("adminMenuManageBills") || "Billing & Invoices",
      desc: t("acctQuickBillsDesc") || "Invoices & dues",
      icon: MdReceiptLong,
      path: "/accountant/manage-bills",
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.15)",
      badge: stats?.pendingBills > 0
        ? (t("acctQuickBillsDue", { count: stats.pendingBills }) || `${stats.pendingBills} Due`)
        : (t("acctQuickBillsBadge") || "Invoices"),
      badgeColor: stats?.pendingBills > 0 ? "bg-amber-600 text-white" : "bg-amber-600/80 text-white",
    },
    {
      id: "maintenance",
      title: t("adminMenuMaintenance") || "Maintenance",
      desc: t("acctQuickMaintenanceDesc") || "Dues calculation",
      icon: MdBuild,
      path: "/accountant/maintenance",
      color: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.15)",
      badge: t("acctQuickMaintenanceBadge") || "Rates",
      badgeColor: "bg-purple-600 text-white",
    },
  ];

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
          className="btn-primary inline-flex items-center gap-2"
        >
          <MdOutlinePayments size={18} />
          {t("acctMenuPaymentsShort") || "Payments"}
          <MdArrowForward size={18} />
        </button>
      </div>

      {/* === STAT CARDS === */}
      {hasStats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4">
          <StatCard
            layout="inline"
            icon={MdTrendingUp}
            value={formatCurrency(stats.monthlyCollected)}
            label={t("acctDashThisMonth")}
            tone="success"
            description={`${stats.monthlyTransactions} ${(t("acctDashTransactions") || "transactions this month").toLowerCase()}`}
          />
          <StatCard
            layout="inline"
            icon={MdCheckCircle}
            value={stats.paidBills}
            label={t("acctDashPaidBills")}
            tone="info"
            description={`${stats.paidRate}% ${t("acctDashPaidRate") || "of bills cleared"}`}
          />
          <StatCard
            layout="inline"
            icon={MdSchedule}
            value={stats.pendingBills}
            label={t("acctDashPendingBills")}
            tone="warning"
            description={`${t("acctDashTotalDue") || "Due amount"} ${formatCurrency(stats.totalDue)}`}
          />
          <StatCard
            layout="inline"
            icon={MdReceiptLong}
            value={formatCurrency(stats.totalCollectedAll)}
            label={t("acctDashTotalCollected")}
            tone="danger"
            description={`${t("acctDashAwaiting") || "Awaiting confirmation"}: ${stats.awaitingConfirm}`}
          />
        </div>
      )}

      {/* === QUICK OPERATIONS === */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MdDashboard size={18} className="text-accent" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-primary">
                {t("dashQuickLinks") || "Quick Operations"}
              </h2>
              <p className="text-xs text-secondary">
                {t("dashQuickLinksSub") || "1-Click operations"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {quickLinks.map((action, idx) => (
            <QuickLink
              key={action.id}
              title={action.title}
              desc={action.desc}
              icon={action.icon}
              badge={action.badge}
              badgeColor={action.badgeColor}
              color={action.color}
              bg={action.bg}
              path={action.path}
              style={{ animationDelay: `${idx * 60}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* === CASH BOOK LEDGER (GENERAL LEDGER) === */}
        <div className="premium-card xl:col-span-2">
          <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
            <div className="flex items-center gap-2">
              <MdReceiptLong size={18} style={{ color: "var(--accent)" }} />
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {t("accLedgerTitle")}
                </h3>
                <p className="text-xs text-secondary mt-0.5">{t("accLedgerSubtitle")}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/accountant/accounting")}
              className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1 shrink-0"
            >
              {t("rrViewReport")} <MdArrowForward size={14} />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {ledger.length === 0 ? (
              <div className="text-center py-10">
                <MdReceiptLong size={36} className="mx-auto text-secondary opacity-40" />
                <p className="mt-3 text-sm text-secondary">{t("accNoLedgerEntries")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ledger.map((r) => {
                  const isCredit = r.type === "CREDIT";
                  const openingRow = r.source === "OPENING" || r.opening;
                  return (
                    <div
                      key={r.id ?? `${r.entry_date}-${r.description}`}
                      className="info-row justify-between rounded-xl border p-3"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold shrink-0 ${
                            isCredit
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                          }`}
                        >
                          {isCredit ? <MdArrowUpward size={12} /> : <MdArrowDownward size={12} />}
                          {isCredit ? t("accCreditShort") : t("accDebitShort")}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }} title={r.description}>
                            {r.description || r.source || "—"}
                          </p>
                          <p className="text-xs text-secondary mt-0.5">
                            {formatDate(r.entry_date)} • {r.source}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-semibold text-sm shrink-0 ${isCredit ? "text-emerald-500" : "text-rose-500"}`}
                      >
                        {openingRow ? formatCurrency(r.amount) : `${isCredit ? "+" : "−"}${formatCurrency(r.amount)}`}
                      </span>
                    </div>
                  );
                })}
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
              <span className="w-3 h-3 rounded-full" style={{ background: "var(--success)" }}></span>
              <span className="font-medium" style={{ color: "var(--success)" }}>{t("active")}</span>
            </div>
            <p className="text-xs text-secondary">{t("acctStatusDesc")}</p>
          </div>
        </div>
      </div>

      {/* === CREDITED vs DEBITED CHART === */}
      <CreditedDebitedChart linkTo="/accountant/accounting" />
    </div>
  );
}