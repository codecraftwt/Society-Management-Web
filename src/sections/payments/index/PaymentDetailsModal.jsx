import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  MdCheckCircle,
  MdPrint,
  MdClose,
  MdContentCopy,
  MdCheck,
} from "react-icons/md";
import { toast } from "react-toastify";
import { useLang } from "../../../context/LanguageContext";
import {
  CURRENCY,
  amenityDescription,
  resolveResidentName,
  resolveFlatNumber,
} from "../paymentDetails";

export default function PaymentDetailsModal({ row, onClose }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  if (!row) return null;

  const residentName = resolveResidentName(row);
  const flatNumber = resolveFlatNumber(row);
  const description =
    row.Bill?.title ||
    amenityDescription(row.booking, t) ||
    (row.source === "MAINTENANCE"
      ? t("payMaintenanceHash", { id: row.bill_id || "—" }) || `Maintenance #${row.bill_id || "—"}`
      : "—");

  const formattedDate = row.payment_date
    ? new Date(row.payment_date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  const reference =
    row.bill_id
      ? t("payBillHash", { id: row.bill_id }) || `Bill #${row.bill_id}`
      : row.booking_id
      ? t("payBookingHash", { id: row.booking_id }) || `Booking #${row.booking_id}`
      : row.booking?.id
      ? t("payBookingHash", { id: row.booking.id }) || `Booking #${row.booking.id}`
      : row.transaction_id || `TXN-${row.id || "001"}`;

  const rawRef =
    row.bill_id ? `BILL-${row.bill_id}` : row.booking_id ? `BOOK-${row.booking_id}` : reference;

  const handleCopyRef = () => {
    try {
      navigator.clipboard.writeText(rawRef);
      setCopied(true);
      toast.success("Reference copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info(`Reference: ${rawRef}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const detailRows = [
    { label: "Resident", value: residentName },
    { label: "Flat / Unit", value: flatNumber !== "—" ? flatNumber : "General" },
    { label: "Payment Date", value: formattedDate },
    { label: "Payment Mode", value: row.payment_mode || "UPI" },
    { label: "Source", value: row.source || "BILL" },
    {
      label: "Reference",
      value: reference,
      isRef: true,
    },
    { label: "Description / Particulars", value: description, isFull: true },
  ];

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
      style={{
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 1300,
      }}
      onClick={onClose}
    >
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .formal-receipt-voucher, .formal-receipt-voucher * {
            visibility: visible;
          }
          .formal-receipt-voucher {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            background: #fff !important;
            color: #000 !important;
            padding: 24px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Formal Modal Container */}
      <div
        className="formal-receipt-voucher w-full max-w-md rounded-2xl animate-scaleIn bg-card border border-glass shadow-xl relative overflow-hidden"
        style={{
          boxShadow: "0 20px 60px -10px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <div>
            <h3 className="text-sm font-bold text-primary tracking-tight">Payment Details</h3>
            <p className="text-[11px] text-secondary">Verified society revenue collection record</p>
          </div>
          <button
            onClick={onClose}
            className="no-print p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-card-inner transition-colors cursor-pointer"
            title="Close"
          >
            <MdClose size={17} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Amount Summary Row */}
          <div
            className="flex items-center justify-between pb-3.5 border-b"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                Total Amount Received
              </span>
              <div className="text-2xl font-extrabold text-primary font-mono tracking-tight mt-0.5">
                {CURRENCY(row.amount)}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-card-inner border border-glass text-secondary">
                {row.source || "BILL"}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-card-inner border border-glass text-primary">
                {row.payment_mode || "UPI"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <MdCheckCircle size={11} />
                <span>Success</span>
              </span>
            </div>
          </div>

          {/* Clean Key-Value Data List (No bulky cards or backgrounds) */}
          <div className="divide-y divide-glass/50 text-xs">
            {detailRows.map((item, idx) => (
              <div
                key={idx}
                className={`py-2 flex ${
                  item.isFull ? "flex-col gap-1" : "items-center justify-between gap-4"
                }`}
              >
                <span className="text-secondary font-medium shrink-0">
                  {item.label}
                </span>

                {item.isRef ? (
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary font-mono">{item.value}</span>
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="no-print p-1 rounded hover:bg-card-inner text-secondary hover:text-primary transition-colors cursor-pointer"
                      title="Copy Reference"
                    >
                      {copied ? (
                        <MdCheck size={12} className="text-emerald-500" />
                      ) : (
                        <MdContentCopy size={12} />
                      )}
                    </button>
                  </div>
                ) : (
                  <span
                    className={`font-semibold text-primary text-right ${
                      item.isFull ? "text-left text-xs leading-relaxed" : "truncate max-w-[240px]"
                    }`}
                  >
                    {item.value || "—"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div
            className="no-print pt-3 flex items-center justify-between gap-3 border-t"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-card-inner border border-glass text-secondary hover:text-primary hover:border-accent transition-all cursor-pointer"
            >
              <MdPrint size={14} />
              <span>Print Voucher</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-contrast hover:opacity-90 transition-opacity cursor-pointer"
              style={{
                backgroundColor: "var(--accent, #6366f1)",
                color: "#ffffff",
              }}
            >
              {t("close") || "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}