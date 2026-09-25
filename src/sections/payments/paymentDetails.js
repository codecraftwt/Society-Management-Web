export const CURRENCY = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v) || 0);

export const amenityDescription = (booking, t) => {
  if (!booking) return null;
  const name = booking.Amenity?.name || null;
  const from = booking.from_date || booking.date;
  const range = booking.to_date && booking.to_date !== booking.from_date
    ? `${booking.from_date} – ${booking.to_date}`
    : (from || "");
  const base = t ? t("payAmenityBooking", { id: booking.id }) : `Amenity booking #${booking.id}`;
  return [name, range, base].filter(Boolean).join(" · ");
};

export const resolveResidentName = (row) => {
  return (
    row.resident?.name ||
    row.booking?.User?.name ||
    row.Bill?.Flat?.User?.name ||
    row.Bill?.Flat?.FlatMemberships?.[0]?.User?.name ||
    "—"
  );
};

export const resolveFlatNumber = (row) => {
  return (
    row.Bill?.Flat?.flat_number ||
    row.booking?.Flat?.flat_number ||
    row.booking?.User?.FlatMemberships?.[0]?.Flat?.flat_number ||
    row.resident?.FlatMemberships?.[0]?.Flat?.flat_number ||
    (row.booking?.flat_id ? `Flat #${row.booking.flat_id}` : "—")
  );
};