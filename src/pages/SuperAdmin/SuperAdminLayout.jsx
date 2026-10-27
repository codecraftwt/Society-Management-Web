import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  MdLogout,
  MdDashboard,
  MdMenu,
  MdCampaign,
  MdReportProblem,
  MdAccountBalance,
  MdVerified,
  MdBuild,
  MdEmergency,
  MdSecurity,
  MdReceiptLong,
  MdPayments,
  MdAttachMoney,
  MdListAlt,
  MdHistory,
  MdInventory2,
  MdCelebration,
  MdHomeWork,
  MdApartment,
  MdCleaningServices,
  MdPool,
} from "react-icons/md";
import { FaBuilding, FaUsers, FaUserShield, FaParking } from "react-icons/fa";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";
import API from "../../services/api";
import GlobalButton from "../../components/common/GlobalButton";
import SOSModal from "../../components/emergency/SOSModal";
import { useRoleTheme } from "../../context/ThemeContext";
import "./SuperAdmin.css";

function SuperAdminLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  useRoleTheme();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  // Society list is used by the SOS dialog. Society filtering stays local to each section.
  const [societies, setSocieties] = useState([]);
  const [sectionSocietyId, setSectionSocietyId] = useState(() => {
    const current = localStorage.getItem("superadmin_society_filter");
    return current && current !== "ALL" ? current : "";
  });
  const sectionSocietyName = sectionSocietyId
    ? societies.find((society) => String(society.id) === String(sectionSocietyId))?.name || `Society #${sectionSocietyId}`
    : "All Societies";
  const showSectionSocietyScope = !["/superadmin", "/superadmin/societies"].includes(location.pathname.replace(/\/+$/, ""));

  const mobileDrawerActions = (
    <button
      onClick={() => setShowSOS(true)}
      className="w-full mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-red-600 to-rose-600 text-white py-2.5 text-xs font-bold shadow-md shadow-red-500/30"
      title="Raise an SOS alert to any society"
    >
      <MdEmergency size={15} />
      Raise SOS to a Society
    </button>
  );

  useEffect(() => {
    const syncSectionSociety = () => {
      const current = localStorage.getItem("superadmin_society_filter");
      setSectionSocietyId(current && current !== "ALL" ? current : "");
    };
    window.addEventListener("storage", syncSectionSociety);
    window.addEventListener("superadmin-society-scope-change", syncSectionSociety);
    syncSectionSociety();
    return () => {
      window.removeEventListener("storage", syncSectionSociety);
      window.removeEventListener("superadmin-society-scope-change", syncSectionSociety);
    };
  }, [location.pathname]);

  const base = "/superadmin";

  const menu = [
    {
      label: t("saMenuDashboard", "Dashboard"),
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
    },
    {
      label: t("saMenuSocieties", "Societies"),
      path: `${base}/societies`,
      icon: FaBuilding,
      group: "COMMUNITY & UNITS",
    },
    {
      label: t("saMenuPropertyBlocks", "Property & Block"),
      path: `${base}/property`,
      icon: MdHomeWork,
      group: "COMMUNITY & UNITS",
    },
    {
      label: t("saMenuFlatHistory", "Flat History"),
      path: `${base}/flat-history`,
      icon: MdApartment,
      group: "COMMUNITY & UNITS",
    },
    {
      label: t("saMenuAllResidents", "All Residents"),
      path: `${base}/resident`,
      icon: FaUsers,
      group: "COMMUNITY & UNITS",
    },
    {
      label: t("saMenuTenantApprovals", "Tenant Approvals"),
      path: `${base}/tenant-management`,
      icon: MdVerified,
      group: "COMMUNITY & UNITS",
    },
    {
      label: t("saMenuAllComplaints", "All Complaints"),
      path: `${base}/complaints`,
      icon: MdReportProblem,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuAllNotices", "All Notices"),
      path: `${base}/notice`,
      icon: MdCampaign,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuEvents", "Event Management"),
      path: `${base}/events`,
      icon: MdCelebration,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuAmenities", "Amenities"),
      path: `${base}/amenities`,
      icon: MdPool,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuManageGuards", "Manage Guards"),
      path: `${base}/guard`,
      icon: FaUserShield,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuVisitorLogs", "Visitor Logs"),
      path: `${base}/visitor-logs`,
      icon: MdVerified,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuCleaningStaff", "Cleaning Staff"),
      path: `${base}/cleaning-staff`,
      icon: MdCleaningServices,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuParcels", "Parcels"),
      path: `${base}/parcels`,
      icon: MdInventory2,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuParking", "Parking Slots"),
      path: `${base}/parking`,
      icon: FaParking,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuSOS", "Emergency Alerts"),
      path: `${base}/emergency`,
      icon: MdSecurity,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuAccountant", "Accountant"),
      path: `${base}/accountant`,
      icon: MdAccountBalance,
      group: "FINANCE & ASSETS",
    },
    {
      label: t("saMenuAccounting", "Accounting"),
      path: `${base}/accounting`,
      icon: MdReceiptLong,
      group: "FINANCE & ASSETS",
    },
    {
      label: t("saMenuManageBills", "Manage Bills"),
      path: `${base}/manage-bills`,
      icon: MdAccountBalance,
      group: "FINANCE & ASSETS",
    },
    {
      label: t("saMenuMaintenance", "Maintenance"),
      path: `${base}/maintenance`,
      icon: MdBuild,
      group: "FINANCE & ASSETS",
    },
    {
      label: t("saMenuPayments", "Payments"),
      path: `${base}/payments`,
      icon: MdPayments,
      group: "FINANCE & ASSETS",
    },
    {
      label: t("saMenuSystemReports", "System Reports"),
      path: `${base}/reports`,
      icon: MdReportProblem,
      group: "REPORTS",
    },
  ];

  // Fetch Societies for Dropdown
  useEffect(() => {
    API.get("/societies")
      .then((res) => {
        setSocieties(res.data || []);
      })
      .catch((err) => console.error("Failed to fetch societies", err));
  }, []);

  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="h-screen overflow-hidden bg-app flex sa-root"
      style={{ color: "var(--text-primary)" }}
    >
      {/* ── REUSABLE SIDEBAR ── */}
      <Sidebar
        menu={menu}
        brandTitle={
          <span className="text-accent">
            {t("saBrandName") || "Society"}
            {t("saBrandSuffix") || "Control"}
          </span>
        }
        brandSubtitle={t("sbViewSuperAdmin")}
        base={base}
        drawerExtra={mobileDrawerActions}
        defaultOpenGroups={["FINANCE & ASSETS", "OPERATIONS & SECURITY"]}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={null}
          subtitle={null}
          showNotificationBell={false}
          actions={
            <>
              <button
                onClick={() => setShowSOS(true)}
                className="hidden sm:inline-flex header-sos-btn"
                title="Raise an SOS alert to any society"
              >
                <span className="header-sos-pulse-icon"><MdEmergency size={15} /></span>
                <span>SOS</span>
              </button>

            </>
          }
          onLogout={() => setShowLogoutConfirm(true)}
          settingsPath={`${base}/settings`}
        />

        <main className="flex-1 overflow-y-auto overflow-x-clip scrollbar-hide py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
          {showSectionSocietyScope && (
            <div className="sa-section-scope" aria-live="polite">
              <FaBuilding size={14} />
              <span>Viewing: {sectionSocietyName}</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* LOGOUT CONFIRM MODAL */}
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
                Confirm Logout
              </h2>
              <div className="flex justify-center items-center gap-3 mt-6">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="sa-btn sa-btn-ghost"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <GlobalButton variant="primary" size="sm" icon={MdLogout} onClick={confirmLogout}>
                  Yes, Logout
                </GlobalButton>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* SOS MODAL — Super Admin picks the target society */}
        <SOSModal
          key={String(showSOS)}
          isOpen={showSOS}
          onClose={() => setShowSOS(false)}
          requireSociety
          withAlerts={false}
          societies={societies}
          defaultSocietyId=""
          senderLabel="sosSenderSOS"
          modalTitle="sosSuperAdminSOSTitle"
          successMessage="sosSuperAdminSuccess"
        />
    </div>
  );
}

export default function SuperAdminLayout() {
  return (
    <LanguageProvider role="superadmin">
      <SuperAdminLayoutInner />
    </LanguageProvider>
  );
}
