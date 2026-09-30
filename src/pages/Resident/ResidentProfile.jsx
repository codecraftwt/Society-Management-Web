import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdDashboard,
  MdSend,
  MdOutlineCampaign,
  MdCleaningServices,
  MdOutlineQrCodeScanner,
  MdQrCodeScanner,
  MdAccountBalanceWallet,
  MdReceiptLong,
  MdOutlineReceiptLong,
  MdOutlineInventory2,
  MdApartment,
  MdCheckCircle,
  MdChevronRight,
  MdArrowForward,
  MdPerson,
  MdLocalTaxi,
  MdLocalShipping,
  MdAccessTime,
  MdRefresh,
  MdAdd,
  MdLocationCity,
  MdHome,
  MdLock,
  MdSwapHoriz,
  MdVerified,
  MdShield,
} from "react-icons/md";
import { toast } from "react-toastify";
import SOSModal from "../../components/emergency/SOSModal";
import Modal from "../../components/Modal";
import UserAvatar from "../../components/common/UserAvatar";
import { getTitleError, getMobileError, getVehicleNumberError } from "../../utils/validators";

function SkeletonBlock({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div
      className="rd-skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

// A flat handed over to a tenant is not a usable context for the owner.
// /users/get-flat already flags this via `tenant` (active TENANT membership)
// and `occupancy_status`.
const isFlatRented = (flat) =>
  Boolean(flat?.tenant) || String(flat?.occupancy_status || "").toUpperCase() === "RENTED";

const flatPillLabel = (flat) => {
  const number = flat?.flat_number || "—";
  const block = String(flat?.block_name || "").trim();
  if (!block) return number;
  // flat_number usually already carries the block prefix (e.g. "A-301" in block A)
  return number.toUpperCase().startsWith(block.toUpperCase()) ? number : `${block}-${number}`;
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-1 sm:p-2">
      <div className="p-7 rounded-3xl bg-card border border-glass space-y-4">
        <div className="flex items-center gap-4">
          <SkeletonBlock width={64} height={64} radius={20} />
          <div className="space-y-2 flex-1">
            <SkeletonBlock width="40%" height={24} />
            <SkeletonBlock width="25%" height={14} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-44 rounded-3xl bg-card border border-glass" />
        ))}
      </div>
    </div>
  );
}

export default function ResidentProfile() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = pathname.startsWith("/family") ? "/family" : "/resident";

  // Data States
  const [profile, setProfile] = useState(null);
  const [flats, setFlats] = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState(null);
  const [pendingBills, setPendingBills] = useState([]);
  const [latestNotices, setLatestNotices] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [household, setHousehold] = useState([]);
  const [pendingParcels, setPendingParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [preApprovalModal, setPreApprovalModal] = useState({
    isOpen: false,
    purpose: "GUEST", // GUEST | CAB | DELIVERY
    visitorName: "",
    visitorPhone: "",
    vehicleNumber: "",
    expectedDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    notes: "",
    submitting: false,
  });

  // Load all dashboard data
  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        profileRes,
        flatsRes,
        billsRes,
        noticesRes,
        visitorsRes,
        householdRes,
        parcelsRes,
      ] = await Promise.allSettled([
        API.get("/users/me"),
        API.get("/users/get-flat"),
        API.get("/bills/resident?status=PENDING&limit=5"),
        API.get("/notices?limit=5"),
        API.get("/visitors/resident?limit=6"),
        API.get("/household"),
        API.get("/parcels?status=RECEIVED&limit=5"),
      ]);

      if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);

      if (flatsRes.status === "fulfilled") {
        const userFlats = Array.isArray(flatsRes.value.data) ? flatsRes.value.data : [];
        setFlats(userFlats);
        // Keep the active context on a flat the owner actually occupies —
        // never auto-select (or stay stuck on) a flat rented out to a tenant.
        setSelectedFlatId((prev) => {
          const open = userFlats.filter((f) => !isFlatRented(f));
          const isStillOpen = open.some(
            (f) => String(f.flat_id || f.id) === String(prev)
          );
          if (isStillOpen) return prev;
          const fallback = open[0] || userFlats[0];
          return fallback ? fallback.flat_id || fallback.id : null;
        });
      }

      if (billsRes.status === "fulfilled") {
        const rawBills = billsRes.value.data?.bills || billsRes.value.data?.data || billsRes.value.data || [];
        setPendingBills(Array.isArray(rawBills) ? rawBills : []);
      }

      if (noticesRes.status === "fulfilled") {
        const rawNotices = noticesRes.value.data?.notices || noticesRes.value.data?.data || noticesRes.value.data || [];
        setLatestNotices(Array.isArray(rawNotices) ? rawNotices : []);
      }

      if (visitorsRes.status === "fulfilled") {
        const rawVisitors = visitorsRes.value.data?.visitors || visitorsRes.value.data?.data || visitorsRes.value.data || [];
        setVisitors(Array.isArray(rawVisitors) ? rawVisitors : []);
      }

      if (householdRes.status === "fulfilled") {
        const rawHousehold = Array.isArray(householdRes.value.data)
          ? householdRes.value.data
          : householdRes.value.data?.data || [];
        setHousehold(rawHousehold);
      }

      if (parcelsRes.status === "fulfilled") {
        const rawParcels = parcelsRes.value.data?.parcels || parcelsRes.value.data?.data || parcelsRes.value.data || [];
        setPendingParcels(Array.isArray(rawParcels) ? rawParcels : []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Time-based greeting helper
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("rpGreetingMorning");
    if (hour < 17) return t("rpGreetingAfternoon");
    return t("rpGreetingEvening");
  }, [t]);

  // Avatar initials for the hero identity tile (fallback when no photo is set)
  const initials = useMemo(() => {
    const parts = String(profile?.name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.length ? parts.map((p) => p[0]).join("").toUpperCase() : "R";
  }, [profile?.name]);

  // Current active flat object (rented flats are not selectable)
  const currentFlat = useMemo(() => {
    const open = flats.filter((f) => !isFlatRented(f));
    const pool = open.length ? open : flats;
    if (!pool.length) return null;
    return pool.find((f) => String(f.flat_id || f.id) === String(selectedFlatId)) || pool[0];
  }, [flats, selectedFlatId]);

  // Daily help list derived from household members
  const dailyHelpList = useMemo(() => {
    return household.filter((m) => {
      const type = (m.member_type || m.role || "").toUpperCase();
      return (
        type.includes("MAID") ||
        type.includes("COOK") ||
        type.includes("DRIVER") ||
        type.includes("HELP") ||
        type.includes("CLEANER") ||
        type.includes("NANNY") ||
        type.includes("GARDENER") ||
        type.includes("STAFF")
      );
    });
  }, [household]);

  // Total pending bill calculation
  const totalPendingAmount = useMemo(() => {
    return pendingBills.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  }, [pendingBills]);

  // Handle Quick Pre-Approval Submit
  const handleCreatePreApproval = async (e) => {
    e?.preventDefault();
    const nameErr = getTitleError(preApprovalModal.visitorName, t("rpVisitorNameField"));
    if (nameErr) { toast.error(nameErr); return; }

    if (preApprovalModal.visitorPhone.trim()) {
      const phoneErr = getMobileError(preApprovalModal.visitorPhone, t("rpPhone"));
      if (phoneErr) { toast.error(phoneErr); return; }
    }

    if (preApprovalModal.vehicleNumber.trim()) {
      const vehicleErr = getVehicleNumberError(preApprovalModal.vehicleNumber);
      if (vehicleErr) { toast.error(vehicleErr); return; }
    }

    setPreApprovalModal((p) => ({ ...p, submitting: true }));
    try {
      await API.post("/preapproval", {
        flat_id: currentFlat?.flat_id || currentFlat?.id,
        visitor_name: preApprovalModal.visitorName.trim(),
        visitor_phone: preApprovalModal.visitorPhone.trim() || undefined,
        vehicle_number: preApprovalModal.vehicleNumber.trim().toUpperCase() || undefined,
        purpose: preApprovalModal.purpose,
        expected_date: preApprovalModal.expectedDate,
        notes: preApprovalModal.notes.trim() || undefined,
      });

      const purposeLabel = getPurposeLabel(preApprovalModal.purpose);

      toast.success(t("rpPreApprovalSuccess", { purpose: purposeLabel }));
      setPreApprovalModal({
        isOpen: false,
        purpose: "GUEST",
        visitorName: "",
        visitorPhone: "",
        vehicleNumber: "",
        expectedDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
        notes: "",
        submitting: false,
      });
      loadDashboardData(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("rpPreApprovalFailed"));
      setPreApprovalModal((p) => ({ ...p, submitting: false }));
    }
  };

  // 4 Modern & Attractive Cards Requested: Notices, Bills, Gate pass, Collection
  const coreActionCards = [
    {
      id: "notices",
      title: t("menuNotices"),
      subtitle: latestNotices.length > 0 ? t("rpActiveBulletins", { count: latestNotices.length }) : t("rpOfficialAnnouncements"),
      badge: latestNotices.length > 0 ? t("rpNew", { count: latestNotices.length }) : t("rpUpdated"),
      badgeColor: "#3B82F6",
      color: "#3B82F6",
      bg: "rgba(37, 99, 235, 0.15)",
      cardClass: "gd-action--notice",
      icon: MdOutlineCampaign,
      iconColor: "text-blue-400",
      glowColor: "from-blue-600/25 via-indigo-600/15 to-purple-600/5",
      borderColor: "border-blue-500/30 hover:border-blue-400",
      ctaText: t("rpOpenNoticeBoard"),
      onClick: () => navigate(`${base}/notices`),
    },
    {
      id: "bills",
      title: t("menuBills"),
      subtitle: pendingBills.length > 0 ? t("rpTotalDue", { amount: totalPendingAmount.toLocaleString("en-IN") }) : t("rpAllDuesCleared"),
      badge: pendingBills.length > 0 ? t("rpDue", { count: pendingBills.length }) : t("rpZeroDues"),
      badgeColor: pendingBills.length > 0 ? "#E11D48" : "#10B981",
      color: "#E11D48",
      bg: "rgba(225, 29, 72, 0.15)",
      cardClass: "gd-action--bills",
      icon: MdOutlineReceiptLong,
      iconColor: "text-rose-400",
      glowColor: "from-rose-600/25 via-pink-600/15 to-purple-600/5",
      borderColor: "border-rose-500/30 hover:border-rose-400",
      ctaText: pendingBills.length > 0 ? t("rpPayDuesNow") : t("rpViewPaymentHistory"),
      onClick: () => navigate(`${base}/bills`),
    },
    {
      id: "gatepass",
      title: t("rdCardGatePass"),
      subtitle: t("rpGatePassSub"),
      badge: t("rpFastTrack"),
      badgeColor: "#0891B2",
      color: "#0891B2",
      bg: "rgba(8, 145, 178, 0.15)",
      cardClass: "gd-action--fastpass",
      icon: MdOutlineQrCodeScanner,
      iconColor: "text-cyan-400",
      glowColor: "from-cyan-600/25 via-teal-600/15 to-blue-600/5",
      borderColor: "border-cyan-500/30 hover:border-cyan-400",
      ctaText: t("rpGenerateEntryPass"),
      onClick: () => navigate(`${base}/preapproval`),
    },
    {
      id: "collection",
      title: t("rpCardCollectionTitle"),
      subtitle: pendingParcels.length > 0 ? t("rpParcelsWaiting", { count: pendingParcels.length }) : t("rpCollectionSub"),
      badge: pendingParcels.length > 0 ? t("rpReady", { count: pendingParcels.length }) : t("rpNoDeliveries"),
      badgeColor: pendingParcels.length > 0 ? "#D97706" : "#64748B",
      color: "#D97706",
      bg: "rgba(217, 119, 6, 0.15)",
      cardClass: "gd-action--parcel",
      icon: MdOutlineInventory2,
      iconColor: "text-amber-400",
      glowColor: "from-amber-600/25 via-orange-600/15 to-yellow-600/5",
      borderColor: "border-amber-500/30 hover:border-amber-400",
      ctaText: t("rpViewParcelBox"),
      onClick: () => navigate(`${base}/my-collection`),
    },
  ];

  if (loading) return <DashboardSkeleton />;

  // Localized label for pre-approval purposes
  const getPurposeLabel = (p) =>
    t({ GUEST: "preapPurposeGuest", CAB: "preapPurposeCab", DELIVERY: "preapPurposeDelivery" }[p] || "preapPurposeGuest");

  const societyName = profile?.Society?.name || currentFlat?.society_name || t("rpSocietyFallback");

  return (
    <div className="ge-root rp-dash space-y-6 animate-fadeIn pb-14">
      {/* ── HERO GREETING & PROPERTY IDENTITY BANNER ── */}
      <div className="rph-hero">
        <span className="rph-hero__aurora rph-hero__aurora--a" aria-hidden />
        <span className="rph-hero__aurora rph-hero__aurora--b" aria-hidden />
        <span className="rph-hero__grid" aria-hidden />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Identity */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
            {/* The whole avatar is the hit target so the initials fallback
                behaves like the photo, and it opens the canonical editable
                profile rather than a separate read-only page. */}
            <button
              type="button"
              className="rph-avatar"
              onClick={() => navigate(`${base}/myprofile`)}
              aria-label={t("menuMyProfile")}
              title={t("menuMyProfile")}
            >
              <span className="rph-avatar__ring" aria-hidden />
              {profile?.profile_picture ? (
                <UserAvatar
                  name={profile?.name || t("rdDefaultName")}
                  src={profile.profile_picture}
                  className="rph-avatar__photo"
                  alt={profile?.name || "Profile picture"}
                />
              ) : (
                <span className="rph-avatar__initials">{initials}</span>
              )}
              <span className="rph-avatar__dot" aria-hidden />
            </button>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-extrabold text-secondary tracking-wide">
                  {greeting}
                </span>
                <span className="rph-role-chip">
                  <MdVerified size={12} />
                  <span>{profile?.resident_type || profile?.role || t("rdRoleBadge")}</span>
                </span>
              </div>

              <h1 className="rph-name">{profile?.name || t("rdDefaultName")}</h1>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="rph-meta">
                  <span className="rph-meta__ic rph-meta__ic--sky">
                    <MdLocationCity size={14} />
                  </span>
                  <span className="truncate">{societyName}</span>
                </span>

                {currentFlat && (
                  <>
                    <span className="rph-meta-divider" aria-hidden />
                    <span className="rph-meta">
                      <span className="rph-meta__ic rph-meta__ic--cyan">
                        <MdHome size={14} />
                      </span>
                      <span className="truncate">
                        {currentFlat.block_name ? `${t("rdBlock")} ${currentFlat.block_name} · ` : ""}
                        {t("rdFlat")} {currentFlat.flat_number || "—"}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action & Status Group */}
          <div className="rph-aside">
            <span className="rph-status">
              <span className="rph-status__dot" aria-hidden />
              {t("rpCommunityActive")}
            </span>

            <div className="rph-actions">
              <button
                type="button"
                onClick={() => navigate("/resident/bills")}
                className="rph-btn rph-btn--dues"
                title={t("rpViewBillsPayments")}
              >
                <MdReceiptLong size={16} />
                <span>{t("rpMyDues")}</span>
                {totalPendingAmount > 0 && (
                  <span className="rph-btn__amt">₹{totalPendingAmount.toLocaleString("en-IN")}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => loadDashboardData(true)}
                className={`rph-btn rph-btn--icon ${refreshing ? "animate-spin" : ""}`}
                title={t("rpRefreshDashboard")}
              >
                <MdRefresh size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Multiple Flat Context Switcher — full-width footer strip */}
        {(flats.length > 1 || flats.some((f) => isFlatRented(f))) && (
          <div className="rph-switch">
            <div className="rph-switch__head">
              <p className="rph-switch__label">
                <MdSwapHoriz size={13} />
                {t("rpYourProperties")}
              </p>
              <span className="rph-switch__count">
                {t("rpPropertyCount", { count: flats.length })}
              </span>
            </div>
            <div className="rph-switch__track">
              {flats.map((flat) => {
                const fid = flat.flat_id || flat.id;
                const rented = isFlatRented(flat);
                const label = flatPillLabel(flat);
                const isActive = !rented && String(selectedFlatId) === String(fid);
                const tenantName = flat.tenant?.name || t("rpTenantUnknown");
                return (
                  <button
                    key={fid}
                    type="button"
                    aria-disabled={rented || undefined}
                    onClick={() => {
                      if (rented) {
                        toast.warning(t("rpFlatRentedSwitchBlock", { flat: label, name: tenantName }));
                        return;
                      }
                      setSelectedFlatId(fid);
                    }}
                    title={
                      rented
                        ? t("rpFlatRentedTitle", { flat: label, name: tenantName })
                        : label
                    }
                    className={`rph-switch__pill ${isActive ? "is-active" : ""} ${rented ? "is-rented" : ""}`}
                  >
                    {rented ? <MdLock size={13} /> : <MdApartment size={14} />}
                    <span>{label}</span>
                    {rented && <span className="rph-switch__tag">{t("rpFlatRentedTag")}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. 4 MODERN & ATTRACTIVE CORE ACTION CARDS (Notices, Bills, Gate pass, Collection) ── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-5 bg-accent rounded-full shadow-sm shadow-accent/50" />
            <h2 className="text-base font-black text-primary tracking-tight">
              {t("rpQuickServicesTitle")}
            </h2>
          </div>
          <span className="text-xs text-secondary font-bold">{t("rpEssentialHubs", { count: 4 })}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {coreActionCards.map((card, idx) => {
            const IconComp = card.icon;
            return (
              <div
                key={card.id}
                onClick={card.onClick}
                style={{
                  "--gd-c": card.color,
                  "--gd-badge-c": card.badgeColor || card.color,
                  animationDelay: `${idx * 60}ms`,
                }}
                className={`gd-action ${card.cardClass} group relative overflow-hidden rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col gap-3`}
              >
                <span className="gd-action__blob" aria-hidden />

                {card.badge && (
                  <span className="gd-action__badge absolute top-3 right-3 z-[2] px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                    {card.badge}
                  </span>
                )}

                <div
                  className="gd-action__icon"
                  style={{ backgroundColor: card.bg, color: card.color }}
                >
                  <IconComp size={22} />
                </div>

                <div className="relative z-[1] mt-auto">
                  <div className="flex items-center gap-1">
                    <h3 className="text-[13px] sm:text-sm font-bold text-primary leading-tight">
                      {card.title}
                    </h3>
                    <MdChevronRight className="gd-action__arrow shrink-0" size={16} />
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-secondary line-clamp-2 mt-0.5 leading-snug">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. LIVE DAILY HELP & DOMESTIC STAFF TRACKER ── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-5 bg-teal-400 rounded-full shadow-sm shadow-teal-400/50" />
            <h2 className="text-base font-black text-primary tracking-tight">
              {t("rpDailyHelpTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${base}/my-household`)}
            className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
          >
            <span>{t("rpManageAllStaff")}</span>
            <MdArrowForward size={15} />
          </button>
        </div>

        {dailyHelpList.length === 0 ? (
          <div className="p-6 rounded-3xl border border-glass-border bg-card flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-13 h-13 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/25 flex items-center justify-center shrink-0">
                <MdCleaningServices size={28} />
              </div>
              <div>
                <h4 className="text-base font-bold text-primary">{t("rpTrackStaffTitle")}</h4>
                <p className="text-xs text-secondary mt-0.5 max-w-lg">
                  {t("rpTrackStaffSub")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`${base}/my-household`)}
              className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-md shadow-teal-600/25 transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-2"
            >
              <MdAdd size={17} />
              <span>{t("rpAddStaff")}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {dailyHelpList.map((help) => {
              const isInside = help.status === "INSIDE" || help.is_inside;
              return (
                <div
                  key={help.id}
                  onClick={() => navigate(`${base}/my-household`)}
                  className="p-4 rounded-2xl border border-glass-border bg-card hover:bg-card-inner-bg transition flex items-center justify-between gap-3 cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/25 flex items-center justify-center font-bold text-base shrink-0">
                        {help.name?.charAt(0).toUpperCase() || "H"}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                          isInside ? "bg-emerald-400 animate-pulse" : "bg-gray-400"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-primary truncate">{help.name}</p>
                      <p className="text-[10.5px] font-semibold text-secondary capitalize truncate">
                        {help.member_type || help.role || t("rpDomesticStaff")}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                      isInside
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-card-inner-bg text-secondary border border-glass-border"
                    }`}
                  >
                    {isInside ? t("rpInside") : t("rpOffDuty")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. VISITOR ACCESS & INSTANT PRE-APPROVAL LAUNCHER ── */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/50" />
            <h2 className="text-base font-black text-primary tracking-tight">
              {t("rpVisitorAccessTitle")}
            </h2>
          </div>

          {/* Quick Pre-Approval Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                setPreApprovalModal({
                  isOpen: true,
                  purpose: "GUEST",
                  visitorName: "",
                  visitorPhone: "",
                  vehicleNumber: "",
                  expectedDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
                  notes: "",
                  submitting: false,
                })
              }
              className="py-2 px-3.5 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <MdPerson size={15} />
              <span>{t("rpPreApproveGuest")}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setPreApprovalModal({
                  isOpen: true,
                  purpose: "CAB",
                  visitorName: "",
                  visitorPhone: "",
                  vehicleNumber: "",
                  expectedDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
                  notes: "",
                  submitting: false,
                })
              }
              className="py-2 px-3.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <MdLocalTaxi size={15} />
              <span>{t("rpAddCab")}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setPreApprovalModal({
                  isOpen: true,
                  purpose: "DELIVERY",
                  visitorName: "",
                  visitorPhone: "",
                  vehicleNumber: "",
                  expectedDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
                  notes: "",
                  submitting: false,
                })
              }
              className="py-2 px-3.5 rounded-xl text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <MdLocalShipping size={15} />
              <span>{t("rpAddDelivery")}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`${base}/visitors`)}
              className="text-xs font-bold text-accent hover:underline ml-1"
            >
              {t("rpVisitorLogs")}
            </button>
          </div>
        </div>

        {/* Visitors Feed */}
        {visitors.length === 0 ? (
          <div className="p-8 rounded-3xl border border-glass-border bg-card text-center text-secondary shadow-sm">
            <MdQrCodeScanner size={32} className="mx-auto mb-2 opacity-35 text-cyan-400" />
            <p className="text-sm font-bold text-primary">{t("rpNoRecentVisitors")}</p>
            <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
              {t("rpNoRecentVisitorsSub")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visitors.slice(0, 6).map((v) => {
              const type = (v.type || v.purpose || "GUEST").toUpperCase();
              const isInside = v.status === "INSIDE";
              const isApproved = v.status === "APPROVED";

              return (
                <div
                  key={v.id}
                  onClick={() => navigate(`${base}/visitors`)}
                  className="p-4 rounded-2xl border border-glass-border bg-card hover:bg-card-inner-bg transition flex items-center justify-between gap-3 cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-card-inner-bg text-primary border border-glass-border flex items-center justify-center shrink-0">
                      {type === "CAB" ? (
                        <MdLocalTaxi size={22} className="text-amber-400" />
                      ) : type === "DELIVERY" ? (
                        <MdLocalShipping size={22} className="text-purple-400" />
                      ) : (
                        <MdPerson size={22} className="text-cyan-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-primary truncate">{v.name || v.visitor_name || t("vrVisitor")}</p>
                      <p className="text-[10.5px] text-secondary font-medium truncate">
                        {v.vehicle_number ? `🚗 ${v.vehicle_number}` : type}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider block ${
                        isInside
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : isApproved
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                          : "bg-card-inner-bg text-secondary border border-glass-border"
                      }`}
                    >
                      {v.status || "LOGGED"}
                    </span>
                    <span className="text-[10px] text-secondary mt-0.5 block font-medium">
                      {v.check_in_time
                        ? new Date(v.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : v.created_at
                        ? new Date(v.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 6. QUICK PRE-APPROVAL MODAL ── */}
      {preApprovalModal.isOpen && (
        <Modal
          isOpen={preApprovalModal.isOpen}
          onClose={() => setPreApprovalModal((p) => ({ ...p, isOpen: false }))}
          title={t("rpPreApproveModalTitle", { purpose: getPurposeLabel(preApprovalModal.purpose) })}
          subtitle={t("rpPreApproveModalSub")}
          icon={MdQrCodeScanner}
          size="md"
        >
          <form onSubmit={handleCreatePreApproval} className="space-y-4 pt-1">
            {/* Purpose Selector */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">{t("rpEntryPurpose")}</label>
              <div className="grid grid-cols-3 gap-2">
                {["GUEST", "CAB", "DELIVERY"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPreApprovalModal((p) => ({ ...p, purpose: type }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      preApprovalModal.purpose === type
                        ? "bg-accent text-white border-accent shadow-md shadow-accent/25"
                        : "bg-card-inner-bg text-secondary border-glass-border hover:text-primary"
                    }`}
                  >
                    {type === "GUEST" && <MdPerson size={14} />}
                    {type === "CAB" && <MdLocalTaxi size={14} />}
                    {type === "DELIVERY" && <MdLocalShipping size={14} />}
                    <span>{getPurposeLabel(type)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visitor / Provider Name */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                {preApprovalModal.purpose === "CAB"
                  ? t("rpCabDriverName")
                  : preApprovalModal.purpose === "DELIVERY"
                  ? t("rpDeliveryPartner")
                  : t("rpGuestFullName")}{" "}
                <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                required
                className="input w-full py-2.5 px-3.5 rounded-xl bg-card-inner-bg border-glass-border text-sm font-semibold text-primary"
                placeholder={t("rpNamePlaceholder")}
                value={preApprovalModal.visitorName}
                onChange={(e) => setPreApprovalModal((p) => ({ ...p, visitorName: e.target.value }))}
                autoFocus
              />
            </div>

            {/* Phone & Vehicle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-primary mb-1">{t("rpContactPhoneOptional")}</label>
                <input
                  type="tel"
                  className="input w-full py-2.5 px-3.5 rounded-xl bg-card-inner-bg border-glass-border text-sm font-semibold text-primary"
                  placeholder={t("preapMobilePlaceholder")}
                  value={preApprovalModal.visitorPhone}
                  onChange={(e) => setPreApprovalModal((p) => ({ ...p, visitorPhone: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1">{t("rpVehiclePlateOptional")}</label>
                <input
                  type="text"
                  className="input w-full py-2.5 px-3.5 rounded-xl bg-card-inner-bg border-glass-border text-sm font-bold uppercase font-mono text-primary"
                  placeholder={t("preapVehiclePlaceholder")}
                  value={preApprovalModal.vehicleNumber}
                  onChange={(e) => setPreApprovalModal((p) => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            {/* Expected Date & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-primary mb-1">{t("rpExpectedDate")}</label>
                <input
                  type="date"
                  className="input w-full py-2.5 px-3.5 rounded-xl bg-card-inner-bg border-glass-border text-xs font-semibold text-primary"
                  value={preApprovalModal.expectedDate}
                  onChange={(e) => setPreApprovalModal((p) => ({ ...p, expectedDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1">{t("rpDestinationFlat")}</label>
                <div className="py-2.5 px-3.5 rounded-xl bg-card-inner-bg/80 border border-glass-border text-xs font-bold text-accent">
                  {currentFlat
                    ? t("rpFlatWithBlock", {
                        number: currentFlat.flat_number,
                        block: currentFlat.block_name || t("rpMain"),
                      })
                    : t("rpAssignedFlat")}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1">{t("rpGateNotes")}</label>
              <textarea
                rows={2}
                className="input w-full py-2 px-3.5 rounded-xl bg-card-inner-bg border-glass-border text-xs font-medium text-primary resize-none"
                placeholder={t("rpGateNotesPlaceholder")}
                value={preApprovalModal.notes}
                onChange={(e) => setPreApprovalModal((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPreApprovalModal((p) => ({ ...p, isOpen: false }))}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-glass-border bg-card-inner-bg hover:bg-white/10 text-secondary transition cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={preApprovalModal.submitting}
                className="flex-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-linear-to-r from-accent via-purple-600 to-indigo-600 hover:from-accent-light hover:to-indigo-500 shadow-md shadow-accent/25 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {preApprovalModal.submitting
                  ? t("rpApproving")
                  : t("rpAuthorizeEntry", { purpose: getPurposeLabel(preApprovalModal.purpose) })}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 7. UNIFIED SOS BROADCAST MODAL ── */}
      {isSOSOpen && (
        <SOSModal
          key={String(isSOSOpen)}
          isOpen={isSOSOpen}
          onClose={() => setIsSOSOpen(false)}
          onRefresh={() => loadDashboardData(true)}
          senderLabel="sosSenderResident"
          modalTitle="sosResidentSOSTitle"
          successMessage="sosResidentSuccess"
        />
      )}
    </div>
  );
}
