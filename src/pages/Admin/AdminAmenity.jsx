
import { useEffect, useState, useMemo, useContext } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import { getTitleError, getPositiveAmountError, getNumberError } from "../../utils/validators";
import { useCustomAlert } from "../../context/CustomAlertContext";
import {
  MdAdd, MdClose, MdOutlineInbox,
  MdCheckCircle, MdCancel, MdToggleOn, MdToggleOff,
  MdAccessTime, MdPeople, MdEventAvailable,
  MdGridView, MdCalendarMonth, MdWarning, MdBlock,
  MdPayment, MdEdit, MdFilterAlt, MdCheck, MdExpandMore,
} from "react-icons/md";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalButton from "../../components/common/GlobalButton";

function Spinner({ cls = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${cls}`} style={{ color: "var(--accent)" }} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function amenityEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("pool") || n.includes("swim")) return "🏊";
  if (n.includes("gym") || n.includes("fitness")) return "🏋️";
  if (n.includes("hall") || n.includes("banquet")) return "🎉";
  if (n.includes("ground") || n.includes("court")) return "⚽";
  if (n.includes("library") || n.includes("reading")) return "📚";
  if (n.includes("yoga") || n.includes("meditation")) return "🧘";
  if (n.includes("park") || n.includes("garden")) return "🌿";
  if (n.includes("club")) return "🎱";
  return "✨";
}

const PALETTES = [
  { iconBg: "rgba(160,90,255,0.15)", iconBorder: "rgba(160,90,255,0.28)", strip: "#a05aff", stripEnd: "#9e58ff", glow: "rgba(160,90,255,0.20)" },
  { iconBg: "rgba(75,203,235,0.15)", iconBorder: "rgba(75,203,235,0.28)", strip: "#4bcbeb", stripEnd: "#1bcfb4", glow: "rgba(75,203,235,0.20)" },
  { iconBg: "rgba(16,185,129,0.15)", iconBorder: "rgba(16,185,129,0.28)", strip: "#34d399", stripEnd: "#059669", glow: "rgba(16,185,129,0.20)" },
  { iconBg: "rgba(160,90,255,0.15)", iconBorder: "rgba(160,90,255,0.28)", strip: "#4BCBEB", stripEnd: "var(--accent)", glow: "rgba(160,90,255,0.20)" },
  { iconBg: "rgba(244,63,94,0.15)", iconBorder: "rgba(244,63,94,0.28)", strip: "#fb7185", stripEnd: "#be123c", glow: "rgba(244,63,94,0.20)" },
  { iconBg: "rgba(91,141,239,0.15)", iconBorder: "rgba(91,141,239,0.28)", strip: "#94B5F5", stripEnd: "#3E60A3", glow: "rgba(91,141,239,0.20)" },
];

const isPaidAmenity = (a) => (a?.type || "").toUpperCase() === "PAID";

function StatusBadge({ status, t }) {
  const cfg = {
    PAYMENT_PENDING: { label: "Awaiting Payment", bg: "rgba(107,70,193,0.12)", color: "#9F87D7", border: "rgba(107,70,193,0.3)" },
    PENDING: { label: t("amenBookingPending"), bg: "var(--stat-amber-bg)", color: "var(--stat-amber-color)", border: "var(--stat-amber-border)" },
    APPROVED: { label: t("amenBookingApproved"), bg: "var(--stat-green-bg)", color: "var(--stat-green-color)", border: "var(--stat-green-border)" },
    REJECTED: { label: t("amenBookingRejected"), bg: "var(--stat-red-bg)", color: "var(--stat-red-color)", border: "var(--stat-red-border)" },
    CANCELLED: { label: t("amenBookingCancelled"), bg: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "var(--glass-border)" },
  };
  const c = cfg[status] || cfg.CANCELLED;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap"
    }}>
      {c.label}
    </span>
  );
}

function FilterRow({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
        background: active ? "var(--accent-soft, rgba(99,102,241,0.16))" : hov ? "var(--card-inner-bg, rgba(255,255,255,0.06))" : "transparent",
        color: "var(--text-primary)", fontSize: 13, fontWeight: active ? 700 : 500,
      }}>
      <span>{label}</span>
      {active && <MdCheck size={15} style={{ color: "var(--accent)" }} />}
    </button>
  );
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

function DisableModal({ amenity, onClose, onConfirm, isMobile }) {
  const { t } = useLang();
  const [disableType, setDisableType] = useState("TEMPORARY");
  const [reason, setReason] = useState("");
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [untilDate, setUntilDate] = useState("");
  const [notifyResidents, setNotifyResidents] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isValid = reason.trim() && (disableType === "PERMANENT" || untilDate);

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    await onConfirm({ disableType, reason: reason.trim(), fromDate: disableType === "TEMPORARY" ? fromDate : null, untilDate: disableType === "TEMPORARY" ? untilDate : null, notifyResidents });
    setSubmitting(false);
  };

  const inputStyle = { width: "100%", borderRadius: 10, border: "1.5px solid var(--glass-border)", background: "var(--input-bg)", color: "var(--text-primary)", padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const Label = ({ children, sub }) => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>{children}</label>
      {sub && <span style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.65 }}>{sub}</span>}
    </div>
  );

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 440, background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>

        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(220,38,38,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⊘</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Disable — {amenity.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Residents won't be able to book this amenity</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "65vh", overflowY: "auto" }}>
          <div>
            <Label>Closure type</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { key: "TEMPORARY", icon: "🕐", label: "Temporary", sub: "Set a reopen date — auto-enables when reached", borderColor: "var(--accent)", bg: "rgba(160,90,255,0.08)" },
                { key: "PERMANENT", icon: "⛔", label: "Permanent", sub: "Closed until manually re-enabled by admin", borderColor: "#dc2626", bg: "rgba(220,38,38,0.07)" },
              ].map(({ key, icon, label, sub, borderColor, bg }) => (
                <div key={key} onClick={() => setDisableType(key)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: disableType === key ? `1.5px solid ${borderColor}` : "1.5px solid var(--glass-border)", background: disableType === key ? bg : "var(--card-inner-bg)", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {disableType === "TEMPORARY" && (
            <div>
              <Label>Closure period</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>From</div>
                  <input type="date" style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>Reopen on</div>
                  <input type="date" style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }} value={untilDate} min={fromDate} onChange={e => setUntilDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div>
            <Label sub="(shown to residents)">Reason</Label>
            <textarea rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} placeholder="e.g. Equipment maintenance, safety inspection…" value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Notify residents</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1 }}>Send a push notification about this closure</div>
            </div>
            {/* Toggle with smooth animation */}
            <div
              onClick={() => setNotifyResidents(p => !p)}
              style={{ width: 40, height: 22, borderRadius: 99, position: "relative", cursor: "pointer", background: notifyResidents ? "var(--accent, #6366f1)" : "var(--glass-border)", transition: "background 0.25s ease", flexShrink: 0, boxShadow: notifyResidents ? "0 0 0 3px var(--accent-soft)" : "none" }}
            >
              <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", left: notifyResidents ? 21 : 3, transition: "left 0.25s ease" }} />
            </div>
          </div>

          {disableType === "PERMANENT" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <MdWarning size={15} style={{ color: "#dc2626", marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#dc2626", lineHeight: 1.5 }}>This will permanently disable the amenity and cancel all pending payment reservations.</span>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={submitting} style={{ padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-primary)", flexShrink: 0 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={!isValid || submitting} style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: isValid && !submitting ? "pointer" : "not-allowed", border: disableType === "PERMANENT" ? "1.5px solid rgba(220,38,38,0.4)" : "1.5px solid rgba(160,90,255,0.4)", background: disableType === "PERMANENT" ? "rgba(220,38,38,0.1)" : "rgba(160,90,255,0.1)", color: disableType === "PERMANENT" ? "#dc2626" : "var(--accent)", opacity: isValid && !submitting ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {submitting ? <Spinner cls="h-3 w-3" /> : disableType === "PERMANENT" ? "⊘ Disable permanently" : "⊘ Disable temporarily"}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

function ReasonBanner({ amenity }) {
  if (!amenity.disabled_reason) return null;
  const isTemp = amenity.disable_type === "TEMPORARY";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "8px 10px", borderRadius: 8, marginBottom: 10, background: isTemp ? "rgba(160,90,255,0.1)" : "rgba(220,38,38,0.07)", border: `1px solid ${isTemp ? "rgba(160,90,255,0.28)" : "rgba(220,38,38,0.22)"}`, fontSize: 11, lineHeight: 1.45, color: isTemp ? "var(--accent)" : "#7f1d1d" }}>
      {isTemp ? <MdWarning size={13} style={{ flexShrink: 0, marginTop: 1 }} /> : <MdBlock size={13} style={{ flexShrink: 0, marginTop: 1 }} />}
      <span>
        <strong>{isTemp ? "Maintenance: " : "Permanently closed: "}</strong>
        {amenity.disabled_reason}
        {isTemp && amenity.disabled_until && ` Reopens on ${amenity.disabled_until}.`}
      </span>
    </div>
  );
}

export default function AdminAmenity() {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const { showUnauthorized, showWarning, showError } = useCustomAlert();
  const canEdit  = !isCommitteeMember(user);

  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [groupedBookings, setGroupedBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [activeTab, setActiveTab] = useState("AMENITIES");
  const [searchAmenity, setSearchAmenity] = useState("");
  const [isAmenSearchOpen, setIsAmenSearchOpen] = useState(false);
  const [amenityStatusFilter, setAmenityStatusFilter] = useState("ALL");
  const [amenityPricingFilter, setAmenityPricingFilter] = useState("ALL");
  const [searchBooking, setSearchBooking] = useState("");
  const [isBookingSearchOpen, setIsBookingSearchOpen] = useState(false);
  const [bookingFilter, setBookingFilter] = useState("ALL");
  const [amenFilterOpen, setAmenFilterOpen] = useState(false);
  const [amenFilterPos, setAmenFilterPos] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [disableModalAmenity, setDisableModalAmenity] = useState(null);

  const [form, setForm] = useState({
    name: "", type: "FREE", booking_type: "SLOT",
    rate_per_hour: 0, opening_time: "", closing_time: "",
    capacity: 1, requires_approval: false,
  });

  useEffect(() => { loadAmenities(); loadBookings(); }, []);

  const loadAmenities = async () => {
    const r = await API.get("/amenities");
    const data = Array.isArray(r.data)
      ? r.data
      : Array.isArray(r.data?.data)
      ? r.data.data
      : Array.isArray(r.data?.amenities)
      ? r.data.amenities
      : [];
    setAmenities(data);
  };

  const loadBookings = async () => {
    try {
      const r = await API.get("/admin/amenities/bookings");
      const data = Array.isArray(r.data)
        ? r.data
        : Array.isArray(r.data?.data)
        ? r.data.data
        : Array.isArray(r.data?.bookings)
        ? r.data.bookings
        : [];
      setBookings(data);
      setGroupedBookings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAddForm = () => {
    if (!showForm && !hasPermission(user, "amenities", "create")) {
      showUnauthorized("You do not have permission to add amenities.");
      return;
    }
    setEditingAmenity(null);
    setForm({ name: "", type: "FREE", booking_type: "SLOT", rate_per_hour: 0, opening_time: "", closing_time: "", capacity: 1, requires_approval: false });
    setShowForm(p => !p);
  };

  const handleToggleAmenFilter = (e) => {
    if (amenFilterOpen) { setAmenFilterOpen(false); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setAmenFilterPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 276)) });
    setAmenFilterOpen(true);
  };

  const activeFilterCount = (amenityStatusFilter !== "ALL" ? 1 : 0) + (amenityPricingFilter !== "ALL" ? 1 : 0);

  const handleOpenEditForm = (amenity) => {
    if (!hasPermission(user, "amenities", "edit")) {
      showUnauthorized("You do not have permission to edit amenities.");
      return;
    }
    setEditingAmenity(amenity);
    setForm({
      name: amenity.name || "",
      type: (amenity.type || "FREE").toUpperCase(),
      booking_type: amenity.booking_type || "SLOT",
      rate_per_hour: Number(amenity.rate_per_hour) || 0,
      opening_time: amenity.opening_time ? String(amenity.opening_time).slice(0, 5) : "",
      closing_time: amenity.closing_time ? String(amenity.closing_time).slice(0, 5) : "",
      capacity: Number(amenity.capacity) || 1,
      requires_approval: !!amenity.requires_approval,
    });
    setShowForm(true);
  };

  const submitAmenity = async () => {
    const canWrite = editingAmenity ? "edit" : "create";
    if (!hasPermission(user, "amenities", canWrite)) {
      showUnauthorized(`You do not have permission to ${canWrite} amenities.`);
      return;
    }
    setSubmitting(true);
    try {
      const nameErr = getTitleError(form.name, "Amenity name");
      if (nameErr) { showWarning(nameErr); setSubmitting(false); return; }
      const capErr = getNumberError(form.capacity, "Capacity", { min: 1, allowZero: false });
      if (capErr) { showWarning(capErr); setSubmitting(false); return; }
      if (form.type === "PAID") {
        const rateErr = getPositiveAmountError(form.rate_per_hour, "Rate per hour");
        if (rateErr) { showWarning(rateErr); setSubmitting(false); return; }
      }
      if (form.booking_type === "SLOT" && (!form.opening_time || !form.closing_time)) { showWarning(t("amenErrTime")); setSubmitting(false); return; }
      const payload = {
        name: form.name.trim(),
        type: form.type,
        booking_type: form.booking_type,
        rate_per_hour: form.type === "PAID" ? Number(form.rate_per_hour) : 0,
        opening_time: form.opening_time || null,
        closing_time: form.closing_time || null,
        capacity: Number(form.capacity),
        requires_approval: form.requires_approval,
      };
      if (editingAmenity) {
        await API.put(`/admin/amenities/${editingAmenity.id}`, payload);
      } else {
        await API.post("/admin/amenities", payload);
      }
      loadAmenities();
      setShowForm(false);
      setEditingAmenity(null);
      setForm({ name: "", type: "FREE", booking_type: "SLOT", rate_per_hour: 0, opening_time: "", closing_time: "", capacity: 1, requires_approval: false });
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || (editingAmenity ? "Failed to update amenity" : "Failed to create amenity"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReEnable = async (id) => {
    if (!hasPermission(user, "amenities", "edit")) {
      showUnauthorized("You do not have permission to toggle amenities.");
      return;
    }
    setTogglingId(id);
    try { await API.patch(`/admin/amenities/${id}/toggle`); await loadAmenities(); }
    catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to toggle amenity status");
      }
    }
    finally { setTogglingId(null); }
  };

  const approveBooking = async (b) => {
    if (!hasPermission(user, "amenities", "manage_bookings")) {
      showUnauthorized("You do not have permission to manage bookings.");
      return;
    }
    const id = b.booking_ids?.[0] ?? b.id;
    setApprovingId(id);
    try {
      await API.put(`/admin/amenities/bookings/${id}/approve`,
        b.booking_ids?.length ? { booking_ids: b.booking_ids } : undefined
      );
      await loadBookings();
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to approve booking");
      }
    }
    finally { setApprovingId(null); }
  };

  const rejectBooking = async (b) => {
    if (!hasPermission(user, "amenities", "manage_bookings")) {
      showUnauthorized("You do not have permission to manage bookings.");
      return;
    }
    const id = b.booking_ids?.[0] ?? b.id;
    setRejectingId(id);
    try {
      await API.put(`/admin/amenities/bookings/${id}/reject`,
        b.booking_ids?.length ? { booking_ids: b.booking_ids } : undefined
      );
      await loadBookings();
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to reject booking");
      }
    }
    finally { setRejectingId(null); }
  };

  const handleOpenDisableModal = (amenity) => {
    if (!hasPermission(user, "amenities", "delete")) {
      showUnauthorized("You do not have permission to disable amenities.");
      return;
    }
    setDisableModalAmenity(amenity);
  };

  const handleDisableConfirm = async (payload) => {
    if (!hasPermission(user, "amenities", "delete")) {
      showUnauthorized("You do not have permission to disable amenities.");
      setDisableModalAmenity(null);
      return;
    }
    try {
      await API.patch(`/admin/amenities/${disableModalAmenity.id}/disable`, payload);
      await loadAmenities();
      await loadBookings(); // refresh — PAYMENT_PENDING rows may now be CANCELLED
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Could not disable amenity. Please try again.");
      }
    } finally {
      setDisableModalAmenity(null);
    }
  };

  const filteredAmenities = useMemo(() =>
    amenities.filter(a =>
      a.name.toLowerCase().includes(searchAmenity.toLowerCase()) &&
      (amenityStatusFilter === "ALL" || (amenityStatusFilter === "ACTIVE" ? !!a.is_active : !a.is_active)) &&
      (amenityPricingFilter === "ALL" || (isPaidAmenity(a) ? "PAID" : "FREE") === amenityPricingFilter)
    ),
    [amenities, searchAmenity, amenityStatusFilter, amenityPricingFilter]
  );

  const filteredBookings = useMemo(() =>
    [...groupedBookings]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter(b => {
        const q = searchBooking.toLowerCase();
        const range = b.to_date && b.to_date !== b.from_date ? `${b.from_date} – ${b.to_date}` : b.from_date || b.date;
        const ms = !q || b.Amenity?.name?.toLowerCase().includes(q) || b.User?.name?.toLowerCase().includes(q) || (b.from_date || b.date || "")?.includes(q) || (b.to_date || "")?.includes(q) || range?.includes(q);
        const mf = bookingFilter === "ALL" || b.status === bookingFilter;
        return ms && mf;
      }),
    [groupedBookings, searchBooking, bookingFilter]
  );

  const bStats = {
    total: groupedBookings.length,
    paymentPending: groupedBookings.filter(b => b.status === "PAYMENT_PENDING").length,
    pending: groupedBookings.filter(b => b.status === "PENDING").length,
    approved: groupedBookings.filter(b => b.status === "APPROVED").length,
    rejected: groupedBookings.filter(b => b.status === "REJECTED").length,
  };

  const inputStyle = { height: 42, borderRadius: 12, width: "100%", border: "1.5px solid var(--glass-border)", background: "var(--input-bg)", color: "var(--text-primary)", padding: "0 14px", fontSize: 13, outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" };
  const Label = ({ children }) => (
    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 7 }}>{children}</label>
  );

  const TABS = [
    { key: "AMENITIES", label: t("amenTabAmenities"), Icon: MdGridView, count: amenities.length, alert: 0 },
    { key: "BOOKINGS", label: t("amenTabBookings"), Icon: MdCalendarMonth, count: bStats.total, alert: bStats.pending },
  ];

  const STATUS_FILTER_OPTIONS = [
    { value: "ALL", label: t("amenFilterStatusAll") },
    { value: "ACTIVE", label: t("amenFilterStatusActive") },
    { value: "DISABLED", label: t("amenFilterStatusDisabled") },
  ];

  const PRICING_FILTER_OPTIONS = [
    { value: "ALL", label: t("amenFilterPricingAll") },
    { value: "FREE", label: t("amenFreeAccess") },
    { value: "PAID", label: t("amenPaid") },
  ];

  const BFILTERS = [
    { k: "ALL", label: "All", ac: "#5A3BA2" },
    { k: "PAYMENT_PENDING", label: "Awaiting Payment", ac: "#5A3BA2" },
    { k: "PENDING", label: "Needs Approval", ac: "var(--accent)" },
    { k: "APPROVED", label: "Approved", ac: "#16a34a" },
    { k: "REJECTED", label: "Rejected", ac: "#dc2626" },
    { k: "CANCELLED", label: "Cancelled", ac: "#726988" },
  ];

  const getCardStrip = (a, pal) => {
    if (!a.is_active) {
      if (a.disable_type === "TEMPORARY") return "var(--accent)";
      if (a.disable_type === "PERMANENT") return "#991b1b";
      return "var(--glass-border)";
    }
    return `linear-gradient(90deg,${pal.strip},${pal.stripEnd})`;
  };

  const getStatusLabel = (a) => {
    if (!a.is_active) {
      if (a.disable_type === "TEMPORARY") return { label: "Temp. off", color: "var(--accent)", dotColor: "#4BCBEB" };
      if (a.disable_type === "PERMANENT") return { label: "Disabled", color: "#dc2626", dotColor: "#dc2626" };
      return { label: t("amenOff"), color: "var(--text-secondary)", dotColor: "var(--text-secondary)" };
    }
    return { label: t("amenLive"), color: "#22c55e", dotColor: "#22c55e" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }} className="animate-fadeIn">

      {disableModalAmenity && (
        <DisableModal amenity={disableModalAmenity} isMobile={isMobile}
          onClose={() => setDisableModalAmenity(null)} onConfirm={handleDisableConfirm} />
      )}

      {/* HEADER */}
      <div className="ad-page-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-accent shrink-0"
            style={{
              background: "var(--accent-soft, rgba(99,102,241,0.18))",
              border: "1px solid var(--accent-light, #818cf8)",
            }}
          >
            <MdGridView size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              {t("amenTitle")}
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--accent-soft, rgba(99,102,241,0.18))",
                  color: "var(--accent, #818cf8)",
                }}
              >
                {activeTab === "AMENITIES" ? amenities.length : bStats.total}
              </span>
            </h1>
            <p className="text-xs text-secondary hidden sm:block" style={{ marginTop: 2 }}>{t("amenSubtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1" style={{ scrollbarWidth: "none" }}>
          {activeTab === "AMENITIES" ? (
            <>
              <ExpandableSearch
                value={searchAmenity}
                onChange={(val) => setSearchAmenity(val)}
                placeholder={t("amenSearchPlaceholder")}
                isOpen={isAmenSearchOpen}
                onOpenChange={setIsAmenSearchOpen}
              />
              <button onClick={handleToggleAmenFilter} aria-label="Amenity filters"
                style={{
                  height: 38, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "0 14px", borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
                  fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)",
                  border: activeFilterCount ? "1.5px solid var(--accent-light, #818cf8)" : "1.5px solid var(--glass-border)",
                  background: activeFilterCount ? "var(--accent-soft, rgba(99,102,241,0.18))" : "var(--card-inner-bg, rgba(255,255,255,0.06))",
                  transition: "all 0.15s",
                }}>
                <MdFilterAlt size={15} style={{ color: "var(--accent)" }} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span style={{ minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeFilterCount}</span>
                )}
                <MdExpandMore size={14} style={{ opacity: 0.65 }} />
              </button>
              {canEdit && (
                <GlobalButton
                  variant="add"
                  icon={showForm ? MdClose : MdAdd}
                  borderDraw
                  onClick={handleToggleAddForm}
                  className="shrink-0"
                  style={{ fontWeight: 700, height: 38, whiteSpace: "nowrap" }}
                >
                  {showForm ? t("cancel") : t("amenNewBtn")}
                </GlobalButton>
              )}
            </>
          ) : (
            <ExpandableSearch
              value={searchBooking}
              onChange={(val) => setSearchBooking(val)}
              placeholder={t("amenBookingSearch")}
              isOpen={isBookingSearchOpen}
              onOpenChange={setIsBookingSearchOpen}
            />
          )}
        </div>
      </div>

      {amenFilterOpen && amenFilterPos && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setAmenFilterOpen(false)} />
          <div className="animate-scaleIn" style={{ position: "fixed", zIndex: 9999, top: amenFilterPos.top, left: amenFilterPos.left, width: 268, background: "var(--card-bg)", borderRadius: 16, border: "1.5px solid var(--glass-border)", boxShadow: "0 20px 52px rgba(0,0,0,0.35)", padding: "10px", transformOrigin: "top left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 0" }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Filters</span>
              {activeFilterCount > 0 && (
                <button onClick={() => { setAmenityStatusFilter("ALL"); setAmenityPricingFilter("ALL"); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10.5, fontWeight: 700, color: "var(--accent)", padding: 0 }}>
                  Clear all
                </button>
              )}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", margin: "12px 10px 4px" }}>Status</div>
            {STATUS_FILTER_OPTIONS.map(o => (
              <FilterRow key={o.value} active={amenityStatusFilter === o.value} onClick={() => setAmenityStatusFilter(o.value)} label={o.label} />
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", margin: "12px 10px 4px" }}>Pricing</div>
            {PRICING_FILTER_OPTIONS.map(o => (
              <FilterRow key={o.value} active={amenityPricingFilter === o.value} onClick={() => setAmenityPricingFilter(o.value)} label={o.label} />
            ))}
          </div>
        </>,
        document.body
      )}

      <SlidingTabs
        value={activeTab}
        onChange={setActiveTab}
        items={TABS.map(({ key, label, Icon, count, alert }) => ({
          id: key,
          label,
          icon: <Icon size={15} />,
          alert,
          badge: alert > 0 ? undefined : count,
        }))}
      />

      {/* ════════════ AMENITIES ════════════ */}
      {activeTab === "AMENITIES" && (
        <>

          {filteredAmenities.length === 0 ? (
            <div style={{ background: "var(--card-inner-bg)", border: "1.5px dashed var(--glass-border)", borderRadius: 18, padding: "50px 20px", textAlign: "center" }}>
              <MdOutlineInbox size={38} style={{ color: "var(--text-secondary)", opacity: 0.25, margin: "0 auto 10px" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("amenEmpty")}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))", gap: isMobile ? 12 : 16 }}>
              {filteredAmenities.map((a, i) => {
                const pal = PALETTES[i % PALETTES.length];
                const active = a.is_active;
                const status = getStatusLabel(a);
                const stripBg = getCardStrip(a, pal);
                return (
                  <div key={a.id} className="animate-fadeIn" style={{ background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", borderRadius: 20, overflow: "hidden", opacity: active ? 1 : 0.65, transition: "transform 0.2s, box-shadow 0.2s", animationDelay: `${i * 50}ms`, boxShadow: "var(--shadow-sm)" }}
                    onMouseEnter={e => { if (!isMobile) { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${pal.glow}`; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
                    <div style={{ height: 4, background: stripBg }} />
                    <div style={{ padding: isMobile ? "14px 16px" : "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: pal.iconBg, border: `1.5px solid ${pal.iconBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>{amenityEmoji(a.name)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                            <span style={{ marginTop: 4, display: "inline-block", background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600 }}>
                              {a.booking_type === "SLOT" ? t("amenSlotBased") : t("amenFullDay")}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, flexShrink: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: status.dotColor, boxShadow: active ? "0 0 0 3px rgba(34,197,94,0.22)" : "none" }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: status.color }}>{status.label}</span>
                        </div>
                      </div>
                      {!active && <ReasonBanner amenity={a} />}
                      {!active && a.disable_type === "TEMPORARY" && a.disabled_until && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-secondary)", marginBottom: 10 }}>
                          <MdAccessTime size={11} /> Closed until {a.disabled_until}
                        </div>
                      )}
                      <div style={{ background: "var(--chip-bg)", border: "1px solid var(--chip-border)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                        <span style={{ background: isPaidAmenity(a) ? "var(--badge-paid-bg)" : "var(--badge-free-bg)", color: isPaidAmenity(a) ? "var(--badge-paid-color)" : "var(--badge-free-color)", border: `1px solid ${isPaidAmenity(a) ? "var(--badge-paid-border)" : "var(--badge-free-border)"}`, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                          {isPaidAmenity(a) ? `₹${a.rate_per_hour}/hr` : t("amenFreeAccess")}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                          <MdPeople size={13} style={{ color: pal.strip }} /> {a.capacity} {t("amenCapLabel")}
                        </span>
                        {a.opening_time && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                            <MdAccessTime size={13} style={{ color: pal.strip }} /> {a.opening_time}–{a.closing_time}
                          </span>
                        )}
                      </div>
                      {a.requires_approval && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "var(--approval-color)", background: "var(--approval-bg)", border: "1px solid var(--approval-border)", borderRadius: 8, padding: "5px 10px", marginBottom: 12 }}>
                          <MdEventAvailable size={13} /> {t("amenRequiresApproval")}
                        </div>
                      )}
                      {canEdit && (
                        <div style={{ display: "flex", gap: 8 }}>
                          {active ? (
                            <button onClick={() => handleOpenDisableModal(a)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--reject-bg)", color: "var(--reject-color)", border: "1.5px solid var(--reject-border)" }}>
                              <MdToggleOff size={17} /> {t("amenDisableBtn")}
                            </button>
                          ) : (
                            <button onClick={() => handleReEnable(a.id)} disabled={togglingId === a.id} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: togglingId === a.id ? "not-allowed" : "pointer", background: pal.iconBg, color: pal.strip, border: `1.5px solid ${pal.iconBorder}` }}>
                              {togglingId === a.id ? <Spinner /> : <><MdToggleOn size={17} /> {t("amenReenableBtn")}</>}
                            </button>
                          )}
                          <button onClick={() => handleOpenEditForm(a)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: "11px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--card-inner-bg)", color: "var(--text-primary)", border: "1.5px solid var(--glass-border)" }}>
                            <MdEdit size={16} /> {t("amenEditBtn")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════════════ BOOKINGS ════════════ */}
      {activeTab === "BOOKINGS" && (
        <>
          {/* Filter pills */}
          <div style={{ overflowX: "auto", paddingBottom: 2 }}>
            <div style={{ display: "inline-flex", padding: 5, gap: 4, background: "var(--card-inner-bg)", border: "1.5px solid var(--glass-border)", borderRadius: 14, minWidth: isMobile ? "100%" : "auto" }}>
              {BFILTERS.map(({ k, label, ac }) => {
                const on = bookingFilter === k;
                return (
                  <button key={k} onClick={() => setBookingFilter(k)} style={{ flex: isMobile ? 1 : "unset", padding: isMobile ? "8px 6px" : "6px 14px", borderRadius: 10, fontSize: isMobile ? 11 : 12, fontWeight: on ? 700 : 500, border: "none", cursor: "pointer", transition: "all 0.18s", background: on ? ac : "transparent", color: on ? "#fff" : "var(--text-secondary)", boxShadow: on ? `0 3px 10px ${ac}55` : "none", whiteSpace: "nowrap" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bookings list */}
          <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ padding: isMobile ? "14px 16px" : "16px 22px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{t("amenBookingRequests")}</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{filteredBookings.length} of {groupedBookings.length}</span>
            </div>

            {filteredBookings.length === 0 ? (
              <div style={{ padding: "50px 20px", textAlign: "center" }}>
                <MdOutlineInbox size={38} style={{ color: "var(--text-secondary)", opacity: 0.2, margin: "0 auto 10px" }} />
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("amenBookingEmpty")}</p>
              </div>
            ) : filteredBookings.map((b, i) => {
              const today = new Date(new Date().toDateString());
              const bDate = new Date(b.to_date || b.from_date || b.date);
              const isPast = bDate instanceof Date && !isNaN(bDate) && bDate < today;
              const af = amenities.find(a => a.id === b.amenity_id || a.id === b.Amenity?.id);
              const needsApp = af?.requires_approval ?? b.Amenity?.requires_approval ?? false;
              const canAct = canEdit && b.status === "PENDING" && !isPast && needsApp;
              const isPaymentPending = b.status === "PAYMENT_PENDING";
              const dotColor = {
                PAYMENT_PENDING: "#6B46C1",
                APPROVED: "#22c55e", PENDING: "#3B82F6",
                REJECTED: "#ef4444", CANCELLED: "var(--text-secondary)",
              }[b.status] || "var(--text-secondary)";

              return (
                <div key={b.id} className="animate-fadeIn" style={{
                  padding: isMobile ? "14px 16px" : "15px 22px",
                  borderBottom: i < filteredBookings.length - 1 ? "1px solid var(--glass-border)" : "none",
                  display: "flex", flexDirection: isMobile && canAct ? "column" : "row",
                  alignItems: isMobile && canAct ? "flex-start" : "center",
                  justifyContent: "space-between", gap: isMobile ? 10 : 12,
                  transition: "background 0.15s", animationDelay: `${i * 25}ms`,
                  background: isPaymentPending ? "rgba(107,70,193,0.03)" : "transparent",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = isPaymentPending ? "rgba(107,70,193,0.06)" : "var(--row-hover)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isPaymentPending ? "rgba(107,70,193,0.03)" : "transparent"; }}>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 11, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: dotColor, boxShadow: `0 0 0 3px ${dotColor}22` }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {b.Amenity?.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{b.User?.name}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
                        {(b.from_date || b.date) && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdEventAvailable size={12} /> {b.to_date && b.to_date !== b.from_date ? `${b.from_date} – ${b.to_date}` : (b.from_date || b.date)}</span>}
                        {b.start_time && b.start_time !== "00:00:00" && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdAccessTime size={12} /> {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</span>}
                        {isPaymentPending && b.payment_expires_in_seconds !== undefined && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: b.payment_expires_in_seconds < 120 ? "#ef4444" : "#9F87D7" }}>
                            <MdPayment size={12} /> ~{Math.ceil(b.payment_expires_in_seconds / 60)}m left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, width: isMobile && canAct ? "100%" : "auto" }}>
                    {canAct ? (
                      <>
                        <button onClick={() => approveBooking(b)} disabled={approvingId === (b.booking_ids?.[0] ?? b.id) || rejectingId === (b.booking_ids?.[0] ?? b.id)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", flex: 1, borderRadius: 10, border: "1.5px solid var(--approve-border)", background: "var(--approve-bg)", color: "var(--approve-color)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {approvingId === (b.booking_ids?.[0] ?? b.id) ? <Spinner cls="h-3 w-3" /> : <><MdCheckCircle size={14} /> {t("amenApprove")}</>}
                        </button>
                        <button onClick={() => rejectBooking(b)} disabled={approvingId === (b.booking_ids?.[0] ?? b.id) || rejectingId === (b.booking_ids?.[0] ?? b.id)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", flex: 1, borderRadius: 10, border: "1.5px solid var(--reject-border)", background: "var(--reject-bg)", color: "var(--reject-color)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {rejectingId === (b.booking_ids?.[0] ?? b.id) ? <Spinner cls="h-3 w-3" /> : <><MdCancel size={14} /> {t("amenReject")}</>}
                        </button>
                      </>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                        <StatusBadge status={b.status} t={t} />
                        {isPast && b.status === "PENDING" && needsApp && (
                          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t("amenDatePassed")}</span>
                        )}
                        {isPaymentPending && (
                          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontStyle: "italic" }}>Auto-cancels if unpaid</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════ FORM MODAL PORTAL ════════════ */}
      {canEdit && showForm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingAmenity(null); } }}
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-scaleIn"
            style={{
              width: "100%", maxWidth: 640,
              background: "var(--card-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: 20,
              maxHeight: "90vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-soft, rgba(99,102,241,0.18))", border: "1px solid var(--accent-light, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {editingAmenity ? "✏️" : "✨"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{editingAmenity ? t("amenFormEditTitle") : t("amenFormTitle")}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{t("amenFormSub")}</div>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingAmenity(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-inner-bg)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", transition: "all 0.15s", flexShrink: 0 }}
              >
                <MdClose size={16} />
              </button>
            </div>

            <div style={{ height: 1, background: "var(--glass-border)", margin: "16px 0 0", flexShrink: 0 }} />

            {/* Modal Body */}
            <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                <div><Label>{t("amenFieldName")}</Label><input style={inputStyle} placeholder={t("amenFieldNamePlaceholder")} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>{t("amenFieldBookingType")}</Label><Select style={inputStyle} value={form.booking_type} onChange={e => setForm({ ...form, booking_type: e.target.value })}><option value="SLOT">{t("amenSlotBased")}</option><option value="FULL_DAY">{t("amenFullDay")}</option></Select></div>
                <div><Label>{t("amenFieldPricing")}</Label><Select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="FREE">{t("amenFreeAccess")}</option><option value="PAID">{t("amenPaid")}</option></Select></div>
                {form.type === "PAID" && <div><Label>{t("amenFieldRate")}</Label><input type="number" style={inputStyle} placeholder="0" value={form.rate_per_hour} onChange={e => setForm({ ...form, rate_per_hour: e.target.value })} /></div>}
                <div><Label>{t("amenFieldCapacity")}</Label><input type="number" style={inputStyle} placeholder="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
                {form.booking_type === "SLOT" && <>
                  <div><Label>{t("amenFieldOpenTime")}</Label><input type="time" style={inputStyle} value={form.opening_time} onChange={e => setForm({ ...form, opening_time: e.target.value })} /></div>
                  <div><Label>{t("amenFieldCloseTime")}</Label><input type="time" style={inputStyle} value={form.closing_time} onChange={e => setForm({ ...form, closing_time: e.target.value })} /></div>
                </>}
                {/* Requires Approval toggle */}
                <div
                  onClick={() => setForm({ ...form, requires_approval: !form.requires_approval })}
                  style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "0 14px", borderRadius: 12, cursor: "pointer", background: "var(--card-inner-bg)", border: "1.5px solid var(--glass-border)", gridColumn: isMobile ? "1" : "span 2" }}
                >
                  {/* toggle track */}
                  <div style={{ width: 40, height: 22, borderRadius: 99, position: "relative", flexShrink: 0, background: form.requires_approval ? "var(--accent, #6366f1)" : "var(--glass-border)", transition: "background 0.25s ease", boxShadow: form.requires_approval ? "0 0 0 3px var(--accent-soft)" : "none" }}>
                    <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", left: form.requires_approval ? 21 : 3, transition: "left 0.25s ease" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t("amenRequiresApproval")}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>{t("amenRequiresApprovalSub")}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--glass-border)", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => { setShowForm(false); setEditingAmenity(null); }} className="btn-muted" style={{ borderRadius: 12, padding: "10px 18px", fontSize: 13 }}>{t("cancel")}</button>
                <button onClick={submitAmenity} disabled={submitting} className="btn-primary" style={{ borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                  {submitting ? <Spinner cls="h-3 w-3" /> : <MdAdd size={16} />} {editingAmenity ? t("save") : t("amenCreateBtn")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}