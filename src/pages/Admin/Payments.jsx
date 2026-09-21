import { useEffect, useState, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  MdOutlinePayments,
  MdRefresh,
  MdOutlineInfo,
  MdPerson,
  MdHome,
  MdCalendarToday,
  MdReceipt,
  MdDescription,
  MdAccountBalanceWallet,
  MdBusiness,
} from "react-icons/md";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { hasPermission, isAdmin } from "../../utils/permissions";
import API from "../../services/api";
import { getPaymentsList, confirmBillPayment } from "../../services/accountingService";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Pagination from "../../components/common/Pagination";
import Select from "../../components/common/Select";
import "./Admin.css";

const CURRENCY = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v) || 0);

const amenityDescription = (booking, t) => {
  if (!booking) return null;
  const name = booking.Amenity?.name || null;
  const from = booking.from_date || booking.date;
  const range = booking.to_date && booking.to_date !== booking.from_date
    ? `${booking.from_date} – ${booking.to_date}`
    : (from || "");
  const base = t ? t("payAmenityBooking", { id: booking.id }) : `Amenity booking #${booking.id}`;
  return [name, range, base].filter(Boolean).join(" · ");
};

const resolveResidentName = (row) => {
  return (
    row.resident?.name ||
    row.booking?.User?.name ||
    row.Bill?.Flat?.User?.name ||
    row.Bill?.Flat?.FlatMemberships?.[0]?.User?.name ||
    "—"
  );
};

const resolveFlatNumber = (row) => {
  return (
    row.Bill?.Flat?.flat_number ||
    row.booking?.Flat?.flat_number ||
    row.booking?.User?.FlatMemberships?.[0]?.Flat?.flat_number ||
    row.resident?.FlatMemberships?.[0]?.Flat?.flat_number ||
    (row.booking?.flat_id ? `Flat #${row.booking.flat_id}` : "—")
  );
};

const SOURCE_TAB_DEFS = [
  { id: "", key: "payAllSources" },
  { id: "BILL", key: "payBills" },
  { id: "MAINTENANCE", key: "payMaintenance" },
  { id: "AMENITY", key: "payAmenities" },
];

function DetailCard({ label, value, icon: Icon }) {
  return (
    <div
      className="p-3.5 rounded-xl flex flex-col gap-1 transition-all"
      style={{
        background: "var(--card-inner-bg)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary">
        {Icon && <Icon size={14} className="text-accent shrink-0" />}
        <span>{label}</span>
      </div>
      <p className="text-xs sm:text-sm font-bold text-primary truncate" title={String(value || "—")}>
        {value || "—"}
      </p>
    </div>
  );
}

function PaymentDetailsModal({ row, onClose }) {
  const { t } = useLang();
  const residentName = resolveResidentName(row);
  const flatNumber = resolveFlatNumber(row);
  const description =
    row.Bill?.title ||
    amenityDescription(row.booking, t) ||
    (row.source === "MAINTENANCE" ? t("payMaintenanceHash", { id: row.bill_id || "—" }) : "—");

  const formattedDate = row.payment_date
    ? new Date(row.payment_date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const reference =
    row.bill_id
      ? t("payBillHash", { id: row.bill_id })
      : row.booking_id
      ? t("payBookingHash", { id: row.booking_id })
      : row.booking?.id
      ? t("payBookingHash", { id: row.booking.id })
      : "—";

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6 animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", zIndex: 1200 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl animate-scaleIn overflow-hidden"
        style={{
          background: "var(--card-bg, #0f172a)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 20px rgba(160,90,255,0.15)",
          backdropFilter: "blur(20px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--glass-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft, rgba(99,102,241,0.18))", color: "var(--accent, #818cf8)", border: "1px solid var(--accent-light, #818cf8)" }}>
              <MdOutlinePayments size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">{t("payDetailsTitle")}</h3>
              <p className="text-xs text-secondary">{t("payDetailsSub")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary transition-colors text-lg"
            style={{ background: "var(--card-inner-bg)" }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Hero Amount Banner */}
          <div
            className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t("payTotalReceived")}
              </span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {CURRENCY(row.amount)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                  row.source === "AMENITY"
                    ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                    : row.source === "MAINTENANCE"
                    ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                }`}
              >
                {row.source || "BILL"}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card-inner-bg border border-glass-border text-secondary">
                {t("payModeLabel")} <strong className="text-primary">{row.payment_mode || "UPI"}</strong>
              </span>
            </div>
          </div>

          {/* 2-3 Column Detail Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <DetailCard label={t("payResident")} value={residentName} icon={MdPerson} />
            <DetailCard label={t("payFlatUnit")} value={flatNumber} icon={MdHome} />
            <DetailCard label={t("payColDate")} value={formattedDate} icon={MdCalendarToday} />
            <DetailCard label={t("payPaymentMode")} value={row.payment_mode || "UPI"} icon={MdOutlinePayments} />
            <DetailCard label={t("payColSource")} value={row.source || "BILL"} icon={MdAccountBalanceWallet} />
            <DetailCard label={t("payReference")} value={reference} icon={MdReceipt} />
          </div>

          {/* Description Section */}
          <div
            className="p-3.5 rounded-xl space-y-1"
            style={{
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary">
              <MdDescription size={14} className="text-accent shrink-0" />
              <span>{t("payParticulars")}</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-primary wrap-break-word leading-relaxed">
              {description}
            </p>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="btn-soft px-5 py-2 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PaymentsSkeleton() {
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

export default function Payments() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.activeRole === "SUPER_ADMIN";
  const canConfirm = isAdmin(user) || hasPermission(user, "payments", "confirm");

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [source, setSource] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  /* ── SuperAdmin society gate ── */
  const [societies, setSocieties] = useState([]);
  const [societyId, setSocietyId] = useState(
    () => localStorage.getItem("superadmin_society_filter") || ""
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    API.get("/societies")
      .then((r) => setSocieties(r.data || []))
      .catch(() => setSocieties([]));
  }, [isSuperAdmin]);

  const load = async (p = page, src = source, size = limit) => {
    if (isSuperAdmin && (!societyId || societyId === "ALL")) {
      setLoading(false);
      setRows([]);
      setPagination({});
      return;
    }
    try {
      setLoading(true);
      setErr("");
      const params = { page: p, limit: size };
      if (src) params.source = src;
      const res = await getPaymentsList(params);
      setRows(res.data || []);
      setPagination(res.pagination || {});
    } catch (e) {
      console.error("Failed to load payments", e);
      setErr(t("payLoadFail"));
    } finally {
      setLoading(false);
    }
  };

  const handleSocietyChange = (e) => {
    const val = e.target.value;
    setSocietyId(val);
    localStorage.setItem("superadmin_society_filter", val);
    setPage(1);
    load(1, source);
  };

  useEffect(() => {
    load(1, source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const confirm = async (row) => {
    if (!row.bill_id) return;
    try {
      setConfirming(row.id);
      const res = await confirmBillPayment(row.bill_id);
      toast.success(res?.message || t("payConfirmOk"));
      load(page);
    } catch (e) {
      console.error("Failed to confirm payment", e);
      toast.error(e?.response?.data?.message || t("payConfirmFail"));
    } finally {
      setConfirming(null);
    }
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return String(d);
    }
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const resName = resolveResidentName(r).toLowerCase();
      const flatNum = resolveFlatNumber(r).toLowerCase();
      const desc = (
        r.Bill?.title ||
        amenityDescription(r.booking, t) ||
        (r.source === "MAINTENANCE" ? t("payMaintenanceHash", { id: r.bill_id || "" }) : "")
      ).toLowerCase();
      const mode = (r.payment_mode || "").toLowerCase();
      const amt = String(r.amount || "");
      const src = (r.source || "").toLowerCase();

      return (
        resName.includes(q) ||
        flatNum.includes(q) ||
        desc.includes(q) ||
        mode.includes(q) ||
        amt.includes(q) ||
        src.includes(q)
      );
    });
  }, [rows, search, t]);

  const SOURCE_TABS = SOURCE_TAB_DEFS.map((tab) => ({ id: tab.id, label: t(tab.key) }));

  if (loading && rows.length === 0) return <PaymentsSkeleton />;

  const pageSize = limit;
  const currentPage = pagination.currentPage || page;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-1200 mx-auto pb-8">
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
                {pagination.totalItems ?? rows.length}
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
            onChange={(val) => { setSource(val); setPage(1); }}
            items={isSearchOpen ? SOURCE_TABS.filter((tab) => tab.id === source) : SOURCE_TABS}
          />

          {/* Expandable Animated Search Slider */}
          <ExpandableSearch
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder={t("paySearch")}
            fetching={loading}
            isOpen={isSearchOpen}
            onOpenChange={setIsSearchOpen}
          />

          {/* Refresh Button */}
          <button
            onClick={() => load(page)}
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
              onChange={handleSocietyChange}
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
              ✓ {t("payWorkingOn", { name: societies.find((s) => String(s.id) === String(societyId))?.name || "" })}
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

      {!isSuperAdmin || (societyId && societyId !== "ALL") ? (<>
      {err && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium">{err}</p>
          <button onClick={() => load(page)} className="btn-primary px-4 py-2 text-xs font-semibold shrink-0">
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
                    <EmptyState onReset={() => { setSource(""); setSearch(""); load(1, ""); setPage(1); }} />
                  </td>
                </tr>
              )}
              {filteredRows.map((r, index) => {
                const srNo = (currentPage - 1) * pageSize + index + 1;
                const residentName = resolveResidentName(r);
                const flatNum = resolveFlatNumber(r);
                const description = r.Bill
                  ? r.Bill.title
                  :                 amenityDescription(r.booking, t)
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
                            onClick={() => confirm(r)}
                            disabled={confirming === r.id}
                            className="btn-primary px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
                          >
                            {confirming === r.id ? t("confirming") : t("confirm")}
                          </button>
                        )}
                        <button
                          onClick={() => setSelected(r)}
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
              onPageChange={(p) => { setPage(p); load(p); }}
              pageSize={limit}
              onPageSizeChange={(s) => {
                setLimit(s);
                setPage(1);
                load(1, source, s);
              }}
            />
          </div>
        )}
      </div>

      {selected && <PaymentDetailsModal row={selected} onClose={() => setSelected(null)} />}
      </>): null}
    </div>
  );
}