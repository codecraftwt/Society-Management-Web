import { useEffect, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  MdOutlinePayments,
  MdRefresh,
  MdChevronLeft,
  MdChevronRight,
  MdOutlineInfo,
  MdPerson,
  MdHome,
  MdCalendarToday,
  MdReceipt,
  MdDescription,
  MdAccountBalanceWallet,
} from "react-icons/md";
import { AuthContext } from "../../context/AuthContext";
import { hasPermission, isAdmin } from "../../utils/permissions";
import { getPaymentsList, confirmBillPayment } from "../../services/accountingService";

const CURRENCY = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v) || 0);

const amenityDescription = (booking) => {
  if (!booking) return null;
  const name = booking.Amenity?.name || null;
  const from = booking.from_date || booking.date;
  const range = booking.to_date && booking.to_date !== booking.from_date
    ? `${booking.from_date} – ${booking.to_date}`
    : (from || "");
  const base = `Amenity booking #${booking.id}`;
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
  const residentName = resolveResidentName(row);
  const flatNumber = resolveFlatNumber(row);
  const description =
    row.Bill?.title ||
    amenityDescription(row.booking) ||
    (row.source === "MAINTENANCE" ? `Maintenance #${row.bill_id || "—"}` : "—");

  const formattedDate = row.payment_date
    ? new Date(row.payment_date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const reference =
    row.bill_id
      ? `Bill #${row.bill_id}`
      : row.booking_id
      ? `Booking #${row.booking_id}`
      : row.booking?.id
      ? `Booking #${row.booking.id}`
      : "—";

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6 animate-fadeIn"
      style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)", zIndex: 1200 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl animate-scaleIn overflow-hidden"
        style={{
          background: "var(--modal-bg)",
          border: "1.5px solid var(--glass-border)",
          boxShadow: "var(--shadow-glass)",
          backdropFilter: "var(--blur)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <MdOutlinePayments size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">Payment Details</h3>
              <p className="text-xs text-secondary">Verified society revenue collection record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-card-inner-bg transition-colors text-lg"
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
                Total Amount Received
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
                Mode: <strong className="text-primary">{row.payment_mode || "UPI"}</strong>
              </span>
            </div>
          </div>

          {/* 2-3 Column Detail Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <DetailCard label="Resident" value={residentName} icon={MdPerson} />
            <DetailCard label="Flat / Unit" value={flatNumber} icon={MdHome} />
            <DetailCard label="Payment Date" value={formattedDate} icon={MdCalendarToday} />
            <DetailCard label="Payment Mode" value={row.payment_mode || "UPI"} icon={MdOutlinePayments} />
            <DetailCard label="Source" value={row.source || "BILL"} icon={MdAccountBalanceWallet} />
            <DetailCard label="Reference" value={reference} icon={MdReceipt} />
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
              <span>Description / Particulars</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-primary break-words leading-relaxed">
              {description}
            </p>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="btn-soft px-5 py-2 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const inputStyle = {
  background: "var(--card-inner-bg)",
  border: "1px solid var(--glass-border)",
  color: "var(--text-primary)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
};

function PaymentsSkeleton() {
  return (
    <div className="space-y-6 w-full min-w-0 animate-pulse">
      <div className="h-24 bg-card/40 border border-glass-border rounded-2xl" />
      <div className="h-72 bg-card/40 border border-glass-border rounded-2xl" />
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="px-6 py-14 text-center text-secondary flex flex-col items-center gap-3">
      <MdOutlinePayments size={40} className="opacity-40" />
      <p className="text-sm font-medium">No payments found in this society.</p>
      <button onClick={onReset} className="btn-soft px-4 py-2 text-xs font-semibold">
        Clear filters
      </button>
    </div>
  );
}

export default function Payments() {
  const { user } = useContext(AuthContext);
  const canConfirm = isAdmin(user) || hasPermission(user, "payments", "confirm");

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [source, setSource] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = async (p = page, src = source) => {
    try {
      setLoading(true);
      setErr("");
      const params = { page: p, limit: 20 };
      if (src) params.source = src;
      const res = await getPaymentsList(params);
      setRows(res.data || []);
      setPagination(res.pagination || {});
    } catch (e) {
      console.error("Failed to load payments", e);
      setErr("Failed to load payments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(1, source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const confirm = async (row) => {
    if (!row.bill_id) return;
    try {
      setConfirming(row.id);
      const res = await confirmBillPayment(row.bill_id);
      toast.success(res?.message || "Payment confirmed successfully.");
      load(page);
    } catch (e) {
      console.error("Failed to confirm payment", e);
      toast.error(e?.response?.data?.message || "Failed to confirm payment.");
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

  if (loading && rows.length === 0) return <PaymentsSkeleton />;

  const pageSize = pagination.limit || 20;
  const currentPage = pagination.currentPage || page;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-1200 mx-auto pb-8">
      {/* Page Header */}
      <div className="bg-card border border-glass-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
            <MdOutlinePayments className="text-accent" /> Payments & Collections
          </h1>
          <p className="text-xs md:text-sm text-secondary">
            Revenue inflow from bills, maintenance, and amenities. Verified collections automatically update cash book balances.
          </p>
        </div>
        <button onClick={() => load(page)} className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-semibold shrink-0">
          <MdRefresh size={16} /> Refresh
        </button>
      </div>

      {err && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium">{err}</p>
          <button onClick={() => load(page)} className="btn-primary px-4 py-2 text-xs font-semibold shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-card border border-glass-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <select
              aria-label="Payment source"
              style={inputStyle}
              className="!w-auto"
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1); }}
            >
              <option value="">All payment sources</option>
              {["BILL", "MAINTENANCE", "AMENITY"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-secondary font-medium">
            Showing {rows.length} records · Page {currentPage} of {pagination.totalPages || 1}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-glass-border text-xs uppercase tracking-wider text-secondary">
                <th className="px-4 py-3 font-semibold text-center w-16">Sr. No.</th>
                <th className="px-4 py-3 font-semibold">Payment Date</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Resident / Flat</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState onReset={() => { setSource(""); load(1, ""); setPage(1); }} />
                  </td>
                </tr>
              )}
              {rows.map((r, index) => {
                const srNo = (currentPage - 1) * pageSize + index + 1;
                const residentName = resolveResidentName(r);
                const flatNum = resolveFlatNumber(r);
                const description = r.Bill
                  ? r.Bill.title
                  : amenityDescription(r.booking)
                  ? amenityDescription(r.booking)
                  : r.source === "MAINTENANCE"
                  ? `Maintenance #${r.bill_id || "—"}`
                  : "—";
                const confirmable = canConfirm && r.bill_id && r.status !== "SUCCESS";

                return (
                  <tr key={r.id} className="border-b border-glass-border/60 hover:bg-card-inner-bg/50 transition-colors">
                    {/* Serial Number starting from 1, 2, 3... */}
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
                          {flatNum !== "—" ? `Flat: ${flatNum}` : "—"}
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
                            {confirming === r.id ? "Confirming…" : "Confirm"}
                          </button>
                        )}
                        <button
                          onClick={() => setSelected(r)}
                          className="p-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-colors"
                          title="View complete payment details"
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

        {pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-glass-border">
            <span className="text-xs text-secondary font-medium">
              Page {currentPage} of {pagination.totalPages} · {pagination.totalItems} total payments
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setPage(page - 1); load(page - 1); }}
                disabled={currentPage <= 1}
                className="btn-soft px-3 py-1.5 flex items-center justify-center text-xs font-semibold disabled:opacity-40"
              >
                <MdChevronLeft size={16} /> Prev
              </button>
              <span className="text-xs text-secondary px-2">
                {currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => { setPage(page + 1); load(page + 1); }}
                disabled={currentPage >= pagination.totalPages}
                className="btn-soft px-3 py-1.5 flex items-center justify-center text-xs font-semibold disabled:opacity-40"
              >
                Next <MdChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <PaymentDetailsModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}