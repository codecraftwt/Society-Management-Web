import { useState, useContext, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { FaParking } from "react-icons/fa";
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
} from "react-icons/md";
import ResidentEmergencyModal from "../../components/resident/ResidentEmergencyModal";
import { useSidebar } from "../../context/SidebarContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";

const ROLE_META = {
  SOCIETY_ADMIN: { label: "Society Admin", icon: "🏢", desc: "Manage your society" },
  RESIDENT: { label: "Resident", icon: "🏠", desc: "Resident view" },
  SUPER_ADMIN: { label: "Super Admin", icon: "🛡️", desc: "Platform admin" },
  ACCOUNTANT: { label: "Accountant", icon: "📊", desc: "Finance & bills" },
  GUARD: { label: "Guard", icon: "🔐", desc: "Gate & security" },
  FAMILY_MEMBER: { label: "Family", icon: "👨‍👩‍👧", desc: "Family member" },
  COMMITTEE_MEMBER: { label: "Committee", icon: "📋", desc: "Committee member" },
};

const ROUTE_MAP = {
  SUPER_ADMIN: "/superadmin",
  SOCIETY_ADMIN: "/admin",
  COMMITTEE_MEMBER: "/admin",
  RESIDENT: "/resident",
  FAMILY_MEMBER: "/family",
  GUARD: "/guard",
  ACCOUNTANT: "/accountant",
};

function ResidentLayoutInner() {
  const { user, switchRole } = useContext(AuthContext);
  const { t } = useLang();
  const navigate = useNavigate();
  const { openMobile } = useSidebar();

  const [alerts, setAlerts] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [rsOpen, setRsOpen] = useState(false);

  const isFamilyMember = user?.role === "FAMILY_MEMBER";
  const base = isFamilyMember ? "/family" : "/resident";

  /* Panel label */
  const panelLabel = isFamilyMember
    ? t("familyPanel") || "Family Panel"
    : t("residentPanel") || "Resident Panel";

  const spaceIdx = panelLabel.indexOf(" ");
  const word1 = spaceIdx > -1 ? panelLabel.slice(0, spaceIdx) : panelLabel;
  const word2 = spaceIdx > -1 ? panelLabel.slice(spaceIdx) : "";

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
            label: "My Properties",
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
      label: t("menuMyProfile"),
      path: `${base}/myprofile`,
      icon: MdPerson,
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
      label: t("menuMyProfile"),
      path: `${base}/myprofile`,
      icon: MdPerson,
      group: "PROFILE",
    },
  ];

  const menu = isFamilyMember ? familyMenu : residentMenu;

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

  const handleRoleSwitch = async (role) => {
    if (role === user.activeRole) return;
    await switchRole(role);
    navigate(ROUTE_MAP[role] || "/login");
  };

  /* Role switcher dropdown */
  const RoleSwitcher = () => {
    if (!user?.roles || user.roles.length <= 1) return null;
    return (
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
                  {meta.desc && <p className="rs-option-desc">{meta.desc}</p>}
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
    );
  };

  /* Mobile pill bar */
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
            {word1}<span className="text-accent">{word2}</span>
          </>
        }
        brandSubtitle={isFamilyMember ? "Family View" : "Resident View"}
        base={base}
        drawerExtra={mobileRoleSwitcher}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={panelLabel}
          subtitle={user?.name ? `${t("welcome")}, ${user.name}` : null}
          actions={
            <>
              <RoleSwitcher />
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
        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-8">
          <div className="bg-card p-4 sm:p-6 rounded-xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* LOGOUT MODAL */}
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
        </div>
      )}

      {/* EMERGENCY MODAL */}
      <ResidentEmergencyModal
        alerts={alerts}
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
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