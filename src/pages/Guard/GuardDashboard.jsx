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
  MdFingerprint,
} from "react-icons/md";
import {
  FaUserFriends,
  FaTruck,
  FaParking,
  FaHandshake,
  FaTools,
} from "react-icons/fa";
import GuardEmergencyModal from "../../components/guard/GuardEmergencyModal";
import GuardPunchModal from "../../components/guard/GuardPunchModal";
import StatCard from "../../components/common/StatCard";
import QuickLink from "../../components/common/QuickLink";
import UserAvatar from "../../components/common/UserAvatar";
import { useAuthContext } from "../../context/AuthContext";
import useEmergencyAlerts from "../../hooks/useEmergencyAlerts";

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

const formatElapsedStr = (mins, t) => {
  if (mins < 1) return t("gdJustNow", "Just now");
  if (mins < 60) return t("gdMinsInside", { mins }, "{mins}m inside");
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0
    ? t("gdHoursInside", { hrs, mins: remMins }, "{hrs}h {mins}m inside")
    : t("gdHoursOnlyInside", { hrs }, "{hrs}h inside");
};

const getVisitorTypeMeta = (type, t) => {
  const tt = (type || "").toUpperCase();
  switch (tt) {
    case "CAB":
      return {
        label: t("gdTypeCab", "Cab"),
        icon: MdLocalTaxi,
        color: "var(--acct-yellow, #eab308)",
        bg: "rgba(234, 179, 8, 0.12)",
        border: "rgba(234, 179, 8, 0.25)",
      };
    case "DELIVERY":
      return {
        label: t("gdTypeDelivery", "Delivery"),
        icon: FaTruck,
        color: "var(--acct-cyan, #06b6d4)",
        bg: "rgba(6, 182, 212, 0.12)",
        border: "rgba(6, 182, 212, 0.25)",
      };
    case "SERVICE":
      return {
        label: t("gdTypeService", "Service"),
        icon: FaTools,
        color: "var(--acct-purple, #a855f7)",
        bg: "rgba(168, 85, 247, 0.12)",
        border: "rgba(168, 85, 247, 0.25)",
      };
    case "DAILY_HELP":
      return {
        label: t("gdTypeDailyHelp", "Daily Help"),
        icon: FaHandshake,
        color: "var(--acct-teal, #14b8a6)",
        bg: "rgba(20, 184, 166, 0.12)",
        border: "rgba(20, 184, 166, 0.25)",
      };
    default:
      return {
        label: t("gdTypeGuest", "Guest"),
        icon: FaUserFriends,
        color: "var(--accent)",
        bg: "rgba(59, 130, 246, 0.12)",
        border: "rgba(59, 130, 246, 0.25)",
      };
  }
};

const getFlatLabel = (v, t) => {
  if (!v?.Flat) return t("gdMainGateGeneral", "Main Gate / General");
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
  const { user } = useAuthContext();

  // State variables
  const [dateTime, setDateTime] = useState(new Date());
  const [profile, setProfile] = useState(null);
  const [shift, setShift] = useState(null);
  const [stats, setStats] = useState({ today: 0, inside: 0, exited: 0 });
  const [visitors, setVisitors] = useState([]);
  const { alerts: activeAlerts } = useEmergencyAlerts();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("INSIDE"); // INSIDE | OVERSTAY | ALL
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const visitorStreamRef = useRef(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [punchModal, setPunchModal] = useState({ open: false, mode: "PUNCH_IN" });

  // Exit Modal State
  const [exitTarget, setExitTarget] = useState(null);
  const [exitLoading, setExitLoading] = useState(false);

  const reviewOverstays = () => {
    setSearchQuery("");
    setActiveTab("OVERSTAY");
    requestAnimationFrame(() => visitorStreamRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

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
      const pPromise = Promise.resolve({ data: user });
      const sPromise = API.get("/guard-shift/my").catch(() => null);
      const vPromise = API.get("/visitors?page=1&limit=50").catch(() => null);

      const [pRes, sRes, vRes] = await Promise.all([
        pPromise,
        sPromise,
        vPromise,
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

    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

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

  /* ── Attendance Gate Check Lock ──
     If guard is on active duty and has not punched in yet, gate actions
     and panel navigation are locked until punch-in is recorded. */
  const isAttendanceLocked = useMemo(() => {
    if (!shift || !isOnDuty) return false;
    const isPunchedIn =
      shift?.attendance?.status === "PUNCHED_IN" ||
      Boolean(shift?.attendance?.punch_in && shift?.attendance?.status !== "NOT_PUNCHED_IN");
    const isPunchedOut = shift?.attendance?.status === "PUNCHED_OUT";
    return !isPunchedIn && !isPunchedOut;
  }, [shift, isOnDuty]);

  // Automatically trigger mandatory punch-in modal when guard lands on duty without punch-in
  useEffect(() => {
    if (!loading && isAttendanceLocked) {
      setPunchModal((prev) => {
        if (!prev.open) {
          return { open: true, mode: "PUNCH_IN", forced: true };
        }
        return prev;
      });
    }
  }, [loading, isAttendanceLocked]);

  /* ── Guard Action Protection Interceptor ── */
  const handleProtectedAction = (actionCallback) => {
    if (isAttendanceLocked) {
      toast.warn(
        t("gdPunchInRequiredToast", "Duty check-in required. Please punch in first before performing gate operations.")
      );
      setPunchModal({ open: true, mode: "PUNCH_IN", forced: true });
      return;
    }
    if (typeof actionCallback === "function") {
      actionCallback();
    }
  };

  /* ── Security Radar (Overstaying Visitors) ──
     Pass-entered visitors use their configured allowed-time (dwell_minutes);
     legacy deliveries/cabs/services fall back to the 45-minute rule. */
  const overstayingVisitors = useMemo(() => {
    return visitors.filter((v) => {
      if (v.exit_time) return false;
      const type = (v.visitor_type || v.purpose || "").toUpperCase();
      const mins = getElapsedMinutes(v.entry_time);
      if (v.dwell_minutes) {
        return mins >= Number(v.dwell_minutes);
      }
      if (["DELIVERY", "CAB", "SERVICE"].includes(type)) {
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
        const flat = getFlatLabel(v, t).toLowerCase();
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
  }, [visitors, activeTab, overstayingVisitors, searchQuery, t]);

  /* ── Mark Visitor Exit Action ── */
  const handleConfirmExit = async () => {
    if (!exitTarget?.id) return;
    setExitLoading(true);
    try {
      await API.put(`/visitors/exit/${exitTarget.id}`);
      toast.success(t("gdExitLogged", { name: exitTarget.visitor_name }, "Exit logged for {name}"));
      setExitTarget(null);
      loadDashboardData(true);
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("gdExitFailed", "Failed to record visitor exit")
      );
    } finally {
      setExitLoading(false);
    }
  };

  /* ── Quick Explore Links (5 Links: Shift Log Book, Collection, Visitor Log, Parking, Emergency History) ── */
  const quickExploreLinks = [
    {
      id: "logbook",
      title: t("gdActionLogbook", "Shift Log Book"),
      desc: t("gdActionLogbookDesc", "Handover notes & duty records"),
      icon: MdHistoryEdu,
      path: "/guard/shift-logbook",
      color: "#6366F1",
      bg: "rgba(99, 102, 241, 0.15)",
      badgeColor: "bg-indigo-600 text-white",
    },
    {
      id: "collection",
      title: t("gdActionCollection", "Collection"),
      desc: t("gdActionCollectionDesc", "Parcel & courier drop-offs"),
      icon: MdOutlineCardGiftcard,
      path: "/guard/collection",
      color: "#DB2777",
      bg: "rgba(219, 39, 119, 0.15)",
      badgeColor: "bg-pink-600 text-white",
    },
    {
      id: "visitorlogs",
      title: t("gdActionVisitorLogs", "Visitor Log"),
      desc: t("gdActionVisitorLogsDesc", "Detailed visitor entry & exit logs"),
      icon: FaUserFriends,
      path: "/guard/visitorlogs",
      color: "#0284C7",
      bg: "rgba(2, 132, 199, 0.15)",
      badgeColor: "bg-sky-600 text-white",
    },
    {
      id: "parking",
      title: t("gdActionParking", "Parking"),
      desc: t("gdActionParkingDesc", "Visitor slots & vehicle plates"),
      icon: FaParking,
      path: "/guard/parking",
      color: "#9333EA",
      bg: "rgba(147, 51, 234, 0.15)",
      badgeColor: "bg-purple-600 text-white",
    },
    {
      id: "emergency-history",
      title: t("gdActionEmergencyHistory", "Emergency History"),
      desc: t("gdActionEmergencyHistoryDesc", "Past security incidents & SOS logs"),
      icon: MdWarning,
      path: "/guard/emergency-history",
      color: "#DC2626",
      bg: "rgba(220, 38, 38, 0.15)",
      badgeColor: "bg-red-600 text-white",
    },
  ];

  /* ── Gate Entry Management (5 Categories: Production Enterprise System) ── */
  const gateEntryCards = [
    {
      id: "guest",
      title: t("gdActionGuest", "Guest Entry"),
      subtitle: t("gdActionGuestDesc", "Friends, family & personal visitors"),
      pill: t("gdPillVisitor", "Visitor"),
      icon: FaUserFriends,
      path: "/guard/guest-entry",
      accentColor: "#6366F1", // Indigo
      accentBg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40",
      pillClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
      topBarClass: "bg-indigo-500",
      hoverBorder: "hover:border-indigo-500/40 dark:hover:border-indigo-400/40",
    },
    {
      id: "cab",
      title: t("gdActionCab", "Cab Entry"),
      subtitle: t("gdActionCabDesc", "Uber, Ola, BluSmart, taxis & autos"),
      pill: t("gdPillTaxi", "Taxi / Auto"),
      icon: MdLocalTaxi,
      path: "/guard/cab-entry",
      accentColor: "#D97706", // Amber
      accentBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40",
      pillClass: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
      topBarClass: "bg-amber-500",
      hoverBorder: "hover:border-amber-500/40 dark:hover:border-amber-400/40",
    },
    {
      id: "delivery",
      title: t("gdActionDelivery", "Delivery Entry"),
      subtitle: t("gdActionDeliveryDesc", "Zomato, Swiggy, Amazon & couriers"),
      pill: t("gdPillCourier", "Courier"),
      icon: FaTruck,
      path: "/guard/delivery-entry",
      accentColor: "#0284C7", // Sky blue
      accentBg: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200/60 dark:border-sky-800/40",
      pillClass: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/20",
      topBarClass: "bg-sky-500",
      hoverBorder: "hover:border-sky-500/40 dark:hover:border-sky-400/40",
    },
    {
      id: "service",
      title: t("gdActionService", "Service Entry"),
      subtitle: t("gdActionServiceDesc", "Plumbers, electricians & repair staff"),
      pill: t("gdPillTechnician", "Technician"),
      icon: FaTools,
      path: "/guard/service-entry",
      accentColor: "#9333EA", // Purple
      accentBg: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/40",
      pillClass: "bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20",
      topBarClass: "bg-purple-500",
      hoverBorder: "hover:border-purple-500/40 dark:hover:border-purple-400/40",
    },
    {
      id: "dailyhelp",
      title: t("gdActionDailyHelp", "Daily Help"),
      subtitle: t("gdActionDailyHelpDesc", "Maids, cooks, drivers & regular staff"),
      pill: t("gdPillStaff", "Staff"),
      icon: FaHandshake,
      path: "/guard/daily-help",
      accentColor: "#059669", // Emerald
      accentBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40",
      pillClass: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20",
      topBarClass: "bg-emerald-500",
      hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-400/40",
    },
  ];

  return (
    <div className="dash-kpi-scope space-y-6 w-full min-w-0 max-w-400 mx-auto pb-8 animate-fadeIn">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. DASHBOARD HERO HEADER (MATCHING ADMIN DASHBOARD)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="gd-hero-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-4 min-w-0">
          <UserAvatar
            name={profile?.name || t("gdGuard", "Security Officer")}
            src={profile?.profile_picture || profile?.profile_image || profile?.avatar}
            size={56}
            radius="50%"
            className="gd-hero-avatar shrink-0 ring-2 ring-blue-500/40 shadow-md"
          />

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
              {t("gdGuardPortal", "Guard Security Hub")} • {t("gdGateOpsTagline", "Gate Operations & Visitor Management")}
            </p>
          </div>
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
                ? t("gdOnDutyFormatted", { shift: shift?.shift_type || t("gdGeneral", "General") }, "On Duty ({shift})")
                : shift?.shift_type
                ? t("gdOffDutyShift", { shift: shift.shift_type, time: formatTime12h(shift.start_time) }, "Off Duty • {shift} at {time}")
                : t("gdOffDuty", "Off Duty")}
            </span>
          </div>

          {/* Attendance Punch Action Button */}
          {shift?.attendance?.status === "PUNCHED_IN" ? (
            <button
              onClick={() => setPunchModal({ open: true, mode: "PUNCH_OUT" })}
              className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-[transform,background-color,box-shadow] duration-200 ease-out hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 motion-reduce:transition-none"
            >
              <MdLogout size={16} />
              <span>{t("gdPunchOutBtn", "Punch Out")}</span>
            </button>
          ) : shift?.attendance?.status === "PUNCHED_OUT" ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500">
              <MdCheckCircle size={15} />
              <span>
                {t("gdShiftDone", "Shift Done")}
                {shift.attendance?.worked_minutes != null
                  ? ` (${Math.floor(shift.attendance.worked_minutes / 60)}h ${shift.attendance.worked_minutes % 60}m)`
                  : ""}
              </span>
            </div>
          ) : !isOnDuty ? (
            <button
              disabled
              className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-card-inner-bg/80 border border-glass-border text-secondary/50 cursor-not-allowed opacity-60 transition-colors duration-200 motion-reduce:transition-none"
              title={t("gdOffDutyPunchDisabled", "Off Duty - Punch In is only available during your shift window")}
            >
              <MdFingerprint size={16} />
              <span>{t("gdPunchInBtn", "Punch In")}</span>
            </button>
          ) : (
            <button
              onClick={() => setPunchModal({ open: true, mode: "PUNCH_IN" })}
              className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-[transform,background-color,box-shadow] duration-200 ease-out hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 motion-reduce:transition-none"
            >
              <MdFingerprint size={16} />
              <span>{t("gdPunchInBtn", "Punch In")}</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-card-inner-bg/80 hover:bg-card border border-glass-border text-secondary hover:text-primary transition shadow-sm hover:scale-105 active:scale-95"
            title={t("gdRefreshData", "Refresh Data")}
          >
            <MdRefresh size={18} className={refreshing ? "animate-spin text-accent" : ""} />
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. ATTENDANCE REQUIRED CHECK-IN BANNER (IF ON DUTY & NOT PUNCHED IN)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {shift && isOnDuty && (!shift?.attendance || shift?.attendance?.status === "NOT_PUNCHED_IN") && (
        <div className="gd-glass-card bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <MdFingerprint size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  {t("gdDutyCheckIn", "Duty Check-In Required")}
                </span>
                <span className="font-bold text-sm sm:text-base text-primary">
                  {shift.shift_type} {t("gdShiftActiveTitle", "Shift is Active")}
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">
                {t("gdPunchInPrompt", "Please complete your punch-in attendance with GPS and selfie photo to begin your security duties.")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setPunchModal({ open: true, mode: "PUNCH_IN" })}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-[transform,background-color,box-shadow] duration-200 ease-out hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 motion-reduce:transition-none flex items-center justify-center gap-2 shrink-0"
          >
            <MdFingerprint size={18} />
            <span>{t("gdPunchInNow", "Punch In Now")}</span>
          </button>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. ACTIVE EMERGENCY & SOS BANNER (IF ACTIVE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeAlerts.length > 0 && (
        <div
          onClick={() => setShowEmergencyModal(true)}
          className="gd-glass-card bg-red-500/15 border border-red-500/35 rounded-2xl p-5 text-red-500 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-red-500/20 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-red-500/10 animate-pulse"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <MdWarning size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-red-500 text-white px-2 py-0.5 rounded-md shadow-sm">
                  {t("gdEmergencyAlert", "Emergency Alert")}
                </span>
                <span className="font-bold text-sm sm:text-base">
                  {activeAlerts.length === 1
                    ? t("gdActiveIncidentOne", { count: activeAlerts.length }, "{count} Active Emergency Incident")
                    : t("gdActiveIncidentMany", { count: activeAlerts.length }, "{count} Active Emergency Incidents")}
                </span>
              </div>
              <p className="text-xs text-secondary mt-0.5">
                {activeAlerts[0]?.Flat
                  ? t("gdIncidentReported", { flat: getFlatLabel(activeAlerts[0], t) }, "Incident reported at {flat}. Click to view action protocol.")
                  : t("gdPanicActive", "Resident or gate panic alert is currently active.")}
              </p>
            </div>
          </div>

          <button className="btn-danger text-xs font-bold px-4 py-2 rounded-xl shrink-0 shadow-md">
            {t("gdOpenSosPanel", "Open SOS Panel")}
          </button>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. SECURITY RADAR (OVERSTAY DETECTION BANNER)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {overstayingVisitors.length > 0 && (
        <div className="gd-glass-card bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-amber-500/50 transition-all duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <MdOutlineTimer size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  {t("gdSecurityRadar", "Security Radar")}
                </span>
                <span className="font-bold text-sm sm:text-base text-primary">
                  {overstayingVisitors.length} Visitor{overstayingVisitors.length > 1 ? "s" : ""} Overstaying (&gt;45 mins)
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">
                {t("gdOverstayNote", "Delivery/cab/service entries exceeding allowable gate duration.")}
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
                      <strong>{ov.visitor_name}</strong> ({getVisitorTypeMeta(ov.visitor_type || ov.purpose, t).label}) • {getFlatLabel(ov, t)} •{" "}
                      <span className="font-bold text-red-500">{mins}m</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={reviewOverstays}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition self-start md:self-center shrink-0 hover:scale-105 active:scale-95"
          >
            {t("gdReviewOverstays", "Review Overstays")}
          </button>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. KEY METRICS KPI CARDS
          Shares the .dash-kpi-scope tile styling with the Admin dashboard:
          same padding, palette and glass hover physics.
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Migrated from .ad-kpi in Phase 2 batch 2A. Inside .dash-kpi-scope the
          scoped palette gave --guards/--residents/--complaints/--alerts blue,
          cyan, pink and lavender. Tones are remapped by meaning: notably
          "Active Alerts" becomes `danger`, which is what an emergency count
          should read as. All four are now real buttons, not click-only divs. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Inside Now */}
        <StatCard
          variant="sheen"
          tone="success"
          onClick={() => setActiveTab("INSIDE")}
          value={stats.inside}
          label={t("gdStatInside", "Visitors Inside")}
          description={
            <span className="hidden lg:block">
              {t("gdKpiInsideDesc", "Active on society premises")}
            </span>
          }
        />

        {/* Total Today */}
        <StatCard
          variant="sheen"
          tone="brand"
          onClick={() => setActiveTab("ALL")}
          value={stats.today}
          label={t("gdStatToday", "Total Today")}
          description={
            <span className="hidden lg:block">
              {t("gdKpiTodayDesc", "All visitor entries today")}
            </span>
          }
        />

        {/* Exited Today */}
        <StatCard
          variant="sheen"
          tone="info"
          onClick={() => setActiveTab("ALL")}
          value={stats.exited}
          label={t("gdStatExited", "Exited Today")}
          description={
            <span className="hidden lg:block">
              {t("gdKpiExitedDesc", "Departed via gate checkout")}
            </span>
          }
        />

        {/* Emergency Count */}
        <StatCard
          variant="sheen"
          tone="danger"
          onClick={() => setShowEmergencyModal(true)}
          value={activeAlerts.length}
          label={t("gdStatAlerts", "Active Alerts")}
          description={
            <span className="hidden lg:block">
              {activeAlerts.length > 0
                ? t("gdKpiAlertsAttention", "Immediate attention needed")
                : t("gdKpiAlertsNormal", "All systems normal")}
            </span>
          }
        />
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. 50/50 SPLIT: GATE ENTRY MANAGEMENT (50%) & LIVE GATE VISITORS STREAM (50%)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ─── Column 1 (50%): Gate Entry Management (Mobile App-Styled Cards, No Popups) ─── */}
        <div className="gd-glass-card rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* ── Section Header ── */}
            <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-divider">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 border border-accent/20 shadow-xs">
                  <MdLogin size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-primary tracking-tight truncate">
                      {t("gdGateEntryManagement", "Gate Entry Management")}
                    </h2>
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20">
                      5 Categories
                    </span>
                  </div>
                  <p className="text-xs text-secondary truncate mt-0.5">
                    {t("gdGateEntryManagementSub", "Select a visitor category to authorize entry.")}
                  </p>
                </div>
              </div>

              <span className="sm:hidden px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20 shrink-0">
                5 Categories
              </span>
            </div>

            {/* ── Responsive Category Cards: Desktop (3 in Row 1, 2 in Row 2), Tablet (2 cols), Mobile (1 col) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-3.5 my-1">
              {/* Row 1: 3 Cards (Guest, Cab, Delivery) */}
              {gateEntryCards.slice(0, 3).map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleProtectedAction(() => navigate(card.path))}
                    className={`col-span-1 sm:col-span-1 lg:col-span-2 relative overflow-hidden rounded-xl p-4 border border-divider/80 ${card.hoverBorder} bg-card hover:bg-card-hover/90 text-left transition-all duration-200 ease-out flex flex-col justify-between group cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none min-h-[148px]`}
                  >
                    {/* Top Accent Line */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-[2.5px] ${card.topBarClass} opacity-80 group-hover:opacity-100 transition-opacity duration-200`}
                    />

                    {/* Top Row: Icon + Badge & Action Affordance */}
                    <div className="flex items-center justify-between gap-2 w-full mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${card.accentBg} flex items-center justify-center shrink-0 border shadow-xs group-hover:scale-105 transition-transform duration-200`}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${card.pillClass}`}
                        >
                          {card.pill}
                        </span>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-secondary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200">
                          <MdChevronRight size={17} />
                        </div>
                      </div>
                    </div>

                    {/* Content: Title & Description */}
                    <div>
                      <h3 className="text-sm font-semibold text-primary group-hover:text-primary transition-colors tracking-tight leading-snug">
                        {card.title}
                      </h3>
                      <p className="text-xs text-secondary mt-1 leading-relaxed line-clamp-2">
                        {card.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Row 2: 2 Cards (Service, Daily Help) */}
              {gateEntryCards.slice(3, 5).map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleProtectedAction(() => navigate(card.path))}
                    className={`col-span-1 ${idx === 1 ? "sm:col-span-2" : "sm:col-span-1"} lg:col-span-3 relative overflow-hidden rounded-xl p-4 border border-divider/80 ${card.hoverBorder} bg-card hover:bg-card-hover/90 text-left transition-all duration-200 ease-out flex flex-col justify-between group cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none min-h-[148px]`}
                  >
                    {/* Top Accent Line */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-[2.5px] ${card.topBarClass} opacity-80 group-hover:opacity-100 transition-opacity duration-200`}
                    />

                    {/* Top Row: Icon + Badge & Action Affordance */}
                    <div className="flex items-center justify-between gap-2 w-full mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${card.accentBg} flex items-center justify-center shrink-0 border shadow-xs group-hover:scale-105 transition-transform duration-200`}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${card.pillClass}`}
                        >
                          {card.pill}
                        </span>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-secondary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200">
                          <MdChevronRight size={17} />
                        </div>
                      </div>
                    </div>

                    {/* Content: Title & Description */}
                    <div>
                      <h3 className="text-sm font-semibold text-primary group-hover:text-primary transition-colors tracking-tight leading-snug">
                        {card.title}
                      </h3>
                      <p className="text-xs text-secondary mt-1 leading-relaxed line-clamp-2">
                        {card.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Section Footer: Security Note & View Logs ── */}
          <div className="mt-4 pt-3.5 border-t border-divider flex items-center justify-between gap-3 text-xs text-secondary">
            <span className="flex items-center gap-1.5 min-w-0 text-secondary">
              <MdShield size={14} className="text-accent shrink-0" />
              <span className="truncate">{t("gdSecureLogging", "Real-time entry timestamps & flat verification")}</span>
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-accent hover:text-accent-hover hover:underline shrink-0 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded transition-colors"
              onClick={() => navigate("/guard/visitorlogs")}
              aria-label={t("gdViewAllLogs", "View Logs")}
            >
              <span>{t("gdViewAllLogs", "View Logs")}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* ─── Column 2 (50%): Live Gate Activity Stream & Visitors Log ─── */}
        <div ref={visitorStreamRef} className="gd-glass-card rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header (Title on left, Refresh + Search triggers on right) */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-divider">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="gd-live-badge shrink-0">
                  <span className="gd-live-dot" />
                  LIVE
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-primary truncate">
                    {t("gdGateStream", "Live Gate Visitors Stream")}
                  </h2>
                  <p className="text-xs text-secondary truncate">
                    {stats.inside === 1
                      ? t("gdAutoRefreshOne", { count: stats.inside }, "Auto-refresh · 1 inside now")
                      : t("gdAutoRefreshMany", { count: stats.inside }, `Auto-refresh · ${stats.inside} inside now`)}
                  </p>
                </div>
              </div>

              {/* Header Actions: Search & Refresh */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(!isSearchOpen);
                    if (!isSearchOpen) {
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    } else {
                      setSearchQuery("");
                    }
                  }}
                  className={`p-2 rounded-xl border transition flex items-center gap-1 shadow-sm ${
                    isSearchOpen || searchQuery
                      ? "bg-accent/15 border-accent text-accent"
                      : "bg-card-inner-bg hover:bg-card border-glass-border text-secondary hover:text-primary"
                  }`}
                  title={t("gdSearchLive", "Search Live Visitors")}
                >
                  <MdSearch size={16} />
                  {searchQuery && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                </button>

                <button
                  type="button"
                  onClick={() => loadDashboardData(true)}
                  disabled={loading}
                  title={t("gdRefreshLive", "Refresh live data")}
                  className="p-2 rounded-xl bg-card-inner-bg hover:bg-card border border-glass-border text-secondary hover:text-primary transition shadow-sm disabled:opacity-60"
                >
                  <MdRefresh size={16} className={`text-accent ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Search Input Bar (when open) */}
            {isSearchOpen && (
              <div className="relative flex items-center w-full animate-fadeIn mt-3">
                <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
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
                  placeholder={t("gdSearchPlaceholder", "Search visitor, phone, flat, vehicle...")}
                  className="w-full pl-9 pr-14 py-2 rounded-xl text-xs bg-card-inner-bg border border-accent/40 text-primary placeholder-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 text-secondary hover:text-primary transition"
                      title={t("gdClear", "Clear")}
                    >
                      <MdClose size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="p-1 text-secondary hover:text-rose-500 transition"
                    title={t("gdCloseSearch", "Close Search")}
                  >
                    <MdClose size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Toolbar: Segmented Filter Tabs */}
            <div className="mt-3">
              <div className="flex items-center p-1 rounded-xl bg-card-inner-bg border border-glass-border w-full">
                <button
                  onClick={() => setActiveTab("INSIDE")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeTab === "INSIDE"
                      ? "bg-card text-accent shadow-sm"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <span>{t("gdTabInside", "Inside Now")}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    {stats.inside}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("OVERSTAY")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeTab === "OVERSTAY"
                      ? "bg-card text-amber-500 shadow-sm"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <span>{t("gdTabOverstay", "Overstaying")}</span>
                  {overstayingVisitors.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                      {overstayingVisitors.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeTab === "ALL"
                      ? "bg-card text-accent shadow-sm"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <span>{t("gdTabAll", "All Today")}</span>
                  <span className="text-[10px] text-secondary font-semibold">({stats.today})</span>
                </button>
              </div>
            </div>

            {/* Visitors List / Empty State */}
            <div className="mt-3">
              {loading ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium text-secondary">{t("gdLoadingVisitors", "Loading live visitors data...")}</p>
                </div>
              ) : filteredVisitors.length === 0 ? (
                <div className="py-10 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <MdCheckCircle size={26} />
                  </div>
                  <h3 className="text-sm font-bold text-primary">
                    {searchQuery
                      ? t("gdEmptyMatching", "No matching visitors found")
                      : activeTab === "OVERSTAY"
                      ? t("gdEmptyOverstay", "No overstaying visitors on premises")
                      : activeTab === "INSIDE"
                      ? t("gdEmptyInside", "No active visitors inside right now")
                      : t("gdEmptyAll", "No visitor records today")}
                  </h3>
                  <p className="text-xs text-secondary max-w-xs mx-auto">
                    {activeTab === "INSIDE"
                      ? t("gdEmptyInsideSub", "All visitors have departed or no entries yet today.")
                      : t("gdEmptyAllSub", "Gate activity is all clear and logged.")}
                  </p>
                </div>
              ) : (
                <div className="gd-stream-rows space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredVisitors.map((v, index) => {
                    const meta = getVisitorTypeMeta(v.visitor_type || v.purpose, t);
                    const Icon = meta.icon;
                    const isInside = !v.exit_time;
                    const elapsedMins = getElapsedMinutes(v.entry_time);
                    const dwellLimit = v.dwell_minutes ? Number(v.dwell_minutes) : 45;
                    const isOverstay =
                      isInside &&
                      (v.dwell_minutes ||
                        ["DELIVERY", "CAB", "SERVICE"].includes((v.visitor_type || v.purpose || "").toUpperCase())) &&
                      elapsedMins >= dwellLimit;

                    return (
                      <div
                        key={v.id}
                        style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                        className={`gd-stream-row relative overflow-hidden rounded-xl p-3 border border-glass-border bg-card-inner-bg/60 hover:bg-card-inner-bg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isOverstay ? "gd-stream-row--overstay border-amber-500/40" : ""
                        }`}
                      >
                        <span className="gd-stream-accent" style={{ background: meta.color }} />

                        {/* Visitor Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="gd-stream-avatar shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: meta.bg, color: meta.color }}
                          >
                            <Icon size={16} />
                            {isInside && (
                              <span
                                className="gd-stream-live-dot"
                                style={{ background: isOverstay ? "#f59e0b" : "#10b981" }}
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-primary truncate max-w-[140px] sm:max-w-none">
                                {v.visitor_name || t("gdGuestVisitor", "Guest Visitor")}
                              </span>

                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1"
                                style={{
                                  backgroundColor: meta.bg,
                                  color: meta.color,
                                  borderColor: meta.border,
                                }}
                              >
                                {meta.label}
                              </span>

                              {isInside && !isOverstay && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  {t("gdInside", "Inside")}
                                </span>
                              )}

                              {isOverstay && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm animate-pulse">
                                  {t("gdOverstayBadge", { mins: elapsedMins }, "Overstay {mins}m")}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-secondary mt-1 flex-wrap">
                              <span className="flex items-center gap-1 text-primary font-medium truncate">
                                <MdApartment className="text-accent shrink-0" size={13} />
                                <span className="truncate">{getFlatLabel(v, t)}</span>
                              </span>

                              {v.visitor_phone && (
                                <>
                                  <span className="text-secondary">•</span>
                                  <span className="flex items-center gap-1">
                                    <MdPhone size={11} />
                                    {v.visitor_phone}
                                  </span>
                                </>
                              )}

                              {(v.vehicle_number || v.vehicle_no) && (
                                <>
                                  <span className="text-secondary">•</span>
                                  <span className="font-mono uppercase bg-card-inner-bg border border-glass-border px-1 py-0.2 rounded text-[10px] font-bold">
                                    {v.vehicle_number || v.vehicle_no}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Metadata & Action */}
                        <div className="flex items-center gap-2.5 justify-between sm:justify-end shrink-0 pl-1 sm:pl-0 border-t sm:border-t-0 border-glass-border pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <div className="flex items-center gap-1 justify-start sm:justify-end">
                              <MdAccessTime size={11} className="text-secondary" />
                              <p className="text-[11px] font-bold text-primary">
                                {new Date(v.entry_time).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </p>
                            </div>
                            <p className="text-[10px] text-secondary">
                              {isInside ? (
                                <span className={`font-semibold ${isOverstay ? "text-amber-500" : "text-emerald-500"}`}>
                                  {formatElapsedStr(elapsedMins, t)}
                                </span>
                              ) : (
                                <span>
                                  {t("gdLeftAt", "Left at")}{" "}
                                  {new Date(v.exit_time).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </span>
                              )}
                            </p>
                          </div>

                          {isInside ? (
                            <button
                              onClick={() => handleProtectedAction(() => setExitTarget(v))}
                              disabled={exitLoading}
                              className="btn-danger px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95 transition"
                            >
                              <MdLogout size={13} />
                              <span>{t("gdMarkExit", "Mark Exit")}</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/25 flex items-center gap-1">
                              <MdCheckCircle size={13} />
                              {t("gdExited", "Exited")}
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

          {/* Col 2 Card Footer: Stream Status & Quick Log Link */}
          <div className="mt-4 pt-3 border-t border-divider flex items-center justify-between text-xs text-secondary">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">{t("gdLiveFeedActive", "Live gate sync · Auto updates on entry")}</span>
            </span>
            <button
              type="button"
              className="text-[11px] font-semibold text-accent hover:underline shrink-0 ml-2"
              onClick={() => navigate("/guard/visitorlogs")}
            >
              {t("gdFullHistory", "Full History →")}
            </button>
          </div>
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
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <MdLogout size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">{t("gdConfirmExitTitle", "Confirm Gate Exit")}</h3>
                <p className="text-xs text-secondary">{t("gdConfirmExitSub", "Record official visitor exit timestamp")}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card-inner-bg border border-glass-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">{t("gdFieldVisitor", "Visitor Name:")}</span>
                <span className="font-bold text-primary">{exitTarget.visitor_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">{t("gdFieldDestination", "Destination:")}</span>
                <span className="font-bold text-primary">{getFlatLabel(exitTarget, t)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">{t("gdFieldEntryType", "Entry Type:")}</span>
                <span className="font-bold uppercase text-accent">
                  {getVisitorTypeMeta(exitTarget.visitor_type || exitTarget.purpose, t).label}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-secondary font-medium">{t("gdFieldTimeInside", "Time Inside:")}</span>
                <span className="font-bold text-emerald-500">
                  {formatElapsedStr(getElapsedMinutes(exitTarget.entry_time), t)}
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
                    <span>{t("gdConfirmExit", "Confirm Exit")}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setExitTarget(null)}
                disabled={exitLoading}
                className="btn-primary py-2 px-4 rounded-xl text-xs font-bold"
              >
                {t("cancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8. ATTENDANCE PUNCH MODAL (IN / OUT)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <GuardPunchModal
        isOpen={punchModal.open}
        mode={punchModal.mode}
        isOnDuty={isOnDuty}
        forced={punchModal.forced || isAttendanceLocked}
        onClose={() => setPunchModal({ open: false, mode: "PUNCH_IN", forced: false })}
        onLogout={() => {
          localStorage.clear();
          navigate("/login");
        }}
        onSuccess={() => loadDashboardData(true)}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          9. EMERGENCY / SOS MODAL
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
