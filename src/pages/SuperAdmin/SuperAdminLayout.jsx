

import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  MdLogout, MdDashboard, MdMenu, MdClose, MdCampaign,
  MdReportProblem, MdAccountBalance, MdVerified
} from "react-icons/md";
import { FaBuilding, FaUsers, FaUserShield, FaParking } from "react-icons/fa";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import API from "../../services/api"; // Added API import
import Select from "../../components/common/Select";

function SuperAdminLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- NEW: Global Society Filter State ---
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(
    localStorage.getItem("superadmin_society_filter") || "ALL"
  );

  const base = "/superadmin";

  const menu = [
    { label: t("saMenuDashboard") || "Dashboard", path: `${base}`, icon: MdDashboard },
    { label: t("saMenuSocieties") || "Societies", path: `${base}/societies`, icon: FaBuilding },
    { label: t("saMenuAllResidents") || "All Residents", path: `${base}/resident`, icon: FaUsers },
    { label: t("saMenuAllComplaints") || "All Complaints", path: `${base}/complaints`, icon: MdReportProblem },
    { label: t("saMenuAllNotices") || "All Notices", path: `${base}/notice`, icon: MdCampaign },
    { label: t("saMenuManageGuards") || "Manage Guards", path: `${base}/guard`, icon: FaUserShield },
    { label: t("saMenuVisitorLogs") || "Visitor Logs", path: `${base}/visitor-logs`, icon: MdVerified },
    { label: t("saMenuAccountant") || "Accountant/Finances", path: `${base}/accountant`, icon: MdAccountBalance },
    { label: t("saMenuManageBills") || "Manage Bills", path: `${base}/manage-bills`, icon: MdAccountBalance },
    { label: t("saMenuParking") || "Parking Management", path: `${base}/parking`, icon: FaParking },
    { label: t("saMenuSystemReports") || "System Reports", path: `${base}/reports`, icon: MdReportProblem },
  ];

  // --- NEW: Fetch Societies for Dropdown ---
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
    // Reload the page slightly to refresh all tables with the new filter
    window.location.reload();
  };

  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const Brand = () => (
    <div className="superadmin-brand">
      <div className="superadmin-brand-icon">
        <FaBuilding size={20} />
      </div>
      <div>
        <h2 className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          {t("saBrandName") || "Society"}<span className="text-accent">{t("saBrandSuffix") || "Control"}</span>
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Super Admin Panel</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-app flex" style={{ color: "var(--text-primary)" }}>
      {/* SIDEBAR */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-sidebar p-6 flex-col z-40 superadmin-sidebar">
        <div className="mb-8"><Brand /></div>
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
          {menu.map(({ label, path, icon: Icon }) => (
            <Link key={path} to={path}
              className={`sidebar-link ${location.pathname === path ? "active" : ""}`}>
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <button onClick={() => setShowLogoutConfirm(true)} className="btn-danger mt-6">
          <MdLogout size={18} /> {t("logout") || "Logout"}
        </button>
      </aside>

      {/* MAIN */}
      <div className="flex-1 md:ml-64 flex flex-col">
        <header className="h-16 bg-navbar flex items-center justify-between px-4 md:px-6 z-30 shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)" }}>

          <div>
            <h1 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {t("saDashboardTitle") || "Global Overview"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* --- NEW: Global Society Filter Dropdown --- */}
            <Select
              value={selectedSocietyId}
              onChange={handleSocietyChange}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)",
                background: "var(--card-inner-bg)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: "600",
                outline: "none",
                cursor: "pointer",
                maxWidth: "200px"
              }}
            >
              <option value="ALL">{t("allSocietiesGlobal") || "All Societies (Global)"}</option>
              {societies.map((soc) => (
                <option key={soc.id} value={soc.id}>
                  {soc.name}
                </option>
              ))}
            </Select>

            <ThemeToggle />
            <LanguageSelector compact />
            <button onClick={() => setMobileMenu(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: "var(--card-inner-bg)", border: "1.5px solid var(--glass-border)", color: "var(--text-primary)" }}>
              <MdMenu size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-100 animate-fadeIn"
          style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)" }}>
          <div className="p-8 rounded-2xl w-[90%] max-w-sm text-center animate-scaleIn"
            style={{ background: "var(--card-bg)", border: "1.5px solid var(--glass-border)", boxShadow: "var(--shadow-glass)" }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Confirm Logout</h2>
            <div className="flex justify-center gap-4 mt-6">
              <button onClick={confirmLogout} className="btn-danger">Yes, Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-primary">Cancel</button>
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