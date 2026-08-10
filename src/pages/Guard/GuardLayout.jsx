import { getSocket } from "../../services/socket";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaUserFriends, FaTruck, FaParking } from "react-icons/fa";
import {
  MdMenu, MdClose, MdLogout, MdDashboard, MdLocalTaxi,
  MdSettings, MdHistory, MdOutlineCardGiftcard, MdWarning, MdVerified,MdOutlineContactSupport
} from "react-icons/md";
import API from "../../services/api";
import GuardEmergencyModal from "../../components/guard/GuardEmergencyModal";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
function GuardLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t }    = useLang();

  const [mobileMenu,        setMobileMenu]        = useState(false);
  const [alerts,            setAlerts]            = useState([]);
  const [showEmergency,     setShowEmergency]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const socket = getSocket();

  const menu = [
    { label: t("guardMenuDashboard"),   path: "/guard",                  icon: MdDashboard           },
    { label: t("guardMenuGuest"),       path: "/guard/guest-entry",      icon: FaUserFriends         },
    { label: t("guardMenuCab"),         path: "/guard/cab-entry",        icon: MdLocalTaxi           },
    { label: t("guardMenuDelivery"),    path: "/guard/delivery-entry",   icon: FaTruck               },
    { label: t("guardMenuCollection"),  path: "/guard/collection",       icon: MdOutlineCardGiftcard },
    { label: t("guardMenuVisitorLogs"), path: "/guard/visitorlogs",      icon: MdHistory             },
    { label: t("guardMenuSettings"),    path: "/guard/settings",         icon: MdSettings            },
    { label: t("guardMenuEmergency"),   path: "/guard/emergency-history",icon: MdWarning             },
    { label: t("guardMenuGatePass"),    path: "/guard/gatepass",         icon: MdVerified            },
    { label: t("guardMenuParking"),     path: "/guard/parking",          icon: FaParking             },
    {label:"Help & Contacts", path:"/guard/help-contacts", icon:MdOutlineContactSupport}
  ];

  /* ── Load emergencies ── */
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

  /* ── Socket join + listener ── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!socket || !user?.id) return;

    socket.emit("join", {
      userId:   user.id,
      role:     user.role,
      societyId: user.society_id,
    });

    const handleNotification = () => {
      window.dispatchEvent(new Event("refresh_guard_data"));
    };

    socket.on("new_notification", handleNotification);
    return () => socket.off("new_notification", handleNotification);
  }, []);

  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div
      className="h-screen overflow-hidden bg-app flex"
      style={{ color: "var(--text-primary)" }}
    >

      {/* ══════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-sidebar p-6 flex-col z-40">
        <h2 className="text-xl font-semibold mb-8" style={{ color: "var(--text-primary)" }}>
          {t("guardPanelLabel")}
          <span className="text-accent">{t("panelSuffix")}</span>
        </h2>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
          {menu.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`sidebar-link ${location.pathname === path ? "active" : ""}`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="btn-danger mt-6"
        >
          <MdLogout size={18} /> {t("logout")}
        </button>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════ */}
      <div className="flex-1 md:ml-64 flex flex-col">

        {/* NAVBAR */}
        <header
          className="h-16 bg-navbar flex items-center justify-between px-4 md:px-6 z-30 shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div>
            <h1 className="font-medium" style={{ color: "var(--text-primary)" }}>
              {t("guardDashboardTitle")}
            </h1>
            <p className="text-xs text-secondary">{t("guardDashboardSubtitle")}</p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSelector compact />
            <NotificationBell />

            {alerts.length > 0 && (
              <button
                onClick={() => setShowEmergency(true)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full
                           bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/40 animate-pulse transition"
                title={t("adminActiveEmergencies")}
              >
                <MdWarning size={18} className="text-white" />
                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px]
                                 font-bold min-w-4.5 h-4.5 flex items-center justify-center
                                 rounded-full leading-none px-1">
                  {alerts.length}
                </span>
              </button>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenu(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl"
              style={{
                background: "var(--card-inner-bg)",
                border: "1.5px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <MdMenu size={20} />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-8">
          <div className="bg-card p-4 sm:p-6 rounded-xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════ */}
      {mobileMenu && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setMobileMenu(false)}
        >
          <div
            className="bg-sidebar w-64 h-full p-6 flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* drawer header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {t("guardPanelLabel")}
                <span className="text-accent">{t("panelSuffix")}</span>
              </h2>
              <button
                onClick={() => setMobileMenu(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--card-inner-bg)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <MdClose size={18} />
              </button>
            </div>

            {/* drawer nav */}
            <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
              {menu.map(({ label, path, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenu(false)}
                  className={`sidebar-link ${location.pathname === path ? "active" : ""}`}
                >
                  <Icon size={18} /> {label}
                </Link>
              ))}
            </nav>

            {/* drawer logout */}
            <button
              onClick={() => {
                setShowLogoutConfirm(true);
                setMobileMenu(false);
              }}
              className="btn-danger mt-6"
            >
              <MdLogout size={18} /> {t("logout")}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          LOGOUT CONFIRM MODAL
      ══════════════════════════════════════════ */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-100 animate-fadeIn"
          style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="p-8 rounded-2xl w-[90%] max-w-sm text-center animate-scaleIn"
            style={{
              background: "var(--card-bg)",
              border: "1.5px solid var(--glass-border)",
              boxShadow: "var(--shadow-glass)",
            }}
          >
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              {t("confirmLogout")}
            </h2>
            <p className="text-secondary text-sm mb-6">{t("guardLogoutMsg")}</p>
            <div className="flex justify-center gap-4">
              <button onClick={confirmLogout} className="btn-danger">
                {t("yesLogout")}
              </button>
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-primary">
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EMERGENCY MODAL
      ══════════════════════════════════════════ */}
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






