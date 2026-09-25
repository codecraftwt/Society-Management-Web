import { createPortal } from "react-dom";
import { MdOutlinePayments, MdPerson, MdHome, MdCalendarToday, MdReceipt, MdDescription, MdAccountBalanceWallet } from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import { CURRENCY, amenityDescription, resolveResidentName, resolveFlatNumber } from "../paymentDetails";

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

export default function PaymentDetailsModal({ row, onClose }) {
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