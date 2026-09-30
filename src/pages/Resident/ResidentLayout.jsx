import { useState, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import { Outlet, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { FaParking, FaCar } from "react-icons/fa";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import {
  MdMenu,
  MdPerson,
  MdReceipt,
  MdReportProblem,
  MdCampaign,
  MdPeople,
  MdLogout,
  MdAssignment,
  MdDashboard,
  MdWarning,
  MdVerified,
  MdOutlineCardGiftcard,
  MdHome,
  MdRefresh,
  MdEmergency,
  MdSpaceDashboard,
} from "react-icons/md";
import ResidentEmergencyModal from "../../components/resident/ResidentEmergencyModal";
import SOSModal from "../../components/emergency/SOSModal";
import { useSidebar } from "../../context/SidebarContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";
import { useRoleTheme } from "../../context/ThemeContext";
import RoleSwitcher from "../../components/RoleSwitcher";
import "../Guard/Guard.css";
import "./Resident.css";

function ResidentLayoutInner() {
  const { user } = useContext(AuthContext);
  const { t } = useLang();
  useRoleTheme();
  const navigate = useNavigate();
  const { collapsed } = useSidebar();

  const [alerts, setAlerts] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const isFamilyMember = user?.role === "FAMILY_MEMBER";
  const base = isFamilyMember ? "/family" : "/resident";

  /* Panel label */
  const panelLabel = isFamilyMember
    ? t("familyPanel") || "Family Panel"
    : t("residentPanel") || "Resident Panel";

  /* Menus with non-breaking grouping metadata */
  const residentMenu = [
    {
      label: t("menuDashboard"),
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
    },
    ...(user?.resident_type === "OWNER"
      ? [
          {
            label: t("menuMyProperties"),
            path: `${base}/my-properties`,
            icon: MdHome,
            group: "PROPERTY & BILLS",
          },
        ]
      : []),
    ...(user?.resident_type === "OWNER"
      ? [
          {
            label: t("menuBills"),
            path: `${base}/bills`,
            icon: MdReceipt,
            group: "PROPERTY & BILLS",
          },
        ]
      : []),
    {
      label: t("menuComplaints"),
      path: `${base}/complaints`,
      icon: MdReportProblem,
      group: "ACTIVITY & VISITORS",
    },
    {
      label: t("menuNotices"),
      path: `${base}/notices`,
      icon: MdCampaign,
      group: "ACTIVITY & VISITORS",
    },
    {
      label: t("menuReports"),
      path: `${base}/reports`,
      icon: MdAssignment,
      group: "ACTIVITY & VISITORS",
    },
    {
      label: t("menuVisitors"),
      path: `${base}/visitors`,
      icon: MdPeople,
      group: "ACTIVITY & VISITORS",
    },
    {
      label: t("menuPreApproval"),
      path: `${base}/preapproval`,
      icon: MdVerified,
      group: "ACTIVITY & VISITORS",
    },
    {
      label: t("menuParking"),
      path: `${base}/parking`,
      icon: FaParking,
      group: "ACTIVITY & VISITORS",
    },
    {
      label: t("menuMyVehicles") || "My Vehicles",
      path: `${base}/my-vehicles`,
      icon: FaCar,
      group: "ACTIVITY & VISITORS",
    },
    {
      label: t("menuMyOverview"),
      path: `${base}/overview`,
      icon: MdSpaceDashboard,
      group: "SERVICES & PROFILE",
    },
    {
      label: t("menuMyCollection"),
      path: `${base}/my-collection`,
      icon: MdOutlineCardGiftcard,
      group: "SERVICES & PROFILE",
    },
    {
      label: t("menuAmenities"),
      path: `${base}/amenities`,
      icon: MdVerified,
      group: "SERVICES & PROFILE",
    },
    {
      label: t("menuDocuments"),
      path: `${base}/society_documents`,
      icon: MdVerified,
      group: "SERVICES & PROFILE",
    },
    {
      label: t("menuDirectory"),
      path: `${base}/directory`,
      icon: MdPeople,
      group: "SERVICES & PROFILE",
    },
  ];

  const familyMenu = [
    {
      label: t("menuDashboard"),
      path: `${base}/profile`,
      icon: MdDashboard,
      group: "OVERVIEW",
    },
    {
      label: t("menuNotices"),
      path: `${base}/notices`,
      icon: MdCampaign,
      group: "ACTIVITY & NOTICES",
    },
    ...(user?.resident_type === "OWNER"
      ? [
          {
            label: t("menuBills"),
            path: `${base}/bills`,
            icon: MdReceipt,
            group: "BILLS",
          },
        ]
      : []),
    {
      label: t("menuComplaints"),
      path: `${base}/complaints`,
      icon: MdReportProblem,
      group: "ACTIVITY & NOTICES",
    },
    {
      label: t("menuVisitors"),
      path: `${base}/visitors`,
      icon: MdPeople,
      group: "ACTIVITY & NOTICES",
    },
    {
      label: t("menuDirectory"),
      path: `${base}/directory`,
      icon: MdPeople,
      group: "ACTIVITY & NOTICES",
    },
    {
      label: t("menuMyOverview"),
      path: `${base}/overview`,
      icon: MdSpaceDashboard,
      group: "PROFILE",
    },
  ];

  const menu = isFamilyMember ? familyMenu : residentMenu;

  /* Emergency polling */
  const loadEmergencies = async () => {
    try {
      const r = await API.get("/emergency/active");
      setAlerts(r.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadEmergencies();
    const id = setInterval(loadEmergencies, 5000);
    return () => clearInterval(id);
  }, []);

  /* Handlers */
  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="h-screen overflow-hidden bg-app flex resident-root"
      style={{ color: "var(--text-primary)" }}
    >
      {/* ── REUSABLE SIDEBAR ── */}
      <Sidebar
        menu={menu}
        brandTitle={<span className="text-accent">{panelLabel}</span>}
        brandSubtitle={user?.society_name || (isFamilyMember ? t("sbViewFamily") : t("sbViewResident"))}
        base={base}
        drawerExtra={<RoleSwitcher fullWidth />}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={null}
          subtitle={null}
          societyName={collapsed ? user?.society_name : null}
          actions={
            <>
              <button
                onClick={() => setReloadKey(k => k + 1)}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                style={{
                  background: "var(--card-inner-bg)",
                  border: "1.5px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
                title="Reload page"
                aria-label="Reload page"
              >
                <MdRefresh size={18} />
              </button>
              <RoleSwitcher />
              {/* SOS button */}
              <button
                onClick={() => setShowSOS(true)}
                className="flex items-center justify-center sm:justify-start gap-1.5 rounded-xl bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/30 transition w-9 sm:w-auto px-0 sm:px-3 h-9 text-white text-xs font-bold cursor-pointer"
                title="Raise an SOS alert to the whole society"
              >
                <MdEmergency size={15} />
                <span className="hidden sm:inline">SOS</span>
              </button>

              {alerts.length > 0 && (
                <button
                  onClick={() => setShowEmergency(true)}
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/30 animate-pulse transition"
                  title={t("adminActiveEmergencies")}
                >
                  <MdWarning size={18} className="text-white" />
                  <span className="header-sos-count absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold min-w-4.5 h-4.5 flex items-center justify-center rounded-full leading-none px-1">
                    {alerts.length}
                  </span>
                </button>
              )}
            </>
          }
          onLogout={() => setShowLogoutConfirm(true)}
          settingsPath={`${base}/settings`}
        />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-clip scrollbar-hide py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
          <Outlet key={reloadKey} />
        </main>
      </div>

      {/* LOGOUT MODAL */}
      {showLogoutConfirm &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center animate-fadeIn"
            style={{
              background: "var(--overlay-bg)",
              backdropFilter: "blur(6px)",
              zIndex: 1200,
            }}
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
                {t("confirmLogoutMsg")}
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
      <ResidentEmergencyModal
        alerts={alerts}
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
      />

      {/* SOS MODAL */}
      <SOSModal
        key={String(showSOS)}
        isOpen={showSOS}
        onClose={() => setShowSOS(false)}
        onRefresh={loadEmergencies}
        alerts={alerts}
        senderLabel="sosSenderResident"
        modalTitle="sosResidentSOSTitle"
      />
    </div>
  );
}

export default function ResidentLayout() {
  return (
    <LanguageProvider role="resident">
      <ResidentLayoutInner />
    </LanguageProvider>
  );
}