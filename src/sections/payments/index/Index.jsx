import { MdOutlinePayments, MdRefresh, MdBusiness, MdOutlineInfo } from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import SlidingTabs from "../../../components/common/SlidingTabs";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import Pagination from "../../../components/common/Pagination";
import Select from "../../../components/common/Select";
import {
  CURRENCY,
  amenityDescription,
  resolveResidentName,
  resolveFlatNumber,
} from "../paymentDetails";

const SOURCE_TAB_DEFS = [
  { id: "", key: "payAllSources" },
  { id: "BILL", key: "payBills" },
  { id: "MAINTENANCE", key: "payMaintenance" },
  { id: "AMENITY", key: "payAmenities" },
];

export function PaymentsSkeleton() {
  return (
    <div className="space-y-6 w-full min-w-0 animate-pulse">
      <div className="h-20 bg-card/40 border border-glass-border rounded-2xl" />
      <div className="h-72 bg-card/40 border border-glass-border rounded-2xl" />
    </div>
  );
}

function EmptyState({ onReset }) {
  const { t } = useLang();
  return (
    <div className="px-6 py-14 text-center text-secondary flex flex-col items-center gap-3">
      <MdOutlinePayments size={40} className="opacity-40" />
      <p className="text-sm font-medium">{t("payEmpty")}</p>
      <button onClick={onReset} className="btn-soft px-4 py-2 text-xs font-semibold">
        {t("billClearFilters")}
      </button>
    </div>
  );
}

export default function Index({
  source,
  onSourceChange,
  search,
  onSearchChange,
  isSearchOpen,
  onOpenChange,
  loading,
  onRefresh,
  isSuperAdmin,
  societies,
  societyId,
  onSocietyChange,
  workingSocietyName,
  totalCount,
  hasContent,
  err,
  onRetry,
  filteredRows,
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
  const SOURCE_TABS = SOURCE_TAB_DEFS.map((tab) => ({ id: tab.id, label: t(tab.key) }));

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return String(d);
    }
  };

  return (
    <>
      {/* ── UNIFIED HEADER BAR ── */}
      <div
        className="ad-page-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-accent shrink-0"
            style={{
              background: "var(--accent-soft, rgba(99,102,241,0.18))",
              border: "1px solid var(--accent-light, #818cf8)",
            }}
          >
            <MdOutlinePayments size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              {t("payTitle")}
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--accent-soft, rgba(99,102,241,0.18))",
                  color: "var(--accent, #818cf8)",
                }}
              >
                {totalCount}
              </span>
            </h1>
            <p className="text-xs text-secondary hidden sm:block">
              {t("paySubtitle")}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1">
          {/* Source Sliding Tabs */}
          <SlidingTabs
            value={source}
            onChange={onSourceChange}
            items={isSearchOpen ? SOURCE_TABS.filter((tab) => tab.id === source) : SOURCE_TABS}
          />

          {/* Expandable Animated Search Slider */}
          <ExpandableSearch
            value={search}
            onChange={onSearchChange}
            placeholder={t("paySearch")}
            fetching={loading}
            isOpen={isSearchOpen}
            onOpenChange={onOpenChange}
          />

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title={t("payRefreshTitle")}
            className="inline-flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0"
            style={{
              width: 38,
              height: 38,
              background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
              borderColor: "var(--glass-border)",
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.08))";
              e.currentTarget.style.borderColor = "var(--accent-light, #818cf8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--card-inner-bg, rgba(255,255,255,0.04))";
              e.currentTarget.style.borderColor = "var(--glass-border)";
            }}
          >
            <MdRefresh size={18} className={loading ? "animate-spin text-accent" : "text-secondary"} />
          </button>
        </div>
      </div>

      {/* SuperAdmin: must select a society first */}
      {isSuperAdmin && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "var(--card-inner-bg)", padding: "8px 14px", borderRadius: 14, border: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 220 }}>
            <MdBusiness size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{t("selectSociety")}</span>
            <Select
              value={societyId}
              onChange={onSocietyChange}
              style={{ height: 38, fontSize: 13, fontWeight: 700, flex: 1, border: "1.5px solid var(--accent-alpha,rgba(107,70,193,0.25))" }}
            >
              <option value="">{t("chooseSociety")}</option>
              {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          {(!societyId || societyId === "ALL") ? (
            <span style={{ fontSize: 12, color: "var(--stat-amber-color)", fontWeight: 700 }}>
              💡 {t("paySelectSocietyHint")}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--stat-green-color)", fontWeight: 700 }}>
              ✓ {t("payWorkingOn", { name: workingSocietyName })}
            </span>
          )}
        </div>
      )}

      {isSuperAdmin && (!societyId || societyId === "ALL") && (
        <div className="rounded-xl border p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: "var(--card-bg)", borderColor: "var(--glass-border)" }}>
          <MdBusiness size={36} className="opacity-30" />
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("paySelectContinue")}</p>
          <p className="text-xs text-secondary">{t("payNeedSociety")}</p>
        </div>
      )}

      {hasContent && (
        <>
          {err && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm font-medium">{err}</p>
              <button onClick={onRetry} className="btn-primary px-4 py-2 text-xs font-semibold shrink-0">
                {t("retry")}
              </button>
            </div>
          )}

          {/* Main Table Card */}
          <div
            className="data-table-wrap rounded-2xl border overflow-hidden"
            style={{
              background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
              borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <div className="px-5 py-3.5 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--glass-border)" }}>
              <span className="text-xs sm:text-sm font-bold text-primary">
                {source ? t("paySourceCollections", { source }) : t("payAllCollections")}
                <span className="text-xs font-normal text-secondary ml-2">
                  — {t("payShowing", { n: filteredRows.length })} {search ? t("matchingQuoted", { q: search }) : t("recordsLabel")}
                </span>
              </span>
              <span className="text-xs text-secondary font-medium hidden sm:inline-block">
                {t("pageOf", { current: currentPage, total: pagination.totalPages || 1 })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-secondary" style={{ borderColor: "var(--glass-border)" }}>
                    <th className="px-4 py-3 font-semibold text-center w-16">{t("payColSr")}</th>
                    <th className="px-4 py-3 font-semibold">{t("payColDate")}</th>
                    <th className="px-4 py-3 font-semibold">{t("payColSource")}</th>
                    <th className="px-4 py-3 font-semibold">{t("payColResidentFlat")}</th>
                    <th className="px-4 py-3 font-semibold">{t("payColDesc")}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t("payColAmount")}</th>
                    <th className="px-4 py-3 font-semibold">{t("payColMode")}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t("payColAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState onReset={onReset} />
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((r, index) => {
                    const srNo = (currentPage - 1) * pageSize + index + 1;
                    const residentName = resolveResidentName(r);
                    const flatNum = resolveFlatNumber(r);
                    const description = r.Bill
                      ? r.Bill.title
                      : amenityDescription(r.booking, t)
                      ? amenityDescription(r.booking, t)
                      : r.source === "MAINTENANCE"
                      ? t("payMaintenanceHash", { id: r.bill_id || "—" })
                      : "—";
                    const confirmable = canConfirm && r.bill_id && r.status !== "SUCCESS";

                    return (
                      <tr key={r.id} className="border-b hover:bg-card-inner-bg/50 transition-colors" style={{ borderColor: "var(--glass-border)" }}>
                        {/* Serial Number */}
                        <td className="px-4 py-3 text-secondary text-center font-bold text-xs">{srNo}</td>
                        <td className="px-4 py-3 text-secondary whitespace-nowrap text-xs">{fmtDate(r.payment_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                            r.source === "AMENITY"
                              ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                              : r.source === "MAINTENANCE"
                              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          }`}>
                            {r.source || "BILL"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-primary font-bold text-xs">{residentName}</span>
                            <span className="text-secondary text-[11px]">
                              {flatNum !== "—" ? t("payFlatPrefix", { n: flatNum }) : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-primary font-medium max-w-60 truncate text-xs" title={description}>
                          {description}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          +{CURRENCY(r.amount)}
                        </td>
                        <td className="px-4 py-3 text-secondary text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-card-inner-bg border border-glass-border">
                            {r.payment_mode || "UPI"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end w-full">
                            {confirmable && (
                              <button
                                onClick={() => onConfirm(r)}
                                disabled={confirming === r.id}
                                className="btn-primary px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
                              >
                                {confirming === r.id ? t("confirming") : t("confirm")}
                              </button>
                            )}
                            <button
                              onClick={() => onView(r)}
                              className="p-1.5 rounded-lg text-accent transition-colors"
                              style={{
                                background: "var(--accent-soft, rgba(99,102,241,0.18))",
                                border: "1px solid var(--accent-light, #818cf8)",
                              }}
                              title={t("payViewDetails")}
                            >
                              <MdOutlineInfo size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--glass-border)" }}>
                <span className="text-xs text-secondary font-medium">
                  {t("pageOf", { current: currentPage, total: pagination.totalPages || 1 })} · {t("payPageTotal", { n: pagination.totalItems || 0 })}
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
        </>
      )}
    </>
  );
}