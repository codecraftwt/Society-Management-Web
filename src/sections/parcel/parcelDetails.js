/**
 * Parcel display helpers.
 *
 * Kept free of React so the formatting rules (status meta, unit labels, party
 * resolution) stay in one place and can be reasoned about on their own.
 *
 * IMPORTANT: these helpers only ever read data that was actually recorded.
 * A missing arrival/delivery guard is reported as "not recorded" and is never
 * substituted with the legacy guard_id or with whoever happens to be on shift.
 */

export const PARCEL_STATUSES = ["EXPECTED", "AT_GATE", "COLLECTED", "CANCELLED"];

const STATUS_META = {
  EXPECTED:  { label: "Expected",  variant: "info",    icon: "local-shipping", accent: "#60a5fa" },
  AT_GATE:   { label: "At Gate",   variant: "warning", icon: "storefront",     accent: "#f59e0b" },
  COLLECTED: { label: "Collected", variant: "success", icon: "check-circle",   accent: "#10b981" },
  CANCELLED: { label: "Cancelled", variant: "danger",  icon: "cancel",         accent: "#ef4444" },
};

export const getStatusMeta = (status) =>
  STATUS_META[String(status || "").toUpperCase()] || {
    label: status || "Unknown",
    variant: "neutral",
    icon: "inventory-2",
    accent: "#94a3b8",
  };

export const emptyCounts = () => ({
  ALL: 0,
  EXPECTED: 0,
  AT_GATE: 0,
  COLLECTED: 0,
  CANCELLED: 0,
});

export const getUnitDetails = (parcel) => {
  const flat = parcel?.Flat;
  if (!flat) return { block: "", floor: "", flatNumber: "—", fullLabel: "—" };

  const rawBlock = flat?.Floor?.Block?.name || flat?.Block?.name || "";
  const block = rawBlock ? (rawBlock.toLowerCase().startsWith("block") || rawBlock.toLowerCase().startsWith("wing") ? rawBlock : `Wing ${rawBlock}`) : "";
  const floor = flat?.Floor?.floor_number != null && flat?.Floor?.floor_number !== "" ? `Floor ${flat.Floor.floor_number}` : "";
  const flatNumber = flat?.flat_number ? `Flat ${flat.flat_number}` : "";

  const parts = [block, floor, flatNumber].filter(Boolean);
  const fullLabel = parts.length > 0 ? parts.join(" • ") : (flat?.flat_number || "—");

  return {
    block,
    floor,
    flatNumber: flat?.flat_number ? `Flat ${flat.flat_number}` : "—",
    fullLabel,
  };
};

/** Formatted Wing • Floor • Flat label. */
export const getUnitLabel = (parcel) => {
  return getUnitDetails(parcel).fullLabel;
};

/** Name/contact of a joined user, or null when the reference is absent. */
export const resolveParty = (user) => {
  const name = user?.name;
  if (!name) return null;
  return {
    id: user.id,
    name,
    phone: user.phone || null,
    email: user.email || null,
  };
};

/**
 * Party behind a parcel, resolved with an honest fallback chain:
 *   resident  → the flat's primary resident
 *   requester → whoever actually raised the entry (new column)
 */
export const resolveResident = (parcel) =>
  resolveParty(parcel?.resident) || resolveParty(parcel?.Flat?.User) || null;

export const resolveRequester = (parcel) => resolveParty(parcel?.requester) || null;

/** Guard who received the parcel at the gate. Null when never recorded. */
export const resolveArrivalGuard = (parcel) => resolveParty(parcel?.arrivalGuard) || null;

/** Guard who handed the parcel over. Null when never recorded. */
export const resolveDeliveryGuard = (parcel) => resolveParty(parcel?.deliveryGuard) || null;

/** Legacy single-guard column, exposed for records created before the split. */
export const resolveLegacyGuard = (parcel) => resolveParty(parcel?.legacyGuard) || null;

export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

/** Timestamp used for the card subtitle: when the entry was logged. */
export const getLoggedAt = (parcel) =>
  parcel?.createdAt || parcel?.created_at || parcel?.entry_time || null;

/**
 * Client-side search across the fields a card or the modal can show.
 * The API already filters on courier name; this widens that to the unit and
 * the people involved, which is what the admin list is actually scanned for.
 */
export const matchesQuery = (parcel, query) => {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    parcel?.courier_name,
    parcel?.status,
    parcel?.pickup_code,
    getUnitLabel(parcel),
    resolveResident(parcel)?.name,
    resolveRequester(parcel)?.name,
    resolveArrivalGuard(parcel)?.name,
    resolveDeliveryGuard(parcel)?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
};
