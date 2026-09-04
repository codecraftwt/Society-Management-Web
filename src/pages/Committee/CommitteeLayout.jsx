import { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { Outlet, useNavigate } from "react-router-dom";
import API from "../../services/api";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import LanguageSelector from "../../components/common/LanguageSelector";
import { FaUsers, FaUserShield } from "react-icons/fa";
import {
  MdDashboard,
  MdCampaign,
  MdReportProblem,
  MdAccountBalance,
  MdVerified,
  MdMenu,
  MdLogout,
  MdWarning,
  MdBarChart,
  MdApartment,
  MdBookOnline,
  MdDescription,
  MdVisibility,
  MdBuild,
} from "react-icons/md";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggle from "../../components/common/ThemeToggle";
import AdminEmergencyModal from "../../components/admin/AdminEmergencyModal";
import { AuthContext } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";

const ROLE_META = {
  COMMITTEE_MEMBER: { label: "Committee", icon: "📋", desc: "Committee member" },
  RESIDENT: { label: "Resident", icon: "🏠", desc: "Switch to resident" },
  SOCIETY_ADMIN: { label: "Society Admin", icon: "🏢", desc: "Manage your society" },
  SUPER_ADMIN: { label: "Super Admin", icon: "🛡️", desc: "Platform admin" },
  ACCOUNTANT: { label: "Accountant", icon: "📊", desc: "Finance & bills" },
  GUARD: { label: "Guard", icon: "🔐", desc: "Gate & security" },
  FAMILY_MEMBER: { label: "Family", icon: "👨‍👩‍👧", desc: "Family member" },
};

function CommitteeLayoutInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { openMobile } = useSidebar();

  const [alerts, setAlerts] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [rsOpen, setRsOpen] = useState(false);

  const { user, switchRole } = useContext(AuthContext);

  const base = "/committee";

  const menu = [
    {
      label: "Dashboard",
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
    },
    {
      label: "Residents",
      path: `${base}/residents`,
      icon: FaUsers,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: "Guards",
      path: `${base}/guards`,
      icon: FaUserShield,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: "Property",
      path: `${base}/property`,
      icon: MdApartment,
      group: "COMMUNITY & PROPERTY",
    },
    {
      label: "Visitor Logs",
      path: `${base}/visitor-logs`,
      icon: MdVisibility,
      group: "SECURITY & NOTICES",
    },
    {
      label: "Notices",
      path: `${base}/notices`,
      icon: MdCampaign,
      group: "SECURITY & NOTICES",
    },
    {
      label: "Complaints",
      path: `${base}/complaints`,
      icon: MdReportProblem,
      group: "SECURITY & NOTICES",
    },
    {
      label: "Billing Rules",
      path: `${base}/billing-rules`,
      icon: MdAccountBalance,
      group: "FINANCE & BILLS",
    },
    {
      label: "Manage Bills",
      path: `${base}/manage-bills`,
      icon: MdDescription,
      group: "FINANCE & BILLS",
    },
    {
      label: "Payment Tracking",
      path: `${base}/payment-tracking`,
      icon: MdBarChart,
      group: "FINANCE & BILLS",
    },
    {
      label: "Maintenance Management",
      path: `${base}/maintenance`,
      icon: MdBuild,
      group: "FINANCE & BILLS",
    },
    {
      label: "Amenities",
      path: `${base}/amenities`,
      icon: MdBookOnline,
      group: "SERVICES & REPORTS",
    },
    {
      label: "Reports",
      path: `${base}/reports`,
      icon: MdBarChart,
      group: "SERVICES & REPORTS",
    },
    {
      label: "Documents",
      path: `${base}/documents`,
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
      COMMITTEE_MEMBER: "/committee",
      RESIDENT: "/resident",
      FAMILY_MEMBER: "/family",
      GUARD: "/guard",
      ACCOUNTANT: "/accountant",
    };
    navigate(routeMap[role] || "/login");
  };

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
            Committee<span className="text-accent"> Panel</span>
          </>
        }
        brandSubtitle="Committee Member"
        base={base}
        drawerExtra={mobileRoleSwitcher}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title="Committee Member Dashboard"
          subtitle="Manage society operations"
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
                    {user.roles
                      .filter(
                        (role) =>
                          role === "COMMITTEE_MEMBER" || role === "RESIDENT"
                      )
                      .map((role) => {
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

              {/* EMERGENCY ALERT */}
              {alerts.length > 0 && (
                <button
                  onClick={() => setShowEmergency(true)}
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/30 animate-pulse transition"
                  title="Active emergencies"
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
            style={{
              background: "var(--overlay-bg)",
              backdropFilter: "blur(6px)",
              zIndex: 1200,
            }}
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
                Confirm Logout
              </h2>
              <p className="text-secondary text-sm mb-6">
                Are you sure you want to log out of the Committee panel?
              </p>
              <div className="flex justify-center gap-4">
                <button onClick={confirmLogout} className="btn-danger">
                  Yes, Logout
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="btn-primary"
                >
                  Cancel
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
    </div>
  );
}

export default function CommitteeLayout() {
  return (
    <LanguageProvider role="committee">
      <CommitteeLayoutInner />
    </LanguageProvider>
  );
}
