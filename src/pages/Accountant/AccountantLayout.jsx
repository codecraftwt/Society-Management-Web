import { Outlet, useNavigate } from "react-router-dom";
import { useState, useContext,useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MdDashboard,
  MdAccountBalance,
  MdBarChart,
  MdCampaign,
  MdVerified,
  MdBuild,
  MdApartment,
  MdReportProblem,
  MdReceiptLong,
  MdPayments,
  MdAttachMoney,
  MdListAlt,
  MdHistory,
} from "react-icons/md";
import { FaUsers, FaUserShield, FaParking } from "react-icons/fa";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";
import { useRoleTheme } from "../../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

import RoleSwitcher from "../../components/RoleSwitcher";

function AccountantLayoutInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user, refreshPermissions } = useContext(AuthContext);
  useRoleTheme();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const base = "/accountant";

  useEffect(() => {
    const handlePermChange = () => {
      if (refreshPermissions) refreshPermissions();
    };
    window.addEventListener("permissions_updated", handlePermChange);
    return () => window.removeEventListener("permissions_updated", handlePermChange);
  }, [refreshPermissions]);

  const menu = [
    {
      label: t("accountantMenuDashboard") || "Dashboard",
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
      module: "dashboard",
    },
    {
      label: "Account Management",
      path: `${base}/accounting`,
      icon: MdReceiptLong,
      group: "FINANCE & BILLING",
      module: "accounting",
    },
    {
      label: t("accountantMenuManageBills") || "Manage Bills",
      path: `${base}/manage-bills`,
      icon: MdAccountBalance,
      group: "FINANCE & BILLING",
      module: "manage_bills",
    },
    {
      label: "Maintenance",
      path: `${base}/maintenance`,
      icon: MdBuild,
      group: "FINANCE & BILLING",
      module: "maintenance",
    },
    {
      label: "Payments",
      path: `${base}/payments`,
      icon: MdPayments,
      group: "FINANCE & BILLING",
      module: "payments",
    },
    {
      label: t("accountantMenuReports") || "Reports",
      path: `${base}/reports`,
      icon: MdBarChart,
      group: "FINANCE & BILLING",
      module: "reports",
    },
    {
      label: t("adminMenuParking") || "Parking Management",
      path: `${base}/parking-slots`,
      icon: FaParking,
      group: "COMMUNITY & PROPERTY",
      module: "parking_slots",
    },
    {
      label: t("adminManageProperty") || "Properties & Flats",
      path: `${base}/property`,
      icon: MdApartment,
      group: "COMMUNITY & PROPERTY",
      module: "property",
    },
    {
      label: t("adminMenuResidents") || "Residents & Directory",
      path: `${base}/resident`,
      icon: FaUsers,
      group: "COMMUNITY & PROPERTY",
      module: "resident",
    },
    {
      label: "Flat History",
      path: `${base}/flat-history`,
      icon: MdVerified,
      group: "COMMUNITY & PROPERTY",
      module: "flat_history",
    },
    {
      label: "Tenant Management",
      path: `${base}/tenant-management`,
      icon: FaUsers,
      group: "COMMUNITY & PROPERTY",
      module: "tenant_management",
    },
    {
      label: t("adminMenuGuards") || "Security Guards",
      path: `${base}/guard`,
      icon: FaUserShield,
      group: "SECURITY & LOGS",
      module: "guard",
    },
    {
      label: t("adminMenuVisitorLogs") || "Visitor Logs",
      path: `${base}/visitor-logs`,
      icon: MdCampaign,
      group: "SECURITY & LOGS",
      module: "visitor_logs",
    },
    {
      label: t("adminMenuNotices") || "Notices & Circulars",
      path: `${base}/notice`,
      icon: MdCampaign,
      group: "COMMUNICATION",
      module: "notice",
    },
    {
      label: t("adminMenuComplaints") || "Complaints",
      path: `${base}/complaints`,
      icon: MdReportProblem,
      group: "COMMUNICATION",
      module: "complaints",
    },
    {
      label: t("adminMenuDocument") || "Documents & Files",
      path: `${base}/society_documents`,
      icon: MdVerified,
      group: "SERVICES & RECORDS",
      module: "society_documents",
    },
    {
      label: t("adminMenuAmenities") || "Amenities",
      path: `${base}/amenities`,
      icon: MdBuild,
      group: "SERVICES & RECORDS",
      module: "amenities",
    },
  ];

  const visibleMenu = menu.filter((item) => {
    if (!item.module) return true;
    return hasPermission(user, item.module);
  });

  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div
      className="accountant-shell h-screen overflow-hidden bg-app flex"
      style={{ color: "var(--text-primary)" }}
    >
      {/* ── REUSABLE SIDEBAR ── */}
      <Sidebar
        menu={visibleMenu}
        brandTitle={
          <>
            {t("accountantPanelLabel") || "Accountant"}<span className="text-accent">{t("panelSuffix") || " Panel"}</span>
          </>
        }
        brandSubtitle="Finance View"
        base={base}
        drawerExtra={<RoleSwitcher />}
        defaultOpenGroups={["FINANCE & BILLING"]}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={t("accountantDashboardTitle")}
          actions={<RoleSwitcher />}
          onLogout={() => setShowLogoutConfirm(true)}
        />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-clip scrollbar-hide p-4 sm:p-6 lg:p-8">
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
                backdropFilter: "var(--blur)",
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
                {t("accountantLogoutMsg")}
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
    </div>
  );
}

export default function AccountantLayout() {
  return (
    <LanguageProvider role="accountant">
      <AccountantLayoutInner />
    </LanguageProvider>
  );
}