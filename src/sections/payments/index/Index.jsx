import React, { useMemo } from "react";
import {
  MdOutlinePayments,
  MdRefresh,
  MdBusiness,
  MdOutlineInfo,
  MdFileDownload,
  MdReceiptLong,
  MdBuild,
  MdSportsTennis,
  MdAccountBalanceWallet,
  MdSwapHoriz,
  MdCheckCircle,
  MdCalendarToday,
  MdHome,
  MdQrCode,
  MdCreditCard,
  MdAccountBalance,
  MdPayments,
  MdReceipt,
  MdPerson,
} from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import { useLang } from "../../../context/LanguageContext";
import SlidingTabs from "../../../components/common/SlidingTabs";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import Pagination from "../../../components/common/Pagination";
import Select from "../../../components/common/Select";
import GlobalButton from "../../../components/common/GlobalButton";
import StatCard from "../../../components/common/StatCard";
import {
  CURRENCY,
  amenityDescription,
  resolveResidentName,
  resolveFlatNumber,
} from "../paymentDetails";

const SOURCE_TAB_DEFS = [
  { id: "", key: "payAllSources", labelFallback: "All Inflows" },
  { id: "BILL", key: "payBills", labelFallback: "Society Bills" },
  { id: "MAINTENANCE", key: "payMaintenance", labelFallback: "Maintenance" },
  { id: "AMENITY", key: "payAmenities", labelFallback: "Amenities" },
];

const PAYMENT_MODES = [
  { id: "ALL", label: "All Modes" },
  { id: "UPI", label: "UPI" },
  { id: "CASH", label: "Cash" },
  { id: "NET_BANKING", label: "Net Banking" },
  { id: "CARD", label: "Card" },
  { id: "CHEQUE", label: "Cheque" },
];

export function PaymentsSkeleton() {
  return (
    <div className="space-y-6 w-full min-w-0 animate-pulse">
      <div className="h-20 bg-card/50 border border-glass rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-card/50 border border-glass rounded-2xl" />
        ))}
      </div>
      <div className="h-80 bg-card/50 border border-glass rounded-2xl" />
    </div>
  );
}

function EmptyState({ onReset }) {
  const { t } = useLang();
  return (
    <div className="px-6 py-16 text-center text-secondary flex flex-col items-center justify-center gap-3">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-card-inner border border-glass text-secondary opacity-60">
        <MdOutlinePayments size={36} />
      </div>
      <p className="text-base font-bold text-primary">
        {t("payEmpty") || "No payment records found"}
      </p>
      <p className="text-xs text-secondary max-w-sm">
        No payment records match the current filters or search query.
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-accent/15 text-accent border border-accent/25 hover:bg-accent/25 transition-all cursor-pointer"
        >
          {t("billClearFilters") || "Clear All Filters"}
        </button>
      )}
    </div>
  );
}

export default function Index({
  source,
  onSourceChange,
  modeFilter,
  onModeFilterChange,
  search,
  onSearchChange,
  isSearchOpen,
  onOpenChange,
  loading,
  onRefresh,
  onExportCSV,
  isSuperAdmin,
  societies,
  societyId,
  onSocietyChange,
  onSelectSociety,
  workingSocietyName,
  totalCount,
  hasContent,
  err,
  onRetry,
  filteredRows,
  stats,
  onReset,
  currentPage,
  pageSize,
  pagination,
  canConfirm,
  confirming,
  onConfirm,
  onView,
  onPageChange,
  onPageSizeChange,
}) {
  const { t } = useLang();
  /* Memoized so the tab strip keeps a stable `items` identity. Rebuilding it on
     every render made SlidingTabs re-measure and re-render each time. */
  const SOURCE_TABS = useMemo(
    () =>
      SOURCE_TAB_DEFS.map((tab) => ({
        id: tab.id,
        label: t(tab.key) || tab.labelFallback,
      })),
    [t]
  );

  const fmtDate = (d) => {
    if (!d) return { date: "—", time: "" };
    try {
      const dt = new Date(d);
      return {
        date: dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
      };
    } catch {
      return { date: String(d), time: "" };
    }
  };

  const getSourceIcon = (src) => {
    switch ((src || "").toUpperCase()) {
      case "MAINTENANCE":
        return <MdBuild size={12} />;
      case "AMENITY":
        return <MdSportsTennis size={12} />;
      default:
        return <MdReceiptLong size={12} />;
    }
  };

  const getSourceBadgeClass = (src) => {
    switch ((src || "").toUpperCase()) {
      case "AMENITY":
        return "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25";
      case "MAINTENANCE":
        return "bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/25";
      default:
        return "bg-purple-500/12 text-purple-600 dark:text-purple-400 border-purple-500/25";
    }
  };

  const getModeIcon = (mode) => {
    switch ((mode || "").toUpperCase()) {
      case "UPI":
        return <MdQrCode size={13} className="text-emerald-500" />;
      case "CASH":
        return <MdPayments size={13} className="text-amber-500" />;
      case "NET_BANKING":
        return <MdAccountBalance size={13} className="text-blue-500" />;
      case "CARD":
        return <MdCreditCard size={13} className="text-purple-500" />;
      case "CHEQUE":
        return <MdReceipt size={13} className="text-rose-500" />;
      default:
        return <MdOutlinePayments size={13} className="text-secondary" />;
    }
  };

  const kpis = [
    {
      title: "Total Inflows",
      val: CURRENCY(stats?.totalAmt || 0),
      count: `${stats?.totalCount || 0} txn`,
      tone: "success",
      icon: MdAccountBalanceWallet,
    },
    {
      title: "Maintenance",
      val: CURRENCY(stats?.maintAmt || 0),
      count: `${stats?.maintCount || 0} bills`,
      tone: "info",
      icon: MdBuild,
    },
    {
      title: "Society Bills",
      val: CURRENCY(stats?.billAmt || 0),
      count: `${stats?.billCount || 0} bills`,
      tone: "brand",
      icon: MdReceiptLong,
    },
    {
      title: "Amenity Bookings",
      val: CURRENCY(stats?.amenityAmt || 0),
      count: `${stats?.amenityCount || 0} bookings`,
      tone: "warning",
      icon: MdSportsTennis,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── UNIFIED HEADER BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(16, 185, 129, 0.3)",
              color: "#ffffff",
            }}
          >
            <MdOutlinePayments size={24} color="#fff" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2
                className="text-lg sm:text-xl font-bold tracking-tight text-primary"
                style={{ letterSpacing: "-0.02em", margin: 0 }}
              >
                {t("payTitle") || "Payments & Collections"}
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                {totalCount} Total
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar: Society Dropdown + Export CSV + Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {isSuperAdmin && societies.length > 0 && (
            <Select
              className="text-xs font-semibold"
              value={societyId}
              onChange={onSocietyChange}
              style={{
                height: 38,
                fontSize: 13,
                minWidth: 180,
                background: "var(--card-inner-bg)",
                borderColor: "var(--glass-border)",
                color: "var(--text-primary)",
                borderRadius: 12,
              }}
            >
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}

          <GlobalButton
            variant="secondary"
            size="sm"
            icon={MdFileDownload}
            onClick={onExportCSV}
            className="whitespace-nowrap font-bold"
            title="Download CSV export of payments"
          >
            Export CSV
          </GlobalButton>

          <button
            onClick={onRefresh}
            title={t("payRefreshTitle") || "Refresh payment records"}
            className="inline-flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 h-9 w-9 bg-card-inner border-glass text-secondary hover:text-primary hover:border-accent"
          >
            <MdRefresh
              size={18}
              className={loading ? "animate-spin text-accent" : ""}
            />
          </button>
        </div>
      </div>

      {/* ── 4 COMPACT STATS CARDS WITH GENEROUS BOTTOM MARGIN ── */}
      {hasContent && (
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6 sm:mb-7"
          style={{ padding: "2px", margin: "0 -2px 1.5rem -2px" }}
        >
          {kpis.map((kpi, idx) => (
            <StatCard
              key={kpi.title}
              layout="inline"
              icon={kpi.icon}
              value={kpi.val}
              label={kpi.title}
              tone={kpi.tone}
              description={
                <span className="block text-[10px] opacity-70 mt-0.5">{kpi.count}</span>
              }
              style={{ animationDelay: `${idx * 50}ms` }}
            />
          ))}
        </div>
      )}

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      {hasContent && (
        <div
          className="p-3 sm:p-3.5 rounded-2xl flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card border border-glass"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          {/* Source Sliding Tabs */}
          <div className="min-w-0 max-w-full overflow-x-auto">
            <SlidingTabs value={source} onChange={onSourceChange} items={SOURCE_TABS} />
          </div>

          {/* Right Toolbar: Payment Mode + Expandable Search */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Mode Select */}
            <Select
              className="input h-9 text-xs font-bold rounded-xl min-w-32.5"
              value={modeFilter}
              onChange={(e) => onModeFilterChange && onModeFilterChange(e.target.value)}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>

            {/* Expandable Animated Search */}
            <ExpandableSearch
              value={search}
              onChange={onSearchChange}
              placeholder={t("paySearch") || "Search resident, flat, bill, mode…"}
              fetching={loading}
              isOpen={isSearchOpen}
              onOpenChange={onOpenChange}
              maxWidth={260}
            />
          </div>
        </div>
      )}

      {/* ── ERROR ALERT ── */}
      {hasContent && err && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium">{err}</p>
          <button
            onClick={onRetry}
            className="btn-primary px-4 py-2 text-xs font-semibold shrink-0"
          >
            {t("retry") || "Retry"}
          </button>
        </div>
      )}

      {/* ── MAIN TRANSACTIONS TABLE (PREMIUM FINTECH DESIGN) ── */}
      {hasContent && (
        <div
          className="rounded-2xl border overflow-hidden bg-card border-glass shadow-sm"
          style={{
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {/* In-place progress: switching a source tab updates the table where it
              stands instead of tearing the whole page down. */}
          {loading && (
            <div
              className="h-0.5 w-full overflow-hidden"
              style={{ background: "var(--glass-border)" }}
              role="status"
              aria-live="polite"
            >
              <div
                className="h-full w-1/3 rounded-full"
                style={{
                  background: "var(--accent)",
                  animation: "payments-bar 1.1s ease-in-out infinite",
                }}
              />
            </div>
          )}

          {/* Table Header Bar */}
          <div
            className="px-5 py-3 border-b flex items-center justify-between gap-3 bg-card-inner/80"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-primary">
                {source
                  ? t("paySourceCollections", { source }) || `${source} Collections`
                  : t("payAllCollections") || "All Transaction Inflows"}
              </span>
              <span className="text-xs text-secondary font-normal">
                ({filteredRows.length} showing)
              </span>
            </div>

            <span className="text-xs text-secondary font-medium">
              {t("pageOf", { current: currentPage, total: pagination.totalPages || 1 }) ||
                `Page ${currentPage} of ${pagination.totalPages || 1}`}
            </span>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr
                  className="border-b text-[10px] sm:text-[11px] uppercase tracking-wider text-secondary/90 bg-card-inner/50"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  <th className="px-4 py-3 font-extrabold text-center w-12">#</th>
                  <th className="px-4 py-3 font-extrabold">{t("payColDate") || "Date & Time"}</th>
                  <th className="px-4 py-3 font-extrabold">{t("payColSource") || "Category"}</th>
                  <th className="px-4 py-3 font-extrabold">
                    {t("payColResidentFlat") || "Resident & Flat"}
                  </th>
                  <th className="px-4 py-3 font-extrabold">{t("payColDesc") || "Particulars"}</th>
                  <th className="px-4 py-3 font-extrabold text-right">
                    {t("payColAmount") || "Amount"}
                  </th>
                  <th className="px-4 py-3 font-extrabold text-center">{t("payColMode") || "Mode"}</th>
                  <th className="px-4 py-3 font-extrabold text-center">Status</th>
                  <th className="px-4 py-3 font-extrabold text-right">
                    {t("payColAction") || "Receipt"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {loading && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="px-6 py-16 flex flex-col items-center justify-center gap-3 text-secondary">
                        <svg className="animate-spin w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none">
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="opacity-25"
                          />
                          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <p className="text-sm font-medium">
                          {t("payLoading") || "Updating records…"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState onReset={onReset} />
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, index) => {
                    const srNo = (currentPage - 1) * pageSize + index + 1;
                    const residentName = resolveResidentName(r);
                    const flatNum = resolveFlatNumber(r);
                    const description = r.Bill
                      ? r.Bill.title
                      : amenityDescription(r.booking, t)
                      ? amenityDescription(r.booking, t)
                      : r.source === "MAINTENANCE"
                      ? t("payMaintenanceHash", { id: r.bill_id || "—" }) ||
                        `Maintenance #${r.bill_id || "—"}`
                      : "—";
                    const confirmable = canConfirm && r.bill_id && r.status !== "SUCCESS";
                    const dt = fmtDate(r.payment_date);

                    return (
                      <tr
                        key={r.id || index}
                        className="hover:bg-accent/4 dark:hover:bg-accent/6 transition-colors group cursor-default"
                      >
                        {/* Serial Number */}
                        <td className="px-4 py-3 text-secondary text-center font-bold text-xs">
                          {srNo}
                        </td>

                        {/* Date & Time */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-card-inner border border-glass flex items-center justify-center text-secondary shrink-0">
                              <MdCalendarToday size={12} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-primary leading-tight">
                                {dt.date}
                              </span>
                              {dt.time && (
                                <span className="text-[10px] text-secondary font-mono">
                                  {dt.time}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Source / Category */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide border shadow-2xs ${getSourceBadgeClass(
                              r.source
                            )}`}
                          >
                            {getSourceIcon(r.source)}
                            <span>{r.source || "BILL"}</span>
                          </span>
                        </td>

                        {/* Resident & Flat */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-linear-to-tr from-accent/20 to-purple-500/20 text-accent shrink-0 border border-accent/30 shadow-2xs">
                              {residentName !== "—" ? residentName.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-primary font-bold text-xs truncate max-w-37.5 leading-tight">
                                {residentName}
                              </span>
                              {flatNum !== "—" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary mt-0.5">
                                  <MdHome size={11} className="text-accent shrink-0" />
                                  <span>Flat {flatNum}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td
                          className="px-4 py-3 text-primary font-medium max-w-52.5 truncate text-xs"
                          title={description}
                        >
                          <span className="truncate block font-semibold">{description}</span>
                          <span className="text-[10px] text-secondary font-mono">
                            {r.bill_id ? `Ref: Bill #${r.bill_id}` : r.booking_id ? `Ref: Book #${r.booking_id}` : ""}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-extrabold text-xs sm:text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-mono shadow-2xs">
                            +{CURRENCY(r.amount)}
                          </span>
                        </td>

                        {/* Payment Mode */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-card-inner border border-glass text-primary shadow-2xs">
                            {getModeIcon(r.payment_mode)}
                            <span>{r.payment_mode || "UPI"}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/12 text-emerald-500 border border-emerald-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{r.status || "CONFIRMED"}</span>
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end w-full">
                            {confirmable && (
                              <button
                                onClick={() => onConfirm(r)}
                                disabled={confirming === r.id}
                                className="btn-primary px-3 py-1.5 text-[11px] font-bold disabled:opacity-50 rounded-lg cursor-pointer"
                              >
                                {confirming === r.id
                                  ? t("confirming") || "Confirming…"
                                  : t("confirm") || "Confirm"}
                              </button>
                            )}

                            <button
                              onClick={() => onView(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-accent bg-accent/10 border border-accent/25 hover:bg-accent/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
                              title={t("payViewDetails") || "View receipt voucher"}
                            >
                              <MdReceipt size={14} />
                              <span className="hidden sm:inline">Receipt</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredRows.length > 0 && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t bg-card-inner/30"
              style={{ borderColor: "var(--glass-border)" }}
            >
              <span className="text-xs text-secondary font-medium">
                {t("pageOf", {
                  current: currentPage,
                  total: pagination.totalPages || 1,
                }) || `Page ${currentPage} of ${pagination.totalPages || 1}`}{" "}
                · {pagination.totalItems || totalCount} total records
              </span>
              <Pagination
                page={currentPage}
                totalPages={pagination.totalPages || 1}
                onPageChange={onPageChange}
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}