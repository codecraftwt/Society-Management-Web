import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import {
  MdAccountBalance,
  MdArrowForward,
  MdCheckCircle,
  MdDateRange,
  MdFilterAlt,
  MdHomeWork,
  MdOutlinePayments,
  MdRefresh,
  MdSchedule,
  MdSearch,
  MdTrendingUp,
  MdReceiptLong,
  MdPerson,
} from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalBadge from "../../components/common/GlobalBadge";
import SlidingTabs from "../../components/common/SlidingTabs";

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
  return `Rs. ${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const paymentModeLabel = (mode) =>
  String(mode || "Unknown")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function LoadingCard() {
  return (
    <div className="premium-card p-4 sm:p-5 animate-pulse">
      <div className="h-4 w-1/2 rounded bg-white/10 mb-3" />
      <div className="h-3 w-2/3 rounded bg-white/10 mb-2" />
      <div className="h-3 w-1/3 rounded bg-white/10" />
    </div>
  );
}

function StatCard({ icon: Icon, value, label, tone, caption }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div>
        <div className="stat-card__val">{value}</div>
        <div className="stat-card__label">{label}</div>
        {caption ? (
          <div className="mt-1 text-[11px] leading-5 opacity-70">{caption}</div>
        ) : null}
      </div>
      <div className="stat-card__icon">
        <Icon size={20} />
      </div>
    </div>
  );
}

export default function PaymentsAccountant() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const loadData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [paymentsRes, billsRes, summaryRes] = await Promise.all([
        API.get("/accountant/payments"),
        API.get("/accountant/bills"),
        API.get("/accountant/payments/summary"),
      ]);

      setPayments(toArray(paymentsRes.data));
      setBills(toArray(billsRes.data));
      setSummary(toArray(summaryRes.data));
    } catch (err) {
      console.error("Failed to load accountant payments data:", err);
      setPayments([]);
      setBills([]);
      setSummary([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const normalizedPayments = useMemo(() => {
    return payments
      .map((payment) => {
        const bill = payment.Bill || payment.bill || {};
        const flat = bill.Flat || bill.flat || {};
        const block = flat.Block || flat.block || {};
        const resident = flat.User || flat.user || {};

        return {
          id: payment.id,
          amount: Number(payment.amount || bill.amount || 0),
          payment_mode: payment.payment_mode || "UNKNOWN",
          payment_date: payment.payment_date || payment.created_at || null,
          bill_title: bill.title || "Bill payment",
          billing_month: bill.billing_month || null,
          bill_status: bill.status || "PENDING",
          flat_number: flat.flat_number || "N/A",
          block_name: block.name || "N/A",
          resident_name: resident.name || "N/A",
        };
      })
      .sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();

    return normalizedPayments.filter((payment) => {
      const matchFilter =
        filter === "ALL" ||
        (filter === "PAID" && payment.bill_status === "PAID") ||
        (filter === "PENDING" && payment.bill_status !== "PAID");

      const haystack = [
        payment.bill_title,
        payment.resident_name,
        payment.flat_number,
        payment.block_name,
        payment.payment_mode,
        payment.billing_month,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchFilter && (!q || haystack.includes(q));
    });
  }, [filter, normalizedPayments, search]);

  const totals = useMemo(() => {
    const totalCollected = normalizedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const paidBills = bills.filter((bill) => bill.status === "PAID");
    const pendingBills = bills.filter((bill) => bill.status !== "PAID");
    const dueAmount = pendingBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
    const avgPayment = normalizedPayments.length ? totalCollected / normalizedPayments.length : 0;

    return {
      totalCollected,
      paidBills: paidBills.length,
      pendingBills: pendingBills.length,
      dueAmount,
      avgPayment,
      totalPayments: normalizedPayments.length,
    };
  }, [bills, normalizedPayments]);

  const monthlySummary = useMemo(() => {
    return summary.map((row) => ({
      mode: row.payment_mode || row.mode || "UNKNOWN",
      total: Number(row.total || 0),
      transactions: Number(row.transactions || 0),
      average: Number(row.average || 0),
      last_payment: row.last_payment || null,
    }));
  }, [summary]);

  const monthlyCollected = monthlySummary.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const monthlyTransactions = monthlySummary.reduce((sum, item) => sum + Number(item.transactions || 0), 0);
  const recentPayments = filteredPayments.slice(0, 8);
  const paidRate = bills.length ? Math.round((totals.paidBills / bills.length) * 100) : 0;

  const filterCounts = {
    ALL: normalizedPayments.length,
    PAID: bills.filter((bill) => bill.status === "PAID").length,
    PENDING: bills.filter((bill) => bill.status !== "PAID").length,
  };

  const paymentModes = monthlySummary.length
    ? monthlySummary
    : normalizedPayments.reduce((acc, item) => {
        const found = acc.find((row) => row.mode === item.payment_mode);
        if (found) {
          found.total += Number(item.amount || 0);
          found.transactions += 1;
        } else {
          acc.push({ mode: item.payment_mode, total: Number(item.amount || 0), transactions: 1, average: Number(item.amount || 0), last_payment: item.payment_date });
        }
        return acc;
      }, []);

  return (
    <div className="acct-payments-page space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="ad-page-icon">
            <MdOutlinePayments size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>Payments</h2>
            <p className="text-secondary text-xs mt-0.5">Track collections, dues, and payment modes for the current society.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          <GlobalButton
            variant="primary"
            icon={MdRefresh}
            loading={refreshing}
            onClick={() => loadData({ silent: true })}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </GlobalButton>
          <GlobalButton
            variant="secondary"
            icon={MdArrowForward}
            iconPosition="right"
            onClick={() => navigate("/accountant/manage-bills")}
          >
            Manage bills
          </GlobalButton>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4">
        <StatCard
          icon={MdTrendingUp}
          value={formatCurrency(monthlyCollected)}
          label="This month collected"
          tone="green"
          caption={`${monthlyTransactions} transaction${monthlyTransactions === 1 ? "" : "s"} this month`}
        />
        <StatCard
          icon={MdCheckCircle}
          value={totals.paidBills}
          label="Paid bills"
          tone="blue"
          caption={`${paidRate}% of bills cleared`}
        />
        <StatCard
          icon={MdSchedule}
          value={totals.pendingBills}
          label="Pending bills"
          tone="amber"
          caption={`Due amount ${formatCurrency(totals.dueAmount)}`}
        />
        <StatCard
          icon={MdReceiptLong}
          value={formatCurrency(totals.avgPayment)}
          label="Average payment"
          tone="red"
          caption={`${totals.totalPayments} recorded payment${totals.totalPayments === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-w-0 xl:items-start">
        <div className="premium-card xl:col-span-2 min-w-0">
          <div className="p-4 sm:p-5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  Payment ledger
                </h2>
                <p className="text-sm text-secondary">
                  Search recent payments or narrow the view by bill status.
                </p>
              </div>

              <SlidingTabs
                className="acct-payments-tabs w-full md:w-auto shrink-0 md:ml-auto"
                value={filter}
                onChange={setFilter}
                items={[
                  { id: "ALL", label: "All", badge: filterCounts.ALL },
                  { id: "PAID", label: "Paid", badge: filterCounts.PAID },
                  { id: "PENDING", label: "Pending", badge: filterCounts.PENDING },
                ]}
              />
            </div>

            <div className="search-input-wrap mt-4">
              <MdSearch className="search-input-icon" size={16} />
              <input
                className="input search-input"
                placeholder="Search by resident, flat, bill title, mode, or month"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="grid gap-3">
                {[...Array(4)].map((_, idx) => (
                  <LoadingCard key={idx} />
                ))}
              </div>
            ) : recentPayments.length === 0 ? (
              <div
                className="rounded-2xl border p-8 text-center"
                style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}
              >
                <MdOutlinePayments size={36} className="mx-auto text-secondary" />
                <p className="mt-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  No payment records found
                </p>
                <p className="mt-1 text-sm text-secondary">
                  Try clearing the filters or check whether payments have been recorded yet.
                </p>
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-3">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="premium-card p-4"
                      style={{ borderRadius: "16px" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                            {payment.bill_title}
                          </h3>
                          <p className="mt-1 text-xs text-secondary">
                            {payment.resident_name} • Flat {payment.flat_number}
                          </p>
                        </div>
                        <GlobalBadge variant={payment.bill_status === "PAID" ? "success" : "warning"}>
                          {payment.bill_status}
                        </GlobalBadge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="info-row">
                          <MdAccountBalance size={14} />
                          {paymentModeLabel(payment.payment_mode)}
                        </div>
                        <div className="info-row">
                          <MdDateRange size={14} />
                          {formatDate(payment.payment_date)}
                        </div>
                        <div className="info-row col-span-2 justify-between">
                          <span className="text-secondary">Amount</span>
                          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="data-table-wrap hidden md:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bill</th>
                        <th>Resident</th>
                        <th>Flat</th>
                        <th>Mode</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td>
                            <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                              {payment.bill_title}
                            </div>
                            <div className="text-xs text-secondary">{payment.billing_month || "No billing month"}</div>
                          </td>
                          <td>{payment.resident_name}</td>
                          <td>
                            {payment.flat_number}
                            {payment.block_name !== "N/A" ? ` • Block ${payment.block_name}` : ""}
                          </td>
                          <td>{paymentModeLabel(payment.payment_mode)}</td>
                          <td>{formatDate(payment.payment_date)}</td>
                          <td className="font-semibold">{formatCurrency(payment.amount)}</td>
                          <td>
                            <GlobalBadge variant={payment.bill_status === "PAID" ? "success" : "warning"}>
                              {payment.bill_status}
                            </GlobalBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="acct-payments-aside space-y-4 min-w-0">
          <div className="premium-card acct-summary-card">
            <div className="acct-summary-card__head">
              <MdFilterAlt size={18} style={{ color: "var(--accent)" }} />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Monthly summary
              </h3>
            </div>

            <div className="acct-mode-list">
              {loading ? (
                <>
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                </>
              ) : paymentModes.length === 0 ? (
                <p className="text-sm text-secondary px-0.5">No summary data available yet.</p>
              ) : (
                paymentModes.map((item) => {
                  const total = monthlyCollected || totals.totalCollected || 1;
                  const pct = Math.min(100, Math.max(6, Math.round((item.total / total) * 100)));
                  return (
                    <div key={item.mode} className="acct-mode-row">
                      <div className="acct-mode-row__top">
                        <p className="acct-mode-row__name">{paymentModeLabel(item.mode)}</p>
                        <span className="acct-mode-row__pct">{pct}%</span>
                      </div>
                      <p className="acct-mode-row__meta">
                        {formatCurrency(item.total)} • {item.transactions} transaction{item.transactions === 1 ? "" : "s"}
                      </p>
                      <div className="acct-mode-row__track">
                        <div className="acct-mode-row__fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="premium-card acct-summary-card">
            <div className="acct-summary-card__head">
              <MdHomeWork size={18} style={{ color: "var(--accent)" }} />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Quick snapshot
              </h3>
            </div>

            <div className="acct-snapshot-list text-sm">
              <div className="info-row justify-between">
                <span className="text-secondary">Filtered rows</span>
                <span className="font-semibold">{filteredPayments.length}</span>
              </div>
              <div className="info-row justify-between">
                <span className="text-secondary">Paid bills</span>
                <span className="font-semibold">{totals.paidBills}</span>
              </div>
              <div className="info-row justify-between">
                <span className="text-secondary">Pending dues</span>
                <span className="font-semibold">{formatCurrency(totals.dueAmount)}</span>
              </div>
              <div className="info-row justify-between">
                <span className="text-secondary">Search</span>
                <span className="font-semibold truncate max-w-36">{search || "None"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
