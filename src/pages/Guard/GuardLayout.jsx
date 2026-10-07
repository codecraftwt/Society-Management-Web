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
  const [showEmergency, setShowEmergency] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const socket = getSocket();

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
          actions={
            <>
              {location.pathname !== base && (
                <button
                  type="button"
                  onClick={() => navigate(base)}
                  className="inline-flex items-center justify-center h-9 px-3 rounded-xl border border-glass-border bg-card-inner-bg text-primary text-xs font-semibold gap-1.5 transition-all duration-200 ease-out hover:bg-card hover:border-accent/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={t("back", "Back")}
                  aria-label={t("back", "Back")}
                >
                  <MdArrowBack size={16} />
                  <span>{t("back", "Back")}</span>
                </button>
              )}
              <button
                onClick={() => setShowEmergency(true)}
                className={`relative flex items-center justify-center h-9 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-red-500/30 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${
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
            </>
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
