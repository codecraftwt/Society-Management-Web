import { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { HiOutlineBuildingOffice2, HiBars3, HiOutlineXMark } from "react-icons/hi2";
import ThemeToggle from "./ThemeToggle";
import LanguageSelector from "./LanguageSelector";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { getDashboardPath } from "../../constants/app";

const LegalNavbar = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loggedIn = Boolean(user && localStorage.getItem("token"));
  const dashboardPath = getDashboardPath(user);

  const goToApp = () => navigate(loggedIn ? dashboardPath : "/login");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`home-navbar ${scrolled ? "home-navbar--scrolled" : "home-navbar--over-hero"} ${menuOpen ? "home-navbar--menu-open" : ""}`}>
      <div className="home-container">
        <div className="home-navbar-inner">
          {/* Brand Logo */}
          <Link to="/" className="home-brand-logo">
            <div className="home-brand-icon-box">
              <HiOutlineBuildingOffice2 />
            </div>
            <div className="home-brand-text">
              <div className="home-brand-title">{t("homeBrandTitle")}</div>
              <div className="home-brand-subtitle">{t("homeBrandSubtitle")}</div>
            </div>
          </Link>

          {/* Nav Right Actions */}
          <div className="home-nav-actions">
            <LanguageSelector compact />
            {loggedIn ? (
              <button
                onClick={goToApp}
                className="home-btn-nav-cta"
              >
                {t("homeDashboard")}
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="home-btn-login"
                >
                  {t("homeLogin")}
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="home-btn-nav-cta"
                >
                  {t("homeGetStarted")}
                </button>
              </>
            )}
            <div className="home-nav-theme-toggle">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Burger */}
          <button
            className="home-mobile-burger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <HiOutlineXMark /> : <HiBars3 />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className={`home-mobile-menu ${menuOpen ? "active" : ""}`}>
        <div className="home-mobile-prefs">
          <div className="home-nav-theme-toggle">
            <ThemeToggle />
          </div>
          <LanguageSelector compact />
        </div>

        <div className="home-mobile-actions">
          {loggedIn ? (
            <button
              onClick={() => { setMenuOpen(false); goToApp(); }}
              className="home-btn-nav-cta"
            >
              {t("homeDashboard")}
            </button>
          ) : (
            <>
              <button
                onClick={() => { setMenuOpen(false); navigate("/login"); }}
                className="home-btn-login"
              >
                {t("homeLogin")}
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate("/login"); }}
                className="home-btn-nav-cta"
              >
                {t("homeGetStarted")}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default LegalNavbar;