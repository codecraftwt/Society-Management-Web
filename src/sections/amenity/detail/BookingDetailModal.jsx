import React, { useState } from "react";
import {
  MdClose,
  MdEventAvailable,
  MdAccessTime,
  MdPerson,
  MdPhone,
  MdEmail,
  MdHome,
  MdApartment,
  MdPayment,
  MdCheckCircle,
  MdCancel,
  MdOutlineContentCopy,
  MdCheck,
  MdInfoOutline,
  MdCalendarMonth,
  MdGroups,
  MdReceiptLong,
  MdShield,
  MdTimer,
} from "react-icons/md";
import GlobalModal from "../../../components/common/GlobalModal";
import { Spinner, amenityEmoji, isPaidAmenity } from "../amenityHelpers.jsx";
import { formatBlockName, formatUnitNumber } from "../../../utils/flatFormatter";

/* ── Date formatting helpers ── */
function formatFullDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime12(timeStr) {
  if (!timeStr) return "—";
  try {
    const parts = String(timeStr).split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    const hStr = h < 10 ? `0${h}` : `${h}`;
    return `${hStr}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function formatCurrency(amount) {
  if (amount == null || isNaN(Number(amount))) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function BookingDetailModal({
  booking,
  onClose,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
  canAct = false,
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!booking) return null;

  const copyToClipboard = (text, key) => {
    if (!text || text === "—") return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }
  };

  /* ── User & Flat Resolution ── */
  const user = booking.User || {};
  const flat = booking.Flat || user.Flat || {};
  const block = flat.Block || {};
  const blockName = formatBlockName(block.name || "");
  const unitNumber = formatUnitNumber(flat.flat_number || "", block.name || "");
  const isRowHouse =
    String(block.property_type || flat.property_type || "").toUpperCase() === "ROW_HOUSE" ||
    String(block.property_type || flat.property_type || "").toUpperCase() === "ROWHOUSE";

  /* ── Amenity & Pricing Resolution ── */
  const amenity = booking.Amenity || {};
  const isPaid = (amenity.type || "").toUpperCase() === "PAID" || booking.payment_status === "PAID";
  const ratePerHour = Number(amenity.rate_per_hour || 0);

  /* ── Schedule Resolution ── */
  const fromDate = booking.from_date || booking.date;
  const toDate = booking.to_date || fromDate;
  const isDateRange = toDate && toDate !== fromDate;
  const isFullDay =
    amenity.booking_type === "FULL_DAY" ||
    (booking.start_time === "00:00:00" && (booking.end_time === "23:59:59" || !booking.end_time));

  const totalDays = booking.date_count || (fromDate && toDate
    ? Math.max(1, Math.round((new Date(toDate + "T00:00:00") - new Date(fromDate + "T00:00:00")) / 86400000) + 1)
    : 1);

  const slotList = Array.isArray(booking.slots) && booking.slots.length > 0 ? booking.slots : null;
  const slotCount = slotList ? slotList.length : booking.slot_count || 1;

  /* ── Amount calculation ── */
  const totalAmount =
    booking.payment?.amount != null
      ? Number(booking.payment.amount)
      : booking.total_amount != null
      ? Number(booking.total_amount)
      : isPaid
      ? isFullDay
        ? ratePerHour * totalDays
        : ratePerHour * slotCount
      : 0;

  /* ── Status badges config ── */
  const statusCfg = {
    APPROVED: {
      label: "Approved",
      bg: "rgba(34, 197, 94, 0.12)",
      color: "#22c55e",
      border: "rgba(34, 197, 94, 0.3)",
      icon: MdCheckCircle,
      desc: "Booking has been confirmed and verified for use.",
    },
    PENDING: {
      label: "Needs Approval",
      bg: "rgba(245, 158, 11, 0.12)",
      color: "#f59e0b",
      border: "rgba(245, 158, 11, 0.3)",
      icon: MdAccessTime,
      desc: "Payment is confirmed. Waiting for society admin approval.",
    },
    PAYMENT_PENDING: {
      label: "Awaiting Payment",
      bg: "rgba(107, 70, 193, 0.14)",
      color: "#a05aff",
      border: "rgba(107, 70, 193, 0.35)",
      icon: MdPayment,
      desc: "Slot is temporarily held. Auto-cancels if not paid before timer expires.",
    },
    REJECTED: {
      label: "Rejected",
      bg: "rgba(239, 68, 68, 0.12)",
      color: "#ef4444",
      border: "rgba(239, 68, 68, 0.3)",
      icon: MdCancel,
      desc: "This booking request was declined by society admin.",
    },
    CANCELLED: {
      label: "Cancelled",
      bg: "rgba(148, 163, 184, 0.12)",
      color: "#94a3b8",
      border: "rgba(148, 163, 184, 0.25)",
      icon: MdCancel,
      desc: "This booking has been cancelled.",
    },
  };

  const currentStatus = statusCfg[booking.status] || statusCfg.CANCELLED;
  const StatusIcon = currentStatus.icon;

  const bookingId = booking.booking_ids?.[0] ?? booking.id;
  const isApproving = approvingId === bookingId;
  const isRejecting = rejectingId === bookingId;

  const bookedOn = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  return (
    <GlobalModal
      isOpen={Boolean(booking)}
      onClose={onClose}
      title="Booking Details"
      subtitle={`Booking #${bookingId} · ${amenity.name || "Amenity"}`}
      icon={MdEventAvailable}
      size="xl"
      className="amenity-booking-modal"
      bodyClassName="amenity-booking-modal-body"
      showFooter={false}
    >
      <div className="amenity-booking-detail flex flex-col gap-4 text-sm" style={{ color: "var(--text-primary)" }}>

        {/* ── Top Status Banner ── */}
        <div
          className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition-all"
          style={{
            background: currentStatus.bg,
            borderColor: currentStatus.border,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                background: currentStatus.color,
                color: "#ffffff",
              }}
            >
              <StatusIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base" style={{ color: currentStatus.color }}>
                  {currentStatus.label}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold"
                  style={{
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  #{bookingId}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {currentStatus.desc}
              </p>
            </div>
          </div>

          {booking.status === "PAYMENT_PENDING" && booking.payment_expires_in_seconds !== undefined && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold self-start sm:self-auto"
              style={{
                background: "rgba(160, 90, 255, 0.15)",
                color: "#a05aff",
                border: "1px solid rgba(160, 90, 255, 0.3)",
              }}
            >
              <MdTimer size={16} />
              <span>~{Math.ceil(booking.payment_expires_in_seconds / 60)} mins remaining to pay</span>
            </div>
          )}
        </div>

        {/* ── Grid: Who Booked & When Booked ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 1. Who Booked (Resident Profile) */}
          <div
            className="rounded-2xl p-4 border flex flex-col gap-3"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--glass-border)" }}>
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <MdPerson size={16} style={{ color: "var(--accent)" }} />
                <span>Who Booked (Resident)</span>
              </div>
              {user.resident_type && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    background: user.resident_type === "OWNER" ? "rgba(34, 197, 94, 0.12)" : "rgba(59, 130, 246, 0.12)",
                    color: user.resident_type === "OWNER" ? "#22c55e" : "#3b82f6",
                    border: `1px solid ${user.resident_type === "OWNER" ? "rgba(34, 197, 94, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
                  }}
                >
                  {user.resident_type}
                </span>
              )}
            </div>

            <div className="amenity-resident-identity flex items-center gap-3">
              <div className="amenity-resident-icon" aria-hidden="true">
                <MdPerson size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {user.name || "Resident Name Not Available"}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                  {user.role ? user.role.replace(/_/g, " ") : "Resident"}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {/* Phone */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <MdPhone size={14} /> Phone
                </span>
                {user.phone ? (
                  <div className="flex items-center gap-1.5 font-mono">
                    <a
                      href={`tel:${user.phone}`}
                      className="hover:underline font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {user.phone}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(user.phone, "phone")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                      title="Copy phone"
                    >
                      {copiedKey === "phone" ? <MdCheck size={12} className="text-green-500" /> : <MdOutlineContentCopy size={12} style={{ color: "var(--text-secondary)" }} />}
                    </button>
                  </div>
                ) : (
                  <span style={{ color: "var(--text-secondary)" }}>—</span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <MdEmail size={14} /> Email
                </span>
                {user.email ? (
                  <div className="flex items-center gap-1.5 truncate">
                    <a
                      href={`mailto:${user.email}`}
                      className="hover:underline truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {user.email}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(user.email, "email")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0"
                      title="Copy email"
                    >
                      {copiedKey === "email" ? <MdCheck size={12} className="text-green-500" /> : <MdOutlineContentCopy size={12} style={{ color: "var(--text-secondary)" }} />}
                    </button>
                  </div>
                ) : (
                  <span style={{ color: "var(--text-secondary)" }}>—</span>
                )}
              </div>

              {/* Flat / Property Info */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "var(--glass-border)" }}>
                <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  {isRowHouse ? <MdHome size={15} /> : <MdApartment size={15} />}
                  {isRowHouse ? "Row House" : "Flat / Unit"}
                </span>
                <span className="font-semibold text-right" style={{ color: "var(--text-primary)" }}>
                  {flat.flat_number ? (
                    <>
                      {isRowHouse ? `House ${unitNumber || flat.flat_number}` : `Flat ${unitNumber || flat.flat_number}`}
                      {blockName && <span className="font-normal opacity-75"> ({blockName})</span>}
                    </>
                  ) : (
                    "General Resident"
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Schedule & Timing (From When) */}
          <div
            className="rounded-2xl p-4 border flex flex-col gap-3"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--glass-border)" }}>
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <MdCalendarMonth size={16} style={{ color: "var(--accent)" }} />
                <span>Booking Schedule</span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{
                  background: isFullDay ? "rgba(160, 90, 255, 0.12)" : "rgba(59, 130, 246, 0.12)",
                  color: isFullDay ? "var(--accent)" : "#3b82f6",
                  border: `1px solid ${isFullDay ? "rgba(160, 90, 255, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
                }}
              >
                {isFullDay ? "Full Day" : "Slot Based"}
              </span>
            </div>

            {/* Date Range Block */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div>
                <span className="text-[11px] block" style={{ color: "var(--text-secondary)" }}>
                  {isDateRange ? "Reserved Dates" : "Booking Date"}
                </span>
                <span className="font-bold text-sm mt-0.5 block" style={{ color: "var(--text-primary)" }}>
                  {isDateRange ? (
                    `${formatFullDate(fromDate)} → ${formatFullDate(toDate)}`
                  ) : (
                    formatFullDate(fromDate)
                  )}
                </span>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                {totalDays} {totalDays > 1 ? "Days" : "Day"}
              </span>
            </div>

            {/* Time Slot Details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <MdAccessTime size={14} /> Time / Timing
                </span>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {isFullDay ? (
                    "Full Day Access (24 Hours)"
                  ) : booking.start_time ? (
                    `${formatTime12(booking.start_time)} – ${formatTime12(booking.end_time)}`
                  ) : (
                    "Regular Operating Hours"
                  )}
                </span>
              </div>

              {/* Slot list if multiple slots */}
              {slotList && (
                <div className="pt-2 border-t" style={{ borderColor: "var(--glass-border)" }}>
                  <span className="text-[11px] font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Selected Time Slots ({slotList.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {slotList.map((slot, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono border"
                        style={{
                          background: "var(--card-bg)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {slot.date ? `${slot.date.slice(5)} · ` : ""}
                        {formatTime12(slot.start_time)}–{formatTime12(slot.end_time)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Booked on Timestamp */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "var(--glass-border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Booked On:</span>
                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{bookedOn}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid: Amenity Specifications & Financial Breakdown ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 3. Amenity Specifications */}
          <div
            className="rounded-2xl p-4 border flex flex-col gap-3"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--glass-border)" }}>
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <span className="text-base leading-none">{amenityEmoji(amenity.name)}</span>
                <span>Amenity Overview</span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{
                  background: isPaid ? "rgba(160, 90, 255, 0.12)" : "rgba(34, 197, 94, 0.12)",
                  color: isPaid ? "var(--accent)" : "#22c55e",
                  border: `1px solid ${isPaid ? "rgba(160, 90, 255, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                }}
              >
                {isPaid ? "Paid Amenity" : "Free Access"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: "var(--text-secondary)" }}>Amenity Name</span>
                <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                  {amenity.name || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <MdGroups size={15} /> Capacity
                </span>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {amenity.capacity ? `Up to ${amenity.capacity} persons` : "Standard capacity"}
                </span>
              </div>

              {amenity.opening_time && amenity.closing_time && (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                    <MdAccessTime size={15} /> Facility Hours
                  </span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatTime12(amenity.opening_time)} – {formatTime12(amenity.closing_time)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <MdShield size={15} /> Approval Required
                </span>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {amenity.requires_approval ? "Yes (Admin Review Required)" : "Instant Confirmation"}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Financial & Payment Record */}
          <div
            className="rounded-2xl p-4 border flex flex-col gap-3"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--glass-border)" }}>
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <MdReceiptLong size={16} style={{ color: "var(--accent)" }} />
                <span>Financial & Payment</span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{
                  background:
                    booking.payment_status === "PAID"
                      ? "rgba(34, 197, 94, 0.12)"
                      : booking.payment_status === "PENDING"
                      ? "rgba(245, 158, 11, 0.12)"
                      : "rgba(148, 163, 184, 0.12)",
                  color:
                    booking.payment_status === "PAID"
                      ? "#22c55e"
                      : booking.payment_status === "PENDING"
                      ? "#f59e0b"
                      : "var(--text-secondary)",
                  border: `1px solid ${
                    booking.payment_status === "PAID"
                      ? "rgba(34, 197, 94, 0.3)"
                      : booking.payment_status === "PENDING"
                      ? "rgba(245, 158, 11, 0.3)"
                      : "rgba(148, 163, 184, 0.25)"
                  }`,
                }}
              >
                {booking.payment_status || (isPaid ? "PENDING" : "FREE")}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Rate & Units */}
              {isPaid && (
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--text-secondary)" }}>Rate per {isFullDay ? "Day" : "Hour/Slot"}</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(ratePerHour)}
                  </span>
                </div>
              )}

              {/* Total Amount Card */}
              <div
                className="p-3 rounded-xl border flex items-center justify-between gap-2"
                style={{
                  background: isPaid ? "rgba(160, 90, 255, 0.06)" : "var(--card-bg)",
                  borderColor: isPaid ? "rgba(160, 90, 255, 0.25)" : "var(--glass-border)",
                }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {isPaid ? "Total Booking Fee" : "Booking Fee"}
                </span>
                <span className="text-base font-bold" style={{ color: isPaid ? "var(--accent)" : "#22c55e" }}>
                  {isPaid ? formatCurrency(totalAmount) : "Free of Cost"}
                </span>
              </div>

              {/* Payment Reference ID */}
              {(booking.razorpay_payment_id || booking.payment?.id || booking.razorpay_order_id) && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "var(--glass-border)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Payment Ref</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span style={{ color: "var(--text-primary)" }}>
                      {booking.razorpay_payment_id || `PAY-${booking.payment?.id}` || booking.razorpay_order_id}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          booking.razorpay_payment_id || `PAY-${booking.payment?.id}` || booking.razorpay_order_id,
                          "payRef"
                        )
                      }
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                      title="Copy Payment ID"
                    >
                      {copiedKey === "payRef" ? <MdCheck size={12} className="text-green-500" /> : <MdOutlineContentCopy size={12} style={{ color: "var(--text-secondary)" }} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Mode */}
              {isPaid && (
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--text-secondary)" }}>Payment Mode</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {booking.payment?.payment_mode || (booking.razorpay_payment_id ? "Razorpay Online" : "UPI Demo")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Admin Action Buttons (Approve / Reject) ── */}
        <div
          className="pt-4 border-t flex flex-col sm:flex-row items-center justify-end gap-3"
          style={{ borderColor: "var(--glass-border)" }}
        >
          {canAct && booking.status === "PENDING" && (
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onApprove(booking)}
                disabled={isApproving || isRejecting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition shadow-sm hover:opacity-95"
                style={{
                  background: "var(--approve-bg)",
                  color: "var(--approve-color)",
                  border: "1.5px solid var(--approve-border)",
                }}
              >
                {isApproving ? <Spinner cls="h-3.5 w-3.5" /> : <MdCheckCircle size={16} />}
                <span>Approve Booking</span>
              </button>

              <button
                type="button"
                onClick={() => onReject(booking)}
                disabled={isApproving || isRejecting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition shadow-sm hover:opacity-95"
                style={{
                  background: "var(--reject-bg)",
                  color: "var(--reject-color)",
                  border: "1.5px solid var(--reject-border)",
                }}
              >
                {isRejecting ? <Spinner cls="h-3.5 w-3.5" /> : <MdCancel size={16} />}
                <span>Reject Booking</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs border cursor-pointer transition hover:bg-black/5 dark:hover:bg-white/5"
            style={{
              borderColor: "var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            Close
          </button>
        </div>

      </div>
    </GlobalModal>
  );
}
