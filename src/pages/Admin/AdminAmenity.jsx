
import { useEffect, useState, useMemo } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdClose, MdSearch, MdOutlineInbox,
  MdCheckCircle, MdCancel, MdToggleOn, MdToggleOff,
  MdAccessTime, MdPeople, MdEventAvailable,
  MdGridView, MdCalendarMonth, MdWarning, MdBlock,
  MdPayment,
} from "react-icons/md";
import Select from "../../components/common/Select";

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
  { iconBg: "rgba(107,70,193,0.15)", iconBorder: "rgba(107,70,193,0.28)", strip: "#9F87D7", stripEnd: "#493083", glow: "rgba(107,70,193,0.20)" },
  { iconBg: "rgba(91,141,239,0.15)", iconBorder: "rgba(91,141,239,0.28)", strip: "#94B5F5", stripEnd: "#3E60A3", glow: "rgba(91,141,239,0.20)" },
  { iconBg: "rgba(16,185,129,0.15)", iconBorder: "rgba(16,185,129,0.28)", strip: "#34d399", stripEnd: "#059669", glow: "rgba(16,185,129,0.20)" },
  { iconBg: "rgba(245,158,11,0.15)", iconBorder: "rgba(245,158,11,0.28)", strip: "#fbbf24", stripEnd: "#d97706", glow: "rgba(245,158,11,0.20)" },
  { iconBg: "rgba(244,63,94,0.15)", iconBorder: "rgba(244,63,94,0.28)", strip: "#fb7185", stripEnd: "#be123c", glow: "rgba(244,63,94,0.20)" },
  { iconBg: "rgba(91,141,239,0.15)", iconBorder: "rgba(91,141,239,0.28)", strip: "#94B5F5", stripEnd: "#3E60A3", glow: "rgba(91,141,239,0.20)" },
];

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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
                { key: "TEMPORARY", icon: "🕐", label: "Temporary", sub: "Set a reopen date — auto-enables when reached", borderColor: "#d97706", bg: "rgba(245,158,11,0.08)" },
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
            <div onClick={() => setNotifyResidents(p => !p)} style={{ width: 38, height: 22, borderRadius: 99, position: "relative", cursor: "pointer", background: notifyResidents ? "linear-gradient(90deg,#4C76C9,#5A3BA2)" : "var(--glass-border)", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", left: notifyResidents ? 19 : 3, transition: "left 0.2s" }} />
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
          <button onClick={handleConfirm} disabled={!isValid || submitting} style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: isValid && !submitting ? "pointer" : "not-allowed", border: disableType === "PERMANENT" ? "1.5px solid rgba(220,38,38,0.4)" : "1.5px solid rgba(245,158,11,0.4)", background: disableType === "PERMANENT" ? "rgba(220,38,38,0.1)" : "rgba(245,158,11,0.1)", color: disableType === "PERMANENT" ? "#dc2626" : "#d97706", opacity: isValid && !submitting ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {submitting ? <Spinner cls="h-3 w-3" /> : disableType === "PERMANENT" ? "⊘ Disable permanently" : "⊘ Disable temporarily"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasonBanner({ amenity }) {
  if (!amenity.disabled_reason) return null;
  const isTemp = amenity.disable_type === "TEMPORARY";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "8px 10px", borderRadius: 8, marginBottom: 10, background: isTemp ? "rgba(245,158,11,0.1)" : "rgba(220,38,38,0.07)", border: `1px solid ${isTemp ? "rgba(245,158,11,0.28)" : "rgba(220,38,38,0.22)"}`, fontSize: 11, lineHeight: 1.45, color: isTemp ? "#92400e" : "#7f1d1d" }}>
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

  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [groupedBookings, setGroupedBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("AMENITIES");
  const [searchAmenity, setSearchAmenity] = useState("");
  const [searchBooking, setSearchBooking] = useState("");
  const [bookingFilter, setBookingFilter] = useState("ALL");
  const [togglingId, setTogglingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [disableModalAmenity, setDisableModalAmenity] = useState(null);

  const [form, setForm] = useState({
    name: "", type: "FREE", booking_type: "SLOT",
    rate_per_hour: 0, opening_time: "", closing_time: "",
    capacity: 1, requires_approval: false,
  });

  useEffect(() => { loadAmenities(); loadBookings(); }, []);

  const loadAmenities = async () => {
    const r = await API.get("/amenities");
    setAmenities(r.data.data || []);
  };

  const loadBookings = async () => {
    try {
      const r = await API.get("/admin/amenities/bookings");
      const data = r.data.data || [];
      // The API already returns grouped records (multi-day full-day + merged
      // multi-slot ranges), so we trust it directly like the resident view does.
      setBookings(data);
      setGroupedBookings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const createAmenity = async () => {
    try {
      if (!form.name.trim()) { alert(t("amenErrName")); return; }
      if (!form.capacity || form.capacity <= 0) { alert(t("amenErrCapacity")); return; }
      if (form.type === "PAID" && (!form.rate_per_hour || form.rate_per_hour <= 0)) { alert(t("amenErrRate")); return; }
      if (form.booking_type === "SLOT" && (!form.opening_time || !form.closing_time)) { alert(t("amenErrTime")); return; }
      await API.post("/admin/amenities", form);
      loadAmenities();
      setShowForm(false);
      setForm({ name: "", type: "FREE", booking_type: "SLOT", rate_per_hour: 0, opening_time: "", closing_time: "", capacity: 1, requires_approval: false });
    } catch (e) { console.error(e); }
  };

  const handleReEnable = async (id) => {
    setTogglingId(id);
    try { await API.patch(`/admin/amenities/${id}/toggle`); await loadAmenities(); }
    catch (e) { console.error(e); }
    finally { setTogglingId(null); }
  };

  const approveBooking = async (b) => {
    const id = b.booking_ids?.[0] ?? b.id;
    setApprovingId(id);
    try {
      await API.put(`/admin/amenities/bookings/${id}/approve`,
        b.booking_ids?.length ? { booking_ids: b.booking_ids } : undefined
      );
      await loadBookings();
    }
    finally { setApprovingId(null); }
  };

  const rejectBooking = async (b) => {
    const id = b.booking_ids?.[0] ?? b.id;
    setRejectingId(id);
    try {
      await API.put(`/admin/amenities/bookings/${id}/reject`,
        b.booking_ids?.length ? { booking_ids: b.booking_ids } : undefined
      );
      await loadBookings();
    }
    finally { setRejectingId(null); }
  };

  const handleDisableConfirm = async (payload) => {
    try {
      await API.patch(`/admin/amenities/${disableModalAmenity.id}/disable`, payload);
      await loadAmenities();
      await loadBookings(); // refresh — PAYMENT_PENDING rows may now be CANCELLED
    } catch (e) {
      console.error(e);
      alert("Could not disable amenity. Please try again.");
    } finally {
      setDisableModalAmenity(null);
    }
  };

  const filteredAmenities = useMemo(() =>
    amenities.filter(a => a.name.toLowerCase().includes(searchAmenity.toLowerCase())),
    [amenities, searchAmenity]
  );

  const filteredBookings = useMemo(() =>
    [...groupedBookings]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter(b => {
        const q = searchBooking.toLowerCase();
        const ms = !q || b.Amenity?.name?.toLowerCase().includes(q) || b.User?.name?.toLowerCase().includes(q) || b.date?.includes(q);
        const mf = bookingFilter === "ALL" || b.status === bookingFilter;
        return ms && mf;
      }),
    [groupedBookings, searchBooking, bookingFilter]
  );

  const aStats = {
    total: amenities.length,
    active: amenities.filter(a => a.is_active).length,
    paid: amenities.filter(a => a.type === "PAID").length,
  };
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
    { key: "AMENITIES", label: t("amenTabAmenities"), Icon: MdGridView, count: aStats.total, alert: 0 },
    { key: "BOOKINGS", label: t("amenTabBookings"), Icon: MdCalendarMonth, count: bStats.total, alert: bStats.pending },
  ];

  const BFILTERS = [
    { k: "ALL", label: "All", ac: "#5A3BA2" },
    { k: "PAYMENT_PENDING", label: "Awaiting Payment", ac: "#5A3BA2" },
    { k: "PENDING", label: "Needs Approval", ac: "#d97706" },
    { k: "APPROVED", label: "Approved", ac: "#16a34a" },
    { k: "REJECTED", label: "Rejected", ac: "#dc2626" },
    { k: "CANCELLED", label: "Cancelled", ac: "#726988" },
  ];

  const getCardStrip = (a, pal) => {
    if (!a.is_active) {
      if (a.disable_type === "TEMPORARY") return "#d97706";
      if (a.disable_type === "PERMANENT") return "#991b1b";
      return "var(--glass-border)";
    }
    return `linear-gradient(90deg,${pal.strip},${pal.stripEnd})`;
  };

  const getStatusLabel = (a) => {
    if (!a.is_active) {
      if (a.disable_type === "TEMPORARY") return { label: "Temp. off", color: "#d97706", dotColor: "#f59e0b" };
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em", margin: 0 }}>{t("amenTitle")}</h2>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>{t("amenSubtitle")}</p>
        </div>
        {activeTab === "AMENITIES" && (
          <button onClick={() => setShowForm(p => !p)} className="btn-primary"
            style={{ borderRadius: 12, padding: "9px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {showForm ? <><MdClose size={15} /> {t("cancel")}</> : <><MdAdd size={15} /> {t("amenNewBtn")}</>}
          </button>
        )}
      </div>

      {/* TAB SWITCHER */}
      <div style={{ display: "flex", background: "var(--card-inner-bg)", border: "1.5px solid var(--glass-border)", borderRadius: 16, padding: 5, gap: 4, boxShadow: "var(--shadow-sm)", width: isMobile ? "100%" : "fit-content" }}>
        {TABS.map(({ key, label, Icon, count, alert }) => {
          const on = activeTab === key;
          return (
            <button key={key} onClick={() => setActiveTab(key)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: isMobile ? "10px 0" : "9px 18px", flex: isMobile ? 1 : "unset", borderRadius: 12, fontSize: 13, fontWeight: on ? 700 : 500, border: "none", cursor: "pointer", transition: "all 0.2s", background: on ? "linear-gradient(135deg,#4C76C9 0%,#5A3BA2 100%)" : "transparent", color: on ? "#fff" : "var(--text-secondary)", boxShadow: on ? "0 4px 16px rgba(76,118,201,0.30)" : "none" }}>
              <Icon size={15} style={{ opacity: on ? 1 : 0.55 }} />
              {label}
              {alert > 0 ? (
                <span style={{ background: on ? "rgba(255,255,255,0.25)" : "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 999, lineHeight: "1.7" }}>{alert}</span>
              ) : (
                <span style={{ background: on ? "rgba(255,255,255,0.18)" : "var(--card-inner-border,rgba(0,0,0,0.08))", color: on ? "#fff" : "var(--text-secondary)", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 999, lineHeight: "1.7" }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════ AMENITIES ════════════ */}
      {activeTab === "AMENITIES" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: isMobile ? 8 : 14 }}>
            {[
              { label: t("amenStatTotal"), val: aStats.total, icon: "🏛️", bg: "var(--stat-purple-bg)", border: "var(--stat-purple-border)", color: "var(--stat-purple-color)", iconBg: "rgba(107,70,193,0.15)" },
              { label: t("amenStatActive"), val: aStats.active, icon: "✅", bg: "var(--stat-green-bg)", border: "var(--stat-green-border)", color: "var(--stat-green-color)", iconBg: "rgba(34,197,94,0.15)" },
              { label: t("amenStatPaid"), val: aStats.paid, icon: "💳", bg: "var(--stat-amber-bg)", border: "var(--stat-amber-border)", color: "var(--stat-amber-color)", iconBg: "rgba(245,158,11,0.15)" },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: isMobile ? 14 : 18, padding: isMobile ? "14px 12px" : "18px 20px" }}>
                <div style={{ fontSize: isMobile ? 22 : 20, marginBottom: isMobile ? 4 : 0 }}>{s.icon}</div>
                <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 800, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 600, color: s.color, opacity: 0.7, marginTop: isMobile ? 4 : 5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {showForm && (
            <div className="animate-scaleIn" style={{ background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", borderRadius: 20, padding: isMobile ? "18px 16px" : "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(107,70,193,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>✨</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{t("amenFormTitle")}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{t("amenFormSub")}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div><Label>{t("amenFieldName")}</Label><input style={inputStyle} placeholder={t("amenFieldNamePlaceholder")} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>{t("amenFieldBookingType")}</Label><Select style={inputStyle} value={form.booking_type} onChange={e => setForm({ ...form, booking_type: e.target.value })}><option value="SLOT">{t("amenSlotBased")}</option><option value="FULL_DAY">{t("amenFullDay")}</option></Select></div>
                <div><Label>{t("amenFieldPricing")}</Label><Select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="FREE">{t("amenFreeAccess")}</option><option value="PAID">{t("amenPaid")}</option></Select></div>
                {form.type === "PAID" && <div><Label>{t("amenFieldRate")}</Label><input type="number" style={inputStyle} placeholder="0" value={form.rate_per_hour} onChange={e => setForm({ ...form, rate_per_hour: e.target.value })} /></div>}
                <div><Label>{t("amenFieldCapacity")}</Label><input type="number" style={inputStyle} placeholder="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
                {form.booking_type === "SLOT" && <>
                  <div><Label>{t("amenFieldOpenTime")}</Label><input type="time" style={inputStyle} value={form.opening_time} onChange={e => setForm({ ...form, opening_time: e.target.value })} /></div>
                  <div><Label>{t("amenFieldCloseTime")}</Label><input type="time" style={inputStyle} value={form.closing_time} onChange={e => setForm({ ...form, closing_time: e.target.value })} /></div>
                </>}
                <div onClick={() => setForm({ ...form, requires_approval: !form.requires_approval })} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "0 14px", borderRadius: 12, cursor: "pointer", background: "var(--card-inner-bg)", border: "1.5px solid var(--glass-border)" }}>
                  <div style={{ width: 38, height: 22, borderRadius: 99, position: "relative", flexShrink: 0, background: form.requires_approval ? "linear-gradient(90deg,#4C76C9,#5A3BA2)" : "var(--card-inner-border,#C3BFCC)", transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", left: form.requires_approval ? 19 : 3, transition: "left 0.2s" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t("amenRequiresApproval")}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>{t("amenRequiresApprovalSub")}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--glass-border)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={createAmenity} className="btn-primary" style={{ borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, flex: isMobile ? 1 : "unset" }}>
                  <MdAdd size={16} /> {t("amenCreateBtn")}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-muted" style={{ borderRadius: 12, padding: "10px 18px", fontSize: 13, flex: isMobile ? 1 : "unset" }}>{t("cancel")}</button>
              </div>
            </div>
          )}

          <div style={{ position: "relative", width: "100%" }}>
            <MdSearch size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            <input style={{ ...inputStyle, paddingLeft: 38, paddingRight: searchAmenity ? 34 : 14 }} placeholder={t("amenSearchPlaceholder")} value={searchAmenity} onChange={e => setSearchAmenity(e.target.value)} />
            {searchAmenity && <button onClick={() => setSearchAmenity("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><MdClose size={14} /></button>}
          </div>

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
                        <span style={{ background: a.type === "PAID" ? "var(--badge-paid-bg)" : "var(--badge-free-bg)", color: a.type === "PAID" ? "var(--badge-paid-color)" : "var(--badge-free-color)", border: `1px solid ${a.type === "PAID" ? "var(--badge-paid-border)" : "var(--badge-free-border)"}`, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                          {a.type === "PAID" ? `₹${a.rate_per_hour}/hr` : t("amenFreeAccess")}
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
                      {active ? (
                        <button onClick={() => setDisableModalAmenity(a)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--reject-bg)", color: "var(--reject-color)", border: "1.5px solid var(--reject-border)" }}>
                          <MdToggleOff size={17} /> Disable amenity
                        </button>
                      ) : (
                        <button onClick={() => handleReEnable(a.id)} disabled={togglingId === a.id} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: togglingId === a.id ? "not-allowed" : "pointer", background: pal.iconBg, color: pal.strip, border: `1.5px solid ${pal.iconBorder}` }}>
                          {togglingId === a.id ? <Spinner /> : <><MdToggleOn size={17} /> Re-enable amenity</>}
                        </button>
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
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: isMobile ? 8 : 12 }}>
            {[
              { label: "Total", val: bStats.total, icon: "📋", bg: "var(--stat-purple-bg)", border: "var(--stat-purple-border)", color: "var(--stat-purple-color)" },
              { label: "Awaiting Payment", val: bStats.paymentPending, icon: "💳", bg: "rgba(107,70,193,0.1)", border: "rgba(107,70,193,0.25)", color: "#9F87D7" },
              { label: "Needs Approval", val: bStats.pending, icon: "⏳", bg: "var(--stat-amber-bg)", border: "var(--stat-amber-border)", color: "var(--stat-amber-color)" },
              { label: "Approved", val: bStats.approved, icon: "✅", bg: "var(--stat-green-bg)", border: "var(--stat-green-border)", color: "var(--stat-green-color)" },
              { label: "Rejected", val: bStats.rejected, icon: "❌", bg: "var(--stat-red-bg)", border: "var(--stat-red-border)", color: "var(--stat-red-color)" },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: isMobile ? "12px" : "16px 18px" }}>
                <div style={{ fontSize: isMobile ? 17 : 20, marginBottom: 5 }}>{s.icon}</div>
                <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.65, marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", width: "100%" }}>
            <MdSearch size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            <input style={{ ...inputStyle, paddingLeft: 38, paddingRight: searchBooking ? 34 : 14 }} placeholder={t("amenBookingSearch")} value={searchBooking} onChange={e => setSearchBooking(e.target.value)} />
            {searchBooking && <button onClick={() => setSearchBooking("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><MdClose size={13} /></button>}
          </div>

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
              const canAct = b.status === "PENDING" && !isPast && needsApp;
              const isPaymentPending = b.status === "PAYMENT_PENDING";
              const dotColor = {
                PAYMENT_PENDING: "#6B46C1",
                APPROVED: "#22c55e", PENDING: "#f59e0b",
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
                        {b.date && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdEventAvailable size={12} /> {b.date}</span>}
                        {b.start_time && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdAccessTime size={12} /> {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</span>}
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
    </div>
  );
}