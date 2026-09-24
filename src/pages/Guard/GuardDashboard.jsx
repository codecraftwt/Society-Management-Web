import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import {
  MdDashboard,
  MdLogin,
  MdLogout,
  MdWarning,
  MdLocalTaxi,
  MdVerified,
  MdOutlineCardGiftcard,
  MdRefresh,
  MdSearch,
  MdAccessTime,
  MdApartment,
  MdDirectionsCar,
  MdPhone,
  MdCheckCircle,
  MdShield,
  MdClose,
  MdOutlineTimer,
  MdHistoryEdu,
  MdChevronRight,
} from "react-icons/md";
import {
  FaUserFriends,
  FaTruck,
  FaParking,
  FaHandshake,
  FaTools,
} from "react-icons/fa";
import GuardEmergencyModal from "../../components/guard/GuardEmergencyModal";

/* ─────────────────────────────────────────────────────────────
   Helper Functions
   ───────────────────────────────────────────────────────────── */
const formatTime12h = (timeStr) => {
  if (!timeStr) return "";
  try {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return timeStr;
  }
};

const getElapsedMinutes = (dateStr) => {
  if (!dateStr) return 0;
  const entry = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - entry) / 60000));
};

const formatElapsedStr = (mins) => {
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m inside`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins > 0 ? `${remMins}m` : ""} inside`;
};

const getVisitorTypeMeta = (type) => {
  const t = (type || "").toUpperCase();
  switch (t) {
    case "CAB":
      return {
        label: "Cab",
        icon: MdLocalTaxi,
        color: "var(--acct-yellow, #eab308)",
        bg: "rgba(234, 179, 8, 0.12)",
        border: "rgba(234, 179, 8, 0.25)",
      };
    case "DELIVERY":
      return {
        label: "Delivery",
        icon: FaTruck,
        color: "var(--acct-cyan, #06b6d4)",
        bg: "rgba(6, 182, 212, 0.12)",
        border: "rgba(6, 182, 212, 0.25)",
      };
    case "SERVICE":
      return {
        label: "Service",
        icon: FaTools,
        color: "var(--acct-purple, #a855f7)",
        bg: "rgba(168, 85, 247, 0.12)",
        border: "rgba(168, 85, 247, 0.25)",
      };
    case "DAILY_HELP":
      return {
        label: "Daily Help",
        icon: FaHandshake,
        color: "var(--acct-teal, #14b8a6)",
        bg: "rgba(20, 184, 166, 0.12)",
        border: "rgba(20, 184, 166, 0.25)",
      };
    default:
      return {
        label: "Guest",
        icon: FaUserFriends,
        color: "var(--accent, #3b82f6)",
        bg: "rgba(59, 130, 246, 0.12)",
        border: "rgba(59, 130, 246, 0.25)",
      };
  }
};

const getFlatLabel = (v) => {
  if (!v?.Flat) return "Main Gate / General";
  const b = v.Flat.Floor?.Block?.name || v.Flat.Block?.name || "";
  const fl = v.Flat.Floor?.floor_number;
  const fn = v.Flat.flat_number || "—";
  return [b ? `Tower ${b}` : null, fl != null ? `Fl ${fl}` : null, `Flat ${fn}`]
    .filter(Boolean)
    .join(" • ");
};

/* ─────────────────────────────────────────────────────────────
   Main Component (Matching Admin & SuperAdmin Dashboards)
   ───────────────────────────────────────────────────────────── */
export default function GuardDashboard() {
  const { t } = useLang();
  const navigate = useNavigate();

  // State variables
  const [dateTime, setDateTime] = useState(new Date());
  const [profile, setProfile] = useState(null);
  const [shift, setShift] = useState(null);
  const [stats, setStats] = useState({ today: 0, inside: 0, exited: 0 });
  const [visitors, setVisitors] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("INSIDE"); // INSIDE | OVERSTAY | ALL
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Exit Modal State
  const [exitTarget, setExitTarget] = useState(null);
  const [exitLoading, setExitLoading] = useState(false);

  // Greeting determination
  const greeting = useMemo(() => {
    const hr = dateTime.getHours();
    if (hr < 12) return t("gdGreetingMorning", "Good Morning");
    if (hr < 17) return t("gdGreetingAfternoon", "Good Afternoon");
    return t("gdGreetingEvening", "Good Evening");
  }, [dateTime, t]);

  /* ── Load Core Data ── */
  const loadDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const pPromise = API.get("/users/me").catch(() => null);
      const sPromise = API.get("/guard-shift/my").catch(() => null);
      const vPromise = API.get("/visitors?page=1&limit=50").catch(() => null);
      const ePromise = API.get("/emergency/active").catch(() => null);

      const [pRes, sRes, vRes, eRes] = await Promise.all([
        pPromise,
        sPromise,
        vPromise,
        ePromise,
      ]);

      if (pRes?.data) setProfile(pRes.data);
      if (sRes?.data) setShift(sRes.data?.data || sRes.data);

      if (vRes?.data) {
        const vData = vRes.data;
        const list = Array.isArray(vData) ? vData : vData?.data || vData?.visitors || [];
        setVisitors(list);
        const counts = vData?.counts || {};
        setStats({
          today: counts.ALL ?? list.length,
          inside: counts.IN ?? list.filter((x) => !x.exit_time).length,
          exited: counts.OUT ?? list.filter((x) => !!x.exit_time).length,
        });
      }

      if (eRes?.data) {
        setActiveAlerts(Array.isArray(eRes.data) ? eRes.data : []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load and live clock interval
  useEffect(() => {
    loadDashboardData();
    const clockTimer = setInterval(() => setDateTime(new Date()), 1000);
    const pollTimer = setInterval(() => loadDashboardData(), 15000);

    const handleSocketRefresh = () => loadDashboardData();
    window.addEventListener("refresh_guard_data", handleSocketRefresh);

    return () => {
      clearInterval(clockTimer);
      clearInterval(pollTimer);
      window.removeEventListener("refresh_guard_data", handleSocketRefresh);
    };
  }, [loadDashboardData]);

  /* ── Compute Real-time On Duty Status ──
       Backend is authoritative for on-duty (authorization/business decisions).
       start_time/end_time returned by the API are used only for the live
       countdown/label, so the UI can never contradict the server. */
  const isOnDuty = useMemo(() => {
    if (!shift || !shift.shift_type) return false;

    /* Have an explicit judgement from the API? Use it. */
    if (typeof shift.isOnDuty === "boolean") return shift.isOnDuty;

    /* Fallback: compute from shift times (only when the API omitted isOnDuty). */
    if (shift.start_time && shift.end_time) {
      try {
        const [sh, sm] = shift.start_time.split(":").map(Number);
        const [eh, em] = shift.end_time.split(":").map(Number);
        const curMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
        const startMinutes = sh * 60 + (sm || 0);
        const endMinutes = eh * 60 + (em || 0);

        if (startMinutes <= endMinutes) {
          return curMinutes >= startMinutes && curMinutes < endMinutes;
        } else {
          return curMinutes >= startMinutes || curMinutes < endMinutes;
        }
      } catch (e) {
        return false;
      }
    }
    return false;
  }, [shift, dateTime]);

  /* ── Security Radar (Overstaying Visitors > 45 mins) ── */
  const overstayingVisitors = useMemo(() => {
    return visitors.filter((v) => {
      if (v.exit_time) return false;
      const type = (v.visitor_type || v.purpose || "").toUpperCase();
      if (["DELIVERY", "CAB", "SERVICE"].includes(type)) {
        const mins = getElapsedMinutes(v.entry_time);
        return mins >= 45;
      }
      return false;
    });
  }, [visitors]);

  /* ── Filtered Visitors Stream ── */
  const filteredVisitors = useMemo(() => {
    let list = [...visitors];

    if (activeTab === "INSIDE") {
      list = list.filter((v) => !v.exit_time);
    } else if (activeTab === "OVERSTAY") {
      list = overstayingVisitors;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        const name = (v.visitor_name || "").toLowerCase();
        const phone = (v.visitor_phone || "").toLowerCase();
        const vehicle = (v.vehicle_number || v.vehicle_no || "").toLowerCase();
        const purpose = (v.purpose || v.visitor_type || "").toLowerCase();
        const flat = getFlatLabel(v).toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          vehicle.includes(q) ||
          purpose.includes(q) ||
          flat.includes(q)
        );
      });
    }

    // Sort: Inside first, then newest entry_time
    return list.sort((a, b) => {
      if (!a.exit_time && b.exit_time) return -1;
      if (a.exit_time && !b.exit_time) return 1;
      return new Date(b.entry_time || 0) - new Date(a.entry_time || 0);
    });
  }, [visitors, activeTab, overstayingVisitors, searchQuery]);

  /* ── Mark Visitor Exit Action ── */
  const handleConfirmExit = async () => {
    if (!exitTarget?.id) return;
    setExitLoading(true);
    try {
      await API.put(`/visitors/exit/${exitTarget.id}`);
      toast.success(`Exit logged for ${exitTarget.visitor_name}`);
      setExitTarget(null);
      loadDashboardData(true);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to record visitor exit"
      );
    } finally {
      setExitLoading(false);
    }
  };

  /* ── Quick Action Tiles Config (Distinct Card Colors) ── */
  const quickActions = [
    {
      id: "guest",
      title: "Guest Entry",
      desc: "Friends, family & personal visits",
      icon: FaUserFriends,
      path: "/guard/guest-entry",
      color: "#2563EB",
      bg: "rgba(37, 99, 235, 0.15)",
      badge: "Quick",
      badgeColor: "bg-blue-600 text-white",
      cardClass: "gd-action--guest",
    },
    {
      id: "cab",
      title: "Cab Entry",
      desc: "Uber, Ola, BluSmart & taxi",
      icon: MdLocalTaxi,
      path: "/guard/cab-entry",
      color: "#D97706",
      bg: "rgba(217, 119, 6, 0.15)",
      badgeColor: "bg-amber-600 text-white",
      cardClass: "gd-action--cab",
    },
    {
      id: "delivery",
      title: "Delivery Entry",
      desc: "Zomato, Swiggy, Amazon & parcel",
      icon: FaTruck,
      path: "/guard/delivery-entry",
      color: "#0891B2",
      bg: "rgba(8, 145, 178, 0.15)",
      badgeColor: "bg-cyan-600 text-white",
      cardClass: "gd-action--delivery",
    },
    {
      id: "service",
      title: "Service Entry",
      desc: "Plumber, electrician, repairs & maids",
      icon: FaTools,
      path: "/guard/service-entry",
      color: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.15)",
      badgeColor: "bg-purple-600 text-white",
      cardClass: "gd-action--service",
    },
    {
      id: "dailyhelp",
      title: "Daily Help",
      desc: "Maids, cooks, drivers & helpers",
      icon: FaHandshake,
      path: "/guard/daily-help",
      color: "#0D9488",
      bg: "rgba(13, 148, 136, 0.15)",
      badgeColor: "bg-teal-600 text-white",
      cardClass: "gd-action--dailyhelp",
    },
    {
      id: "logbook",
      title: "Shift Log Book",
      desc: "Handover notes & gate records",
      icon: MdHistoryEdu,
      path: "/guard/shift-logbook",
      color: "#6366F1",
      bg: "rgba(99, 102, 241, 0.15)",
      badgeColor: "bg-indigo-600 text-white",
      cardClass: "gd-action--logbook",
    },
    {
      id: "gatepass",
      title: "GatePass Verify",
      desc: "Verify QR or resident pass code",
      icon: MdVerified,
      path: "/guard/gatepass",
      color: "#16A34A",
      bg: "rgba(22, 163, 74, 0.15)",
      badge: "Fast Pass",
      badgeColor: "bg-emerald-600 text-white",
      cardClass: "gd-action--gatepass",
    },
    {
      id: "parking",
      title: "Parking Check",
      desc: "Check visitor slots & plates",
      icon: FaParking,
      path: "/guard/parking",
      color: "#9333EA",
      bg: "rgba(147, 51, 234, 0.15)",
      badgeColor: "bg-purple-600 text-white",
      cardClass: "gd-action--parking",
    },
    {
      id: "collection",
      title: "Parcel & Courier",
      desc: "Track resident parcel drop-offs",
      icon: MdOutlineCardGiftcard,
      path: "/guard/collection",
      color: "#DB2777",
      bg: "rgba(219, 39, 119, 0.15)",
      badgeColor: "bg-pink-600 text-white",
      cardClass: "gd-action--collection",
    },
    {
      id: "emergency",
      title: "Guard SOS Alert",
      desc: "Broadcast emergency gate alert",
      icon: MdWarning,
      onClick: () => setShowEmergencyModal(true),
      color: "#DC2626",
      bg: "rgba(220, 38, 38, 0.15)",
      badge: "SOS",
      badgeColor: "bg-red-600 text-white animate-pulse",
      cardClass: "gd-action--emergency",
    },
  ];

  const GATE_PRIMARY_IDS = ["guest", "cab", "delivery", "gatepass", "emergency"];
  const gateQuickActions = GATE_PRIMARY_IDS.map((id) =>
    quickActions.find((a) => a.id === id)
  ).filter(Boolean);

  return (
    <div className="space-y-6 w-full min-w-0 max-w-400 mx-auto pb-8 animate-fadeIn">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. DASHBOARD HERO HEADER (MATCHING ADMIN DASHBOARD)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="gd-hero-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
              <span>{greeting}, {profile?.name || t("gdGuard", "Security Officer")}</span>
              <span className="animate-wave inline-block">👮</span>
            </h1>

            {profile?.Society?.name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <MdApartment className="text-blue-400" />
                {profile.Society.name}
              </span>
            )}
          </div>

          <p className="text-xs md:text-sm text-secondary truncate">
            {t("gdGuardPortal", "Guard Security Hub")} • Gate Operations &amp; Visitor Management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Formatted Date & Time */}
          <div className="text-xs font-medium text-secondary bg-card-inner-bg/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-glass-border flex items-center gap-1.5 shadow-sm">
            <MdAccessTime size={14} className="text-accent" />
            <span>
              {dateTime.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>•</span>
            <span className="font-mono font-bold text-primary">
              {dateTime.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </span>
          </div>

          {/* Operational Duty Status Pill */}
          <div
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl border backdrop-blur-md shadow-sm ${
              isOnDuty
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                : shift?.shift_type
                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                : "bg-rose-500/15 text-rose-500 border-rose-500/30"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnDuty ? "bg-emerald-500 animate-pulse" : shift?.shift_type ? "bg-amber-500" : "bg-rose-500"
              }`}
            />
            <span>
              {isOnDuty
                ? `On Duty (${shift?.shift_type || "General"})`
                : shift?.shift_type
                ? `Off Duty • ${shift.shift_type} at ${formatTime12h(shift.start_time)}`
                : "Off Duty"}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-card-inner-bg/80 hover:bg-card border border-glass-border text-secondary hover:text-primary transition shadow-sm hover:scale-105 active:scale-95"
            title="Refresh Data"
          >
            <MdRefresh size={18} className={refreshing ? "animate-spin text-accent" : ""} />
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. ACTIVE EMERGENCY & SOS BANNER (IF ACTIVE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeAlerts.length > 0 && (
        <div
          onClick={() => setShowEmergencyModal(true)}
          className="gd-glass-card bg-red-500/15 border border-red-500/35 rounded-2xl p-5 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-red-500/20 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-red-500/10 animate-pulse"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <MdWarning size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-red-500 text-white px-2 py-0.5 rounded-md shadow-sm">
                  Emergency Alert
                </span>
                <span className="font-bold text-sm sm:text-base">
                  {activeAlerts.length} Active Emergency Incident{activeAlerts.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-secondary mt-0.5">
                {activeAlerts[0]?.Flat
                  ? `Incident reported at ${getFlatLabel(activeAlerts[0])}. Click to view action protocol.`
                  : "Resident or gate panic alert is currently active."}
              </p>
            </div>
          </div>

          <button className="btn-danger text-xs font-bold px-4 py-2 rounded-xl shrink-0 shadow-md">
            Open SOS Panel
          </button>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. SECURITY RADAR (OVERSTAY DETECTION BANNER)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {overstayingVisitors.length > 0 && (
        <div className="gd-glass-card bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-amber-500/50 transition-all duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <MdOutlineTimer size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  Security Radar
                </span>
                <span className="font-bold text-sm sm:text-base text-primary">
                  {overstayingVisitors.length} Visitor{overstayingVisitors.length > 1 ? "s" : ""} Overstaying (&gt;45 mins)
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">
                Delivery/cab/service entries exceeding allowable gate duration.
              </p>

              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {overstayingVisitors.slice(0, 3).map((ov) => {
                  const mins = getElapsedMinutes(ov.entry_time);
                  return (
                    <span
                      key={ov.id}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-card-inner-bg/90 border border-glass-border text-primary flex items-center gap-1.5 shadow-sm hover:scale-105 transition-transform"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      <strong>{ov.visitor_name}</strong> ({ov.visitor_type || ov.purpose}) • {getFlatLabel(ov)} •{" "}
                      <span className="font-bold text-red-500">{mins}m</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("OVERSTAY")}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition self-start md:self-center shrink-0 hover:scale-105 active:scale-95"
          >
            Review Overstays
          </button>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. KEY METRICS KPI CARDS (MATCHING ad-kpi CLASSES & COLORS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Inside Now */}
        <div
          onClick={() => setActiveTab("INSIDE")}
          className="ad-kpi ad-kpi--guards cursor-pointer gd-kpi-card"
        >
          <span className="ad-kpi-val">{stats.inside}</span>
          <span className="ad-kpi-label">{t("gdStatInside", "Visitors Inside")}</span>
          <span className="ad-kpi-desc hidden lg:block">Active on society premises</span>
        </div>

        {/* Total Today */}
        <div
          onClick={() => setActiveTab("ALL")}
          className="ad-kpi ad-kpi--residents cursor-pointer gd-kpi-card"
        >
          <span className="ad-kpi-val">{stats.today}</span>
          <span className="ad-kpi-label">{t("gdStatToday", "Total Today")}</span>
          <span className="ad-kpi-desc hidden lg:block">All visitor entries today</span>
        </div>

        {/* Exited Today */}
        <div
          onClick={() => setActiveTab("ALL")}
          className="ad-kpi ad-kpi--complaints cursor-pointer gd-kpi-card"
        >
          <span className="ad-kpi-val">{stats.exited}</span>
          <span className="ad-kpi-label">{t("gdStatExited", "Exited Today")}</span>
          <span className="ad-kpi-desc hidden lg:block">Departed via gate checkout</span>
        </div>

        {/* Emergency Count */}
        <div
          onClick={() => setShowEmergencyModal(true)}
          className="ad-kpi ad-kpi--expense cursor-pointer gd-kpi-card"
        >
          <span className="ad-kpi-val">{activeAlerts.length}</span>
          <span className="ad-kpi-label">{t("gdStatAlerts", "Active Alerts")}</span>
          <span className="ad-kpi-desc hidden lg:block">
            {activeAlerts.length > 0 ? "Immediate attention needed" : "All systems normal"}
          </span>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. QUICK GATE OPERATIONS HUB (DISTINCT COLOR CARDS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="gd-glass-card rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MdDashboard size={20} className="text-accent" />
            <div>
              <h2 className="text-base font-bold text-primary">
                {t("gdQuickActions", "Quick Gate Operations")}
              </h2>
              <p className="text-xs text-secondary">
                1-Click gate entry &amp; logging tools
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {gateQuickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                onClick={() => {
                  if (action.onClick) action.onClick();
                  else if (action.path) navigate(action.path);
                }}
                style={{ "--gd-c": action.color, animationDelay: `${idx * 60}ms` }}
                className={`gd-action gd-action--enter group relative overflow-hidden rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col gap-3 ${action.cardClass}`}
              >
                <span className="gd-action__blob" aria-hidden />

                {action.badge && (
                  <span
                    className={`gd-action__badge absolute top-3 right-3 z-[2] px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm ${
                      action.badgeColor || "bg-blue-600 text-white"
                    }`}
                  >
                    {action.badge}
                  </span>
                )}

                <div
                  className="gd-action__icon"
                  style={{ backgroundColor: action.bg, color: action.color }}
                >
                  <Icon size={22} />
                </div>

                <div className="relative z-[1] mt-auto">
                  <div className="flex items-center gap-1">
                    <h3 className="text-[13px] sm:text-sm font-bold text-primary leading-tight">
                      {action.title}
                    </h3>
                    <MdChevronRight className="gd-action__arrow shrink-0" size={16} />
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-secondary line-clamp-2 mt-0.5 leading-snug">
                    {action.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. LIVE GATE ACTIVITY STREAM & VISITORS LOG
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="gd-glass-card rounded-2xl p-6 shadow-sm">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-divider">
          <div className="flex items-center gap-3 min-w-0">
            <div className="gd-live-badge shrink-0">
              <span className="gd-live-dot" />
              LIVE
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                {t("gdGateStream", "Live Gate Visitors Stream")}
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Auto-refresh every 15s · {stats.inside} visitor{stats.inside === 1 ? "" : "s"} inside now
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-card-inner-bg border border-glass-border self-start sm:self-auto">
              <button
                onClick={() => setActiveTab("INSIDE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "INSIDE"
                    ? "bg-card text-accent shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                <span>Inside Now</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                  {stats.inside}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("OVERSTAY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "OVERSTAY"
                    ? "bg-card text-amber-500 shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                <span>Overstaying</span>
                {overstayingVisitors.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                    {overstayingVisitors.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "ALL"
                    ? "bg-card text-accent shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                <span>All Today</span>
                <span className="text-[10px] text-secondary font-semibold">({stats.today})</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadDashboardData(true)}
              disabled={loading}
              title="Refresh live data"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-card-inner-bg hover:bg-card border border-glass-border transition flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              <MdRefresh size={16} className={`text-accent ${loading ? "animate-spin" : ""}`} />
              <span className="text-xs font-semibold text-secondary hidden sm:inline">Refresh</span>
            </button>

            {/* Search Input Toggle */}
            {isSearchOpen ? (
              <div className="relative flex items-center min-w-[240px] sm:w-72 max-w-full animate-fadeIn">
                <MdSearch
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent pointer-events-none z-10"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }
                  }}
                  placeholder="Search name, flat, phone..."
                  className="gd-stream-search-input w-full pr-14 py-2 rounded-xl text-xs bg-card-inner-bg border border-accent/40 text-primary placeholder-secondary focus:outline-none focus:border-accent shadow-sm"
                  style={{ paddingLeft: "42px" }}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 rounded-lg text-secondary hover:text-primary transition"
                      title="Clear"
                    >
                      <MdClose size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="p-1 rounded-lg text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition"
                    title="Close Search"
                  >
                    <MdClose size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className={`p-2 sm:px-3 sm:py-1.5 rounded-xl bg-card-inner-bg hover:bg-card border transition flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 ${
                  searchQuery
                    ? "border-accent text-accent"
                    : "border-glass-border text-secondary hover:text-primary"
                }`}
                title="Search Live Visitors"
              >
                <MdSearch size={16} />
                <span className="text-xs font-semibold hidden sm:inline">Search</span>
                {searchQuery && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Visitors List */}
        <div className="mt-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-secondary">Loading live visitors data...</p>
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <MdCheckCircle size={28} />
              </div>
              <h3 className="text-sm font-bold text-primary">
                {searchQuery
                  ? "No matching visitors found"
                  : activeTab === "OVERSTAY"
                  ? "No overstaying visitors on premises"
                  : activeTab === "INSIDE"
                  ? "No active visitors inside right now"
                  : "No visitor records today"}
              </h3>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                {activeTab === "INSIDE"
                  ? "All visitors have safely departed or no gate entries recorded yet."
                  : "Gate activity is all clear and logged."}
              </p>
            </div>
          ) : (
            <div className="gd-stream-rows mt-4">
              {filteredVisitors.map((v, index) => {
                const meta = getVisitorTypeMeta(v.visitor_type || v.purpose);
                const Icon = meta.icon;
                const isInside = !v.exit_time;
                const elapsedMins = getElapsedMinutes(v.entry_time);
                const isOverstay =
                  isInside &&
                  ["DELIVERY", "CAB", "SERVICE"].includes((v.visitor_type || v.purpose || "").toUpperCase()) &&
                  elapsedMins >= 45;

                return (
                  <div
                    key={v.id}
                    style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                    className={`gd-stream-row relative overflow-hidden rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                      isOverstay ? "gd-stream-row--overstay" : ""
                    }`}
                  >
                    <span className="gd-stream-accent" style={{ background: meta.color }} />

                    {/* Visitor Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className="gd-stream-avatar flex-shrink-0"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        <Icon size={18} />
                        {isInside && (
                          <span
                            className="gd-stream-live-dot"
                            style={{ background: isOverstay ? "#f59e0b" : "#10b981" }}
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-primary truncate max-w-[170px] sm:max-w-none">
                            {v.visitor_name || "Guest Visitor"}
                          </span>

                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1"
                            style={{
                              backgroundColor: meta.bg,
                              color: meta.color,
                              borderColor: meta.border,
                            }}
                          >
                            <Icon size={10} />
                            {meta.label}
                          </span>

                          {isInside && !isOverstay && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Inside
                            </span>
                          )}

                          {isOverstay && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm animate-pulse">
                              Overstay {elapsedMins}m
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-secondary mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MdApartment className="text-accent flex-shrink-0" />
                            {getFlatLabel(v)}
                          </span>

                          {v.visitor_phone && (
                            <>
                              <span className="text-secondary">•</span>
                              <span className="flex items-center gap-1">
                                <MdPhone size={12} />
                                {v.visitor_phone}
                              </span>
                            </>
                          )}

                          {(v.vehicle_number || v.vehicle_no) && (
                            <>
                              <span className="text-secondary">•</span>
                              <span className="flex items-center gap-1 font-mono uppercase bg-card-inner-bg border border-glass-border px-1.5 py-0.5 rounded text-[11px] font-bold">
                                <MdDirectionsCar size={12} />
                                {v.vehicle_number || v.vehicle_no}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Metadata & Action */}
                    <div className="flex items-center gap-4 justify-between lg:justify-end flex-shrink-0 pl-1 lg:pl-0 border-t lg:border-t-0 border-glass-border pt-3 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <div className="flex items-center gap-1.5 justify-start lg:justify-end">
                          <MdAccessTime size={12} className="text-secondary" />
                          <p className="text-xs font-bold text-primary">
                            {new Date(v.entry_time).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </p>
                        </div>
                        <p className="text-[11px] text-secondary mt-0.5">
                          {isInside ? (
                            <span
                              className={`font-semibold ${
                                isOverstay ? "text-amber-500" : "text-emerald-500"
                              }`}
                            >
                              {formatElapsedStr(elapsedMins)}
                            </span>
                          ) : (
                            <span>
                              Left at{" "}
                              {new Date(v.exit_time).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          )}
                        </p>
                        {isInside && (
                          <div className="gd-dwell-wrap" title="Dwell time vs 45 min overstay threshold">
                            <div
                              className="gd-dwell"
                              style={{
                                width: `${Math.min(100, (elapsedMins / 45) * 100)}%`,
                                background:
                                  elapsedMins >= 45
                                    ? "#ef4444"
                                    : elapsedMins >= 30
                                    ? "#f59e0b"
                                    : "#10b981",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {isInside ? (
                        <button
                          onClick={() => setExitTarget(v)}
                          disabled={exitLoading}
                          className="btn-danger px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition"
                        >
                          <MdLogout size={14} />
                          <span className="hidden sm:inline">Mark Exit</span>
                          <span className="sm:hidden">Exit</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/25 flex items-center gap-1">
                          <MdCheckCircle size={14} />
                          Exited
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          7. EXIT CONFIRMATION MODAL (MATCHING ADMIN DIALOGS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {exitTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)", zIndex: 1100 }}
          onClick={() => !exitLoading && setExitTarget(null)}
        >
          <div
            className="bg-card border border-glass-border p-6 rounded-2xl w-full max-w-md shadow-xl animate-scaleIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center flex-shrink-0">
                <MdLogout size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Confirm Gate Exit</h3>
                <p className="text-xs text-secondary">Record official visitor exit timestamp</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card-inner-bg border border-glass-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">Visitor Name:</span>
                <span className="font-bold text-primary">{exitTarget.visitor_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">Destination:</span>
                <span className="font-bold text-primary">{getFlatLabel(exitTarget)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">Entry Type:</span>
                <span className="font-bold uppercase text-accent">
                  {exitTarget.visitor_type || exitTarget.purpose || "Guest"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">Time Inside:</span>
                <span className="font-bold text-emerald-500">
                  {formatElapsedStr(getElapsedMinutes(exitTarget.entry_time))}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmExit}
                disabled={exitLoading}
                className="btn-danger flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                {exitLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <MdCheckCircle size={16} />
                    <span>Confirm Exit</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setExitTarget(null)}
                disabled={exitLoading}
                className="btn-primary py-2 px-4 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8. EMERGENCY / SOS MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <GuardEmergencyModal
        alerts={activeAlerts}
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onRefresh={() => loadDashboardData(true)}
      />
    </div>
  );
}