import { Outlet, useNavigate } from "react-router-dom";
import { useState, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
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
  MdEmergency,
  MdWarning,
  MdSecurity,
} from "react-icons/md";
import { FaUsers, FaUserShield, FaParking } from "react-icons/fa";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";
import AdminEmergencyModal from "../../components/admin/AdminEmergencyModal";
import SOSModal from "../../components/emergency/SOSModal";
import { useRoleTheme } from "../../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

import RoleSwitcher from "../../components/RoleSwitcher";

function AccountantLayoutInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user, refreshPermissions } = useContext(AuthContext);
  useRoleTheme();

  const [alerts, setAlerts] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const base = "/accountant";

  useEffect(() => {
    const handlePermChange = () => {
      if (refreshPermissions) refreshPermissions();
    };
    window.addEventListener("permissions_updated", handlePermChange);
    return () => window.removeEventListener("permissions_updated", handlePermChange);
  }, [refreshPermissions]);

  /* Emergency polling */
  const loadEmergencies = async () => {
    try {
      const res = await API.get("/emergency/active");
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Emergency fetch failed", err);
    }
  };

  useEffect(() => {
    loadEmergencies();
    const interval = setInterval(loadEmergencies, 5000);
    return () => clearInterval(interval);
  }, []);

  const menu = [
    {
      label: t("adminMenuDashboard") || "Dashboard",
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
      module: "dashboard",
    },
    {
      label: t("adminMenuResidents") || "Residents Directory",
      path: `${base}/resident`,
      icon: FaUsers,
      group: "COMMUNITY & PROPERTY",
      module: "resident",
    },
    {
      label: t("adminManageProperty") || "Property & Blocks",
      path: `${base}/property`,
      icon: MdApartment,
      group: "COMMUNITY & PROPERTY",
      module: "property",
    },
    {
      label: t("adminMenuParking") || "Parking Management",
      path: `${base}/parking-slots`,
      icon: FaParking,
      group: "COMMUNITY & PROPERTY",
      module: "parking_slots",
    },
    {
      label: t("adminMenuFlatHistory"),
      path: `${base}/flat-history`,
      icon: MdVerified,
      group: "COMMUNITY & PROPERTY",
      module: "flat_history",
    },
    {
      label: t("adminMenuTenantApprovals"),
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
      label: t("adminMenuNotices") || "Society Notices",
      path: `${base}/notice`,
      icon: MdCampaign,
      group: "COMMUNICATION",
      module: "notice",
    },
    {
      label: t("adminMenuComplaints") || "Complaints & Tickets",
      path: `${base}/complaints`,
      icon: MdReportProblem,
      group: "COMMUNICATION",
      module: "complaints",
    },
    {
      label: t("adminMenuSOS"),
      path: `${base}/emergency`,
      icon: MdSecurity,
      group: "COMMUNICATION",
      module: "emergency",
    },
    {
      label: t("adminMenuAccounting"),
      path: `${base}/accounting`,
      icon: MdReceiptLong,
      group: "FINANCE & BILLS",
      module: "accounting",
    },
    {
      label: t("adminMenuManageBills") || "Billing & Invoices",
      path: `${base}/manage-bills`,
      icon: MdAccountBalance,
      group: "FINANCE & BILLS",
      module: "manage_bills",
    },
    {
      label: t("adminMenuMaintenance"),
      path: `${base}/maintenance`,
      icon: MdBuild,
      group: "FINANCE & BILLS",
      module: "maintenance",
    },
    {
      label: t("adminMenuPayments"),
      path: `${base}/payments`,
      icon: MdPayments,
      group: "FINANCE & BILLS",
      module: "payments",
    },
    {
      label: t("adminMenuAmenities") || "Clubhouse & Amenities",
      path: `${base}/amenities`,
      icon: MdVerified,
      group: "SERVICES & REPORTS",
      module: "amenities",
    },
    {
      label: t("adminMenuReports") || "Society Reports",
      path: `${base}/reports`,
      icon: MdReportProblem,
      group: "SERVICES & REPORTS",
      module: "reports",
    },
    {
      label: t("adminMenuDocument") || "Society Documents",
      path: `${base}/society_documents`,
      icon: MdVerified,
      group: "SERVICES & REPORTS",
      module: "society_documents",
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
        brandSubtitle={t("sbViewAccountant")}
        base={base}
        drawerExtra={<RoleSwitcher />}
        defaultOpenGroups={["FINANCE & BILLS"]}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={t("accountantDashboardTitle")}
          actions={
            <div className="flex items-center gap-2">
              <RoleSwitcher />

              {/* SOS button — accountant can raise a society-wide SOS */}
              {hasPermission(user, "emergency", "trigger") && (
                <button
                  onClick={() => setShowSOS(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/30 transition px-3 h-9 text-white text-xs font-bold cursor-pointer"
                  title="Raise an SOS alert to the whole society"
                >
                  <MdEmergency size={15} />
                  <span>SOS</span>
                </button>
              )}

              {/* Emergency alert */}
              {alerts.length > 0 && (
                <button
                  onClick={() => setShowEmergency(true)}
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/30 animate-pulse transition cursor-pointer"
                  title={t("adminActiveEmergencies") || "Active Emergencies"}
                >
                  <MdWarning size={18} className="text-white" />
                  <span className="header-sos-count absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold min-w-4.5 h-4.5 flex items-center justify-center rounded-full leading-none px-1">
                    {alerts.length}
                  </span>
                </button>
              )}
            </div>
          }
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

      {/* EMERGENCY MODAL */}
      <AdminEmergencyModal
        alerts={alerts}
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        refresh={loadEmergencies}
      />

      {/* SOS MODAL */}
      <SOSModal
        key={String(showSOS)}
        isOpen={showSOS}
        onClose={() => setShowSOS(false)}
        onRefresh={loadEmergencies}
        alerts={alerts}
        senderLabel="sosSenderSOS"
        modalTitle="sosSocietySOSCenter"
      />
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