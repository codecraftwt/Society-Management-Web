import { useState, useEffect, useContext } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import API from "../../services/api";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import LanguageSelector from "../../components/common/LanguageSelector";
import { FaUsers, FaUserShield, FaParking } from "react-icons/fa";
import {
  MdApartment,
  MdCampaign,
  MdReportProblem,
  MdMenu,
  MdClose,
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

/* ─────────────────────────────────────────────────────────────
  Role meta — icon, label, description for each role
───────────────────────────────────────────────────────────── */
const ROLE_META = {
  SOCIETY_ADMIN:  { label: "Society Admin", icon: "🏢", desc: "Manage your society"   },
  RESIDENT:       { label: "Resident",      icon: "🏠", desc: "Resident view"         },
  SUPER_ADMIN:    { label: "Super Admin",   icon: "🛡️", desc: "Platform admin"        },
  ACCOUNTANT:     { label: "Accountant",    icon: "📊", desc: "Finance & bills"       },
  GUARD:          { label: "Guard",         icon: "🔐", desc: "Gate & security"       },
  FAMILY_MEMBER:  { label: "Family",        icon: "👨‍👩‍👧", desc: "Family member"        },
  COMMITTEE_MEMBER:{ label: "Committee",   icon: "📋", desc: "Committee member"      },
};

/* ─────────────────────────────────────────────────────────────
  AdminLayoutInner
───────────────────────────────────────────────────────────── */
function AdminLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();

  const [mobileMenu, setMobileMenu]           = useState(false);
  const [alerts, setAlerts]                   = useState([]);
  const [showEmergency, setShowEmergency]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [rsOpen, setRsOpen]                   = useState(false);   // role-switcher dropdown

  const { user, switchRole } = useContext(AuthContext);

  const base = "/admin";

  /* Menu */
  const menu = [
    { label: t("adminMenuDashboard"),   path: `${base}`,                  icon: MdDashboard    },
    { label: t("adminMenuResidents"),   path: `${base}/resident`,         icon: FaUsers        },
    { label: t("adminMenuAssignFlat"),  path: `${base}/assign-flat`,      icon: MdApartment    },
    { label: "Admin Setting",           path: `${base}/settings`,         icon: MdApartment    },
    { label: t("adminManageProperty"),  path: `${base}/property`,         icon: MdApartment    },
    { label: t("adminMenuParking"),     path: `${base}/parking-slots`,    icon: FaParking      },
    { label: t("adminMenuGuards"),      path: `${base}/guard`,            icon: FaUserShield   },
    { label: t("adminMenuNotices"),     path: `${base}/notice`,           icon: MdCampaign     },
    { label: t("adminMenuComplaints"),  path: `${base}/complaints`,        icon: MdReportProblem},
    { label: t("adminMenuAccountant"),  path: `${base}/accountant`,       icon: MdAccountBalance},
    { label: t("adminMenuManageBills"), path: `${base}/manage-bills`,     icon: MdAccountBalance},
    { label: t("adminMenuAmenities"),   path: `${base}/amenities`,        icon: MdVerified     },
    { label: t("adminMenuVisitorLogs"), path: `${base}/visitor-logs`,     icon: MdCampaign     },
    { label: t("adminMenuReports"),     path: `${base}/reports`,          icon: MdReportProblem},
    { label: t("adminMenuDocument"),    path: `${base}/society_documents`,icon: MdVerified     },
    { label: "Flat History",            path: `${base}/flat-history`,     icon: MdVerified     },
    { label: "Tenant Approvals",         path: `${base}/tenant-approvals`, icon: MdVerified     },
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
    if (role === user.activeRole) return;
    await switchRole(role);
    const routeMap = {
      SUPER_ADMIN:      "/superadmin",
      SOCIETY_ADMIN:    "/admin",
      COMMITTEE_MEMBER: "/admin",
      RESIDENT:         "/resident",
      FAMILY_MEMBER:    "/family",
      GUARD:            "/guard",
      ACCOUNTANT:       "/accountant",
    };
    navigate(routeMap[role] || "/login");
  };

  /* Sidebar content — shared between desktop sidebar & mobile drawer */
  const SidebarContent = ({ onLinkClick }) => (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide">
        {menu.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            onClick={onLinkClick}
            className={`sidebar-link ${location.pathname === path ? "active" : ""}`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
      <button
        onClick={() => { setShowLogoutConfirm(true); onLinkClick?.(); }}
        className="btn-danger mt-6"
      >
        <MdLogout size={18} /> {t("logout")}
      </button>
    </>
  );

  return (
    <div
      className="h-screen overflow-hidden bg-app flex"
      style={{ color: "var(--text-primary)" }}
    >
      {/* ── SIDEBAR ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-sidebar p-6 flex-col z-40">
        <h2
          className="text-xl font-semibold mb-8"
          style={{ color: "var(--text-primary)" }}
        >
          {t("adminPanelLabel")}
          <span className="text-accent">{t("panelSuffix")}</span>
        </h2>
        <SidebarContent />
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 md:ml-64 flex flex-col">

        {/* ── NAVBAR ── */}
        <header
          className="h-16 bg-navbar flex items-center justify-between px-4 md:px-6 z-30 shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          {/* Left: title */}
          <div>
            <h1 className="font-medium" style={{ color: "var(--text-primary)" }}>
              {t("adminDashboardTitle")}
            </h1>
            <p className="text-xs text-secondary">{t("adminDashboardSubtitle")}</p>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <LanguageSelector compact />
            <NotificationBell />

            {/* ── ROLE SWITCHER ── */}
            {user?.roles?.length > 1 && (
              <div className="rs-wrap" style={{ position: "relative" }}>

                {/* Trigger button */}
                <button
                  className={`rs-trigger ${rsOpen ? "open" : ""}`}
                  onClick={() => setRsOpen((o) => !o)}
                  title="Switch role"
                >
                  <span className="rs-active-dot" />
                  <span className="rs-trigger-label hidden sm:inline">
                    {ROLE_META[user.activeRole]?.label ?? user.activeRole}
                  </span>
                  {/* On very small screens show just the icon */}
                  <span className="rs-trigger-label sm:hidden">
                    {ROLE_META[user.activeRole]?.icon ?? "👤"}
                  </span>
                  <span className="rs-trigger-arrow">▼</span>
                </button>

                {/* Dropdown */}
                <div className={`rs-dropdown ${rsOpen ? "open" : ""}`}>
                  <div className="rs-dropdown-header">Switch role</div>

                  {user.roles.map((role) => {
                    const meta    = ROLE_META[role] ?? { label: role, icon: "👤", desc: "" };
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
                          <svg viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.5">
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
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/40 animate-pulse transition"
                title={t("adminActiveEmergencies")}
              >
                <MdWarning size={18} className="text-white" />
                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold min-w-4.5 h-4.5 flex items-center justify-center rounded-full leading-none px-1">
                  {alerts.length}
                </span>
              </button>
            )}

            {/* Mobile menu toggle */}
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

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-8">
          <div className="bg-card p-4 sm:p-6 rounded-xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── MOBILE DRAWER ── */}
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
            <div className="flex justify-between items-center mb-8">
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {t("adminPanelLabel")}
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

            {/* Mobile role switcher — pill bar */}
            {user?.roles?.length > 1 && (
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
                    const meta    = ROLE_META[role] ?? { label: role, icon: "👤" };
                    const isActive = role === user.activeRole;
                    return (
                      <button
                        key={role}
                        className={`rs-mobile-pill ${isActive ? "active" : ""}`}
                        onClick={() => {
                          handleRoleSwitch(role);
                          setMobileMenu(false);
                        }}
                      >
                        <span className="rs-pill-dot" />
                        {meta.icon} {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <SidebarContent onLinkClick={() => setMobileMenu(false)} />
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRM MODAL ── */}
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

      {/* ── EMERGENCY MODAL ── */}
      <AdminEmergencyModal
        alerts={alerts}
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        refresh={loadEmergencies}
      />
    </div>
  );
}

/* ── Outer export — provides admin-isolated language context ── */
export default function AdminLayout() {
  return (
    <LanguageProvider role="admin">
      <AdminLayoutInner />
    </LanguageProvider>
  );
}


  