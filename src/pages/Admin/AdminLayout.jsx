import { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { Outlet, useNavigate } from "react-router-dom";
import API from "../../services/api";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import LanguageSelector from "../../components/common/LanguageSelector";
import { FaUsers, FaUserShield, FaParking } from "react-icons/fa";
import {
  MdApartment,
  MdCampaign,
  MdReportProblem,
  MdMenu,
  MdLogout,
  MdDashboard,
  MdAccountBalance,
  MdWarning,
  MdVerified,
  MdBuild,
  MdEmergency,
  MdSecurity,
  MdReceiptLong,
  MdPayments,
  MdAttachMoney,
  MdListAlt,
  MdHistory,
} from "react-icons/md";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggle from "../../components/common/ThemeToggle";
import AdminEmergencyModal from "../../components/admin/AdminEmergencyModal";
import SOSModal from "../../components/emergency/SOSModal";
import { AuthContext } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";
import { useRoleTheme } from "../../context/ThemeContext";
import "./Admin.css";

import { hasPermission, isCommitteeMember } from "../../utils/permissions";

/* Role meta for role-switcher */
const ROLE_META = {
  SOCIETY_ADMIN: { labelKey: "roleSocietyAdmin", icon: "🏢", descKey: "roleSocietyAdminDesc" },
  RESIDENT: { labelKey: "roleResident", icon: "🏠", descKey: "roleResidentDesc" },
  SUPER_ADMIN: { labelKey: "roleSuperAdmin", icon: "🛡️", descKey: "roleSuperAdminDesc" },
  ACCOUNTANT: { labelKey: "roleAccountant", icon: "📊", descKey: "roleAccountantDesc" },
  GUARD: { labelKey: "roleGuard", icon: "🔐", descKey: "roleGuardDesc" },
  FAMILY_MEMBER: { labelKey: "roleFamily", icon: "👨‍👩‍👧", descKey: "roleFamilyDesc" },
  COMMITTEE_MEMBER: { labelKey: "roleCommittee", icon: "📋", descKey: "roleCommitteeDesc" },
};

function AdminLayoutInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { openMobile } = useSidebar();
  useRoleTheme();

  const [alerts, setAlerts] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [rsOpen, setRsOpen] = useState(false);

  const { user, switchRole, refreshPermissions } = useContext(AuthContext);

  const roleMeta = (role) => {
    const m = ROLE_META[role];
    if (!m) return { label: role, icon: "👤", desc: "" };
    return { label: t(m.labelKey), icon: m.icon, desc: t(m.descKey) };
  };

  const base = "/admin";
  const isCommittee = isCommitteeMember(user);

  useEffect(() => {
    const handlePermChange = () => {
      if (refreshPermissions) refreshPermissions();
    };
    window.addEventListener("permissions_updated", handlePermChange);
    return () => window.removeEventListener("permissions_updated", handlePermChange);
  }, [refreshPermissions]);

  /* Menu definitions with non-breaking grouping metadata */
  const menu = [
    {
      label: t("adminMenuDashboard"),
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
      module: "dashboard",
    },
    {
      label: t("adminMenuResidents"),
      path: `${base}/resident`,
      icon: FaUsers,
      group: "COMMUNITY & PROPERTY",
      module: "resident",
    },
    {
      label: t("adminMenuAssignFlat"),
      path: `${base}/assign-flat`,
      icon: MdApartment,
      group: "COMMUNITY & PROPERTY",
      module: "resident",
      action: "create",
    },
    {
      label: t("adminManageProperty"),
      path: `${base}/property`,
      icon: MdApartment,
      group: "COMMUNITY & PROPERTY",
      module: "property",
    },
    {
      label: t("adminMenuParking"),
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
      label: t("adminMenuGuards"),
      path: `${base}/guard`,
      icon: FaUserShield,
      group: "SECURITY & LOGS",
      module: "guard",
    },
    {
      label: t("adminMenuVisitorLogs"),
      path: `${base}/visitor-logs`,
      icon: MdCampaign,
      group: "SECURITY & LOGS",
      module: "visitor_logs",
    },
    {
      label: t("adminMenuNotices"),
      path: `${base}/notice`,
      icon: MdCampaign,
      group: "COMMUNICATION",
      module: "notice",
    },
    {
      label: t("adminMenuComplaints"),
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
      label: t("adminMenuAccountant") || "Accountants Directory",
      path: `${base}/accountant`,
      icon: MdAccountBalance,
      group: "FINANCE & BILLS",
      module: "accountant",
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
      label: t("adminMenuAmenities"),
      path: `${base}/amenities`,
      icon: MdVerified,
      group: "SERVICES & REPORTS",
      module: "amenities",
    },
    {
      label: t("adminMenuReports"),
      path: `${base}/reports`,
      icon: MdReportProblem,
      group: "SERVICES & REPORTS",
      module: "reports",
    },
    {
      label: t("adminMenuDocument"),
      path: `${base}/society_documents`,
      icon: MdVerified,
      group: "SERVICES & REPORTS",
      module: "society_documents",
    },
  ];

  const visibleMenu = menu.filter((item) => {
    if (!item.module) return true;
    const reqAction = item.action || "view";
    return hasPermission(user, item.module, reqAction);
  });

  /* Close role-switcher on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".rs-wrap")) setRsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  /* Logout */
  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  /* Role switch */
  const handleRoleSwitch = async (role) => {
    if (role === user?.activeRole) return;
    await switchRole(role);
    const routeMap = {
      SUPER_ADMIN: "/superadmin",
      SOCIETY_ADMIN: "/admin",
      COMMITTEE_MEMBER: "/admin",
      RESIDENT: "/resident",
      FAMILY_MEMBER: "/family",
      GUARD: "/guard",
      ACCOUNTANT: "/accountant",
    };
    navigate(routeMap[role] || "/login");
  };

  /* Mobile role switcher pill bar passed via drawerExtra */
  const mobileRoleSwitcher = user?.roles?.length > 1 && (
    <div style={{ marginBottom: "1rem" }}>
      <p
        style={{
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        {t("activeRole")}
      </p>
      <div className="rs-mobile-bar">
        {user.roles.map((role) => {
          const meta = roleMeta(role);
          const isActive = role === user.activeRole;
          return (
            <button
              key={role}
              className={`rs-mobile-pill ${isActive ? "active" : ""}`}
              onClick={() => {
                handleRoleSwitch(role);
              }}
            >
              <span className="rs-pill-dot" />
              {meta.icon} {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className="h-screen overflow-hidden bg-app flex admin-root"
      style={{ color: "var(--text-primary)" }}
    >
      {/* ── REUSABLE SIDEBAR ── */}
      <Sidebar
        menu={visibleMenu}
        brandTitle={
          isCommittee ? (
            <>
              {t("committeePanel")}<span className="text-accent">{t("panelSuffix")}</span>
            </>
          ) : (
            <>
              {t("adminPanelLabel")}<span className="text-accent">{t("panelSuffix")}</span>
            </>
          )
        }
        brandSubtitle={isCommittee ? (user?.committee_position || user?.designation || t("sbViewCommittee")) : t("sbViewAdmin")}
        base={base}
        drawerExtra={mobileRoleSwitcher}
        defaultOpenGroups={["FINANCE & BILLS"]}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={isCommittee ? t("committeeDashboardTitle") : t("adminDashboardTitle")}
          subtitle={
            isCommittee
              ? (user?.name
                  ? t("committeeDashboardWelcome", { name: user.name })
                  : t("committeeDashboardWelcomeAnon"))
              : t("adminDashboardSubtitle")
          }
          actions={
            <>
              {/* ROLE SWITCHER */}
              {user?.roles?.length > 1 && (
                <div className="rs-wrap" style={{ position: "relative" }}>
                  <button
                    className={`rs-trigger ${rsOpen ? "open" : ""}`}
                    onClick={() => setRsOpen((o) => !o)}
                    title={t("switchRole")}
                  >
                    <span className="rs-active-dot" />
                    <span className="rs-trigger-label hidden sm:inline">
                      {roleMeta(user.activeRole).label}
                    </span>
                    <span className="rs-trigger-label sm:hidden">
                      {roleMeta(user.activeRole).icon}
                    </span>
                    <span className="rs-trigger-arrow">▼</span>
                  </button>

                  <div className={`rs-dropdown ${rsOpen ? "open" : ""}`}>
                    <div className="rs-dropdown-header">{t("switchRole")}</div>

                    {user.roles.map((role) => {
                      const meta = roleMeta(role);
                      const isActive = role === user.activeRole;
                      return (
                        <div
                          key={role}
                          className={`rs-option ${isActive ? "active" : ""}`}
                          onClick={() => {
                            handleRoleSwitch(role);
                            setRsOpen(false);
                          }}
                        >
                          <div className="rs-option-icon">{meta.icon}</div>
                          <div className="rs-option-info">
                            <p className="rs-option-name">{meta.label}</p>
                            {meta.desc && (
                              <p className="rs-option-desc">{meta.desc}</p>
                            )}
                          </div>
                          <div className="rs-check">
                            <svg
                              viewBox="0 0 10 8"
                              fill="none"
                              stroke="white"
                              strokeWidth="2.5"
                            >
                              <polyline points="1,4 4,7 9,1" />
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SOS button — admin & committee can raise a society-wide SOS */}
              {hasPermission(user, "emergency", "trigger") && (
                <button
                  onClick={() => setShowSOS(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/30 transition px-3 h-9 text-white text-xs font-bold"
                  title={t("raiseSos")}
                >
                  <MdEmergency size={15} />
                  <span>SOS</span>
                </button>
              )}

              {/* Emergency alert */}
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
        <main className="flex-1 overflow-y-auto overflow-x-clip scrollbar-hide p-4 sm:p-6 lg:p-8">
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
                {t("confirmLogout")}
              </h2>
              <p className="text-secondary text-sm mb-6">
                {isCommittee
                  ? "Are you sure you want to logout from the committee member panel?"
                  : t("adminLogoutMsg")}
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
        senderLabel="SOS"
        modalTitle="🚨 Society SOS Center"
      />
    </div>
  );
}

export default function AdminLayout() {
  return (
    <LanguageProvider role="admin">
      <AdminLayoutInner />
    </LanguageProvider>
  );
}