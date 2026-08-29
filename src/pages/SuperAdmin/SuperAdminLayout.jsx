import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  MdLogout,
  MdDashboard,
  MdMenu,
  MdCampaign,
  MdReportProblem,
  MdAccountBalance,
  MdVerified,
} from "react-icons/md";
import { FaBuilding, FaUsers, FaUserShield, FaParking } from "react-icons/fa";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";
import API from "../../services/api";
import Select from "../../components/common/Select";

function SuperAdminLayoutInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { openMobile } = useSidebar();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- Global Society Filter State ---
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(
    localStorage.getItem("superadmin_society_filter") || "ALL"
  );

  const base = "/superadmin";

  const menu = [
    {
      label: t("saMenuDashboard") || "Dashboard",
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
    },
    {
      label: t("saMenuSocieties") || "Societies",
      path: `${base}/societies`,
      icon: FaBuilding,
      group: "COMMUNITY & UNITS",
    },
    {
      label: t("saMenuAllResidents") || "All Residents",
      path: `${base}/resident`,
      icon: FaUsers,
      group: "COMMUNITY & UNITS",
    },
    {
      label: t("saMenuAllComplaints") || "All Complaints",
      path: `${base}/complaints`,
      icon: MdReportProblem,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuAllNotices") || "All Notices",
      path: `${base}/notice`,
      icon: MdCampaign,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuManageGuards") || "Manage Guards",
      path: `${base}/guard`,
      icon: FaUserShield,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuVisitorLogs") || "Visitor Logs",
      path: `${base}/visitor-logs`,
      icon: MdVerified,
      group: "OPERATIONS & SECURITY",
    },
    {
      label: t("saMenuAccountant") || "Accountant/Finances",
      path: `${base}/accountant`,
      icon: MdAccountBalance,
      group: "FINANCE & ASSETS",
    },
    {
      label: t("saMenuManageBills") || "Manage Bills",
      path: `${base}/manage-bills`,
      icon: MdAccountBalance,
      group: "FINANCE & ASSETS",
    },
    {
      label: t("saMenuParking") || "Parking Management",
      path: `${base}/parking`,
      icon: FaParking,
      group: "FINANCE & ASSETS",
    },
    {
      label: t("saMenuSystemReports") || "System Reports",
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

  const handleSocietyChange = (e) => {
    const val = e.target.value;
    setSelectedSocietyId(val);
    localStorage.setItem("superadmin_society_filter", val);
    window.location.reload();
  };

  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  // Extra drawer control for mobile
  const mobileSocietyFilter = (
    <div className="mb-2">
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
        {t("allSocietiesGlobal") || "All Societies (Global)"}
      </p>
      <Select
        value={selectedSocietyId}
        onChange={handleSocietyChange}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: "10px",
          border: "1px solid var(--glass-border)",
          background: "var(--card-inner-bg)",
          color: "var(--text-primary)",
          fontSize: "13px",
          fontWeight: "600",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="ALL">
          {t("allSocietiesGlobal") || "All Societies (Global)"}
        </option>
        {societies.map((soc) => (
          <option key={soc.id} value={soc.id}>
            {soc.name}
          </option>
        ))}
      </Select>
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
            {t("saBrandName") || "Society"}<span className="text-accent">{t("saBrandSuffix") || "Control"}</span>
          </>
        }
        brandSubtitle="Super Admin Panel"
        base={base}
        drawerExtra={mobileSocietyFilter}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={t("saDashboardTitle") || "Global Overview"}
          showNotificationBell={false}
          actions={
            <div className="hidden md:block min-w-0 max-w-[180px] lg:max-w-[220px] shrink">
              <Select
                value={selectedSocietyId}
                onChange={handleSocietyChange}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--glass-border)",
                  background: "var(--card-inner-bg)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: "600",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "200px",
                }}
              >
                <option value="ALL">
                  {t("allSocietiesGlobal") || "All Societies (Global)"}
                </option>
                {societies.map((soc) => (
                  <option key={soc.id} value={soc.id}>
                    {soc.name}
                  </option>
                ))}
              </Select>
            </div>
          }
          onLogout={() => setShowLogoutConfirm(true)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide p-4 sm:p-6 lg:p-8">
          <Outlet />
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
              Confirm Logout
            </h2>
            <div className="flex justify-center gap-4 mt-6">
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
        </div>
      )}
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