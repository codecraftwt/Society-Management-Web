import { useState } from "react";
import { createPortal } from "react-dom";
import { MdAdd, MdClose, MdOutlineInbox, MdCheckCircle, MdCancel, MdToggleOn, MdToggleOff, MdAccessTime, MdPeople, MdEventAvailable, MdGridView, MdCalendarMonth, MdWarning, MdBlock, MdPayment, MdEdit, MdFilterAlt, MdCheck, MdExpandMore } from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import { Spinner, amenityEmoji, PALETTES, isPaidAmenity } from "../amenityHelpers.jsx";
import SlidingTabs from "../../../components/common/SlidingTabs";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import GlobalButton from "../../../components/common/GlobalButton";

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

function ReasonBanner({ amenity }) {
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

function getCardStrip(a, pal) {
  if (!a.is_active) {
    if (a.disable_type === "TEMPORARY") return "var(--accent)";
    if (a.disable_type === "PERMANENT") return "#991b1b";
    return "var(--glass-border)";
  }
  return `linear-gradient(90deg,${pal.strip},${pal.stripEnd})`;
}

function StatusLabel({ a, t }) {
  if (!a.is_active) {
    if (a.disable_type === "TEMPORARY") return { label: "Temp. off", color: "var(--accent)", dotColor: "#4BCBEB" };
    if (a.disable_type === "PERMANENT") return { label: "Disabled", color: "#dc2626", dotColor: "#dc2626" };
    return { label: t("amenOff"), color: "var(--text-secondary)", dotColor: "var(--text-secondary)" };
  }
  return { label: t("amenLive"), color: "#22c55e", dotColor: "#22c55e" };
}

export default function Index({
  activeTab,
  onTabChange,
  amenities,
  bStats,
  canEdit,
  isMobile,
  searchAmenity,
  onSearchAmenity,
  isAmenSearchOpen,
  onAmenSearchOpen,
  searchBooking,
  onSearchBooking,
  isBookingSearchOpen,
  onBookingSearchOpen,
  bookingFilter,
  onBookingFilter,
  amenFilterOpen,
  amenFilterPos,
  onToggleAmenFilter,
  onCloseAmenFilter,
  activeFilterCount,
  amenityStatusFilter,
  onAmenityStatusFilter,
  amenityPricingFilter,
  onAmenityPricingFilter,
  onClearAmenFilters,
  showForm,
  onToggleAddForm,
  filteredAmenities,
  filteredBookings,
  groupedBookings,
  togglingId,
  approvingId,
  rejectingId,
  onDisable,
  onReEnable,
  onApprove,
  onReject,
  onEdit,
}) {
  const { t } = useLang();

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

  return (
    <>
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
                onChange={onSearchAmenity}
                placeholder={t("amenSearchPlaceholder")}
                isOpen={isAmenSearchOpen}
                onOpenChange={onAmenSearchOpen}
              />
              <button onClick={onToggleAmenFilter} aria-label="Amenity filters"
                style={{
                  height: 38, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "0 14px", borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
                  fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)",
                  border: activeFilterCount ? "1.5px solid var(--accent-light, #818cf8)" : "1.5px solid var(--glass-border)",
                  background: activeFilterCount ? "var(--accent-soft, rgba(99,102,241,0.18))" : "var(--card-inner-bg, rgba(255,255,255,0.06))",
                  transition: "all 0.15s",
                }}>
                <MdFilterAlt size={15} style={{ color: "var(--accent)" }} />
                <span>{t("filters")}</span>
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
                  onClick={onToggleAddForm}
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
              onChange={onSearchBooking}
              placeholder={t("amenBookingSearch")}
              isOpen={isBookingSearchOpen}
              onOpenChange={onBookingSearchOpen}
            />
          )}
        </div>
      </div>

      {amenFilterOpen && amenFilterPos && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={onCloseAmenFilter} />
          <div className="animate-scaleIn" style={{ position: "fixed", zIndex: 9999, top: amenFilterPos.top, left: amenFilterPos.left, width: 268, background: "var(--card-bg)", borderRadius: 16, border: "1.5px solid var(--glass-border)", boxShadow: "0 20px 52px rgba(0,0,0,0.35)", padding: "10px", transformOrigin: "top left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 0" }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>{t("filters")}</span>
              {activeFilterCount > 0 && (
                <button onClick={onClearAmenFilters}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10.5, fontWeight: 700, color: "var(--accent)", padding: 0 }}>
                  Clear all
                </button>
              )}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", margin: "12px 10px 4px" }}>Status</div>
            {STATUS_FILTER_OPTIONS.map(o => (
              <FilterRow key={o.value} active={amenityStatusFilter === o.value} onClick={() => onAmenityStatusFilter(o.value)} label={o.label} />
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", margin: "12px 10px 4px" }}>Pricing</div>
            {PRICING_FILTER_OPTIONS.map(o => (
              <FilterRow key={o.value} active={amenityPricingFilter === o.value} onClick={() => onAmenityPricingFilter(o.value)} label={o.label} />
            ))}
          </div>
        </>,
        document.body
      )}

      <SlidingTabs
        value={activeTab}
        onChange={onTabChange}
        items={TABS.map((tab) => ({
          id: tab.key,
          label: tab.label,
          icon: <tab.Icon size={15} />,
          alert: tab.alert,
          badge: tab.alert > 0 ? undefined : tab.count,
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
                const status = StatusLabel({ a, t });
                const stripBg = getCardStrip(a, pal);
                const requApproval = a.requires_approval;
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
                      {!active && a.disabled_reason && <ReasonBanner amenity={a} />}
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
                      {requApproval && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "var(--approval-color)", background: "var(--approval-bg)", border: "1px solid var(--approval-border)", borderRadius: 8, padding: "5px 10px", marginBottom: 12 }}>
                          <MdEventAvailable size={13} /> {t("amenRequiresApproval")}
                        </div>
                      )}
                      {canEdit && (
                        <div style={{ display: "flex", gap: 8 }}>
                          {active ? (
                            <button onClick={() => onDisable(a)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--reject-bg)", color: "var(--reject-color)", border: "1.5px solid var(--reject-border)" }}>
                              <MdToggleOff size={17} /> {t("amenDisableBtn")}
                            </button>
                          ) : (
                            <button onClick={() => onReEnable(a.id)} disabled={togglingId === a.id} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: togglingId === a.id ? "not-allowed" : "pointer", background: pal.iconBg, color: pal.strip, border: `1.5px solid ${pal.iconBorder}` }}>
                              {togglingId === a.id ? <Spinner /> : <><MdToggleOn size={17} /> {t("amenReenableBtn")}</>}
                            </button>
                          )}
                          <button onClick={() => onEdit(a)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: "11px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--card-inner-bg)", color: "var(--text-primary)", border: "1.5px solid var(--glass-border)" }}>
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
                  <button key={k} onClick={() => onBookingFilter(k)} style={{ flex: isMobile ? 1 : "unset", padding: isMobile ? "8px 6px" : "6px 14px", borderRadius: 10, fontSize: isMobile ? 11 : 12, fontWeight: on ? 700 : 500, border: "none", cursor: "pointer", transition: "all 0.18s", background: on ? ac : "transparent", color: on ? "#fff" : "var(--text-secondary)", boxShadow: on ? `0 3px 10px ${ac}55` : "none", whiteSpace: "nowrap" }}>
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
                        <button onClick={() => onApprove(b)} disabled={approvingId === (b.booking_ids?.[0] ?? b.id) || rejectingId === (b.booking_ids?.[0] ?? b.id)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", flex: 1, borderRadius: 10, border: "1.5px solid var(--approve-border)", background: "var(--approve-bg)", color: "var(--approve-color)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {approvingId === (b.booking_ids?.[0] ?? b.id) ? <Spinner cls="h-3 w-3" /> : <><MdCheckCircle size={14} /> {t("amenApprove")}</>}
                        </button>
                        <button onClick={() => onReject(b)} disabled={approvingId === (b.booking_ids?.[0] ?? b.id) || rejectingId === (b.booking_ids?.[0] ?? b.id)}
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
    </>
  );
}
