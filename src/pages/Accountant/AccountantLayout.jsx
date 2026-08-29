import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  MdDashboard,
  MdMenu,
  MdLogout,
  MdAccountBalance,
  MdReceipt,
  MdBarChart,
} from "react-icons/md";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import { LanguageProvider, useLang } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import Sidebar from "../../components/common/Sidebar";
import AppHeader from "../../components/common/AppHeader";

function AccountantLayoutInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { openMobile } = useSidebar();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const base = "/accountant";

  const menu = [
    {
      label: t("accountantMenuDashboard"),
      path: `${base}`,
      icon: MdDashboard,
      group: "OVERVIEW",
    },
    {
      label: t("accountantMenuManageBills"),
      path: `${base}/manage-bills`,
      icon: MdAccountBalance,
      group: "FINANCE & BILLING",
    },
    {
      label: t("accountantMenuPayments"),
      path: `${base}/payments`,
      icon: MdReceipt,
      group: "FINANCE & BILLING",
    },
    {
      label: t("accountantMenuReports"),
      path: `${base}/reports`,
      icon: MdBarChart,
      group: "FINANCE & BILLING",
    },
  ];

  const confirmLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

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
            {t("accountantPanelLabel") || "Accountant"}<span className="text-accent">{t("panelSuffix") || " Panel"}</span>
          </>
        }
        brandSubtitle="Finance View"
        base={base}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="main-content-layout min-w-0">
        <AppHeader
          title={t("accountantDashboardTitle")}
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
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-100 animate-fadeIn"
          style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)" }}
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
        </div>
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