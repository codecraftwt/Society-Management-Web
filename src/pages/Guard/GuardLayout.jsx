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
  MdQrCodeScanner,
} from "react-icons/md";
import API from "../../services/api";
import GuardEmergencyModal from "../../components/guard/GuardEmergencyModal";
import NotificationBell from "../../components/common/NotificationBell";
import useEmergencyAlerts from "../../hooks/useEmergencyAlerts";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";
import { useRoleTheme } from "../../context/ThemeContext";
import "./Guard.css";

function GuardLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  useRoleTheme();

  const base = "/guard";

  const { alerts, refresh: refreshEmergencies } = useEmergencyAlerts();
  const [shift, setShift] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [acknowledgingShiftEnd, setAcknowledgingShiftEnd] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const socket = getSocket();

  /* Load guard shift */
  const loadShift = async () => {
    try {
      const [res, attendanceRes] = await Promise.all([
        API.get("/guard-shift/my").catch(() => null),
        API.get("/guard-attendance/today").catch(() => null),
      ]);
      if (res?.data) {
        setShift(res.data?.data || res.data);
      }
      setAttendance(attendanceRes?.data?.attendance || null);
    } catch (e) {
      console.error("Guard layout shift fetch error:", e);
    }
  };

  const acknowledgeShiftEnd = async () => {
    if (!attendance?.id || acknowledgingShiftEnd) return;
    setAcknowledgingShiftEnd(true);
    try {
      await API.post(`/guard-attendance/${attendance.id}/acknowledge`);
      await loadShift();
    } catch (error) {
      console.error("Failed to acknowledge shift end:", error);
    } finally {
      setAcknowledgingShiftEnd(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(loadShift, 0);
    window.addEventListener("refresh_guard_data", loadShift);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("refresh_guard_data", loadShift);
    };
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
      } catch {
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

  /* Socket listener */
  useEffect(() => {
    if (!socket) return;

    // Room assignment (user_/role_/society_) is handled by the shared socket in
    // services/socket.js from the verified handshake. Emitting `join` again
    // here only produced duplicate room-join logs on the server.

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
      className="guard-root h-screen overflow-hidden bg-app flex"
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
          showMenuButton={false}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/guard/gatepass")}
                className="relative flex items-center justify-center h-9 px-3 rounded-xl bg-accent hover:opacity-90 text-white font-bold text-xs gap-1.5 shadow-md shadow-accent/25 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 cursor-pointer"
                title="Gate Pass Scan"
              >
                <MdQrCodeScanner size={17} />
                <span className="hidden sm:inline">Scan</span>
              </button>
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
            </div>
          }
          onLogout={() => setShowLogoutConfirm(true)}
          settingsPath={`${base}/settings`}
        />

        {/* PAGE CONTENT */}
        <main className={`flex-1 overflow-y-auto overflow-x-clip scrollbar-hide px-3 sm:px-4 lg:px-6 ${location.pathname === "/guard/gatepass" ? "py-2 sm:py-3 lg:py-4" : "py-4 sm:py-6 lg:py-8"}`}>
          {attendance?.shift_end_notified_at && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm">
              <div>
                <p className="font-bold text-primary">
                  {attendance.status === "PUNCHED_OUT" ? "Shift ended" : "Your shift is ending"}
                </p>
                <p className="text-secondary">
                  {attendance.status === "PUNCHED_OUT"
                    ? attendance.is_auto_punch_out
                      ? "Your shift was automatically punched out after the response window expired."
                      : "You punched out manually after the shift ended."
                    : "Punch out now, or confirm that you are still working."}
                </p>
              </div>
              {attendance.status === "PUNCHED_IN" && !attendance.acknowledged_at && (
                <button
                  type="button"
                  onClick={acknowledgeShiftEnd}
                  disabled={acknowledgingShiftEnd}
                  className="rounded-xl border border-amber-500 px-3 py-2 font-bold text-amber-600 disabled:opacity-50"
                >
                  {acknowledgingShiftEnd ? "Saving…" : "Still working"}
                </button>
              )}
            </div>
          )}
          {location.pathname !== base && location.pathname !== "/guard/gatepass" && (
            <button
              type="button"
              onClick={() => navigate(base)}
              className="guard-back-btn"
              aria-label={t("back", "Back")}
              title={t("back", "Back")}
            >
              <MdArrowBack size={17} />
              <span>{t("back", "Back")}</span>
            </button>
          )}
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
        onRefresh={refreshEmergencies}
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
