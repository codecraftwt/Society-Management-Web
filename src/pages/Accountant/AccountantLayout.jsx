
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MdDashboard, MdMenu, MdClose, MdLogout, MdAccountBalance, MdReceipt } from "react-icons/md";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggle from "../../components/common/ThemeToggle";
import LanguageSelector from "../../components/common/LanguageSelector";
import { LanguageProvider, useLang } from "../../context/LanguageContext";

function AccountantLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menu = [
    { label: t("accountantMenuDashboard"),   path: "/accountant",              icon: MdDashboard      },
    { label: t("accountantMenuManageBills"), path: "/accountant/manage-bills", icon: MdAccountBalance },
    { label: t("accountantMenuPayments"),    path: "/accountant/payments",     icon: MdReceipt        },
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

      {/* ══════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-sidebar p-5 px-6 flex-col z-40">
        <h2 className="text-xl font-semibold mb-8" style={{ color: "var(--text-primary)" }}>
          {t("accountantPanelLabel")}
          <span className="text-accent">{t("panelSuffix")}</span>
        </h2>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
          {menu.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`sidebar-link ${location.pathname === path ? "active" : ""}`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="btn-danger mt-6"
        >
          <MdLogout size={18} /> {t("logout")}
        </button>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════ */}
      <div className="flex-1 md:ml-64 flex flex-col">

        {/* NAVBAR */}
        <header
          className="h-16 bg-navbar flex items-center justify-between px-4 md:px-6 z-30 shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div>
            <h1 className="font-medium" style={{ color: "var(--text-primary)" }}>
              {t("accountantDashboardTitle")}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSelector compact />
            <NotificationBell />

            {/* Hamburger — mobile only */}
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

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-8">
          <div className="bg-card p-4 sm:p-6 rounded-xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════ */}
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
            {/* drawer header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {t("accountantPanelLabel")}
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

            {/* drawer nav */}
            <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
              {menu.map(({ label, path, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenu(false)}
                  className={`sidebar-link ${location.pathname === path ? "active" : ""}`}
                >
                  <Icon size={18} /> {label}
                </Link>
              ))}
            </nav>

            {/* drawer logout */}
            <button
              onClick={() => {
                setShowLogoutConfirm(true);
                setMobileMenu(false);
              }}
              className="btn-danger mt-6"
            >
              <MdLogout size={18} /> {t("logout")}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          LOGOUT CONFIRM MODAL
      ══════════════════════════════════════════ */}
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
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              {t("confirmLogout")}
            </h2>
            <p className="text-secondary text-sm mb-6">
              {t("accountantLogoutMsg")}
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={confirmLogout} className="btn-danger">
                {t("yesLogout")}
              </button>
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-primary">
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