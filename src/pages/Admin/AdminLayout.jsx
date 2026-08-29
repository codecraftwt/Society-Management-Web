import { useState, useEffect, useContext } from "react";
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
} from "react-icons/md";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggle from "../../components/common/ThemeToggle";
import AdminEmergencyModal from "../../components/admin/AdminEmergencyModal";
import { AuthContext } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";

/* Role meta for role-switcher */
const ROLE_META = {
  SOCIETY_ADMIN: { label: "Society Admin", icon: "🏢", desc: "Manage your society" },
  RESIDENT: { label: "Resident", icon: "🏠", desc: "Resident view" },
  SUPER_ADMIN: { label: "Super Admin", icon: "🛡️", desc: "Platform admin" },
  ACCOUNTANT: { label: "Accountant", icon: "📊", desc: "Finance & bills" },
  GUARD: { label: "Guard", icon: "🔐", desc: "Gate & security" },
  FAMILY_MEMBER: { label: "Family", icon: "👨‍👩‍👧", desc: "Family member" },
  COMMITTEE_MEMBER: { label: "Committee", icon: "📋", desc: "Committee member" },
};

function AdminLayoutInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { openMobile } = useSidebar();

  const [alerts, setAlerts] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [rsOpen, setRsOpen] = useState(false);

  const { user, switchRole } = useContext(AuthContext);

  const base = "/admin";

  /* Menu definitions with non-breaking grouping metadata */
  const menu = [
    {
      label: t("adminMenuDashboard"),
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
    },
    {
      label: t("adminMenuResidents"),
      path: `${base}/resident`,
      icon: FaUsers,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: t("adminMenuAssignFlat"),
      path: `${base}/assign-flat`,
      icon: MdApartment,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: "Admin Setting",
      path: `${base}/settings`,
      icon: MdApartment,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: t("adminManageProperty"),
      path: `${base}/property`,
      icon: MdApartment,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: t("adminMenuParking"),
      path: `${base}/parking-slots`,
      icon: FaParking,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: "Flat History",
      path: `${base}/flat-history`,
      icon: MdVerified,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: "Tenant Management",
      path: `${base}/tenant-management`,
      icon: FaUsers,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: t("adminMenuGuards"),
      path: `${base}/guard`,
      icon: FaUserShield,
      group: "SECURITY & LOGS",
    },
    {
      label: t("adminMenuVisitorLogs"),
      path: `${base}/visitor-logs`,
      icon: MdCampaign,
      group: "SECURITY & LOGS",
    },
    {
      label: t("adminMenuNotices"),
      path: `${base}/notice`,
      icon: MdCampaign,
      group: "COMMUNICATION",
    },
    {
      label: t("adminMenuComplaints"),
      path: `${base}/complaints`,
      icon: MdReportProblem,
      group: "COMMUNICATION",
    },
    {
      label: t("adminMenuAccountant"),
      path: `${base}/accountant`,
      icon: MdAccountBalance,
      group: "FINANCE & BILLS",
    },
    {
      label: t("adminMenuManageBills"),
      path: `${base}/manage-bills`,
      icon: MdAccountBalance,
      group: "FINANCE & BILLS",
    },
    {
      label: t("adminMenuAmenities"),
      path: `${base}/amenities`,
      icon: MdVerified,
      group: "SERVICES & REPORTS",
    },
    {
      label: t("adminMenuReports"),
      path: `${base}/reports`,
      icon: MdReportProblem,
      group: "SERVICES & REPORTS",
    },
    {
      label: t("adminMenuDocument"),
      path: `${base}/society_documents`,
      icon: MdVerified,
      group: "SERVICES & REPORTS",
    },
  ];

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
        Active role
      </p>
      <div className="rs-mobile-bar">
        {user.roles.map((role) => {
          const meta = ROLE_META[role] ?? { label: role, icon: "👤" };
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
      className="h-screen overflow-hidden bg-app flex"
      style={{ color: "var(--text-primary)" }}
    >
      {/* ── REUSABLE SIDEBAR ── */}
      <Sidebar
        menu={menu}
        brandTitle={
          <>
            {t("adminPanelLabel") || "Society"}<span className="text-accent">{t("panelSuffix") || "Admin"}</span>
          </>
        }
        brandSubtitle="Society Admin"
        base={base}
        drawerExtra={mobileRoleSwitcher}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={t("adminDashboardTitle")}
          subtitle={t("adminDashboardSubtitle")}
          actions={
            <>
              {/* ROLE SWITCHER */}
              {user?.roles?.length > 1 && (
                <div className="rs-wrap" style={{ position: "relative" }}>
                  <button
                    className={`rs-trigger ${rsOpen ? "open" : ""}`}
                    onClick={() => setRsOpen((o) => !o)}
                    title="Switch role"
                  >
                    <span className="rs-active-dot" />
                    <span className="rs-trigger-label hidden sm:inline">
                      {ROLE_META[user.activeRole]?.label ?? user.activeRole}
                    </span>
                    <span className="rs-trigger-label sm:hidden">
                      {ROLE_META[user.activeRole]?.icon ?? "👤"}
                    </span>
                    <span className="rs-trigger-arrow">▼</span>
                  </button>

                  <div className={`rs-dropdown ${rsOpen ? "open" : ""}`}>
                    <div className="rs-dropdown-header">Switch role</div>

                    {user.roles.map((role) => {
                      const meta = ROLE_META[role] ?? {
                        label: role,
                        icon: "👤",
                        desc: "",
                      };
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

              {/* Emergency alert */}
              {alerts.length > 0 && (
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
              )}
            </>
          }
          onLogout={() => setShowLogoutConfirm(true)}
        />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-auto scrollbar-hide p-4 sm:p-6 lg:p-8">
          <div className="bg-card p-4 sm:p-6 rounded-xl min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-100 animate-fadeIn"
          style={{
            background: "var(--overlay-bg)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="p-8 rounded-2xl w-[90%] max-w-sm text-center animate-scaleIn"
            style={{
              background: "var(--card-bg)",
              border: "1.5px solid var(--glass-border)",
              boxShadow: "var(--shadow-glass)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {t("confirmLogout")}
            </h2>
            <p className="text-secondary text-sm mb-6">{t("adminLogoutMsg")}</p>
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
        </div>
      )}

      {/* EMERGENCY MODAL */}
      <AdminEmergencyModal
        alerts={alerts}
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        refresh={loadEmergencies}
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