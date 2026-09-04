import { getSocket } from "../../services/socket";
import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaUserFriends, FaTruck, FaParking } from "react-icons/fa";
import {
  MdMenu,
  MdLogout,
  MdDashboard,
  MdLocalTaxi,
  MdSettings,
  MdHistory,
  MdOutlineCardGiftcard,
  MdWarning,
  MdVerified,
  MdOutlineContactSupport,
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

function GuardLayoutInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { openMobile } = useSidebar();

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
      label: "Help & Contacts",
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
          <>
            {t("guardPanelLabel") || "Guard"}<span className="text-accent">{t("panelSuffix") || " Panel"}</span>
          </>
        }
        brandSubtitle="Security View"
        base="/guard"
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={t("guardDashboardTitle")}
          subtitle={t("guardDashboardSubtitle")}
          actions={
            alerts.length > 0 && (
              <button
                onClick={() => setShowEmergency(true)}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/30 animate-pulse transition"
                title={t("adminActiveEmergencies")}
              >
                <MdWarning size={18} className="text-white" />
                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold min-w-4.5 h-4.5 flex items-center justify-center rounded-full leading-none px-1">
                  {alerts.length}
                </span>
              </button>
            )
          }
          onLogout={() => setShowLogoutConfirm(true)}
        />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-8">
          <div className="bg-card p-4 sm:p-6 rounded-xl">
            <Outlet />
          </div>
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
              className="p-8 rounded-2xl w-[90%] max-w-sm text-center animate-scaleIn"
              style={{
                background: "var(--card-bg)",
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
