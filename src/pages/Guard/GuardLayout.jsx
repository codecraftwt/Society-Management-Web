import { getSocket } from "../../services/socket";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaUserFriends, FaTruck, FaParking, FaTools, FaHandshake } from "react-icons/fa";
import {
  MdMenu,
  MdLogout,
  MdDashboard,
  MdLocalTaxi,
  MdSettings,
  MdHistory,
  MdHistoryEdu,
  MdOutlineCardGiftcard,
  MdWarning,
  MdVerified,
  MdOutlineContactSupport,
  MdArrowBack,
} from "react-icons/md";
import API from "../../services/api";
import GuardEmergencyModal from "../../components/guard/GuardEmergencyModal";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";
import { useRoleTheme } from "../../context/ThemeContext";
import "./Guard.css";

function GuardLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const { openMobile } = useSidebar();
  useRoleTheme();

  const base = "/guard";

  const [alerts, setAlerts] = useState([]);
  const [shift, setShift] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const socket = getSocket();

  /* Load guard shift */
  const loadShift = async () => {
    try {
      const res = await API.get("/guard-shift/my").catch(() => null);
      if (res?.data) {
        setShift(res.data?.data || res.data);
      }
    } catch (e) {
      console.error("Guard layout shift fetch error:", e);
    }
  };

  useEffect(() => {
    loadShift();
    window.addEventListener("refresh_guard_data", loadShift);
    return () => window.removeEventListener("refresh_guard_data", loadShift);
  }, []);

  /* Enforce Punch-In before accessing gate operations subroutes */
  useEffect(() => {
    if (!shift || !shift.shift_type) return;

    let isDuty = typeof shift.isOnDuty === "boolean" ? shift.isOnDuty : false;
    if (!isDuty && shift.start_time && shift.end_time) {
      try {
        const [sh, sm] = shift.start_time.split(":").map(Number);
        const [eh, em] = shift.end_time.split(":").map(Number);
        const d = new Date();
        const curMinutes = d.getHours() * 60 + d.getMinutes();
        const startMinutes = sh * 60 + (sm || 0);
        const endMinutes = eh * 60 + (em || 0);
        isDuty =
          startMinutes <= endMinutes
            ? curMinutes >= startMinutes && curMinutes < endMinutes
            : curMinutes >= startMinutes || curMinutes < endMinutes;
      } catch (e) {
        isDuty = false;
      }
    }

    const isPunchedIn =
      shift?.attendance?.status === "PUNCHED_IN" ||
      Boolean(shift?.attendance?.punch_in && shift?.attendance?.status !== "NOT_PUNCHED_IN");
    const isPunchedOut = shift?.attendance?.status === "PUNCHED_OUT";
    const isLocked = isDuty && !isPunchedIn && !isPunchedOut;

    if (
      isLocked &&
      location.pathname !== "/guard" &&
      location.pathname !== "/guard/settings" &&
      location.pathname !== "/guard/help-contacts"
    ) {
      navigate("/guard", { replace: true });
    }
  }, [shift, location.pathname, navigate]);

  const menu = [
    {
      label: t("guardMenuDashboard"),
      path: "/guard",
      icon: MdDashboard,
      group: "OVERVIEW",
    },
    {
      label: t("guardMenuGuest"),
      path: "/guard/guest-entry",
      icon: FaUserFriends,
      group: "GATE OPERATIONS",
    },
    {
      label: t("guardMenuCab"),
      path: "/guard/cab-entry",
      icon: MdLocalTaxi,
      group: "GATE OPERATIONS",
    },
    {
      label: t("guardMenuDelivery"),
      path: "/guard/delivery-entry",
      icon: FaTruck,
      group: "GATE OPERATIONS",
    },
    {
      label: t("guardMenuService", "Service Entry"),
      path: "/guard/service-entry",
      icon: FaTools,
      group: "GATE OPERATIONS",
    },
    {
      label: t("guardMenuDailyHelp", "Daily Help"),
      path: "/guard/daily-help",
      icon: FaHandshake,
      group: "GATE OPERATIONS",
    },
    {
      label: t("guardMenuShiftLogbook", "Shift Log Book"),
      path: "/guard/shift-logbook",
      icon: MdHistoryEdu,
      group: "LOGS & RECORDS",
    },
    {
      label: t("guardMenuCollection"),
      path: "/guard/collection",
      icon: MdOutlineCardGiftcard,
      group: "LOGS & RECORDS",
    },
    {
      label: t("guardMenuVisitorLogs"),
      path: "/guard/visitorlogs",
      icon: MdHistory,
      group: "LOGS & RECORDS",
    },
    {
      label: t("guardMenuGatePass"),
      path: "/guard/gatepass",
      icon: MdVerified,
      group: "LOGS & RECORDS",
    },
    {
      label: t("guardMenuParking"),
      path: "/guard/parking",
      icon: FaParking,
      group: "LOGS & RECORDS",
    },
    {
      label: t("guardMenuEmergency"),
      path: "/guard/emergency-history",
      icon: MdWarning,
      group: "LOGS & RECORDS",
    },
    {
      label: t("guardMenuSettings"),
      path: "/guard/settings",
      icon: MdSettings,
      group: "SUPPORT & SETTINGS",
    },
    {
      label: t("guardMenuHelp"),
      path: "/guard/help-contacts",
      icon: MdOutlineContactSupport,
      group: "SUPPORT & SETTINGS",
    },
  ];

  /* Load emergencies */
  const loadEmergencies = async () => {
    try {
      const r = await API.get("/emergency/active");
      setAlerts(r.data || []);
    } catch (e) {
      console.error("Emergency fetch failed", e);
    }
  };

  useEffect(() => {
    loadEmergencies();
    const id = setInterval(loadEmergencies, 5000);
    return () => clearInterval(id);
  }, []);

  /* Socket join + listener */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!socket || !user?.id) return;

    socket.emit("join", {
      userId: user.id,
      role: user.role,
      societyId: user.society_id,
    });

    const handleNotification = () => {
      window.dispatchEvent(new Event("refresh_guard_data"));
    };

    socket.on("new_notification", handleNotification);
    return () => socket.off("new_notification", handleNotification);
  }, [socket]);

  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div
      className="h-screen overflow-hidden bg-app flex"
      style={{ color: "var(--text-primary)" }}
    >
      {/* ── REUSABLE SIDEBAR ── */}
      <Sidebar
        menu={menu}
        brandTitle={
          <span className="text-accent">
            {t("guardPanelLabel") || "Guard"}
            {t("panelSuffix") || " Panel"}
          </span>
        }
        brandSubtitle={t("sbViewGuard")}
        base={base}
        defaultOpenGroups={["SUPPORT & SETTINGS"]}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={null}
          subtitle={null}
          onBack={location.pathname !== base ? () => navigate(base) : null}
          actions={
            <button
              onClick={() => setShowEmergency(true)}
              className={`relative flex items-center justify-center h-9 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-red-500/30 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 cursor-pointer ${
                alerts.length > 0 ? "animate-pulse ring-2 ring-red-400" : ""
              }`}
              title="Emergency & SOS Center"
            >
              <MdWarning size={17} className="text-white" />
              <span>SOS</span>
              {alerts.length > 0 && (
                <span className="bg-white text-red-600 text-[10px] font-extrabold min-w-4.5 h-4.5 flex items-center justify-center rounded-full leading-none px-1">
                  {alerts.length}
                </span>
              )}
            </button>
          }
          onLogout={() => setShowLogoutConfirm(true)}
          settingsPath={`${base}/settings`}
        />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-clip scrollbar-hide py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
          <Outlet />
        </main>
      </div>

      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center animate-fadeIn"
            style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)", zIndex: 1200 }}
            onClick={() => setShowLogoutConfirm(false)}
          >
            <div
              className="acct-logout-card p-8 rounded-2xl w-[90%] max-w-sm text-center animate-scaleIn"
              style={{
                background: "var(--modal-bg)",
                border: "1.5px solid var(--glass-border)",
                boxShadow: "var(--shadow-glass)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {t("confirmLogout")}
              </h2>
              <p className="text-secondary text-sm mb-6">
                {t("guardLogoutMsg")}
              </p>
              <div className="flex justify-center gap-4">
                <button onClick={confirmLogout} className="btn-danger">
                  {t("yesLogout")}
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="btn-primary"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* EMERGENCY MODAL */}
      <GuardEmergencyModal
        alerts={alerts}
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        onRefresh={loadEmergencies}
      />
    </div>
  );
}

export default function GuardLayout() {
  return (
    <LanguageProvider role="guard">
      <GuardLayoutInner />
    </LanguageProvider>
  );
}
